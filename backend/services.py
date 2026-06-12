from __future__ import annotations

import hashlib
import json
import uuid
from datetime import date, datetime, timedelta
from typing import Any

from .db import get_connection, row_to_dict, rows_to_dicts
from .settings import CURRENT_DATE


def now_text() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def pct(value: Any) -> int:
    try:
        return round(float(value) * 100)
    except (TypeError, ValueError):
        return 0


def as_int(value: Any, default: int = 0) -> int:
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


def is_service_expired(profile: dict[str, Any], plan_date: str) -> bool:
    paid_until = str(profile.get("paid_until") or "")
    return bool(paid_until) and paid_until < plan_date


def as_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def days_between(start_date: str, end_date: str) -> int:
    try:
        start = date.fromisoformat(start_date)
        end = date.fromisoformat(end_date)
    except ValueError:
        return 0
    return max(0, (end - start).days)


def level_matches(applicable_levels: str, level: str) -> bool:
    levels = {item.strip() for item in str(applicable_levels or "").split(",") if item.strip()}
    return not levels or level in levels


def next_assignable_type(
    conn,
    current_type_id: str,
) -> dict[str, Any] | None:
    current = row_to_dict(
        conn.execute("SELECT * FROM question_types WHERE type_id = ?", (current_type_id,)).fetchone()
    )
    if not current:
        return row_to_dict(
            conn.execute(
                """
                SELECT * FROM question_types
                WHERE direct_assignable = '1'
                ORDER BY sort_code
                LIMIT 1
                """
            ).fetchone()
        )
    return row_to_dict(
        conn.execute(
            """
            SELECT * FROM question_types
            WHERE direct_assignable = '1' AND sort_code > ?
            ORDER BY sort_code
            LIMIT 1
            """,
            (current["sort_code"],),
        ).fetchone()
    )


def get_type_questions(
    conn,
    type_id: str,
    profile: dict[str, Any],
    plan_stage: str,
    question_ids: set[str] | None = None,
) -> list[dict[str, Any]]:
    books = {
        str(profile.get("primary_book_1") or ""),
        str(profile.get("primary_book_2") or ""),
    }
    books.discard("")
    rows = rows_to_dicts(
        conn.execute(
            """
            SELECT * FROM questions
            WHERE type_id = ?
            ORDER BY CAST(question_order AS INTEGER), question_id
            """,
            (type_id,),
        ).fetchall()
    )
    filtered = []
    for row in rows:
        if books and row["source"] not in books:
            continue
        if plan_stage and row["plan_stage"] and row["plan_stage"] != plan_stage:
            continue
        if not level_matches(row["applicable_levels"], profile.get("level") or ""):
            continue
        if question_ids is not None and row["question_id"] not in question_ids:
            continue
        filtered.append(row)
    return filtered


def get_system_message(key: str, default: str) -> str:
    with get_connection() as conn:
        row = row_to_dict(
            conn.execute(
                "SELECT * FROM system_messages WHERE message_key = ?",
                (key,),
            ).fetchone()
        )
    return row.get("message_text") if row else default


def completion_message() -> str:
    return get_system_message(
        "daily_plan_completed",
        "恭喜你完成今日全部题型！今天的坚持很漂亮，继续保持。",
    )


def generate_daily_plan(
    conn,
    user: dict[str, Any],
    profile: dict[str, Any],
    progress: dict[str, Any],
    plan_date: str,
) -> list[dict[str, Any]]:
    if str(profile.get("plan_enabled") or "") != "1":
        raise ValueError("该学生今日计划已暂停")
    if str(progress.get("progress_status") or "active") != "active":
        raise ValueError("该学生学习进度已暂停")

    target_load = 1.0
    plan_stage = progress.get("plan_stage") or profile.get("current_stage") or "强化"
    current_type_id = progress.get("unfinished_type_id") or progress.get("current_type_id")
    current_type = row_to_dict(
        conn.execute("SELECT * FROM question_types WHERE type_id = ?", (current_type_id,)).fetchone()
    ) or next_assignable_type(conn, "")
    if not current_type:
        raise ValueError("题型表中没有可布置题型")

    unfinished_ids: set[str] = set()
    if progress.get("unfinished_type_id") == current_type["type_id"]:
        try:
            unfinished_ids = set(json.loads(progress.get("unfinished_question_ids") or "[]"))
        except json.JSONDecodeError:
            unfinished_ids = set()

    selected_units: list[dict[str, Any]] = []
    load = 0.0
    cursor = current_type
    first_unit = True

    while cursor:
        all_questions = get_type_questions(conn, cursor["type_id"], profile, plan_stage)
        if not all_questions:
            cursor = next_assignable_type(conn, cursor["type_id"])
            first_unit = False
            continue

        questions = all_questions
        suggested_days = as_float(cursor.get("suggested_days"), 0.3)
        unit_load = suggested_days
        if first_unit and unfinished_ids:
            questions = get_type_questions(conn, cursor["type_id"], profile, plan_stage, unfinished_ids)
            if questions:
                unit_load = suggested_days * len(questions) / max(len(all_questions), 1)

        if not selected_units:
            selected_units.append({"type": cursor, "questions": questions})
            load = unit_load
        else:
            new_load = load + unit_load
            if abs(new_load - target_load) < abs(load - target_load):
                selected_units.append({"type": cursor, "questions": questions})
                load = new_load
            else:
                break

        cursor = next_assignable_type(conn, cursor["type_id"])
        first_unit = False

    if not selected_units:
        raise ValueError("未找到适合该学生的题目")

    created_at = now_text()
    plan_id = f"P{plan_date.replace('-', '')}-{user['user_id']}"
    days_to_exam = days_between(plan_date, profile.get("target_exam_date") or plan_date)
    rows_to_insert = []
    for type_index, unit in enumerate(selected_units, start=1):
        type_row = unit["type"]
        feedback_status = "open" if type_index == 1 else "locked"
        for question_order, question in enumerate(unit["questions"], start=1):
            rows_to_insert.append(
                (
                    plan_id,
                    user["user_id"],
                    plan_date,
                    "in_progress",
                    "稳住节奏，今天也只需要完成眼前这一组。",
                    profile.get("target_exam_date") or "",
                    str(days_to_exam),
                    str(type_index),
                    type_row["type_id"],
                    type_row["type_name"],
                    question["question_id"],
                    question["source"],
                    question["original_position_text"],
                    str(question_order),
                    feedback_status,
                    created_at,
                    created_at,
                )
            )

    conn.executemany(
        """
        INSERT INTO daily_plans (
          plan_id, user_id, plan_date, plan_status, slogan, exam_date,
          days_to_exam, type_index, type_id, type_name, question_id,
          source, original_position_text, question_order, feedback_open_status,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        rows_to_insert,
    )
    conn.execute(
        """
        UPDATE student_progress
        SET last_generated_plan_date = ?, updated_at = ?
        WHERE user_id = ?
        """,
        (plan_date, created_at, user["user_id"]),
    )
    conn.commit()

    return rows_to_dicts(
        conn.execute(
            """
            SELECT * FROM daily_plans
            WHERE user_id = ? AND plan_date = ?
            ORDER BY CAST(type_index AS INTEGER), CAST(question_order AS INTEGER)
            """,
            (user["user_id"], plan_date),
        ).fetchall()
    )


def time_label(value: Any) -> str:
    text = str(value or "")
    if " " in text:
        return text.split(" ", 1)[1][:5]
    return text[:5]


def rank_rows_for_display(rows: list[dict[str, Any]], current_user_id: str, top_n: int = 5) -> list[dict[str, Any]]:
    if len(rows) <= top_n + 3:
        return rows

    current_index = next((index for index, row in enumerate(rows) if row["userId"] == current_user_id), -1)
    if current_index < 0 or current_index < top_n:
        return rows[:top_n]

    keep: dict[int, dict[str, Any]] = {index: row for index, row in enumerate(rows[:top_n])}
    for index in range(max(0, current_index - 1), min(len(rows), current_index + 2)):
        keep[index] = rows[index]

    display_rows: list[dict[str, Any]] = []
    previous_index = -1
    for index in sorted(keep):
        if previous_index >= 0 and index - previous_index > 1:
            display_rows.append({"isDivider": True})
        display_rows.append(keep[index])
        previous_index = index
    return display_rows


def build_ranking_payload(rows: list[dict[str, Any]], current_user_id: str) -> dict[str, Any]:
    current = next((row for row in rows if row["userId"] == current_user_id), None)
    return {
        "top": rows[:3],
        "rows": rank_rows_for_display(rows, current_user_id),
        "myRank": current["rank"] if current else None,
        "my": current,
    }


def get_rankings(user_id: str, stat_date: str = CURRENT_DATE) -> dict[str, Any]:
    with get_connection() as conn:
        user = row_to_dict(conn.execute("SELECT * FROM users WHERE user_id = ?", (user_id,)).fetchone())
        profile = row_to_dict(
            conn.execute("SELECT * FROM student_profiles WHERE user_id = ?", (user_id,)).fetchone()
        )
        if not user or not profile:
            raise ValueError("未找到该学生")

        class_row = row_to_dict(
            conn.execute("SELECT * FROM classes WHERE class_id = ?", (profile["class_id"],)).fetchone()
        )
        class_students = rows_to_dicts(
            conn.execute(
                """
                SELECT
                  u.user_id, u.nickname, u.avatar_url, u.account_status,
                  p.class_id, p.level, p.math_type,
                  s.stat_date, s.continuous_days, s.today_completion_rate,
                  s.today_checkin_order, s.today_checkin_at,
                  s.weekly_completion_rate, s.weekly_study_days,
                  s.current_badge_name, s.next_badge_target,
                  s.badge_progress_value, s.badge_progress_rate
                FROM student_profiles p
                JOIN users u ON u.user_id = p.user_id
                LEFT JOIN student_stats s ON s.user_id = p.user_id AND s.stat_date = ?
                WHERE p.class_id = ? AND u.role = 'student' AND u.account_status = 'active'
                """,
                (stat_date, profile["class_id"]),
            ).fetchall()
        )

    def base_row(row: dict[str, Any]) -> dict[str, Any]:
        return {
            "userId": row["user_id"],
            "name": row["nickname"],
            "isMe": row["user_id"] == user_id,
            "avatarUrl": row["avatar_url"],
            "continuousDays": as_int(row.get("continuous_days")),
            "weeklyStudyDays": as_int(row.get("weekly_study_days")),
            "todayCheckinOrder": as_int(row.get("today_checkin_order"), 9999),
            "todayCheckinAt": time_label(row.get("today_checkin_at")),
            "todayCompletionRate": pct(row.get("today_completion_rate")),
            "currentBadgeName": row.get("current_badge_name") or "暂无勋章",
            "nextBadgeTarget": row.get("next_badge_target") or "7天连续学习勋章",
            "badgeProgressValue": as_int(row.get("badge_progress_value")),
            "badgeProgressRate": pct(row.get("badge_progress_rate")),
        }

    today_rows = [
        base_row(row)
        for row in class_students
        if as_int(row.get("today_checkin_order"), 0) > 0
    ]
    today_rows.sort(key=lambda row: (row["todayCheckinOrder"], row["todayCheckinAt"], row["name"]))
    for index, row in enumerate(today_rows, start=1):
        row["rank"] = index
        row["metric"] = f"第 {row['todayCheckinOrder']} 个打卡"
        row["status"] = "已打卡"

    weekly_rows = [base_row(row) for row in class_students]
    weekly_rows.sort(key=lambda row: (-row["weeklyStudyDays"], row["name"]))
    for index, row in enumerate(weekly_rows, start=1):
        row["rank"] = index
        row["metric"] = f"本周 {row['weeklyStudyDays']}/7 天"
        row["status"] = "已坚持" if row["weeklyStudyDays"] else "本周未打卡"

    streak_rows = [base_row(row) for row in class_students]
    streak_rows.sort(key=lambda row: (-row["continuousDays"], row["name"]))
    for index, row in enumerate(streak_rows, start=1):
        row["rank"] = index
        row["metric"] = f"连续 {row['continuousDays']} 天"
        row["status"] = "已打卡" if row["todayCompletionRate"] > 0 else "今日待完成"

    current_stat = next((base_row(row) for row in class_students if row["user_id"] == user_id), {})
    today_me = next((row for row in today_rows if row["userId"] == user_id), None)
    weekly_me = next((row for row in weekly_rows if row["userId"] == user_id), None)
    streak_me = next((row for row in streak_rows if row["userId"] == user_id), None)

    return {
        "student": {
            "userId": user["user_id"],
            "name": user["nickname"],
            "classId": profile["class_id"],
            "className": class_row.get("class_name", profile["class_id"]) if class_row else profile["class_id"],
            "mathType": profile["math_type"],
            "targetScore": as_int(profile["target_score"]),
        },
        "summary": {
            "todayRank": today_me["rank"] if today_me else None,
            "weeklyRank": weekly_me["rank"] if weekly_me else None,
            "continuousRank": streak_me["rank"] if streak_me else None,
            "continuousDays": current_stat.get("continuousDays", 0),
            "weeklyStudyDays": current_stat.get("weeklyStudyDays", 0),
            "badgeProgressValue": current_stat.get("badgeProgressValue", 0),
            "badgeProgressRate": current_stat.get("badgeProgressRate", 0),
            "currentBadgeName": current_stat.get("currentBadgeName", "暂无勋章"),
            "nextBadgeTarget": current_stat.get("nextBadgeTarget", "7天连续学习勋章"),
        },
        "boards": {
            "today": build_ranking_payload(today_rows, user_id),
            "weekly": build_ranking_payload(weekly_rows, user_id),
            "streak": build_ranking_payload(streak_rows, user_id),
        },
    }


def hours_from_minutes(value: Any) -> float:
    return round(as_float(value) / 60, 1)


def activity_level(minutes: float, fallback: Any = "") -> str:
    if minutes <= 0:
        return "none"
    fallback_text = str(fallback or "")
    if fallback_text in {"high", "medium", "low"}:
        return fallback_text
    if minutes >= 150:
        return "high"
    if minutes >= 100:
        return "medium"
    return "low"


def get_curve(user_id: str, stat_date: str = CURRENT_DATE) -> dict[str, Any]:
    try:
        end_date = date.fromisoformat(stat_date)
    except ValueError as exc:
        raise ValueError("日期格式应为 YYYY-MM-DD") from exc
    start_date = end_date - timedelta(days=14)
    activity_end_date = end_date - timedelta(days=1)

    with get_connection() as conn:
        user = row_to_dict(conn.execute("SELECT * FROM users WHERE user_id = ?", (user_id,)).fetchone())
        profile = row_to_dict(
            conn.execute("SELECT * FROM student_profiles WHERE user_id = ?", (user_id,)).fetchone()
        )
        stats = row_to_dict(
            conn.execute(
                "SELECT * FROM student_stats WHERE user_id = ? AND stat_date = ?",
                (user_id, stat_date),
            ).fetchone()
        )
        if not user or not profile:
            raise ValueError("未找到该学生")
        if not stats:
            raise ValueError("未找到该学生曲线统计数据")

        activity_rows = rows_to_dicts(
            conn.execute(
                """
                SELECT * FROM student_daily_activity
                WHERE user_id = ? AND activity_date BETWEEN ? AND ?
                ORDER BY activity_date
                """,
                (user_id, start_date.isoformat(), activity_end_date.isoformat()),
            ).fetchall()
        )
        mastery_rows = rows_to_dicts(
            conn.execute(
                """
                SELECT * FROM type_mastery_stats
                WHERE user_id = ? AND stat_date = ?
                ORDER BY CAST(sort_order AS INTEGER), type_id
                """,
                (user_id, stat_date),
            ).fetchall()
        )
        loss_rows = rows_to_dicts(
            conn.execute(
                """
                SELECT * FROM loss_reason_stats
                WHERE user_id = ? AND stat_date = ?
                ORDER BY CAST(sort_order AS INTEGER), reason_code
                """,
                (user_id, stat_date),
            ).fetchall()
        )
        chapter_rows = rows_to_dicts(
            conn.execute(
                """
                SELECT chapter_id, chapter_name
                FROM question_types
                WHERE COALESCE(chapter_id, '') != ''
                GROUP BY chapter_id, chapter_name
                ORDER BY chapter_id
                """
            ).fetchall()
        )
        type_chapters = {
            row["type_id"]: {
                "chapterId": row["chapter_id"],
                "chapterName": row["chapter_name"],
            }
            for row in rows_to_dicts(
                conn.execute(
                    """
                    SELECT type_id, chapter_id, chapter_name
                    FROM question_types
                    WHERE COALESCE(chapter_id, '') != ''
                    """
                ).fetchall()
            )
        }

    activity_by_date = {row["activity_date"]: row for row in activity_rows}
    activity = []
    completed_minutes = []
    for offset in range(14):
        current_date = start_date + timedelta(days=offset)
        key = current_date.isoformat()
        row = activity_by_date.get(key, {})
        minutes = as_float(row.get("completed_minutes"))
        completed_minutes.append(minutes)
        studied = str(row.get("is_studied") or ("1" if minutes > 0 else "0")) == "1" and minutes > 0
        activity.append(
            {
                "date": current_date.strftime("%m.%d"),
                "rawDate": key,
                "level": activity_level(minutes, row.get("intensity_level")),
                "hours": hours_from_minutes(minutes),
                "minutes": round(minutes),
                "studied": studied,
                "completedQuestions": as_int(row.get("completed_questions")),
                "submittedTypeCount": as_int(row.get("submitted_type_count")),
            }
        )
    continuous_days = 0
    for row in reversed(activity):
        if not row["studied"]:
            break
        continuous_days += 1

    chapter_stats: dict[str, dict[str, Any]] = {
        row["chapter_id"]: {
            "chapterId": row["chapter_id"],
            "name": row["chapter_name"],
            "rates": [],
            "submittedQuestionCount": 0,
            "wrongQuestionCount": 0,
        }
        for row in chapter_rows
    }
    for row in mastery_rows:
        chapter = type_chapters.get(row["type_id"])
        if not chapter or chapter["chapterId"] not in chapter_stats:
            continue
        target = chapter_stats[chapter["chapterId"]]
        target["rates"].append(as_float(row.get("mastery_rate")))
        target["submittedQuestionCount"] += as_int(row.get("submitted_question_count"))
        target["wrongQuestionCount"] += as_int(row.get("wrong_question_count"))

    mastery = []
    for chapter in chapter_stats.values():
        rates = chapter.pop("rates")
        rate = round(sum(rates) / len(rates) * 100) if rates else 0
        chapter["rate"] = rate
        chapter["tag"] = "未开始" if not rates else "良好" if rate >= 75 else "待提升" if rate >= 60 else "薄弱项"
        mastery.append(chapter)
    loss_reasons = [
        {
            "code": row["reason_code"],
            "name": row["reason_name"],
            "rate": pct(row.get("reason_rate")),
            "count": as_int(row.get("wrong_question_count")),
        }
        for row in loss_rows
    ]

    weakest_rows = sorted(mastery, key=lambda row: (row["rate"], row["name"]))[:3]
    priorities = [
        {
            "rank": index,
            "chapterId": row["chapterId"],
            "name": row["name"],
            "rate": row["rate"],
            "tag": row["tag"] or ("薄弱项" if row["rate"] < 65 else "待提升"),
            "reason": f"当前章节得分率 {row['rate']}%，是该学生掌握度最低的章节之一，建议优先复盘错题和基础方法。",
            "icon": "book" if index == 1 else "note" if index == 2 else "triangle",
        }
        for index, row in enumerate(weakest_rows, start=1)
    ]

    total_minutes = sum(completed_minutes)
    max_minutes = max(completed_minutes or [0])
    return {
        "student": {
            "userId": user["user_id"],
            "name": user["nickname"],
            "mathType": profile["math_type"],
            "targetScore": as_int(profile["target_score"]),
        },
        "curve": {
            "title": "数学能力成长曲线",
            "targetScore": as_int(profile["target_score"]),
            "overallAccuracy": pct(stats.get("overall_accuracy")),
            "repeatWrongRate": pct(stats.get("repeat_wrong_rate")),
            "weeklyCompletionRate": pct(stats.get("weekly_completion_rate")),
            "masteryLabel": "章节掌握度",
            "activitySummary": {
                "totalHours": hours_from_minutes(total_minutes),
                "maxHours": hours_from_minutes(max_minutes),
                "continuousDays": continuous_days,
                "studiedDays": sum(1 for row in activity if row["studied"]),
            },
            "activity": activity,
            "mastery": mastery,
            "lossReasons": loss_reasons,
            "priorities": priorities,
        },
    }


def clamp(value: int, minimum: int, maximum: int) -> int:
    return max(minimum, min(maximum, value))


def study_room_for_profile(conn, profile: dict[str, Any]) -> dict[str, Any] | None:
    return row_to_dict(
        conn.execute(
            """
            SELECT * FROM study_rooms
            WHERE math_type = ? AND target_exam_year = ?
            ORDER BY room_id
            LIMIT 1
            """,
            (profile.get("math_type") or "", profile.get("target_exam_year") or ""),
        ).fetchone()
    )


def ensure_study_goal(
    conn,
    user_id: str,
    plan_date: str,
    room_id: str,
    task_options: list[dict[str, Any]],
) -> dict[str, Any]:
    goal = row_to_dict(
        conn.execute(
            "SELECT * FROM student_study_goals WHERE user_id = ? AND study_date = ?",
            (user_id, plan_date),
        ).fetchone()
    )
    if goal:
        return goal

    first_task = task_options[0] if task_options else {"typeId": "", "typeName": "今日数学任务"}
    created_at = now_text()
    goal_id = f"SG-{user_id}-{plan_date.replace('-', '')}"
    conn.execute(
        """
        INSERT INTO student_study_goals (
          goal_id, user_id, study_date, room_id, target_minutes, completed_minutes,
          completion_rate, current_focus_minutes, current_task_type_id, current_task_name,
          focus_status, current_round_started_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            goal_id,
            user_id,
            plan_date,
            room_id,
            "180",
            "0",
            "0",
            "45",
            first_task["typeId"],
            first_task["typeName"],
            "idle",
            "",
            created_at,
            created_at,
        ),
    )
    conn.commit()
    return row_to_dict(
        conn.execute(
            "SELECT * FROM student_study_goals WHERE user_id = ? AND study_date = ?",
            (user_id, plan_date),
        ).fetchone()
    )


def class_focus_members(
    conn,
    class_id: str,
    plan_date: str,
    limit: int = 8,
) -> list[dict[str, Any]]:
    rows = rows_to_dicts(
        conn.execute(
            """
            SELECT
              u.user_id,
              u.nickname,
              u.avatar_url,
              COALESCE(g.current_task_name, '') AS current_task_name,
              COALESCE(g.completed_minutes, '0') AS completed_minutes
            FROM student_profiles p
            JOIN users u ON u.user_id = p.user_id
            LEFT JOIN student_study_goals g
              ON g.user_id = p.user_id AND g.study_date = ?
            WHERE p.class_id = ?
              AND u.role = 'student'
              AND u.account_status = 'active'
            ORDER BY CAST(COALESCE(g.completed_minutes, '0') AS REAL) DESC, u.nickname
            LIMIT ?
            """,
            (plan_date, class_id, limit),
        ).fetchall()
    )
    return [
        {
            "userId": row["user_id"],
            "name": row["nickname"],
            "avatarUrl": row["avatar_url"],
            "task": row["current_task_name"] or "今日数学任务",
            "focusedMinutes": as_int(row["completed_minutes"]),
        }
        for row in rows
    ]


def get_study_room(user_id: str, plan_date: str = CURRENT_DATE) -> dict[str, Any]:
    daily_plan = get_daily_plan(user_id, plan_date)
    task_options = [
        {
            "typeId": row["typeId"],
            "typeName": row["typeName"],
            "disabled": len(daily_plan["plan"]["types"]) <= 1,
        }
        for row in daily_plan["plan"]["types"]
    ]

    with get_connection() as conn:
        user = row_to_dict(conn.execute("SELECT * FROM users WHERE user_id = ?", (user_id,)).fetchone())
        profile = row_to_dict(
            conn.execute("SELECT * FROM student_profiles WHERE user_id = ?", (user_id,)).fetchone()
        )
        if not user or not profile:
            raise ValueError("未找到该学生")
        room = study_room_for_profile(conn, profile)
        if not room:
            raise ValueError("未找到该学生对应自习室")
        goal = ensure_study_goal(conn, user_id, plan_date, room["room_id"], task_options)
        members = class_focus_members(conn, profile["class_id"], plan_date)

    target_minutes = clamp(as_int(goal.get("target_minutes"), 180), 120, 480)
    completed_minutes = max(0, as_int(goal.get("completed_minutes")))
    completion_rate = min(100, round(completed_minutes / target_minutes * 100)) if target_minutes else 0
    current_task_type_id = goal.get("current_task_type_id") or (task_options[0]["typeId"] if task_options else "")
    current_task = next((row for row in task_options if row["typeId"] == current_task_type_id), None)
    current_task_name = (current_task or {}).get("typeName") or goal.get("current_task_name") or "今日数学任务"

    return {
        "student": {
            "userId": user["user_id"],
            "nickname": user["nickname"],
            "classId": profile["class_id"],
        },
        "studyRoom": {
            "roomId": room["room_id"],
            "roomName": room["room_name"],
            "onlineCount": as_int(room["online_count"]),
            "quietMode": room.get("quiet_mode_enabled") == "1",
            "rule": room["room_rule"],
            "durationOptions": [30, 45, 60],
            "customDuration": 45,
            "focusMinutes": clamp(as_int(goal.get("current_focus_minutes"), 45), 10, 180),
            "targetMinutes": target_minutes,
            "targetHours": round(target_minutes / 60, 1),
            "completedMinutes": completed_minutes,
            "completedHours": round(completed_minutes / 60, 1),
            "completionRate": completion_rate,
            "currentTaskTypeId": current_task_type_id,
            "currentTaskName": current_task_name,
            "focusStatus": goal.get("focus_status") or "idle",
            "taskOptions": task_options,
            "members": members,
        },
    }


def task_name_from_options(task_options: list[dict[str, Any]], task_type_id: str) -> str:
    match = next((row for row in task_options if row["typeId"] == task_type_id), None)
    if match:
        return match["typeName"]
    return task_options[0]["typeName"] if task_options else "今日数学任务"


def start_focus_session(
    user_id: str,
    plan_date: str,
    task_type_id: str,
    target_minutes: int,
    daily_target_minutes: int | None = None,
) -> dict[str, Any]:
    study_room = get_study_room(user_id, plan_date)
    task_options = study_room["studyRoom"]["taskOptions"]
    valid_type_ids = {row["typeId"] for row in task_options}
    if valid_type_ids and task_type_id not in valid_type_ids:
        raise ValueError("当前任务不属于今日计划")
    target_minutes = clamp(as_int(target_minutes, 45), 10, 180)
    daily_target = clamp(as_int(daily_target_minutes, study_room["studyRoom"]["targetMinutes"]), 120, 480)
    task_name = task_name_from_options(task_options, task_type_id)
    started_at = now_text()
    session_id = f"FS-{plan_date.replace('-', '')}-{user_id}-{uuid.uuid4().hex[:8].upper()}"

    with get_connection() as conn:
        profile = row_to_dict(
            conn.execute("SELECT * FROM student_profiles WHERE user_id = ?", (user_id,)).fetchone()
        )
        if not profile:
            raise ValueError("未找到该学生")
        conn.execute(
            """
            INSERT INTO focus_sessions (
              session_id, user_id, class_id, plan_date, task_type_id, task_name,
              target_minutes, started_at, paused_at, resumed_at, ended_at,
              focused_seconds, counted_minutes, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                session_id,
                user_id,
                profile["class_id"],
                plan_date,
                task_type_id,
                task_name,
                str(target_minutes),
                started_at,
                "",
                "",
                "",
                "0",
                "0",
                "running",
                started_at,
                started_at,
            ),
        )
        conn.execute(
            """
            UPDATE student_study_goals
            SET target_minutes = ?, current_focus_minutes = ?, current_task_type_id = ?,
                current_task_name = ?, focus_status = 'focusing',
                current_round_started_at = ?, updated_at = ?
            WHERE user_id = ? AND study_date = ?
            """,
            (
                str(daily_target),
                str(target_minutes),
                task_type_id,
                task_name,
                started_at,
                started_at,
                user_id,
                plan_date,
            ),
        )
        conn.commit()

    return {
        "session": {
            "sessionId": session_id,
            "status": "running",
            "targetMinutes": target_minutes,
            "taskTypeId": task_type_id,
            "taskName": task_name,
            "startedAt": started_at,
        },
        "studyRoom": get_study_room(user_id, plan_date)["studyRoom"],
    }


def update_focus_status(session_id: str, status: str) -> dict[str, Any]:
    if status not in {"paused", "running"}:
        raise ValueError("不支持的专注状态")
    timestamp = now_text()
    column = "paused_at" if status == "paused" else "resumed_at"
    with get_connection() as conn:
        session = row_to_dict(
            conn.execute("SELECT * FROM focus_sessions WHERE session_id = ?", (session_id,)).fetchone()
        )
        if not session:
            raise ValueError("未找到专注记录")
        conn.execute(
            f"UPDATE focus_sessions SET status = ?, {column} = ?, updated_at = ? WHERE session_id = ?",
            (status, timestamp, timestamp, session_id),
        )
        conn.commit()
    return {"session": {"sessionId": session_id, "status": status, "updatedAt": timestamp}}


def finish_focus_session(session_id: str, focused_seconds: int) -> dict[str, Any]:
    focused_seconds = max(0, as_int(focused_seconds))
    counted_minutes = focused_seconds // 60 if focused_seconds >= 60 else 0
    ended_at = now_text()
    with get_connection() as conn:
        session = row_to_dict(
            conn.execute("SELECT * FROM focus_sessions WHERE session_id = ?", (session_id,)).fetchone()
        )
        if not session:
            raise ValueError("未找到专注记录")
        user_id = session["user_id"]
        plan_date = session["plan_date"]
        conn.execute(
            """
            UPDATE focus_sessions
            SET status = 'completed', ended_at = ?, focused_seconds = ?,
                counted_minutes = ?, updated_at = ?
            WHERE session_id = ?
            """,
            (ended_at, str(focused_seconds), str(counted_minutes), ended_at, session_id),
        )
        goal = row_to_dict(
            conn.execute(
                "SELECT * FROM student_study_goals WHERE user_id = ? AND study_date = ?",
                (user_id, plan_date),
            ).fetchone()
        )
        completed_minutes = as_int(goal.get("completed_minutes") if goal else 0) + counted_minutes
        target_minutes = clamp(as_int(goal.get("target_minutes") if goal else 180), 120, 480)
        completion_rate = completed_minutes / target_minutes if target_minutes else 0
        conn.execute(
            """
            UPDATE student_study_goals
            SET completed_minutes = ?, completion_rate = ?, focus_status = 'idle',
                current_round_started_at = '', updated_at = ?
            WHERE user_id = ? AND study_date = ?
            """,
            (str(completed_minutes), f"{completion_rate:.4f}", ended_at, user_id, plan_date),
        )
        conn.execute(
            """
            UPDATE study_room_members
            SET focused_minutes_today = ?, current_task_name = ?, updated_at = ?
            WHERE user_id = ?
            """,
            (str(completed_minutes), session["task_name"], ended_at, user_id),
        )
        conn.commit()

    return {
        "session": {
            "sessionId": session_id,
            "status": "completed",
            "focusedSeconds": focused_seconds,
            "countedMinutes": counted_minutes,
            "endedAt": ended_at,
        },
        "studyRoom": get_study_room(user_id, plan_date)["studyRoom"],
    }


def school_payload(row: dict[str, Any] | None) -> dict[str, Any]:
    if not row:
        return {"schoolId": "", "name": "未选择", "province": "", "tags": []}
    return {
        "schoolId": row.get("school_id") or "",
        "name": row.get("school_name") or "未选择",
        "province": row.get("province") or "",
        "tags": [item for item in str(row.get("school_tags") or "").split(",") if item],
    }


def get_student_profile(user_id: str, stat_date: str = CURRENT_DATE) -> dict[str, Any]:
    daily_plan = get_daily_plan(user_id, stat_date)
    study_room = get_study_room(user_id, stat_date)
    with get_connection() as conn:
        user = row_to_dict(conn.execute("SELECT * FROM users WHERE user_id = ?", (user_id,)).fetchone())
        profile = row_to_dict(
            conn.execute("SELECT * FROM student_profiles WHERE user_id = ?", (user_id,)).fetchone()
        )
        stats = row_to_dict(
            conn.execute(
                "SELECT * FROM student_stats WHERE user_id = ? AND stat_date = ?",
                (user_id, stat_date),
            ).fetchone()
        ) or {}
        school = None
        if profile and profile.get("target_school_id"):
            school = row_to_dict(
                conn.execute(
                    "SELECT * FROM institutions WHERE school_id = ?",
                    (profile["target_school_id"],),
                ).fetchone()
            )
        if not user or not profile:
            raise ValueError("未找到该学生")

    target_minutes = study_room["studyRoom"]["targetMinutes"]
    completed_minutes = study_room["studyRoom"]["completedMinutes"]
    return {
        "profile": {
            "userId": user["user_id"],
            "nickname": user["nickname"],
            "avatarUrl": user.get("avatar_url") or "",
            "mathType": profile["math_type"],
            "examSubject": profile["math_type"],
            "targetScore": as_int(profile["target_score"]),
            "targetExamYear": profile.get("target_exam_year") or "",
            "targetExamDate": profile.get("target_exam_date") or "",
            "daysToExam": days_between(stat_date, profile.get("target_exam_date") or stat_date),
            "continuousDays": as_int(stats.get("continuous_days")),
            "todayStudyHours": hours_from_minutes(completed_minutes),
            "dailyMathGoalHours": hours_from_minutes(target_minutes),
            "primaryBooks": [profile.get("primary_book_1") or "", profile.get("backup_book") or ""],
            "backupBooks": [profile.get("primary_book_2") or ""],
            "targetSchool": school_payload(school),
            "planTypeCount": len(daily_plan["plan"]["types"]),
        }
    }


def search_institutions(query: str = "", limit: int = 20) -> dict[str, Any]:
    query = str(query or "").strip()
    limit = clamp(as_int(limit, 20), 1, 50)
    with get_connection() as conn:
        if query:
            like = f"%{query}%"
            rows = rows_to_dicts(
                conn.execute(
                    """
                    SELECT * FROM institutions
                    WHERE school_name LIKE ? OR search_keywords LIKE ?
                    ORDER BY CAST(sort_order AS INTEGER), school_name
                    LIMIT ?
                    """,
                    (like, like, limit),
                ).fetchall()
            )
        else:
            rows = rows_to_dicts(
                conn.execute(
                    """
                    SELECT * FROM institutions
                    ORDER BY CAST(sort_order AS INTEGER), school_name
                    LIMIT ?
                    """,
                    (limit,),
                ).fetchall()
            )
    return {"items": [school_payload(row) for row in rows]}


def update_target_school(user_id: str, school_id: str) -> dict[str, Any]:
    with get_connection() as conn:
        school = row_to_dict(conn.execute("SELECT * FROM institutions WHERE school_id = ?", (school_id,)).fetchone())
        if not school:
            raise ValueError("未找到该院校")
        profile = row_to_dict(
            conn.execute("SELECT * FROM student_profiles WHERE user_id = ?", (user_id,)).fetchone()
        )
        if not profile:
            raise ValueError("未找到该学生")
        updated_at = now_text()
        conn.execute(
            """
            UPDATE student_profiles
            SET target_school_id = ?, target_school_name = ?, updated_at = ?
            WHERE user_id = ?
            """,
            (school["school_id"], school["school_name"], updated_at, user_id),
        )
        conn.commit()
    return get_student_profile(user_id, CURRENT_DATE)


def login(login_account: str, password: str) -> dict[str, Any]:
    with get_connection() as conn:
        user = row_to_dict(
            conn.execute(
                "SELECT * FROM users WHERE login_account = ? OR user_id = ?",
                (login_account, login_account),
            ).fetchone()
        )
        if not user or user["account_status"] != "active":
            raise ValueError("账号不存在或已停用")

        expected_password = user.get("login_password") or "123456"
        if password != expected_password:
            raise ValueError("账号或密码错误")

        session_id = f"S-{user['user_id']}-{uuid.uuid4().hex[:12].upper()}"
        token = hashlib.sha256(f"{session_id}:{password}:{now_text()}".encode("utf-8")).hexdigest()

        if user.get("current_session_id"):
            conn.execute(
                "UPDATE user_sessions SET revoked_at = ?, updated_at = ? WHERE session_id = ?",
                (now_text(), now_text(), user["current_session_id"]),
            )

        conn.execute(
            """
            INSERT INTO user_sessions (
              session_id, user_id, refresh_token_hash, device_id, device_name,
              ip_address, user_agent, expires_at, revoked_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                session_id,
                user["user_id"],
                f"$sha256${token}",
                "LOCAL-DEV",
                "Local API Client",
                "127.0.0.1",
                "FastAPI Test Client",
                "2026-12-31 23:59:59",
                "",
                now_text(),
                now_text(),
            ),
        )
        conn.execute(
            "UPDATE users SET current_session_id = ?, last_login_at = ?, updated_at = ? WHERE user_id = ?",
            (session_id, now_text(), now_text(), user["user_id"]),
        )
        conn.commit()

        return {
            "token": token,
            "sessionId": session_id,
            "user": {
                "userId": user["user_id"],
                "nickname": user["nickname"],
                "role": user["role"],
            },
        }


def get_daily_plan(user_id: str, plan_date: str = CURRENT_DATE) -> dict[str, Any]:
    with get_connection() as conn:
        user = row_to_dict(conn.execute("SELECT * FROM users WHERE user_id = ?", (user_id,)).fetchone())
        profile = row_to_dict(
            conn.execute("SELECT * FROM student_profiles WHERE user_id = ?", (user_id,)).fetchone()
        )
        progress = row_to_dict(
            conn.execute("SELECT * FROM student_progress WHERE user_id = ?", (user_id,)).fetchone()
        )
        if not user or not profile:
            raise ValueError("未找到该学生今日计划")

        if is_service_expired(profile, plan_date):
            return {
                "student": {
                    "userId": user["user_id"],
                    "nickname": user["nickname"],
                    "mathType": profile["math_type"],
                    "targetScore": as_int(profile["target_score"]),
                    "paidUntil": profile["paid_until"],
                },
                "plan": {
                    "planId": "",
                    "planDate": plan_date,
                    "planStatus": "expired",
                    "slogan": "服务已到期，请联系老师续费后继续查看今日计划。",
                    "examDate": profile.get("target_exam_date") or "",
                    "daysToExam": 0,
                    "types": [],
                    "feedbacks": [],
                },
            }
        rows = rows_to_dicts(
            conn.execute(
                """
                SELECT * FROM daily_plans
                WHERE user_id = ? AND plan_date = ?
                ORDER BY CAST(type_index AS INTEGER), CAST(question_order AS INTEGER)
                """,
                (user_id, plan_date),
            ).fetchall()
        )
        if not rows:
            if not progress:
                raise ValueError("未找到该学生学习进度")
            rows = generate_daily_plan(conn, user, profile, progress, plan_date)
        if not rows:
            raise ValueError("未找到该学生今日计划")

        feedback_rows = rows_to_dicts(
            conn.execute(
                """
                SELECT * FROM question_feedbacks
                WHERE user_id = ? AND plan_date = ?
                ORDER BY submitted_at, question_id
                """,
                (user_id, plan_date),
            ).fetchall()
        )

    types: list[dict[str, Any]] = []
    for type_index in sorted({row["type_index"] for row in rows}, key=lambda value: as_int(value)):
        type_rows = [row for row in rows if row["type_index"] == type_index]
        first = type_rows[0]
        sources: dict[str, list[str]] = {}
        for row in type_rows:
            sources.setdefault(row["source"], []).append(row["original_position_text"])
        types.append(
            {
                "typeIndex": as_int(type_index),
                "typeId": first["type_id"],
                "typeName": first["type_name"],
                "feedbackOpenStatus": first["feedback_open_status"],
                "sources": [
                    {"source": source, "items": items}
                    for source, items in sources.items()
                ],
                "questions": [
                    {
                        "questionId": row["question_id"],
                        "label": row["original_position_text"],
                        "order": as_int(row["question_order"]),
                    }
                    for row in type_rows
                ],
            }
        )

    return {
        "student": {
            "userId": user["user_id"],
            "nickname": user["nickname"],
            "mathType": profile["math_type"],
            "targetScore": as_int(profile["target_score"]),
        },
        "plan": {
            "planId": rows[0]["plan_id"],
            "planDate": rows[0]["plan_date"],
            "planStatus": rows[0]["plan_status"],
            "slogan": rows[0]["slogan"],
            "examDate": rows[0]["exam_date"],
            "daysToExam": as_int(rows[0]["days_to_exam"]),
            "types": types,
            "feedbacks": feedback_rows,
            "completedMessage": completion_message() if rows[0]["plan_status"] == "completed" else "",
        },
    }


def submit_feedback(
    user_id: str,
    plan_date: str,
    type_id: str,
    answers: list[dict[str, str]],
) -> dict[str, Any]:
    if not answers:
        raise ValueError("answers 不能为空")

    with get_connection() as conn:
        plan_rows = rows_to_dicts(
            conn.execute(
                """
                SELECT * FROM daily_plans
                WHERE user_id = ? AND plan_date = ? AND type_id = ?
                ORDER BY CAST(question_order AS INTEGER)
                """,
                (user_id, plan_date, type_id),
            ).fetchall()
        )
        if not plan_rows:
            raise ValueError("未找到要提交的题型计划")
        if plan_rows[0]["feedback_open_status"] != "open":
            raise ValueError("该题型当前不可提交反馈")

        expected_ids = {row["question_id"] for row in plan_rows}
        answer_by_id = {item["questionId"]: item["result"] for item in answers}
        if set(answer_by_id) != expected_ids:
            raise ValueError("提交题目必须与当前开放题型完全一致")

        valid_results = {"correct", "wrong", "unattempted"}
        if any(result not in valid_results for result in answer_by_id.values()):
            raise ValueError("result 只能是 correct、wrong、unattempted")

        conn.execute(
            "DELETE FROM question_feedbacks WHERE user_id = ? AND plan_date = ? AND type_id = ?",
            (user_id, plan_date, type_id),
        )

        submitted_at = now_text()
        for index, row in enumerate(plan_rows, start=1):
            result = answer_by_id[row["question_id"]]
            is_wrong = "1" if result in {"wrong", "unattempted"} else "0"
            is_blocker = "1" if result == "unattempted" else "0"
            conn.execute(
                """
                INSERT INTO question_feedbacks (
                  feedback_id, plan_id, user_id, plan_date, type_id, question_id,
                  result, is_wrong_record, is_unfinished_blocker, submitted_at,
                  created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    f"F-{plan_date.replace('-', '')}-{user_id}-{type_id}-{index}",
                    row["plan_id"],
                    user_id,
                    plan_date,
                    type_id,
                    row["question_id"],
                    result,
                    is_wrong,
                    is_blocker,
                    submitted_at,
                    submitted_at,
                    submitted_at,
                ),
            )

        has_unattempted = any(result == "unattempted" for result in answer_by_id.values())
        correct_count = sum(1 for result in answer_by_id.values() if result == "correct")
        accuracy = correct_count / len(answer_by_id)

        conn.execute(
            """
            UPDATE daily_plans
            SET feedback_open_status = 'submitted', updated_at = ?
            WHERE user_id = ? AND plan_date = ? AND type_id = ?
            """,
            (submitted_at, user_id, plan_date, type_id),
        )

        progress_type_id = type_id
        progress_status = "active"
        last_completed_type_id = ""
        unfinished_type_id = type_id if has_unattempted else ""
        unfinished_question_ids = json.dumps(
            [question_id for question_id, result in answer_by_id.items() if result == "unattempted"],
            ensure_ascii=False,
        )

        if has_unattempted:
            new_status = "blocked_by_unfinished"
        else:
            last_completed_type_id = type_id
            next_row = row_to_dict(
                conn.execute(
                    """
                    SELECT * FROM daily_plans
                    WHERE user_id = ? AND plan_date = ? AND feedback_open_status = 'locked'
                    ORDER BY CAST(type_index AS INTEGER)
                    LIMIT 1
                    """,
                    (user_id, plan_date),
                ).fetchone()
            )
            if next_row:
                conn.execute(
                    """
                    UPDATE daily_plans
                    SET feedback_open_status = 'open', updated_at = ?
                    WHERE user_id = ? AND plan_date = ? AND type_id = ?
                    """,
                    (submitted_at, user_id, plan_date, next_row["type_id"]),
                )
                new_status = "in_progress"
                progress_type_id = next_row["type_id"]
            else:
                new_status = "completed"
                next_global_type = next_assignable_type(conn, type_id)
                if next_global_type:
                    progress_type_id = next_global_type["type_id"]
                else:
                    progress_status = "completed"

        conn.execute(
            """
            UPDATE daily_plans
            SET plan_status = ?, updated_at = ?
            WHERE user_id = ? AND plan_date = ?
            """,
            (new_status, submitted_at, user_id, plan_date),
        )

        progress_type = row_to_dict(
            conn.execute("SELECT * FROM question_types WHERE type_id = ?", (progress_type_id,)).fetchone()
        )
        conn.execute(
            """
            UPDATE student_progress
            SET current_type_id = ?, current_type_sort_code = ?, progress_status = ?,
                last_completed_type_id = COALESCE(NULLIF(?, ''), last_completed_type_id),
                unfinished_type_id = ?, unfinished_question_ids = ?, updated_at = ?
            WHERE user_id = ?
            """,
            (
                progress_type_id,
                progress_type.get("sort_code") if progress_type else "",
                progress_status,
                last_completed_type_id,
                unfinished_type_id,
                unfinished_question_ids,
                submitted_at,
                user_id,
            ),
        )

        plan_progress = row_to_dict(
            conn.execute(
                """
                SELECT
                  COUNT(DISTINCT type_id) AS total_types,
                  COUNT(DISTINCT CASE WHEN feedback_open_status = 'submitted' THEN type_id END) AS submitted_types
                FROM daily_plans
                WHERE user_id = ? AND plan_date = ?
                """,
                (user_id, plan_date),
            ).fetchone()
        )
        total_types = max(as_int(plan_progress.get("total_types")), 1)
        submitted_types = as_int(plan_progress.get("submitted_types"))
        today_completion_rate = submitted_types / total_types

        student_profile = row_to_dict(
            conn.execute("SELECT * FROM student_profiles WHERE user_id = ?", (user_id,)).fetchone()
        )
        next_checkin_order = row_to_dict(
            conn.execute(
                """
                SELECT COALESCE(MAX(CAST(s.today_checkin_order AS INTEGER)), 0) + 1 AS next_order
                FROM student_stats s
                JOIN student_profiles p ON p.user_id = s.user_id
                WHERE s.stat_date = ? AND p.class_id = ?
                """,
                (plan_date, student_profile.get("class_id") if student_profile else ""),
            ).fetchone()
        )

        conn.execute(
            """
            UPDATE student_stats
            SET today_completion_rate = ?,
                today_checkin_order = CASE
                  WHEN ? = 'completed' AND COALESCE(today_checkin_order, '') = '' THEN ?
                  ELSE today_checkin_order
                END,
                today_checkin_at = CASE
                  WHEN ? = 'completed' AND COALESCE(today_checkin_at, '') = '' THEN ?
                  ELSE today_checkin_at
                END,
                overall_accuracy = ?,
                updated_at = ?
            WHERE user_id = ? AND stat_date = ?
            """,
            (
                f"{today_completion_rate:.4f}",
                new_status,
                str(next_checkin_order.get("next_order", 1)),
                new_status,
                submitted_at,
                f"{accuracy:.4f}",
                submitted_at,
                user_id,
                plan_date,
            ),
        )
        conn.commit()

    return {
        "planStatus": new_status,
        "submittedTypeId": type_id,
        "accuracy": round(accuracy, 4),
        "hasUnattempted": has_unattempted,
        "dailyPlan": get_daily_plan(user_id, plan_date),
    }

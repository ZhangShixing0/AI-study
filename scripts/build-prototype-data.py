import json
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
SAMPLE_DIR = ROOT / "data" / "samples"
OUT_FILE = ROOT / "prototypes" / "student-mobile-v0.1" / "data" / "app-data.js"
CURRENT_USER_ID = "10001"


def read_table(name):
    path = SAMPLE_DIR / f"{name}.xlsx"
    df = pd.read_excel(path, dtype=str).fillna("")
    return df.to_dict("records")


def pct(value):
    try:
        return round(float(value) * 100)
    except (TypeError, ValueError):
        return 0


def hours(minutes):
    try:
        return round(float(minutes) / 60, 1)
    except (TypeError, ValueError):
        return 0


def display_date(date_text):
    dt = pd.to_datetime(date_text)
    return f"{dt.year}年{dt.month}月{dt.day}日"


def group_plan_sources(rows):
    grouped = {}
    for row in sorted(rows, key=lambda item: int(item.get("question_order") or 0)):
        grouped.setdefault(row["source"], []).append(row["original_position_text"])
    return [f"《{source}》 " + "、".join(items) for source, items in grouped.items()]


def build():
    users = read_table("users")
    profiles = read_table("student_profiles")
    institutions = read_table("institutions")
    daily_plans = read_table("daily_plans")
    question_types = read_table("question_types")
    feedbacks = read_table("question_feedbacks")
    stats = read_table("student_stats")
    activity = read_table("student_daily_activity")
    mastery = read_table("type_mastery_stats")
    losses = read_table("loss_reason_stats")
    priorities = read_table("priority_recommendations")
    rooms = read_table("study_rooms")
    goals = read_table("student_study_goals")
    members = read_table("study_room_members")

    users_by_id = {row["user_id"]: row for row in users}
    profile = next(row for row in profiles if row["user_id"] == CURRENT_USER_ID)
    user = users_by_id[CURRENT_USER_ID]
    user_stats = next(row for row in stats if row["user_id"] == CURRENT_USER_ID)

    plan_rows = [row for row in daily_plans if row["user_id"] == CURRENT_USER_ID]
    plan_rows.sort(key=lambda row: (int(row.get("type_index") or 0), int(row.get("question_order") or 0)))
    plan_meta = plan_rows[0]
    type_rows = []
    for type_index in sorted({row["type_index"] for row in plan_rows}, key=int):
        rows = [row for row in plan_rows if row["type_index"] == type_index]
        first = rows[0]
        type_meta = next((row for row in question_types if row["type_id"] == first["type_id"]), {})
        theme = "purple" if len(type_rows) % 2 else "green"
        image = type_meta.get("lecture_image_url") or (
            "assets/images/type-limit-purple.placeholder.png"
            if theme == "purple"
            else "assets/images/type-limit-green.placeholder.png"
        )
        if image.endswith(".png") and "placeholder" not in image and not (ROOT / "prototypes" / "student-mobile-v0.1" / image).exists():
            image = image.replace(".png", ".placeholder.png")
        type_rows.append(
            {
                "index": int(type_index),
                "typeId": first["type_id"],
                "title": first["type_name"],
                "theme": theme,
                "image": image,
                "sources": group_plan_sources(rows),
                "feedbackStatus": first["feedback_open_status"],
                "questions": [
                    {
                        "questionId": row["question_id"],
                        "label": row["original_position_text"],
                        "order": int(row.get("question_order") or 0),
                    }
                    for row in rows
                ],
            }
        )

    open_type = next((item for item in type_rows if item["feedbackStatus"] == "open"), type_rows[0])
    plan_feedbacks = [
        row
        for row in feedbacks
        if row["user_id"] == CURRENT_USER_ID and row["plan_id"] == plan_meta["plan_id"]
    ]

    rank_rows = []
    for stat in stats:
        rank_user = users_by_id.get(stat["user_id"], {})
        if rank_user.get("role") != "student":
            continue
        rank_rows.append(
            {
                "userId": stat["user_id"],
                "name": rank_user.get("nickname", "同学"),
                "continuousDays": int(float(stat["continuous_days"] or 0)),
                "todayCompletionRate": pct(stat["today_completion_rate"]),
                "rankInClass": int(float(stat["rank_in_class"] or 999)),
                "isMe": stat["user_id"] == CURRENT_USER_ID,
            }
        )
    rank_rows.sort(key=lambda row: (-row["continuousDays"], row["rankInClass"], row["name"]))

    plan_end_date = pd.to_datetime(plan_meta["plan_date"])
    plan_start_date = plan_end_date - pd.Timedelta(days=14)
    activity_end_date = plan_end_date - pd.Timedelta(days=1)
    source_activity_rows = [
        row
        for row in activity
        if row["user_id"] == CURRENT_USER_ID
        and plan_start_date <= pd.to_datetime(row["activity_date"]) <= activity_end_date
    ]
    activity_by_date = {row["activity_date"]: row for row in source_activity_rows}
    activity_rows = []
    for offset in range(14):
        current_date = plan_start_date + pd.Timedelta(days=offset)
        key = current_date.strftime("%Y-%m-%d")
        row = activity_by_date.get(
            key,
            {
                "activity_date": key,
                "completed_minutes": "0",
                "intensity_level": "none",
                "is_studied": "0",
            },
        )
        activity_rows.append(row)
    total_minutes = sum(float(row["completed_minutes"] or 0) for row in activity_rows)
    total_hours = hours(total_minutes)
    max_hours = max([hours(row["completed_minutes"]) for row in activity_rows] or [0])
    continuous_days = 0
    for row in reversed(activity_rows):
        studied = row["is_studied"] == "1" and float(row["completed_minutes"] or 0) > 0
        if not studied:
            break
        continuous_days += 1

    chapter_rows = []
    seen_chapters = set()
    for row in sorted(question_types, key=lambda item: item["chapter_id"]):
        chapter_id = row["chapter_id"]
        if not chapter_id or chapter_id in seen_chapters:
            continue
        seen_chapters.add(chapter_id)
        chapter_rows.append({"chapterId": chapter_id, "name": row["chapter_name"]})
    type_chapters = {
        row["type_id"]: {"chapterId": row["chapter_id"], "name": row["chapter_name"]}
        for row in question_types
        if row["chapter_id"]
    }
    chapter_stats = {
        row["chapterId"]: {
            "chapterId": row["chapterId"],
            "name": row["name"],
            "rates": [],
            "submittedQuestionCount": 0,
            "wrongQuestionCount": 0,
        }
        for row in chapter_rows
    }
    for row in [item for item in mastery if item["user_id"] == CURRENT_USER_ID]:
        chapter = type_chapters.get(row["type_id"])
        if not chapter:
            continue
        target = chapter_stats[chapter["chapterId"]]
        target["rates"].append(float(row["mastery_rate"] or 0))
        target["submittedQuestionCount"] += int(float(row["submitted_question_count"] or 0))
        target["wrongQuestionCount"] += int(float(row["wrong_question_count"] or 0))
    mastery_rows = []
    for row in chapter_stats.values():
        rates = row.pop("rates")
        rate = round(sum(rates) / len(rates) * 100) if rates else 0
        row["rate"] = rate
        row["tag"] = "未开始" if not rates else "良好" if rate >= 75 else "待提升" if rate >= 60 else "薄弱项"
        mastery_rows.append(row)
    loss_rows = [row for row in losses if row["user_id"] == CURRENT_USER_ID]
    loss_rows.sort(key=lambda row: int(row["sort_order"] or 0))
    weakest_rows = sorted(mastery_rows, key=lambda row: (row["rate"], row["name"]))[:3]

    room_goal = next(row for row in goals if row["user_id"] == CURRENT_USER_ID)
    room = next(row for row in rooms if row["room_id"] == room_goal["room_id"])
    room_members = [
        row for row in members if row["room_id"] == room["room_id"] and row["online_status"] == "online"
    ][:5]
    selected_school = next(
        (row for row in institutions if row["school_id"] == profile.get("target_school_id", "")),
        None,
    )

    data = {
        "currentUserId": CURRENT_USER_ID,
        "student": {
            "name": user["nickname"],
            "mathType": profile["math_type"],
            "targetScore": int(float(profile["target_score"])),
            "examDate": profile["target_exam_date"],
        },
        "plan": {
            "date": display_date(plan_meta["plan_date"]),
            "status": "待反馈" if plan_meta["plan_status"] == "in_progress" else "已完成",
            "slogan": plan_meta["slogan"],
            "daysToExam": int(float(plan_meta["days_to_exam"])),
            "totalTypes": len(type_rows),
            "types": type_rows,
            "currentFeedbackTypeId": open_type["typeId"],
            "feedbackItems": open_type["questions"],
            "submittedFeedbacks": plan_feedbacks,
        },
        "rank": {
            "myRank": int(float(user_stats["rank_in_class"])),
            "myContinuousDays": int(float(user_stats["continuous_days"])),
            "top": rank_rows[:3],
            "rows": rank_rows[:5],
        },
            "curve": {
                "title": "数学能力成长曲线",
                "masteryLabel": "章节掌握度",
                "targetScore": int(float(profile["target_score"])),
            "overallAccuracy": pct(user_stats["overall_accuracy"]),
            "repeatWrongRate": pct(user_stats["repeat_wrong_rate"]),
            "weeklyCompletionRate": pct(user_stats["weekly_completion_rate"]),
            "activitySummary": {
                "totalHours": round(total_hours, 1),
                "maxHours": round(max_hours, 1),
                "continuousDays": continuous_days,
            },
            "activity": [
                {
                    "date": pd.to_datetime(row["activity_date"]).strftime("%m.%d"),
                    "rawDate": row["activity_date"],
                    "level": row["intensity_level"],
                    "hours": hours(row["completed_minutes"]),
                    "minutes": int(float(row["completed_minutes"] or 0)),
                    "studied": row["is_studied"] == "1",
                }
                for row in activity_rows
            ],
            "mastery": [
                {
                    "chapterId": row["chapterId"],
                    "name": row["name"],
                    "rate": row["rate"],
                    "tag": row["tag"],
                    "submittedQuestionCount": row["submittedQuestionCount"],
                    "wrongQuestionCount": row["wrongQuestionCount"],
                }
                for row in mastery_rows
            ],
            "lossReasons": [
                {
                    "name": row["reason_name"],
                    "rate": pct(row["reason_rate"]),
                    "count": int(float(row["wrong_question_count"] or 0)),
                }
                for row in loss_rows
            ],
            "priorities": [
                {
                    "rank": index,
                    "chapterId": row["chapterId"],
                    "name": row["name"],
                    "rate": row["rate"],
                    "tag": row["tag"],
                    "reason": f"当前章节得分率 {row['rate']}%，是该学生掌握度最低的章节之一，建议优先复盘错题和基础方法。",
                    "icon": "book" if index == 1 else "note" if index == 2 else "triangle",
                }
                for index, row in enumerate(weakest_rows, start=1)
            ],
        },
        "studyRoom": {
            "roomName": room["room_name"],
            "onlineCount": int(float(room["online_count"])),
            "quietMode": room["quiet_mode_enabled"] == "1",
            "rule": room["room_rule"],
            "targetHours": hours(room_goal["target_minutes"]),
            "completedHours": hours(room_goal["completed_minutes"]),
            "completionRate": pct(room_goal["completion_rate"]),
            "focusMinutes": int(float(room_goal["current_focus_minutes"] or 0)),
            "currentTaskName": room_goal["current_task_name"],
            "members": [
                {
                    "name": users_by_id.get(row["user_id"], {}).get("nickname", "同学"),
                    "task": row["current_task_name"],
                    "focusedMinutes": int(float(row["focused_minutes_today"] or 0)),
                }
                for row in room_members
            ],
        },
        "profile": {
            "userId": user["user_id"],
            "nickname": user["nickname"],
            "avatarUrl": user["avatar_url"],
            "mathType": profile["math_type"],
            "examSubject": profile["math_type"],
            "targetScore": int(float(profile["target_score"] or 0)),
            "targetExamYear": profile["target_exam_year"],
            "targetExamDate": profile["target_exam_date"],
            "daysToExam": max(0, (pd.to_datetime(profile["target_exam_date"]) - pd.to_datetime(plan_meta["plan_date"])).days),
            "continuousDays": int(float(user_stats["continuous_days"] or 0)),
            "todayStudyHours": hours(room_goal["completed_minutes"]),
            "dailyMathGoalHours": hours(room_goal["target_minutes"]),
            "primaryBooks": [profile["primary_book_1"], profile["backup_book"]],
            "backupBooks": [profile["primary_book_2"]],
            "targetSchool": {
                "schoolId": selected_school["school_id"] if selected_school else "",
                "name": selected_school["school_name"] if selected_school else "未选择",
                "province": selected_school["province"] if selected_school else "",
                "tags": [item for item in (selected_school["school_tags"] if selected_school else "").split(",") if item],
            },
            "planTypeCount": len(type_rows),
        },
    }

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(
        "window.APP_DATA = "
        + json.dumps(data, ensure_ascii=False, indent=2)
        + ";\n",
        encoding="utf-8",
    )
    print(f"Wrote {OUT_FILE.relative_to(ROOT)}")


if __name__ == "__main__":
    build()

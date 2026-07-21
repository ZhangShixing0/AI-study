from __future__ import annotations

import os
import re
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator


class PublicSeedUnavailable(RuntimeError):
    pass


def _public_database_url() -> str:
    return (os.environ.get("PUBLIC_SEED_DATABASE_URL") or os.environ.get("DATABASE_URL") or "").strip()


def _public_sqlite_path() -> str:
    return (os.environ.get("PUBLIC_SEED_SQLITE_PATH") or "").strip()


def is_public_seed_configured() -> bool:
    return bool(_public_database_url() or _public_sqlite_path())


def reset_public_seed_reader() -> None:
    # Kept as an explicit hook for tests and future pooled PostgreSQL readers.
    return None


def _dicts_from_sqlite(rows: list[sqlite3.Row]) -> list[dict[str, Any]]:
    return [{key: row[key] for key in row.keys()} for row in rows]


def _sql_for_dialect(sql: str, dialect: str) -> str:
    if dialect == "postgres":
        result: list[str] = []
        index = 0
        while index < len(sql):
            char = sql[index]
            if char == "?":
                result.append("%s")
                index += 1
                continue
            if char == "%":
                next_char = sql[index + 1] if index + 1 < len(sql) else ""
                if next_char in {"s", "b", "t", "%"}:
                    result.append(char + next_char)
                    index += 2
                    continue
                result.append("%%")
                index += 1
                continue
            result.append(char)
            index += 1
        return "".join(result)
    return sql


@contextmanager
def _connect_public_seed() -> Iterator[tuple[Any, str]]:
    sqlite_path = _public_sqlite_path()
    if sqlite_path:
        conn = sqlite3.connect(Path(sqlite_path))
        conn.row_factory = sqlite3.Row
        try:
            yield conn, "sqlite"
        finally:
            conn.close()
        return

    database_url = _public_database_url()
    if database_url:
        try:
            import psycopg
            from psycopg.rows import dict_row
        except ImportError as exc:
            raise PublicSeedUnavailable("psycopg is required when DATABASE_URL is configured") from exc
        with psycopg.connect(database_url, row_factory=dict_row) as conn:
            yield conn, "postgres"
        return

    raise PublicSeedUnavailable("public seed database is not configured")


def _fetch_all(conn: Any, dialect: str, sql: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    cursor = conn.execute(_sql_for_dialect(sql, dialect), params)
    try:
        rows = cursor.fetchall()
        if dialect == "sqlite":
            return _dicts_from_sqlite(rows)
        return [dict(row) for row in rows]
    finally:
        close = getattr(cursor, "close", None)
        if close:
            close()


def _fetch_one(conn: Any, dialect: str, sql: str, params: tuple[Any, ...] = ()) -> dict[str, Any] | None:
    cursor = conn.execute(_sql_for_dialect(sql, dialect), params)
    try:
        row = cursor.fetchone()
        if row is None:
            return None
        if dialect == "sqlite":
            return {key: row[key] for key in row.keys()}
        return dict(row)
    finally:
        close = getattr(cursor, "close", None)
        if close:
            close()


def _truthy(value: Any) -> bool:
    return str(value or "").strip().lower() in {"1", "true", "yes", "是", "active"}


def _as_int(value: Any, default: int = 0) -> int:
    try:
        return int(float(str(value).strip()))
    except (TypeError, ValueError):
        return default


def _book_legacy_code(book_id: str, book_name: str) -> str:
    book_id = str(book_id or "").strip()
    match = re.match(r"^m\d+_(.+)$", book_id)
    if match:
        return match.group(1)
    name_match = re.search(r"\d+", str(book_name or ""))
    if name_match:
        return name_match.group(0)
    return book_id


def _active_flag(dialect: str) -> bool | str:
    return True if dialect == "postgres" else "1"


def _math_prefix(math_type: str) -> str:
    return {
        "数学一": "math1",
        "数学二": "math2",
        "数学三": "math3",
    }.get(str(math_type or "").strip(), "math2")


def _fallback_plan_variant_id(math_type: str, review_order: str) -> str:
    review_order = str(review_order or "").strip() or "mixed"
    return f"{_math_prefix(math_type)}_{review_order}"


def _school_payload(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "schoolId": row.get("school_id") or "",
        "name": row.get("school_name") or "",
        "province": row.get("province") or "",
        "tags": [item for item in str(row.get("school_tags") or "").split(",") if item],
    }


def search_public_institutions(query: str = "", limit: int = 20) -> dict[str, Any]:
    query = str(query or "").strip()
    limit = max(1, min(_as_int(limit, 20), 50))
    with _connect_public_seed() as (conn, dialect):
        if query:
            like = f"%{query}%"
            rows = _fetch_all(
                conn,
                dialect,
                """
                SELECT school_id, school_name, school_tags, province, search_keywords, sort_order
                FROM institutions
                WHERE school_name LIKE ? OR search_keywords LIKE ?
                ORDER BY sort_order, school_name
                LIMIT ?
                """,
                (like, like, limit),
            )
        else:
            rows = _fetch_all(
                conn,
                dialect,
                """
                SELECT school_id, school_name, school_tags, province, search_keywords, sort_order
                FROM institutions
                ORDER BY sort_order, school_name
                LIMIT ?
                """,
                (limit,),
            )
    return {"items": [_school_payload(row) for row in rows]}


def _legacy_registration_options(math_type: str) -> dict[str, Any]:
    return {
        "mathType": math_type,
        "dataSource": "legacy_fallback",
        "planVariants": [
            {
                "planVariantId": "math2_mixed",
                "reviewOrder": "mixed",
                "variantName": "数二高数线代穿插版",
                "studentLabel": "高数线代穿插学习",
                "description": "",
                "version": "legacy",
                "sortOrder": 1,
            },
            {
                "planVariantId": "math2_gaoshu_first",
                "reviewOrder": "gaoshu_first",
                "variantName": "数二先高数后线代版",
                "studentLabel": "先高数后线代",
                "description": "",
                "version": "legacy",
                "sortOrder": 2,
            },
        ],
        "exerciseBooks": [
            {
                "bookId": "m2_880",
                "legacyCode": "880",
                "bookName": "880题",
                "bookType": "主选",
                "planStage": "强化",
                "sortOrder": 1,
            },
            {
                "bookId": "m2_1000",
                "legacyCode": "1000",
                "bookName": "1000题",
                "bookType": "主选",
                "planStage": "强化",
                "sortOrder": 2,
            },
            {
                "bookId": "m2_660",
                "legacyCode": "660",
                "bookName": "660题",
                "bookType": "备选",
                "planStage": "强化",
                "sortOrder": 3,
            },
        ],
        "classIntake": [],
        "startChapterOptionsByReviewOrder": {
            "mixed": [],
            "gaoshu_first": [],
        },
        "defaults": {
            "reviewOrder": "mixed",
            "primaryBookIds": ["m2_880", "m2_1000"],
            "backupBookId": "m2_660",
        },
    }


def _start_chapter_options_by_review_order(
    conn: Any,
    dialect: str,
    math_type: str,
    plan_rows: list[dict[str, Any]],
) -> dict[str, list[dict[str, Any]]]:
    result: dict[str, list[dict[str, Any]]] = {
        str(plan.get("review_order") or "").strip(): []
        for plan in plan_rows
        if str(plan.get("review_order") or "").strip()
    }
    if not result:
        result = {"mixed": [], "gaoshu_first": []}
    if not _table_exists(conn, dialect, "chapters") or not _table_exists(conn, dialect, "chapter_orders"):
        return result
    for plan in plan_rows:
        review_order = str(plan.get("review_order") or "").strip()
        plan_variant_id = str(plan.get("plan_variant_id") or "").strip()
        if not review_order or not plan_variant_id:
            continue
        rows = _fetch_all(
            conn,
            dialect,
            """
            SELECT c.chapter_id, c.chapter_name, c.subject, o.chapter_sort
            FROM chapter_orders o
            JOIN chapters c ON c.chapter_id = o.chapter_id
            WHERE c.math_type = ?
              AND c.is_active = ?
              AND o.plan_variant_id = ?
              AND o.is_active = ?
            ORDER BY CAST(o.chapter_sort AS INTEGER), c.chapter_id
            """,
            (math_type, _active_flag(dialect), plan_variant_id, _active_flag(dialect)),
        )
        result[review_order] = [
            {
                "chapterId": row.get("chapter_id") or "",
                "chapterName": row.get("chapter_name") or "",
                "subject": row.get("subject") or "",
                "sortOrder": _as_int(row.get("chapter_sort")),
            }
            for row in rows
        ]
    return result


def get_registration_options(math_type: str = "数学二") -> dict[str, Any]:
    math_type = str(math_type or "数学二").strip() or "数学二"
    if not is_public_seed_configured():
        return _legacy_registration_options(math_type)

    with _connect_public_seed() as (conn, dialect):
        plan_rows = _fetch_all(
            conn,
            dialect,
            """
            SELECT plan_variant_id, math_type, review_order, variant_name, student_label,
                   description, is_active, version, sort_order
            FROM plan_variants
            WHERE math_type = ? AND is_active = ?
            ORDER BY sort_order, plan_variant_id
            """,
            (math_type, _active_flag(dialect)),
        )
        book_rows = _fetch_all(
            conn,
            dialect,
            """
            SELECT book_id, book_name, book_type, math_type, plan_stage,
                   is_registration_selectable, is_active, sort_order
            FROM exercise_books
            WHERE (math_type = ? OR COALESCE(math_type, '') = '')
              AND is_registration_selectable = ?
              AND is_active = ?
            ORDER BY sort_order, book_id
            """,
            (math_type, _active_flag(dialect), _active_flag(dialect)),
        )
        intake_rows = _fetch_all(
            conn,
            dialect,
            """
            SELECT
              s.setting_id, s.math_type, s.level, s.active_class_id, s.is_active,
              c.class_name, c.qq_group_number, c.group_name, c.capacity,
              c.is_accepting_new_students
            FROM class_intake_settings s
            JOIN classes c ON c.class_id = s.active_class_id
            WHERE s.math_type = ? AND s.is_active = ?
            ORDER BY s.level
            """,
            (math_type, _active_flag(dialect)),
        )
        start_chapters = _start_chapter_options_by_review_order(conn, dialect, math_type, plan_rows)

    exercise_books = [
        {
            "bookId": row.get("book_id") or "",
            "legacyCode": _book_legacy_code(row.get("book_id") or "", row.get("book_name") or ""),
            "bookName": row.get("book_name") or "",
            "bookType": row.get("book_type") or "",
            "planStage": row.get("plan_stage") or "",
            "sortOrder": _as_int(row.get("sort_order")),
        }
        for row in book_rows
    ]
    return {
        "mathType": math_type,
        "dataSource": "public_seed",
        "planVariants": [
            {
                "planVariantId": row.get("plan_variant_id") or "",
                "reviewOrder": row.get("review_order") or "",
                "variantName": row.get("variant_name") or "",
                "studentLabel": row.get("student_label") or "",
                "description": row.get("description") or "",
                "version": row.get("version") or "",
                "sortOrder": _as_int(row.get("sort_order")),
            }
            for row in plan_rows
        ],
        "exerciseBooks": exercise_books,
        "classIntake": [
            {
                "level": row.get("level") or "",
                "activeClassId": row.get("active_class_id") or "",
                "className": row.get("class_name") or "",
                "qqGroupNumber": row.get("qq_group_number") or "",
                "groupName": row.get("group_name") or "",
                "capacity": _as_int(row.get("capacity")),
                "isAcceptingNewStudents": _truthy(row.get("is_accepting_new_students")),
            }
            for row in intake_rows
        ],
        "startChapterOptionsByReviewOrder": start_chapters,
        "defaults": {
            "reviewOrder": plan_rows[0].get("review_order") if plan_rows else "mixed",
            "primaryBookIds": [row["bookId"] for row in exercise_books[:2]],
            "backupBookId": exercise_books[2]["bookId"] if len(exercise_books) >= 3 else "",
        },
    }


def _table_exists(conn: Any, dialect: str, table_name: str) -> bool:
    if dialect == "sqlite":
        row = _fetch_one(
            conn,
            dialect,
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
            (table_name,),
        )
        return bool(row)

    row = _fetch_one(
        conn,
        dialect,
        "SELECT to_regclass(?) AS table_ref",
        (f"public.{table_name}",),
    )
    return bool(row and row.get("table_ref"))


def _class_member_count(conn: Any, dialect: str, class_id: str) -> int:
    if not _table_exists(conn, dialect, "student_profiles"):
        return 0
    row = _fetch_one(
        conn,
        dialect,
        """
        SELECT COUNT(*) AS total
        FROM student_profiles
        WHERE class_id = ?
        """,
        (class_id,),
    )
    return _as_int(row.get("total") if row else 0)


def _class_has_capacity(conn: Any, dialect: str, class_row: dict[str, Any]) -> bool:
    if not class_row or not _truthy(class_row.get("is_accepting_new_students")):
        return False
    capacity = _as_int(class_row.get("capacity"), 0)
    if capacity <= 0:
        return True
    return _class_member_count(conn, dialect, str(class_row.get("class_id") or "")) < capacity


def _active_class_row(conn: Any, dialect: str, math_type: str, level: str) -> dict[str, Any] | None:
    return _fetch_one(
        conn,
        dialect,
        """
        SELECT c.*
        FROM class_intake_settings s
        JOIN classes c ON c.class_id = s.active_class_id
        WHERE s.math_type = ?
          AND s.level = ?
          AND s.is_active = ?
          AND c.is_accepting_new_students = ?
        ORDER BY s.setting_id
        LIMIT 1
        """,
        (
            math_type,
            level,
            _active_flag(dialect),
            _active_flag(dialect),
        ),
    )


def _open_class_rows(conn: Any, dialect: str, math_type: str, level: str) -> list[dict[str, Any]]:
    return _fetch_all(
        conn,
        dialect,
        """
        SELECT *
        FROM classes
        WHERE math_type = ?
          AND level = ?
          AND is_accepting_new_students = ?
        ORDER BY class_id
        """,
        (math_type, level, _active_flag(dialect)),
    )


def resolve_plan_variant_id(math_type: str, review_order: str) -> str:
    math_type = str(math_type or "数学二").strip() or "数学二"
    review_order = str(review_order or "mixed").strip() or "mixed"
    if not is_public_seed_configured():
        return _fallback_plan_variant_id(math_type, review_order)

    with _connect_public_seed() as (conn, dialect):
        row = _fetch_one(
            conn,
            dialect,
            """
            SELECT plan_variant_id
            FROM plan_variants
            WHERE math_type = ?
              AND review_order = ?
              AND is_active = ?
            ORDER BY sort_order, plan_variant_id
            LIMIT 1
            """,
            (math_type, review_order, _active_flag(dialect)),
        )
    return str(row.get("plan_variant_id") or "") if row else _fallback_plan_variant_id(math_type, review_order)


def resolve_active_class_id(math_type: str, level: str) -> str:
    if not is_public_seed_configured():
        return ""
    math_type = str(math_type or "").strip()
    level = str(level or "").strip().upper()
    with _connect_public_seed() as (conn, dialect):
        active_row = _active_class_row(conn, dialect, math_type, level)
        if active_row and _class_has_capacity(conn, dialect, active_row):
            return str(active_row.get("class_id") or "")

        for class_row in _open_class_rows(conn, dialect, math_type, level):
            if _class_has_capacity(conn, dialect, class_row):
                return str(class_row.get("class_id") or "")
    return ""

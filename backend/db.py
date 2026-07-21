from __future__ import annotations

import os
import re
import sqlite3
from pathlib import Path
from typing import Any, Iterable

from .settings import DB_PATH


POSTGRES_REPLACE_KEYS: dict[str, tuple[str, ...]] = {
    "admin_totp_state": ("admin_user_id",),
    "class_intake_settings": ("math_type", "level"),
    "student_profiles": ("user_id",),
    "student_progress": ("progress_id",),
    "student_study_goals": ("goal_id",),
}


def runtime_database_url() -> str:
    return (os.environ.get("DATABASE_URL") or "").strip()


def runtime_database_backend() -> str:
    return "postgres" if runtime_database_url() else "sqlite"


def app_env() -> str:
    return (os.environ.get("APP_ENV") or "development").strip().lower()


def assert_runtime_database_ready() -> None:
    if app_env() == "production" and not runtime_database_url():
        raise RuntimeError("DATABASE_URL is required when APP_ENV=production")


def _replace_placeholders(sql: str) -> str:
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


def _translate_pragma_table_info(sql: str) -> tuple[str, tuple[Any, ...]] | None:
    match = re.fullmatch(
        r"\s*PRAGMA\s+table_info\((?P<table>[a-zA-Z_][a-zA-Z0-9_]*)\)\s*",
        sql,
        re.IGNORECASE,
    )
    if not match:
        return None
    table_name = match.group("table")
    return (
        """
        SELECT
          ordinal_position - 1 AS cid,
          column_name AS name,
          data_type AS type,
          CASE WHEN is_nullable = 'NO' THEN 1 ELSE 0 END AS "notnull",
          column_default AS dflt_value,
          0 AS pk
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = %s
        ORDER BY ordinal_position
        """,
        (table_name,),
    )


def _translate_insert_or_ignore(sql: str) -> str:
    rewritten = re.sub(
        r"\bINSERT\s+OR\s+IGNORE\s+INTO\b",
        "INSERT INTO",
        sql,
        flags=re.IGNORECASE,
    )
    return f"{rewritten.rstrip().rstrip(';')} ON CONFLICT DO NOTHING"


def _replace_table_name(sql: str) -> str:
    match = re.search(
        r"\bINSERT\s+OR\s+REPLACE\s+INTO\s+([a-zA-Z_][a-zA-Z0-9_]*)",
        sql,
        re.IGNORECASE,
    )
    if not match:
        return ""
    return match.group(1)


def _insert_columns(sql: str) -> list[str]:
    match = re.search(
        r"\bINTO\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\((?P<columns>.*?)\)\s*VALUES\b",
        sql,
        re.IGNORECASE | re.DOTALL,
    )
    if not match:
        return []
    return [
        column.strip()
        for column in match.group("columns").replace("\n", " ").split(",")
        if column.strip()
    ]


def _translate_insert_or_replace(sql: str) -> str:
    table_name = _replace_table_name(sql)
    conflict_keys = POSTGRES_REPLACE_KEYS.get(table_name)
    if not conflict_keys:
        raise ValueError(
            "No PostgreSQL conflict key configured for INSERT OR REPLACE table: "
            f"{table_name or '<unknown>'}"
        )
    columns = _insert_columns(sql)
    update_columns = [column for column in columns if column not in conflict_keys]
    if not update_columns:
        raise ValueError(f"INSERT OR REPLACE for {table_name} has no columns to update")
    rewritten = re.sub(
        r"\bINSERT\s+OR\s+REPLACE\s+INTO\b",
        "INSERT INTO",
        sql,
        flags=re.IGNORECASE,
    )
    assignments = ", ".join(f"{column} = EXCLUDED.{column}" for column in update_columns)
    keys = ", ".join(conflict_keys)
    return f"{rewritten.rstrip().rstrip(';')} ON CONFLICT ({keys}) DO UPDATE SET {assignments}"


def translate_sql_for_postgres(
    sql: str,
    params: Iterable[Any] = (),
) -> tuple[str, tuple[Any, ...]]:
    pragma = _translate_pragma_table_info(sql)
    if pragma:
        return pragma
    if re.search(r"\bINSERT\s+OR\s+IGNORE\s+INTO\b", sql, re.IGNORECASE):
        return _replace_placeholders(_translate_insert_or_ignore(sql)), tuple(params)
    if re.search(r"\bINSERT\s+OR\s+REPLACE\s+INTO\b", sql, re.IGNORECASE):
        return _replace_placeholders(_translate_insert_or_replace(sql)), tuple(params)
    return _replace_placeholders(sql), tuple(params)


def table_info_query(
    table_name: str,
    backend: str | None = None,
) -> tuple[str, tuple[Any, ...]]:
    selected = backend or runtime_database_backend()
    if selected == "postgres":
        query = _translate_pragma_table_info(f"PRAGMA table_info({table_name})")
        if not query:
            raise ValueError(f"Invalid table name for table_info_query: {table_name}")
        return query
    return f"PRAGMA table_info({table_name})", ()


def table_exists_query(
    table_name: str,
    backend: str | None = None,
) -> tuple[str, tuple[Any, ...]]:
    selected = backend or runtime_database_backend()
    if selected == "postgres":
        return "SELECT to_regclass(%s) AS table_ref", (f"public.{table_name}",)
    return "SELECT name FROM sqlite_master WHERE type IN ('table', 'view') AND name = ?", (table_name,)


class PostgresCursor:
    def __init__(self, cursor: Any):
        self._cursor = cursor

    def fetchone(self) -> Any:
        return self._cursor.fetchone()

    def fetchall(self) -> list[Any]:
        return self._cursor.fetchall()

    def close(self) -> None:
        close = getattr(self._cursor, "close", None)
        if close:
            close()


class PostgresConnection:
    def __init__(self, raw_connection: Any):
        self._conn = raw_connection

    def execute(self, sql: str, params: Iterable[Any] = ()) -> PostgresCursor:
        translated_sql, translated_params = translate_sql_for_postgres(sql, params)
        return PostgresCursor(self._conn.execute(translated_sql, translated_params))

    def executemany(self, sql: str, seq_of_params: Iterable[Iterable[Any]]) -> None:
        for params in seq_of_params:
            translated_sql, translated_params = translate_sql_for_postgres(sql, params)
            self._conn.execute(translated_sql, translated_params)

    def commit(self) -> None:
        self._conn.commit()

    def rollback(self) -> None:
        self._conn.rollback()

    def close(self) -> None:
        self._conn.close()

    def __enter__(self) -> "PostgresConnection":
        return self

    def __exit__(self, exc_type: Any, exc: Any, tb: Any) -> None:
        if exc_type:
            self.rollback()
        else:
            self.commit()
        self.close()


def _postgres_connection() -> PostgresConnection:
    try:
        import psycopg
        from psycopg.rows import dict_row
    except ImportError as exc:
        raise RuntimeError("psycopg is required when DATABASE_URL is configured") from exc
    return PostgresConnection(psycopg.connect(runtime_database_url(), row_factory=dict_row))


def _sqlite_connection(db_path: Path = DB_PATH) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def get_connection(db_path: Path = DB_PATH) -> Any:
    if runtime_database_backend() == "postgres":
        return _postgres_connection()
    return _sqlite_connection(db_path)


def row_to_dict(row: Any | None) -> dict[str, Any] | None:
    if row is None:
        return None
    if isinstance(row, dict):
        result = dict(row)
    else:
        result = {key: row[key] for key in row.keys()}
    if "qq" in result and "QQ" not in result:
        result["QQ"] = result["qq"]
    return result


def rows_to_dicts(rows: list[Any]) -> list[dict[str, Any]]:
    return [row_to_dict(row) for row in rows if row is not None]

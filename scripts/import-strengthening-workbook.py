from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
SAMPLE_DIR = ROOT / "data" / "samples"
NOW = "2026-06-10 14:00:00"


def find_source_workbook() -> Path:
    if len(sys.argv) > 1:
        return Path(sys.argv[1])
    matches = list(Path.home().joinpath("Desktop").glob("强化题型分类- 副本.xlsx"))
    if not matches:
        raise FileNotFoundError("未找到桌面文件：强化题型分类- 副本.xlsx")
    return matches[0]


def text(value: object) -> str:
    return str(value or "").strip()


def write_xlsx(path: Path, df: pd.DataFrame) -> None:
    with pd.ExcelWriter(path, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Sheet1")


def import_question_types(source_path: Path) -> pd.DataFrame:
    raw = pd.read_excel(source_path, sheet_name=0, dtype=str).fillna("")
    direct = raw["是否可直接布置"].map(lambda value: "1" if text(value) == "是" else "0")
    suggested = raw.apply(
        lambda row: text(row["建议时长（天）"]) or ("0.3" if text(row["是否可直接布置"]) == "是" else "0"),
        axis=1,
    )
    notes = raw.apply(
        lambda row: "；".join(
            item
            for item in [
                text(row["录入说明"]),
                f"PDF来源页：{text(row['PDF来源页'])}" if text(row["PDF来源页"]) else "",
                f"讲解图片权利状态：{text(row['讲解图片权利状态'])}" if text(row["讲解图片权利状态"]) else "",
                "源表建议时长为空，MVP默认0.3天" if not text(row["建议时长（天）"]) and text(row["是否可直接布置"]) == "是" else "",
            ]
            if item
        ),
        axis=1,
    )
    imported = pd.DataFrame(
        {
            "type_id": raw["题型ID"].map(text),
            "sort_code": raw["排序码"].map(text),
            "subject": raw["科目"].map(text),
            "chapter_id": raw["大章节ID"].map(text),
            "chapter_name": raw["大章节名称"].map(text),
            "content_block": raw["内容板块"].map(text),
            "type_name": raw["题型名称"].map(text),
            "parent_type_id": raw["父级题型ID"].map(text),
            "suggested_days": suggested,
            "direct_assignable": direct,
            "lecture_image_url": raw["题型讲解图片"].map(text),
            "lecture_image_rights_status": raw["讲解图片权利状态"].map(text),
            "pdf_source_page": raw["PDF来源页"].map(text),
            "input_note": notes,
        }
    )
    imported = imported.sort_values("sort_code", kind="stable").reset_index(drop=True)
    write_xlsx(SAMPLE_DIR / "question_types.xlsx", imported)
    return imported


def import_questions(source_path: Path) -> pd.DataFrame:
    raw = pd.read_excel(source_path, sheet_name=1, dtype=str).fillna("")
    imported = pd.DataFrame(
        {
            "question_id": raw["题目ID"].map(text),
            "type_id": raw["归属题型"].map(text),
            "type_name_check": raw["题型名称（核对用）"].map(text),
            "question_note": raw["题目备注"].map(text),
            "applicable_levels": raw["适用班型"].map(text),
            "plan_stage": raw["计划适用阶段"].map(text),
            "source": raw["资料来源"].map(text),
            "original_position_text": raw["原书位置展示文本"].map(text),
            "question_order": raw["题型内排序"].map(text),
            "pdf_source_page": raw["PDF来源页"].map(text),
            "display_permission": raw["题面展示权限"].map(text),
        }
    )
    imported = imported.sort_values(["type_id", "question_order", "question_id"], kind="stable").reset_index(drop=True)
    write_xlsx(SAMPLE_DIR / "questions.xlsx", imported)
    return imported


def build_student_progress(question_types: pd.DataFrame) -> pd.DataFrame:
    profiles = pd.read_excel(SAMPLE_DIR / "student_profiles.xlsx", dtype=str).fillna("")
    assignable = question_types[question_types["direct_assignable"].eq("1")]
    first_type = assignable.iloc[0]["type_id"]
    sort_by_type = dict(zip(question_types["type_id"], question_types["sort_code"]))

    rows = []
    for _, profile in profiles.iterrows():
        current_type_id = text(profile.get("current_type_id")) or first_type
        if current_type_id not in sort_by_type:
            current_type_id = first_type
        rows.append(
            {
                "progress_id": f"PR-{text(profile['user_id'])}",
                "user_id": text(profile["user_id"]),
                "math_type": text(profile["math_type"]),
                "plan_stage": text(profile.get("current_stage")) or "强化",
                "current_type_id": current_type_id,
                "current_type_sort_code": sort_by_type.get(current_type_id, ""),
                "progress_status": "active" if text(profile.get("plan_enabled")) == "1" else "paused",
                "last_generated_plan_date": text(profile.get("last_plan_date")),
                "last_completed_type_id": "",
                "unfinished_type_id": "",
                "unfinished_question_ids": "[]",
                "created_at": text(profile.get("created_at")) or NOW,
                "updated_at": NOW,
            }
        )

    imported = pd.DataFrame(rows)
    write_xlsx(SAMPLE_DIR / "student_progress.xlsx", imported)
    return imported


def main() -> None:
    source_path = find_source_workbook()
    question_types = import_question_types(source_path)
    questions = import_questions(source_path)
    progress = build_student_progress(question_types)

    print(
        {
            "source": str(source_path),
            "questionTypes": len(question_types),
            "assignableTypes": int(question_types["direct_assignable"].eq("1").sum()),
            "questions": len(questions),
            "studentProgressRows": len(progress),
        }
    )


if __name__ == "__main__":
    main()

# 数学二历年真题题型统计实施计划

> **给后续执行者：** 必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 按任务逐步执行本计划。每个步骤都用 `- [ ]` 复选框记录进度。

**目标：** 建立一个独立、可重复运行的 `1987-2026` 考研数学二真题题型统计研究数据集，做到每年一套标准源、重复文件可追踪、老师 PDF 辅助归类、最终生成可复核的统计表。

**架构：** 所有研究产物放在 `research/math2-past-exam-analysis/`，所有自动化脚本放在 `scripts/math2_exam_analysis/`，不触碰网站运行文件。流程分阶段推进：扫描原始来源、选择每年标准试卷、创建待复核归类表、维护老师题型与项目题型映射，再只从标准逐题表生成统计汇总。

**技术栈：** Python 标准库、`pandas`、`openpyxl`、可选 `pypdf`（用于 PDF 页数和文本抽取）、内置 `unittest` 测试。

---

## 范围检查

已确认的设计是一条完整的数据处理流水线，不是多个互相独立的网站子系统。本次实现不得修改 `backend/`、`prototypes/` 或 `data/samples/`。唯一允许读取的网站数据是 `data/samples/question_types.xlsx`，用于建立题型映射。

## 文件结构

- 新建 `research/math2-past-exam-analysis/README.md`：说明研究数据集目的、来源路径、工作流和复核规则。
- 新建 `research/math2-past-exam-analysis/extracted/.gitkeep`：保留中间抽取目录。
- 新建 `research/math2-past-exam-analysis/review_notes/.gitkeep`：保留人工复核记录目录。
- 新建 `scripts/math2_exam_analysis/__init__.py`：Python 包标记。
- 新建 `scripts/math2_exam_analysis/schema.py`：共享路径、表字段、枚举值和常量。
- 新建 `scripts/math2_exam_analysis/source_inventory.py`：扫描真题文件夹和老师 PDF，生成 `source_inventory.xlsx`。
- 新建 `scripts/math2_exam_analysis/canonical_sources.py`：应用“一年一套标准源”和重复/辅助来源标记规则。
- 新建 `scripts/math2_exam_analysis/question_workbook.py`：创建 `canonical_exam_questions.xlsx` 和 `type_mapping.xlsx` 待复核表。
- 新建 `scripts/math2_exam_analysis/summary.py`：从已复核逐题表生成 `summary_by_type.xlsx`。
- 新建 `scripts/math2_exam_analysis/run_all.py`：一键运行入口。
- 新建 `scripts/math2_exam_analysis/tests/test_schema.py`：测试共享字段和路径。
- 新建 `scripts/math2_exam_analysis/tests/test_source_inventory.py`：测试文件名分类、年份识别和哈希。
- 新建 `scripts/math2_exam_analysis/tests/test_canonical_sources.py`：测试标准源选择规则。
- 新建 `scripts/math2_exam_analysis/tests/test_summary.py`：测试统计聚合和优先级标签。

运行测试使用项目虚拟环境：

```powershell
C:\Users\zhang\Documents\AI督学\.venv\Scripts\python.exe -m unittest discover -s scripts\math2_exam_analysis\tests -v
```

---

### 任务 1：建立研究目录和共享字段

**涉及文件：**
- 新建：`research/math2-past-exam-analysis/README.md`
- 新建：`research/math2-past-exam-analysis/extracted/.gitkeep`
- 新建：`research/math2-past-exam-analysis/review_notes/.gitkeep`
- 新建：`scripts/math2_exam_analysis/__init__.py`
- 新建：`scripts/math2_exam_analysis/schema.py`
- 新建：`scripts/math2_exam_analysis/tests/test_schema.py`

- [ ] **步骤 1：先写字段和路径测试**

新建 `scripts/math2_exam_analysis/tests/test_schema.py`：

```python
import unittest
from pathlib import Path

from scripts.math2_exam_analysis import schema


class SchemaTest(unittest.TestCase):
    def test_research_paths_are_inside_project(self):
        self.assertEqual(schema.RESEARCH_DIR, schema.ROOT / "research" / "math2-past-exam-analysis")
        self.assertEqual(schema.EXTRACTED_DIR, schema.RESEARCH_DIR / "extracted")
        self.assertEqual(schema.REVIEW_NOTES_DIR, schema.RESEARCH_DIR / "review_notes")

    def test_source_inventory_columns_are_stable(self):
        self.assertEqual(
            schema.SOURCE_INVENTORY_COLUMNS,
            [
                "source_id",
                "file_path",
                "file_name",
                "detected_year_start",
                "detected_year_end",
                "source_kind",
                "canonical_status",
                "canonical_year",
                "duplicate_of_source_id",
                "page_count",
                "file_size_bytes",
                "content_hash",
                "notes",
            ],
        )

    def test_question_columns_include_traceability_fields(self):
        for column in ["exam_year", "question_no", "source_id", "source_page", "teacher_pdf_page"]:
            self.assertIn(column, schema.CANONICAL_QUESTION_COLUMNS)

    def test_source_root_defaults_to_user_desktop_folder(self):
        expected_suffix = Path("Desktop") / "新建文件夹 (2)" / "数学二(1987-2026_)"
        self.assertTrue(str(schema.DEFAULT_TRUE_EXAM_ROOT).endswith(str(expected_suffix)))


if __name__ == "__main__":
    unittest.main()
```

- [ ] **步骤 2：运行测试，确认当前失败**

运行：

```powershell
C:\Users\zhang\Documents\AI督学\.venv\Scripts\python.exe -m unittest scripts.math2_exam_analysis.tests.test_schema -v
```

预期：失败，错误为 `ModuleNotFoundError: No module named 'scripts.math2_exam_analysis'`。

- [ ] **步骤 3：创建包和共享字段实现**

新建 `scripts/math2_exam_analysis/__init__.py`：

```python
"""Utilities for the isolated math2 past-exam research dataset."""
```

新建 `scripts/math2_exam_analysis/schema.py`：

```python
from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
RESEARCH_DIR = ROOT / "research" / "math2-past-exam-analysis"
EXTRACTED_DIR = RESEARCH_DIR / "extracted"
REVIEW_NOTES_DIR = RESEARCH_DIR / "review_notes"

DEFAULT_TRUE_EXAM_ROOT = Path.home() / "Desktop" / "新建文件夹 (2)" / "数学二(1987-2026_)"
DEFAULT_TEACHER_PDF = Path.home() / "Desktop" / "新建文件夹 (2)" / "2026考研数学这十年.pdf"
PROJECT_QUESTION_TYPES = ROOT / "data" / "samples" / "question_types.xlsx"

SOURCE_INVENTORY_PATH = RESEARCH_DIR / "source_inventory.xlsx"
CANONICAL_QUESTIONS_PATH = RESEARCH_DIR / "canonical_exam_questions.xlsx"
TYPE_MAPPING_PATH = RESEARCH_DIR / "type_mapping.xlsx"
SUMMARY_BY_TYPE_PATH = RESEARCH_DIR / "summary_by_type.xlsx"

SOURCE_KIND_VALUES = ["exam_paper", "solution", "answer_key", "collection", "teacher_pdf", "unknown"]
CANONICAL_STATUS_VALUES = ["canonical", "duplicate", "supporting", "ignored", "needs_review"]
MAPPING_CONFIDENCE_VALUES = ["high", "medium", "low", "needs_review"]
REVIEW_STATUS_VALUES = ["approved", "needs_review", "rejected"]

SOURCE_INVENTORY_COLUMNS = [
    "source_id",
    "file_path",
    "file_name",
    "detected_year_start",
    "detected_year_end",
    "source_kind",
    "canonical_status",
    "canonical_year",
    "duplicate_of_source_id",
    "page_count",
    "file_size_bytes",
    "content_hash",
    "notes",
]

CANONICAL_QUESTION_COLUMNS = [
    "exam_year",
    "math_type",
    "question_no",
    "question_part",
    "score",
    "source_id",
    "source_page",
    "teacher_pdf_page",
    "subject",
    "chapter_name",
    "teacher_type_name",
    "project_type_id",
    "project_type_name",
    "mapping_confidence",
    "is_recent_10_years",
    "notes",
]

TYPE_MAPPING_COLUMNS = [
    "mapping_id",
    "teacher_subject",
    "teacher_chapter_name",
    "teacher_type_name",
    "project_type_id",
    "project_type_name",
    "mapping_rule",
    "mapping_confidence",
    "review_status",
    "notes",
]

SUMMARY_BY_TYPE_COLUMNS = [
    "project_type_id",
    "project_type_name",
    "subject",
    "chapter_name",
    "count_1987_2026",
    "count_recent_10_years",
    "years_appeared",
    "recent_years_appeared",
    "max_score_single_year",
    "total_score_1987_2026",
    "total_score_recent_10_years",
    "priority_tag",
]


def ensure_research_dirs() -> None:
    RESEARCH_DIR.mkdir(parents=True, exist_ok=True)
    EXTRACTED_DIR.mkdir(parents=True, exist_ok=True)
    REVIEW_NOTES_DIR.mkdir(parents=True, exist_ok=True)
```

新建 `research/math2-past-exam-analysis/README.md`：

```markdown
# 考研数学二真题题型统计研究数据集

这个目录只保存真题题型统计研究资料，不属于网站运行数据。

## 数据边界

- 不修改 `data/samples/`。
- 不修改 `backend/`。
- 不修改 `prototypes/`。
- 真题统计结果先作为研究数据保存，后续是否接入网站另行设计。

## 默认来源

- 真题文件夹：`C:\Users\zhang\Desktop\新建文件夹 (2)\数学二(1987-2026_)`
- 老师 PDF：`C:\Users\zhang\Desktop\新建文件夹 (2)\2026考研数学这十年.pdf`
- 项目题型表：`data/samples/question_types.xlsx`

## 工作流

1. 生成 `source_inventory.xlsx`。
2. 选择每年唯一标准真题源。
3. 创建 `canonical_exam_questions.xlsx` 逐题归类表。
4. 创建 `type_mapping.xlsx` 维护老师题型到项目题型的映射。
5. 复核低置信度题目。
6. 生成 `summary_by_type.xlsx`。

## 统计原则

所有统计只从 `canonical_exam_questions.xlsx` 聚合，重复文件、答案版、解析版和合集辅助源不直接参与计数。
```

创建空目录标记文件：

```text
research/math2-past-exam-analysis/extracted/.gitkeep
research/math2-past-exam-analysis/review_notes/.gitkeep
```

- [ ] **步骤 4：运行字段测试**

运行：

```powershell
C:\Users\zhang\Documents\AI督学\.venv\Scripts\python.exe -m unittest scripts.math2_exam_analysis.tests.test_schema -v
```

预期：通过。

- [ ] **步骤 5：提交**

```powershell
git add -- research/math2-past-exam-analysis scripts/math2_exam_analysis
git commit -m "Add math2 exam analysis schema"
```

---

### 任务 2：原始来源清单扫描器

**涉及文件：**
- 新建：`scripts/math2_exam_analysis/source_inventory.py`
- 新建：`scripts/math2_exam_analysis/tests/test_source_inventory.py`

- [ ] **步骤 1：写文件名分类和元数据测试**

新建 `scripts/math2_exam_analysis/tests/test_source_inventory.py`：

```python
import tempfile
import unittest
from pathlib import Path

from scripts.math2_exam_analysis.source_inventory import (
    classify_source_kind,
    detect_year_range,
    file_sha256,
    make_source_id,
)


class SourceInventoryTest(unittest.TestCase):
    def test_detect_single_year(self):
        self.assertEqual(detect_year_range("2026考研数学二真题和答案.pdf"), (2026, 2026))

    def test_detect_year_range(self):
        self.assertEqual(detect_year_range("1987-2021年考研数学二真题.pdf"), (1987, 2021))

    def test_classify_exam_paper(self):
        self.assertEqual(classify_source_kind("2025考研数学二真题.pdf"), "exam_paper")

    def test_classify_solution(self):
        self.assertEqual(classify_source_kind("2024考研数学二答案解析.pdf"), "solution")

    def test_classify_answer_key(self):
        self.assertEqual(classify_source_kind("2021年数二真题答案速查.pdf"), "answer_key")

    def test_classify_collection(self):
        self.assertEqual(classify_source_kind("合集打印2010-2019考研数学二真题.pdf"), "collection")

    def test_hash_is_stable(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "sample.pdf"
            path.write_bytes(b"same content")
            self.assertEqual(file_sha256(path), file_sha256(path))

    def test_source_id_uses_year_and_hash_prefix(self):
        source_id = make_source_id(Path("2026考研数学二真题.pdf"), 2026, "abcdef123456")
        self.assertEqual(source_id, "SRC-2026-abcdef12")


if __name__ == "__main__":
    unittest.main()
```

- [ ] **步骤 2：运行测试，确认当前失败**

运行：

```powershell
C:\Users\zhang\Documents\AI督学\.venv\Scripts\python.exe -m unittest scripts.math2_exam_analysis.tests.test_source_inventory -v
```

预期：失败，错误为 `ModuleNotFoundError: No module named 'scripts.math2_exam_analysis.source_inventory'`。

- [ ] **步骤 3：实现原始来源清单扫描器**

新建 `scripts/math2_exam_analysis/source_inventory.py`：

```python
from __future__ import annotations

import argparse
import hashlib
import re
from pathlib import Path

import pandas as pd

from scripts.math2_exam_analysis import schema


YEAR_PATTERN = re.compile(r"(19[8-9][0-9]|20[0-2][0-9])")


def text(value: object) -> str:
    return str(value or "").strip()


def detect_year_range(file_name: str) -> tuple[int | None, int | None]:
    years = [int(value) for value in YEAR_PATTERN.findall(file_name)]
    if not years:
        return None, None
    return min(years), max(years)


def classify_source_kind(file_name: str) -> str:
    name = file_name.lower()
    if "这十年" in file_name:
        return "teacher_pdf"
    if "合集" in file_name or "打印" in file_name:
        return "collection"
    if "答案解析" in file_name or "详解" in file_name or "解析" in file_name:
        return "solution"
    if "答案速查" in file_name or "速查" in file_name:
        return "answer_key"
    if "真题" in file_name and name.endswith(".pdf"):
        return "exam_paper"
    return "unknown"


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def pdf_page_count(path: Path) -> str:
    try:
        from pypdf import PdfReader
    except ImportError:
        return ""
    try:
        return str(len(PdfReader(str(path)).pages))
    except Exception as exc:
        return f"read_error:{exc.__class__.__name__}"


def make_source_id(path: Path, year_start: int | None, content_hash: str) -> str:
    year_part = str(year_start) if year_start else "unknown"
    return f"SRC-{year_part}-{content_hash[:8]}"


def build_inventory(true_exam_root: Path, teacher_pdf: Path) -> pd.DataFrame:
    paths = sorted([path for path in true_exam_root.rglob("*") if path.is_file() and path.suffix.lower() == ".pdf"])
    if teacher_pdf.exists():
        paths.append(teacher_pdf)

    rows: list[dict[str, object]] = []
    for path in paths:
        year_start, year_end = detect_year_range(path.name)
        content_hash = file_sha256(path)
        source_kind = classify_source_kind(path.name)
        rows.append(
            {
                "source_id": make_source_id(path, year_start, content_hash),
                "file_path": str(path),
                "file_name": path.name,
                "detected_year_start": year_start or "",
                "detected_year_end": year_end or "",
                "source_kind": source_kind,
                "canonical_status": "needs_review",
                "canonical_year": "",
                "duplicate_of_source_id": "",
                "page_count": pdf_page_count(path),
                "file_size_bytes": path.stat().st_size,
                "content_hash": content_hash,
                "notes": "",
            }
        )
    return pd.DataFrame(rows, columns=schema.SOURCE_INVENTORY_COLUMNS)


def write_inventory(df: pd.DataFrame, output_path: Path) -> None:
    schema.ensure_research_dirs()
    with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="sources")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--true-exam-root", type=Path, default=schema.DEFAULT_TRUE_EXAM_ROOT)
    parser.add_argument("--teacher-pdf", type=Path, default=schema.DEFAULT_TEACHER_PDF)
    parser.add_argument("--output", type=Path, default=schema.SOURCE_INVENTORY_PATH)
    args = parser.parse_args()

    df = build_inventory(args.true_exam_root, args.teacher_pdf)
    write_inventory(df, args.output)
    print(f"已写入 {len(df)} 条来源记录：{args.output}")


if __name__ == "__main__":
    main()
```

- [ ] **步骤 4：运行来源清单测试**

运行：

```powershell
C:\Users\zhang\Documents\AI督学\.venv\Scripts\python.exe -m unittest scripts.math2_exam_analysis.tests.test_source_inventory -v
```

预期：通过。

- [ ] **步骤 5：生成第一版来源清单工作簿**

运行：

```powershell
C:\Users\zhang\Documents\AI督学\.venv\Scripts\python.exe -m scripts.math2_exam_analysis.source_inventory
```

预期：终端输出 `已写入 <n> 条来源记录：C:\Users\zhang\Documents\AI督学\research\math2-past-exam-analysis\source_inventory.xlsx`。

- [ ] **步骤 6：提交**

```powershell
git add -- scripts/math2_exam_analysis/source_inventory.py scripts/math2_exam_analysis/tests/test_source_inventory.py research/math2-past-exam-analysis/source_inventory.xlsx
git commit -m "Add math2 source inventory scanner"
```

---

### 任务 3：选择每年标准真题源

**涉及文件：**
- 新建：`scripts/math2_exam_analysis/canonical_sources.py`
- 新建：`scripts/math2_exam_analysis/tests/test_canonical_sources.py`
- 修改：`research/math2-past-exam-analysis/source_inventory.xlsx`

- [ ] **步骤 1：写标准源选择测试**

新建 `scripts/math2_exam_analysis/tests/test_canonical_sources.py`：

```python
import unittest

import pandas as pd

from scripts.math2_exam_analysis.canonical_sources import apply_canonical_status


class CanonicalSourcesTest(unittest.TestCase):
    def test_single_exam_paper_becomes_canonical(self):
        df = pd.DataFrame(
            [
                {
                    "source_id": "SRC-2026-a",
                    "file_path": "2026.pdf",
                    "file_name": "2026考研数学二真题.pdf",
                    "detected_year_start": 2026,
                    "detected_year_end": 2026,
                    "source_kind": "exam_paper",
                    "canonical_status": "needs_review",
                    "canonical_year": "",
                    "duplicate_of_source_id": "",
                    "page_count": "5",
                    "file_size_bytes": 100,
                    "content_hash": "hash-a",
                    "notes": "",
                }
            ]
        )
        result = apply_canonical_status(df)
        self.assertEqual(result.loc[0, "canonical_status"], "canonical")
        self.assertEqual(result.loc[0, "canonical_year"], 2026)

    def test_solution_is_supporting(self):
        df = pd.DataFrame(
            [
                {
                    "source_id": "SRC-2025-s",
                    "file_path": "2025-solution.pdf",
                    "file_name": "2025考研数学二答案解析.pdf",
                    "detected_year_start": 2025,
                    "detected_year_end": 2025,
                    "source_kind": "solution",
                    "canonical_status": "needs_review",
                    "canonical_year": "",
                    "duplicate_of_source_id": "",
                    "page_count": "10",
                    "file_size_bytes": 200,
                    "content_hash": "hash-s",
                    "notes": "",
                }
            ]
        )
        result = apply_canonical_status(df)
        self.assertEqual(result.loc[0, "canonical_status"], "supporting")

    def test_duplicate_hash_points_to_first_source(self):
        df = pd.DataFrame(
            [
                {
                    "source_id": "SRC-2024-a",
                    "file_path": "a.pdf",
                    "file_name": "2024考研数学二真题.pdf",
                    "detected_year_start": 2024,
                    "detected_year_end": 2024,
                    "source_kind": "exam_paper",
                    "canonical_status": "needs_review",
                    "canonical_year": "",
                    "duplicate_of_source_id": "",
                    "page_count": "5",
                    "file_size_bytes": 100,
                    "content_hash": "same",
                    "notes": "",
                },
                {
                    "source_id": "SRC-2024-b",
                    "file_path": "b.pdf",
                    "file_name": "2024考研数学二真题副本.pdf",
                    "detected_year_start": 2024,
                    "detected_year_end": 2024,
                    "source_kind": "exam_paper",
                    "canonical_status": "needs_review",
                    "canonical_year": "",
                    "duplicate_of_source_id": "",
                    "page_count": "5",
                    "file_size_bytes": 100,
                    "content_hash": "same",
                    "notes": "",
                },
            ]
        )
        result = apply_canonical_status(df)
        self.assertEqual(result.loc[0, "canonical_status"], "canonical")
        self.assertEqual(result.loc[1, "canonical_status"], "duplicate")
        self.assertEqual(result.loc[1, "duplicate_of_source_id"], "SRC-2024-a")


if __name__ == "__main__":
    unittest.main()
```

- [ ] **步骤 2：运行测试，确认当前失败**

运行：

```powershell
C:\Users\zhang\Documents\AI督学\.venv\Scripts\python.exe -m unittest scripts.math2_exam_analysis.tests.test_canonical_sources -v
```

预期：失败，错误为 `ModuleNotFoundError: No module named 'scripts.math2_exam_analysis.canonical_sources'`。

- [ ] **步骤 3：实现标准源选择逻辑**

新建 `scripts/math2_exam_analysis/canonical_sources.py`：

```python
from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd

from scripts.math2_exam_analysis import schema


def normalize_year(value: object) -> int | None:
    text = str(value or "").strip()
    if not text:
        return None
    try:
        return int(float(text))
    except ValueError:
        return None


def year_in_source(row: pd.Series, year: int) -> bool:
    start = normalize_year(row.get("detected_year_start"))
    end = normalize_year(row.get("detected_year_end"))
    if start is None or end is None:
        return False
    return start <= year <= end


def choose_candidate(group: pd.DataFrame) -> int | None:
    exam_papers = group[group["source_kind"].eq("exam_paper")]
    if not exam_papers.empty:
        single_year = exam_papers[
            exam_papers["detected_year_start"].astype(str).eq(exam_papers["detected_year_end"].astype(str))
        ]
        candidate_pool = single_year if not single_year.empty else exam_papers
        return int(candidate_pool.sort_values(["file_size_bytes", "file_name"], ascending=[False, True]).index[0])

    collections = group[group["source_kind"].eq("collection")]
    if not collections.empty:
        return int(collections.sort_values(["file_size_bytes", "file_name"], ascending=[False, True]).index[0])

    return None


def apply_canonical_status(df: pd.DataFrame) -> pd.DataFrame:
    result = df.copy()
    result["canonical_status"] = "needs_review"
    result["canonical_year"] = ""
    result["duplicate_of_source_id"] = ""

    first_by_hash: dict[str, str] = {}
    for idx, row in result.iterrows():
        content_hash = str(row.get("content_hash") or "")
        if content_hash and content_hash in first_by_hash:
            result.at[idx, "canonical_status"] = "duplicate"
            result.at[idx, "duplicate_of_source_id"] = first_by_hash[content_hash]
        elif content_hash:
            first_by_hash[content_hash] = str(row["source_id"])

    supporting_kinds = {"solution", "answer_key", "teacher_pdf"}
    for idx, row in result.iterrows():
        if result.at[idx, "canonical_status"] == "duplicate":
            continue
        if row["source_kind"] in supporting_kinds:
            result.at[idx, "canonical_status"] = "supporting"

    for year in range(1987, 2027):
        active = result[result["canonical_status"].eq("needs_review") & result.apply(lambda row: year_in_source(row, year), axis=1)]
        if active.empty:
            continue
        candidate_idx = choose_candidate(active)
        if candidate_idx is None:
            continue
        result.at[candidate_idx, "canonical_status"] = "canonical"
        result.at[candidate_idx, "canonical_year"] = year
        same_year = active.index.difference([candidate_idx])
        for idx in same_year:
            if result.at[idx, "canonical_status"] == "needs_review" and result.at[idx, "source_kind"] == "exam_paper":
                result.at[idx, "canonical_status"] = "supporting"

    return result[schema.SOURCE_INVENTORY_COLUMNS]


def read_inventory(path: Path) -> pd.DataFrame:
    return pd.read_excel(path, dtype=str).fillna("")


def write_inventory(df: pd.DataFrame, path: Path) -> None:
    with pd.ExcelWriter(path, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="sources")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, default=schema.SOURCE_INVENTORY_PATH)
    parser.add_argument("--output", type=Path, default=schema.SOURCE_INVENTORY_PATH)
    args = parser.parse_args()

    df = read_inventory(args.input)
    result = apply_canonical_status(df)
    write_inventory(result, args.output)
    canonical_count = int(result["canonical_status"].eq("canonical").sum())
    print(f"已更新标准源状态。标准源数量：{canonical_count}")


if __name__ == "__main__":
    main()
```

- [ ] **步骤 4：运行标准源测试**

运行：

```powershell
C:\Users\zhang\Documents\AI督学\.venv\Scripts\python.exe -m unittest scripts.math2_exam_analysis.tests.test_canonical_sources -v
```

预期：通过。

- [ ] **步骤 5：给真实来源清单应用标准源状态**

运行：

```powershell
C:\Users\zhang\Documents\AI督学\.venv\Scripts\python.exe -m scripts.math2_exam_analysis.canonical_sources
```

预期：输出 `已更新标准源状态。标准源数量：<n>`。

- [ ] **步骤 6：人工检查标准源年份覆盖**

运行：

```powershell
C:\Users\zhang\Documents\AI督学\.venv\Scripts\python.exe -c "import pandas as pd; df=pd.read_excel('research/math2-past-exam-analysis/source_inventory.xlsx', dtype=str).fillna(''); print(df[df['canonical_status'].eq('canonical')][['canonical_year','file_name','source_id']].sort_values('canonical_year').to_string(index=False))"
```

预期：每个已覆盖年份一行。缺失年份或重复年份会直接显示在打印结果中。

- [ ] **步骤 7：提交**

```powershell
git add -- scripts/math2_exam_analysis/canonical_sources.py scripts/math2_exam_analysis/tests/test_canonical_sources.py research/math2-past-exam-analysis/source_inventory.xlsx
git commit -m "Select canonical math2 exam sources"
```

---

### 任务 4：创建逐题归类和题型映射待复核表

**涉及文件：**
- 新建：`scripts/math2_exam_analysis/question_workbook.py`
- 修改：`research/math2-past-exam-analysis/canonical_exam_questions.xlsx`
- 修改：`research/math2-past-exam-analysis/type_mapping.xlsx`

- [ ] **步骤 1：创建工作簿生成脚本**

新建 `scripts/math2_exam_analysis/question_workbook.py`：

```python
from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd

from scripts.math2_exam_analysis import schema


def read_inventory(path: Path) -> pd.DataFrame:
    return pd.read_excel(path, dtype=str).fillna("")


def read_project_types(path: Path) -> pd.DataFrame:
    df = pd.read_excel(path, dtype=str).fillna("")
    return df[df["direct_assignable"].astype(str).eq("1")].copy()


def build_empty_question_rows(inventory: pd.DataFrame) -> pd.DataFrame:
    canonical = inventory[inventory["canonical_status"].eq("canonical")].copy()
    rows: list[dict[str, object]] = []
    for _, source in canonical.sort_values("canonical_year").iterrows():
        year = int(float(str(source["canonical_year"])))
        rows.append(
            {
                "exam_year": year,
                "math_type": "数学二",
                "question_no": "",
                "question_part": "",
                "score": "",
                "source_id": source["source_id"],
                "source_page": "",
                "teacher_pdf_page": "",
                "subject": "",
                "chapter_name": "",
                "teacher_type_name": "",
                "project_type_id": "",
                "project_type_name": "",
                "mapping_confidence": "needs_review",
                "is_recent_10_years": "1" if 2017 <= year <= 2026 else "0",
                "notes": "按标准源补充题号、题型、页码和映射",
            }
        )
    return pd.DataFrame(rows, columns=schema.CANONICAL_QUESTION_COLUMNS)


def build_type_mapping_template(project_types: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for _, row in project_types.sort_values(["subject", "chapter_id", "sort_code"]).iterrows():
        rows.append(
            {
                "mapping_id": f"MAP-{row['type_id']}",
                "teacher_subject": "",
                "teacher_chapter_name": "",
                "teacher_type_name": "",
                "project_type_id": row["type_id"],
                "project_type_name": row["type_name"],
                "mapping_rule": "项目可直接布置题型，等待老师PDF题型映射",
                "mapping_confidence": "needs_review",
                "review_status": "needs_review",
                "notes": f"项目章节：{row['chapter_name']}",
            }
        )
    return pd.DataFrame(rows, columns=schema.TYPE_MAPPING_COLUMNS)


def write_workbooks(question_df: pd.DataFrame, mapping_df: pd.DataFrame) -> None:
    schema.ensure_research_dirs()
    with pd.ExcelWriter(schema.CANONICAL_QUESTIONS_PATH, engine="openpyxl") as writer:
        question_df.to_excel(writer, index=False, sheet_name="questions")
    with pd.ExcelWriter(schema.TYPE_MAPPING_PATH, engine="openpyxl") as writer:
        mapping_df.to_excel(writer, index=False, sheet_name="mapping")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--inventory", type=Path, default=schema.SOURCE_INVENTORY_PATH)
    parser.add_argument("--project-types", type=Path, default=schema.PROJECT_QUESTION_TYPES)
    args = parser.parse_args()

    inventory = read_inventory(args.inventory)
    project_types = read_project_types(args.project_types)
    question_df = build_empty_question_rows(inventory)
    mapping_df = build_type_mapping_template(project_types)
    write_workbooks(question_df, mapping_df)
    print(f"已写入：{schema.CANONICAL_QUESTIONS_PATH}")
    print(f"已写入：{schema.TYPE_MAPPING_PATH}")


if __name__ == "__main__":
    main()
```

- [ ] **步骤 2：生成待复核工作簿**

运行：

```powershell
C:\Users\zhang\Documents\AI督学\.venv\Scripts\python.exe -m scripts.math2_exam_analysis.question_workbook
```

预期：写入 `canonical_exam_questions.xlsx` 和 `type_mapping.xlsx`。

- [ ] **步骤 3：检查工作簿行列规模**

运行：

```powershell
C:\Users\zhang\Documents\AI督学\.venv\Scripts\python.exe -c "import pandas as pd; q=pd.read_excel('research/math2-past-exam-analysis/canonical_exam_questions.xlsx', dtype=str).fillna(''); m=pd.read_excel('research/math2-past-exam-analysis/type_mapping.xlsx', dtype=str).fillna(''); print('questions', q.shape); print('mapping', m.shape); print(q.head().to_string(index=False)); print(m.head().to_string(index=False))"
```

预期：`questions` 每个标准年份一条起始行；`mapping` 每个可直接布置的项目题型一行。

- [ ] **步骤 4：提交**

```powershell
git add -- scripts/math2_exam_analysis/question_workbook.py research/math2-past-exam-analysis/canonical_exam_questions.xlsx research/math2-past-exam-analysis/type_mapping.xlsx
git commit -m "Create math2 review workbooks"
```

---

### 任务 5：填写并复核逐题归类表

**涉及文件：**
- 修改：`research/math2-past-exam-analysis/canonical_exam_questions.xlsx`
- 修改：`research/math2-past-exam-analysis/type_mapping.xlsx`
- 新建：`research/math2-past-exam-analysis/review_notes/review-log.md`

- [ ] **步骤 1：创建复核日志**

新建 `research/math2-past-exam-analysis/review_notes/review-log.md`：

```markdown
# 数学二真题归类复核记录

## 复核规则

- 每年只使用 `source_inventory.xlsx` 中 `canonical_status=canonical` 的标准源计数。
- 答案版、解析版、速查版和重复文件只用于辅助核对。
- 老师 PDF 用于辅助章节和题型归类。
- `mapping_confidence=needs_review` 的题目不进入重点题型结论。

## 复核批次

| 批次 | 年份范围 | 状态 | 说明 |
| --- | --- | --- | --- |
| 1 | 1987-1996 | 未开始 | 早年试卷结构可能不同，按原卷逐题录入 |
| 2 | 1997-2006 | 未开始 | 按原卷逐题录入 |
| 3 | 2007-2016 | 未开始 | 按原卷逐题录入 |
| 4 | 2017-2026 | 未开始 | 近十年重点复核 |
```

- [ ] **步骤 2：按标准年份填写 `canonical_exam_questions.xlsx`**

对每个标准年份，用真实题目逐行替换起始行。字段规则如下：

```text
exam_year: 年份，如 2026
math_type: 数学二
question_no: 原卷题号，如 1、2、3
question_part: 选择题、填空题、解答题
score: 原卷分值
source_id: 从 source_inventory.xlsx 复制标准源 source_id
source_page: 题目所在 PDF 页码
teacher_pdf_page: 老师 PDF 对应页码，如无法定位则留空
subject: 高等数学 或 线性代数
chapter_name: 章节名称
teacher_type_name: 老师 PDF 或复核后使用的题型名称
project_type_id: 对应 question_types.xlsx 的 type_id
project_type_name: 对应 question_types.xlsx 的 type_name
mapping_confidence: high、medium、low、needs_review
is_recent_10_years: 2017-2026 填 1，其余填 0
notes: 歧义、跨章节、特殊考法或复核说明
```

- [ ] **步骤 3：随着老师题型反复出现，填写 `type_mapping.xlsx`**

映射规则如下：

```text
同一 teacher_subject + teacher_chapter_name + teacher_type_name 如果多次出现，只保留一条映射。
能清楚对应项目题型时 review_status=approved，mapping_confidence=high。
只能对应到父级或相邻题型时 review_status=needs_review，mapping_confidence=medium 或 low。
无法对应时 project_type_id 留空，review_status=needs_review，mapping_confidence=needs_review。
```

- [ ] **步骤 4：每个批次后保存复核进度**

每完成一个年份批次，更新 `review-log.md` 状态：

```markdown
| 1 | 1987-1996 | 已完成 | 已按标准源录入，低置信度题目保留 needs_review |
```

- [ ] **步骤 5：每个复核批次后提交**

```powershell
git add -- research/math2-past-exam-analysis/canonical_exam_questions.xlsx research/math2-past-exam-analysis/type_mapping.xlsx research/math2-past-exam-analysis/review_notes/review-log.md
git commit -m "Review math2 exam questions 1987-1996"
```

每个年份批次使用对应的年份范围修改提交信息。

---

### 任务 6：生成题型统计汇总

**涉及文件：**
- 新建：`scripts/math2_exam_analysis/summary.py`
- 新建：`scripts/math2_exam_analysis/tests/test_summary.py`
- 修改：`research/math2-past-exam-analysis/summary_by_type.xlsx`

- [ ] **步骤 1：写统计汇总测试**

新建 `scripts/math2_exam_analysis/tests/test_summary.py`：

```python
import unittest

import pandas as pd

from scripts.math2_exam_analysis.summary import build_summary, priority_tag


class SummaryTest(unittest.TestCase):
    def test_priority_tag_recent_high_frequency(self):
        self.assertEqual(priority_tag(total_count=12, recent_count=5, confidence_values=["high"]), "近年高频")

    def test_priority_tag_historical_high_frequency(self):
        self.assertEqual(priority_tag(total_count=15, recent_count=1, confidence_values=["high"]), "历史高频")

    def test_priority_tag_needs_review(self):
        self.assertEqual(priority_tag(total_count=3, recent_count=2, confidence_values=["needs_review"]), "待复核")

    def test_build_summary_groups_by_project_type(self):
        questions = pd.DataFrame(
            [
                {
                    "exam_year": 2025,
                    "project_type_id": "G-01-T-01-01",
                    "project_type_name": "等价无穷小、泰勒展开、变限积分（重点）",
                    "subject": "高等数学",
                    "chapter_name": "第一章 极限",
                    "score": "5",
                    "is_recent_10_years": "1",
                    "mapping_confidence": "high",
                },
                {
                    "exam_year": 2010,
                    "project_type_id": "G-01-T-01-01",
                    "project_type_name": "等价无穷小、泰勒展开、变限积分（重点）",
                    "subject": "高等数学",
                    "chapter_name": "第一章 极限",
                    "score": "10",
                    "is_recent_10_years": "0",
                    "mapping_confidence": "high",
                },
            ]
        )
        summary = build_summary(questions)
        self.assertEqual(len(summary), 1)
        row = summary.iloc[0]
        self.assertEqual(row["count_1987_2026"], 2)
        self.assertEqual(row["count_recent_10_years"], 1)
        self.assertEqual(row["total_score_1987_2026"], 15.0)
        self.assertEqual(row["years_appeared"], "2010,2025")


if __name__ == "__main__":
    unittest.main()
```

- [ ] **步骤 2：运行测试，确认当前失败**

运行：

```powershell
C:\Users\zhang\Documents\AI督学\.venv\Scripts\python.exe -m unittest scripts.math2_exam_analysis.tests.test_summary -v
```

预期：失败，错误为 `ModuleNotFoundError: No module named 'scripts.math2_exam_analysis.summary'`。

- [ ] **步骤 3：实现统计汇总**

新建 `scripts/math2_exam_analysis/summary.py`：

```python
from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd

from scripts.math2_exam_analysis import schema


def number(value: object) -> float:
    text = str(value or "").strip()
    if not text:
        return 0.0
    try:
        return float(text)
    except ValueError:
        return 0.0


def priority_tag(total_count: int, recent_count: int, confidence_values: list[str]) -> str:
    if any(value in {"needs_review", "low"} for value in confidence_values):
        return "待复核"
    if recent_count >= 3:
        return "近年高频"
    if total_count >= 10:
        return "历史高频"
    if recent_count >= 1:
        return "近年出现"
    return "偶发"


def join_years(values: pd.Series) -> str:
    years = sorted({int(float(str(value))) for value in values if str(value or "").strip()})
    return ",".join(str(year) for year in years)


def build_summary(questions: pd.DataFrame) -> pd.DataFrame:
    valid = questions[questions["project_type_id"].astype(str).str.strip().ne("")].copy()
    valid["score_number"] = valid["score"].map(number)
    valid["recent_flag"] = valid["is_recent_10_years"].astype(str).eq("1")

    rows: list[dict[str, object]] = []
    grouped = valid.groupby(["project_type_id", "project_type_name", "subject", "chapter_name"], dropna=False)
    for keys, group in grouped:
        project_type_id, project_type_name, subject, chapter_name = keys
        recent = group[group["recent_flag"]]
        total_count = len(group)
        recent_count = len(recent)
        scores_by_year = group.groupby("exam_year")["score_number"].sum()
        rows.append(
            {
                "project_type_id": project_type_id,
                "project_type_name": project_type_name,
                "subject": subject,
                "chapter_name": chapter_name,
                "count_1987_2026": total_count,
                "count_recent_10_years": recent_count,
                "years_appeared": join_years(group["exam_year"]),
                "recent_years_appeared": join_years(recent["exam_year"]),
                "max_score_single_year": float(scores_by_year.max()) if not scores_by_year.empty else 0.0,
                "total_score_1987_2026": float(group["score_number"].sum()),
                "total_score_recent_10_years": float(recent["score_number"].sum()),
                "priority_tag": priority_tag(total_count, recent_count, group["mapping_confidence"].astype(str).tolist()),
            }
        )
    return pd.DataFrame(rows, columns=schema.SUMMARY_BY_TYPE_COLUMNS).sort_values(
        ["count_recent_10_years", "count_1987_2026", "project_type_id"],
        ascending=[False, False, True],
        kind="stable",
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--questions", type=Path, default=schema.CANONICAL_QUESTIONS_PATH)
    parser.add_argument("--output", type=Path, default=schema.SUMMARY_BY_TYPE_PATH)
    args = parser.parse_args()

    questions = pd.read_excel(args.questions, dtype=str).fillna("")
    summary = build_summary(questions)
    with pd.ExcelWriter(args.output, engine="openpyxl") as writer:
        summary.to_excel(writer, index=False, sheet_name="summary")
    print(f"已写入 {len(summary)} 条统计记录：{args.output}")


if __name__ == "__main__":
    main()
```

- [ ] **步骤 4：运行统计测试**

运行：

```powershell
C:\Users\zhang\Documents\AI督学\.venv\Scripts\python.exe -m unittest scripts.math2_exam_analysis.tests.test_summary -v
```

预期：通过。

- [ ] **步骤 5：生成 `summary_by_type.xlsx`**

运行：

```powershell
C:\Users\zhang\Documents\AI督学\.venv\Scripts\python.exe -m scripts.math2_exam_analysis.summary
```

预期：输出 `已写入 <n> 条统计记录：...\summary_by_type.xlsx`。

- [ ] **步骤 6：提交**

```powershell
git add -- scripts/math2_exam_analysis/summary.py scripts/math2_exam_analysis/tests/test_summary.py research/math2-past-exam-analysis/summary_by_type.xlsx
git commit -m "Summarize math2 exam type frequency"
```

---

### 任务 7：一键运行入口

**涉及文件：**
- 新建：`scripts/math2_exam_analysis/run_all.py`

- [ ] **步骤 1：创建一键运行脚本**

新建 `scripts/math2_exam_analysis/run_all.py`：

```python
from __future__ import annotations

import pandas as pd

from scripts.math2_exam_analysis import canonical_sources, question_workbook, schema, source_inventory, summary


def main() -> None:
    schema.ensure_research_dirs()
    inventory = source_inventory.build_inventory(schema.DEFAULT_TRUE_EXAM_ROOT, schema.DEFAULT_TEACHER_PDF)
    inventory = canonical_sources.apply_canonical_status(inventory)
    source_inventory.write_inventory(inventory, schema.SOURCE_INVENTORY_PATH)

    project_types = question_workbook.read_project_types(schema.PROJECT_QUESTION_TYPES)
    if not schema.CANONICAL_QUESTIONS_PATH.exists():
        questions = question_workbook.build_empty_question_rows(inventory)
        mapping = question_workbook.build_type_mapping_template(project_types)
        question_workbook.write_workbooks(questions, mapping)
        print("已创建逐题归类和题型映射待复核表")
    else:
        print("已保留现有逐题归类表，避免覆盖人工复核结果")

    if schema.CANONICAL_QUESTIONS_PATH.exists():
        questions = pd.read_excel(schema.CANONICAL_QUESTIONS_PATH, dtype=str).fillna("")
        summary_df = summary.build_summary(questions)
        with pd.ExcelWriter(schema.SUMMARY_BY_TYPE_PATH, engine="openpyxl") as writer:
            summary_df.to_excel(writer, index=False, sheet_name="summary")
        print(f"已写入：{schema.SUMMARY_BY_TYPE_PATH}")


if __name__ == "__main__":
    main()
```

- [ ] **步骤 2：运行全部测试**

运行：

```powershell
C:\Users\zhang\Documents\AI督学\.venv\Scripts\python.exe -m unittest discover -s scripts\math2_exam_analysis\tests -v
```

预期：全部通过。

- [ ] **步骤 3：运行完整流水线**

运行：

```powershell
C:\Users\zhang\Documents\AI督学\.venv\Scripts\python.exe -m scripts.math2_exam_analysis.run_all
```

如果是首次运行，预期包括：

```text
已创建逐题归类和题型映射待复核表
已写入：C:\Users\zhang\Documents\AI督学\research\math2-past-exam-analysis\summary_by_type.xlsx
```

如果 `canonical_exam_questions.xlsx` 已存在，预期包括：

```text
已保留现有逐题归类表，避免覆盖人工复核结果
```

- [ ] **步骤 4：提交**

```powershell
git add -- scripts/math2_exam_analysis/run_all.py
git commit -m "Add math2 exam analysis runner"
```

---

### 任务 8：最终验证

**涉及文件：**
- 读取：`research/math2-past-exam-analysis/source_inventory.xlsx`
- 读取：`research/math2-past-exam-analysis/canonical_exam_questions.xlsx`
- 读取：`research/math2-past-exam-analysis/type_mapping.xlsx`
- 读取：`research/math2-past-exam-analysis/summary_by_type.xlsx`

- [ ] **步骤 1：运行完整测试**

运行：

```powershell
C:\Users\zhang\Documents\AI督学\.venv\Scripts\python.exe -m unittest discover -s scripts\math2_exam_analysis\tests -v
```

预期：所有测试通过。

- [ ] **步骤 2：验证标准源年份唯一性**

运行：

```powershell
C:\Users\zhang\Documents\AI督学\.venv\Scripts\python.exe -c "import pandas as pd; df=pd.read_excel('research/math2-past-exam-analysis/source_inventory.xlsx', dtype=str).fillna(''); c=df[df['canonical_status'].eq('canonical')]; dup=c[c.duplicated('canonical_year', keep=False)]; print('canonical_count', len(c)); print('duplicate_year_rows', len(dup)); print(dup[['canonical_year','file_name','source_id']].to_string(index=False))"
```

预期：`duplicate_year_rows 0`。

- [ ] **步骤 3：验证统计只来自已映射逐题记录**

运行：

```powershell
C:\Users\zhang\Documents\AI督学\.venv\Scripts\python.exe -c "import pandas as pd; q=pd.read_excel('research/math2-past-exam-analysis/canonical_exam_questions.xlsx', dtype=str).fillna(''); s=pd.read_excel('research/math2-past-exam-analysis/summary_by_type.xlsx', dtype=str).fillna(''); print('mapped_questions', q['project_type_id'].astype(str).str.strip().ne('').sum()); print('summary_rows', len(s)); print(s.head(20).to_string(index=False))"
```

预期：`summary_rows` 等于非空 `project_type_id` 的去重分组数量，打印出的前几行优先按近十年频次排序。

- [ ] **步骤 4：确认没有改动网站运行文件**

运行：

```powershell
git status --short -- backend prototypes data/samples
```

预期：本次实现没有新增这些目录下的改动。工作区原本已有的无关改动可能仍会显示，不要回退它们。

- [ ] **步骤 5：如复核日志有变化，提交复核说明**

```powershell
git add -- research/math2-past-exam-analysis/review_notes/review-log.md
git commit -m "Document math2 exam analysis review status"
```

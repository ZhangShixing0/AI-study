# 考研数学二真题题型统计研究数据集设计

## 背景

当前项目已有网站运行数据表，例如 `data/samples/question_types.xlsx` 和 `data/samples/questions.xlsx`。本次工作要分析 `1987-2026` 年考研数学二真题，并参考老师整理的《2026考研数学这十年.pdf》，统计每年每道真题对应的章节、题型和与现有题型表的映射关系。

这批数据暂时不一定进入网站，因此必须和网站运行数据隔离，避免影响现有后端、原型和样例表。

## 目标

1. 按年份整理 `1987-2026` 年数学二真题，形成“一年一套”的标准试卷清单。
2. 识别并登记真题文件夹中的重复文件、合集、答案版、解析版和速查版。
3. 为每年每道真题建立独立归类记录，包括年份、题号、章节、题型、分值、来源和备注。
4. 将老师 PDF 的章节/题型口径作为辅助来源，和真题原卷交叉校验。
5. 在不改动网站表的前提下，尽量映射到现有 `question_types.xlsx` 的 `type_id`，为后续是否接入网站保留入口。
6. 产出全周期统计和近十年统计，让后续判断重点题型、常考题型和备考优先级。

## 非目标

1. 不直接修改 `data/samples/` 下的运行样例表。
2. 不修改 `backend/`、`prototypes/` 或网页展示逻辑。
3. 不把真题题面全文复制进网站题库。
4. 不把老师 PDF 的内容大段摘录成新资料，只提取可核验的题型、章节、年份、题号等元数据。

## 文件夹结构

建议新增独立目录：

```text
research/math2-past-exam-analysis/
  README.md
  source_inventory.xlsx
  canonical_exam_questions.xlsx
  type_mapping.xlsx
  summary_by_type.xlsx
  extracted/
  review_notes/
```

目录用途：

| 路径 | 用途 |
| --- | --- |
| `README.md` | 说明数据口径、来源路径、处理步骤和复核规则 |
| `source_inventory.xlsx` | 原始文件清单，登记每个 PDF/文件夹是否为标准源、重复源、解析源、答案源或合集 |
| `canonical_exam_questions.xlsx` | 标准逐题归类表，一年一套、每题一行 |
| `type_mapping.xlsx` | 老师 PDF 题型/章节与项目 `question_types.xlsx` 的映射关系 |
| `summary_by_type.xlsx` | 全周期与近十年题型统计汇总 |
| `extracted/` | 临时抽取文本、PDF 页面检查结果、结构化中间结果 |
| `review_notes/` | 人工复核记录、歧义题、无法确定题型说明 |

## 数据表设计

### 1. source_inventory.xlsx

一行代表一个原始文件或一个合集中的可识别来源。

| 字段 | 含义 |
| --- | --- |
| `source_id` | 来源唯一 ID |
| `file_path` | 原始文件路径 |
| `file_name` | 文件名 |
| `detected_year_start` | 从文件名或内容识别到的起始年份 |
| `detected_year_end` | 合集或跨年文件的结束年份 |
| `source_kind` | `exam_paper`、`solution`、`answer_key`、`collection`、`teacher_pdf`、`unknown` |
| `canonical_status` | `canonical`、`duplicate`、`supporting`、`ignored`、`needs_review` |
| `canonical_year` | 如果是标准源，对应年份 |
| `duplicate_of_source_id` | 重复文件指向的标准源 |
| `page_count` | PDF 页数 |
| `file_size_bytes` | 文件大小 |
| `content_hash` | 文件哈希，用于识别完全重复 |
| `notes` | 备注 |

### 2. canonical_exam_questions.xlsx

一行代表某一年某一道真题。

| 字段 | 含义 |
| --- | --- |
| `exam_year` | 考试年份 |
| `math_type` | 固定为 `数学二` |
| `question_no` | 题号 |
| `question_part` | 选择题、填空题、解答题等 |
| `score` | 分值 |
| `source_id` | 对应 `source_inventory.xlsx` 的标准来源 |
| `source_page` | 题目所在页码 |
| `teacher_pdf_page` | 老师 PDF 中对应页码，如可定位 |
| `subject` | 高等数学或线性代数 |
| `chapter_name` | 章节名称 |
| `teacher_type_name` | 老师 PDF 中的题型名称 |
| `project_type_id` | 对应 `question_types.xlsx.type_id` |
| `project_type_name` | 对应项目题型名称 |
| `mapping_confidence` | `high`、`medium`、`low`、`needs_review` |
| `is_recent_10_years` | 是否属于近十年统计窗口 |
| `notes` | 歧义说明、特殊考法、人工复核意见 |

### 3. type_mapping.xlsx

用于解决老师题型体系和项目题型体系不完全一致的问题。

| 字段 | 含义 |
| --- | --- |
| `mapping_id` | 映射唯一 ID |
| `teacher_subject` | 老师 PDF 科目 |
| `teacher_chapter_name` | 老师 PDF 章节 |
| `teacher_type_name` | 老师 PDF 题型 |
| `project_type_id` | 项目题型 ID |
| `project_type_name` | 项目题型名称 |
| `mapping_rule` | 映射依据 |
| `mapping_confidence` | 映射置信度 |
| `review_status` | `approved`、`needs_review`、`rejected` |
| `notes` | 备注 |

### 4. summary_by_type.xlsx

从 `canonical_exam_questions.xlsx` 聚合生成。

| 字段 | 含义 |
| --- | --- |
| `project_type_id` | 项目题型 ID |
| `project_type_name` | 项目题型名称 |
| `subject` | 科目 |
| `chapter_name` | 章节 |
| `count_1987_2026` | 全周期出现次数 |
| `count_recent_10_years` | 近十年出现次数 |
| `years_appeared` | 出现年份列表 |
| `recent_years_appeared` | 近十年出现年份列表 |
| `max_score_single_year` | 单年最高分值 |
| `total_score_1987_2026` | 全周期累计分值 |
| `total_score_recent_10_years` | 近十年累计分值 |
| `priority_tag` | 高频、近年高频、偶发、待复核等 |

## 去重与标准源规则

1. 先扫描真题文件夹，生成完整 `source_inventory.xlsx`。
2. 用文件名、文件大小、页数和哈希识别完全重复文件。
3. 同一年存在多个候选文件时，优先选择单年真题原卷作为 `canonical`。
4. 答案、解析、速查版默认作为 `supporting`，不参与题目计数。
5. 合集文件只有在没有单年真题源时才作为标准来源；如使用合集，必须记录对应页码范围。
6. 每个 `exam_year` 最终只能有一个标准试卷来源。
7. 所有重复和辅助来源只登记，不删除。

## 分析流程

1. 建立原始文件清单。
2. 选择每年标准真题源，解决重复和合集问题。
3. 从标准源中按年份、题号整理逐题记录。
4. 从老师 PDF 中抽取章节和题型信息，作为辅助归类来源。
5. 将老师题型映射到项目 `question_types.xlsx`。
6. 标记低置信度和歧义题，进入人工复核。
7. 生成全周期统计和近十年统计。
8. 保留可追溯字段，让每个统计结果都能追到年份、题号和来源页码。

## 统计口径

全周期统计覆盖 `1987-2026` 年，用于观察长期命题覆盖面。

近十年统计单独生成，用于判断当前备考优先级。近十年窗口在本次数据集中建议按 `2017-2026` 计算。

优先级不只看出现次数，还应结合：

1. 近十年出现次数。
2. 最近三到五年是否连续出现。
3. 单题分值和累计分值。
4. 是否映射到项目中可直接布置的题型。
5. 映射置信度是否足够高。

## 质量控制

1. 每年必须只有一套标准源。
2. 每道题必须能追溯到标准源和页码。
3. 低置信度映射不能直接进入“高频重点”结论。
4. 老师 PDF 与真题源冲突时，先保留冲突说明，等待人工复核。
5. 统计汇总只能从 `canonical_exam_questions.xlsx` 生成，不能直接从原始文件或老师 PDF 聚合。

## 风险

1. 部分早年真题可能扫描质量较差，文本抽取不稳定，需要页面渲染和人工核对。
2. 老师 PDF 的题型体系可能和项目题型体系不完全一致，需要单独维护映射表。
3. 早年考纲、题量和题型结构与近年不同，全周期统计不能直接等同于当前备考权重。
4. 真题文件夹中可能存在合集和单年文件混杂，必须先完成标准源整理再统计。

## 当前默认决策

1. 独立研究文件夹使用 `research/math2-past-exam-analysis/`。
2. 近十年窗口先按 `2017-2026` 计算。
3. 低置信度题型映射先进入待复核列表，不自动进入高频重点结论。
4. 本研究数据集暂不接入网站运行表；后续如需接入，再单独设计导入流程。

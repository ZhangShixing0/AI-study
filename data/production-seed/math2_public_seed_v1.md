# math2_public_seed_v1 数据字典

最后更新：2026-06-27

适用文件：`data/production-seed/math2_public_seed_v1.xlsx`

生成脚本：`scripts/build-math2-public-seed.mjs`

用途：整理“数学二公共数据”的第一批生产导入模板。正式网站运行时读取 PostgreSQL；Excel 只作为人工维护、审核、批量导入和来源回溯模板。

## 1. 当前工作簿状态

| sheet | 当前行数 | 说明 |
| --- | ---: | --- |
| `plan_variants` | 2 | 数二两种注册可选复习方案 |
| `chapters` | 15 | 数二稳定章节本体 |
| `display_chapters` | 12 | 成长页章节掌握度展示章节，包含展示名和 SVG 文件名 |
| `chapter_display_mappings` | 15 | 原始章节到成长页展示章节的映射 |
| `chapter_orders` | 30 | 两种方案下各 15 章的顺序 |
| `question_types` | 87 | 数二稳定题型本体；已包含前端题型介绍字段，线代 0 题题型已删除并重排 ID |
| `question_type_orders` | 174 | 两种方案下各 87 个题型的推进顺序和建议学习量 |
| `questions` | 2730 | 高数 9 章 + 线代 6 章正式题目位置表 |
| `chapter_summary_templates` | 15 | 章节总结模板，已从真题分析表导入 15 章 |
| `exercise_books` | 5 | 注册可选资料/题源目录；`book_id` 带数学类型前缀 |
| `institutions` | 242 | 目标院校库；覆盖第二轮“双一流”建设高校，并追加常见非双一流一本/省重点院校 |
| `classes` | 4 | 新生分班用的班级配置；正式初始只保留数二 A/B/C/D 四个班 |
| `class_intake_settings` | 4 | 当前新生进入哪个班 |

当前校验结果：`errors = []`。

当前待人工补齐：暂无。后续真实班级仍建议通过管理员后台创建和维护。

院校库来源说明：`institutions` 当前由 `data/production-seed/source/institutions_seed.tsv` 生成，首批覆盖 147 所第二轮“双一流”建设高校，并追加 95 所常见非双一流一本/省重点院校。`school_tags` 中的 `985`、`211` 是历史/常用筛选标签，`一本` 是注册页搜索和后台筛选用的常见报考标签，不代表全国统一官方层级；正式招生政策判断仍应以最新官方招生简章为准。

## 2. 运行数据流

学生注册后，网站至少保存：

| 字段 | 来源 | 说明 |
| --- | --- | --- |
| `student_profiles.math_type` | 注册选择 | 例如 `数学二`，以后可扩展 `数学一`、`数学三` |
| `student_profiles.plan_variant_id` | `plan_variants.plan_variant_id` | 每日计划推进的核心方案 ID |
| `student_profiles.review_order` | 网页提交值，可选保留 | 兼容前端提交，例如 `mixed`、`gaoshu_first` |
| 学生选书 | 学生个人数据表 | 不放入公共 Excel；公共表只定义可选资料；运行库中 `student_profiles.primary_book_1/primary_book_2/backup_book` 保存稳定 `book_id`，例如 `m2_880` |

每日计划生成时：

1. 按学生的 `plan_variant_id` 查 `chapter_orders`。
2. 按同一个 `plan_variant_id` 查 `question_type_orders`。
3. 按 `question_type_orders.sort_code` 推进题型。
4. 按 `question_type_orders.type_id` 查 `question_types`，再按 `questions.type_id` 找可布置题目。
5. 按学生个人选书筛选 `questions.book_id`；后端兼容旧值 `880/1000/660/严选题`，但正式写入 `student_profiles` 时应规范为 `m2_880/m2_1000/m2_660/m2_yanxuan`。
6. 章节结束时，按 `math_type + chapter_id + plan_stage` 查 `chapter_summary_templates`。

成长页章节掌握度展示时：

1. 原始题型和章节完成仍使用 `chapters.chapter_id`。
2. 前端展示的大章节来自 `display_chapters`。
3. 后端或前端按 `chapter_display_mappings` 把多个原始章节聚合到一个展示章节，例如 `一元微分` 聚合 `一元函数微分学 / 微分应用（一）函数性态 / 微分应用（二）中值定理`。

不要只按 `question_types` 的全局顺序推进，因为同一个题型在“穿插版”和“先高数后线代版”中的出现顺序不同。

## 3. 重要维护原则

- Excel 少了一行：导入 PostgreSQL 时不要自动删除旧数据。
- 废弃数据：用 `is_active=0`，不要直接删除已经可能被学生历史进度引用的题型、题目、章节或方案。
- `questions` 只保存最终 `type_id`，不保存旧源表里的 `归属题型` 或旧题型名。
- `questions.question_id` 使用全局唯一 ID，数二题目前缀为 `M2-`；后续数一使用 `M1-`。
- `exercise_books.book_id` 使用数学类型前缀，例如 `m2_880`；后续数一 880 使用 `m1_880`。
- `student_profiles` 属于运行时个人数据，不在本 Excel 中；其中选书字段应保存 `exercise_books.book_id`，页面展示时再去掉数学前缀显示为 `880` 等旧书名码。
- 线代没有题目的题型已在正式导入前删除；`type_id`、`question_type_orders.type_id`、`questions.type_id` 已同步重排。
- 题型介绍来自 `type_mapping.xlsx` 的正式内容；只导入前端展示所需字段，不导入旧来源题型 ID。
- 今日计划题型卡片左侧的“题型1/题型2”来自 `question_types.card_type_label`，不是按今日第几个任务动态编号，也不从 `card_title` 中解析。
- 临时映射审核表可以删除，不属于正式公共数据表。
- 当前不做题型讲解图片，因此没有 `lecture_image_url` 和 `lecture_image_rights_status` 字段。

### 3.1 `math_type` 和 ID 前缀规则

`math_type` 用来标记这行公共数据属于数学一、数学二还是数学三。它不是学生个人选择结果，而是公共数据的适用范围。

它主要用于：

- 注册页只展示该学生数学类型下可用的复习方案、资料、班级。
- 每日计划只推进该数学类型下的章节、题型、题目。
- 后续数一、数二共用同一套 PostgreSQL 表结构，而不是拆成多套表。

ID 前缀规则：

| 数据 | 数二当前规则 | 后续数一建议 | 说明 |
| --- | --- | --- | --- |
| `chapters.chapter_id` | `M2-CH-0001` | `M1-CH-0001` | 章节 ID 按数学类型隔离 |
| `display_chapters.display_chapter_id` | `math2-derivative` | `math1-derivative` | 成长页展示章节 ID 按数学类型隔离 |
| `question_types.type_id` | `M2-QT-0001` | `M1-QT-0001` | 题型 ID 按数学类型隔离 |
| `questions.question_id` | `M2-880-01-JC1-004` | `M1-880-...` | 题目 ID 全局唯一，避免数一/数二题号撞车 |
| `exercise_books.book_id` | `m2_880` | `m1_880` | 前端可都显示 `880题`，后台 ID 必须区分 |
| `plan_variants.plan_variant_id` | `math2_mixed` | `math1_mixed` | 复习方案按数学类型隔离 |

如果数一也使用 `880题`，不要复用 `m2_880`。前端展示名可以都叫 `880题`，但 PostgreSQL 中应分别保存为 `m1_880` 和 `m2_880`。

## 4. 各表字段说明

### 4.1 `plan_variants`

作用：定义注册时可选择的复习方案。

主键：`plan_variant_id`

| 字段 | PostgreSQL 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `plan_variant_id` | `text` | 是 | 稳定方案 ID，例如 `math2_mixed` |
| `math_type` | `text` | 是 | 数学类型，例如 `数学二` |
| `review_order` | `text` | 是 | 前端提交值，只能是 `mixed` / `gaoshu_first` |
| `variant_name` | `text` | 是 | 后台名称 |
| `student_label` | `text` | 是 | 注册页展示名称 |
| `description` | `text` | 否 | 方案说明 |
| `is_active` | `boolean` | 是 | 是否启用 |
| `version` | `text` | 是 | 数据版本 |
| `sort_order` | `integer` | 是 | 注册页展示顺序 |
| `note` | `text` | 否 | 维护备注 |

### 4.2 `chapters`

作用：稳定章节本体，不随复习方案变化。

主键：`chapter_id`

| 字段 | PostgreSQL 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `chapter_id` | `text` | 是 | 稳定章节 ID，例如 `M2-CH-0001` |
| `math_type` | `text` | 是 | 数学类型 |
| `subject` | `text` | 是 | 科目，例如高等数学、线性代数 |
| `chapter_name` | `text` | 是 | 章节名 |
| `chapter_alias` | `text` | 否 | 章节别名，用于搜索或兼容旧名称 |
| `is_active` | `boolean` | 是 | 是否启用 |
| `source_pdf` | `text` | 否 | 来源资料 |
| `source_pdf_page` | `text` | 否 | 来源页 |
| `note` | `text` | 否 | 维护备注 |

### 4.3 `display_chapters`

作用：定义成长页章节掌握度展示卡。它是前端展示层的大章节，不替代原始章节本体。

主键：`display_chapter_id`

| 字段 | PostgreSQL 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `display_chapter_id` | `text` | 是 | 展示章节 ID，例如 `math2-derivative` |
| `math_type` | `text` | 是 | 数学类型 |
| `subject` | `text` | 是 | 高等数学/线性代数 |
| `display_chapter_name` | `text` | 是 | 前端展示名，例如 `一元微分` |
| `art_label` | `text` | 是 | SVG 缺省/无障碍展示标签 |
| `svg_filename` | `text` | 是 | 成长页章节图文件名 |
| `sort_order` | `integer` | 是 | 成长页展示顺序 |
| `is_active` | `boolean` | 是 | 是否启用 |
| `note` | `text` | 否 | 维护备注 |

### 4.4 `chapter_display_mappings`

作用：把原始章节映射到成长页展示章节。一个展示章节可以合并多个原始章节。

主键：`math_type + chapter_id`

| 字段 | PostgreSQL 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `math_type` | `text` | 是 | 数学类型 |
| `chapter_id` | `text` | 是 | 原始章节 ID，对应 `chapters.chapter_id` |
| `display_chapter_id` | `text` | 是 | 展示章节 ID，对应 `display_chapters.display_chapter_id` |
| `display_sort_in_group` | `integer` | 是 | 同一展示章节内的原始章节顺序 |
| `is_active` | `boolean` | 是 | 是否启用 |
| `note` | `text` | 否 | 维护备注 |

说明：章节总结、章节完成判断仍然使用原始 `chapter_id`；成长页掌握度展示使用 `display_chapter_id` 聚合。

### 4.5 `chapter_orders`

作用：定义某个复习方案下章节推进顺序。

主键：`plan_variant_id + chapter_id`

| 字段 | PostgreSQL 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `plan_variant_id` | `text` | 是 | 对应 `plan_variants` |
| `chapter_id` | `text` | 是 | 对应 `chapters` |
| `chapter_sort` | `integer` | 是 | 该方案下章节排序 |
| `chapter_code` | `text` | 是 | 展示或导入用章节编码 |
| `display_chapter_name` | `text` | 是 | 该方案下展示章节名 |
| `is_active` | `boolean` | 是 | 是否启用 |
| `source_sheet` | `text` | 否 | 来源表 |
| `source_pdf` | `text` | 否 | 来源资料 |
| `source_pdf_page` | `text` | 否 | 来源页 |
| `note` | `text` | 否 | 维护备注 |

### 4.6 `question_types`

作用：稳定题型本体，不随复习方案变化。

主键：`type_id`

| 字段 | PostgreSQL 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `type_id` | `text` | 是 | 稳定题型 ID，例如 `M2-QT-0001` |
| `math_type` | `text` | 是 | 数学类型 |
| `chapter_id` | `text` | 是 | 所属章节 |
| `canonical_topic_id` | `text` | 否 | 数一/数二/数三共通知识主题 ID |
| `type_kind` | `text` | 是 | 题型类别，例如知识点、题型 |
| `type_name` | `text` | 是 | 最终题型名 |
| `card_type_label` | `text` | 是 | 前端题型卡片左侧标签，例如 `题型1`；同一 `chapter_id` 下不可重复 |
| `card_title` | `text` | 是 | 前端题型卡片标题；应为简化后的标题，不包含 `题型N｜` 前缀 |
| `importance_tag` | `text` | 是 | 前端介绍标签，例如 `必会`、`重点`、`易错`、`拔高` |
| `question_kind` | `text` | 是 | 前端介绍中的题目类型，例如 `计算题`、`综合题`、`概念题`、`证明题`、`应用题` |
| `intro_title` | `text` | 是 | 前端介绍标题，例如 `积分基本功题型` |
| `intro_body` | `text` | 是 | 前端介绍正文，例如常考形式、注意事项、失分提醒 |
| `is_active` | `boolean` | 是 | 是否启用 |
| `source_section` | `text` | 否 | 来源分区 |
| `source_pdf` | `text` | 否 | 来源资料 |
| `source_pdf_page` | `text` | 否 | 来源页 |
| `note` | `text` | 否 | 维护备注 |

前端展示建议：

- 标题行：`${importance_tag}｜${question_kind}：${intro_title}`
- 正文行：`intro_body`
- 正式表不保存 `type_mapping.xlsx` 里的旧题型 ID；旧映射关系只在生成脚本内部使用。

### 4.7 `question_type_orders`

作用：定义某个复习方案下题型推进顺序和建议学习量。

主键：`plan_variant_id + type_id`

| 字段 | PostgreSQL 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `plan_variant_id` | `text` | 是 | 对应复习方案 |
| `type_id` | `text` | 是 | 对应最终题型 |
| `type_sort_in_chapter` | `integer` | 是 | 该章节内展示顺序 |
| `final_type_label` | `text` | 是 | 前端展示标签，例如题型一 |
| `sort_code` | `text` | 是 | 该方案下全局推进顺序 |
| `direct_assignable` | `boolean` | 是 | 是否可直接进入每日任务 |
| `duration_130_days` | `numeric(6,2)` | 否 | 130 天节奏建议天数，数二 A 班使用 |
| `duration_100_days` | `numeric(6,2)` | 否 | 100 天节奏建议天数，数二 B/C 班使用 |
| `duration_80_days` | `numeric(6,2)` | 否 | 80 天节奏建议天数，数二 D 班使用 |
| `is_active` | `boolean` | 是 | 是否启用 |
| `source_type_id` | `text` | 否 | 来源题型表 ID，仅用于追溯题型表 |
| `source_sheet` | `text` | 否 | 来源表 |
| `duration_basis` | `text` | 否 | 时长依据 |
| `note` | `text` | 否 | 维护备注 |

时长维护说明：由于删除了部分线代知识点，当前题型总时长已经不再是原先的 45/60/75 天节奏，整体应该少 4 天左右；后续前端展示、每日计划和排课逻辑应以 `question_type_orders` 实际汇总后的天数为准。正式公共表不再维护 `suggested_days` 字段，后端运行时按学生班级把对应 duration 列映射为内部计划时长。

### 4.8 `questions`

作用：定义每个最终题型下可布置哪些题、来自哪本资料。

主键：`question_id`

外键：

- `type_id -> question_types.type_id`
- `book_id -> exercise_books.book_id`

| 字段 | PostgreSQL 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `question_id` | `text` | 是 | 全局唯一题目 ID；数二使用 `M2-` 前缀 |
| `type_id` | `text` | 是 | 最终题型 ID |
| `book_id` | `text` | 是 | 资料/书目 ID |
| `applicable_levels` | `text` | 是 | 适用班型，逗号分隔，例如 `A,B,C,D` |
| `plan_stage` | `text` | 是 | 计划阶段，例如 `强化` |
| `original_position_text` | `text` | 是 | 学生端展示的原书位置文本 |
| `question_order` | `integer` | 是 | 最终题型内排序 |
| `display_permission` | `text` | 是 | 题面展示权限，当前为 `仅显示题号` |
| `is_active` | `boolean` | 是 | 是否启用 |
| `source_pdf` | `text` | 否 | 来源资料 |
| `source_pdf_page` | `text` | 否 | 来源页 |
| `question_note` | `text` | 否 | 题目备注 |
| `book_display_label` | `text` | 是 | 前端展示资料名，例如 `《880》` |
| `source_chapter_label` | `text` | 否 | 资料内章节，例如 `第一章`；无则不展示 |
| `source_section_label` | `text` | 否 | 资料内模块/小节，例如 `基础`、`强化`；无则不展示 |
| `source_subsection_label` | `text` | 否 | 更细层级，例如 `选择`、`填空`、`解答`；无则不展示 |
| `source_question_label` | `text` | 是 | 题号展示文本，例如 `第5题` |

维护说明：

- 正式 `questions` 不保存旧源表里的 `归属题型`、旧题型名、映射状态。
- 旧题型到最终题型的对应关系只在生成脚本内部使用；临时审核表核完即可删除。
- 当前题目均不录入第三方教材完整题面；学生端只展示资料名、资料内位置和题号。
- 前端展示优先使用 `book_display_label + source_chapter_label + source_section_label + source_subsection_label + source_question_label`，`original_position_text` 保留用于人工核查、导出和追溯。
- Excel 中如果用 `空` 表示某一层不展示，导入 PostgreSQL 时应规范为空值，前端不显示这一层。
- 线代题目来自 `line_algebra_question_source_table_final_classes.xlsx`，按源表要求 `question_note` 全部留空。

### 4.9 `chapter_summary_templates`

作用：公共章节总结模板。两种复习方案共用，不按复习方案复制。

主键：`summary_template_id`

建议唯一约束：`math_type + chapter_id + plan_stage`

| 字段 | PostgreSQL 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `summary_template_id` | `text` | 是 | 稳定模板 ID |
| `math_type` | `text` | 是 | 数学类型 |
| `chapter_id` | `text` | 是 | 对应章节 |
| `plan_stage` | `text` | 是 | 阶段 |
| `summary_title` | `text` | 是 | 总结标题 |
| `exam_focus` | `text` | 否 | 本章在真题中的考察，来自源表 `summary_template_id7` |
| `key_points` | `text` | 否 | 本章核心能力，来自源表 `summary_template_id8` |
| `common_mistakes` | `text` | 否 | 常见失分点，来自源表 `summary_template_id9` |
| `review_suggestions` | `text` | 否 | 复盘建议 |
| `is_active` | `boolean` | 是 | 是否启用 |
| `note` | `text` | 否 | 维护备注 |

### 4.10 `exercise_books`

作用：定义注册或计划中可使用的习题册、资料来源。

主键：`book_id`

| 字段 | PostgreSQL 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `book_id` | `text` | 是 | 稳定书目/资料 ID；数二使用 `m2_` 前缀 |
| `book_name` | `text` | 是 | 书名或资料名 |
| `book_type` | `text` | 是 | 类型，例如主选、备选、题源 |
| `math_type` | `text` | 否 | 适用数学类型；为空表示通用 |
| `plan_stage` | `text` | 否 | 适用阶段 |
| `is_registration_selectable` | `boolean` | 是 | 是否出现在注册页可选列表 |
| `is_active` | `boolean` | 是 | 是否启用 |
| `sort_order` | `integer` | 是 | 注册页或后台展示顺序 |
| `note` | `text` | 否 | 维护备注 |

维护说明：

- `exercise_books` 只定义公共资料目录，不保存学生个人选择。
- 学生实际选了哪本书，应保存在学生个人数据表中，并保存为 `exercise_books.book_id`，不要只存 `880` 这种跨数学类型可能重复的显示码。
- `questions.book_id` 必须能在这里找到。
- 即使前端展示名同为 `880题`，数一和数二也应使用不同 `book_id`，例如 `m1_880` / `m2_880`。

### 4.11 `institutions`

作用：定义学生注册或档案中可选择/搜索的目标院校。

主键：`school_id`

维护源表：`data/production-seed/source/institutions_seed.tsv`

| 字段 | PostgreSQL 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `school_id` | `text` | 是 | 稳定院校 ID |
| `school_name` | `text` | 是 | 院校名称 |
| `school_tags` | `text` | 否 | 标签，例如 `985,211,双一流` 或 `一本,非双一流`；`985/211` 为常用历史标签，`一本` 为搜索筛选用标签 |
| `province` | `text` | 否 | 所在省份 |
| `search_keywords` | `text` | 否 | 搜索关键词、简称、别名、英文缩写、省份和标签 |
| `sort_order` | `integer` | 是 | 展示排序 |

### 4.12 `classes`

作用：定义班级、老师、QQ群、容量和是否接收新生。

主键：`class_id`

| 字段 | PostgreSQL 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `class_id` | `text` | 是 | 稳定班级 ID |
| `class_name` | `text` | 是 | 班级名称 |
| `math_type` | `text` | 是 | 数学类型 |
| `target_exam_year` | `integer` | 是 | 考研年份 |
| `level` | `text` | 是 | 班型层级 |
| `teacher_user_id` | `text` | 否 | 老师用户 ID |
| `group_name` | `text` | 否 | 群名称 |
| `qq_group_number` | `text` | 否 | QQ 群号 |
| `capacity` | `integer` | 否 | 容量 |
| `is_accepting_new_students` | `boolean` | 是 | 是否接收新生 |
| `is_test_class` | `boolean` | 是 | 是否测试班 |
| `note` | `text` | 否 | 维护备注 |

### 4.13 `class_intake_settings`

作用：控制某个数学类型和班型的新生当前进入哪个班。

主键：`setting_id`

| 字段 | PostgreSQL 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `setting_id` | `text` | 是 | 稳定配置 ID |
| `math_type` | `text` | 是 | 数学类型 |
| `level` | `text` | 是 | 班型层级 |
| `active_class_id` | `text` | 是 | 当前接收新生的班级 |
| `is_active` | `boolean` | 是 | 是否启用 |
| `note` | `text` | 否 | 维护备注 |

运行逻辑：
- 学生完成首次开通后，后端用 `math_type + review_order` 保存稳定的 `student_profiles.plan_variant_id`，每日计划优先按这个字段读取 `chapter_orders` 和 `question_type_orders`。
- 自动分班优先读取 `class_intake_settings.active_class_id`；如果这个班未开放或容量已满，会在同一 `math_type + level` 下选择下一个开放且未满员的班。
- 管理员后台可以继续创建新班和调整入口班；公共 Excel 只需要保证 A/B/C/D 至少各有一个可接收新生的班级作为基础数据。

## 5. 导入 PostgreSQL 前校验清单

必须通过：

- `plan_variants.review_order` 只能是 `mixed` 或 `gaoshu_first`。
- `chapters.chapter_id` 在同一 `math_type` 下稳定唯一。
- `display_chapters.display_chapter_id` 唯一，且同一 `math_type` 下 `sort_order` 不重复。
- `chapter_display_mappings.chapter_id` 必须存在于 `chapters`。
- `chapter_display_mappings.display_chapter_id` 必须存在于 `display_chapters`。
- 每个 `plan_variant_id` 下 `chapter_orders.chapter_sort` 唯一。
- 每个 `plan_variant_id` 下 `question_type_orders.sort_code` 唯一。
- `questions.question_id` 唯一。
- `question_types.card_type_label` 必须形如 `题型1`、`题型2`，并且同一 `chapter_id` 下不能重复。
- 所有 `question_type_orders.type_id` 都存在于 `question_types`。
- 所有 `question_types.chapter_id` 都存在于 `chapters`。
- 所有 `questions.type_id` 都存在于 `question_types`。
- 所有 `questions.book_id` 都存在于 `exercise_books`。
- 所有 `chapter_summary_templates.chapter_id` 都存在于 `chapters`。
- `class_intake_settings.active_class_id` 必须存在于 `classes`。

建议通过：

- `duration_130_days`、`duration_100_days`、`duration_80_days` 都是非负数字。
- `direct_assignable=1` 的题型才进入每日任务。
- 启用的章节总结模板必须填写 `exam_focus`、`key_points`、`common_mistakes`。
- `is_active=0` 的题型、题目、总结模板不进入学生端。

## 6. 后续扩展数一/数三

不要为数一重做一套 PostgreSQL 表结构。继续使用同样 13 张公共表：

- `plan_variants` 新增 `math1_*` 方案。
- `chapters` 新增 `M1-CH-*` 章节。
- `display_chapters` 新增 `math1-*` 成长页展示章节。
- `chapter_display_mappings` 新增数一原始章节到展示章节的映射。
- `question_types` 新增 `M1-QT-*` 题型。
- `chapter_orders` 和 `question_type_orders` 新增数一各方案下的顺序。
- `exercise_books` 新增 `m1_880`、`m1_1000` 等资料行。
- `questions` 新增 `M1-...` 题目行，且 `book_id` 指向 `m1_*`。
- 如果数一和数二有共同知识主题，在两个题型行的 `canonical_topic_id` 中填同一个公共主题 ID。

维护层面，为了人工核查方便，可以单独准备一个和 `math2_public_seed_v1.xlsx` 同结构的 `math1_public_seed_v1.xlsx`。导入 PostgreSQL 时，不建新表，而是把数一数据 upsert 到同一套公共表中。

推荐流程：

1. 先整理数一自己的题型表、题目表、章节总结表。
2. 生成 `math1_public_seed_v1.xlsx` 用于人工核查。
3. 确认无误后，把数一数据导入同一套 PostgreSQL 公共表。

这样以后新增班型或数学类型时，只追加数据行，不改数据库关系。

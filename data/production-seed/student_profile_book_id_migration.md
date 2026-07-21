# 学生选书字段迁移清单

## 目的

正式运行时，学生个人档案里的选书字段应保存稳定的 `exercise_books.book_id`，不要继续保存旧显示码。

需要迁移的运行库字段：

- `student_profiles.primary_book_1`
- `student_profiles.primary_book_2`
- `student_profiles.backup_book`

示例：

| 旧值 | `math_type` | 新值 |
| --- | --- | --- |
| `880` | `数学二` | `m2_880` |
| `1000` | `数学二` | `m2_1000` |
| `660` | `数学二` | `m2_660` |
| `880` | `数学一` | `m1_880` |
| `880题` | `数学二` | `m2_880` |
| `严选题` | `数学二` | `m2_yanxuan` |
| `严选题基础篇` | `数学二` | `m2_yanxuan_basic` |

已经是 `m1_880 / m2_880 / m3_880` 这类格式的值不再修改。

## 当前代码行为

后端已在启动迁移 `backend/services.py::run_startup_migrations()` 中执行一次幂等修复：

- 旧 MVP 值 `880/1000/660` 会按学生 `math_type` 自动补前缀。
- `math_type` 为空的旧数据按当前 MVP 实际情况默认视为 `数学二`。
- 页面接口仍展示 `880/1000/660`，不会把 `m2_880` 直接暴露给学生。

## PostgreSQL 上线前核对

导入正式库前先查询仍未规范的值：

```sql
select user_id, math_type, primary_book_1, primary_book_2, backup_book
from student_profiles
where (primary_book_1 <> '' and primary_book_1 !~ '^m[123]_')
   or (primary_book_2 <> '' and primary_book_2 !~ '^m[123]_')
   or (backup_book <> '' and backup_book !~ '^m[123]_');
```

如果确认这些旧值都来自数二 MVP，可按数二修复：

```sql
update student_profiles
set
  primary_book_1 = case
    when primary_book_1 ~ '^m[123]_' or primary_book_1 = '' then primary_book_1
    when primary_book_1 = '880题' then 'm2_880'
    when primary_book_1 = '1000题' then 'm2_1000'
    when primary_book_1 = '660题' then 'm2_660'
    when primary_book_1 = '严选题' then 'm2_yanxuan'
    when primary_book_1 = '严选题基础篇' then 'm2_yanxuan_basic'
    else 'm2_' || primary_book_1
  end,
  primary_book_2 = case
    when primary_book_2 ~ '^m[123]_' or primary_book_2 = '' then primary_book_2
    when primary_book_2 = '880题' then 'm2_880'
    when primary_book_2 = '1000题' then 'm2_1000'
    when primary_book_2 = '660题' then 'm2_660'
    when primary_book_2 = '严选题' then 'm2_yanxuan'
    when primary_book_2 = '严选题基础篇' then 'm2_yanxuan_basic'
    else 'm2_' || primary_book_2
  end,
  backup_book = case
    when backup_book ~ '^m[123]_' or backup_book = '' then backup_book
    when backup_book = '880题' then 'm2_880'
    when backup_book = '1000题' then 'm2_1000'
    when backup_book = '660题' then 'm2_660'
    when backup_book = '严选题' then 'm2_yanxuan'
    when backup_book = '严选题基础篇' then 'm2_yanxuan_basic'
    else 'm2_' || backup_book
  end,
  updated_at = now()
where coalesce(math_type, '') in ('', '数学二');
```

后续数一/数三学生必须按各自 `math_type` 保存，例如 `m1_880`、`m3_880`。

## 验收

- `student_profiles` 中新增或迁移后的选书字段都能在 `exercise_books.book_id` 找到。
- 每日计划仍按 `questions.book_id` 筛题。
- 学生端“我的资料”页面仍显示 `880题`、`1000题`、`660题` 等可读名称。

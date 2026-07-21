-- AI Tutor production public seed schema.
-- Generated for data/production-seed/math2_public_seed_v1.xlsx.
-- Excel is the maintenance/import template; PostgreSQL is the runtime source of truth.

begin;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.plan_variants (
  plan_variant_id text primary key,
  math_type text not null check (math_type in ('数学一', '数学二', '数学三')),
  review_order text not null check (review_order in ('mixed', 'gaoshu_first')),
  variant_name text not null,
  student_label text not null,
  description text,
  is_active boolean not null default true,
  version text not null,
  sort_order integer not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  imported_at timestamptz,
  import_source text
);

create unique index if not exists idx_plan_variants_math_review_order
  on public.plan_variants (math_type, review_order);

create table if not exists public.chapters (
  chapter_id text primary key,
  math_type text not null check (math_type in ('数学一', '数学二', '数学三')),
  subject text not null,
  chapter_name text not null,
  chapter_alias text,
  is_active boolean not null default true,
  source_pdf text,
  source_pdf_page text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  imported_at timestamptz,
  import_source text
);

-- Runtime schema may have been applied before the public seed schema in a
-- previous deployment. Keep this table compatible with the importer even when
-- it already exists with a smaller runtime-only shape.
alter table public.chapters
  add column if not exists chapter_alias text,
  add column if not exists source_pdf text,
  add column if not exists source_pdf_page text,
  add column if not exists note text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists imported_at timestamptz,
  add column if not exists import_source text;

alter table public.chapters
  alter column is_active drop default,
  alter column is_active type boolean using (
    case
      when is_active::text in ('1', 'true', 't', 'yes', 'y') then true
      else false
    end
  ),
  alter column is_active set default true,
  alter column is_active set not null;

create unique index if not exists idx_chapters_math_name
  on public.chapters (math_type, chapter_name);

create table if not exists public.display_chapters (
  display_chapter_id text primary key,
  math_type text not null check (math_type in ('数学一', '数学二', '数学三')),
  subject text not null,
  display_chapter_name text not null,
  art_label text not null,
  svg_filename text not null,
  sort_order integer not null,
  is_active boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  imported_at timestamptz,
  import_source text
);

create unique index if not exists idx_display_chapters_math_sort
  on public.display_chapters (math_type, sort_order);

create table if not exists public.chapter_display_mappings (
  math_type text not null check (math_type in ('数学一', '数学二', '数学三')),
  chapter_id text not null references public.chapters(chapter_id),
  display_chapter_id text not null references public.display_chapters(display_chapter_id),
  display_sort_in_group integer not null,
  is_active boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  imported_at timestamptz,
  import_source text,
  primary key (math_type, chapter_id)
);

create index if not exists idx_chapter_display_mappings_display
  on public.chapter_display_mappings (display_chapter_id, display_sort_in_group);

create table if not exists public.exercise_books (
  book_id text primary key,
  book_name text not null,
  book_type text not null,
  math_type text check (math_type is null or math_type in ('数学一', '数学二', '数学三')),
  plan_stage text,
  is_registration_selectable boolean not null default true,
  is_active boolean not null default true,
  sort_order integer not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  imported_at timestamptz,
  import_source text
);

create index if not exists idx_exercise_books_registration
  on public.exercise_books (math_type, is_registration_selectable, is_active, sort_order);

create table if not exists public.institutions (
  school_id text primary key,
  school_name text not null,
  school_tags text not null,
  province text not null,
  search_keywords text not null,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  imported_at timestamptz,
  import_source text
);

create unique index if not exists idx_institutions_school_name
  on public.institutions (school_name);

create unique index if not exists idx_institutions_sort
  on public.institutions (sort_order);

create table if not exists public.classes (
  class_id text primary key,
  class_name text not null,
  math_type text not null check (math_type in ('数学一', '数学二', '数学三')),
  target_exam_year integer not null,
  level text not null check (level in ('A', 'B', 'C', 'D')),
  teacher_user_id text,
  group_name text,
  qq_group_number text,
  capacity integer,
  is_accepting_new_students boolean not null default false,
  is_test_class boolean not null default false,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  imported_at timestamptz,
  import_source text,
  check (capacity is null or capacity > 0)
);

create index if not exists idx_classes_intake
  on public.classes (math_type, level, is_accepting_new_students);

create table if not exists public.question_types (
  type_id text primary key,
  math_type text not null check (math_type in ('数学一', '数学二', '数学三')),
  chapter_id text not null references public.chapters(chapter_id),
  canonical_topic_id text,
  type_kind text not null,
  type_name text not null,
  card_type_label text not null,
  card_title text not null,
  importance_tag text not null check (importance_tag in ('必会', '重点', '易错', '拔高')),
  question_kind text not null check (question_kind in ('计算题', '综合题', '概念题', '证明题', '应用题')),
  intro_title text not null,
  intro_body text not null,
  is_active boolean not null default true,
  source_section text,
  source_pdf text,
  source_pdf_page text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  imported_at timestamptz,
  import_source text
);

alter table public.question_types
  add column if not exists card_type_label text;

create index if not exists idx_question_types_chapter
  on public.question_types (chapter_id);

create unique index if not exists idx_question_types_chapter_card_label
  on public.question_types (chapter_id, card_type_label);

create table if not exists public.chapter_orders (
  plan_variant_id text not null references public.plan_variants(plan_variant_id),
  chapter_id text not null references public.chapters(chapter_id),
  chapter_sort integer not null,
  chapter_code text not null,
  display_chapter_name text not null,
  is_active boolean not null default true,
  source_sheet text,
  source_pdf text,
  source_pdf_page text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  imported_at timestamptz,
  import_source text,
  primary key (plan_variant_id, chapter_id)
);

-- Same compatibility repair as chapters: the runtime schema should not block
-- importing the full public seed workbook.
alter table public.chapter_orders
  add column if not exists chapter_code text not null default '',
  add column if not exists display_chapter_name text not null default '',
  add column if not exists source_sheet text,
  add column if not exists source_pdf text,
  add column if not exists source_pdf_page text,
  add column if not exists note text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists imported_at timestamptz,
  add column if not exists import_source text;

alter table public.chapter_orders
  alter column chapter_sort type integer using nullif(chapter_sort::text, '')::integer,
  alter column is_active drop default,
  alter column is_active type boolean using (
    case
      when is_active::text in ('1', 'true', 't', 'yes', 'y') then true
      else false
    end
  ),
  alter column is_active set default true,
  alter column is_active set not null;

create unique index if not exists idx_chapter_orders_sort
  on public.chapter_orders (plan_variant_id, chapter_sort);

create table if not exists public.question_type_orders (
  plan_variant_id text not null references public.plan_variants(plan_variant_id),
  type_id text not null references public.question_types(type_id),
  type_sort_in_chapter integer not null,
  final_type_label text not null,
  sort_code text not null,
  direct_assignable boolean not null default true,
  duration_130_days numeric(6,2),
  duration_100_days numeric(6,2),
  duration_80_days numeric(6,2),
  is_active boolean not null default true,
  source_type_id text,
  source_sheet text,
  duration_basis text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  imported_at timestamptz,
  import_source text,
  primary key (plan_variant_id, type_id),
  check (duration_130_days is null or duration_130_days >= 0),
  check (duration_100_days is null or duration_100_days >= 0),
  check (duration_80_days is null or duration_80_days >= 0)
);

create unique index if not exists idx_question_type_orders_sort_code
  on public.question_type_orders (plan_variant_id, sort_code);

create table if not exists public.questions (
  question_id text primary key,
  type_id text not null references public.question_types(type_id),
  book_id text not null references public.exercise_books(book_id),
  applicable_levels text not null,
  plan_stage text not null,
  original_position_text text not null,
  question_order integer not null,
  display_permission text not null,
  is_active boolean not null default true,
  source_pdf text,
  source_pdf_page text,
  question_note text,
  book_display_label text not null,
  source_chapter_label text,
  source_section_label text,
  source_subsection_label text,
  source_question_label text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  imported_at timestamptz,
  import_source text
);

create index if not exists idx_questions_type_book
  on public.questions (type_id, book_id);

create index if not exists idx_questions_active
  on public.questions (is_active);

create table if not exists public.chapter_summary_templates (
  summary_template_id text primary key,
  math_type text not null check (math_type in ('数学一', '数学二', '数学三')),
  chapter_id text not null references public.chapters(chapter_id),
  plan_stage text not null,
  summary_title text not null,
  exam_focus text,
  key_points text,
  common_mistakes text,
  review_suggestions text,
  is_active boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  imported_at timestamptz,
  import_source text
);

create unique index if not exists idx_chapter_summary_unique
  on public.chapter_summary_templates (math_type, chapter_id, plan_stage);

create table if not exists public.class_intake_settings (
  setting_id text primary key,
  math_type text not null check (math_type in ('数学一', '数学二', '数学三')),
  level text not null check (level in ('A', 'B', 'C', 'D')),
  active_class_id text not null references public.classes(class_id),
  is_active boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  imported_at timestamptz,
  import_source text
);

create unique index if not exists idx_class_intake_unique_active
  on public.class_intake_settings (math_type, level)
  where is_active = true;

do $$
declare
  target_table text;
  trigger_name text;
begin
  foreach target_table in array array[
    'plan_variants',
    'chapters',
    'display_chapters',
    'chapter_display_mappings',
    'exercise_books',
    'institutions',
    'classes',
    'question_types',
    'chapter_orders',
    'question_type_orders',
    'questions',
    'chapter_summary_templates',
    'class_intake_settings'
  ]
  loop
    trigger_name := 'trg_' || target_table || '_updated_at';
    if not exists (
      select 1
      from pg_trigger
      where tgname = trigger_name
        and tgrelid = format('public.%I', target_table)::regclass
    ) then
      execute format(
        'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
        trigger_name,
        target_table
      );
    end if;
  end loop;
end $$;

commit;

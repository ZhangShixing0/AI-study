-- AI Tutor production runtime schema.
-- Public course seed tables are created by data/production-seed/postgres_schema.sql.
-- Runtime tables store users, plans, feedback, growth snapshots, focus sessions,
-- announcements, and admin operation state.

begin;

create table if not exists public.users (
  user_id text not null,
  login_account text not null,
  password_hash text not null default '',
  login_password text not null default '',
  role text not null,
  nickname text not null default '',
  avatar_url text not null default '',
  qq text not null default '',
  account_status text not null default 'active',
  current_session_id text not null default '',
  last_login_at text not null default '',
  created_at text not null default '',
  updated_at text not null default '',
  gender text not null default '',
  password_changed_at text not null default '',
  account_type text not null default '',
  activated_at text not null default '',
  primary key (user_id)
);

create unique index if not exists idx_users_login_account
  on public.users (login_account);

create index if not exists idx_users_role_status
  on public.users (role, account_status);

insert into public.users (
  user_id, login_account, password_hash, login_password, role, nickname,
  avatar_url, qq, account_status, current_session_id, last_login_at,
  created_at, updated_at, gender, password_changed_at, account_type, activated_at
) values (
  'adm001',
  'adm001',
  '$sha256$240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
  'admin123',
  'admin',
  '全局运营管理员',
  '',
  '',
  'active',
  '',
  '',
  '2026-06-30 00:00:00',
  '2026-06-30 00:00:00',
  '',
  '',
  'admin',
  '2026-06-30 00:00:00'
)
on conflict (user_id) do update set
  login_account = excluded.login_account,
  password_hash = case
    when public.users.password_hash = '' then excluded.password_hash
    else public.users.password_hash
  end,
  login_password = case
    when public.users.login_password = '' then excluded.login_password
    else public.users.login_password
  end,
  role = excluded.role,
  nickname = case
    when public.users.nickname = '' then excluded.nickname
    else public.users.nickname
  end,
  account_status = case
    when public.users.account_status = '' then excluded.account_status
    else public.users.account_status
  end,
  account_type = case
    when public.users.account_type = '' then excluded.account_type
    else public.users.account_type
  end,
  updated_at = excluded.updated_at;

create table if not exists public.user_sessions (
  session_id text primary key,
  user_id text not null,
  refresh_token_hash text not null default '',
  device_id text not null default '',
  device_name text not null default '',
  ip_address text not null default '',
  user_agent text not null default '',
  expires_at text not null default '',
  revoked_at text not null default '',
  created_at text not null default '',
  updated_at text not null default ''
);

create index if not exists idx_user_sessions_user
  on public.user_sessions (user_id);

create table if not exists public.test_access_codes (
  code text primary key,
  user_id text not null default '',
  status text not null default 'unused',
  created_at text not null default '',
  claimed_at text not null default '',
  updated_at text not null default ''
);

create unique index if not exists idx_test_access_codes_code
  on public.test_access_codes (code);

create table if not exists public.test_user_dates (
  user_id text primary key,
  current_test_date text not null,
  created_at text not null default '',
  updated_at text not null default ''
);

create unique index if not exists idx_test_user_dates_user
  on public.test_user_dates (user_id);

create table if not exists public.test_runtime_state (
  state_key text primary key,
  state_value text not null,
  updated_at text not null default ''
);

create table if not exists public.student_profiles (
  user_id text not null,
  math_type text not null default '',
  target_exam_year text not null default '',
  target_exam_date text not null default '',
  target_score text not null default '',
  class_id text not null default '',
  level text not null default '',
  plan_enabled text not null default '1',
  paid_until text not null default '',
  primary_book_1 text not null default '',
  primary_book_2 text not null default '',
  backup_book text not null default '',
  current_type_id text not null default '',
  current_stage text not null default '',
  last_plan_date text not null default '',
  created_at text not null default '',
  updated_at text not null default '',
  target_school_id text not null default '',
  target_school_name text not null default '',
  intensive_days text not null default '60',
  review_order text not null default 'mixed',
  plan_variant_id text not null default '',
  initial_start_chapter_id text not null default '',
  diagnostic_json text not null default '{}',
  primary_book_1_scope text not null default 'all',
  primary_book_2_scope text not null default 'all',
  primary key (user_id)
);

create index if not exists idx_student_profiles_class
  on public.student_profiles (class_id, level);

alter table public.student_profiles
  add column if not exists initial_start_chapter_id text not null default '';

create table if not exists public.student_progress (
  progress_id text not null,
  user_id text not null,
  math_type text not null default '',
  plan_stage text not null default '',
  current_type_id text not null default '',
  current_type_sort_code text not null default '',
  progress_status text not null default 'active',
  current_type_status text not null default 'active',
  last_generated_plan_date text not null default '',
  last_completed_type_id text not null default '',
  unfinished_type_id text not null default '',
  unfinished_question_ids text not null default '[]',
  carryover_type_id text not null default '',
  carryover_question_ids text not null default '[]',
  next_plan_start_chapter_id text not null default '',
  next_plan_start_effective_date text not null default '',
  next_plan_start_status text not null default '',
  next_plan_start_updated_by text not null default '',
  next_plan_start_updated_at text not null default '',
  next_plan_start_applied_at text not null default '',
  mastery_scope_start_type_id text not null default '',
  mastery_scope_started_at text not null default '',
  mastery_scope_reason text not null default '',
  created_at text not null default '',
  updated_at text not null default '',
  primary key (progress_id)
);

create index if not exists idx_progress_user
  on public.student_progress (user_id);

alter table public.student_progress
  add column if not exists next_plan_start_chapter_id text not null default '',
  add column if not exists next_plan_start_effective_date text not null default '',
  add column if not exists next_plan_start_status text not null default '',
  add column if not exists next_plan_start_updated_by text not null default '',
  add column if not exists next_plan_start_updated_at text not null default '',
  add column if not exists next_plan_start_applied_at text not null default '',
  add column if not exists mastery_scope_start_type_id text not null default '',
  add column if not exists mastery_scope_started_at text not null default '',
  add column if not exists mastery_scope_reason text not null default '';

insert into public.users (
  user_id, login_account, password_hash, login_password, role, nickname,
  avatar_url, qq, account_status, current_session_id, last_login_at,
  created_at, updated_at, gender, password_changed_at, account_type, activated_at
) values
  ('10001', 'stu10001', '$sha256$f34c8e20dd7811ebb20b40fdbd51967fdc9e3e42239890d2a1f9de673c08b90d', '', 'student', '测试号01', '/assets/images/avatars/user/B_kaoyan_avatar_01.webp', '90001001', 'active', '', '', '2026-06-10 06:00:00', '2026-06-10 06:00:00', '', '2026-06-10 06:00:00', 'internal_test', '2026-06-10 06:00:00'),
  ('10002', 'stu10002', '$sha256$df658e57e1ec27a6972a21fb0286e8f5eb38292822b375267dac4d85685c465c', '', 'student', '测试号02', '/assets/images/avatars/user/B_kaoyan_avatar_03.webp', '90001002', 'active', '', '', '2026-06-10 06:00:00', '2026-06-10 06:00:00', '', '2026-06-10 06:00:00', 'internal_test', '2026-06-10 06:00:00'),
  ('10003', 'stu10003', '$sha256$76d9ceec0a63bb1b659143d8c669b99434fecc4d987dd0404dc2203b83b66623', '', 'student', '测试号03', '/assets/images/avatars/user/B_kaoyan_avatar_05.webp', '90001003', 'active', '', '', '2026-06-10 06:00:00', '2026-06-10 06:00:00', '', '2026-06-10 06:00:00', 'internal_test', '2026-06-10 06:00:00'),
  ('10004', 'stu10004', '$sha256$c71eb5a3fc6f42ab953227b658a7973205b32d6bb18b43ba8bb080e1bbf157a0', '', 'student', '测试号04', '/assets/images/avatars/user/B_kaoyan_avatar_07.webp', '90001004', 'active', '', '', '2026-06-10 06:00:00', '2026-06-10 06:00:00', '', '2026-06-10 06:00:00', 'internal_test', '2026-06-10 06:00:00'),
  ('10005', 'stu10005', '$sha256$4ba603478054c191828542dc51291dc6131645a2691ba899f60944dda007e1bd', '', 'student', '测试号05', '/assets/images/avatars/user/B_kaoyan_avatar_01.webp', '90001005', 'active', '', '', '2026-06-10 06:00:00', '2026-06-10 06:00:00', '', '2026-06-10 06:00:00', 'internal_test', '2026-06-10 06:00:00'),
  ('10006', 'stu10006', '$sha256$dc7315e5c8cd223cbcd368a126d9045739ac3cd9f5dfdcc7338de111ab13a071', '', 'student', '测试号06', '/assets/images/avatars/user/B_kaoyan_avatar_03.webp', '90001006', 'active', '', '', '2026-06-10 06:00:00', '2026-06-10 06:00:00', '', '2026-06-10 06:00:00', 'internal_test', '2026-06-10 06:00:00'),
  ('10007', 'stu10007', '$sha256$ae4c98219d84f89fbe4d588fe0fb31b36ce7f4531ee3035a717c449458f5fa60', '', 'student', '测试号07', '/assets/images/avatars/user/B_kaoyan_avatar_05.webp', '90001007', 'active', '', '', '2026-06-10 06:00:00', '2026-06-10 06:00:00', '', '2026-06-10 06:00:00', 'internal_test', '2026-06-10 06:00:00'),
  ('10008', 'stu10008', '$sha256$d265ab25e908791074277fad311f9e2e1296fc458c25067b0a157870ad56a467', '', 'student', '测试号08', '/assets/images/avatars/user/B_kaoyan_avatar_07.webp', '90001008', 'active', '', '', '2026-06-10 06:00:00', '2026-06-10 06:00:00', '', '2026-06-10 06:00:00', 'internal_test', '2026-06-10 06:00:00'),
  ('10009', 'stu10009', '$sha256$1e1a0439cc4eff0e1f1c9620d2c578545c0591684a7234b6454451cba3d149da', '', 'student', '测试号09', '/assets/images/avatars/user/B_kaoyan_avatar_01.webp', '90001009', 'active', '', '', '2026-06-10 06:00:00', '2026-06-10 06:00:00', '', '2026-06-10 06:00:00', 'internal_test', '2026-06-10 06:00:00'),
  ('10010', 'stu10010', '$sha256$2b248a6e359d59517ffa4375b5b00ee874ff6c5686858725be4a7855cba766bd', '', 'student', '测试号10', '/assets/images/avatars/user/B_kaoyan_avatar_03.webp', '90001010', 'active', '', '', '2026-06-10 06:00:00', '2026-06-10 06:00:00', '', '2026-06-10 06:00:00', 'internal_test', '2026-06-10 06:00:00')
on conflict (user_id) do update set
  login_account = excluded.login_account,
  role = excluded.role,
  account_status = excluded.account_status,
  account_type = excluded.account_type,
  nickname = case when public.users.nickname = '' then excluded.nickname else public.users.nickname end,
  avatar_url = case when public.users.avatar_url = '' then excluded.avatar_url else public.users.avatar_url end,
  password_hash = case when public.users.password_hash = '' then excluded.password_hash else public.users.password_hash end,
  password_changed_at = case when public.users.password_changed_at = '' then excluded.password_changed_at else public.users.password_changed_at end,
  activated_at = case when public.users.activated_at = '' then excluded.activated_at else public.users.activated_at end,
  updated_at = excluded.updated_at;

insert into public.student_profiles (
  user_id, math_type, target_exam_year, target_exam_date, target_score,
  class_id, level, plan_enabled, paid_until, primary_book_1, primary_book_2,
  backup_book, current_type_id, current_stage, last_plan_date, created_at,
  updated_at, target_school_id, target_school_name, intensive_days,
  review_order, plan_variant_id, initial_start_chapter_id, diagnostic_json,
  primary_book_1_scope, primary_book_2_scope
) values
  ('10001', '数学二', '2026', '2026-12-19', '120', 'A201', 'A', '1', '2026-12-31', 'm2_880', 'm2_1000', 'm2_660', 'M2-QT-0001', '强化', '', '2026-06-10 06:00:00', '2026-06-10 06:00:00', '', '', '45', 'mixed', 'math2_mixed', '', '{}', 'both', 'both'),
  ('10002', '数学二', '2026', '2026-12-19', '120', 'B201', 'B', '1', '2026-12-31', 'm2_880', 'm2_1000', 'm2_660', 'M2-QT-0001', '强化', '', '2026-06-10 06:00:00', '2026-06-10 06:00:00', '', '', '60', 'mixed', 'math2_mixed', '', '{}', 'both', 'both'),
  ('10003', '数学二', '2026', '2026-12-19', '120', 'C201', 'C', '1', '2026-12-31', 'm2_880', 'm2_1000', 'm2_660', 'M2-QT-0001', '强化', '', '2026-06-10 06:00:00', '2026-06-10 06:00:00', '', '', '60', 'mixed', 'math2_mixed', '', '{}', 'both', 'both'),
  ('10004', '数学二', '2026', '2026-12-19', '120', 'D201', 'D', '1', '2026-12-31', 'm2_880', 'm2_1000', 'm2_660', 'M2-QT-0001', '强化', '', '2026-06-10 06:00:00', '2026-06-10 06:00:00', '', '', '75', 'mixed', 'math2_mixed', '', '{}', 'both', 'both'),
  ('10005', '数学二', '2026', '2026-12-19', '120', 'A201', 'A', '1', '2026-12-31', 'm2_880', 'm2_1000', 'm2_660', 'M2-QT-0001', '强化', '', '2026-06-10 06:00:00', '2026-06-10 06:00:00', '', '', '45', 'mixed', 'math2_mixed', '', '{}', 'both', 'both'),
  ('10006', '数学二', '2026', '2026-12-19', '120', 'B201', 'B', '1', '2026-12-31', 'm2_880', 'm2_1000', 'm2_660', 'M2-QT-0001', '强化', '', '2026-06-10 06:00:00', '2026-06-10 06:00:00', '', '', '60', 'mixed', 'math2_mixed', '', '{}', 'both', 'both'),
  ('10007', '数学二', '2026', '2026-12-19', '120', 'C201', 'C', '1', '2026-12-31', 'm2_880', 'm2_1000', 'm2_660', 'M2-QT-0001', '强化', '', '2026-06-10 06:00:00', '2026-06-10 06:00:00', '', '', '60', 'mixed', 'math2_mixed', '', '{}', 'both', 'both'),
  ('10008', '数学二', '2026', '2026-12-19', '120', 'D201', 'D', '1', '2026-12-31', 'm2_880', 'm2_1000', 'm2_660', 'M2-QT-0001', '强化', '', '2026-06-10 06:00:00', '2026-06-10 06:00:00', '', '', '75', 'mixed', 'math2_mixed', '', '{}', 'both', 'both'),
  ('10009', '数学二', '2026', '2026-12-19', '120', 'A201', 'A', '1', '2026-12-31', 'm2_880', 'm2_1000', 'm2_660', 'M2-QT-0001', '强化', '', '2026-06-10 06:00:00', '2026-06-10 06:00:00', '', '', '45', 'mixed', 'math2_mixed', '', '{}', 'both', 'both'),
  ('10010', '数学二', '2026', '2026-12-19', '120', 'B201', 'B', '1', '2026-12-31', 'm2_880', 'm2_1000', 'm2_660', 'M2-QT-0001', '强化', '', '2026-06-10 06:00:00', '2026-06-10 06:00:00', '', '', '60', 'mixed', 'math2_mixed', '', '{}', 'both', 'both')
on conflict (user_id) do update set
  math_type = excluded.math_type,
  class_id = excluded.class_id,
  level = excluded.level,
  plan_enabled = excluded.plan_enabled,
  paid_until = excluded.paid_until,
  primary_book_1 = excluded.primary_book_1,
  primary_book_2 = excluded.primary_book_2,
  backup_book = excluded.backup_book,
  current_type_id = excluded.current_type_id,
  current_stage = excluded.current_stage,
  intensive_days = excluded.intensive_days,
  review_order = excluded.review_order,
  plan_variant_id = excluded.plan_variant_id,
  primary_book_1_scope = excluded.primary_book_1_scope,
  primary_book_2_scope = excluded.primary_book_2_scope,
  updated_at = excluded.updated_at;

insert into public.student_progress (
  progress_id, user_id, math_type, plan_stage, current_type_id,
  current_type_sort_code, progress_status, current_type_status,
  last_generated_plan_date, last_completed_type_id, unfinished_type_id,
  unfinished_question_ids, carryover_type_id, carryover_question_ids,
  created_at, updated_at
) values
  ('PR-10001', '10001', '数学二', '强化', 'M2-QT-0001', '01-001', 'active', 'active', '', '', '', '[]', '', '[]', '2026-06-10 06:00:00', '2026-06-10 06:00:00'),
  ('PR-10002', '10002', '数学二', '强化', 'M2-QT-0001', '01-001', 'active', 'active', '', '', '', '[]', '', '[]', '2026-06-10 06:00:00', '2026-06-10 06:00:00'),
  ('PR-10003', '10003', '数学二', '强化', 'M2-QT-0001', '01-001', 'active', 'active', '', '', '', '[]', '', '[]', '2026-06-10 06:00:00', '2026-06-10 06:00:00'),
  ('PR-10004', '10004', '数学二', '强化', 'M2-QT-0001', '01-001', 'active', 'active', '', '', '', '[]', '', '[]', '2026-06-10 06:00:00', '2026-06-10 06:00:00'),
  ('PR-10005', '10005', '数学二', '强化', 'M2-QT-0001', '01-001', 'active', 'active', '', '', '', '[]', '', '[]', '2026-06-10 06:00:00', '2026-06-10 06:00:00'),
  ('PR-10006', '10006', '数学二', '强化', 'M2-QT-0001', '01-001', 'active', 'active', '', '', '', '[]', '', '[]', '2026-06-10 06:00:00', '2026-06-10 06:00:00'),
  ('PR-10007', '10007', '数学二', '强化', 'M2-QT-0001', '01-001', 'active', 'active', '', '', '', '[]', '', '[]', '2026-06-10 06:00:00', '2026-06-10 06:00:00'),
  ('PR-10008', '10008', '数学二', '强化', 'M2-QT-0001', '01-001', 'active', 'active', '', '', '', '[]', '', '[]', '2026-06-10 06:00:00', '2026-06-10 06:00:00'),
  ('PR-10009', '10009', '数学二', '强化', 'M2-QT-0001', '01-001', 'active', 'active', '', '', '', '[]', '', '[]', '2026-06-10 06:00:00', '2026-06-10 06:00:00'),
  ('PR-10010', '10010', '数学二', '强化', 'M2-QT-0001', '01-001', 'active', 'active', '', '', '', '[]', '', '[]', '2026-06-10 06:00:00', '2026-06-10 06:00:00')
on conflict (progress_id) do update set
  math_type = excluded.math_type,
  plan_stage = excluded.plan_stage,
  current_type_id = excluded.current_type_id,
  current_type_sort_code = excluded.current_type_sort_code,
  progress_status = excluded.progress_status,
  current_type_status = excluded.current_type_status,
  updated_at = excluded.updated_at;

create table if not exists public.daily_plans (
  plan_id text not null,
  user_id text not null,
  plan_date text not null,
  plan_status text not null default '',
  slogan text not null default '',
  exam_date text not null default '',
  days_to_exam text not null default '0',
  type_index text not null default '0',
  type_id text not null,
  type_name text not null default '',
  question_id text not null,
  source text not null default '',
  original_position_text text not null default '',
  question_order text not null default '0',
  feedback_open_status text not null default '',
  chapter_id text not null default '',
  student_type_sort_in_chapter text not null default '0',
  display_type_label text not null default '',
  is_chapter_boundary_after text not null default '0',
  created_at text not null default '',
  updated_at text not null default '',
  primary key (user_id, plan_date, type_id, question_id)
);

create index if not exists idx_daily_plans_user_date
  on public.daily_plans (user_id, plan_date);

create index if not exists idx_daily_plans_user_type
  on public.daily_plans (user_id, type_id);

alter table public.daily_plans
  add column if not exists chapter_id text not null default '',
  add column if not exists student_type_sort_in_chapter text not null default '0',
  add column if not exists display_type_label text not null default '',
  add column if not exists is_chapter_boundary_after text not null default '0';

create table if not exists public.question_feedbacks (
  feedback_id text primary key,
  plan_id text not null,
  user_id text not null,
  plan_date text not null,
  type_id text not null,
  question_id text not null,
  result text not null,
  is_wrong_record text not null default '0',
  is_unfinished_blocker text not null default '0',
  submitted_at text not null default '',
  created_at text not null default '',
  updated_at text not null default '',
  wrong_reason_code text not null default '',
  wrong_reason_name text not null default '',
  unattempted_action text not null default ''
);

create index if not exists idx_feedbacks_plan_user_type
  on public.question_feedbacks (plan_id, user_id, type_id);

create index if not exists idx_feedbacks_user_date_type
  on public.question_feedbacks (user_id, plan_date, type_id);

create index if not exists idx_feedbacks_user_reason
  on public.question_feedbacks (user_id, wrong_reason_code);

create table if not exists public.student_daily_activity (
  activity_id text primary key,
  user_id text not null,
  activity_date text not null,
  is_studied text not null default '0',
  intensity_level text not null default 'rest',
  target_minutes text not null default '0',
  completed_minutes text not null default '0',
  completed_questions text not null default '0',
  submitted_type_count text not null default '0',
  checkin_status text not null default '',
  created_at text not null default '',
  updated_at text not null default ''
);

create unique index if not exists idx_activity_user_date
  on public.student_daily_activity (user_id, activity_date);

create table if not exists public.student_weekly_targets (
  weekly_target_id text primary key,
  user_id text not null,
  week_start_date text not null,
  week_end_date text not null,
  basis_date text not null,
  target_days text not null default '0',
  target_question_count text not null default '0',
  target_type_count text not null default '0',
  basis_type_ids text not null default '[]',
  basis_note text not null default '',
  created_at text not null default '',
  updated_at text not null default ''
);

create unique index if not exists idx_weekly_targets_user_week
  on public.student_weekly_targets (user_id, week_start_date);

create table if not exists public.student_stats (
  user_id text not null,
  stat_date text not null,
  continuous_days text not null default '0',
  today_completion_rate text not null default '0',
  weekly_completion_rate text not null default '0',
  overall_accuracy text not null default '0',
  repeat_wrong_rate text not null default '0',
  current_badge_name text not null default '',
  next_badge_target text not null default '',
  badge_progress_value text not null default '0',
  badge_progress_rate text not null default '0',
  rank_in_class text not null default '',
  today_checkin_order text not null default '0',
  today_checkin_at text not null default '',
  weekly_study_days text not null default '0',
  updated_at text not null default '',
  primary key (user_id, stat_date)
);

create index if not exists idx_stats_date
  on public.student_stats (stat_date);

create table if not exists public.type_mastery_stats (
  mastery_id text primary key,
  user_id text not null,
  stat_date text not null,
  type_id text not null,
  type_name text not null default '',
  mastery_rate text not null default '0',
  status_tag text not null default '',
  submitted_question_count text not null default '0',
  wrong_question_count text not null default '0',
  sort_order text not null default '0',
  updated_at text not null default ''
);

create index if not exists idx_mastery_user_date
  on public.type_mastery_stats (user_id, stat_date);

create table if not exists public.loss_reason_stats (
  loss_reason_id text primary key,
  user_id text not null,
  stat_date text not null,
  reason_code text not null,
  reason_name text not null default '',
  reason_rate text not null default '0',
  wrong_question_count text not null default '0',
  sort_order text not null default '0',
  updated_at text not null default '',
  trend_delta text not null default '0'
);

create index if not exists idx_losses_user_date
  on public.loss_reason_stats (user_id, stat_date);

create table if not exists public.student_chapter_completions (
  completion_id text primary key,
  user_id text not null,
  raw_chapter_id text not null,
  chapter_name text not null default '',
  math_type text not null default '',
  plan_stage text not null default '',
  started_at text not null default '',
  completed_at text not null default '',
  spent_days text not null default '0',
  completed_type_count text not null default '0',
  total_type_count text not null default '0',
  submitted_question_count text not null default '0',
  wrong_question_count text not null default '0',
  accuracy_rate text not null default '0',
  main_loss_reasons text not null default '',
  review_type_ids text not null default '',
  review_type_names text not null default '',
  summary_template_id text not null default '',
  created_at text not null default '',
  updated_at text not null default ''
);

create index if not exists idx_chapter_completions_user_chapter
  on public.student_chapter_completions (user_id, raw_chapter_id, plan_stage);

create table if not exists public.study_rooms (
  room_id text primary key,
  room_name text not null,
  class_id text not null default '',
  math_type text not null default '',
  target_exam_year text not null default '',
  online_count text not null default '0',
  quiet_mode_enabled text not null default '0',
  room_rule text not null default '',
  created_at text not null default '',
  updated_at text not null default ''
);

alter table public.study_rooms
  add column if not exists class_id text not null default '';

create unique index if not exists idx_study_rooms_class_id
  on public.study_rooms (class_id)
  where class_id <> '';

insert into public.study_rooms (
  room_id, room_name, class_id, math_type, target_exam_year,
  online_count, quiet_mode_enabled, room_rule, created_at, updated_at
) values
  (
    'SR-M2-2026-A201',
    '26考研数学二A01班自习室',
    'A201',
    '数学二',
    '2026',
    '0',
    '1',
    '不闲聊、不刷屏、按计划专注自习',
    '2026-06-29 00:00:00',
    '2026-06-29 00:00:00'
  ),
  (
    'SR-M2-2026-B201',
    '26考研数学二B01班自习室',
    'B201',
    '数学二',
    '2026',
    '0',
    '1',
    '不闲聊、不刷屏、按计划专注自习',
    '2026-06-29 00:00:00',
    '2026-06-29 00:00:00'
  ),
  (
    'SR-M2-2026-C201',
    '26考研数学二C01班自习室',
    'C201',
    '数学二',
    '2026',
    '0',
    '1',
    '不闲聊、不刷屏、按计划专注自习',
    '2026-06-29 00:00:00',
    '2026-06-29 00:00:00'
  ),
  (
    'SR-M2-2026-D201',
    '26考研数学二D01班自习室',
    'D201',
    '数学二',
    '2026',
    '0',
    '1',
    '不闲聊、不刷屏、按计划专注自习',
    '2026-06-29 00:00:00',
    '2026-06-29 00:00:00'
  )
on conflict (room_id) do update set
  room_name = excluded.room_name,
  class_id = excluded.class_id,
  math_type = excluded.math_type,
  target_exam_year = excluded.target_exam_year,
  quiet_mode_enabled = excluded.quiet_mode_enabled,
  room_rule = excluded.room_rule,
  updated_at = excluded.updated_at;

create table if not exists public.student_study_goals (
  goal_id text not null,
  user_id text not null,
  study_date text not null,
  room_id text not null default '',
  target_minutes text not null default '0',
  completed_minutes text not null default '0',
  completion_rate text not null default '0',
  current_focus_minutes text not null default '0',
  current_task_type_id text not null default '',
  current_task_name text not null default '',
  focus_status text not null default 'idle',
  current_round_started_at text not null default '',
  created_at text not null default '',
  updated_at text not null default '',
  primary key (goal_id)
);

create index if not exists idx_goals_user_date
  on public.student_study_goals (user_id, study_date);

create table if not exists public.focus_sessions (
  session_id text primary key,
  user_id text not null,
  class_id text not null default '',
  plan_date text not null,
  task_type_id text not null default '',
  task_name text not null default '',
  target_minutes text not null default '0',
  started_at text not null default '',
  paused_at text not null default '',
  resumed_at text not null default '',
  ended_at text not null default '',
  focused_seconds text not null default '0',
  counted_minutes text not null default '0',
  status text not null default '',
  created_at text not null default '',
  updated_at text not null default ''
);

create index if not exists idx_focus_sessions_user_date
  on public.focus_sessions (user_id, plan_date);

create index if not exists idx_focus_sessions_status
  on public.focus_sessions (status);

create table if not exists public.study_room_members (
  room_member_id text primary key,
  room_id text not null,
  user_id text not null,
  online_status text not null default '',
  current_task_name text not null default '',
  focused_minutes_today text not null default '0',
  last_seen_at text not null default '',
  created_at text not null default '',
  updated_at text not null default ''
);

create index if not exists idx_room_members_room
  on public.study_room_members (room_id, online_status);

create table if not exists public.announcements (
  announcement_id text primary key,
  title text not null,
  content text not null default '',
  audience text not null default 'activated_students',
  status text not null default 'published',
  image_url text not null default '',
  image_filename text not null default '',
  image_original_name text not null default '',
  image_content_type text not null default '',
  image_size_bytes text not null default '0',
  created_by text not null default 'adm001',
  published_at text not null default '',
  hidden_at text not null default '',
  created_at text not null default '',
  updated_at text not null default ''
);

create index if not exists idx_announcements_status_published
  on public.announcements (status, published_at);

create table if not exists public.announcement_reads (
  announcement_id text not null,
  user_id text not null,
  read_at text not null default '',
  primary key (announcement_id, user_id)
);

create index if not exists idx_announcement_reads_user
  on public.announcement_reads (user_id, announcement_id);

create table if not exists public.admin_audit_logs (
  log_id text primary key,
  actor text not null default 'adm001',
  action text not null,
  target text not null default '',
  before_value text not null default '',
  after_value text not null default '',
  confirmed text not null default '1',
  created_at text not null default ''
);

create index if not exists idx_admin_audit_logs_created
  on public.admin_audit_logs (created_at);

create table if not exists public.formal_account_previews (
  preview_id text primary key,
  login_account text not null,
  initial_password_hash text not null,
  initial_password_plain text not null,
  status text not null,
  admin_user_id text not null,
  expires_at text not null,
  activated_user_id text not null default '',
  created_at text not null default '',
  updated_at text not null default ''
);

create index if not exists idx_formal_preview_account
  on public.formal_account_previews (login_account);

create index if not exists idx_formal_preview_status
  on public.formal_account_previews (status, expires_at);

create table if not exists public.admin_totp_state (
  admin_user_id text not null,
  formal_activations_since_totp text not null default '0',
  totp_secret text not null default '',
  totp_bound_at text not null default '',
  setup_token_hash text not null default '',
  setup_token_expires_at text not null default '',
  last_verified_at text not null default '',
  updated_at text not null default '',
  primary key (admin_user_id)
);

alter table public.admin_totp_state
  add column if not exists totp_bound_at text not null default '',
  add column if not exists setup_token_hash text not null default '',
  add column if not exists setup_token_expires_at text not null default '';

insert into public.admin_totp_state (
  admin_user_id, formal_activations_since_totp, totp_secret,
  totp_bound_at, setup_token_hash, setup_token_expires_at,
  last_verified_at, updated_at
) values (
  'adm001',
  '0',
  '',
  '',
  '',
  '',
  '',
  '2026-06-30 00:00:00'
)
on conflict (admin_user_id) do nothing;

create table if not exists public.system_messages (
  message_key text primary key,
  message_text text not null,
  description text not null default '',
  updated_at text not null default ''
);

-- This table is seeded with public data, then managed at runtime by the admin
-- intake settings screen. Keep a superset of public-import and runtime columns.
create table if not exists public.class_intake_settings (
  setting_id text,
  math_type text not null,
  level text not null,
  active_class_id text not null default '',
  is_active boolean not null default true,
  status text not null default '',
  updated_by text not null default 'system',
  updated_at text not null default '',
  note text,
  created_at text not null default '',
  imported_at text,
  import_source text,
  primary key (math_type, level)
);

do $$
declare
  pk_name text;
  pk_columns text[];
begin
  alter table public.class_intake_settings add column if not exists setting_id text;
  alter table public.class_intake_settings add column if not exists status text not null default '';
  alter table public.class_intake_settings add column if not exists updated_by text not null default 'system';
  alter table public.class_intake_settings add column if not exists updated_at text not null default '';

  select
    con.conname,
    array_agg(att.attname order by cols.ordinality)
  into pk_name, pk_columns
  from pg_constraint con
  join unnest(con.conkey) with ordinality as cols(attnum, ordinality) on true
  join pg_attribute att
    on att.attrelid = con.conrelid
   and att.attnum = cols.attnum
  where con.conrelid = 'public.class_intake_settings'::regclass
    and con.contype = 'p'
  group by con.conname;

  if pk_name is not null and pk_columns <> array['math_type', 'level'] then
    execute format('alter table public.class_intake_settings drop constraint %I', pk_name);
    pk_name := null;
  end if;

  begin
    alter table public.class_intake_settings alter column setting_id drop not null;
  exception
    when undefined_column then
      null;
  end;

  if pk_name is null then
    alter table public.class_intake_settings add primary key (math_type, level);
  end if;
end $$;

create unique index if not exists idx_class_intake_settings_setting_id
  on public.class_intake_settings (setting_id);

commit;

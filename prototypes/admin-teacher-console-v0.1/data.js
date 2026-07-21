window.CONSOLE_DATA = {
  today: "2026-06-22",
  servicePolicy: {
    renewalDays: 30,
    soonDueDays: 7,
    trialExcludedFromSoonDue: true
  },
  accountPool: {
    testRange: { start: "stu10001", end: "stu10010" },
    experienceRange: { start: "stu10011", end: "stu39999" },
    trialConversionFormalRange: { start: "stu40001", end: "stu59999" },
    formalRange: { start: "stu60001", end: "stu99999" },
    nextFormalAccount: "stu61001",
    labels: {
      trial: "短期号",
      formal: "正式号",
      internal_test: "测试号"
    }
  },
  securityPolicy: {
    adminTotpRequired: true,
    totpDemoCode: "123456",
    riskAuthorizationMinutes: 10,
    studentSandboxEnabled: false,
    hiddenConsolePathExample: "/console-aiduxue-8391"
  },
  currentUsers: {
    admin: {
      userId: "adm001",
      loginAccount: "adm001",
      nickname: "管理员",
      role: "admin",
      title: "全局运营管理员"
    },
    teacher: {
      userId: "tea001",
      loginAccount: "tea001",
      nickname: "王老师",
      role: "teacher",
      title: "数学二 A/B 班负责老师"
    }
  },
  nav: {
    admin: [
      ["overview", "运营总览"],
      ["accounts", "账号总览"],
      ["teachers", "老师管理"],
      ["classes", "班级管理"],
      ["students", "学生管理"],
      ["activation", "账号开通"],
      ["shortTerm", "短期账号"],
      ["expiry", "到期处理"],
      ["renewals", "续费提醒"],
      ["abnormal", "异常处理"],
      ["feedback", "今日反馈"],
      ["announcements", "信息发布"],
      ["intake", "分班配置"],
      ["audit", "操作日志"],
      ["data", "数据字典"],
      ["landing", "落地步骤"]
    ],
    teacher: [
      ["teacherToday", "今日提醒"],
      ["teacherLookup", "学生信息"],
      ["teacherClasses", "我的班级"],
      ["teacherPassword", "修改信息"]
    ]
  },
  teachers: [
    {
      userId: "tea001",
      loginAccount: "tea001",
      nickname: "王老师",
      status: "active",
      contactQQ: "2655001001",
      classes: ["A201", "B201"],
      lastLoginAt: "2026-06-22 08:12"
    },
    {
      userId: "tea002",
      loginAccount: "tea002",
      nickname: "李老师",
      status: "active",
      contactQQ: "2655001002",
      classes: ["A202", "B202"],
      lastLoginAt: "2026-06-22 08:45"
    },
    {
      userId: "tea003",
      loginAccount: "tea003",
      nickname: "周老师",
      status: "active",
      contactQQ: "2655001003",
      classes: ["C201", "D201"],
      lastLoginAt: "2026-06-21 21:18"
    },
    {
      userId: "tea004",
      loginAccount: "tea004",
      nickname: "赵老师",
      status: "disabled",
      contactQQ: "2655001004",
      classes: [],
      lastLoginAt: "2026-06-10 16:20"
    }
  ],
  classes: [
    {
      classId: "A201",
      className: "26考研数学二A01班",
      mathType: "数学二",
      level: "A",
      teacherId: "tea001",
      qqGroupNumber: "783210451",
      capacity: 60,
      activeStudents: 48,
      isTestClass: false,
      isAcceptingNewStudents: true
    },
    {
      classId: "A202",
      className: "26考研数学二A02班",
      mathType: "数学二",
      level: "A",
      teacherId: "tea002",
      qqGroupNumber: "783210452",
      capacity: 60,
      activeStudents: 12,
      isTestClass: false,
      isAcceptingNewStudents: false
    },
    {
      classId: "B201",
      className: "26考研数学二B01班",
      mathType: "数学二",
      level: "B",
      teacherId: "tea001",
      qqGroupNumber: "783210461",
      capacity: 60,
      activeStudents: 42,
      isTestClass: false,
      isAcceptingNewStudents: true
    },
    {
      classId: "B202",
      className: "26考研数学二B02班",
      mathType: "数学二",
      level: "B",
      teacherId: "tea002",
      qqGroupNumber: "783210462",
      capacity: 60,
      activeStudents: 9,
      isTestClass: false,
      isAcceptingNewStudents: false
    },
    {
      classId: "C201",
      className: "26考研数学二C01班",
      mathType: "数学二",
      level: "C",
      teacherId: "tea003",
      qqGroupNumber: "783210471",
      capacity: 50,
      activeStudents: 31,
      isTestClass: false,
      isAcceptingNewStudents: true
    },
    {
      classId: "TEST201",
      className: "测试班",
      mathType: "数学二",
      level: "T",
      teacherId: "tea003",
      qqGroupNumber: "700000001",
      capacity: 20,
      activeStudents: 5,
      isTestClass: true,
      isAcceptingNewStudents: false
    }
  ],
  questionTypeOptions: [
    ["G-01-01", "函数极限概念辨析"],
    ["G-01-02", "无穷小与等价无穷小"],
    ["G-01-03", "极限计算"],
    ["G-01-04", "极限存在准则"],
    ["G-02-01", "连续与间断点"],
    ["G-03-02", "导数定义与几何意义"],
    ["G-03-05", "一元函数微分法"],
    ["G-03-08", "导数应用"],
    ["G-04-01", "不定积分基础"]
  ],
  students: [
    {
      userId: "stu10010",
      loginAccount: "stu10010",
      nickname: "测试10",
      avatarUrl: "../student-mobile-v2.1/assets/images/avatars/user/B_kaoyan_avatar_01.webp",
      contactQQ: "248100101",
      accountType: "internal_test",
      dataMode: "persistent",
      accountStatus: "active",
      classId: "TEST201",
      mathType: "数学二",
      level: "T",
      targetScore: 125,
      primaryBooks: ["880", "1000"],
      backupBook: "660",
      paidUntil: "2026-06-21",
      activatedAt: "2026-06-15 09:30",
      trialExpiresAt: "",
      everActivated: true,
      todayStatus: "abnormal",
      planStatus: "expired",
      openTypeName: "导数定义与几何意义",
      submittedTypes: 0,
      totalTypes: 4,
      unfinishedCount: 0,
      currentTypeId: "G-03-02",
      flags: ["测试号"]
    },
    {
      userId: "stu10011",
      loginAccount: "stu10011",
      nickname: "林同学",
      avatarUrl: "../student-mobile-v2.1/assets/images/avatars/user/G_kaoyan_avatar_02.webp",
      contactQQ: "248100103",
      accountType: "trial",
      dataMode: "persistent",
      accountStatus: "expired_pending_review",
      classId: "A201",
      mathType: "数学二",
      level: "A",
      targetScore: 128,
      primaryBooks: ["880", "1000"],
      backupBook: "660",
      paidUntil: "2026-06-21",
      activatedAt: "2026-06-15 10:05",
      trialExpiresAt: "2026-06-22 10:05",
      everActivated: true,
      todayStatus: "abnormal",
      planStatus: "expired",
      openTypeName: "一元函数微分法",
      submittedTypes: 1,
      totalTypes: 4,
      unfinishedCount: 0,
      currentTypeId: "G-03-05",
      flags: ["短期号到期", "待管理员转正式"]
    },
    {
      userId: "stu10012",
      loginAccount: "stu10012",
      nickname: "许同学",
      avatarUrl: "../student-mobile-v2.1/assets/images/avatars/user/B_kaoyan_avatar_03.webp",
      contactQQ: "248100118",
      accountType: "trial",
      dataMode: "persistent",
      accountStatus: "active",
      classId: "A201",
      mathType: "数学二",
      level: "A",
      targetScore: 120,
      primaryBooks: ["880"],
      backupBook: "660",
      paidUntil: "2026-06-28",
      activatedAt: "2026-06-21 13:00",
      trialExpiresAt: "2026-06-28 13:00",
      everActivated: true,
      todayStatus: "unsubmitted",
      planStatus: "in_progress",
      openTypeName: "极限存在准则",
      submittedTypes: 0,
      totalTypes: 4,
      unfinishedCount: 0,
      currentTypeId: "G-01-04",
      flags: []
    },
    {
      userId: "stu60001",
      loginAccount: "stu60001",
      nickname: "张同学",
      avatarUrl: "../student-mobile-v2.1/assets/images/avatars/user/B_kaoyan_avatar_05.webp",
      contactQQ: "248100129",
      accountType: "formal",
      dataMode: "persistent",
      accountStatus: "active",
      classId: "A201",
      mathType: "数学二",
      level: "A",
      targetScore: 132,
      primaryBooks: ["880", "1000"],
      backupBook: "660",
      paidUntil: "2026-12-31",
      activatedAt: "2026-06-18 11:00",
      trialExpiresAt: "",
      everActivated: true,
      todayStatus: "completed",
      planStatus: "completed",
      openTypeName: "",
      submittedTypes: 4,
      totalTypes: 4,
      unfinishedCount: 0,
      currentTypeId: "G-04-01",
      manualNextTypeId: "",
      flags: []
    },
    {
      userId: "stu60002",
      loginAccount: "stu60002",
      nickname: "周同学",
      avatarUrl: "../student-mobile-v2.1/assets/images/avatars/user/G_kaoyan_avatar_04.webp",
      contactQQ: "248100141",
      accountType: "formal",
      dataMode: "persistent",
      accountStatus: "active",
      classId: "A201",
      mathType: "数学二",
      level: "A",
      targetScore: 118,
      primaryBooks: ["880"],
      backupBook: "660",
      paidUntil: "2026-12-31",
      activatedAt: "2026-06-19 09:00",
      trialExpiresAt: "",
      everActivated: true,
      todayStatus: "unfinished",
      planStatus: "blocked_by_unfinished",
      openTypeName: "导数应用",
      submittedTypes: 2,
      totalTypes: 4,
      unfinishedCount: 3,
      currentTypeId: "G-03-08",
      flags: ["未作遗留"]
    },
    {
      userId: "stu60003",
      loginAccount: "stu60003",
      nickname: "黄同学",
      avatarUrl: "../student-mobile-v2.1/assets/images/avatars/user/B_kaoyan_avatar_07.webp",
      contactQQ: "",
      accountType: "formal",
      dataMode: "persistent",
      accountStatus: "active",
      classId: "A201",
      mathType: "数学二",
      level: "A",
      targetScore: 116,
      primaryBooks: ["1000"],
      backupBook: "660",
      paidUntil: "2026-12-31",
      activatedAt: "2026-06-20 08:40",
      trialExpiresAt: "",
      everActivated: true,
      todayStatus: "abnormal",
      planStatus: "in_progress",
      openTypeName: "一元函数微分法",
      submittedTypes: 0,
      totalTypes: 4,
      unfinishedCount: 0,
      currentTypeId: "G-03-05",
      flags: ["缺少个人QQ"]
    },
    {
      userId: "stu60004",
      loginAccount: "stu60004",
      nickname: "吴同学",
      avatarUrl: "../student-mobile-v2.1/assets/images/avatars/user/G_kaoyan_avatar_06.webp",
      contactQQ: "248100151",
      accountType: "formal",
      dataMode: "persistent",
      accountStatus: "active",
      classId: "B201",
      mathType: "数学二",
      level: "B",
      targetScore: 110,
      primaryBooks: ["880"],
      backupBook: "660",
      paidUntil: "2026-06-24",
      activatedAt: "2026-06-17 14:22",
      trialExpiresAt: "",
      everActivated: true,
      todayStatus: "unsubmitted",
      planStatus: "in_progress",
      openTypeName: "函数极限计算",
      submittedTypes: 0,
      totalTypes: 3,
      unfinishedCount: 0,
      currentTypeId: "G-01-02",
      flags: []
    },
    {
      userId: "stu60005",
      loginAccount: "stu60005",
      nickname: "宋同学",
      avatarUrl: "../student-mobile-v2.1/assets/images/avatars/user/B_kaoyan_avatar_13.webp",
      contactQQ: "248100163",
      accountType: "formal",
      dataMode: "persistent",
      accountStatus: "active",
      classId: "B201",
      mathType: "数学二",
      level: "B",
      targetScore: 108,
      primaryBooks: ["880", "660"],
      backupBook: "1000",
      paidUntil: "2026-06-29",
      activatedAt: "2026-06-12 10:12",
      trialExpiresAt: "",
      everActivated: true,
      todayStatus: "completed",
      planStatus: "completed",
      openTypeName: "",
      submittedTypes: 3,
      totalTypes: 3,
      unfinishedCount: 0,
      currentTypeId: "G-02-01",
      flags: []
    },
    {
      userId: "stu60006",
      loginAccount: "stu60006",
      nickname: "郑同学",
      avatarUrl: "../student-mobile-v2.1/assets/images/avatars/user/G_kaoyan_avatar_08.webp",
      contactQQ: "248100177",
      accountType: "formal",
      dataMode: "persistent",
      accountStatus: "active",
      classId: "B201",
      mathType: "数学二",
      level: "B",
      targetScore: 112,
      primaryBooks: ["1000"],
      backupBook: "660",
      paidUntil: "2026-12-31",
      activatedAt: "2026-06-13 10:12",
      trialExpiresAt: "",
      everActivated: true,
      todayStatus: "unfinished",
      planStatus: "blocked_by_unfinished",
      openTypeName: "极限计算",
      submittedTypes: 1,
      totalTypes: 3,
      unfinishedCount: 2,
      currentTypeId: "G-01-03",
      flags: ["未作遗留"]
    },
    {
      userId: "stu60007",
      loginAccount: "stu60007",
      nickname: "马同学",
      avatarUrl: "../student-mobile-v2.1/assets/images/avatars/user/B_kaoyan_avatar_16.webp",
      contactQQ: "248100188",
      accountType: "formal",
      dataMode: "persistent",
      accountStatus: "active",
      classId: "B201",
      mathType: "数学二",
      level: "B",
      targetScore: 105,
      primaryBooks: ["880"],
      backupBook: "660",
      paidUntil: "2026-06-01",
      activatedAt: "2026-06-11 17:30",
      trialExpiresAt: "",
      everActivated: true,
      todayStatus: "abnormal",
      planStatus: "service_expired",
      openTypeName: "",
      submittedTypes: 0,
      totalTypes: 0,
      unfinishedCount: 0,
      currentTypeId: "G-01-01",
      flags: ["服务期已过"]
    },
    {
      userId: "stu60008",
      loginAccount: "stu60008",
      nickname: "顾同学",
      avatarUrl: "../student-mobile-v2.1/assets/images/avatars/user/G_kaoyan_avatar_10.webp",
      contactQQ: "248100199",
      accountType: "formal",
      dataMode: "persistent",
      accountStatus: "active",
      classId: "A202",
      mathType: "数学二",
      level: "A",
      targetScore: 130,
      primaryBooks: ["880", "1000"],
      backupBook: "660",
      paidUntil: "2026-12-31",
      activatedAt: "2026-06-20 12:00",
      trialExpiresAt: "",
      everActivated: true,
      todayStatus: "unsubmitted",
      planStatus: "in_progress",
      openTypeName: "连续性与间断点",
      submittedTypes: 0,
      totalTypes: 4,
      unfinishedCount: 0,
      currentTypeId: "G-01-08",
      flags: []
    },
    {
      userId: "stu60009",
      loginAccount: "stu60009",
      nickname: "何同学",
      avatarUrl: "../student-mobile-v2.1/assets/images/avatars/user/B_kaoyan_avatar_18.webp",
      contactQQ: "248100211",
      accountType: "formal",
      dataMode: "persistent",
      accountStatus: "active",
      classId: "C201",
      mathType: "数学二",
      level: "C",
      targetScore: 96,
      primaryBooks: ["660"],
      backupBook: "880",
      paidUntil: "2026-12-31",
      activatedAt: "2026-06-16 12:00",
      trialExpiresAt: "",
      everActivated: true,
      todayStatus: "completed",
      planStatus: "completed",
      openTypeName: "",
      submittedTypes: 2,
      totalTypes: 2,
      unfinishedCount: 0,
      currentTypeId: "G-01-06",
      flags: []
    },
    {
      userId: "stu10004",
      loginAccount: "stu10004",
      nickname: "测试A",
      avatarUrl: "../student-mobile-v2.1/assets/images/avatars/user/B_kaoyan_avatar_24.webp",
      contactQQ: "200000004",
      accountType: "internal_test",
      dataMode: "persistent",
      accountStatus: "active",
      classId: "TEST201",
      mathType: "数学二",
      level: "T",
      targetScore: 120,
      primaryBooks: ["880"],
      backupBook: "660",
      paidUntil: "2026-06-26",
      activatedAt: "2026-06-01 09:00",
      trialExpiresAt: "",
      everActivated: true,
      todayStatus: "completed",
      planStatus: "completed",
      openTypeName: "",
      submittedTypes: 3,
      totalTypes: 3,
      unfinishedCount: 0,
      currentTypeId: "G-02-01",
      flags: ["测试班"]
    },
    {
      userId: "stu10001",
      loginAccount: "stu10001",
      nickname: "测试01",
      avatarUrl: "../student-mobile-v2.1/assets/images/avatars/user/G_kaoyan_avatar_12.webp",
      contactQQ: "",
      accountType: "internal_test",
      dataMode: "persistent",
      accountStatus: "active",
      classId: "TEST201",
      mathType: "数学二",
      level: "T",
      targetScore: 120,
      primaryBooks: ["880", "1000"],
      backupBook: "660",
      paidUntil: "2026-06-26",
      activatedAt: "2026-06-01 09:00",
      trialExpiresAt: "",
      everActivated: true,
      todayStatus: "unsubmitted",
      planStatus: "in_progress",
      openTypeName: "测试题型",
      submittedTypes: 0,
      totalTypes: 4,
      unfinishedCount: 0,
      currentTypeId: "G-01-01",
      flags: ["测试号"]
    }
  ],
  availableAccounts: [
    {
      loginAccount: "stu10013",
      accountType: "trial",
      accountStatus: "disabled",
      dataMode: "persistent",
      everActivated: false,
      recommendedUse: "预留短期号"
    },
    {
      loginAccount: "stu10014",
      accountType: "trial",
      accountStatus: "disabled",
      dataMode: "persistent",
      everActivated: false,
      recommendedUse: "预留短期号"
    }
  ],
  intakeSettings: [
    ["数学一", "A", "A101", "未建班", "adm001", "2026-06-21 20:00"],
    ["数学一", "B", "B101", "未建班", "adm001", "2026-06-21 20:00"],
    ["数学一", "C", "C101", "未建班", "adm001", "2026-06-21 20:00"],
    ["数学一", "D", "D101", "未建班", "adm001", "2026-06-21 20:00"],
    ["数学二", "A", "A201", "正常接收", "adm001", "2026-06-22 09:40"],
    ["数学二", "B", "B201", "正常接收", "adm001", "2026-06-22 09:40"],
    ["数学二", "C", "C201", "正常接收", "adm001", "2026-06-22 09:40"],
    ["数学二", "D", "D201", "待建班", "adm001", "2026-06-22 09:40"],
    ["数学三", "A", "A301", "未建班", "adm001", "2026-06-21 20:00"],
    ["数学三", "B", "B301", "未建班", "adm001", "2026-06-21 20:00"],
    ["数学三", "C", "C301", "未建班", "adm001", "2026-06-21 20:00"],
    ["数学三", "D", "D301", "未建班", "adm001", "2026-06-21 20:00"]
  ],
  auditLogs: [
    {
      time: "2026-06-22 10:05",
      actor: "adm001",
      action: "activate_trial",
      target: "stu10011",
      before: "disabled",
      after: "active, trial_expires_at=2026-06-29 10:05",
      confirmed: true
    },
    {
      time: "2026-06-22 09:40",
      actor: "adm001",
      action: "update_intake_class",
      target: "数学二+A",
      before: "A202",
      after: "A201",
      confirmed: true
    },
    {
      time: "2026-06-21 18:16",
      actor: "adm001",
      action: "reset_password",
      target: "stu60002",
      before: "password_hash=old",
      after: "password_hash=reset",
      confirmed: true
    },
    {
      time: "2026-06-20 16:22",
      actor: "adm001",
      action: "change_student_class",
      target: "stu60004",
      before: "A201",
      after: "B201",
      confirmed: true
    }
  ],
  dataDictionary: [
    {
      table: "users",
      owner: "账号与权限",
      purpose: "统一保存学生、老师、管理员账号，登录后按 role 分流。",
      fields: ["user_id", "login_account", "password_hash", "role", "nickname", "contact_qq/QQ", "account_type", "data_mode", "account_status", "activated_at", "trial_expires_at", "ever_activated"]
    },
    {
      table: "user_sessions",
      owner: "登录会话",
      purpose: "保存登录 token、设备、过期和失效状态。",
      fields: ["session_id", "user_id", "refresh_token_hash", "device_id", "ip_address", "expires_at", "revoked_at"]
    },
    {
      table: "classes",
      owner: "班级配置",
      purpose: "定义班级、老师权限边界、QQ群号、容量、是否测试班。",
      fields: ["class_id", "class_name", "math_type", "level", "teacher_user_id", "qq_group_number", "capacity", "is_test_class", "is_accepting_new_students"]
    },
    {
      table: "class_intake_settings",
      owner: "招生分班",
      purpose: "决定新学生首次填写资料后进入哪个班。",
      fields: ["math_type", "level", "active_class_id", "updated_by", "updated_at"]
    },
    {
      table: "student_profiles",
      owner: "学生资料",
      purpose: "保存学生业务资料、班级、目标分、习题册和服务期。",
      fields: ["user_id", "math_type", "target_score", "class_id", "level", "plan_enabled", "paid_until", "primary_book_1", "primary_book_2", "backup_book"]
    },
    {
      table: "student_progress",
      owner: "学习进度",
      purpose: "保存学生学到哪里、未作遗留、最近生成计划日期。",
      fields: ["user_id", "current_type_id", "manual_next_type_id", "progress_status", "last_generated_plan_date", "unfinished_type_id", "unfinished_question_ids"]
    },
    {
      table: "daily_plans",
      owner: "每日计划",
      purpose: "保存某学生某天看到的计划快照，一题一行。",
      fields: ["plan_id", "user_id", "plan_date", "plan_status", "type_id", "type_name", "question_id", "feedback_open_status"]
    },
    {
      table: "question_feedbacks",
      owner: "反馈记录",
      purpose: "记录正确、错误、未作、错因和是否阻断后续计划。",
      fields: ["feedback_id", "plan_id", "user_id", "plan_date", "type_id", "question_id", "result", "wrong_reason_code", "is_unfinished_blocker"]
    },
    {
      table: "student_stats",
      owner: "统计快照",
      purpose: "让排行榜、我的页面、教师提醒台快速读取统计结果。",
      fields: ["user_id", "stat_date", "continuous_days", "today_completion_rate", "weekly_completion_rate", "rank_in_class", "today_checkin_order"]
    },
    {
      table: "account_audit_logs",
      owner: "审计",
      purpose: "记录开通、停用、重置密码、改班、清理、迁移等危险操作。",
      fields: ["audit_id", "actor_user_id", "action_type", "target_user_id", "before_json", "after_json", "confirmed", "created_at"]
    },
    {
      table: "account_migrations",
      owner: "短期号转正式",
      purpose: "记录七天短期体验号复制到正式账号的事务结果。",
      fields: ["migration_id", "source_user_id", "target_user_id", "status", "migrated_table_names", "admin_user_id", "completed_at"]
    }
  ],
  apiGroups: [
    {
      group: "登录与身份",
      apis: ["POST /auth/login", "GET /auth/me", "POST /auth/logout"]
    },
    {
      group: "教师端",
      apis: ["GET /teacher/classes", "GET /teacher/classes/{class_id}/daily-feedback-status?date=YYYY-MM-DD", "GET /teacher/students/{student_id}/daily-status?date=YYYY-MM-DD"]
    },
    {
      group: "管理员账号",
      apis: [
        "GET /admin/accounts",
        "GET /admin/accounts/{user_id}",
        "POST /admin/accounts/{user_id}/activate",
        "POST /admin/accounts/{user_id}/disable",
        "POST /admin/accounts/{user_id}/reset-password",
        "GET /admin/formal-accounts/next-preview",
        "POST /admin/formal-accounts/next-preview/refresh",
        "POST /admin/formal-accounts/activate-next"
      ]
    },
    {
      group: "管理员基础资料",
      apis: ["GET /admin/teachers", "POST /admin/teachers", "GET /admin/classes", "PATCH /admin/classes/{class_id}", "GET /admin/students", "PATCH /admin/students/{student_id}"]
    },
    {
      group: "高风险运营",
      apis: ["GET /admin/experience-accounts/expired", "POST /admin/experience-accounts/{student_id}/migrate-to-formal", "GET /admin/audit-logs"]
    },
    {
      group: "信息发布",
      apis: [
        "GET /admin/announcements",
        "POST /admin/announcements",
        "POST /admin/announcements/{announcement_id}/hide",
        "GET /students/{user_id}/notifications/status",
        "GET /students/{user_id}/notifications",
        "POST /students/{user_id}/notifications/read-all"
      ]
    },
    {
      group: "分班配置",
      apis: ["GET /admin/class-intake-settings", "PATCH /admin/class-intake-settings/{math_type}/{level}"]
    }
  ],
  actionFlows: {
    add_teacher: {
      title: "新增老师账号",
      body: "创建老师账号后，管理员再为老师分配负责班级。第一版建议不要让老师自行注册。",
      primaryLabel: "创建老师",
      auditAction: "create_teacher",
      riskLevel: "high",
      successMessage: "已创建老师账号",
      fields: [
        ["登录账号", "tea005"],
        ["老师昵称", "新老师"],
        ["联系 QQ", "2655001005"]
      ]
    },
    assign_teacher_class: {
      title: "分配负责班级",
      body: "为老师分配一个或多个启用班级。真实上线后需要同步刷新教师端权限缓存。",
      primaryLabel: "确认分配",
      auditAction: "assign_teacher_class",
      riskLevel: "high",
      successMessage: "已分配班级",
      fields: [
        ["目标班级", "可多选启用班级"],
        ["权限范围", "只允许查看负责班级学生"]
      ]
    },
    modify_teacher_status: {
      title: "修改老师状态",
      body: "启用老师可以停用；停用老师可以启用；删除老师真实上线建议先校验是否仍负责班级。",
      primaryLabel: "确认修改",
      auditAction: "modify_teacher_status",
      successMessage: "已修改老师状态",
      danger: true,
      riskLevel: "high",
      fields: [
        ["状态操作", "停用 / 启用 / 删除"],
        ["保护规则", "删除前应先确认负责班级已转交"]
      ]
    },
    reset_teacher_password: {
      title: "重置老师密码",
      body: "重置后需要让老师下次登录修改密码，并让旧会话失效。",
      primaryLabel: "确认重置",
      auditAction: "reset_teacher_password",
      successMessage: "已重置老师密码",
      danger: true,
      riskLevel: "high",
      fields: [
        ["默认密码", "由后端生成一次性密码"],
        ["会话处理", "撤销该老师全部旧 session"]
      ]
    },
    add_class: {
      title: "新增班级",
      body: "新增班级需要设置数学类型、班型、QQ群、容量和负责老师。保存后可设为接收新生班级。",
      primaryLabel: "创建班级",
      auditAction: "create_class",
      successMessage: "已模拟新增班级",
      fields: [
        ["班级编号", "D201"],
        ["负责老师", "周老师"],
        ["容量", "50"]
      ]
    },
    edit_class: {
      title: "编辑班级配置",
      body: "班级编号不建议修改；可调整名称、QQ群、容量、是否接收新生和负责老师。",
      primaryLabel: "保存班级",
      auditAction: "update_class",
      successMessage: "已模拟保存班级配置",
      fields: [
        ["QQ群", "783210451"],
        ["接收新生", "是"],
        ["容量", "60"]
      ]
    },
    export_students: {
      title: "批量导出学生",
      body: "导出当前筛选下的学生资料和学习状态。正式数据导出要记录操作人、时间、筛选条件和文件哈希。",
      primaryLabel: "生成导出文件",
      auditAction: "export_students",
      successMessage: "已模拟生成学生导出文件",
      riskLevel: "high",
      fields: [
        ["导出范围", "当前学生列表筛选结果"],
        ["敏感字段", "QQ、服务期、班级、目标分"]
      ]
    },
    save_student: {
      title: "保存学生资料修改",
      body: "允许管理员修改学生班级、班型、目标分、联系 QQ、习题册和服务期。确认前请核对下方修改后内容。",
      primaryLabel: "保存修改",
      auditAction: "update_student_profile",
      successMessage: "已保存学生资料",
      riskLevel: "high",
      fields: [
        ["班级", "A201"],
        ["目标分", "132"],
        ["服务期", "2026-12-31"]
      ]
    },
    reset_student_password: {
      title: "重置学生密码",
      body: "重置密码属于高敏操作，需要二次确认并使旧登录态失效。",
      primaryLabel: "确认重置",
      auditAction: "reset_student_password",
      successMessage: "已模拟重置学生密码",
      danger: true,
      riskLevel: "high",
      fields: [
        ["新密码", "后端生成一次性密码"],
        ["通知方式", "管理员线下发送给学生"]
      ]
    },
    activate_account: {
      title: "开通正式号",
      body: "正式账号只按账号池指针递增开通。页面展示下一个可开通正式号，管理员点击后直接开通该账号并把指针后移一位。",
      primaryLabel: "确认开通正式号",
      auditAction: "activate_account",
      successMessage: "已模拟开通正式号",
      danger: false,
      fields: [
        ["账号类型", "正式号"],
        ["初始状态", "active"],
        ["开通顺序", "从 next_formal_account 指针取号"]
      ]
    },
    activate_short_term_account: {
      title: "开通短期号",
      body: "短期账号从短期号池取下一个未使用账号，默认有效 7 天，到期后 3 天内仍显示在短期号列表。",
      primaryLabel: "确认开通短期号",
      auditAction: "activate_short_term_account",
      successMessage: "已模拟开通短期号",
      danger: false,
      fields: [
        ["账号类型", "短期号"],
        ["有效期", "7 天"],
        ["过期保留", "到期后 3 天内仍显示"]
      ]
    },
    migrate_trial: {
      title: "短期号转正式",
      body: "把到期七天短期体验号的学习数据和 password_hash 复制到短期转正式目标池的下一个未使用账号。该池为 stu40001-stu59999，不占用直接开通正式号池。",
      primaryLabel: "确认转正式",
      auditAction: "migrate_experience_to_formal",
      successMessage: "已模拟短期号转正式",
      danger: true,
      riskLevel: "high",
      fields: [
        ["来源账号", "当前短期学生"],
        ["目标正式号", "短期转正式目标池 stu40001+"],
        ["事务要求", "复制成功后来源短期号不可继续登录"]
      ]
    },
    view_trial: {
      title: "查看短期账号详情",
      body: "查看七天短期体验学生的到期状态、学习进度和默认转正式目标。",
      primaryLabel: "查看明细",
      auditAction: "view_trial_detail",
      successMessage: "已模拟打开短期号详情",
      fields: [
        ["学习数据", "计划、反馈、统计快照"],
        ["可执行操作", "到期后转为正式号"]
      ]
    },
    update_intake: {
      title: "切换接收班级",
      body: "只影响之后首次填写资料的新学生，不会自动移动已经在班里的老学生。",
      primaryLabel: "保存分班配置",
      auditAction: "update_intake_class",
      successMessage: "已模拟切换接收班级",
      riskLevel: "high",
      fields: [
        ["数学类型 + 班型", "数学二 + A"],
        ["新的接收班级", "A201"],
        ["生效范围", "新学生首次资料填写"]
      ]
    },
    renew_service_30_days: {
      title: "续费 30 天",
      body: "正式账号和测试号按 30 天续费。未过期时从原到期日往后加 30 天；已过期时从付款日往后加 30 天。",
      primaryLabel: "确认续费 30 天",
      auditAction: "renew_service_30_days",
      successMessage: "已模拟续费 30 天",
      riskLevel: "high",
      fields: [
        ["续费天数", "30"],
        ["未过期规则", "old paid_until + 30 天"],
        ["已过期规则", "payment_date + 30 天"]
      ]
    }
  },
  landingSteps: [
    {
      title: "第一步：保留现有学生端，新增后台入口",
      body: "学生端继续走 / 和现有手机端壳层；后台新增 /admin 或 /console，登录后用 users.role 分流到管理员端或教师端。"
    },
    {
      title: "第二步：先落教师提醒台",
      body: "优先实现老师登录、老师班级权限、按班级查今日反馈、按学生 ID 查状态、一键复制未反馈 QQ。这个功能每天最常用，风险低。"
    },
    {
      title: "第三步：补管理员基础后台",
      body: "实现老师管理、班级管理、学生管理、账号开通、重置密码、分班配置，并对所有写操作记录 account_audit_logs。"
    },
    {
      title: "第四步：补高风险运营后台",
      body: "实现短期号到期列表和短期号转正式。转正式必须按 stu40001-stu59999 专用目标池取号，并放在数据库事务中完成。"
    },
    {
      title: "第五步：正式上线前整理数据库",
      body: "把 SQLite 开发种子和生产迁移拆开。生产数据库只做增量迁移，Excel 只能导入公共资料，不能覆盖学生行为数据。"
    },
    {
      title: "第六步：上量后迁 PostgreSQL 和 Redis",
      body: "注册用户上万前后，把 SQLite 迁到 PostgreSQL；排行榜、曲线、教师提醒读统计快照；Redis 用于缓存、限流和短期状态。"
    }
  ]
};

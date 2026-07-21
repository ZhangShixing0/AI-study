const DATA = window.CONSOLE_DATA;
const DEFAULT_PAGE_SIZE = 50;
const PAGINATED_PAGE_KEYS = ["accounts", "students", "shortTerm", "audit", "expiry", "renewals", "abnormal", "feedback"];

function createPaginationState() {
  return PAGINATED_PAGE_KEYS.reduce((result, key) => {
    result[key] = { page: 1, pageSize: DEFAULT_PAGE_SIZE };
    return result;
  }, {});
}

const state = {
  authStage: "login",
  pendingRole: null,
  pendingLoginAccount: "",
  pendingPassword: "",
  authPasswordVisible: false,
  authenticatedRole: null,
  authError: "",
  authLoading: false,
  authSession: null,
  totpChallenge: null,
  riskAuthorizedUntil: 0,
  modalMode: "action",
  role: "admin",
  view: "overview",
  search: "",
  pagination: createPaginationState(),
  accountFilters: {
    role: "all",
    accountType: "all",
    accountStatus: "all"
  },
  classFilters: {
    mathType: "all",
    level: "all"
  },
  shortTermTab: "active",
  selectedStudentId: "",
  selectedTrialDetailId: "",
  exportJobs: [],
  teacherClassId: "A201",
  teacherInfoFilters: {
    classId: "all",
    feedbackStatus: "all",
    studentStatus: "all"
  },
  teacherHighlightedStudentId: "",
  previewTeacherId: "",
  teacherStatus: "unsubmitted",
  lookupQuery: "stu10011",
  announcements: [],
  announcementLoading: false,
  announcementLoaded: false,
  announcementError: "",
  formalCredential: null,
  formalCredentialLoading: false,
  formalCredentialLoaded: false,
  formalCredentialError: "",
  formalActivationResult: null,
  formalTotpPrompt: null,
  pendingFormalOnboarding: [],
  pendingFormalOnboardingLoading: false,
  pendingFormalOnboardingLoaded: false,
  pendingFormalOnboardingError: "",
  adminDataLoading: false,
  adminDataLoaded: false,
  adminDataError: "",
  chapterOptions: [],
  testClockDate: DATA.today,
  testClockError: "",
  lastResetPassword: null,
  teacherPasswordForm: {
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  },
  teacherPasswordSaving: false,
  teacherPasswordError: "",
  teacherProfileForm: {
    contactQQ: ""
  },
  teacherProfileSaving: false,
  teacherProfileError: "",
  teacherCreationResult: null,
  shortTermAccounts: [],
  shortTermSummary: null,
  shortTermLoading: false,
  shortTermLoaded: false,
  shortTermError: "",
  shortTermDetail: null,
  shortTermDetailLoading: false,
  shortTermDetailError: "",
  shortTermActivationResult: null,
  pendingAction: null
};

const SCOPED_PRIMARY_BOOK_CODES = new Set(["880", "1000"]);
const PRIMARY_BOOK_SCOPE_LABELS = {
  basic: "只布置基础题",
  advanced: "只布置强化题",
  both: "基础题和强化题都布置"
};
const PRIMARY_BOOK_SCOPE_SHORT_LABELS = {
  basic: "基础题",
  advanced: "强化题",
  both: "基础+强化"
};
const PRIMARY_BOOK_SCOPE_OPTIONS = Object.entries(PRIMARY_BOOK_SCOPE_LABELS);
const PRIMARY_BOOK_SCOPE_FIELDS = ["primaryBook1Scope", "primaryBook2Scope"];
const PUBLIC_EXERCISE_BOOK_OPTIONS = [
  { code: "880", value: "880", label: "880题" },
  { code: "1000", value: "1000", label: "1000题" },
  { code: "660", value: "660", label: "660题" },
  { code: "yanxuan", value: "严选题", label: "严选题" },
  { code: "yanxuan_basic", value: "严选题基础篇", label: "严选题基础篇" }
];
const BOOK_CODE_ALIASES = new Map([
  ["严选题", "yanxuan"],
  ["严选题基础篇", "yanxuan_basic"]
]);

const appShell = document.querySelector(".app-shell");
const authRoot = document.getElementById("authRoot");
const root = document.getElementById("viewRoot");
const sideNav = document.getElementById("sideNav");
const roleSwitchSlot = document.getElementById("roleSwitchSlot");
const pageTitle = document.getElementById("pageTitle");
const roleEyebrow = document.getElementById("roleEyebrow");
const currentUserPill = document.getElementById("currentUserPill");
const globalSearch = document.getElementById("globalSearch");
const resetSearch = document.getElementById("resetSearch");
const searchResults = document.getElementById("searchResults");
const riskAuthPill = document.getElementById("riskAuthPill");
const actionModal = document.getElementById("actionModal");
const modalEyebrow = document.getElementById("modalEyebrow");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const modalConfirm = document.getElementById("modalConfirm");
const toastRegion = document.getElementById("toastRegion");

DATA.actionFlows.deactivate_short_term_account = DATA.actionFlows.deactivate_short_term_account || {
  title: "停用短期号",
  body: "停用后保留学生资料和学习记录，但该短期账号不能继续登录。",
  primaryLabel: "确认停用",
  auditAction: "short_term.deactivate",
  successMessage: "已停用短期号",
  danger: true,
  fields: [
    ["账号类型", "短期号"],
    ["处理结果", "保留数据，仅停用登录"]
  ]
};
DATA.actionFlows.add_teacher = { ...DATA.actionFlows.add_teacher, riskLevel: "high" };
DATA.actionFlows.assign_teacher_class = { ...DATA.actionFlows.assign_teacher_class, riskLevel: "high" };

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const ADMIN_API_BASE = window.location.origin && window.location.protocol.startsWith("http")
  ? window.location.origin
  : "http://127.0.0.1:8000";
const BACKOFFICE_AUTH_STORAGE_KEY = "ai-supervisor-backoffice-auth-v1";
const BACKOFFICE_DEVICE_ID_KEY = "ai-supervisor-backoffice-device-id";

function storageGet(key) {
  try {
    return window.localStorage.getItem(key) || "";
  } catch (error) {
    return "";
  }
}

function storageSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    // Ignore unavailable storage; the current tab can still work.
  }
}

function storageRemove(key) {
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    // Ignore unavailable storage.
  }
}

function backofficeDeviceId() {
  let deviceId = storageGet(BACKOFFICE_DEVICE_ID_KEY);
  if (!deviceId) {
    const randomPart = Math.random().toString(36).slice(2, 10);
    deviceId = `backoffice-${Date.now().toString(36)}-${randomPart}`;
    storageSet(BACKOFFICE_DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

function normalizeAuthSession(payload) {
  if (!payload?.token || !payload?.sessionId || !payload?.user?.userId) return null;
  return {
    token: payload.token,
    sessionId: payload.sessionId,
    deviceId: backofficeDeviceId(),
    user: payload.user
  };
}

function saveBackofficeAuthSession(payload) {
  const session = normalizeAuthSession(payload);
  if (!session) return null;
  state.authSession = session;
  storageSet(BACKOFFICE_AUTH_STORAGE_KEY, JSON.stringify(session));
  return session;
}

function restoreBackofficeAuthSession() {
  const raw = storageGet(BACKOFFICE_AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw);
    if (!session?.token || !session?.sessionId || !session?.user?.userId) return null;
    session.deviceId = session.deviceId || backofficeDeviceId();
    state.authSession = session;
    return session;
  } catch (error) {
    storageRemove(BACKOFFICE_AUTH_STORAGE_KEY);
    return null;
  }
}

function clearBackofficeAuthSession() {
  state.authSession = null;
  state.authStage = "login";
  state.authenticatedRole = null;
  state.pendingRole = null;
  state.pendingPassword = "";
  state.totpChallenge = null;
  storageRemove(BACKOFFICE_AUTH_STORAGE_KEY);
}

function backofficeAuthHeaders() {
  if (!state.authSession) return {};
  return {
    Authorization: `Bearer ${state.authSession.token}`,
    "X-Session-Id": state.authSession.sessionId,
    "X-Device-Id": state.authSession.deviceId || backofficeDeviceId()
  };
}

function applyBackofficeUser(user) {
  if (!user?.role) return;
  const target = user.role === "teacher" ? DATA.currentUsers.teacher : DATA.currentUsers.admin;
  Object.assign(target, {
    userId: user.userId || target.userId,
    loginAccount: user.loginAccount || user.userId || target.loginAccount,
    nickname: user.nickname || target.nickname,
    role: user.role
  });
}

async function adminApiRequest(path, options = {}) {
  const { skipAuth = false, ...fetchOptions } = options;
  const headers = new Headers(fetchOptions.headers || {});
  if (!skipAuth) {
    Object.entries(backofficeAuthHeaders()).forEach(([key, value]) => headers.set(key, value));
  }
  const response = await fetch(`${ADMIN_API_BASE}${path}`, { ...fetchOptions, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (!skipAuth && response.status === 401) clearBackofficeAuthSession();
    const detail = data.detail;
    throw new Error(
      typeof detail === "string"
        ? detail
        : detail?.message || data.message || "请求失败"
    );
  }
  return data;
}

function adminJsonOptions(method, body = {}) {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      actor: currentAdminUserId(),
      ...body
    })
  };
}

function apiSegment(value) {
  return encodeURIComponent(String(value || ""));
}

function studentWrongQuestionExportUrl(student) {
  if (!student?.userId) return "";
  return `${ADMIN_API_BASE}/admin/students/${apiSegment(student.userId)}/wrong-questions.xlsx`;
}

function renderAuth() {
  const isTotp = state.authStage === "totp" || state.authStage === "totpSetup";
  const isSetup = state.authStage === "totpSetup";
  const challenge = state.totpChallenge || {};
  const passwordType = state.authPasswordVisible ? "text" : "password";
  const passwordToggleText = state.authPasswordVisible ? "隐藏" : "显示";
  authRoot.hidden = false;
  appShell.hidden = true;
  authRoot.innerHTML = `
    <div class="auth-card">
      <div class="brand auth-brand">
        <div class="brand-mark">AI</div>
        <div>
          <div class="brand-title">AI 督学后台</div>
          <div class="brand-subtitle">隐藏后台入口示例：${escapeHtml(DATA.securityPolicy.hiddenConsolePathExample)}</div>
        </div>
      </div>
      <div class="auth-copy">
        <div class="eyebrow">${isTotp ? "管理员动态码验证" : "后台登录"}</div>
        <h1>${isSetup ? "绑定管理员 TOTP" : (isTotp ? "输入 TOTP 动态码" : "管理员 / 教师工作台")}</h1>
        <p>${isSetup ? "首次登录管理员账号需要先绑定动态码。请把下方密钥加入认证器后输入 6 位验证码。" : (isTotp ? "请输入认证器中的 6 位动态码。" : "后台账号会通过服务器真实登录校验；学生账号不能进入后台。")}</p>
      </div>
      ${state.authError ? `<div class="notice danger">${escapeHtml(state.authError)}</div>` : ""}
      ${isSetup ? `
        <div class="notice">
          <div>手动密钥：<strong>${escapeHtml(challenge.manualSecret || "")}</strong></div>
          <div>绑定有效期：${escapeHtml(challenge.expiresAt || "")}</div>
        </div>
      ` : ""}
      ${isTotp ? `
        <label class="field full">动态码
          <input id="totpInput" inputmode="numeric" autocomplete="one-time-code" placeholder="输入 6 位动态码" />
        </label>
        <button class="primary-button auth-submit" type="button" data-auth-action="verify-totp" ${state.authLoading ? "disabled" : ""}>${state.authLoading ? "验证中" : "验证并进入后台"}</button>
        <button class="ghost-button auth-submit" type="button" data-auth-action="back-login">返回登录</button>
      ` : `
        <label class="field full">登录账号
          <input id="loginAccountInput" value="${escapeHtml(state.pendingLoginAccount || "adm001")}" placeholder="adm001 / tea001 / stu60001" />
        </label>
        <label class="field full">密码
          <span class="password-input-row">
            <input id="loginPasswordInput" type="${passwordType}" autocomplete="current-password" value="${escapeHtml(state.pendingPassword)}" />
            <button class="secondary-button password-toggle" type="button" data-auth-action="toggle-password">${passwordToggleText}</button>
          </span>
        </label>
        <button class="primary-button auth-submit" type="button" data-auth-action="login" ${state.authLoading ? "disabled" : ""}>${state.authLoading ? "登录中" : "登录后台"}</button>
        <div class="auth-shortcuts">
          <button class="secondary-button" type="button" data-auth-action="fill-admin">填入管理员账号</button>
          <button class="secondary-button" type="button" data-auth-action="fill-teacher">填入教师账号</button>
          <button class="secondary-button" type="button" data-auth-action="fill-student">填入学生账号</button>
        </div>
      `}
      <div class="notice">管理员首次登录需要绑定 TOTP；老师账号由管理员创建后使用初始密码登录。</div>
    </div>
  `;
}

function toggleBackofficePasswordVisibility() {
  state.pendingPassword = document.getElementById("loginPasswordInput")?.value || state.pendingPassword;
  state.authPasswordVisible = !state.authPasswordVisible;
  renderAuth();
}

function completeLogin(role, payload = null) {
  if (payload) {
    saveBackofficeAuthSession(payload);
    applyBackofficeUser(payload.user);
  } else if (state.authSession?.user) {
    applyBackofficeUser(state.authSession.user);
  }
  state.authStage = "authenticated";
  state.pendingRole = null;
  state.pendingPassword = "";
  state.totpChallenge = null;
  state.authenticatedRole = role;
  state.authError = "";
  state.role = role;
  state.view = role === "admin" ? "overview" : "teacherToday";
  if (role === "teacher") {
    state.previewTeacherId = authenticatedTeacherUserId() || DATA.currentUsers.teacher.userId;
    ensurePreviewTeacherContext();
  }
  authRoot.hidden = true;
  appShell.hidden = false;
  render();
  loadBackofficeDataIfNeeded(true);
}

async function postBackofficeLogin(extra = {}) {
  return adminApiRequest("/auth/login", {
    method: "POST",
    skipAuth: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      loginAccount: state.pendingLoginAccount,
      password: state.pendingPassword,
      deviceId: backofficeDeviceId(),
      deviceName: "Backoffice Browser",
      ...extra
    })
  });
}

async function submitLogin() {
  const account = document.getElementById("loginAccountInput")?.value.trim() || "";
  const password = document.getElementById("loginPasswordInput")?.value || "";
  state.pendingLoginAccount = account;
  state.pendingPassword = password;
  state.authError = "";
  if (!account || !password) {
    state.authError = "请输入后台账号和密码。";
    renderAuth();
    return;
  }
  state.authLoading = true;
  renderAuth();
  try {
    const payload = await postBackofficeLogin();
    if (payload.requiresTotpSetup) {
      state.authStage = "totpSetup";
      state.pendingRole = "admin";
      state.totpChallenge = payload;
      state.authError = payload.message || "";
      return;
    }
    if (payload.requiresTotp) {
      state.authStage = "totp";
      state.pendingRole = "admin";
      state.totpChallenge = payload;
      state.authError = payload.message || "";
      return;
    }
    const role = payload.user?.role || "";
    if (role !== "admin" && role !== "teacher") {
      state.authError = "学生账号不能进入后台，请返回学生端登录。";
      return;
    }
    completeLogin(role, payload);
  } catch (error) {
    state.authError = error.message || "后台登录失败";
  } finally {
    state.authLoading = false;
    if (state.authStage === "authenticated") render();
    else renderAuth();
  }
}

async function submitTotp() {
  const code = document.getElementById("totpInput")?.value || "";
  if (!code.trim()) {
    state.authError = "请输入 6 位动态码。";
    renderAuth();
    return;
  }
  state.authLoading = true;
  renderAuth();
  try {
    const extra = { totpCode: code.trim() };
    if (state.authStage === "totpSetup" && state.totpChallenge?.setupToken) {
      extra.setupToken = state.totpChallenge.setupToken;
    }
    const payload = await postBackofficeLogin(extra);
    if (payload.requiresTotpSetup || payload.requiresTotp) {
      state.totpChallenge = payload;
      state.authError = payload.message || "动态码错误，请重新输入。";
      return;
    }
    completeLogin(payload.user?.role || "admin", payload);
  } catch (error) {
    state.authError = error.message || "动态码验证失败";
  } finally {
    state.authLoading = false;
    if (state.authStage === "authenticated") render();
    else renderAuth();
  }
}

function statusLabel(status) {
  const map = {
    active: ["启用", "green"],
    disabled: ["停用", "red"],
    deactivated: ["已停用", "red"],
    expired_pending_review: ["到期待处理", "amber"],
    archived: ["归档", ""],
    deleted: ["已删除", "red"],
    converted_to_formal: ["已转正式", "green"],
    completed: ["已完成", "green"],
    service_expired: ["服务已过期", "red"],
    unsubmitted: ["未反馈", "red"],
    not_started: ["未反馈", "red"],
    in_progress: ["未反馈", "red"],
    unfinished: ["已反馈未完成", "amber"],
    abnormal: ["异常", "purple"],
    demo: ["演示", "blue"],
    trial: ["短期号", "amber"],
    formal: ["正式号", "green"],
    internal_test: ["测试号", "purple"],
    public_demo: ["静态体验", "blue"],
    persistent: ["真实写入", "green"],
    readonly: ["只读模拟", "blue"]
  };
  return map[status] || [status || "未设置", ""];
}

function tag(status) {
  const [label, cls] = statusLabel(status);
  return `<span class="tag ${cls}">${escapeHtml(label)}</span>`;
}

function actionButton(label, action, target = "", variant = "secondary-button") {
  return `<button class="${variant}" type="button" data-action="${escapeHtml(action)}" data-action-target="${escapeHtml(target)}">${escapeHtml(label)}</button>`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function dateValue(dateText) {
  return new Date(`${dateText}T00:00:00`);
}

function dayDiff(dateText) {
  if (!dateText) return Number.POSITIVE_INFINITY;
  return Math.round((dateValue(dateText) - dateValue(DATA.today)) / DAY_MS);
}

function calendarDayDiff(fromDateText, toDateText) {
  if (!fromDateText || !toDateText) return Number.POSITIVE_INFINITY;
  return Math.round((dateValue(fromDateText) - dateValue(toDateText)) / DAY_MS);
}

function isFormalLike(student) {
  return ["formal", "internal_test"].includes(student.accountType);
}

function isTestStudent(student) {
  return student.accountType === "internal_test" || classInfo(student.classId)?.isTestClass;
}

function accountTypeText(type) {
  const labels = {
    public_demo: "静态体验",
    internal_test: "测试号",
    trial: "短期号",
    formal: "正式号"
  };
  return labels[type] || type;
}

function testTag(student) {
  return isTestStudent(student) ? `<span class="tag purple">测试号</span>` : "";
}

function teacherName(teacherId) {
  return DATA.teachers.find((teacher) => teacher.userId === teacherId)?.nickname || "未分配";
}

function upsertTeacher(teacher) {
  if (!teacher?.userId) return;
  const index = DATA.teachers.findIndex((item) => item.userId === teacher.userId);
  if (index >= 0) DATA.teachers[index] = teacher;
  else DATA.teachers.push(teacher);
}

function upsertStudent(student) {
  if (!student?.userId) return;
  const index = DATA.students.findIndex((item) => item.userId === student.userId);
  if (index >= 0) DATA.students[index] = student;
  else DATA.students.push(student);
}

function feedbackStudentsFromPayload(payload = {}) {
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.students)) return payload.students;
  const groups = payload.groups || {};
  return Object.values(groups).flatMap((items) => Array.isArray(items) ? items : []);
}

function classInfo(classId) {
  return DATA.classes.find((item) => item.classId === classId);
}

function className(classId) {
  const item = classInfo(classId);
  return item ? item.className : classId || "未分班";
}

function classTeacherId(classId) {
  return classInfo(classId)?.teacherId || "";
}

function avatar(student) {
  if (student?.avatarUrl) {
    return `<img class="avatar" src="${escapeHtml(student.avatarUrl)}" alt="" />`;
  }
  return `<span class="avatar-initial">${escapeHtml((student?.nickname || "?").slice(0, 1))}</span>`;
}

function accountRows() {
  if (Array.isArray(DATA.accounts) && DATA.accounts.length) {
    return DATA.accounts
      .map((row) => ({
        ...row,
        dataMode: row.dataMode || "backend",
        accountStatus: row.accountStatus || row.status || "",
        classId: row.classId || "",
        contactQQ: row.contactQQ || "",
        activatedAt: row.activatedAt || row.createdAt || "",
        trialExpiresAt: row.trialExpiresAt || row.paidUntil || ""
      }))
      .sort(compareLoginAccount);
  }
  const admin = {
    userId: "adm001",
    loginAccount: "adm001",
    nickname: "管理员",
    role: "admin",
    accountType: "admin",
    dataMode: "system",
    accountStatus: "active",
    classId: "",
    contactQQ: "2600000001",
    activatedAt: "2026-06-01 09:00",
    trialExpiresAt: ""
  };
  const teachers = DATA.teachers.map((teacher) => ({
    ...teacher,
    role: "teacher",
    accountType: "teacher",
    dataMode: "system",
    accountStatus: teacher.status,
    classId: teacher.classes.join(", "),
    activatedAt: "2026-06-01 09:00",
    trialExpiresAt: ""
  }));
  const students = DATA.students.map((student) => ({ ...student, role: "student" }));
  return [admin, ...teachers, ...students];
}

function matchesSearch(row) {
  if (!state.search) return true;
  const haystack = JSON.stringify(row).toLowerCase();
  return haystack.includes(state.search.toLowerCase());
}

function accountNumber(loginAccount) {
  const match = /^stu(\d+)$/.exec(loginAccount || "");
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

function compareLoginAccount(a, b) {
  return a.loginAccount.localeCompare(b.loginAccount, undefined, { numeric: true, sensitivity: "base" });
}

function accountInRange(loginAccount, range) {
  const number = accountNumber(loginAccount);
  return number >= accountNumber(range.start) && number <= accountNumber(range.end);
}

function unusedFormalAccounts() {
  return [];
}

function nextUnusedFormalAccount() {
  return nextFormalAccount();
}

function nextFormalAccount() {
  const loginAccount = DATA.accountPool.nextFormalAccount;
  if (!loginAccount || !accountInRange(loginAccount, DATA.accountPool.formalRange)) return null;
  return createFormalAccountShell(loginAccount);
}

function usedLoginAccounts() {
  return new Set([
    ...DATA.students,
    ...DATA.accounts,
    ...DATA.availableAccounts
  ].map((account) => account.loginAccount).filter(Boolean));
}

function nextSequentialLoginAfterMaxInRange(range) {
  const used = usedLoginAccounts();
  const end = accountNumber(range.end);
  let maxUsed = accountNumber(range.start) - 1;
  used.forEach((loginAccount) => {
    const number = accountNumber(loginAccount);
    if (number >= accountNumber(range.start) && number <= end) {
      maxUsed = Math.max(maxUsed, number);
    }
  });
  const nextNumber = maxUsed + 1;
  if (nextNumber <= end) {
    return `stu${String(nextNumber).padStart(5, "0")}`;
  }
  return "";
}

function nextTrialConversionFormalAccount() {
  const loginAccount = nextSequentialLoginAfterMaxInRange(DATA.accountPool.trialConversionFormalRange);
  return loginAccount ? createFormalAccountShell(loginAccount, "短期转正式目标池") : null;
}

function createFormalAccountShell(loginAccount = DATA.accountPool.nextFormalAccount, recommendedUse = "下一个可开通正式号") {
  return {
    loginAccount,
    accountType: "formal",
    accountStatus: "disabled",
    dataMode: "persistent",
    everActivated: false,
    recommendedUse
  };
}

function advanceNextFormalAccount() {
  const current = nextFormalAccount();
  if (!current) return "";
  const nextNumber = accountNumber(current.loginAccount) + 1;
  const nextLogin = `stu${String(nextNumber).padStart(5, "0")}`;
  DATA.accountPool.nextFormalAccount = accountInRange(nextLogin, DATA.accountPool.formalRange) ? nextLogin : "";
  return DATA.accountPool.nextFormalAccount;
}

function nextUnusedTrialAccount() {
  return DATA.availableAccounts
    .filter((account) => account.accountType === "trial")
    .filter((account) => !account.everActivated)
    .filter((account) => !account.deletedAt && account.accountStatus !== "deleted")
    .sort(compareLoginAccount)[0] || null;
}

function shortTermExpireDate(account) {
  return account.expireDate || account.trialExpiresAt || account.paidUntil || "";
}

function getShortTermVisibleStatus(account, appToday = DATA.today) {
  if (!account || account.deletedAt) return "hidden";
  if (account.accountType !== "trial" && account.accountType !== "shortTerm") return "hidden";
  if (["deleted", "converted", "converted_to_formal"].includes(account.accountStatus)) return "hidden";
  if (account.planStatus === "converted_to_formal") return "hidden";
  const expireDate = shortTermExpireDate(account);
  if (!expireDate) return "pendingOnboarding";
  const diffDays = calendarDayDiff(appToday, expireDate);
  if (diffDays <= 0) return "active";
  if (diffDays <= 3) return "expiredGrace";
  return "shouldDelete";
}

const studentAccountTypeOptions = [
  ["all", "全部学生账号类型"],
  ["trial", "短期号"],
  ["formal", "正式号"],
  ["internal_test", "测试号"]
];

const staffAccountTypeOptions = {
  teacher: [["all", "全部老师账号"], ["teacher", "教师账号"]],
  admin: [["all", "全部管理员账号"], ["admin", "管理员账号"]]
};

function accountTypeOptionsForRole(role) {
  if (role === "student") return studentAccountTypeOptions;
  if (role === "teacher") return staffAccountTypeOptions.teacher;
  if (role === "admin") return staffAccountTypeOptions.admin;
  return [
    ["all", "全部账号类型"],
    ["trial", "短期号"],
    ["formal", "正式号"],
    ["internal_test", "测试号"],
    ["teacher", "教师账号"],
    ["admin", "管理员账号"]
  ];
}

function normalizeAccountFilters() {
  const validTypes = new Set(accountTypeOptionsForRole(state.accountFilters.role).map(([value]) => value));
  if (!validTypes.has(state.accountFilters.accountType)) {
    state.accountFilters.accountType = "all";
  }
}

function accountFilterSelect(key, options) {
  const selected = state.accountFilters[key] || "all";
  return `
    <select class="filter-select" data-account-filter="${escapeHtml(key)}">
      ${options.map(([value, label]) => `<option value="${escapeHtml(value)}" ${value === selected ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
    </select>
  `;
}

function filteredAccountRows() {
  normalizeAccountFilters();
  const filters = state.accountFilters;
  return accountRows()
    .filter(matchesSearch)
    .filter((row) => filters.role === "all" || row.role === filters.role)
    .filter((row) => filters.accountType === "all" || row.accountType === filters.accountType)
    .filter((row) => filters.accountStatus === "all" || row.accountStatus === filters.accountStatus)
    .sort((a, b) => a.loginAccount.localeCompare(b.loginAccount, undefined, { numeric: true, sensitivity: "base" }));
}

function isAdminPreviewingTeacher() {
  return state.authenticatedRole === "admin" && state.role === "teacher";
}

function authenticatedTeacherUserId() {
  return state.authSession?.user?.role === "teacher" ? state.authSession?.user?.userId || "" : "";
}

function activeTeacherId() {
  if (isAdminPreviewingTeacher()) {
    return state.previewTeacherId || DATA.currentUsers.teacher.userId;
  }
  return authenticatedTeacherUserId() || DATA.currentUsers.teacher.userId;
}

function currentPreviewTeacher() {
  return DATA.teachers.find((teacher) => teacher.userId === activeTeacherId()) || DATA.teachers[0];
}

function previewTeacherOptions() {
  return DATA.teachers
    .map((teacher) => {
      const statusText = teacher.status === "active" ? "" : " · 停用";
      return `<option value="${escapeHtml(teacher.userId)}" ${teacher.userId === activeTeacherId() ? "selected" : ""}>${escapeHtml(teacher.nickname)} · ${escapeHtml(teacher.loginAccount)}${statusText}</option>`;
    })
    .join("");
}

function ensurePreviewTeacherContext() {
  if (!DATA.teachers.some((teacher) => teacher.userId === state.previewTeacherId)) {
    state.previewTeacherId = DATA.currentUsers.teacher.userId;
  }
  const classes = teacherClassesForCurrentUser();
  if (!classes.some((item) => item.classId === state.teacherClassId)) {
    state.teacherClassId = classes[0]?.classId || "";
  }
}

function renderTeacherPreviewToolbar() {
  if (!isAdminPreviewingTeacher()) {
    return "";
  }
  const teacher = currentPreviewTeacher();
  const classes = teacherClassesForCurrentUser();
  return `
    <section class="band teacher-preview-toolbar">
      <div class="toolbar">
        <div>
          <div class="eyebrow">管理员预览教师视角</div>
          <h2 class="section-title">当前预览：${escapeHtml(teacher.nickname)} ${escapeHtml(teacher.loginAccount)}</h2>
          <p class="section-subtitle">页面会按所选老师的班级权限重新渲染；这仍是管理员会话，不是教师登录。</p>
        </div>
        <select class="filter-select" data-preview-teacher aria-label="切换预览教师">
          ${previewTeacherOptions()}
        </select>
      </div>
      <div class="notice">已负责班级：${classes.map((item) => escapeHtml(item.classId)).join("、") || "暂无班级"}。真实教师账号登录后不会出现这个切换器。</div>
    </section>
  `;
}

function renderRoleSwitch() {
  if (state.authenticatedRole !== "admin") {
    return "";
  }
  return `
    <div class="role-switch" aria-label="角色切换">
      <button class="role-button ${state.role === "admin" ? "is-active" : ""}" type="button" data-role="admin">管理员端</button>
      <button class="role-button ${state.role === "teacher" ? "is-active" : ""}" type="button" data-role="teacher">教师端</button>
    </div>
  `;
}

function renderShell() {
  const user = isAdminPreviewingTeacher() ? DATA.currentUsers.admin : DATA.currentUsers[state.role];
  const nav = DATA.nav[state.role];
  roleSwitchSlot.innerHTML = renderRoleSwitch();
  sideNav.innerHTML = nav
    .map(([view, label]) => `
      <button class="nav-item ${state.view === view ? "is-active" : ""}" type="button" data-view="${view}">
        <span class="nav-dot"></span>
        <span>${escapeHtml(label)}</span>
      </button>
    `)
    .join("");
  roleEyebrow.textContent = state.role === "admin" ? "管理员工作台" : "教师工作台";
  if (isAdminPreviewingTeacher()) {
    roleEyebrow.textContent = "教师工作台 · 管理员预览";
  }
  currentUserPill.innerHTML = `
    <span class="avatar-initial">${escapeHtml(user.nickname.slice(0, 1))}</span>
    <div>
      <div class="cell-title">${escapeHtml(user.nickname)}</div>
      <div class="cell-sub">${escapeHtml(user.loginAccount)} · ${escapeHtml(user.title)}</div>
    </div>
  `;
  document.querySelectorAll(".role-button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.role === state.role);
  });
}

function setViewTitle(title) {
  pageTitle.textContent = title;
}

function renderAdminDataLoading() {
  const hasError = Boolean(state.adminDataError);
  const title = hasError ? "后台数据加载失败" : "正在加载后台真实数据";
  setViewTitle(hasError ? "后台数据加载失败" : "正在加载");
  root.innerHTML = `
    <section class="band">
      <div class="section-head">
        <div>
          <h2 class="section-title">${escapeHtml(title)}</h2>
          <p class="section-subtitle">${escapeHtml(hasError ? state.adminDataError : "正在从服务器读取账号、学生、班级和老师数据。")}</p>
        </div>
        ${hasError ? `<button class="secondary-button" type="button" data-admin-data-retry>重新加载</button>` : ""}
      </div>
    </section>
  `;
}

function render() {
  renderShell();
  updateRiskAuthPill();
  if (state.authStage === "authenticated" && !state.adminDataLoaded) {
    if (searchResults) searchResults.innerHTML = "";
    renderAdminDataLoading();
    return;
  }
  renderSearchResults();
  const viewMap = {
    overview: renderAdminOverview,
    accounts: renderAccounts,
    teachers: renderTeachers,
    classes: renderClasses,
    students: renderStudents,
    activation: renderActivation,
    shortTerm: renderShortTermAccounts,
    expiry: renderExpiry,
    renewals: renderRenewals,
    abnormal: renderAbnormal,
    feedback: renderFeedback,
    announcements: renderAnnouncements,
    intake: renderIntake,
    audit: renderAudit,
    teacherToday: renderTeacherToday,
    teacherLookup: renderTeacherLookup,
    teacherClasses: renderTeacherClasses,
    teacherPassword: renderTeacherPassword,
    teacherRules: renderTeacherRules,
    data: renderDataDictionary,
    landing: renderLanding
  };
  (viewMap[state.view] || renderAdminOverview)();
}

async function loadAnnouncementsIfNeeded(force = false) {
  if (state.announcementLoading) return;
  if (!force && state.announcementLoaded) return;
  state.announcementLoading = true;
  try {
    const data = await adminApiRequest("/admin/announcements");
    state.announcements = data.items || [];
    state.announcementError = "";
    state.announcementLoaded = true;
  } catch (error) {
    state.announcementError = error.message || "公告加载失败";
  } finally {
    state.announcementLoading = false;
    if (state.view === "announcements") render();
  }
}

function normalizeIntakeRows(items = []) {
  return items.map((item) => [
    item.mathType,
    item.level,
    item.activeClassId,
    item.statusLabel || (item.status === "receiving" ? "正常接收" : item.status || ""),
    item.updatedBy || "adm001",
    item.updatedAt || ""
  ]);
}

function normalizeAuditRows(items = []) {
  return items.map((item) => ({
    time: item.time || item.createdAt || "",
    actor: item.actor || "",
    action: item.action || "",
    target: item.target || "",
    before: item.before || "",
    after: item.after || "",
    confirmed: Boolean(item.confirmed ?? true)
  }));
}

async function loadTestClock() {
  try {
    const clock = { currentDate: new Date().toISOString().slice(0, 10), offsetDays: 0 };
    if (clock?.currentDate) {
      DATA.today = clock.currentDate;
      state.testClockDate = clock.currentDate;
    }
    state.testClockError = "";
    return clock || { currentDate: DATA.today, offsetDays: 0 };
  } catch (error) {
    state.testClockError = error.message || "测试日期加载失败";
    state.testClockDate = DATA.today;
    return { currentDate: DATA.today, offsetDays: 0 };
  }
}

async function loadAdminConsoleDataIfNeeded(force = false) {
  if (state.adminDataLoading) return;
  if (!force && state.adminDataLoaded) return;
  state.adminDataLoading = true;
  state.adminDataError = "";
  try {
    const clock = await loadTestClock();
    const statDate = encodeURIComponent(clock.currentDate || DATA.today);
    const [accounts, teachers, classes, students, intake, audit, chapterOptions] = await Promise.all([
      adminApiRequest("/admin/accounts"),
      adminApiRequest("/admin/teachers"),
      adminApiRequest("/admin/classes"),
      adminApiRequest(`/admin/students?date=${statDate}`),
      adminApiRequest("/admin/class-intake-settings"),
      adminApiRequest("/admin/audit-logs"),
      adminApiRequest(`/admin/chapter-options?mathType=${encodeURIComponent("数学二")}`)
    ]);
    DATA.accounts = accounts.items || [];
    DATA.teachers = teachers.items || [];
    DATA.classes = classes.items || [];
    DATA.students = students.items || [];
    DATA.intakeSettings = normalizeIntakeRows(intake.items || []);
    DATA.auditLogs = normalizeAuditRows(audit.items || []);
    DATA.chapterOptions = chapterOptions.items || [];
    state.chapterOptions = DATA.chapterOptions;
    if (DATA.teachers[0]) {
      DATA.currentUsers.teacher = {
        ...DATA.currentUsers.teacher,
        userId: DATA.teachers[0].userId,
        loginAccount: DATA.teachers[0].loginAccount,
        nickname: DATA.teachers[0].nickname
      };
      if (!DATA.teachers.some((teacher) => teacher.userId === state.previewTeacherId)) {
        state.previewTeacherId = DATA.teachers[0].userId;
      }
    }
    state.adminDataLoaded = true;
  } catch (error) {
    state.adminDataError = error.message || "后台数据加载失败";
  } finally {
    state.adminDataLoading = false;
    if (state.authStage === "authenticated") render();
  }
}

async function loadTeacherConsoleDataIfNeeded(force = false) {
  if (state.adminDataLoading) return;
  if (!force && state.adminDataLoaded) return;
  state.adminDataLoading = true;
  state.adminDataError = "";
  try {
    const clock = await loadTestClock();
    const statDate = encodeURIComponent(clock.currentDate || DATA.today);
    const classesPayload = await adminApiRequest("/teacher/classes");
    const teacher = classesPayload.teacher || state.authSession?.user || {};
    const items = classesPayload.items || [];
    const classIds = new Set(items.map((item) => item.classId).filter(Boolean));
    const statusPayloads = await Promise.all(
      items.map((item) => adminApiRequest(`/teacher/classes/${apiSegment(item.classId)}/daily-feedback-status?date=${statDate}`))
    );
    const scopedStudents = [];
    const seenStudentIds = new Set();
    for (const payload of statusPayloads) {
      for (const student of feedbackStudentsFromPayload(payload)) {
        if (!student?.userId || seenStudentIds.has(student.userId)) continue;
        seenStudentIds.add(student.userId);
        scopedStudents.push(student);
      }
    }
    DATA.teachers = teacher.userId ? [teacher] : DATA.teachers;
    DATA.currentUsers.teacher = {
      ...DATA.currentUsers.teacher,
      userId: teacher.userId || state.authSession?.user?.userId || DATA.currentUsers.teacher.userId,
      loginAccount: teacher.loginAccount || state.authSession?.user?.loginAccount || teacher.userId || DATA.currentUsers.teacher.loginAccount,
      nickname: teacher.nickname || state.authSession?.user?.nickname || DATA.currentUsers.teacher.nickname,
      contactQQ: teacher.contactQQ || state.authSession?.user?.contactQQ || DATA.currentUsers.teacher.contactQQ || ""
    };
    state.teacherProfileForm.contactQQ = DATA.currentUsers.teacher.contactQQ || "";
    DATA.classes = DATA.classes.filter((item) => !classIds.has(item.classId)).concat(items);
    DATA.students = DATA.students.filter((student) => !classIds.has(student.classId));
    scopedStudents.forEach(upsertStudent);
    state.previewTeacherId = DATA.currentUsers.teacher.userId;
    state.teacherClassId = items.some((item) => item.classId === state.teacherClassId) ? state.teacherClassId : items[0]?.classId || "";
    state.adminDataLoaded = true;
  } catch (error) {
    state.adminDataError = error.message || "教师端数据加载失败";
  } finally {
    state.adminDataLoading = false;
    if (state.authStage === "authenticated") render();
  }
}

async function loadBackofficeDataIfNeeded(force = false) {
  if (state.authenticatedRole === "teacher") {
    return loadTeacherConsoleDataIfNeeded(force);
  }
  return loadAdminConsoleDataIfNeeded(force);
}

async function handleTestClockChange(dateText = "") {
  if (dateText) {
    DATA.today = dateText;
    state.testClockDate = dateText;
  }
  state.adminDataLoaded = false;
  state.shortTermLoaded = false;
  state.shortTermError = "";
  state.shortTermDetail = null;
  state.shortTermDetailError = "";
  await loadBackofficeDataIfNeeded(true);
  if (state.view === "shortTerm") {
    await loadShortTermAccounts(true);
    if (state.selectedTrialDetailId) {
      await loadShortTermDetail(state.selectedTrialDetailId, true);
    }
  }
}

function currentAdminUserId() {
  return DATA.currentUsers.admin.userId || "adm001";
}

function activeAdminUserId() {
  return currentAdminUserId();
}

function normalizeShortTermAccount(account = {}) {
  return {
    ...account,
    userId: account.userId || account.studentId || account.loginAccount || "",
    loginAccount: account.loginAccount || account.account || account.studentAccount || "",
    nickname: account.nickname || account.studentName || account.name || account.loginAccount || "短期学员",
    classId: account.classId || "",
    contactQQ: account.contactQQ || account.qqNumber || "",
    accountType: account.accountType || "trial",
    accountStatus: account.accountStatus || account.status || "active",
    shortTermStatus: account.shortTermStatus || account.lifecycleStatus || account.planStatus || account.status || "",
    trialExpiresAt: account.trialExpiresAt || account.expireDate || account.expiresAt || account.paidUntil || "",
    paidUntil: account.paidUntil || account.trialExpiresAt || account.expireDate || account.expiresAt || "",
    todayStatus: account.todayStatus || "",
    currentTypeId: account.currentTypeId || account.typeId || "",
    openTypeName: account.openTypeName || "",
    submittedTypes: Number(account.submittedTypes || 0),
    totalTypes: Number(account.totalTypes || 0),
    unfinishedCount: Number(account.unfinishedCount || 0),
    level: account.level || "A",
    mathType: account.mathType || "",
    targetScore: Number(account.targetScore || 0),
    reviewOrder: account.reviewOrder || "mixed",
    primaryBooks: Array.isArray(account.primaryBooks) ? account.primaryBooks : [],
    primaryBookScopes: Array.isArray(account.primaryBookScopes) ? account.primaryBookScopes : [],
    backupBook: account.backupBook || "",
    manualNextTypeId: account.manualNextTypeId || "",
    flags: Array.isArray(account.flags) ? account.flags : []
  };
}

function shortTermTabForStatus(status = "") {
  if (status === "pending_onboarding") return "pending";
  if (["active_trial", "expiring_soon"].includes(status)) return "active";
  if (status === "expired_pending_review") return "expired";
  if (["migrated_to_formal", "deactivated"].includes(status)) return "history";
  return "";
}

function shortTermTabForAccount(account) {
  const normalized = shortTermTabForStatus(account?.shortTermStatus || "");
  if (normalized) return normalized;
  const visibleStatus = getShortTermVisibleStatus(account, DATA.today);
  if (visibleStatus === "pendingOnboarding") return "pending";
  if (visibleStatus === "active") return "active";
  if (visibleStatus === "expiredGrace") return "expired";
  if (visibleStatus === "shouldDelete") return "history";
  return "active";
}

function buildShortTermSummary(accounts = [], summary = {}) {
  const fallback = { pending: 0, active: 0, expired: 0, history: 0 };
  accounts.forEach((account) => {
    fallback[shortTermTabForAccount(account)] += 1;
  });
  return {
    pending: Number(summary.pendingOnboardingCount ?? summary.pending ?? fallback.pending ?? 0),
    active: (
      Number(summary.activeTrialCount ?? summary.active ?? 0)
      + Number(summary.expiringSoonCount ?? summary.expiringSoon ?? 0)
    ) || fallback.active,
    expired: Number(summary.expiredPendingReviewCount ?? summary.expired ?? fallback.expired ?? 0),
    history: Number(summary.migratedOrDeactivatedCount ?? summary.history ?? fallback.history ?? 0),
    nextShortTermAccount: summary.nextShortTermAccount || "",
    nextConversionAccount: summary.nextConversionAccount || ""
  };
}

function shortTermRows(mode = state.shortTermTab) {
  return state.shortTermAccounts
    .filter((account) => shortTermTabForAccount(account) === mode)
    .sort((a, b) => {
      const dayDelta = dayDiff(a.paidUntil || a.trialExpiresAt) - dayDiff(b.paidUntil || b.trialExpiresAt);
      return Number.isFinite(dayDelta) && dayDelta !== 0 ? dayDelta : compareLoginAccount(a, b);
    });
}

async function loadShortTermAccounts(force = false) {
  if (state.shortTermLoading) return;
  if (!force && state.shortTermLoaded) return;
  state.shortTermLoading = true;
  state.shortTermError = "";
  try {
    const clock = await loadTestClock();
    const statDate = encodeURIComponent(clock.currentDate || DATA.today);
    const data = await adminApiRequest(`/admin/short-term-accounts?date=${statDate}`);
    const accounts = (data.items || data.accounts || []).map(normalizeShortTermAccount);
    state.shortTermAccounts = accounts;
    state.shortTermSummary = buildShortTermSummary(accounts, data.summary || {});
    state.shortTermLoaded = true;
    if (state.selectedTrialDetailId && !accounts.some((account) => account.userId === state.selectedTrialDetailId || account.loginAccount === state.selectedTrialDetailId)) {
      state.selectedTrialDetailId = "";
      state.shortTermDetail = null;
      state.shortTermDetailError = "";
    }
  } catch (error) {
    state.shortTermError = error.message || "短期账号加载失败";
  } finally {
    state.shortTermLoading = false;
    if (state.view === "shortTerm" && state.authStage === "authenticated") render();
  }
}

async function loadShortTermDetail(target, force = false) {
  if (!target) {
    state.shortTermDetail = null;
    state.shortTermDetailError = "";
    return;
  }
  const currentDetail = state.shortTermDetail;
  if (!force && currentDetail && (currentDetail.userId === target || currentDetail.loginAccount === target)) return;
  if (state.shortTermDetailLoading) return;
  state.shortTermDetailLoading = true;
  state.shortTermDetailError = "";
  try {
    const clock = await loadTestClock();
    const statDate = encodeURIComponent(clock.currentDate || DATA.today);
    const data = await adminApiRequest(`/admin/short-term-accounts/${apiSegment(target)}?date=${statDate}`);
    const shortTermStudent = data.student || data.item || data.account || {};
    state.shortTermDetail = normalizeShortTermAccount({
      ...(data.formalDetail || shortTermStudent || data),
      ...shortTermStudent,
      userId: shortTermStudent.userId || data.formalDetail?.userId || target,
      loginAccount: shortTermStudent.loginAccount || data.formalDetail?.loginAccount || target,
      shortTermStatus: shortTermStudent.shortTermStatus || data.formalDetail?.shortTermStatus || "",
      trialExpiresAt: shortTermStudent.trialExpiresAt || data.formalDetail?.trialExpiresAt || "",
      paidUntil: data.formalDetail?.paidUntil || shortTermStudent.paidUntil || "",
      daysRemaining: shortTermStudent.daysRemaining || data.formalDetail?.daysRemaining || ""
    });
  } catch (error) {
    state.shortTermDetail = null;
    state.shortTermDetailError = error.message || "短期账号详情加载失败";
  } finally {
    state.shortTermDetailLoading = false;
    if (state.view === "shortTerm" && state.authStage === "authenticated") render();
  }
}

async function loadFormalCredential(force = false) {
  if (state.formalCredentialLoading) return;
  if (!force && state.formalCredentialLoaded && state.formalCredential) return;
  state.formalCredentialLoading = true;
  state.formalCredentialError = "";
  try {
    const adminUserId = encodeURIComponent(currentAdminUserId());
    const data = await adminApiRequest(`/admin/formal-accounts/next-preview?adminUserId=${adminUserId}`);
    state.formalCredential = data.credential || null;
    state.formalCredentialLoaded = true;
  } catch (error) {
    state.formalCredentialError = error.message || "正式号凭证加载失败";
  } finally {
    state.formalCredentialLoading = false;
    if (state.view === "activation") render();
  }
}

async function loadPendingFormalOnboarding(force = false) {
  if (state.pendingFormalOnboardingLoading) return;
  if (!force && state.pendingFormalOnboardingLoaded) return;
  state.pendingFormalOnboardingLoading = true;
  state.pendingFormalOnboardingError = "";
  try {
    const adminUserId = encodeURIComponent(currentAdminUserId());
    const data = await adminApiRequest(`/admin/formal-accounts/pending-onboarding?adminUserId=${adminUserId}`);
    state.pendingFormalOnboarding = data.items || [];
    state.pendingFormalOnboardingLoaded = true;
  } catch (error) {
    state.pendingFormalOnboardingError = error.message || "待填写资料账号加载失败";
  } finally {
    state.pendingFormalOnboardingLoading = false;
    if (state.view === "activation") render();
  }
}

async function refreshFormalCredential() {
  if (!state.formalCredential?.previewId) return;
  state.formalCredentialLoading = true;
  state.formalCredentialError = "";
  try {
    const data = await adminApiRequest("/admin/formal-accounts/next-preview/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adminUserId: currentAdminUserId(),
        previewId: state.formalCredential.previewId
      })
    });
    state.formalCredential = data.credential || null;
    state.formalCredentialLoaded = true;
    showToast("已刷新初始密码");
  } catch (error) {
    state.formalCredentialError = error.message || "刷新初始密码失败";
  } finally {
    state.formalCredentialLoading = false;
    render();
  }
}

async function activateFormalCredential(totpCode = "") {
  if (!state.formalCredential?.previewId) return;
  state.formalCredentialLoading = true;
  state.formalCredentialError = "";
  try {
    const data = await adminApiRequest("/admin/formal-accounts/activate-next", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adminUserId: currentAdminUserId(),
        previewId: state.formalCredential.previewId,
        totpCode
      })
    });
    if (data.requiresTotp) {
      state.formalTotpPrompt = {
        message: data.message || "本轮已开通 30 个正式学员，请输入动态码后继续。"
      };
      return;
    }
    state.formalActivationResult = data;
    state.formalTotpPrompt = null;
    state.formalCredential = data.nextFormalAccount ? null : state.formalCredential;
    state.formalCredentialLoaded = false;
    showToast(`已开通 ${data.activatedAccount}`);
    await loadPendingFormalOnboarding(true);
    await loadAdminConsoleDataIfNeeded(true);
  } catch (error) {
    state.formalCredentialError = error.message || "开通正式学员失败";
  } finally {
    state.formalCredentialLoading = false;
    render();
  }
}

async function copyFormalCredential() {
  if (!state.formalCredential) return;
  const text = [
    `账号：${state.formalCredential.loginAccount}`,
    `初始密码：${state.formalCredential.initialPassword}`
  ].join("\n");
  await copyText(text, "已复制账号和初始密码");
}

async function copyText(text, successMessage = "已复制") {
  if (!text) {
    showToast("当前没有可复制内容", "warn");
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMessage);
  } catch (error) {
    fallbackCopyText(text, successMessage);
  }
}

function fallbackCopyText(text, successMessage = "已复制") {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
  showToast(successMessage);
}

function renderAnnouncementRow(item) {
  const isHidden = item.status === "hidden";
  return `
    <article class="announcement-row">
      <div>
        <div class="cell-title">${escapeHtml(item.title)}</div>
        <p>${escapeHtml(item.content)}</p>
        ${item.imageUrl ? `<img class="announcement-admin-thumb" src="${escapeHtml(item.imageUrl)}" alt="" />` : ""}
        <div class="muted-text">${escapeHtml(item.publishedAt || "")} · ${isHidden ? "已下架" : "已发布"}</div>
      </div>
      ${isHidden ? "" : `<button class="secondary-button" type="button" data-announcement-hide="${escapeHtml(item.announcementId)}">下架</button>`}
    </article>
  `;
}

function renderAnnouncements() {
  setViewTitle("信息发布");
  const rows = state.announcements || [];
  root.innerHTML = `
    <section class="panel announcement-publisher">
      <div class="section-head">
        <div>
          <div class="eyebrow">Announcement</div>
          <h2 class="section-title">发布给已开通学生</h2>
          <p class="section-subtitle">公告永久有效；学生开通后也能看到历史公告。打开铃铛后自动已读。</p>
        </div>
      </div>
      <form class="announcement-form" data-announcement-submit>
        <label class="field-block">
          <span>公告标题</span>
          <input name="title" type="text" maxlength="80" placeholder="例如：今晚自习提醒" required />
        </label>
        <label class="field-block">
          <span>公告内容</span>
          <textarea name="content" maxlength="2000" rows="6" placeholder="输入要推送给学生的正文内容" required></textarea>
        </label>
        <label class="field-block">
          <span>公告图片</span>
          <input name="image" type="file" accept="image/jpeg,image/png,image/webp" data-announcement-image />
          <small>支持 JPG / PNG / WebP，单张不超过 1MB。建议尺寸 750 x 420px，最小建议 390 x 220px，最大建议 1500 x 840px，学生端会统一完整展示。</small>
        </label>
        <div class="announcement-image-preview" data-announcement-image-preview hidden></div>
        <div class="toolbar">
          <button class="primary-button" type="submit">发布公告</button>
          <span class="muted-text">${escapeHtml(state.announcementError || "")}</span>
        </div>
      </form>
    </section>

    <section class="panel">
      <div class="section-head">
        <div>
          <div class="eyebrow">History</div>
          <h2 class="section-title">发布记录</h2>
          <p class="section-subtitle">已下架公告不会再出现在学生端。</p>
        </div>
        <button class="secondary-button" type="button" data-announcement-refresh>刷新</button>
      </div>
      <div class="announcement-list">
        ${rows.length ? rows.map(renderAnnouncementRow).join("") : `<div class="empty-state">${state.announcementLoading ? "正在加载..." : "暂无公告"}</div>`}
      </div>
    </section>
  `;
  loadAnnouncementsIfNeeded();
}

function renderAdminOverview() {
  setViewTitle("运营总览");
  const students = DATA.students.filter((student) => student.role !== "teacher");
  const activeStudents = students.filter((student) => student.accountStatus === "active").length;
  const nextFormal = nextUnusedFormalAccount();
  const expired = adminDueRows().length;
  const soonDue = serviceSoonRows().length;
  root.innerHTML = `
    <section class="metric-grid">
      ${metric("活跃学生", activeStudents, "含正式号、短期号和测试号", "good")}
      ${metric("下一个未开通正式号", nextFormal?.loginAccount || "已用完", "正式号段 stu60001-stu99999", "info")}
      ${metric("到期待处理", expired, "短期号优先处理", "warn")}
      ${metric("7天内到期", soonDue, "只含正式号和测试号", "info")}
    </section>
    <section class="band">
      <div class="section-head">
        <div>
          <h2 class="section-title">今日后台待办</h2>
          <p class="section-subtitle">每个框只展示前 4 条，底部“查看全部”进入对应完整列表。</p>
        </div>
      </div>
      <div class="todo-grid">
        ${dashboardTodoCard("已到期待处理", adminDueRows(), "expiry", renderDueTodo)}
        ${dashboardTodoCard("7天内即将到期", serviceSoonRows(), "renewals", renderSoonDueTodo)}
        ${dashboardTodoCard("资料/账号异常", abnormalRows(), "abnormal", renderAbnormalTodo)}
        ${dashboardTodoCard("各班级未反馈人数", classFeedbackRows(), "feedback", renderClassFeedbackTodo)}
      </div>
    </section>
    <section class="band">
      <div class="section-head">
        <div>
          <h2 class="section-title">正式上线权限边界</h2>
          <p class="section-subtitle">前端可以隐藏按钮，但安全边界必须由后端 role 校验决定。</p>
        </div>
      </div>
      <div class="data-grid">
        <div class="data-card"><h3>管理员</h3><ul><li>账号、老师、班级、学生资料</li><li>正式号递增开通、短期号转正式</li><li>分班配置和操作日志</li></ul></div>
        <div class="data-card"><h3>教师</h3><ul><li>只看自己负责班级</li><li>查看今日反馈状态</li><li>复制未反馈学生 QQ</li></ul></div>
        <div class="data-card"><h3>学生</h3><ul><li>不能进入后台</li><li>继续使用手机端页面</li><li>只提交自己的计划反馈</li></ul></div>
      </div>
    </section>
  `;
}

function metric(label, value, note, cls = "") {
  return `
    <div class="metric ${cls}">
      <div class="metric-label">${escapeHtml(label)}</div>
      <div class="metric-value">${escapeHtml(value)}</div>
      <div class="metric-note">${escapeHtml(note)}</div>
    </div>
  `;
}

function isTrialExpiredForAdmin(student) {
  if (student.accountType !== "trial") return false;
  if (["deleted", "converted_to_formal"].includes(student.accountStatus)) return false;
  return student.accountStatus === "expired_pending_review" || Boolean(student.paidUntil && dayDiff(student.paidUntil) < 0);
}

function adminDueRows() {
  const trialExpired = DATA.students
    .filter((student) => isTrialExpiredForAdmin(student))
    .sort((a, b) => a.loginAccount.localeCompare(b.loginAccount));
  const formalExpired = DATA.students
    .filter((student) => isFormalLike(student) && student.paidUntil && dayDiff(student.paidUntil) < 0)
    .sort((a, b) => dayDiff(a.paidUntil) - dayDiff(b.paidUntil) || a.loginAccount.localeCompare(b.loginAccount));
  return [...trialExpired, ...formalExpired];
}

function serviceSoonRows() {
  return DATA.students
    .filter((student) => isFormalLike(student) && student.paidUntil && dayDiff(student.paidUntil) >= 0 && dayDiff(student.paidUntil) <= DATA.servicePolicy.soonDueDays)
    .sort((a, b) => dayDiff(a.paidUntil) - dayDiff(b.paidUntil) || a.loginAccount.localeCompare(b.loginAccount));
}

function abnormalReasons(student) {
  const reasons = [];
  const info = classInfo(student.classId);
  if (student.accountType === "public_demo") return reasons;
  if (!student.contactQQ) reasons.push("缺少个人QQ");
  if (!student.classId) reasons.push("未分班");
  if (student.classId && !info) reasons.push("班级不存在");
  if (info && !info.qqGroupNumber) reasons.push("班级缺QQ群");
  if (info && !info.teacherId) reasons.push("班级缺老师");
  if (!["active", "expired_pending_review"].includes(student.accountStatus)) reasons.push(statusLabel(student.accountStatus)[0]);
  if (isFormalLike(student) && student.paidUntil && dayDiff(student.paidUntil) < 0 && student.accountStatus === "active") reasons.push("服务期已过仍启用");
  if (student.todayStatus === "abnormal") reasons.push(...student.flags);
  return [...new Set(reasons.filter(Boolean))];
}

function abnormalRows() {
  return DATA.students
    .map((student) => ({ student, reasons: abnormalReasons(student) }))
    .filter((row) => row.reasons.length)
    .sort((a, b) => a.student.loginAccount.localeCompare(b.student.loginAccount));
}

function classFeedbackRows() {
  return DATA.classes
    .map((item) => {
      const students = DATA.students.filter((student) => student.classId === item.classId && student.accountType !== "public_demo");
      const unsubmittedCount = students.filter((student) => student.todayStatus === "unsubmitted").length;
      return {
        ...item,
        studentCount: students.length,
        unsubmittedCount
      };
    })
    .filter((item) => item.studentCount > 0)
    .sort((a, b) => b.unsubmittedCount - a.unsubmittedCount || a.classId.localeCompare(b.classId));
}

function dashboardTodoCard(title, rows, jumpView, renderRow) {
  return `
    <div class="todo-card">
      <div class="todo-head">
        <span>${escapeHtml(title)}</span>
        <span class="tag">${rows.length}</span>
      </div>
      <div class="todo-body">
        ${rows.length ? rows.slice(0, 4).map(renderRow).join("") : `<div class="empty-state"><div class="empty-title">暂无</div></div>`}
      </div>
      <button class="todo-footer" type="button" data-jump="${escapeHtml(jumpView)}">查看全部</button>
    </div>
  `;
}

function renderDueTodo(student) {
  const type = student.accountType === "trial" ? "短期号过期" : "服务已过期";
  const date = student.accountType === "trial" ? student.trialExpiresAt : student.paidUntil;
  return `
    <div class="todo-row">
      <div class="todo-main">
        <span class="cell-title">${escapeHtml(student.loginAccount)}</span>
        ${tag(student.accountType)} ${testTag(student)}
      </div>
      <div class="cell-sub">${escapeHtml(student.nickname)} · ${escapeHtml(className(student.classId))}</div>
      <div class="todo-meta">${escapeHtml(type)} · ${escapeHtml(date || "-")}</div>
    </div>
  `;
}

function renderSoonDueTodo(student) {
  const diff = dayDiff(student.paidUntil);
  const label = diff === 0 ? "今天到期" : `剩 ${diff} 天`;
  return `
    <div class="todo-row">
      <div class="todo-main">
        <span class="cell-title">${escapeHtml(student.loginAccount)}</span>
        <span class="tag amber">${escapeHtml(label)}</span> ${testTag(student)}
      </div>
      <div class="cell-sub">${escapeHtml(student.nickname)} · ${escapeHtml(className(student.classId))}</div>
      <div class="todo-meta">服务期 ${escapeHtml(student.paidUntil)}</div>
    </div>
  `;
}

function renderAbnormalTodo(row) {
  const student = row.student;
  return `
    <div class="todo-row">
      <div class="todo-main">
        <span class="cell-title">${escapeHtml(student.loginAccount)}</span>
        ${testTag(student)}
      </div>
      <div class="cell-sub">${escapeHtml(student.nickname)} · ${escapeHtml(className(student.classId))}</div>
      <div class="todo-meta">${escapeHtml(row.reasons.slice(0, 2).join("、"))}</div>
    </div>
  `;
}

function renderClassFeedbackTodo(item) {
  return `
    <div class="todo-row">
      <div class="todo-main">
        <span class="cell-title">${escapeHtml(item.classId)}</span>
        ${item.isTestClass ? `<span class="tag purple">测试班</span>` : ""}
      </div>
      <div class="cell-sub">${escapeHtml(item.className)} · ${escapeHtml(teacherName(item.teacherId))}</div>
      <div class="todo-meta">未反馈 ${item.unsubmittedCount} / 总人数 ${item.studentCount}</div>
    </div>
  `;
}

function adminTodoColumn(title, rows) {
  return `
    <div class="status-column">
      <div class="status-head"><span>${escapeHtml(title)}</span><span class="tag">${rows.length}</span></div>
      ${rows.length ? rows.slice(0, 4).map((row) => `
        <div class="student-card">
          <div class="student-card-title">
            <span>${escapeHtml(row.nickname || row.userId)}</span>
            <span class="tag amber">${escapeHtml(row.userId)}</span>
          </div>
          <div class="student-card-meta">${escapeHtml((row.flags || []).join("、") || "待查看")}</div>
        </div>
      `).join("") : `<div class="empty-state"><div class="empty-title">暂无</div></div>`}
    </div>
  `;
}

function classUnsubmitted(classId) {
  return DATA.students.filter((student) => student.classId === classId && student.todayStatus === "unsubmitted").length;
}

function renderAccounts() {
  setViewTitle("账号总览");
  const rows = filteredAccountRows();
  const visibleRows = paginateRows("accounts", rows);
  root.innerHTML = `
    <section class="band">
      <div class="section-head">
        <div>
          <h2 class="section-title">账号总览</h2>
          <p class="section-subtitle">账号总览只查看和筛选，不放开通、清理、迁移或导出入口，避免列表页变成高风险操作区。</p>
        </div>
      </div>
      <div class="toolbar">
        <div class="filters">
          ${accountFilterSelect("role", [["all", "全部角色"], ["student", "学生"], ["teacher", "老师"], ["admin", "管理员"]])}
          ${accountFilterSelect("accountType", accountTypeOptionsForRole(state.accountFilters.role))}
          ${accountFilterSelect("accountStatus", [["all", "全部状态"], ["active", "启用"], ["disabled", "停用/未开通"], ["deactivated", "已停用"], ["expired_pending_review", "到期待处理"], ["converted_to_formal", "已转正式"], ["archived", "已归档"], ["deleted", "已删除"]])}
        </div>
        <div class="toolbar-meta">共 ${rows.length} 个账号 · 按账号名升序</div>
      </div>
      ${table(["账号", "角色", "账号类型", "状态", "班级/负责班级", "个人QQ", "开通/到期"], visibleRows.map((row) => [
        accountCell(row),
        roleText(row.role),
        row.role === "student" ? tag(row.accountType) : `<span class="tag blue">${escapeHtml(row.accountType)}</span>`,
        tag(row.accountStatus),
        row.classId || "-",
        row.contactQQ || "-",
        `${row.activatedAt || "-"}<div class="cell-sub">${row.trialExpiresAt || ""}</div>`
      ]))}
      ${renderPagination("accounts", rows)}
    </section>
  `;
}

function accountCell(row) {
  return `
    <div class="cell-main">
      ${row.role === "student" ? avatar(row) : `<span class="avatar-initial">${escapeHtml(row.nickname.slice(0, 1))}</span>`}
      <div>
        <div class="cell-title">${escapeHtml(row.loginAccount)}</div>
        <div class="cell-sub">${escapeHtml(row.nickname || row.userId)}</div>
      </div>
    </div>
  `;
}

function roleText(role) {
  const labels = { admin: "管理员", teacher: "老师", student: "学生" };
  return labels[role] || role;
}

function table(headers, rows) {
  if (!rows.length) return document.getElementById("emptyStateTemplate").innerHTML;
  return `
    <div class="table-wrap">
      <table>
        <thead><tr>${headers.map((item) => `<th>${escapeHtml(item)}</th>`).join("")}</tr></thead>
        <tbody>
          ${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function paginationState(key) {
  if (!state.pagination[key]) {
    state.pagination[key] = { page: 1, pageSize: DEFAULT_PAGE_SIZE };
  }
  return state.pagination[key];
}

function paginationTotalPages(rows, pageSize) {
  if (!rows.length) return 1;
  return Math.max(1, Math.ceil(rows.length / pageSize));
}

function clampPaginationPage(page, totalPages) {
  const parsed = Number.parseInt(page, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(parsed, totalPages);
}

function paginateRows(key, rows) {
  const pageState = paginationState(key);
  const totalPages = paginationTotalPages(rows, pageState.pageSize);
  pageState.page = clampPaginationPage(pageState.page, totalPages);
  const start = (pageState.page - 1) * pageState.pageSize;
  return rows.slice(start, start + pageState.pageSize);
}

function renderPagination(key, rows) {
  const pageState = paginationState(key);
  if (rows.length <= pageState.pageSize) return "";
  const totalPages = paginationTotalPages(rows, pageState.pageSize);
  pageState.page = clampPaginationPage(pageState.page, totalPages);
  const start = (pageState.page - 1) * pageState.pageSize + 1;
  const end = Math.min(rows.length, pageState.page * pageState.pageSize);
  const prevDisabled = pageState.page <= 1 ? "disabled" : "";
  const nextDisabled = pageState.page >= totalPages ? "disabled" : "";
  return `
    <div class="pagination-footer" data-pagination-key="${escapeHtml(key)}">
      <div class="pagination-summary">共 ${rows.length} 条 · 当前 ${start}-${end} 条 · 第 ${pageState.page}/${totalPages} 页</div>
      <div class="pagination-controls">
        <button class="secondary-button" type="button" data-page-key="${escapeHtml(key)}" data-page-action="prev" ${prevDisabled}>上一页</button>
        <label class="pagination-jump">跳到
          <input class="pagination-input" type="number" min="1" max="${totalPages}" value="${pageState.page}" data-page-key="${escapeHtml(key)}" data-page-input />
        </label>
        <button class="secondary-button" type="button" data-page-key="${escapeHtml(key)}" data-page-action="next" ${nextDisabled}>下一页</button>
      </div>
    </div>
  `;
}

function resetPagination(key) {
  paginationState(key).page = 1;
}

function resetAllPagination() {
  PAGINATED_PAGE_KEYS.forEach(resetPagination);
}

function setPaginationPage(key, page) {
  paginationState(key).page = page;
}

function enabledClassRows() {
  return DATA.classes.filter((item) => item.classStatus !== "disabled" && item.classStatus !== "archived");
}

function teacherClassTags(teacher) {
  if (!teacher.classes.length) return "-";
  return `<div class="class-tag-wrap">${teacher.classes.map((id) => `<span class="tag blue">${escapeHtml(id)}</span>`).join("")}</div>`;
}

function teacherPasswordStatus(teacher) {
  if (!teacher.passwordResetAt) return `<span class="tag">未重置</span>`;
  return `<span class="tag amber">临时密码已生成</span><div class="cell-sub">${escapeHtml(teacher.passwordResetAt)}</div>`;
}

function studentPasswordStatus(student) {
  if (!student.passwordResetAt) return "未重置";
  return `临时密码已生成 · ${student.passwordResetAt}`;
}

function resetPasswordMatches(target = "") {
  if (!state.lastResetPassword) return false;
  if (!target) return true;
  return [
    state.lastResetPassword.target,
    state.lastResetPassword.userId,
    state.lastResetPassword.loginAccount
  ].filter(Boolean).includes(target);
}

function renderResetPasswordResult(target = "") {
  if (!resetPasswordMatches(target)) return "";
  const item = state.lastResetPassword;
  return `
    <div class="notice reset-password-result" style="margin-top:12px">
      <div class="cell-title">临时密码：<code>${escapeHtml(item.password)}</code></div>
      <div class="cell-sub">${escapeHtml(item.loginAccount || item.target)} · ${escapeHtml(item.resetAt || "")}</div>
      <button class="secondary-button" type="button" data-copy-reset-password="${escapeHtml(item.password)}">复制密码</button>
    </div>
  `;
}

function renderTeacherCreationResult() {
  const result = state.teacherCreationResult;
  if (!result) return "";
  return `
    <div class="notice reset-password-result" style="margin-bottom:12px">
      <div class="cell-title">已创建老师账号：${escapeHtml(result.loginAccount || "")}</div>
      <div class="cell-sub">${escapeHtml(result.nickname || "")} · 初始密码：<code>${escapeHtml(result.initialPassword || "")}</code></div>
      <button class="secondary-button" type="button" data-copy-teacher-password="${escapeHtml(result.initialPassword || "")}">复制密码</button>
    </div>
  `;
}

function renderTeacherResetPasswordResult() {
  if (state.lastResetPassword?.actionKey !== "reset_teacher_password") return "";
  return renderResetPasswordResult();
}

function classFilterSelect(key, options) {
  const selected = state.classFilters[key] || "all";
  return `
    <select class="filter-select" data-class-filter="${escapeHtml(key)}">
      ${options.map(([value, label]) => `<option value="${escapeHtml(value)}" ${value === selected ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
    </select>
  `;
}

function filteredClassRows() {
  const filters = state.classFilters;
  return DATA.classes
    .filter(matchesSearch)
    .filter((item) => filters.mathType === "all" || item.mathType === filters.mathType)
    .filter((item) => filters.level === "all" || item.level === filters.level)
    .sort((a, b) => a.classId.localeCompare(b.classId, undefined, { numeric: true, sensitivity: "base" }));
}

function renderTeachers() {
  setViewTitle("老师管理");
  const rows = DATA.teachers.filter(matchesSearch);
  root.innerHTML = `
    <section class="band">
      <div class="section-head">
        <div>
          <h2 class="section-title">老师账号与负责班级</h2>
          <p class="section-subtitle">第一版一个班级只归属一个主负责老师，未来再扩多老师带班表。</p>
        </div>
        ${actionButton("新增老师", "add_teacher", "", "primary-button")}
      </div>
      ${renderTeacherCreationResult()}
      ${renderTeacherResetPasswordResult()}
      ${table(["老师", "状态", "负责班级", "联系QQ", "最近登录", "密码状态", "操作"], rows.map((teacher) => [
        accountCell({ ...teacher, role: "teacher", accountType: "teacher", accountStatus: teacher.status }),
        tag(teacher.status),
        teacherClassTags(teacher),
        teacher.contactQQ,
        teacher.lastLoginAt,
        teacherPasswordStatus(teacher),
        `${actionButton("分配班级", "assign_teacher_class", teacher.userId)} ${actionButton("修改状态", "modify_teacher_status", teacher.userId)} ${actionButton("重置密码", "reset_teacher_password", teacher.userId)}`
      ]))}
    </section>
  `;
}

function renderClasses() {
  setViewTitle("班级管理");
  const rows = filteredClassRows();
  root.innerHTML = `
    <section class="band">
      <div class="section-head">
        <div>
          <h2 class="section-title">班级、QQ群与老师权限边界</h2>
          <p class="section-subtitle">教师端权限从 class.teacher_user_id 推导，不能信任前端传入 teacher_id。</p>
        </div>
        ${actionButton("新增班级", "add_class", "", "primary-button")}
      </div>
      <div class="toolbar">
        <div class="filters">
          ${classFilterSelect("mathType", [["all", "全部数学"], ["数学一", "数学一"], ["数学二", "数学二"], ["数学三", "数学三"]])}
          ${classFilterSelect("level", [["all", "全部班型"], ["A", "A班"], ["B", "B班"], ["C", "C班"], ["D", "D班"]])}
        </div>
        <div class="toolbar-meta">共 ${rows.length} 个班级</div>
      </div>
      ${table(["班级", "数学/班型", "负责老师", "QQ群", "容量", "接收新生", "测试班", "操作"], rows.map((item) => [
        `<div class="cell-title">${escapeHtml(item.classId)}</div><div class="cell-sub">${escapeHtml(item.className)}</div>`,
        `${escapeHtml(item.mathType)} · ${escapeHtml(item.level)}`,
        teacherName(item.teacherId),
        item.qqGroupNumber,
        `${item.activeStudents}/${item.capacity}`,
        item.isAcceptingNewStudents ? tag("active") : tag("disabled"),
        item.isTestClass ? `<span class="tag purple">测试班</span>` : `<span class="tag green">真实运营</span>`,
        actionButton("编辑", "edit_class", item.classId)
      ]))}
    </section>
  `;
}

function renderExportJobsPanel() {
  if (!state.exportJobs.length) return "";
  return `
    <div class="notice" style="margin-bottom:12px">
      <div class="cell-title">导出任务</div>
      <div class="timeline">
        ${state.exportJobs.map((job) => `
          <div class="timeline-item">
            <div class="timeline-time">${escapeHtml(job.createdAt)}</div>
            <div>
              <div class="cell-title">${escapeHtml(job.jobId)} · ${escapeHtml(job.status)}</div>
              <div class="cell-sub">范围：${escapeHtml(job.scope)}；记录数：${job.rowCount}；过期时间：${escapeHtml(job.expiresAt)}</div>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderStudents() {
  setViewTitle("学生管理");
  const rows = DATA.students.filter((student) => student.accountType !== "public_demo").filter(matchesSearch);
  const visibleRows = paginateRows("students", rows);
  const selected = state.selectedStudentId
    ? DATA.students.find((student) => student.userId === state.selectedStudentId)
    : null;
  root.innerHTML = `
    <section class="layout-two">
      <div class="band">
        <div class="section-head">
          <div>
            <h2 class="section-title">学生列表</h2>
            <p class="section-subtitle">管理员可修改学生资料；老师端只读，不能改班级、账号和计划。</p>
          </div>
          ${actionButton("批量导出", "export_students")}
        </div>
        <div class="toolbar">
          <div class="filters">
            <select class="filter-select"><option>全部班级</option><option>A201</option><option>B201</option></select>
            <select class="filter-select"><option>全部状态</option><option>未反馈</option><option>已完成</option><option>异常</option></select>
            <select class="filter-select"><option>全部账号类型</option><option>正式号</option><option>短期号</option></select>
          </div>
        </div>
        ${renderExportJobsPanel()}
        ${table(["学生", "账号类型", "账号状态", "班级", "教师", "今日状态", "目标分", "操作"], visibleRows.map((student) => [
          accountCell({ ...student, role: "student" }),
          tag(student.accountType),
          tag(student.accountStatus),
          student.classId || "-",
          teacherName(classTeacherId(student.classId)),
          tag(student.todayStatus),
          String(student.targetScore),
          `<button class="secondary-button" type="button" data-select-student="${escapeHtml(student.userId)}">查看详情</button>`
        ]))}
        ${renderPagination("students", rows)}
      </div>
      ${studentDetail(selected)}
    </section>
  `;
}

function studentDetail(student) {
  if (!student) return studentEmptyDetail();
  const currentTypeLabel = typeOptionLabel(student.currentTypeId, student.openTypeName);
  return `
    <aside class="detail-panel">
      <div class="section-head">
        <div>
          <h2 class="section-title">${escapeHtml(student.nickname)}</h2>
          <p class="section-subtitle">${escapeHtml(student.loginAccount)} · ${escapeHtml(student.classId || "未分班")}</p>
        </div>
        ${tag(student.accountType)}
      </div>
      <div class="detail-list">
        ${detailRow("个人 QQ", student.contactQQ || "缺少")}
        ${detailRow("账号状态", statusLabel(student.accountStatus)[0])}
        ${detailRow("今日状态", statusLabel(student.todayStatus)[0])}
        ${detailRow("今日题型指针", currentTypeLabel)}
        ${detailRow("服务到期时间", student.paidUntil || "不适用")}
        ${detailRow("密码状态", studentPasswordStatus(student))}
        ${detailRow("习题册", formatPrimaryBookSummary(student))}
        ${detailRow("复习顺序", reviewOrderLabel(student.reviewOrder))}
      </div>
      <div class="form-grid">
        ${studentSelectField("班型", "level", [["A", "A班"], ["B", "B班"], ["C", "C班"], ["D", "D班"]], student.level)}
        ${studentSelectField("班级", "classId", studentClassOptions(student.level, student.mathType), student.classId)}
        ${studentSelectField("数学类型", "mathType", [["数学一", "数学一"], ["数学二", "数学二"], ["数学三", "数学三"]], student.mathType)}
        <label class="field">目标分<input data-student-field="targetScore" value="${escapeHtml(student.targetScore)}" /></label>
        <label class="field">可联系 QQ<input data-student-field="contactQQ" value="${escapeHtml(student.contactQQ)}" placeholder="缺少 QQ 时填写" /></label>
        <label class="field">服务到期时间<input data-student-field="paidUntil" value="${escapeHtml(student.paidUntil)}" /></label>
        ${studentSelectField("复习顺序", "reviewOrder", [["gaoshu_first", "先高数后线代"], ["mixed", "高数线代穿插"]], student.reviewOrder || "mixed")}
        ${studentBookFields(student)}
        ${studentSelectField("明日起点章节", "nextPlanStartChapterId", [["", "不覆盖，按系统指针生成"], ...chapterStartOptions()], student.nextPlanStartChapterId || "")}
        <label class="field">每日目标时长（h）<input data-student-field="dailyMathGoalHours" value="${escapeHtml(student.dailyMathGoalHours || 3)}" inputmode="decimal" /></label>
      </div>
      <div class="notice warn" style="margin-top:12px">明日起点章节只影响下一次生成计划；选择后，旧的未完成/拆分遗留题将不再自动延续。修改主选习题册会立即重生成今日未提交计划；已提交题型保留。</div>
      <div class="action-row">
        ${actionButton("保存修改", "save_student", student.userId, "primary-button")}
        ${actionButton("重置密码", "reset_student_password", student.userId)}
      </div>
      ${student.userId ? `
        <div class="action-row">
          <a class="secondary-button" href="${studentWrongQuestionExportUrl(student)}" data-wrong-question-export download>导出错题清单</a>
        </div>
      ` : ""}
      ${renderResetPasswordResult(student.userId)}
      <div class="notice warn" style="margin-top:12px">正式账号不能被清理、复用或被短期号覆盖；改班级、改服务期、改明日计划起点、重置密码必须写审计日志。</div>
    </aside>
  `;
}

function studentEmptyDetail() {
  return `
    <aside class="detail-panel empty-detail">
      <div class="empty-state">
        <div class="empty-title">请选择左侧学生</div>
        <div class="empty-copy">点击学生列表中的“查看详情”后，这里再显示个人资料、习题册和明日计划起点设置。</div>
      </div>
    </aside>
  `;
}

function studentSelectField(label, field, options, selectedValue = "") {
  return `
    <label class="field">${escapeHtml(label)}
      <select data-student-field="${escapeHtml(field)}">
        ${options.map(([value, text]) => `<option value="${escapeHtml(value)}" ${value === selectedValue ? "selected" : ""}>${escapeHtml(text)}</option>`).join("")}
      </select>
    </label>
  `;
}

function chapterStartOptions() {
  const options = Array.isArray(DATA.chapterOptions) && DATA.chapterOptions.length
    ? DATA.chapterOptions
    : state.chapterOptions;
  return (options || []).map((item) => [
    item.chapterId || item.chapter_id || "",
    item.chapterName || item.chapter_name || item.chapterId || item.chapter_id || ""
  ]).filter(([value]) => value);
}

function studentClassOptions(level, mathType = "") {
  const rows = DATA.classes
    .filter((item) => !item.isTestClass)
    .filter((item) => !level || item.level === level)
    .filter((item) => !mathType || item.mathType === mathType)
    .sort((a, b) => a.classId.localeCompare(b.classId, undefined, { numeric: true, sensitivity: "base" }));
  return rows.map((item) => [item.classId, item.classId]);
}

function publicExerciseBookOptions() {
  return PUBLIC_EXERCISE_BOOK_OPTIONS.map((item) => [item.value, item.label]);
}

function primaryBookOptionsFor(student, slot) {
  const bookOptions = publicExerciseBookOptions();
  const currentValue = slot === "primaryBook1" ? student.primaryBooks[0] : student.primaryBooks[1];
  const otherValue = slot === "primaryBook1" ? student.primaryBooks[1] : student.primaryBooks[0];
  const currentCode = legacyPrimaryBookCode(currentValue);
  const otherCode = legacyPrimaryBookCode(otherValue);
  return bookOptions.filter(([value]) => {
    const valueCode = legacyPrimaryBookCode(value);
    return valueCode === currentCode || valueCode !== otherCode;
  });
}

function legacyPrimaryBookCode(book) {
  const value = String(book || "").trim();
  if (value.length > 3 && value[0] === "m" && /\d/.test(value[1]) && value[2] === "_") {
    return value.slice(3);
  }
  const cleaned = value.replace(/^《|》$/g, "");
  return BOOK_CODE_ALIASES.get(cleaned) || cleaned.replace(/题$/, "");
}

function isScopedPrimaryBook(book) {
  return SCOPED_PRIMARY_BOOK_CODES.has(legacyPrimaryBookCode(book));
}

function normalizedPrimaryBookScope(book, scope = "") {
  if (!isScopedPrimaryBook(book)) return "all";
  return PRIMARY_BOOK_SCOPE_LABELS[scope] ? scope : "both";
}

function primaryBookScopeValue(student, slot) {
  const index = Number(slot) - 1;
  const book = student.primaryBooks[index] || "";
  const scopes = Array.isArray(student.primaryBookScopes) ? student.primaryBookScopes : [];
  return normalizedPrimaryBookScope(book, scopes[index]);
}

function primaryBookScopeField(student, slot) {
  const index = Number(slot) - 1;
  const book = student.primaryBooks[index] || "";
  if (!book) return "";
  if (!isScopedPrimaryBook(book)) {
    return `<label class="field">题目范围 ${slot}<input value="该习题册默认布置全部题目" readonly /></label>`;
  }
  return studentSelectField(`题目范围 ${slot}`, PRIMARY_BOOK_SCOPE_FIELDS[index], PRIMARY_BOOK_SCOPE_OPTIONS, primaryBookScopeValue(student, slot));
}

function primaryBookPayload(slot) {
  const book = studentFieldValue(`primaryBook${slot}`);
  if (!book) return null;
  const scopeField = PRIMARY_BOOK_SCOPE_FIELDS[Number(slot) - 1];
  return {
    book,
    scope: normalizedPrimaryBookScope(book, studentFieldValue(scopeField))
  };
}

function formatPrimaryBookSummary(student) {
  const scopes = Array.isArray(student.primaryBookScopes) ? student.primaryBookScopes : [];
  const primary = (student.primaryBooks || [])
    .filter(Boolean)
    .map((book, index) => {
      const scope = normalizedPrimaryBookScope(book, scopes[index]);
      const scopeText = PRIMARY_BOOK_SCOPE_SHORT_LABELS[scope];
      return scopeText ? `${book}（${scopeText}）` : book;
    })
    .join("、") || "-";
  return `${primary} / 备选 ${student.backupBook || "-"}`;
}

function studentBookFields(student) {
  const backupBookOptions = publicExerciseBookOptions();
  return `
    ${studentSelectField("主选习题册 1", "primaryBook1", primaryBookOptionsFor(student, "primaryBook1"), student.primaryBooks[0] || "")}
    ${primaryBookScopeField(student, 1)}
    ${studentSelectField("主选习题册 2", "primaryBook2", [["", "不选"], ...primaryBookOptionsFor(student, "primaryBook2")], student.primaryBooks[1] || "")}
    ${primaryBookScopeField(student, 2)}
    ${studentSelectField("备选习题册", "backupBook", backupBookOptions, student.backupBook || "")}
  `;
}

function typeOptionLabel(typeId, fallbackName = "") {
  const option = DATA.questionTypeOptions.find(([id]) => id === typeId);
  if (option) return `${option[0]} ${option[1]}`;
  return typeId ? `${typeId} ${fallbackName}`.trim() : "无";
}

function detailRow(key, value) {
  return `<div class="detail-row"><div class="detail-key">${escapeHtml(key)}</div><div class="detail-value">${escapeHtml(value)}</div></div>`;
}

function reviewOrderLabel(value) {
  return value === "gaoshu_first" ? "先高数后线代" : "高数线代穿插";
}

function renderActivation() {
  setViewTitle("账号开通");
  const credential = state.formalCredential;
  const disabled = state.formalCredentialLoading ? "disabled" : "";
  const password = credential?.initialPassword || "等待加载";
  if (!state.formalCredentialLoaded && !state.formalCredentialLoading) {
    loadFormalCredential();
  }
  if (!state.pendingFormalOnboardingLoaded && !state.pendingFormalOnboardingLoading) {
    loadPendingFormalOnboarding();
  }
  root.innerHTML = `
    <section class="band">
      <div class="section-head">
        <div>
          <h2 class="section-title">开通正式学员</h2>
          <p class="section-subtitle">管理员确认开通后，学生用这里的账号和初始密码登录，并在首次资料填写页重置 8 位新密码。</p>
        </div>
        <button class="secondary-button" type="button" data-formal-load ${disabled}>刷新预览</button>
      </div>
      <div class="layout-two">
        <div class="formal-account-card">
          <div class="formal-card-head">
            <div>
              <div class="eyebrow">Next Formal Account</div>
              <h3>下一个预计开通账号</h3>
            </div>
            <span class="tag green">${state.formalCredentialLoading ? "加载中" : "可开通"}</span>
          </div>
          ${state.formalCredentialError ? `<div class="notice danger">${escapeHtml(state.formalCredentialError)}</div>` : ""}
          <div class="formal-credential-grid">
            <div class="formal-credential-box">
              <span>学生账号</span>
              <strong>${escapeHtml(credential?.loginAccount || "正在生成")}</strong>
            </div>
            <div class="formal-credential-box password">
              <span>初始密码</span>
              <strong>${escapeHtml(password)}</strong>
            </div>
          </div>
          <div class="formal-meta">
            <span>预览有效期：${escapeHtml(credential?.expiresAt || "生成后 30 分钟")}</span>
            <span>账号段：stu60001-stu99999</span>
          </div>
          <div class="formal-actions">
            <button class="secondary-button" type="button" data-formal-copy ${credential ? "" : "disabled"}>复制账号密码</button>
            <button class="secondary-button" type="button" data-formal-refresh-password ${credential ? disabled : "disabled"}>刷新初始密码</button>
            <button class="primary-button" type="button" data-formal-activate ${credential ? disabled : "disabled"}>开通正式学员</button>
          </div>
          ${state.formalActivationResult ? `
            <div class="notice">
              已开通 ${escapeHtml(state.formalActivationResult.activatedAccount)}。学生首次登录后会进入资料填写页，完成后自动分配班级、头像和备考配置。
            </div>
          ` : ""}
        </div>
        <aside class="detail-panel">
          <h2 class="section-title">开通写入规则</h2>
          <div class="detail-list">
            ${detailRow("正式号来源", "后端事务内计算并锁定下一个 stu60001+")}
            ${detailRow("初始密码", "预览时生成，开通后学生可用")}
            ${detailRow("首次资料", "必须填写资料并重置 8 位新密码")}
            ${detailRow("动态码门槛", "每开通 30 个正式学员后验证一次")}
          </div>
          <div class="notice">学生开通但尚未填写资料时，登录会被强制引导到首次资料填写页，不会进入普通学生首页。</div>
        </aside>
      </div>
      ${renderPendingFormalOnboarding()}
    </section>
    ${renderFormalTotpPrompt()}
  `;
}

function renderPendingFormalOnboarding() {
  if (state.pendingFormalOnboardingLoading) {
    return `<div class="formal-pending-panel"><div class="notice">正在加载待填写资料账号...</div></div>`;
  }
  if (state.pendingFormalOnboardingError) {
    return `<div class="formal-pending-panel"><div class="notice danger">${escapeHtml(state.pendingFormalOnboardingError)}</div></div>`;
  }
  const items = state.pendingFormalOnboarding || [];
  if (!items.length) {
    return `
      <div class="formal-pending-panel">
        <div class="formal-pending-head">
          <div>
            <h3>已开通待填写资料</h3>
            <p>暂无学生卡在首次资料填写前。</p>
          </div>
        </div>
      </div>
    `;
  }
  return `
    <div class="formal-pending-panel">
      <div class="formal-pending-head">
        <div>
          <h3>已开通待填写资料</h3>
          <p>这些账号已经开通，但学生还没完成首次资料填写，初始密码仍可在这里找回。</p>
        </div>
        <span class="tag">${items.length} 条</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>账号</th>
              <th>初始密码</th>
              <th>开通时间</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item) => `
              <tr>
                <td><strong>${escapeHtml(item.loginAccount)}</strong></td>
                <td><code>${escapeHtml(item.initialPassword)}</code></td>
                <td>${escapeHtml(item.activatedAt || "-")}</td>
                <td><span class="tag amber">待填写资料</span></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderFormalTotpPrompt() {
  if (!state.formalTotpPrompt) return "";
  return `
    <div class="formal-totp-backdrop">
      <form class="formal-totp-panel" data-formal-totp-form>
        <div class="eyebrow">TOTP Required</div>
        <h2>需要管理员动态码</h2>
        <p>${escapeHtml(state.formalTotpPrompt.message)}</p>
        <label class="field full">动态码
          <input name="totpCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="输入 6 位动态码" required />
        </label>
        <div class="modal-actions">
          <button class="secondary-button" type="button" data-formal-totp-cancel>取消</button>
          <button class="primary-button" type="submit">验证并开通</button>
        </div>
      </form>
    </div>
  `;
}

function shortTermTabButton(tab, label, count) {
  return `<button class="${state.shortTermTab === tab ? "is-active" : ""}" type="button" data-short-term-tab="${escapeHtml(tab)}">${escapeHtml(label)} ${count}</button>`;
}

function shortTermStatusText(account) {
  const labels = {
    pending_onboarding: ["待首填", "amber"],
    active_trial: ["试用中", "green"],
    expiring_soon: ["即将到期", "amber"],
    expired_pending_review: ["已到期待处理", "red"],
    migrated_to_formal: ["已转正式", "green"],
    deactivated: ["已停用", "red"]
  };
  const status = account?.shortTermStatus || "";
  if (labels[status]) return labels[status];
  const tab = shortTermTabForAccount(account);
  if (tab === "pending") return labels.pending_onboarding;
  if (tab === "expired") return labels.expired_pending_review;
  if (tab === "history") return labels.deactivated;
  return labels.active_trial;
}

function shortTermStatusTag(account) {
  const [label, cls] = shortTermStatusText(account);
  return `<span class="tag ${cls}">${escapeHtml(label)}</span>`;
}

function shortTermRemainingTag(account) {
  const expiry = account?.trialExpiresAt || account?.paidUntil || "";
  if (!expiry) return `<span class="tag amber">待首填后开始计时</span>`;
  const diff = dayDiff(expiry);
  if (shortTermTabForAccount(account) === "expired") {
    return `<span class="tag red">已过期 ${escapeHtml(Math.abs(diff))} 天</span>`;
  }
  if (diff === 0) return `<span class="tag amber">今日到期</span>`;
  if (diff > 0) return `<span class="tag amber">剩余 ${escapeHtml(diff)} 天</span>`;
  return `<span class="tag green">服务中</span>`;
}

function shortTermActionButtons(account) {
  const target = account.userId || account.loginAccount;
  const actions = [actionButton("查看详情", "view_trial", target)];
  if (shortTermTabForAccount(account) === "expired") {
    actions.push(actionButton("转为正式号", "migrate_trial", target, "primary-button"));
    actions.push(actionButton("停用", "deactivate_short_term_account", target, "danger-button"));
  }
  return actions.join(" ");
}

function renderShortTermLifecyclePanel(student) {
  const target = student?.userId || student?.loginAccount || "";
  const targetFormal = state.shortTermSummary?.nextConversionAccount || nextTrialConversionFormalAccount()?.loginAccount || "";
  const canReview = shortTermTabForAccount(student) === "expired";
  return `
    <section class="detail-panel trial-detail-panel">
      <div class="section-head">
        <div>
          <h2 class="section-title">短期账号生命周期</h2>
          <p class="section-subtitle">${escapeHtml(student?.loginAccount || "")} 路 ${escapeHtml(student?.nickname || "")}</p>
        </div>
        ${shortTermStatusTag(student)}
      </div>
      <div class="detail-list">
        ${detailRow("短期状态", shortTermStatusText(student)[0])}
        ${detailRow("试用到期", student?.trialExpiresAt || student?.paidUntil || "-")}
        ${detailRow("今日状态", statusLabel(student?.todayStatus)[0])}
        ${detailRow("转正目标号", targetFormal || "暂无可用目标号")}
      </div>
      <div class="action-row">
        ${canReview ? actionButton("转为正式号", "migrate_trial", target, "primary-button") : ""}
        ${canReview ? actionButton("停用", "deactivate_short_term_account", target, "danger-button") : ""}
      </div>
    </section>
  `;
}

function renderPendingShortTermDetail(student) {
  const target = student?.userId || student?.loginAccount || "";
  return `
    <aside class="detail-panel trial-detail-panel">
      <div class="section-head">
        <div>
          <h2 class="section-title">${escapeHtml(student?.loginAccount || target || "短期号")}</h2>
          <p class="section-subtitle">学生尚未完成首次资料填写，暂不能编辑正式学生资料。</p>
        </div>
        ${shortTermStatusTag(student)}
      </div>
      <div class="detail-list">
        ${detailRow("短期状态", shortTermStatusText(student)[0])}
        ${detailRow("账号类型", "短期号")}
        ${detailRow("开通后规则", "首次资料填写后开始计算 7 天服务期")}
        ${detailRow("登录账号", student?.loginAccount || target || "-")}
      </div>
      <div class="action-row">
        ${actionButton("停用短期号", "deactivate_short_term_account", target, "danger-button")}
      </div>
    </aside>
  `;
}

function renderTrialDetailPanel() {
  if (!state.selectedTrialDetailId) return "";
  const detailStudent = state.shortTermDetail;
  const detailMatches = detailStudent && (detailStudent.userId === state.selectedTrialDetailId || detailStudent.loginAccount === state.selectedTrialDetailId);
  if (state.shortTermDetailError) {
    return `<aside class="detail-panel"><div class="notice danger">${escapeHtml(state.shortTermDetailError)}</div></aside>`;
  }
  if (!detailMatches) {
    loadShortTermDetail(state.selectedTrialDetailId);
    return `<aside class="detail-panel"><div class="notice">短期号详情加载中...</div></aside>`;
  }
  return `
    <div class="trial-detail-wrapper">
      <div class="section-head compact">
        <button class="secondary-button" type="button" data-close-trial-detail>关闭详情</button>
      </div>
      ${detailStudent.shortTermStatus === "pending_onboarding" ? renderPendingShortTermDetail(detailStudent) : studentDetail(detailStudent)}
      ${renderShortTermLifecyclePanel(detailStudent)}
    </div>
  `;
}

function renderShortTermActivationResult() {
  const result = state.shortTermActivationResult;
  if (!result) return "";
  const durationDays = Number(result.trialDurationDays) || 7;
  const expiryText = result.paidUntil
    ? `到期 ${escapeHtml(result.paidUntil)}`
    : `学生首次填写资料后开始计算 ${escapeHtml(durationDays)} 天`;
  return `
    <div class="notice" style="margin-bottom:12px">
      <div class="cell-title">已开通短期号：${escapeHtml(result.activatedAccount || "")}</div>
      <div class="cell-sub">初始密码：<code>${escapeHtml(result.initialPassword || "")}</code> · ${expiryText}</div>
      <button class="secondary-button" type="button" data-copy-short-term-password="${escapeHtml(result.initialPassword || "")}">复制密码</button>
    </div>
  `;
}

function renderShortTermAccounts() {
  setViewTitle("短期账号");
  if (!state.shortTermLoaded && !state.shortTermLoading) {
    loadShortTermAccounts();
  }
  const summary = state.shortTermSummary || buildShortTermSummary(state.shortTermAccounts, {});
  const rows = shortTermRows(state.shortTermTab);
  const visibleRows = paginateRows("shortTerm", rows);
  const nextFormal = summary.nextConversionAccount || nextTrialConversionFormalAccount()?.loginAccount || "";
  const nextTrial = summary.nextShortTermAccount || nextUnusedTrialAccount()?.loginAccount || "";
  const tableHtml = table(["短期账号", "短期状态", "班级", "到期时间", "剩余", "今日状态", "操作"], visibleRows.map((student) => [
    accountCell({ ...student, role: "student" }),
    shortTermStatusTag(student),
    className(student.classId) || student.classId || "-",
    student.trialExpiresAt || student.paidUntil || "-",
    shortTermRemainingTag(student),
    tag(student.todayStatus || "pending"),
    shortTermActionButtons(student)
  ]));
  root.innerHTML = `
    <section class="band">
      <div class="section-head">
        <div>
          <h2 class="section-title">七天短期体验号池</h2>
          <p class="section-subtitle">短期号开通后可登录填写资料；资料填写完成后开始 7 天服务期，状态以后端为准。</p>
        </div>
        ${actionButton("开通短期号", "activate_short_term_account", nextTrial || "", "primary-button")}
      </div>
      <div class="metric-grid">
        ${metric("待首填", summary.pending || 0, "已开通但尚未完成资料填写", "info")}
        ${metric("试用中", summary.active || 0, "正在真实学习的短期学生", "good")}
        ${metric("到期待处理", summary.expired || 0, "保留数据，等待转正式或停用", "danger")}
        ${metric("历史处理", summary.history || 0, "已转正式或已停用", "")}
      </div>
      <div class="toolbar">
        <div class="segmented">
          ${shortTermTabButton("pending", "待首填", summary.pending || 0)}
          ${shortTermTabButton("active", "试用中", summary.active || 0)}
          ${shortTermTabButton("expired", "到期待处理", summary.expired || 0)}
          ${shortTermTabButton("history", "历史", summary.history || 0)}
        </div>
        <div class="toolbar-meta">测试日期：${escapeHtml(DATA.today)} · 短期转正式目标池：${escapeHtml(nextFormal || "暂无可用目标号")}</div>
      </div>
      ${renderShortTermActivationResult()}
      ${state.shortTermLoading ? `<div class="notice">短期账号加载中...</div>` : ""}
      ${state.shortTermError ? `<div class="notice danger">${escapeHtml(state.shortTermError)}</div>` : ""}
      ${tableHtml}
      ${renderPagination("shortTerm", rows)}
      ${renderTrialDetailPanel()}
      <div class="notice warn" style="margin-top:12px">转为正式号会把资料、学习记录、班级、QQ、头像和 password_hash 复制到短期转正式目标池，不影响直接开通正式号池。</div>
    </section>
  `;
}

function renderExpiry() {
  setViewTitle("到期处理");
  const rows = adminDueRows();
  const visibleRows = paginateRows("expiry", rows);
  root.innerHTML = `
    <section class="band">
      <div class="section-head">
        <div>
          <h2 class="section-title">已到期待处理</h2>
          <p class="section-subtitle">混合展示短期号已过期和正式/测试服务已过期；短期号优先，正式和测试号按过期时间排序。</p>
        </div>
      </div>
      ${table(["账号", "类型", "状态", "班级", "到期时间", "学习数据", "允许操作"], visibleRows.map((student) => [
        accountCell({ ...student, role: "student" }),
        `${tag(student.accountType)} ${testTag(student)}`,
        tag(student.accountStatus),
        student.classId,
        student.accountType === "trial" ? (student.trialExpiresAt || "-") : (student.paidUntil || "-"),
        `${student.submittedTypes}/${student.totalTypes} 题型 · ${student.unfinishedCount} 未作`,
        student.accountType === "trial"
          ? `${actionButton("查看详情", "view_trial", student.userId)} ${actionButton("转为正式号", "migrate_trial", student.userId, "primary-button")}`
          : actionButton("续费30天", "renew_service_30_days", student.userId, "primary-button")
      ]))}
      ${renderPagination("expiry", rows)}
      ${renderTrialDetailPanel()}
      <div class="notice danger" style="margin-top:12px">短期号到期后只提供转为正式号；正式号和测试号续费按 30 天计算，已过期时从付款日重新起算。</div>
    </section>
  `;
}

function renderRenewals() {
  setViewTitle("续费提醒");
  const rows = serviceSoonRows();
  const visibleRows = paginateRows("renewals", rows);
  root.innerHTML = `
    <section class="band">
      <div class="section-head">
        <div>
          <h2 class="section-title">7天内即将到期</h2>
          <p class="section-subtitle">只展示正式账号和测试号，不展示短期号；按剩余天数从少到多排序。</p>
        </div>
      </div>
      ${table(["学生", "账号类型", "班级", "服务期", "剩余", "今日状态", "操作"], visibleRows.map((student) => {
        const diff = dayDiff(student.paidUntil);
        return [
          accountCell({ ...student, role: "student" }),
          `${tag(student.accountType)} ${testTag(student)}`,
          className(student.classId),
          student.paidUntil,
          diff === 0 ? `<span class="tag red">今天到期</span>` : `<span class="tag amber">剩 ${diff} 天</span>`,
          tag(student.todayStatus),
          actionButton("续费30天", "renew_service_30_days", student.userId, "primary-button")
        ];
      }))}
      ${renderPagination("renewals", rows)}
    </section>
  `;
}

function renderAbnormal() {
  setViewTitle("异常处理");
  const rows = abnormalRows();
  const visibleRows = paginateRows("abnormal", rows);
  root.innerHTML = `
    <section class="band">
      <div class="section-head">
        <div>
          <h2 class="section-title">资料/账号异常</h2>
          <p class="section-subtitle">只列需要管理员处理的异常，例如缺 QQ、无班级、停用、服务期状态冲突、计划生成异常。</p>
        </div>
      </div>
      ${table(["学生", "账号类型", "班级", "账号状态", "异常原因", "处理入口"], visibleRows.map((row) => [
        accountCell({ ...row.student, role: "student" }),
        `${tag(row.student.accountType)} ${testTag(row.student)}`,
        className(row.student.classId),
        tag(row.student.accountStatus),
        row.reasons.map((reason) => `<span class="tag amber">${escapeHtml(reason)}</span>`).join(" "),
        `<button class="secondary-button" type="button" data-select-student="${escapeHtml(row.student.userId)}" data-jump-after-select="students">查看学生</button>`
      ]))}
      ${renderPagination("abnormal", rows)}
    </section>
  `;
}

function renderFeedback() {
  setViewTitle("今日反馈");
  const rows = classFeedbackRows();
  const visibleRows = paginateRows("feedback", rows);
  root.innerHTML = `
    <section class="band">
      <div class="section-head">
        <div>
          <h2 class="section-title">各班级未反馈人数</h2>
          <p class="section-subtitle">按未反馈人数从高到低排序，测试班保留展示但带测试标签。</p>
        </div>
      </div>
      ${table(["班级", "班型/数学", "负责老师", "QQ群", "未反馈", "总人数", "测试班"], visibleRows.map((item) => [
        `<div class="cell-title">${escapeHtml(item.classId)}</div><div class="cell-sub">${escapeHtml(item.className)}</div>`,
        `${escapeHtml(item.level)}型 · ${escapeHtml(item.mathType)}`,
        teacherName(item.teacherId),
        item.qqGroupNumber || "-",
        `<span class="tag ${item.unsubmittedCount ? "red" : "green"}">${item.unsubmittedCount}</span>`,
        String(item.studentCount),
        item.isTestClass ? `<span class="tag purple">测试班</span>` : `<span class="tag green">真实运营</span>`
      ]))}
      ${renderPagination("feedback", rows)}
    </section>
  `;
}

function renderIntake() {
  setViewTitle("分班配置");
  root.innerHTML = `
    <section class="band">
      <div class="section-head">
        <div>
          <h2 class="section-title">数学类型 + 班型 -> 当前接收班级</h2>
          <p class="section-subtitle">只影响之后完成首次资料填写的新学生，不自动移动老学生。</p>
        </div>
      </div>
      ${table(["数学类型", "班型", "当前接收班级", "状态", "修改人", "修改时间", "操作"], DATA.intakeSettings.map((row) => [
        row[0],
        row[1],
        row[2],
        row[3].includes("正常") ? `<span class="tag green">${escapeHtml(row[3])}</span>` : `<span class="tag amber">${escapeHtml(row[3])}</span>`,
        row[4],
        row[5],
        actionButton("切换班级", "update_intake", `${row[0]}-${row[1]}`)
      ]))}
    </section>
  `;
}

function renderAudit() {
  setViewTitle("操作日志");
  const rows = DATA.auditLogs;
  const visibleRows = paginateRows("audit", rows);
  root.innerHTML = `
    <section class="band">
      <div class="section-head">
        <div>
          <h2 class="section-title">管理员操作审计</h2>
          <p class="section-subtitle">审计日志只能追加和查看，不能编辑。</p>
        </div>
      </div>
      <div class="timeline">
        ${visibleRows.map((log) => `
          <div class="timeline-item">
            <div class="timeline-time">${escapeHtml(log.time)}</div>
            <div>
              <div class="cell-title">${escapeHtml(log.action)} · ${escapeHtml(log.target)}</div>
              <div class="cell-sub">操作人 ${escapeHtml(log.actor)}；${escapeHtml(log.before)} -> ${escapeHtml(log.after)}；二次确认：${log.confirmed ? "是" : "否"}</div>
            </div>
          </div>
        `).join("")}
      </div>
      ${renderPagination("audit", rows)}
    </section>
  `;
}

function renderTeacherToday() {
  ensurePreviewTeacherContext();
  setViewTitle("今日提醒");
  const classes = teacherClassesForCurrentUser();
  const students = studentsForTeacherClass(state.teacherClassId);
  const grouped = groupStudents(students);
  const activeRows = grouped[state.teacherStatus] || [];
  const copyRows = grouped.unsubmitted.filter((student) => student.contactQQ);
  const missingQQ = grouped.unsubmitted.filter((student) => !student.contactQQ);
  root.innerHTML = `
    ${renderTeacherPreviewToolbar()}
    <section class="metric-grid">
      ${metric("未反馈", grouped.unsubmitted.length, "进入复制名单", "bad")}
      ${metric("已反馈未完成", grouped.unfinished.length, "不催反馈，明天续做", "warn")}
      ${metric("已完成", grouped.completed.length, "今日闭环完成", "good")}
      ${metric("异常", grouped.abnormal.length, "需要管理员处理", "info")}
    </section>
    <section class="band">
      <div class="toolbar">
        <div class="filters">
          <select class="filter-select" id="teacherClassSelect">
            ${classes.map((item) => `<option value="${escapeHtml(item.classId)}" ${item.classId === state.teacherClassId ? "selected" : ""}>${escapeHtml(item.classId)}</option>`).join("")}
          </select>
          <input class="filter-input" value="${escapeHtml(DATA.today)}" />
        </div>
        <button class="primary-button" type="button" data-copy="${escapeHtml(copyRows.map((student) => `@${student.contactQQ}`).join(" "))}">一键复制未反馈 QQ</button>
      </div>
      <div class="copy-box">
        <div class="copy-text">${escapeHtml(copyRows.map((student) => `@${student.contactQQ}`).join(" ") || "当前没有可复制的未反馈 QQ")}</div>
        <span class="tag amber">${missingQQ.length ? `${missingQQ.length} 人缺 QQ 已排除` : "无缺失 QQ"}</span>
      </div>
      <div class="segmented" style="margin-top:12px">
        ${teacherStatusButton("unsubmitted", "未反馈", grouped.unsubmitted.length)}
        ${teacherStatusButton("unfinished", "已反馈未完成", grouped.unfinished.length)}
        ${teacherStatusButton("completed", "已完成", grouped.completed.length)}
        ${teacherStatusButton("abnormal", "异常", grouped.abnormal.length)}
      </div>
      <div style="margin-top:12px">
        ${table(["学生", "个人QQ", "当前题型", "今日进度", "状态", "备注"], activeRows.map((student) => [
          accountCell({ ...student, role: "student" }),
          student.contactQQ || `<span class="tag red">缺少 QQ</span>`,
          student.openTypeName || "-",
          `${student.submittedTypes}/${student.totalTypes}`,
          tag(student.todayStatus),
          student.flags.join("、") || "-"
        ]))}
      </div>
    </section>
  `;
}

function teacherStatusButton(status, label, count) {
  return `<button class="segment ${state.teacherStatus === status ? "is-active" : ""}" type="button" data-teacher-status="${status}">${escapeHtml(label)} ${count}</button>`;
}

function teacherClassesForCurrentUser() {
  const teacherId = activeTeacherId();
  return DATA.classes.filter((item) => item.teacherId === teacherId);
}

function studentsForTeacherClass(classId) {
  return DATA.students.filter((student) => student.classId === classId && student.accountType !== "public_demo");
}

function teacherScopedStudents() {
  const allowedClassIds = new Set(teacherClassesForCurrentUser().map((item) => item.classId));
  return DATA.students.filter((student) => allowedClassIds.has(student.classId) && student.accountType !== "public_demo");
}

const teacherFeedbackStatusOptions = [
  ["all", "全部反馈状态"],
  ["unsubmitted", "未反馈"],
  ["unfinished", "已反馈未完成"],
  ["completed", "已完成"],
  ["abnormal", "异常"]
];

const studentStatusOptions = [
  ["all", "全部学生状态"],
  ["dueSoon", "7天内到期"],
  ["expired", "已到期"],
  ["accountAbnormal", "账号异常"]
];

function isStudentExpired(student) {
  if (["service_expired", "expired_pending_review"].includes(student.accountStatus)) return true;
  const diff = dayDiff(student.paidUntil);
  return Number.isFinite(diff) && diff < 0;
}

function isStudentDueSoon(student) {
  if (!student.paidUntil || isStudentExpired(student)) return false;
  const diff = dayDiff(student.paidUntil);
  return Number.isFinite(diff) && diff >= 0 && diff <= DATA.servicePolicy.soonDueDays;
}

function isStudentAccountAbnormal(student) {
  if (!student.loginAccount || !student.classId) return true;
  if (["disabled", "deleted", "archived"].includes(student.accountStatus)) return true;
  return Boolean(student.accountStatus && !["active", "expired_pending_review", "service_expired"].includes(student.accountStatus));
}

function teacherStudentServiceStatus(student) {
  if (isStudentAccountAbnormal(student)) return "accountAbnormal";
  if (isStudentExpired(student)) return "expired";
  if (isStudentDueSoon(student)) return "dueSoon";
  return "normal";
}

function teacherStudentServiceStatusTag(student) {
  const status = teacherStudentServiceStatus(student);
  const labels = {
    dueSoon: ["7天内到期", "amber"],
    expired: ["已到期", "red"],
    accountAbnormal: ["账号异常", "purple"],
    normal: ["正常", "green"]
  };
  const [label, cls] = labels[status] || labels.normal;
  return `<span class="tag ${cls}">${escapeHtml(label)}</span>`;
}

function normalizeTeacherInfoFilters() {
  const filters = state.teacherInfoFilters;
  const classIds = teacherClassesForCurrentUser().map((item) => item.classId);
  if (filters.classId !== "all" && !classIds.includes(filters.classId)) {
    filters.classId = "all";
  }
  if (!teacherFeedbackStatusOptions.some(([value]) => value === filters.feedbackStatus)) {
    filters.feedbackStatus = "all";
  }
  if (!studentStatusOptions.some(([value]) => value === filters.studentStatus)) {
    filters.studentStatus = "all";
  }
}

function teacherStudentsForInfoFilters() {
  normalizeTeacherInfoFilters();
  const filters = state.teacherInfoFilters;
  return teacherScopedStudents()
    .filter((student) => filters.classId === "all" || student.classId === filters.classId)
    .filter((student) => filters.feedbackStatus === "all" || student.todayStatus === filters.feedbackStatus)
    .filter((student) => filters.studentStatus === "all" || teacherStudentServiceStatus(student) === filters.studentStatus)
    .sort((a, b) => {
      if (a.userId === state.teacherHighlightedStudentId) return -1;
      if (b.userId === state.teacherHighlightedStudentId) return 1;
      return a.classId.localeCompare(b.classId, undefined, { numeric: true, sensitivity: "base" }) || compareLoginAccount(a, b);
    });
}

function groupStudents(students) {
  return {
    unsubmitted: students.filter((student) => student.todayStatus === "unsubmitted"),
    unfinished: students.filter((student) => student.todayStatus === "unfinished"),
    completed: students.filter((student) => student.todayStatus === "completed"),
    abnormal: students.filter((student) => student.todayStatus === "abnormal")
  };
}

function renderTeacherLookupLegacy() {
  ensurePreviewTeacherContext();
  setViewTitle("学生查询");
  const query = state.lookupQuery.trim().toLowerCase();
  const allowedClassIds = teacherClassesForCurrentUser().map((item) => item.classId);
  const student = DATA.students.find((item) => item.userId.toLowerCase() === query || item.loginAccount.toLowerCase() === query);
  let content = "";
  if (!student) {
    content = `<div class="empty-state"><div class="empty-title">未找到学生</div><p>请输入完整学生 ID，例如 stu10011。</p></div>`;
  } else if (!allowedClassIds.includes(student.classId)) {
    content = `<div class="notice danger">该学生不属于当前老师负责班级。教师端不会返回其他老师班级的详情。</div>`;
  } else {
    content = `
      <div class="layout-two">
        <div class="band">
          <div class="section-head">
            <div>
              <h2 class="section-title">${escapeHtml(student.nickname)} 今日状态</h2>
              <p class="section-subtitle">${escapeHtml(student.loginAccount)} · ${escapeHtml(className(student.classId))}</p>
            </div>
            ${tag(student.todayStatus)}
          </div>
          <div class="detail-list">
            ${detailRow("个人 QQ", student.contactQQ || "缺少")}
            ${detailRow("当前开放题型", student.openTypeName || "无")}
            ${detailRow("今日完成率", `${student.submittedTypes}/${student.totalTypes}`)}
            ${detailRow("未作题数", `${student.unfinishedCount}`)}
            ${detailRow("账号状态", statusLabel(student.accountStatus)[0])}
            ${detailRow("服务期", student.paidUntil || "不适用")}
          </div>
        </div>
        <aside class="detail-panel">
          <h2 class="section-title">教师端可做什么</h2>
          <div class="notice">教师第一版只查看和复制提醒，不修改学生资料、不重置密码、不改计划、不改班级。</div>
          <div class="action-row"><button class="primary-button" type="button" data-copy="${student.contactQQ ? `@${escapeHtml(student.contactQQ)}` : ""}">复制该学生 QQ</button></div>
        </aside>
      </div>
    `;
  }
  root.innerHTML = `
    ${renderTeacherPreviewToolbar()}
    <section class="band">
      <div class="section-head">
        <div>
          <h2 class="section-title">按学生 ID 查询</h2>
          <p class="section-subtitle">老师只能查自己负责班级的学生。</p>
        </div>
      </div>
      <div class="toolbar">
        <input class="filter-input" id="legacyLookupInput" value="${escapeHtml(state.lookupQuery)}" placeholder="例如 stu10011" />
        <button class="primary-button" id="legacyLookupButton" type="button">查询</button>
      </div>
    </section>
    ${content}
  `;
}

function renderTeacherLookup() {
  ensurePreviewTeacherContext();
  setViewTitle("学生信息");
  const classes = teacherClassesForCurrentUser();
  normalizeTeacherInfoFilters();
  const rows = teacherStudentsForInfoFilters();
  const allScopedRows = teacherScopedStudents();
  const grouped = groupStudents(rows);
  const serviceCounts = rows.reduce((acc, student) => {
    const status = teacherStudentServiceStatus(student);
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  root.innerHTML = `
    ${renderTeacherPreviewToolbar()}
    <section class="metric-grid">
      ${metric("筛选结果", rows.length, `负责范围共 ${allScopedRows.length} 人`, "info")}
      ${metric("未反馈", grouped.unsubmitted.length, "当前筛选范围", "bad")}
      ${metric("7天内到期", serviceCounts.dueSoon || 0, "需要提醒续费", "warn")}
      ${metric("已到期", serviceCounts.expired || 0, "需要管理员处理", "bad")}
    </section>
    <section class="band">
      <div class="section-head">
        <div>
          <h2 class="section-title">学生信息</h2>
          <p class="section-subtitle">按班级、今日反馈状态和学生状态逐层筛选；顶部搜索框只搜索当前老师负责班级里的学生。</p>
        </div>
      </div>
      <div class="filters">
        <select class="filter-select" data-teacher-info-filter="classId" aria-label="筛选班级">
          <option value="all" ${state.teacherInfoFilters.classId === "all" ? "selected" : ""}>全部班级</option>
          ${classes.map((item) => `<option value="${escapeHtml(item.classId)}" ${item.classId === state.teacherInfoFilters.classId ? "selected" : ""}>${escapeHtml(item.classId)}</option>`).join("")}
        </select>
        <select class="filter-select" data-teacher-info-filter="feedbackStatus" aria-label="筛选今日反馈状态">
          ${teacherFeedbackStatusOptions.map(([value, label]) => `<option value="${escapeHtml(value)}" ${value === state.teacherInfoFilters.feedbackStatus ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
        </select>
        <select class="filter-select" data-teacher-info-filter="studentStatus" aria-label="筛选学生状态">
          ${studentStatusOptions.map(([value, label]) => `<option value="${escapeHtml(value)}" ${value === state.teacherInfoFilters.studentStatus ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
        </select>
      </div>
      <div style="margin-top:12px">
        ${table(["学生", "班级", "个人QQ", "今日反馈", "今日进度", "当前题型", "学生状态", "操作"], rows.map((student) => [
          `${accountCell({ ...student, role: "student" })}${student.userId === state.teacherHighlightedStudentId ? `<div class="cell-sub">顶部搜索定位</div>` : ""}`,
          escapeHtml(student.classId),
          student.contactQQ || `<span class="tag red">缺少 QQ</span>`,
          tag(student.todayStatus),
          `${student.submittedTypes}/${student.totalTypes}`,
          escapeHtml(student.openTypeName || "-"),
          `${teacherStudentServiceStatusTag(student)}<div class="cell-sub">${escapeHtml(student.paidUntil || "无到期日")}</div>`,
          `<button class="secondary-button" type="button" data-copy="${student.contactQQ ? `@${escapeHtml(student.contactQQ)}` : ""}">复制QQ</button>`
        ]))}
      </div>
    </section>
  `;
}

function renderTeacherClasses() {
  ensurePreviewTeacherContext();
  setViewTitle("我的班级");
  const rows = teacherClassesForCurrentUser();
  root.innerHTML = `
    ${renderTeacherPreviewToolbar()}
    <section class="band">
      <div class="section-head">
        <div>
          <h2 class="section-title">当前老师负责班级</h2>
          <p class="section-subtitle">后台接口必须从当前登录老师推导班级权限。</p>
        </div>
      </div>
      ${table(["班级", "QQ群", "学生数", "今日未反馈", "已反馈未完成", "已完成"], rows.map((item) => {
        const grouped = groupStudents(studentsForTeacherClass(item.classId));
        return [
          `<div class="cell-title">${escapeHtml(item.classId)}</div><div class="cell-sub">${escapeHtml(item.className)}</div>`,
          item.qqGroupNumber,
          String(item.activeStudents),
          String(grouped.unsubmitted.length),
          String(grouped.unfinished.length),
          String(grouped.completed.length)
        ];
      }))}
    </section>
  `;
}

function renderTeacherPassword() {
  ensurePreviewTeacherContext();
  setViewTitle("修改信息");
  const teacher = currentPreviewTeacher() || DATA.currentUsers.teacher;
  root.innerHTML = `
    ${renderTeacherPreviewToolbar()}
    <section class="band">
      <div class="section-head">
        <div>
          <h2 class="section-title">修改密码</h2>
          <p class="section-subtitle">当前老师账号：${escapeHtml(teacher.loginAccount || teacher.userId || "")}</p>
        </div>
      </div>
      ${state.teacherPasswordError ? `<div class="notice danger">${escapeHtml(state.teacherPasswordError)}</div>` : ""}
      <div class="modal-field-grid">
        <label class="field">当前密码
          <input type="password" autocomplete="current-password" data-teacher-password-field="currentPassword" value="${escapeHtml(state.teacherPasswordForm.currentPassword)}" />
        </label>
        <label class="field">新密码
          <input type="password" autocomplete="new-password" data-teacher-password-field="newPassword" value="${escapeHtml(state.teacherPasswordForm.newPassword)}" />
        </label>
        <label class="field">确认新密码
          <input type="password" autocomplete="new-password" data-teacher-password-field="confirmPassword" value="${escapeHtml(state.teacherPasswordForm.confirmPassword)}" />
        </label>
      </div>
      <div class="action-row" style="margin-top:16px">
        <button class="primary-button" type="button" data-teacher-password-save ${state.teacherPasswordSaving ? "disabled" : ""}>${state.teacherPasswordSaving ? "保存中" : "保存新密码"}</button>
      </div>
    </section>
  `;
  const contactQQ = state.teacherProfileForm.contactQQ || teacher.contactQQ || "";
  root.insertAdjacentHTML(
    "beforeend",
    `
      <section class="band">
        <div class="section-head">
          <div>
            <h2 class="section-title">修改 QQ 号</h2>
            <p class="section-subtitle">用于老师账号联系信息展示，不会影响登录状态。</p>
          </div>
        </div>
        ${state.teacherProfileError ? `<div class="notice danger">${escapeHtml(state.teacherProfileError)}</div>` : ""}
        <div class="modal-field-grid">
          <label class="field">联系 QQ
            <input type="text" inputmode="numeric" autocomplete="off" data-teacher-profile-field="contactQQ" value="${escapeHtml(contactQQ)}" />
          </label>
        </div>
        <div class="action-row" style="margin-top:16px">
          <button class="primary-button" type="button" data-teacher-profile-save ${state.teacherProfileSaving ? "disabled" : ""}>${state.teacherProfileSaving ? "保存中" : "保存 QQ 号"}</button>
        </div>
      </section>
    `
  );
}

async function submitTeacherPasswordChange() {
  const payload = {
    currentPassword: document.querySelector('[data-teacher-password-field="currentPassword"]')?.value || "",
    newPassword: document.querySelector('[data-teacher-password-field="newPassword"]')?.value || "",
    confirmPassword: document.querySelector('[data-teacher-password-field="confirmPassword"]')?.value || ""
  };
  state.teacherPasswordForm = payload;
  state.teacherPasswordError = "";
  state.teacherPasswordSaving = true;
  render();
  try {
    await adminApiRequest("/teacher/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    state.teacherPasswordForm = { currentPassword: "", newPassword: "", confirmPassword: "" };
    showToast("密码已修改");
  } catch (error) {
    state.teacherPasswordError = error.message || "密码修改失败";
  } finally {
    state.teacherPasswordSaving = false;
    render();
  }
}

async function submitTeacherProfileChange() {
  const payload = {
    contactQQ: document.querySelector('[data-teacher-profile-field="contactQQ"]')?.value.trim() || ""
  };
  state.teacherProfileForm = payload;
  state.teacherProfileError = "";
  state.teacherProfileSaving = true;
  render();
  try {
    const result = await adminApiRequest("/teacher/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const teacher = result.teacher || {};
    DATA.currentUsers.teacher = {
      ...DATA.currentUsers.teacher,
      ...teacher
    };
    DATA.teachers = teacher.userId
      ? DATA.teachers.map((item) => (item.userId === teacher.userId ? { ...item, ...teacher } : item))
      : DATA.teachers;
    state.teacherProfileForm.contactQQ = teacher.contactQQ || payload.contactQQ;
    showToast("QQ号已修改");
  } catch (error) {
    state.teacherProfileError = error.message || "QQ号修改失败";
  } finally {
    state.teacherProfileSaving = false;
    render();
  }
}

function renderTeacherRules() {
  ensurePreviewTeacherContext();
  setViewTitle("权限说明");
  root.innerHTML = `
    ${renderTeacherPreviewToolbar()}
    <section class="band">
      <div class="section-head">
        <div>
          <h2 class="section-title">教师端权限边界</h2>
          <p class="section-subtitle">教师端做得窄一点，日常使用才快，也能减少误操作。</p>
        </div>
      </div>
      <div class="data-grid">
        <div class="data-card"><h3>可以做</h3><ul><li>查看自己负责班级</li><li>查看今日反馈状态</li><li>按学生 ID 查本班学生</li><li>复制未反馈 QQ</li></ul></div>
        <div class="data-card"><h3>不可以做</h3><ul><li>开通账号</li><li>短期号转正式</li><li>修改学生班级和计划</li><li>重置学生密码</li></ul></div>
        <div class="data-card"><h3>后端必须校验</h3><ul><li>role 必须是 teacher</li><li>class_id 必须属于该老师</li><li>非本班学生返回 403 或无权限</li></ul></div>
      </div>
    </section>
  `;
}

function renderDataDictionary() {
  setViewTitle("数据字典");
  root.innerHTML = `
    <section class="band">
      <div class="section-head">
        <div>
          <h2 class="section-title">后台涉及的核心数据表</h2>
          <p class="section-subtitle">这部分对应正式上线数据表正规化方案，后续落地时从这些表读写。</p>
        </div>
      </div>
      <div class="data-grid">
        ${DATA.dataDictionary.map((item) => `
          <div class="data-card">
            <h3>${escapeHtml(item.table)}</h3>
            <div class="cell-sub">${escapeHtml(item.owner)}</div>
            <p class="section-subtitle">${escapeHtml(item.purpose)}</p>
            <ul>${item.fields.map((field) => `<li>${escapeHtml(field)}</li>`).join("")}</ul>
          </div>
        `).join("")}
      </div>
    </section>
    <section class="band">
      <div class="section-head">
        <div>
          <h2 class="section-title">接口分组</h2>
          <p class="section-subtitle">正式落地时管理员和教师接口分开，权限在后端拦截。</p>
        </div>
      </div>
      ${table(["分组", "接口"], DATA.apiGroups.map((group) => [
        group.group,
        group.apis.map((api) => `<code>${escapeHtml(api)}</code>`).join("<br />")
      ]))}
    </section>
  `;
}

function renderLanding() {
  setViewTitle("落地步骤");
  root.innerHTML = `
    <section class="band">
      <div class="section-head">
        <div>
          <h2 class="section-title">从设计图到真实上线</h2>
          <p class="section-subtitle">先落高频低风险，再落管理员基础能力，最后落清理/迁移等高风险流程。</p>
        </div>
      </div>
      <div class="step-list">
        ${DATA.landingSteps.map((step) => `
          <div class="step">
            <div>
              <div class="step-title">${escapeHtml(step.title)}</div>
              <div class="step-body">${escapeHtml(step.body)}</div>
            </div>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function hasRiskAuthorization() {
  return Date.now() < state.riskAuthorizedUntil;
}

function riskRemainingSeconds() {
  return Math.max(0, Math.ceil((state.riskAuthorizedUntil - Date.now()) / 1000));
}

function formatRemaining(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function updateRiskAuthPill() {
  if (!riskAuthPill) return;
  if (!hasRiskAuthorization()) {
    riskAuthPill.hidden = true;
    riskAuthPill.textContent = "";
    return;
  }
  riskAuthPill.hidden = false;
  riskAuthPill.textContent = `高风险授权剩余 ${formatRemaining(riskRemainingSeconds())}`;
}

function openRiskAuthModal(actionKey, target) {
  const flow = DATA.actionFlows[actionKey];
  state.modalMode = "riskAuth";
  state.pendingAction = { actionKey, target };
  modalEyebrow.textContent = "高风险授权";
  modalTitle.textContent = "输入管理员动态码";
  modalBody.innerHTML = `
    <div class="notice warn">该操作属于高风险操作。输入 TOTP 后会开启 10 分钟高风险授权窗口，窗口内执行其他高风险操作不再重复验证。</div>
    <div class="detail-list compact">
      ${detailRow("即将操作", flow?.title || actionKey)}
      ${detailRow("操作对象", targetLabel(actionKey, target))}
      ${detailRow("验证方式", "请输入当前管理员认证器中的 6 位动态码")}
    </div>
    <label class="field full">TOTP 动态码
      <input id="riskTotpInput" inputmode="numeric" autocomplete="one-time-code" placeholder="输入 6 位动态码" />
    </label>
  `;
  modalConfirm.textContent = "验证并继续";
  modalConfirm.className = "primary-button";
  actionModal.hidden = false;
  window.setTimeout(() => document.getElementById("riskTotpInput")?.focus(), 0);
}

function confirmRiskAuthModalLegacy() {
  const code = document.getElementById("riskTotpInput")?.value || "";
  if (!verifyTotpCode(code)) {
    showToast("请输入 6 位动态码。", "warn");
    return;
  }
  const minutes = DATA.securityPolicy.riskAuthorizationMinutes;
  state.riskAuthorizedUntil = Date.now() + minutes * 60 * 1000;
  const pending = state.pendingAction;
  showToast(`高风险授权已开启 ${minutes} 分钟`);
  updateRiskAuthPill();
  if (pending) {
    openActionModal(pending.actionKey, pending.target, { skipRiskCheck: true });
  } else {
    closeActionModal();
  }
}

async function confirmRiskAuthModal() {
  const code = document.getElementById("riskTotpInput")?.value || "";
  if (!code.trim()) {
    showToast("请输入动态码", "warn");
    return;
  }
  modalConfirm.disabled = true;
  try {
    const data = await adminApiRequest("/admin/risk-authorizations/verify", adminJsonOptions("POST", {
      totpCode: code.trim()
    }));
    const normalizedUntil = String(data.authorizedUntil || "").replace(" ", "T");
    const parsedUntil = Date.parse(normalizedUntil);
    const minutes = Number(data.riskAuthorizationMinutes || DATA.securityPolicy.riskAuthorizationMinutes || 10);
    state.riskAuthorizedUntil = Number.isFinite(parsedUntil)
      ? parsedUntil
      : Date.now() + minutes * 60 * 1000;
    const pending = state.pendingAction;
    showToast(`高危授权已开启 ${minutes} 分钟`);
    updateRiskAuthPill();
    if (pending) {
      openActionModal(pending.actionKey, pending.target, { skipRiskCheck: true });
    } else {
      closeActionModal();
    }
  } catch (error) {
    showToast(error.message || "动态码验证失败", "warn");
  } finally {
    modalConfirm.disabled = false;
  }
}

function includesQuery(values, query) {
  return values.filter(Boolean).some((value) => String(value).toLowerCase().includes(query));
}

function searchResultGroups() {
  const query = state.search.trim().toLowerCase();
  if (!query) return [];
  if (state.role === "teacher") {
    const students = teacherScopedStudents()
      .filter((student) => includesQuery([student.userId, student.loginAccount, student.nickname, student.contactQQ, student.classId], query))
      .slice(0, 5)
      .map((student) => ({
        kind: "student",
        id: student.userId,
        title: `${student.loginAccount} · ${student.nickname}`,
        meta: `${student.classId} · ${statusLabel(student.todayStatus)[0]} · QQ ${student.contactQQ || "缺少"}`
      }));
    return [["学生结果", students]].filter(([, rows]) => rows.length);
  }
  const students = DATA.students
    .filter((student) => includesQuery([student.userId, student.loginAccount, student.nickname, student.contactQQ, student.classId], query))
    .slice(0, 5)
    .map((student) => ({
      kind: "student",
      id: student.userId,
      title: `${student.loginAccount} · ${student.nickname}`,
      meta: `${accountTypeText(student.accountType)} · ${className(student.classId)} · QQ ${student.contactQQ || "缺少"}`
    }));
  const classes = DATA.classes
    .filter((item) => includesQuery([item.classId, item.className, item.mathType, item.level, item.qqGroupNumber, teacherName(item.teacherId)], query))
    .slice(0, 5)
    .map((item) => ({
      kind: "class",
      id: item.classId,
      title: `${item.classId} · ${item.className}`,
      meta: `${item.level}型 · ${item.mathType} · ${teacherName(item.teacherId)} · 群 ${item.qqGroupNumber || "未配置"}`
    }));
  const teachers = DATA.teachers
    .filter((teacher) => includesQuery([teacher.userId, teacher.loginAccount, teacher.nickname, teacher.contactQQ, teacher.classes.join(" ")], query))
    .slice(0, 5)
    .map((teacher) => ({
      kind: "teacher",
      id: teacher.userId,
      title: `${teacher.loginAccount} · ${teacher.nickname}`,
      meta: `负责 ${teacher.classes.join("、") || "暂无班级"} · QQ ${teacher.contactQQ}`
    }));
  const accounts = accountRows()
    .filter((row) => includesQuery([row.userId, row.loginAccount, row.nickname, row.contactQQ, row.classId, row.role, row.accountType], query))
    .slice(0, 5)
    .map((row) => ({
      kind: "account",
      id: row.userId,
      title: `${row.loginAccount} · ${row.nickname || row.userId}`,
      meta: `${roleText(row.role)} · ${accountTypeText(row.accountType)} · ${statusLabel(row.accountStatus)[0]}`
    }));
  return [
    ["学生结果", students],
    ["班级结果", classes],
    ["老师结果", teachers],
    ["账号结果", accounts]
  ].filter(([, rows]) => rows.length);
}

function renderSearchResults() {
  const groups = searchResultGroups();
  if (!state.search) {
    searchResults.hidden = true;
    searchResults.innerHTML = "";
    return;
  }
  searchResults.hidden = false;
  if (!groups.length) {
    searchResults.innerHTML = renderSearchEmptyState();
    return;
  }
  searchResults.innerHTML = `
    <div class="section-head compact">
      <div>
        <h2 class="section-title">搜索结果</h2>
        <p class="section-subtitle">支持学生 ID、个人 QQ、班级号、班级群号、老师账号或姓名。</p>
      </div>
      <span class="tag">${escapeHtml(state.search)}</span>
    </div>
    <div class="search-grid">
      ${groups.map(([title, rows]) => `
        <div class="search-group">
          <div class="search-group-title">${escapeHtml(title)}</div>
          ${rows.map((row) => `
            <button class="search-result" type="button" data-result-kind="${escapeHtml(row.kind)}" data-result-id="${escapeHtml(row.id)}">
              <span class="cell-title">${escapeHtml(row.title)}</span>
              <span class="cell-sub">${escapeHtml(row.meta)}</span>
            </button>
          `).join("")}
        </div>
      `).join("")}
    </div>
  `;
}

function renderSearchEmptyState() {
  return `
    <div class="section-head compact">
      <div>
        <h2 class="section-title">未找到匹配结果</h2>
        <p class="section-subtitle">可搜索学生 ID、登录账号、个人 QQ、班级号、班级群号、老师账号或姓名。</p>
      </div>
      <span class="tag amber">${escapeHtml(state.search)}</span>
    </div>
  `;
}

function firstSearchResult() {
  const groups = searchResultGroups();
  return groups.flatMap(([, rows]) => rows)[0] || null;
}

function openFirstSearchResult() {
  const first = firstSearchResult();
  if (!first) {
    renderSearchResults();
    showToast("没有找到匹配结果，请换一个关键词。", "warn");
    return;
  }
  openSearchResult(first.kind, first.id);
}

function openSearchResult(kind, id) {
  state.search = id;
  if (globalSearch) globalSearch.value = state.search;
  if (kind === "student" && state.role === "teacher") {
    const student = teacherScopedStudents().find((item) => item.userId === id);
    if (student) {
      state.teacherInfoFilters.classId = student.classId;
      state.teacherInfoFilters.feedbackStatus = "all";
      state.teacherInfoFilters.studentStatus = "all";
      state.teacherHighlightedStudentId = student.userId;
      state.view = "teacherLookup";
      render();
      return;
    }
  }
  if (kind === "student") {
    state.selectedStudentId = id;
    state.view = "students";
  } else if (kind === "class") {
    state.view = "classes";
  } else if (kind === "teacher") {
    state.view = "teachers";
  } else {
    state.view = "accounts";
  }
  render();
}

function targetLabel(actionKey, target) {
  if (!target) {
    if (actionKey.startsWith("export_")) return "当前筛选结果";
    return "新记录";
  }
  const student = DATA.students.find((item) => item.userId === target || item.loginAccount === target);
  if (student) return `${student.nickname}（${student.loginAccount}）`;
  const teacher = DATA.teachers.find((item) => item.userId === target || item.loginAccount === target);
  if (teacher) return `${teacher.nickname}（${teacher.loginAccount}）`;
  const classItem = DATA.classes.find((item) => item.classId === target);
  if (classItem) return `${classItem.className}（${classItem.classId}）`;
  const account = DATA.availableAccounts.find((item) => item.loginAccount === target);
  if (account) return `${account.loginAccount}（${statusLabel(account.accountType)[0]}）`;
  return target;
}

function nextTeacherLogin() {
  const maxNumber = DATA.teachers.reduce((max, teacher) => {
    const match = /^tea(\d+)$/.exec(teacher.loginAccount || "");
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `tea${String(maxNumber + 1).padStart(3, "0")}`;
}

function mathDigit(mathType) {
  const map = {
    "数学一": "1",
    "数学二": "2",
    "数学三": "3"
  };
  return map[mathType] || "2";
}

function nextClassIdFor(level = "A", mathType = "数学二") {
  const prefix = `${level}${mathDigit(mathType)}`;
  const usedNumbers = DATA.classes
    .map((item) => new RegExp(`^${prefix}(\\d{2})$`).exec(item.classId || ""))
    .filter(Boolean)
    .map((match) => Number(match[1]));
  const next = (usedNumbers.length ? Math.max(...usedNumbers) : 0) + 1;
  return `${prefix}${String(next).padStart(2, "0")}`;
}

function nextClassId() {
  return nextClassIdFor("A", "数学二");
}

function suggestedClassName(level = "A", mathType = "数学二", classId = nextClassIdFor(level, mathType)) {
  const match = /^([A-D])([123])(\d{2})$/.exec(classId || "");
  const sequence = match?.[3] || "01";
  return `26考研${mathType}${level}${sequence}班`;
}

function fieldInput(label, name, value = "", attrs = "") {
  return `
    <label class="field">
      ${escapeHtml(label)}
      <input data-field="${escapeHtml(name)}" value="${escapeHtml(value)}" ${attrs} />
    </label>
  `;
}

function fieldSelect(label, name, options, selectedValue = "") {
  return `
    <label class="field">
      ${escapeHtml(label)}
      <select data-field="${escapeHtml(name)}">
        ${options.map(([value, text]) => `<option value="${escapeHtml(value)}" ${value === selectedValue ? "selected" : ""}>${escapeHtml(text)}</option>`).join("")}
      </select>
    </label>
  `;
}

function actionFieldRows(fields = []) {
  if (!fields.length) return "";
  return `
    <div class="modal-field-grid">
      ${fields.map(([label, value]) => `
        <label class="field">
          ${escapeHtml(label)}
          <input value="${escapeHtml(value)}" />
        </label>
      `).join("")}
    </div>
  `;
}

function createTeacherFields() {
  const login = nextTeacherLogin();
  return `
    <div class="modal-field-grid">
      ${fieldInput("登录账号", "loginAccount", login)}
      ${fieldInput("老师昵称", "nickname", "新老师")}
      ${fieldInput("联系 QQ", "contactQQ", `265500${login.slice(-3)}`)}
      ${fieldSelect("初始状态", "status", [["active", "启用"], ["disabled", "停用"]], "active")}
    </div>
  `;
}

function classAssignmentFields(target) {
  const teacher = DATA.teachers.find((item) => item.userId === target);
  const selected = new Set(teacher?.classes || []);
  return `
    <div class="modal-field-grid single">
      <div class="field full">
        <span>目标班级</span>
        <div class="class-option-grid">
          ${enabledClassRows().map((item) => `
            <label class="class-option">
              <input type="checkbox" data-class-option data-field="classIds" value="${escapeHtml(item.classId)}" ${selected.has(item.classId) ? "checked" : ""} />
              <span>${escapeHtml(item.classId)}</span>
              <small>${escapeHtml(item.mathType)} · ${escapeHtml(item.level)}</small>
            </label>
          `).join("")}
        </div>
      </div>
    </div>
  `;
}

function teacherStatusModalFields(target) {
  const teacher = DATA.teachers.find((item) => item.userId === target);
  return `
    <div class="modal-field-grid single">
      ${fieldInput("老师昵称", "nickname", teacher?.nickname || "")}
      ${fieldSelect("状态操作", "statusAction", [["keep", "保持当前状态"], ["active", "启用老师"], ["disabled", "停用老师"], ["delete", "删除老师"]], "keep")}
      <div class="notice warn">删除老师真实上线建议先确认该老师没有负责班级，或先把班级转交给其他启用老师。</div>
    </div>
  `;
}

function createClassFields() {
  const teacherOptions = DATA.teachers
    .filter((teacher) => teacher.status === "active")
    .map((teacher) => [teacher.userId, `${teacher.nickname}（${teacher.loginAccount}）`]);
  const defaultMathType = "数学二";
  const defaultLevel = "A";
  const classId = nextClassIdFor(defaultLevel, defaultMathType);
  const classNameValue = suggestedClassName(defaultLevel, defaultMathType, classId);
  return `
    <div class="modal-field-grid">
      ${fieldSelect("数学类型", "mathType", [["数学一", "数学一"], ["数学二", "数学二"], ["数学三", "数学三"]], "数学二")}
      ${fieldSelect("班型", "level", [["A", "A班"], ["B", "B班"], ["C", "C班"], ["D", "D班"]], "A")}
      ${fieldInput("班级编号", "classId", classId, 'data-derived-class-field="classId"')}
      ${fieldInput("班级名称", "className", classNameValue, 'data-derived-class-field="className"')}
      ${fieldSelect("负责老师", "teacherId", teacherOptions, teacherOptions[0]?.[0] || "")}
      ${fieldInput("QQ群", "qqGroupNumber", "783210499")}
      ${fieldInput("容量", "capacity", "60", "inputmode=\"numeric\"")}
      ${fieldSelect("是否接收新生", "isAcceptingNewStudents", [["true", "是"], ["false", "否"]], "true")}
    </div>
  `;
}

function classEditFields(target) {
  const classItem = DATA.classes.find((item) => item.classId === target);
  const teacherOptions = DATA.teachers
    .filter((teacher) => teacher.status === "active")
    .map((teacher) => [teacher.userId, `${teacher.nickname}（${teacher.loginAccount}）`]);
  return `
    <div class="modal-field-grid">
      ${fieldInput("班级名称", "className", classItem?.className || "")}
      ${fieldSelect("负责老师", "teacherId", teacherOptions, classItem?.teacherId || teacherOptions[0]?.[0] || "")}
      ${fieldInput("QQ群", "qqGroupNumber", classItem?.qqGroupNumber || "")}
      ${fieldInput("容量", "capacity", classItem?.capacity || "60", "inputmode=\"numeric\"")}
      ${fieldSelect("是否接收新生", "isAcceptingNewStudents", [["true", "是"], ["false", "否"]], String(Boolean(classItem?.isAcceptingNewStudents)))}
    </div>
  `;
}

function actionFormHtml(actionKey, target, flow) {
  if (actionKey === "add_teacher") return createTeacherFields();
  if (actionKey === "assign_teacher_class") return classAssignmentFields(target);
  if (actionKey === "modify_teacher_status") return teacherStatusModalFields(target);
  if (actionKey === "add_class") return createClassFields();
  if (actionKey === "edit_class") return classEditFields(target);
  if (actionKey === "migrate_trial") return migrateTrialFields(target);
  if (actionKey === "update_intake") return intakeEditFields(target);
  return actionFieldRows(resolvedActionFields(actionKey, target, flow));
}

function migrateTrialFields(target) {
  const source = state.shortTermAccounts.find((student) => student.userId === target || student.loginAccount === target)
    || DATA.students.find((student) => student.userId === target || student.loginAccount === target);
  const targetFormal = state.shortTermSummary?.nextConversionAccount || nextTrialConversionFormalAccount()?.loginAccount || "";
  return `
    <div class="modal-field-grid">
      ${fieldInput("来源账号", "sourceTrialAccount", source?.loginAccount || target || "", "readonly")}
      ${fieldInput("目标正式号", "targetFormalAccount", targetFormal, "readonly")}
      ${fieldInput("目标号池", "targetFormalPool", "短期转正式目标池 stu40001-stu59999", "readonly")}
      ${fieldInput("复制内容", "migrationScope", "资料、学习记录、班级、QQ、头像、password_hash", "readonly")}
    </div>
  `;
}

function intakeClassOptions(target) {
  const [mathType, level] = String(target || "").split("-");
  const options = DATA.classes
    .filter((item) => item.mathType === mathType && item.level === level && !item.isTestClass)
    .map((item) => [item.classId, `${item.classId} · ${item.className}${item.isAcceptingNewStudents ? "" : " · 当前不接收"} `]);
  if (options.length) return options;
  const row = DATA.intakeSettings.find((item) => `${item[0]}-${item[1]}` === target);
  return [[row?.[2] || "", row?.[2] || "暂无可选班级"]];
}

function intakeEditFields(target) {
  const row = DATA.intakeSettings.find((item) => `${item[0]}-${item[1]}` === target);
  const options = intakeClassOptions(target);
  return `
    <div class="modal-field-grid">
      ${fieldInput("数学类型", "intakeMathType", row?.[0] || "", "readonly")}
      ${fieldInput("班型", "intakeLevel", row?.[1] || "", "readonly")}
      ${fieldSelect("新的接收班级", "activeClassId", options, row?.[2] || options[0]?.[0] || "")}
    </div>
  `;
}

function resolvedActionFields(actionKey, target, flow) {
  if (actionKey === "save_student") {
    return studentDetailConfirmationFields(target);
  }
  if (actionKey === "migrate_trial") {
    const source = state.shortTermAccounts.find((student) => student.userId === target || student.loginAccount === target)
      || DATA.students.find((student) => student.userId === target || student.loginAccount === target);
    const targetFormal = state.shortTermSummary?.nextConversionAccount || nextTrialConversionFormalAccount()?.loginAccount || "";
    return [
      ["来源账号", source?.loginAccount || target || "当前短期学生"],
      ["目标正式号", targetFormal],
      ["目标号池", "短期转正式目标池 stu40001-stu59999"],
      ["复制内容", "资料、学习记录、班级、QQ、头像"],
      ["密码迁移", "迁移 password_hash，学生原密码继续有效"]
    ];
  }
  if (actionKey === "activate_account") {
    const account = nextFormalAccount();
    return [
      ["账号", account?.loginAccount || target || "待选择"],
      ["账号类型", "正式号"],
      ["开通状态", "active"],
      ["开通顺序", "正式号按数字递增开通"]
    ];
  }
  if (actionKey === "activate_short_term_account") {
    const account = target || state.shortTermSummary?.nextShortTermAccount || nextUnusedTrialAccount()?.loginAccount;
    return [
      ["账号", account || "无可用短期号"],
      ["账号类型", "短期号"],
      ["服务期", "学生首次填写资料后开始 7 天"],
      ["保留规则", "到期 1-3 天继续显示，超过 3 天软删除"]
    ];
  }
  return flow.fields || [];
}

function openActionModal(actionKey, target, options = {}) {
  const flow = DATA.actionFlows[actionKey];
  if (!flow) {
    showToast("这个按钮还没有配置模拟流程", "warn");
    return;
  }
  if (flow.riskLevel === "high" && !options.skipRiskCheck && !hasRiskAuthorization()) {
    openRiskAuthModal(actionKey, target);
    return;
  }

  state.modalMode = "action";
  state.pendingAction = { actionKey, target };
  modalEyebrow.textContent = flow.danger ? "高风险后台操作" : "后台操作";
  modalTitle.textContent = flow.title;
  modalBody.innerHTML = `
    <div class="notice ${flow.danger ? "danger" : ""}">${escapeHtml(flow.body)}</div>
    <div class="detail-list compact">
      ${detailRow("操作对象", targetLabel(actionKey, target))}
      ${detailRow("审计动作", flow.auditAction)}
      ${detailRow("执行方式", "点击确认后将调用 FastAPI，并写入 account_audit_logs")}
    </div>
    ${actionFormHtml(actionKey, target, flow)}
  `;
  modalConfirm.textContent = flow.primaryLabel;
  modalConfirm.className = flow.danger ? "danger-button" : "primary-button";
  actionModal.hidden = false;
  window.setTimeout(() => modalConfirm.focus(), 0);
}

function closeActionModal() {
  state.pendingAction = null;
  state.modalMode = "action";
  actionModal.hidden = true;
}

function nowText() {
  const formatter = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
  return formatter.format(new Date()).replaceAll("/", "-");
}

function modalValue(name) {
  return actionModal.querySelector(`[data-field="${name}"]`)?.value?.trim() || "";
}

function modalCheckedValues(name) {
  return [...actionModal.querySelectorAll(`[data-field="${name}"]:checked`)].map((item) => item.value);
}

function syncCreateClassDerivedFields() {
  if (state.pendingAction?.actionKey !== "add_class") return;
  const mathType = modalValue("mathType") || "数学二";
  const level = modalValue("level") || "A";
  const classId = nextClassIdFor(level, mathType);
  const classIdInput = actionModal.querySelector('[data-derived-class-field="classId"]');
  const classNameInput = actionModal.querySelector('[data-derived-class-field="className"]');
  if (classIdInput) classIdInput.value = classId;
  if (classNameInput) classNameInput.value = suggestedClassName(level, mathType, classId);
}

function createMockTeacher() {
  const loginAccount = modalValue("loginAccount") || nextTeacherLogin();
  if (DATA.teachers.some((teacher) => teacher.loginAccount === loginAccount || teacher.userId === loginAccount)) {
    showToast("老师账号已存在，请换一个登录账号", "warn");
    return false;
  }
  DATA.teachers.push({
    userId: loginAccount,
    loginAccount,
    nickname: modalValue("nickname") || "新老师",
    status: modalValue("status") || "active",
    contactQQ: modalValue("contactQQ") || "",
    classes: [],
    lastLoginAt: "-"
  });
  state.search = "";
  if (globalSearch) globalSearch.value = "";
  return true;
}

function assignMockTeacherClasses(target) {
  const teacher = DATA.teachers.find((item) => item.userId === target);
  if (!teacher) return false;
  const classIds = modalCheckedValues("classIds");
  const selected = new Set(classIds);
  for (const other of DATA.teachers) {
    if (other.userId !== teacher.userId) {
      other.classes = other.classes.filter((classId) => !selected.has(classId));
    }
  }
  teacher.classes = classIds;
  for (const classItem of DATA.classes) {
    if (selected.has(classItem.classId)) {
      classItem.teacherId = teacher.userId;
    } else if (classItem.teacherId === teacher.userId) {
      classItem.teacherId = "";
    }
  }
  return true;
}

function modifyMockTeacherStatus(target) {
  const teacherIndex = DATA.teachers.findIndex((item) => item.userId === target);
  if (teacherIndex < 0) return false;
  const action = modalValue("statusAction");
  const teacher = DATA.teachers[teacherIndex];
  if (action === "delete") {
    DATA.teachers.splice(teacherIndex, 1);
    for (const classItem of DATA.classes) {
      if (classItem.teacherId === target) classItem.teacherId = "";
    }
    return true;
  }
  teacher.status = action === "active" ? "active" : "disabled";
  return true;
}

function createMockClass() {
  const classId = modalValue("classId") || nextClassId();
  if (DATA.classes.some((item) => item.classId === classId)) {
    showToast("班级编号已存在，请换一个班级编号", "warn");
    return false;
  }
  const teacherId = modalValue("teacherId");
  DATA.classes.push({
    classId,
    className: modalValue("className") || classId,
    mathType: modalValue("mathType") || "数学二",
    level: modalValue("level") || "A",
    teacherId,
    qqGroupNumber: modalValue("qqGroupNumber"),
    capacity: Number(modalValue("capacity")) || 60,
    activeStudents: 0,
    isTestClass: false,
    isAcceptingNewStudents: modalValue("isAcceptingNewStudents") === "true"
  });
  const teacher = DATA.teachers.find((item) => item.userId === teacherId);
  if (teacher && !teacher.classes.includes(classId)) teacher.classes.push(classId);
  return true;
}

function editMockClass(target) {
  const classItem = DATA.classes.find((item) => item.classId === target);
  if (!classItem) return false;
  const previousTeacherId = classItem.teacherId;
  const nextTeacherIdValue = modalValue("teacherId");
  classItem.className = modalValue("className") || classItem.className;
  classItem.teacherId = nextTeacherIdValue;
  classItem.qqGroupNumber = modalValue("qqGroupNumber");
  classItem.capacity = Number(modalValue("capacity")) || classItem.capacity;
  classItem.isAcceptingNewStudents = modalValue("isAcceptingNewStudents") === "true";
  if (previousTeacherId !== nextTeacherIdValue) {
    const previousTeacher = DATA.teachers.find((item) => item.userId === previousTeacherId);
    if (previousTeacher) previousTeacher.classes = previousTeacher.classes.filter((classId) => classId !== target);
    const nextTeacher = DATA.teachers.find((item) => item.userId === nextTeacherIdValue);
    if (nextTeacher && !nextTeacher.classes.includes(target)) nextTeacher.classes.push(target);
  }
  return true;
}

function selectedStudent() {
  return DATA.students.find((student) => student.userId === state.selectedStudentId);
}

function studentFieldValue(field) {
  return root.querySelector(`[data-student-field="${field}"]`)?.value?.trim() || "";
}

function applyStudentDetailChanges(target) {
  const student = DATA.students.find((item) => item.userId === target);
  if (!student) return false;
  const primaryBooks = [primaryBookPayload(1), primaryBookPayload(2)].filter(Boolean);
  const primaryBook1 = primaryBooks[0]?.book || "";
  const primaryBook2 = primaryBooks[1]?.book || "";
  if (primaryBook1 && primaryBook2 && primaryBook1 === primaryBook2) {
    showToast("主选习题册 1 和主选习题册 2 不能重复。", "warn");
    return false;
  }
  student.level = studentFieldValue("level") || student.level;
  student.classId = studentFieldValue("classId") || student.classId;
  student.mathType = studentFieldValue("mathType") || student.mathType;
  student.targetScore = Number(studentFieldValue("targetScore")) || student.targetScore;
  student.contactQQ = studentFieldValue("contactQQ");
  student.paidUntil = studentFieldValue("paidUntil") || student.paidUntil;
  student.reviewOrder = studentFieldValue("reviewOrder") || student.reviewOrder || "mixed";
  student.primaryBooks = primaryBooks.map((item) => item.book);
  student.primaryBookScopes = primaryBooks.map((item) => item.scope);
  student.backupBook = studentFieldValue("backupBook") || student.backupBook;
  student.nextPlanStartChapterId = studentFieldValue("nextPlanStartChapterId");
  student.dailyMathGoalHours = Number(studentFieldValue("dailyMathGoalHours")) || student.dailyMathGoalHours || 3;
  return true;
}

function resetMockPassword(actionKey, target) {
  const resetAt = nowText();
  if (actionKey === "reset_teacher_password") {
    const teacher = DATA.teachers.find((item) => item.userId === target || item.loginAccount === target);
    if (!teacher) return false;
    teacher.passwordResetAt = resetAt;
    teacher.temporaryPasswordIssued = true;
    return true;
  }
  const student = DATA.students.find((item) => item.userId === target || item.loginAccount === target);
  if (!student) return false;
  student.passwordResetAt = resetAt;
  student.temporaryPasswordIssued = true;
  return true;
}

function createMockExportJob() {
  const rows = DATA.students.filter((student) => student.accountType !== "public_demo").filter(matchesSearch);
  const jobId = `EXP-${String(state.exportJobs.length + 1).padStart(3, "0")}`;
  state.exportJobs.unshift({
    jobId,
    status: "已生成，24小时后过期",
    createdAt: nowText(),
    expiresAt: `${addDaysToDateText(DATA.today, 1)} 23:59`,
    rowCount: rows.length,
    scope: state.search ? `搜索：${state.search}` : "当前学生列表筛选结果"
  });
  state.view = "students";
  return true;
}

function datePlusDaysText(days) {
  const date = new Date(`${DATA.today}T00:00:00`);
  date.setDate(date.getDate() + days);
  return dateToYmd(date);
}

function addDaysToDateText(dateText, days) {
  const date = new Date(`${dateText || DATA.today}T00:00:00`);
  date.setDate(date.getDate() + days);
  return dateToYmd(date);
}

function dateToYmd(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function defaultActivationClassId() {
  return DATA.classes.find((item) => item.classId === "A201")?.classId
    || DATA.classes.find((item) => !item.isTestClass)?.classId
    || "";
}

function createStudentFromActivatedAccount(account) {
  const existing = DATA.students.find((student) => student.loginAccount === account.loginAccount);
  if (existing) return existing;
  const classId = defaultActivationClassId();
  const classItem = classInfo(classId);
  const paidUntil = account.accountType === "trial"
    ? (account.trialExpiresAt || account.paidUntil || datePlusDaysText(7))
    : (account.paidUntil || datePlusDaysText(30));
  const student = {
    userId: account.loginAccount,
    loginAccount: account.loginAccount,
    nickname: `${account.loginAccount} 学生`,
    avatarUrl: "",
    contactQQ: "",
    accountType: account.accountType,
    dataMode: account.dataMode || "persistent",
    accountStatus: "active",
    classId,
    mathType: classItem?.mathType || "数学二",
    level: classItem?.level || "A",
    targetScore: 120,
    primaryBooks: ["880"],
    primaryBookScopes: ["both"],
    backupBook: "660",
    paidUntil,
    activatedAt: account.activatedAt || nowText(),
    trialExpiresAt: account.accountType === "trial" ? paidUntil : "",
    everActivated: true,
    todayStatus: "unsubmitted",
    planStatus: "not_started",
    openTypeName: "待生成今日计划",
    submittedTypes: 0,
    totalTypes: 0,
    unfinishedCount: 0,
    currentTypeId: "",
    manualNextTypeId: "",
    flags: [account.accountType === "trial" ? "短期号新开通" : "正式号新开通"]
  };
  DATA.students.push(student);
  if (classItem) classItem.activeStudents = Number(classItem.activeStudents || 0) + 1;
  return student;
}

function activateMockAccount(target) {
  return activateNextFormalAccount(target);
}

function activateNextFormalAccount(target = "") {
  const account = nextFormalAccount();
  if (!account) {
    showToast("正式号段已经用完。", "warn");
    return false;
  }
  if (target && target !== account.loginAccount) {
    showToast(`当前应开通 ${account.loginAccount}，不能跳号开通。`, "warn");
    return false;
  }
  account.accountStatus = "active";
  account.everActivated = true;
  account.activatedAt = nowText();
  account.paidUntil = datePlusDaysText(30);
  createStudentFromActivatedAccount(account);
  advanceNextFormalAccount();
  state.view = "accounts";
  state.accountFilters.role = "student";
  state.accountFilters.accountType = "formal";
  state.accountFilters.accountStatus = "active";
  state.search = account.loginAccount;
  if (globalSearch) globalSearch.value = state.search;
  return true;
}

function activateNextShortTermAccount(target = "") {
  const account = nextUnusedTrialAccount();
  if (!account) {
    showToast("短期号池暂无可开通账号。", "warn");
    return false;
  }
  if (target && target !== account.loginAccount) {
    showToast(`当前应开通 ${account.loginAccount}，不能跳号开通。`, "warn");
    return false;
  }
  account.accountStatus = "active";
  account.everActivated = true;
  account.activatedAt = nowText();
  account.paidUntil = "";
  account.trialExpiresAt = "";
  account.expireDate = "";
  state.shortTermActivationResult = {
    activatedAccount: account.loginAccount,
    initialPassword: account.initialPassword || "以后端返回为准",
    paidUntil: "",
    trialDurationDays: 7,
    startsAfterOnboarding: true
  };
  state.view = "shortTerm";
  state.shortTermTab = "active";
  state.selectedTrialDetailId = "";
  state.search = account.loginAccount;
  if (globalSearch) globalSearch.value = state.search;
  return true;
}

function ensureAvailableAccount(account) {
  const existing = DATA.availableAccounts.find((item) => item.loginAccount === account.loginAccount);
  if (existing) {
    Object.assign(existing, account);
    return existing;
  }
  DATA.availableAccounts.push(account);
  return account;
}

function migrateTrialToFormal(target) {
  return migrateExperienceToFormal(target);
}

function migrateExperienceToFormal(target) {
  const source = DATA.students.find((item) => item.userId === target || item.loginAccount === target);
  if (!source || source.accountType !== "trial") {
    showToast("只能把短期号转正式。", "warn");
    return false;
  }
  const targetAccount = nextTrialConversionFormalAccount();
  const targetLogin = modalValue("targetFormalAccount") || targetAccount?.loginAccount || "";
  if (!targetAccount || targetLogin !== targetAccount.loginAccount) {
    showToast("目标正式号必须是短期转正式目标池中的第一个未使用账号。", "warn");
    return false;
  }
  const sourceLogin = source.loginAccount;
  const paidUntil = datePlusDaysText(30);
  const formalStudent = {
    ...source,
    userId: targetAccount.loginAccount,
    loginAccount: targetAccount.loginAccount,
    accountType: "formal",
    accountStatus: "active",
    paidUntil,
    activatedAt: nowText(),
    trialExpiresAt: "",
    everActivated: true,
    flags: source.flags
      .filter((flag) => !flag.includes("体验号") && !flag.includes("短期号") && !flag.includes("到期"))
      .concat(`由短期号 ${sourceLogin} 转正式`)
  };
  DATA.students.push(formalStudent);
  source.accountStatus = "converted_to_formal";
  source.planStatus = "converted_to_formal";
  source.flags = source.flags
    .filter((flag) => !flag.includes("待管理员"))
    .concat(`已转正式为 ${targetAccount.loginAccount}`);
  state.selectedStudentId = formalStudent.userId;
  state.selectedTrialDetailId = "";
  state.view = "accounts";
  state.accountFilters.role = "student";
  state.accountFilters.accountType = "formal";
  state.accountFilters.accountStatus = "active";
  state.search = formalStudent.loginAccount;
  if (globalSearch) globalSearch.value = state.search;
  return true;
}

function renewServiceThirtyDays(target) {
  const student = DATA.students.find((item) => item.userId === target || item.loginAccount === target);
  if (!student || !["formal", "internal_test"].includes(student.accountType)) {
    showToast("只有正式号和测试号可以续费。", "warn");
    return false;
  }
  const baseDate = student.paidUntil && dayDiff(student.paidUntil) >= 0 ? student.paidUntil : DATA.today;
  student.paidUntil = addDaysToDateText(baseDate, 30);
  student.accountStatus = "active";
  student.flags = student.flags.filter((flag) => !flag.includes("过期") && !flag.includes("到期"));
  return true;
}

function updateMockIntake(target) {
  const row = DATA.intakeSettings.find((item) => `${item[0]}-${item[1]}` === target);
  if (!row) return false;
  const classId = modalValue("activeClassId") || row[2];
  const classItem = DATA.classes.find((item) => item.classId === classId);
  row[2] = classId;
  row[3] = classItem ? (classItem.isAcceptingNewStudents ? "正常接收" : "已指定，需先开启接收") : "待建班";
  row[4] = DATA.currentUsers.admin.userId;
  row[5] = nowText();
  return true;
}

function applyMockAction(actionKey, target) {
  if (actionKey === "add_teacher") return createMockTeacher();
  if (actionKey === "assign_teacher_class") return assignMockTeacherClasses(target);
  if (actionKey === "modify_teacher_status") return modifyMockTeacherStatus(target);
  if (actionKey === "reset_teacher_password") return resetMockPassword(actionKey, target);
  if (actionKey === "add_class") return createMockClass();
  if (actionKey === "edit_class") return editMockClass(target);
  if (actionKey === "export_students") return createMockExportJob();
  if (actionKey === "save_student") return applyStudentDetailChanges(target);
  if (actionKey === "reset_student_password") return resetMockPassword(actionKey, target);
  if (actionKey === "activate_account") return activateMockAccount(target);
  if (actionKey === "activate_short_term_account") return activateNextShortTermAccount(target);
  if (actionKey === "migrate_trial") return migrateTrialToFormal(target);
  if (actionKey === "deactivate_short_term_account") return true;
  if (actionKey === "renew_service_30_days") return renewServiceThirtyDays(target);
  if (actionKey === "update_intake") return updateMockIntake(target);
  return true;
}

function modalBool(name, fallback = true) {
  const value = modalValue(name);
  if (!value) return fallback;
  return value === "true" || value === "1";
}

function studentDetailPayload() {
  return {
    level: studentFieldValue("level"),
    classId: studentFieldValue("classId"),
    mathType: studentFieldValue("mathType"),
    targetScore: Number(studentFieldValue("targetScore")) || 0,
    contactQQ: studentFieldValue("contactQQ"),
    paidUntil: studentFieldValue("paidUntil"),
    reviewOrder: studentFieldValue("reviewOrder"),
    primaryBooks: [primaryBookPayload(1), primaryBookPayload(2)].filter(Boolean),
    backupBook: studentFieldValue("backupBook"),
    nextPlanStartChapterId: studentFieldValue("nextPlanStartChapterId"),
    dailyMathGoalHours: Number(studentFieldValue("dailyMathGoalHours")) || 0
  };
}

function exerciseBookLabel(book) {
  const code = legacyPrimaryBookCode(book);
  const option = PUBLIC_EXERCISE_BOOK_OPTIONS.find((item) => item.code === code);
  return option?.label || book || "-";
}

function primaryBookConfirmationLabel(item, index) {
  if (!item?.book) return index === 2 ? "不选" : "-";
  const scope = normalizedPrimaryBookScope(item.book, item.scope);
  const scopeText = PRIMARY_BOOK_SCOPE_SHORT_LABELS[scope];
  return scopeText ? `${exerciseBookLabel(item.book)}（${scopeText}）` : exerciseBookLabel(item.book);
}

function chapterStartLabel(chapterId) {
  if (!chapterId) return "不覆盖，按系统指针生成";
  const option = chapterStartOptions().find(([value]) => value === chapterId);
  return option ? `${option[0]} · ${option[1]}` : chapterId;
}

function studentDetailConfirmationFields(target) {
  const payload = studentDetailPayload();
  const classText = payload.classId ? `${payload.classId}${className(payload.classId) ? ` · ${className(payload.classId)}` : ""}` : "-";
  const primaryBooks = [
    primaryBookConfirmationLabel(payload.primaryBooks[0], 1),
    primaryBookConfirmationLabel(payload.primaryBooks[1], 2)
  ].filter(Boolean).join(" / ");
  return [
    ["修改后班型", payload.level || "-"],
    ["修改后班级", classText],
    ["数学类型", payload.mathType || "-"],
    ["目标分", String(payload.targetScore || "-")],
    ["联系 QQ", payload.contactQQ || "未填写"],
    ["服务期", payload.paidUntil || "未设置"],
    ["复习顺序", reviewOrderLabel(payload.reviewOrder)],
    ["主选习题", primaryBooks || "-"],
    ["备选习题", exerciseBookLabel(payload.backupBook)],
    ["明日起点章节", chapterStartLabel(payload.nextPlanStartChapterId)],
    ["每日目标时长", payload.dailyMathGoalHours ? `${payload.dailyMathGoalHours}h` : "-"]
  ];
}

async function performApiAction(actionKey, target) {
  if (actionKey === "export_students") return applyMockAction(actionKey, target);
  if (actionKey === "add_teacher") {
    const data = await adminApiRequest("/admin/teachers", adminJsonOptions("POST", {
      loginAccount: modalValue("loginAccount") || nextTeacherLogin(),
      nickname: modalValue("nickname"),
      contactQQ: modalValue("contactQQ"),
      status: modalValue("status") || "active"
    }));
    if (data.teacher) {
      upsertTeacher(data.teacher);
      state.teacherCreationResult = {
        teacher: data.teacher,
        userId: data.teacher.userId || "",
        loginAccount: data.teacher.loginAccount || "",
        nickname: data.teacher.nickname || "",
        initialPassword: data.initialPassword,
        createdAt: nowText()
      };
      state.search = data.teacher.loginAccount || "";
      if (globalSearch) globalSearch.value = state.search;
      showToast("老师账号已创建，初始密码已显示在老师管理页");
    }
    return true;
  }
  if (actionKey === "assign_teacher_class") {
    await adminApiRequest(`/admin/teachers/${apiSegment(target)}/classes`, adminJsonOptions("PATCH", {
      classIds: modalCheckedValues("classIds")
    }));
    return true;
  }
  if (actionKey === "modify_teacher_status") {
    const statusAction = modalValue("statusAction");
    const teacher = DATA.teachers.find((item) => item.userId === target || item.loginAccount === target);
    const nextStatus = statusAction === "keep"
      ? (teacher?.status || "active")
      : (statusAction === "delete" ? "archived" : (statusAction === "active" ? "active" : "disabled"));
    const data = await adminApiRequest(`/admin/teachers/${apiSegment(target)}/status`, adminJsonOptions("PATCH", {
      status: nextStatus,
      nickname: modalValue("nickname")
    }));
    if (data.teacher) upsertTeacher(data.teacher);
    return true;
  }
  if (actionKey === "reset_teacher_password" || actionKey === "reset_student_password") {
    const data = await adminApiRequest(`/admin/accounts/${apiSegment(target)}/reset-password`, adminJsonOptions("POST"));
    const resetPassword = data.newPassword || data.temporaryPassword || data.initialPassword || "";
    if (resetPassword) {
      const account = data.account || {};
      state.lastResetPassword = {
        target,
        userId: account.userId || target,
        loginAccount: account.loginAccount || target,
        password: resetPassword,
        resetAt: nowText(),
        actionKey
      };
      const resetMessage = actionKey === "reset_teacher_password"
        ? "新临时密码已生成，已显示在老师管理页"
        : "新临时密码已生成，可在详情页复制";
      showToast(resetMessage);
    } else {
      showToast("密码已重置，请刷新后再试", "warn");
    }
    return true;
  }
  if (actionKey === "add_class") {
    await adminApiRequest("/admin/classes", adminJsonOptions("POST", {
      mathType: modalValue("mathType"),
      level: modalValue("level"),
      classId: modalValue("classId"),
      className: modalValue("className"),
      teacherUserId: modalValue("teacherId"),
      qqGroupNumber: modalValue("qqGroupNumber"),
      capacity: Number(modalValue("capacity")) || 60,
      isAcceptingNewStudents: modalBool("isAcceptingNewStudents", true)
    }));
    return true;
  }
  if (actionKey === "edit_class") {
    await adminApiRequest(`/admin/classes/${apiSegment(target)}`, adminJsonOptions("PATCH", {
      className: modalValue("className"),
      teacherUserId: modalValue("teacherId"),
      qqGroupNumber: modalValue("qqGroupNumber"),
      capacity: Number(modalValue("capacity")) || 60,
      isAcceptingNewStudents: modalBool("isAcceptingNewStudents", true)
    }));
    return true;
  }
  if (actionKey === "save_student") {
    const data = await adminApiRequest(`/admin/students/${apiSegment(target)}`, adminJsonOptions("PATCH", studentDetailPayload()));
    if (data.student) {
      const index = DATA.students.findIndex((student) => student.userId === data.student.userId);
      if (index >= 0) DATA.students[index] = data.student;
      state.selectedStudentId = data.student.userId;
      if (state.view === "shortTerm") {
        await loadShortTermAccounts(true);
        await loadShortTermDetail(data.student.userId, true);
      }
    }
    return true;
  }
  if (actionKey === "migrate_trial") {
    await adminApiRequest(`/admin/short-term-accounts/${apiSegment(target)}/migrate-to-formal`, adminJsonOptions("POST", {
      actor: activeAdminUserId()
    }));
    state.selectedTrialDetailId = "";
    state.shortTermDetail = null;
    await loadShortTermAccounts(true);
    showToast("短期号已转为正式号");
    return true;
  }
  if (actionKey === "deactivate_short_term_account") {
    await adminApiRequest(`/admin/short-term-accounts/${apiSegment(target)}/deactivate`, adminJsonOptions("POST", {
      actor: activeAdminUserId()
    }));
    state.selectedTrialDetailId = "";
    state.shortTermDetail = null;
    await loadShortTermAccounts(true);
    showToast("短期号已停用");
    return true;
  }
  if (actionKey === "activate_short_term_account") {
    const data = await adminApiRequest("/admin/short-term-accounts/activate-next", adminJsonOptions("POST", {
      adminUserId: currentAdminUserId(),
      durationDays: 7,
      mathType: "数学二",
      level: "A",
      targetScore: 120
    }));
    state.shortTermActivationResult = data;
    if (data.student?.paidUntil) {
      const index = DATA.students.findIndex((student) => student.userId === data.student.userId);
      if (index >= 0) DATA.students[index] = data.student;
      else DATA.students.push(data.student);
      state.selectedTrialDetailId = data.student.userId;
    } else {
      state.selectedTrialDetailId = "";
    }
    state.view = "shortTerm";
    state.shortTermTab = data.student?.paidUntil ? "active" : "pending";
    await loadShortTermAccounts(true);
    state.search = data.activatedAccount || "";
    if (globalSearch) globalSearch.value = state.search;
    return true;
  }
  if (actionKey === "renew_service_30_days") {
    await adminApiRequest(`/admin/students/${apiSegment(target)}/renew-service`, adminJsonOptions("POST", { days: 30 }));
    return true;
  }
  if (actionKey === "update_intake") {
    const mathType = modalValue("intakeMathType");
    const level = modalValue("intakeLevel");
    await adminApiRequest(`/admin/class-intake-settings/${apiSegment(mathType)}/${apiSegment(level)}`, adminJsonOptions("PATCH", {
      activeClassId: modalValue("activeClassId")
    }));
    return true;
  }
  return applyMockAction(actionKey, target);
}

async function confirmActionModal() {
  if (state.modalMode === "riskAuth") {
    await confirmRiskAuthModal();
    return;
  }
  if (!state.pendingAction) return;
  const { actionKey, target } = state.pendingAction;
  const flow = DATA.actionFlows[actionKey];
  if (!flow) return;
  modalConfirm.disabled = true;
  try {
    if (!await performApiAction(actionKey, target)) return;
    await loadAdminConsoleDataIfNeeded(true);
    closeActionModal();
    showToast(`${flow.successMessage}：${targetLabel(actionKey, target)}`, flow.danger ? "warn" : "success");
    render();
  } catch (error) {
    showToast(error.message || "后台操作失败", "warn");
  } finally {
    modalConfirm.disabled = false;
  }
}

function showToast(message, tone = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${tone}`;
  toast.textContent = message;
  toastRegion.appendChild(toast);
  window.setTimeout(() => {
    toast.remove();
  }, 2600);
}

document.addEventListener("submit", async (event) => {
  const formalTotpForm = event.target.closest("[data-formal-totp-form]");
  if (formalTotpForm) {
    event.preventDefault();
    const formData = new FormData(formalTotpForm);
    await activateFormalCredential(String(formData.get("totpCode") || ""));
    return;
  }
  const form = event.target.closest("[data-announcement-submit]");
  if (!form) return;
  event.preventDefault();
  const formData = new FormData(form);
  formData.append("createdBy", DATA.currentUsers.admin.userId);
  try {
    await adminApiRequest("/admin/announcements", {
      method: "POST",
      body: formData,
    });
    state.announcements = [];
    state.announcementLoaded = false;
    state.announcementError = "";
    showToast("公告已发布");
    render();
  } catch (error) {
    state.announcementError = error.message || "公告发布失败";
    render();
  }
});

document.addEventListener("click", async (event) => {
  const authButton = event.target.closest("[data-auth-action]");
  if (authButton) {
    const action = authButton.dataset.authAction;
    if (action === "login") {
      submitLogin();
    } else if (action === "toggle-password") {
      toggleBackofficePasswordVisibility();
    } else if (action === "verify-totp") {
      submitTotp();
    } else if (action === "back-login") {
      state.authStage = "login";
      state.pendingRole = null;
      state.authError = "";
      renderAuth();
    } else if (action === "fill-admin" || action === "fill-teacher" || action === "fill-student") {
      const demoAccounts = {
        "fill-admin": "adm001",
        "fill-teacher": "teacher01",
        "fill-student": "stu60001"
      };
      const input = document.getElementById("loginAccountInput");
      if (input) input.value = demoAccounts[action];
      state.pendingLoginAccount = demoAccounts[action];
      state.authError = "";
    }
    return;
  }

  const closeButton = event.target.closest("[data-modal-close]");
  if (closeButton || event.target === actionModal) {
    closeActionModal();
    return;
  }
  if (event.target.closest("[data-admin-data-retry]")) {
    await loadBackofficeDataIfNeeded(true);
    return;
  }
  if (event.target.closest("[data-teacher-password-save]")) {
    await submitTeacherPasswordChange();
    return;
  }
  if (event.target.closest("[data-teacher-profile-save]")) {
    await submitTeacherProfileChange();
    return;
  }
  const confirmButton = event.target.closest("[data-modal-confirm]");
  if (confirmButton) {
    await confirmActionModal();
    return;
  }
  const navButton = event.target.closest("[data-view]");
  if (navButton) {
    state.view = navButton.dataset.view;
    resetAllPagination();
    render();
    return;
  }
  const roleButton = event.target.closest("[data-role]");
  if (roleButton) {
    if (roleButton.dataset.role === "admin" && state.authenticatedRole !== "admin") {
      showToast("教师账号没有管理员端权限。", "warn");
      return;
    }
    state.role = roleButton.dataset.role;
    state.view = state.role === "admin" ? "overview" : "teacherToday";
    if (state.role === "teacher") {
      ensurePreviewTeacherContext();
    }
    state.search = "";
    globalSearch.value = "";
    resetAllPagination();
    render();
    return;
  }
  const jumpButton = event.target.closest("[data-jump]");
  if (jumpButton) {
    state.view = jumpButton.dataset.jump;
    resetAllPagination();
    render();
    return;
  }
  if (event.target.closest("[data-formal-load]")) {
    await loadFormalCredential(true);
    return;
  }
  if (event.target.closest("[data-formal-copy]")) {
    await copyFormalCredential();
    return;
  }
  if (event.target.closest("[data-formal-refresh-password]")) {
    await refreshFormalCredential();
    return;
  }
  if (event.target.closest("[data-formal-activate]")) {
    await activateFormalCredential();
    return;
  }
  if (event.target.closest("[data-formal-totp-cancel]")) {
    state.formalTotpPrompt = null;
    render();
    return;
  }
  if (event.target.closest("[data-announcement-refresh]")) {
    state.announcements = [];
    state.announcementLoaded = false;
    loadAnnouncementsIfNeeded(true);
    return;
  }
  const hideAnnouncement = event.target.closest("[data-announcement-hide]");
  if (hideAnnouncement) {
    try {
      await adminApiRequest(`/admin/announcements/${hideAnnouncement.dataset.announcementHide}/hide`, { method: "POST" });
      state.announcements = [];
      state.announcementLoaded = false;
      showToast("公告已下架");
      loadAnnouncementsIfNeeded(true);
    } catch (error) {
      showToast(error.message || "公告下架失败", "warn");
    }
    return;
  }
  const closeTrialDetail = event.target.closest("[data-close-trial-detail]");
  if (closeTrialDetail) {
    state.selectedTrialDetailId = "";
    render();
    return;
  }
  const pageButton = event.target.closest("[data-page-action]");
  if (pageButton) {
    const key = pageButton.dataset.pageKey || "";
    const pageState = paginationState(key);
    const direction = pageButton.dataset.pageAction;
    if (direction === "prev") {
      setPaginationPage(key, pageState.page - 1);
    }
    if (direction === "next") {
      setPaginationPage(key, pageState.page + 1);
    }
    render();
    return;
  }
  if (event.target.closest("[data-wrong-question-export]")) {
    showToast("正在导出错题清单");
    return;
  }
  const actionEl = event.target.closest("[data-action]");
  if (actionEl) {
    if (actionEl.dataset.action === "view_trial") {
      state.selectedTrialDetailId = actionEl.dataset.actionTarget || "";
      state.shortTermDetail = null;
      render();
      loadShortTermDetail(state.selectedTrialDetailId);
      showToast("已打开短期号详情");
      return;
    }
    openActionModal(actionEl.dataset.action, actionEl.dataset.actionTarget || "");
    return;
  }
  const resultButton = event.target.closest("[data-result-kind]");
  if (resultButton) {
    openSearchResult(resultButton.dataset.resultKind, resultButton.dataset.resultId);
    return;
  }
  const studentButton = event.target.closest("[data-select-student]");
  if (studentButton) {
    state.selectedStudentId = studentButton.dataset.selectStudent;
    if (studentButton.dataset.jumpAfterSelect) {
      state.view = studentButton.dataset.jumpAfterSelect;
    }
    render();
    return;
  }
  const statusButton = event.target.closest("[data-teacher-status]");
  if (statusButton) {
    state.teacherStatus = statusButton.dataset.teacherStatus;
    render();
    return;
  }
  const shortTermButton = event.target.closest("[data-short-term-tab]");
  if (shortTermButton) {
    state.shortTermTab = shortTermButton.dataset.shortTermTab;
    resetPagination("shortTerm");
    render();
    return;
  }
  const resetCopyButton = event.target.closest("[data-copy-reset-password]");
  if (resetCopyButton) {
    await copyText(resetCopyButton.dataset.copyResetPassword || "", "已复制");
    resetCopyButton.textContent = "已复制";
    return;
  }
  const teacherPasswordButton = event.target.closest("[data-copy-teacher-password]");
  if (teacherPasswordButton) {
    await copyText(teacherPasswordButton.dataset.copyTeacherPassword || "", "已复制");
    teacherPasswordButton.textContent = "已复制";
    return;
  }
  const shortTermPasswordButton = event.target.closest("[data-copy-short-term-password]");
  if (shortTermPasswordButton) {
    await copyText(shortTermPasswordButton.dataset.copyShortTermPassword || "", "已复制");
    shortTermPasswordButton.textContent = "已复制";
    return;
  }
  const copyButton = event.target.closest("[data-copy]");
  if (copyButton) {
    const text = copyButton.dataset.copy || "";
    await copyText(text, "已复制 QQ 到剪贴板");
    copyButton.textContent = text ? "已复制" : "无可复制内容";
    window.setTimeout(() => render(), 800);
  }
});

document.addEventListener("keydown", async (event) => {
  if (event.key === "Enter" && state.authStage === "login" && document.activeElement?.closest(".auth-root")) {
    submitLogin();
  }
  if (event.key === "Enter" && state.authStage === "totp" && document.activeElement?.closest(".auth-root")) {
    submitTotp();
  }
  if (event.key === "Enter" && state.modalMode === "riskAuth" && !actionModal.hidden) {
    await confirmRiskAuthModal();
  }
  if (event.key === "Enter" && event.target === globalSearch) {
    event.preventDefault();
    openFirstSearchResult();
  }
  if (event.key === "Escape" && !actionModal.hidden) {
    closeActionModal();
  }
});

document.addEventListener("change", (event) => {
  const modalField = event.target.closest("#actionModal [data-field]");
  if (modalField && state.pendingAction?.actionKey === "add_class" && ["mathType", "level"].includes(modalField.dataset.field)) {
    syncCreateClassDerivedFields();
    return;
  }
  const pageInput = event.target.closest("[data-page-input]");
  if (pageInput) {
    setPaginationPage(pageInput.dataset.pageKey || "", pageInput.value);
    render();
    return;
  }
  const accountFilter = event.target.closest("[data-account-filter]");
  if (accountFilter) {
    state.accountFilters[accountFilter.dataset.accountFilter] = accountFilter.value;
    normalizeAccountFilters();
    resetPagination("accounts");
    render();
    return;
  }
  const classFilter = event.target.closest("[data-class-filter]");
  if (classFilter) {
    state.classFilters[classFilter.dataset.classFilter] = classFilter.value;
    resetAllPagination();
    render();
    return;
  }
  const studentField = event.target.closest("[data-student-field]");
  if (studentField) {
    const student = selectedStudent();
    if (!student) return;
    const field = studentField.dataset.studentField;
    if (field === "level") {
      student.level = studentField.value;
      const options = studentClassOptions(student.level, student.mathType);
      student.classId = options[0]?.[0] || "";
      render();
      return;
    }
    if (field === "mathType") {
      student.mathType = studentField.value;
      const options = studentClassOptions(student.level, student.mathType);
      student.classId = options[0]?.[0] || "";
      render();
      return;
    }
    if (field === "classId") {
      const info = classInfo(studentField.value);
      student.classId = studentField.value;
      if (info) {
        student.level = info.level;
        student.mathType = info.mathType;
      }
      render();
      return;
    }
    if (field === "primaryBook1" || field === "primaryBook2") {
      const primaryBooks = [primaryBookPayload(1), primaryBookPayload(2)].filter(Boolean);
      if (primaryBooks[0] && primaryBooks[1] && primaryBooks[0].book === primaryBooks[1].book) {
        student.primaryBooks = [primaryBooks[0].book];
        student.primaryBookScopes = [primaryBooks[0].scope];
      } else {
        student.primaryBooks = primaryBooks.map((item) => item.book);
        student.primaryBookScopes = primaryBooks.map((item) => item.scope);
      }
      render();
      return;
    }
  }
  const previewTeacher = event.target.closest("[data-preview-teacher]");
  if (previewTeacher) {
    state.previewTeacherId = previewTeacher.dataset.previewTeacher || previewTeacher.value;
    const classes = teacherClassesForCurrentUser();
    state.teacherClassId = classes[0]?.classId || "";
    state.teacherStatus = "unsubmitted";
    state.teacherInfoFilters = { classId: "all", feedbackStatus: "all", studentStatus: "all" };
    state.teacherHighlightedStudentId = "";
    state.search = "";
    if (globalSearch) globalSearch.value = "";
    render();
    return;
  }
  const teacherInfoFilter = event.target.closest("[data-teacher-info-filter]");
  if (teacherInfoFilter) {
    state.teacherInfoFilters[teacherInfoFilter.dataset.teacherInfoFilter] = teacherInfoFilter.value;
    state.teacherHighlightedStudentId = "";
    render();
    return;
  }
  if (event.target.id === "teacherClassSelect") {
    state.teacherClassId = event.target.value;
    state.teacherStatus = "unsubmitted";
    render();
  }
});

document.addEventListener("change", (event) => {
  const input = event.target.closest("[data-announcement-image]");
  if (!input) return;
  const preview = document.querySelector("[data-announcement-image-preview]");
  const file = input.files?.[0];
  if (!preview) return;
  if (!file) {
    preview.hidden = true;
    preview.innerHTML = "";
    return;
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 1024 * 1024) {
    input.value = "";
    preview.hidden = false;
    preview.textContent = "图片仅支持 JPG / PNG / WebP，且不能超过 1MB。";
    return;
  }
  preview.hidden = false;
  preview.textContent = `${file.name} · ${(file.size / 1024).toFixed(0)}KB`;
});

document.addEventListener("input", (event) => {
  if (event.target === globalSearch) {
    state.search = event.target.value.trim();
    resetAllPagination();
    render();
  }
});

document.addEventListener("click", (event) => {
  if (event.target === resetSearch) {
    state.search = "";
    globalSearch.value = "";
    resetAllPagination();
    render();
  }
  if (event.target.id === "lookupButton") {
    const input = document.getElementById("lookupInput");
    state.lookupQuery = input?.value || "";
    render();
  }
});

const restoredBackofficeSession = restoreBackofficeAuthSession();
if (["admin", "teacher"].includes(restoredBackofficeSession?.user?.role)) {
  completeLogin(restoredBackofficeSession.user.role);
} else {
  renderAuth();
}
window.setInterval(updateRiskAuthPill, 1000);

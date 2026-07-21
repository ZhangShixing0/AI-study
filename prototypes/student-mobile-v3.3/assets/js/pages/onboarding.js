(function () {
  const SCOPED_BOOK_CODES = new Set(["880", "1000"]);
  const SCOPE_LABELS = {
    basic: "只布置基础题",
    advanced: "只布置强化题",
    both: "基础题和强化题都布置",
  };
  const MATH2_FALLBACK_CHAPTERS = {
    "M2-CH-0001": { chapterId: "M2-CH-0001", subject: "高等数学", chapterName: "极限" },
    "M2-CH-0002": { chapterId: "M2-CH-0002", subject: "高等数学", chapterName: "一元函数微分学" },
    "M2-CH-0003": { chapterId: "M2-CH-0003", subject: "高等数学", chapterName: "微分应用（一）函数性态" },
    "M2-CH-0004": { chapterId: "M2-CH-0004", subject: "高等数学", chapterName: "微分应用（二）中值定理" },
    "M2-CH-0005": { chapterId: "M2-CH-0005", subject: "高等数学", chapterName: "一元函数积分学" },
    "M2-CH-0006": { chapterId: "M2-CH-0006", subject: "高等数学", chapterName: "一元函数积分学应用" },
    "M2-CH-0007": { chapterId: "M2-CH-0007", subject: "高等数学", chapterName: "多元微分" },
    "M2-CH-0008": { chapterId: "M2-CH-0008", subject: "高等数学", chapterName: "二重积分" },
    "M2-CH-0009": { chapterId: "M2-CH-0009", subject: "高等数学", chapterName: "微分方程" },
    "M2-CH-0010": { chapterId: "M2-CH-0010", subject: "线性代数", chapterName: "行列式" },
    "M2-CH-0011": { chapterId: "M2-CH-0011", subject: "线性代数", chapterName: "矩阵" },
    "M2-CH-0012": { chapterId: "M2-CH-0012", subject: "线性代数", chapterName: "向量" },
    "M2-CH-0013": { chapterId: "M2-CH-0013", subject: "线性代数", chapterName: "线性方程组" },
    "M2-CH-0014": { chapterId: "M2-CH-0014", subject: "线性代数", chapterName: "特征值" },
    "M2-CH-0015": { chapterId: "M2-CH-0015", subject: "线性代数", chapterName: "二次型" },
  };
  const MATH2_FALLBACK_REVIEW_ORDERS = {
    gaoshu_first: [
      "M2-CH-0001",
      "M2-CH-0002",
      "M2-CH-0003",
      "M2-CH-0004",
      "M2-CH-0005",
      "M2-CH-0006",
      "M2-CH-0007",
      "M2-CH-0008",
      "M2-CH-0009",
      "M2-CH-0010",
      "M2-CH-0011",
      "M2-CH-0012",
      "M2-CH-0013",
      "M2-CH-0014",
      "M2-CH-0015",
    ],
    mixed: [
      "M2-CH-0001",
      "M2-CH-0002",
      "M2-CH-0003",
      "M2-CH-0004",
      "M2-CH-0007",
      "M2-CH-0010",
      "M2-CH-0011",
      "M2-CH-0012",
      "M2-CH-0013",
      "M2-CH-0005",
      "M2-CH-0006",
      "M2-CH-0008",
      "M2-CH-0014",
      "M2-CH-0015",
      "M2-CH-0009",
    ],
  };

  let root = null;
  let state = null;
  let completionResolve = null;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function ensureRoot() {
    if (root) return root;
    root = document.createElement("section");
    root.id = "onboardingRoot";
    root.className = "onboarding-screen";
    root.hidden = true;
    document.body.appendChild(root);
    root.addEventListener("change", async (event) => {
      const mathTypeField = event.target.closest("select[name='mathType']");
      if (mathTypeField && state.step === 1) {
        saveStepOneValues();
        await loadRegistrationOptions(`/public/registration-options?mathType=${encodeURIComponent(state.values.mathType)}`);
        render();
        return;
      }
      const reviewOrderField = event.target.closest("select[name='reviewOrder']");
      if (reviewOrderField && state.step === 1) {
        saveStepOneValues();
        applyRegistrationDefaults();
        render();
        return;
      }
      const changedBook = event.target.closest("[data-onboarding-primary-book]");
      if (!changedBook || state.step !== 1) return;
      saveStepOneValues();
      render();
    });
    root.addEventListener("click", (event) => {
      const previousButton = event.target.closest("[data-onboarding-prev]");
      if (!previousButton) return;
      saveDiagnosticValues();
      state.step = 1;
      state.error = "";
      render();
    });
    root.addEventListener("submit", async (event) => {
      const form = event.target.closest("[data-onboarding-form]");
      if (!form) return;
      event.preventDefault();
      if (state.step === 1) {
        saveStepOneValues();
        const error = validateStepOne();
        if (error) {
          state.error = error;
          render();
          return;
        }
        state.step = 2;
        state.error = "";
        render();
        window.scrollTo({ top: 0, behavior: "instant" });
        return;
      }
      saveDiagnosticValues();
      await submitOnboarding(form);
    });
    return root;
  }

  function defaultValues() {
    return {
      nickname: "",
      gender: "male",
      qq: "",
      newPassword: "",
      confirmPassword: "",
      mathType: "数学二",
      targetScore: "120",
      foundationLevel: "基础一般",
      primaryBook1: "m2_880",
      primaryBook1Scope: "both",
      primaryBook2: "m2_1000",
      primaryBook2Scope: "both",
      backupBook: "m2_660",
      dailyStudyHours: "3",
      intensiveDays: "60",
      reviewOrder: "gaoshu_first",
      startChapterId: "",
      answerLimit: "",
      answerDerivative: "",
    };
  }

  function math2FallbackStartChapterOptions() {
    const byReviewOrder = {};
    for (const [reviewOrder, chapterIds] of Object.entries(MATH2_FALLBACK_REVIEW_ORDERS)) {
      byReviewOrder[reviewOrder] = chapterIds.map((chapterId, index) => ({
        ...MATH2_FALLBACK_CHAPTERS[chapterId],
        sortOrder: index + 1,
      }));
    }
    return byReviewOrder;
  }

  function fallbackRegistrationOptions(mathType = "数学二") {
    const prefix = mathType === "数学一" ? "m1" : mathType === "数学三" ? "m3" : "m2";
    const startChapterOptionsByReviewOrder = prefix === "m2"
      ? math2FallbackStartChapterOptions()
      : {
          mixed: [],
          gaoshu_first: [],
        };
    return {
      mathType,
      dataSource: "local_fallback",
      planVariants: [
        {
          planVariantId: `${prefix}_gaoshu_first`,
          reviewOrder: "gaoshu_first",
          studentLabel: "先高数后线代",
          variantName: "先高数后线代版",
          sortOrder: 1,
        },
        {
          planVariantId: `${prefix}_mixed`,
          reviewOrder: "mixed",
          studentLabel: "高数线代穿插学习",
          variantName: "高数线代穿插版",
          sortOrder: 2,
        },
      ],
      exerciseBooks: [
        { bookId: `${prefix}_880`, legacyCode: "880", bookName: "880题", bookType: "主选", sortOrder: 1 },
        { bookId: `${prefix}_1000`, legacyCode: "1000", bookName: "1000题", bookType: "主选", sortOrder: 2 },
        { bookId: `${prefix}_660`, legacyCode: "660", bookName: "660题", bookType: "备选", sortOrder: 3 },
        { bookId: `${prefix}_yanxuan`, legacyCode: "严选题", bookName: "严选题", bookType: "题源", sortOrder: 4 },
      ],
      startChapterOptionsByReviewOrder,
      defaults: {
        reviewOrder: "gaoshu_first",
        primaryBookIds: [`${prefix}_880`, `${prefix}_1000`],
        backupBookId: `${prefix}_660`,
      },
    };
  }

  function normalizeStartChapterList(chapters) {
    return Array.isArray(chapters)
      ? chapters
          .map((chapter, index) => ({
            chapterId: String(chapter.chapterId || "").trim(),
            chapterName: String(chapter.chapterName || chapter.chapterId || "").trim(),
            subject: String(chapter.subject || "").trim(),
            sortOrder: Number(chapter.sortOrder || index + 1),
          }))
          .filter((chapter) => chapter.chapterId && chapter.chapterName)
      : [];
  }

  function mergeStartChapterOptions(rawChapters, fallbackChapters) {
    const mergedChapters = [];
    const seenChapterIds = new Set();
    for (const chapter of rawChapters) {
      if (seenChapterIds.has(chapter.chapterId)) continue;
      seenChapterIds.add(chapter.chapterId);
      mergedChapters.push(chapter);
    }
    for (const chapter of fallbackChapters) {
      if (seenChapterIds.has(chapter.chapterId)) continue;
      seenChapterIds.add(chapter.chapterId);
      mergedChapters.push(chapter);
    }
    return mergedChapters;
  }

  function normalizeRegistrationOptions(rawOptions, mathType) {
    const fallback = fallbackRegistrationOptions(mathType);
    const rawBooks = Array.isArray(rawOptions?.exerciseBooks) ? rawOptions.exerciseBooks : [];
    const rawPlans = Array.isArray(rawOptions?.planVariants) ? rawOptions.planVariants : [];
    const exerciseBooks = rawBooks
      .map((book, index) => ({
        bookId: String(book.bookId || "").trim(),
        legacyCode: String(book.legacyCode || "").trim(),
        bookName: String(book.bookName || book.legacyCode || book.bookId || "").trim(),
        bookType: String(book.bookType || "").trim(),
        sortOrder: Number(book.sortOrder || index + 1),
      }))
      .filter((book) => book.bookId && book.bookName);
    const planVariants = rawPlans
      .map((variant, index) => ({
        planVariantId: String(variant.planVariantId || "").trim(),
        reviewOrder: String(variant.reviewOrder || "").trim(),
        studentLabel: String(variant.studentLabel || variant.variantName || variant.reviewOrder || "").trim(),
        variantName: String(variant.variantName || "").trim(),
        sortOrder: Number(variant.sortOrder || index + 1),
      }))
      .filter((variant) => variant.reviewOrder && variant.studentLabel);
    const rawChapterOptions = rawOptions?.startChapterOptionsByReviewOrder || {};
    const startChapterOptionsByReviewOrder = {};
    const reviewOrdersWithChapters = new Set([
      ...Object.keys(fallback.startChapterOptionsByReviewOrder || {}),
      ...Object.keys(rawChapterOptions),
    ]);
    for (const reviewOrder of reviewOrdersWithChapters) {
      const fallbackChapters = fallback.startChapterOptionsByReviewOrder?.[reviewOrder] || [];
      const rawChapters = normalizeStartChapterList(rawChapterOptions[reviewOrder]);
      startChapterOptionsByReviewOrder[reviewOrder] = mergeStartChapterOptions(rawChapters, fallbackChapters);
    }
    return {
      mathType: rawOptions?.mathType || mathType,
      dataSource: rawOptions?.dataSource || fallback.dataSource,
      planVariants: planVariants.length ? planVariants : fallback.planVariants,
      exerciseBooks: exerciseBooks.length ? exerciseBooks : fallback.exerciseBooks,
      startChapterOptionsByReviewOrder,
      defaults: {
        reviewOrder: rawOptions?.defaults?.reviewOrder || planVariants[0]?.reviewOrder || fallback.defaults.reviewOrder,
        primaryBookIds: Array.isArray(rawOptions?.defaults?.primaryBookIds) && rawOptions.defaults.primaryBookIds.length
          ? rawOptions.defaults.primaryBookIds
          : fallback.defaults.primaryBookIds,
        backupBookId: rawOptions?.defaults?.backupBookId || fallback.defaults.backupBookId,
      },
    };
  }

  function registrationBookOptions() {
    return state.registrationOptions?.exerciseBooks?.length
      ? state.registrationOptions.exerciseBooks
      : fallbackRegistrationOptions(state.values.mathType).exerciseBooks;
  }

  function registrationPlanOptions() {
    return state.registrationOptions?.planVariants?.length
      ? state.registrationOptions.planVariants
      : fallbackRegistrationOptions(state.values.mathType).planVariants;
  }

  function startChapterOptions() {
    const byOrder = state.registrationOptions?.startChapterOptionsByReviewOrder || {};
    return byOrder[state.values.reviewOrder] || [];
  }

  function registrationBookById(bookId) {
    return registrationBookOptions().find((book) => book.bookId === bookId) || null;
  }

  function legacyBookCode(bookId) {
    const book = registrationBookById(bookId);
    if (book?.legacyCode) return book.legacyCode;
    return String(bookId || "").replace(/^m\d+_/, "");
  }

  function isScopedBookId(bookId) {
    return SCOPED_BOOK_CODES.has(legacyBookCode(bookId));
  }

  function applyRegistrationDefaults() {
    const options = state.registrationOptions || fallbackRegistrationOptions(state.values.mathType);
    const bookIds = new Set(options.exerciseBooks.map((book) => book.bookId));
    const reviewOrders = new Set(options.planVariants.map((variant) => variant.reviewOrder));
    const primaryDefaults = options.defaults.primaryBookIds || [];

    if (!reviewOrders.has(state.values.reviewOrder)) {
      state.values.reviewOrder = options.defaults.reviewOrder || options.planVariants[0]?.reviewOrder || "mixed";
    }
    const chapters = options.startChapterOptionsByReviewOrder?.[state.values.reviewOrder] || [];
    if (!chapters.some((chapter) => chapter.chapterId === state.values.startChapterId)) {
      state.values.startChapterId = chapters[0]?.chapterId || "";
    }
    if (!bookIds.has(state.values.primaryBook1)) {
      state.values.primaryBook1 = primaryDefaults[0] || options.exerciseBooks[0]?.bookId || "";
    }
    if (!bookIds.has(state.values.primaryBook2) || state.values.primaryBook2 === state.values.primaryBook1) {
      state.values.primaryBook2 = primaryDefaults.find((bookId) => bookId !== state.values.primaryBook1)
        || options.exerciseBooks.find((book) => book.bookId !== state.values.primaryBook1)?.bookId
        || "";
    }
    if (!bookIds.has(state.values.backupBook)) {
      state.values.backupBook = options.defaults.backupBookId || options.exerciseBooks[2]?.bookId || options.exerciseBooks[0]?.bookId || "";
    }
    for (const slot of ["1", "2"]) {
      if (!isScopedBookId(state.values[`primaryBook${slot}`])) {
        state.values[`primaryBook${slot}Scope`] = "all";
      } else if (!state.values[`primaryBook${slot}Scope`] || state.values[`primaryBook${slot}Scope`] === "all") {
        state.values[`primaryBook${slot}Scope`] = "both";
      }
    }
  }

  async function loadRegistrationOptions(requestPath) {
    state.registrationOptionsError = "";
    const mathType = state.values.mathType || "数学二";
    try {
      const options = state.apiRequest
        ? await state.apiRequest(requestPath || `/public/registration-options?mathType=${encodeURIComponent(mathType)}`)
        : null;
      state.registrationOptions = normalizeRegistrationOptions(options, mathType);
    } catch (error) {
      state.registrationOptionsError = error.message || "registration options unavailable";
      state.registrationOptions = fallbackRegistrationOptions(mathType);
    }
    applyRegistrationDefaults();
  }

  function saveStepOneValues() {
    if (!root || !state) return;
    const data = new FormData(root.querySelector("[data-onboarding-form]"));
    [
      "nickname",
      "gender",
      "qq",
      "newPassword",
      "confirmPassword",
      "mathType",
      "targetScore",
      "foundationLevel",
      "primaryBook1",
      "primaryBook1Scope",
      "primaryBook2",
      "primaryBook2Scope",
      "backupBook",
      "dailyStudyHours",
      "intensiveDays",
      "reviewOrder",
      "startChapterId",
    ].forEach((key) => {
      if (data.has(key)) state.values[key] = String(data.get(key) || "");
    });
  }

  function saveDiagnosticValues() {
    if (!root || !state) return;
    const data = new FormData(root.querySelector("[data-onboarding-form]"));
    state.values.answerLimit = String(data.get("answerLimit") || state.values.answerLimit || "");
    state.values.answerDerivative = String(data.get("answerDerivative") || state.values.answerDerivative || "");
  }

  function validateStepOne() {
    const values = state.values;
    const score = Number(values.targetScore);
    const hours = Number(values.dailyStudyHours);
    const intensiveDays = Number(values.intensiveDays);
    const nickname = values.nickname.trim();
    if (!nickname) return "请填写账号名字";
    if (Array.from(nickname).length > 5) return "姓名最多 5 个字";
    if (!/^\d{5,15}$/.test(values.qq.trim())) return "QQ号请填写 5-15 位数字";
    if (values.newPassword.length !== 8) return "新密码必须是 8 位";
    if (!/[A-Za-z]/.test(values.newPassword) || !/\d/.test(values.newPassword)) return "新密码需要同时包含字母和数字";
    if (values.newPassword !== values.confirmPassword) return "两次输入的新密码不一致";
    if (!score || score < 1 || score > 150) return "目标分数必须在 1-150 之间";
    if (!hours || hours <= 0 || hours > 12) return "每日数学学习时长目标必须大于 0 且不超过 12h";
    if (!Number.isInteger(intensiveDays) || intensiveDays < 40 || intensiveDays > 100) return "预计强化阶段天数必须是 40-100 的整数";
    if (!values.primaryBook1 || !values.primaryBook2) return "主选习题册必须选择两本";
    if (values.primaryBook1 === values.primaryBook2) return "两本主选习题册不能重复";
    if (!values.backupBook) return "请选择备选习题册";
    for (const slot of ["1", "2"]) {
      const book = values[`primaryBook${slot}`];
      const scope = values[`primaryBook${slot}Scope`];
      if (isScopedBookId(book) && !scope) return `${legacyBookCode(book)} 需要选择题目范围`;
    }
    return "";
  }

  function option(value, label, selectedValue) {
    return `<option value="${escapeHtml(value)}" ${String(value) === String(selectedValue) ? "selected" : ""}>${escapeHtml(label)}</option>`;
  }

  function selectField(label, name, options, value, extra = "") {
    return `
      <label class="onboarding-field">
        <span>${escapeHtml(label)}</span>
        <select name="${escapeHtml(name)}" ${extra}>
          ${options.map(([itemValue, itemLabel]) => option(itemValue, itemLabel, value)).join("")}
        </select>
      </label>
    `;
  }

  function inputField(label, name, value, attrs = "") {
    return `
      <label class="onboarding-field">
        <span>${escapeHtml(label)}</span>
        <input name="${escapeHtml(name)}" value="${escapeHtml(value)}" ${attrs} />
      </label>
    `;
  }

  function primaryBookField(slot) {
    const bookKey = `primaryBook${slot}`;
    const scopeKey = `primaryBook${slot}Scope`;
    const book = state.values[bookKey];
    const scope = state.values[scopeKey];
    const otherBook = state.values[`primaryBook${slot === 1 ? 2 : 1}`];
    const options = registrationBookOptions()
      .filter((item) => item.bookId === book || item.bookId !== otherBook)
      .map((item) => [item.bookId, `《${item.bookName || item.legacyCode || item.bookId}》`]);
    const scopeHtml = isScopedBookId(book)
      ? selectField("题目范围", scopeKey, Object.entries(SCOPE_LABELS), scope)
      : `<div class="onboarding-scope-note">该习题册默认布置全部题目</div>`;
    return `
      <div class="onboarding-book-group">
        ${selectField(`主选习题册 ${slot}`, bookKey, options, book, "data-onboarding-primary-book")}
        ${scopeHtml}
      </div>
    `;
  }

  function renderProgress() {
    return `
      <div class="onboarding-progress" aria-label="首次开通步骤">
        <span class="${state.step === 1 ? "is-active" : "is-done"}">1</span>
        <i></i>
        <span class="${state.step === 2 ? "is-active" : ""}">2</span>
      </div>
    `;
  }

  function renderStepOne() {
    const values = state.values;
    return `
      <form class="onboarding-card" data-onboarding-form>
        <header class="onboarding-head">
          <div>
            <p>首次开通</p>
            <h1>完善你的备考配置</h1>
          </div>
          ${renderProgress()}
        </header>
        ${state.error ? `<div class="onboarding-error">${escapeHtml(state.error)}</div>` : ""}
        <div class="onboarding-grid">
          ${inputField("账号名字", "nickname", values.nickname, 'maxlength="5" placeholder="例如：张同学" required')}
          ${selectField("性别", "gender", [["male", "男"], ["female", "女"]], values.gender)}
          ${inputField("QQ号", "qq", values.qq, 'inputmode="numeric" placeholder="用于加入班级群" required')}
          ${inputField("设置新的 8 位密码", "newPassword", values.newPassword, 'type="password" maxlength="8" autocomplete="new-password" required')}
          ${inputField("再次确认新密码", "confirmPassword", values.confirmPassword, 'type="password" maxlength="8" autocomplete="new-password" required')}
          ${selectField("备考配置数学类型", "mathType", [["数学一", "数学一"], ["数学二", "数学二"], ["数学三", "数学三"]], values.mathType)}
          ${inputField("目标分数", "targetScore", values.targetScore, 'type="number" min="1" max="150" inputmode="numeric" required')}
          ${selectField("当前基础水平", "foundationLevel", [["基础薄弱", "基础薄弱"], ["基础一般", "基础一般"], ["基础较好", "基础较好"], ["强化冲刺", "强化冲刺"]], values.foundationLevel)}
        </div>
        <section class="onboarding-section">
          <h2>习题册选择</h2>
          ${primaryBookField(1)}
          ${primaryBookField(2)}
          ${selectField("备选习题册", "backupBook", registrationBookOptions().map((item) => [item.bookId, `《${item.bookName || item.legacyCode || item.bookId}》`]), values.backupBook)}
        </section>
        <section class="onboarding-section">
          <h2>学习节奏</h2>
          <div class="onboarding-grid">
            ${inputField("每日数学学习时长目标（h）", "dailyStudyHours", values.dailyStudyHours, 'type="number" min="0.5" max="12" step="0.5" required')}
            ${inputField("预计强化阶段天数（40-100）", "intensiveDays", values.intensiveDays, 'type="number" min="40" max="100" step="1" required')}
            ${selectField("复习顺序", "reviewOrder", registrationPlanOptions().map((item) => [item.reviewOrder, item.studentLabel]), values.reviewOrder)}
            ${selectField("强化开始章节", "startChapterId", startChapterOptions().map((item) => [item.chapterId, `${item.subject ? `${item.subject} · ` : ""}${item.chapterName}`]), values.startChapterId)}
          </div>
        </section>
        <button class="onboarding-submit" type="submit">保存基本信息，进入诊断题</button>
      </form>
    `;
  }

  function renderFormulaLimit() {
    return `
      <math display="block">
        <munder><mo>lim</mo><mrow><mi>x</mi><mo>→</mo><mn>0</mn></mrow></munder>
        <mfrac>
          <mrow><mi>tan</mi><mi>x</mi><mo>-</mo><mi>sin</mi><mi>x</mi></mrow>
          <msup><mi>x</mi><mn>3</mn></msup>
        </mfrac>
      </math>
    `;
  }

  function renderFormulaDerivative() {
    return `
      <math display="block">
        <mi>f</mi><mo>(</mo><mi>x</mi><mo>)</mo><mo>=</mo><mo>|</mo><mi>x</mi><mo>|</mo>
        <mo>,</mo>
        <mspace width="0.5em"></mspace>
        <mi>x</mi><mo>=</mo><mn>0</mn>
      </math>
    `;
  }

  function diagnosticQuestion(question) {
    return `
      <fieldset class="diagnostic-card">
        <legend>${escapeHtml(question.title)}</legend>
        <div class="diagnostic-formula">${question.formula}</div>
        <div class="diagnostic-options">
          ${question.options.map(([value, label]) => `
            <label>
              <input type="radio" name="${escapeHtml(question.name)}" value="${escapeHtml(value)}" ${state.values[question.name] === value ? "checked" : ""} required />
              <span>${escapeHtml(value)}. ${escapeHtml(label)}</span>
            </label>
          `).join("")}
        </div>
      </fieldset>
    `;
  }

  function renderStepTwo() {
    const questions = [
      {
        name: "answerLimit",
        title: "1. 求下列极限",
        formula: renderFormulaLimit(),
        options: [["A", "0"], ["B", "1/2"], ["C", "1/3"], ["D", "不存在"]],
      },
      {
        name: "answerDerivative",
        title: "2. 关于下列函数在 0 点的性质，判断正确的是",
        formula: renderFormulaDerivative(),
        options: [["A", "连续且可导"], ["B", "连续但不可导"], ["C", "不连续但可导"], ["D", "既不连续也不可导"]],
      },
    ];
    return `
      <form class="onboarding-card" data-onboarding-form>
        <header class="onboarding-head">
          <div>
            <p>基础诊断</p>
            <h1>完成两道分班参考题</h1>
          </div>
          ${renderProgress()}
        </header>
        ${state.error ? `<div class="onboarding-error">${escapeHtml(state.error)}</div>` : ""}
        <div class="diagnostic-list">
          ${questions.map(diagnosticQuestion).join("")}
        </div>
        <div class="onboarding-actions">
          <button class="onboarding-secondary" type="button" data-onboarding-prev>返回修改</button>
          <button class="onboarding-submit" type="submit">${state.completedResult ? "重新进入今日计划" : "提交并进入今日计划"}</button>
        </div>
      </form>
    `;
  }

  function payloadFromState() {
    const values = state.values;
    function bookPayload(slot) {
      const bookId = values[`primaryBook${slot}`];
      return {
        bookId,
        book: legacyBookCode(bookId),
        scope: isScopedBookId(bookId) ? values[`primaryBook${slot}Scope`] : "all",
      };
    }
    return {
      nickname: values.nickname.trim(),
      gender: values.gender,
      qq: values.qq.trim(),
      newPassword: values.newPassword,
      confirmPassword: values.confirmPassword,
      mathType: values.mathType,
      targetScore: Number(values.targetScore),
      foundationLevel: values.foundationLevel,
      primaryBooks: [bookPayload(1), bookPayload(2)],
      backupBookId: values.backupBook,
      backupBook: legacyBookCode(values.backupBook),
      dailyStudyHours: Number(values.dailyStudyHours),
      intensiveDays: Number(values.intensiveDays),
      reviewOrder: values.reviewOrder,
      startChapterId: values.startChapterId,
      diagnosticAnswers: [
        { questionId: "limit-equivalent-infinitesimal", answer: values.answerLimit },
        { questionId: "derivative-absolute-value", answer: values.answerDerivative },
      ],
    };
  }

  async function finishOnboarding(result) {
    if (typeof state.onComplete === "function") {
      await state.onComplete(result.user || state.user, result);
    }
    root.hidden = true;
    document.body.classList.remove("onboarding-active");
    completionResolve?.(result);
    completionResolve = null;
  }

  window.closeStudentOnboarding = function closeStudentOnboarding() {
    ensureRoot();
    root.hidden = true;
    document.body.classList.remove("onboarding-active");
    completionResolve?.(null);
    completionResolve = null;
  };

  async function submitOnboarding(form) {
    if (!state.values.answerLimit || !state.values.answerDerivative) {
      state.error = "请完成两道基础诊断题";
      render();
      return;
    }
    const submitButton = form.querySelector("button[type='submit']");
    submitButton.disabled = true;
    submitButton.textContent = "正在生成你的学习配置...";
    try {
      let result = state.completedResult;
      if (!result) {
        result = await state.apiRequest(`/students/${state.user.userId}/onboarding`, {
          method: "POST",
          body: JSON.stringify(payloadFromState()),
        });
        state.completedResult = result;
      }
      await finishOnboarding(result);
    } catch (error) {
      state.error = state.completedResult
        ? "资料已保存，但今日计划加载失败，请检查网络后再次点击进入今日计划。"
        : error.message || "资料提交失败";
      render();
    }
  }

  function render() {
    ensureRoot();
    root.innerHTML = state.step === 1 ? renderStepOne() : renderStepTwo();
  }

  window.showStudentOnboarding = async function showStudentOnboarding(options) {
    ensureRoot();
    state = {
      step: 1,
      error: "",
      values: defaultValues(),
      registrationOptions: fallbackRegistrationOptions("数学二"),
      registrationOptionsError: "",
      user: options.user,
      apiRequest: options.apiRequest,
      onComplete: options.onComplete,
      completedResult: null,
    };
    const loginScreen = document.querySelector("#loginScreen");
    const appShell = document.querySelector("#appShell");
    if (loginScreen) loginScreen.hidden = true;
    if (appShell) appShell.hidden = true;
    document.body.classList.add("onboarding-active");
    root.hidden = false;
    await loadRegistrationOptions(`/public/registration-options?mathType=${encodeURIComponent(state.values.mathType)}`);
    render();
    window.scrollTo({ top: 0, behavior: "instant" });
    return new Promise((resolve) => {
      completionResolve = resolve;
    });
  };
})();

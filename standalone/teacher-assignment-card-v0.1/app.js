(function () {
  const DATA = window.TEACHER_ASSIGNMENT_DATA || {};

  const stageOptions = [
    { value: "both", label: "基础 + 强化" },
    { value: "basic", label: "只看基础" },
    { value: "advanced", label: "只看强化" },
  ];

  const styles = [
    { id: "softGrid", name: "方格手账", desc: "接近第一张图，干净、轻柔、适合长期发。" },
    { id: "washiNotebook", name: "胶带笔记本", desc: "A 方向：浅色方格纸、胶带、柔和卡片，亲和但不乱。" },
    { id: "highlighterSheet", name: "荧光学习纸", desc: "C 方向：白底高亮笔记，题号最清楚，适合题目多的时候。" },
    { id: "blueGrid", name: "蓝色方格", desc: "更活泼的蓝色方格本，重点和题号更醒目。" },
  ];

  const levelLabels = {
    all: "全部题目",
    C: "C班题目",
  };

  const state = {
    bookSlots: [
      { bookId: "m2_880", stage: "both" },
      { bookId: "m2_1000", stage: "both" },
      { bookId: "", stage: "both" },
    ],
    level: "all",
    chapterId: "all",
    search: "",
    typeIds: ["", "", ""],
    styleId: "softGrid",
  };

  const els = {
    chapterSelect: document.querySelector("#chapterSelect"),
    levelSelect: document.querySelector("#levelSelect"),
    typeSearch: document.querySelector("#typeSearch"),
    typeSelects: [0, 1, 2].map((index) => document.querySelector(`#typeSelect${index}`)),
    durationEls: [0, 1, 2].map((index) => document.querySelector(`#duration${index}`)),
    bookSelects: [0, 1, 2].map((index) => document.querySelector(`#bookSelect${index}`)),
    stageSelects: [0, 1, 2].map((index) => document.querySelector(`#stageSelect${index}`)),
    totalDuration: document.querySelector("#totalDuration"),
    styleList: document.querySelector("#styleList"),
    taskCard: document.querySelector("#taskCard"),
    taskMeta: document.querySelector("#taskMeta"),
    teacherReminderContent: document.querySelector("#teacherReminderContent"),
    printBtn: document.querySelector("#printBtn"),
    copyTextBtn: document.querySelector("#copyTextBtn"),
    copyReminderBtn: document.querySelector("#copyReminderBtn"),
    exportPngBtn: document.querySelector("#exportPngBtn"),
    toast: document.querySelector("#toast"),
  };

  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const asNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const formatDays = (value) => {
    const number = asNumber(value, 0);
    if (!number) return "-";
    return `${Number(number.toFixed(2))} 天`;
  };

  const stripQuestionPrefix = (value) =>
    String(value || "")
      .replace(/^第/, "")
      .replace(/题$/, "");

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("is-visible");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => els.toast.classList.remove("is-visible"), 1500);
  }

  function books() {
    return [...(DATA.books || [])].sort((a, b) => asNumber(a.sortOrder, 999) - asNumber(b.sortOrder, 999));
  }

  function findBook(bookId) {
    return books().find((book) => book.bookId === bookId);
  }

  function findChapter(chapterId) {
    return (DATA.chapters || []).find((chapter) => chapter.chapterId === chapterId);
  }

  function findType(typeId) {
    return (DATA.questionTypes || []).find((type) => type.typeId === typeId);
  }

  function selectedTypeIds() {
    return state.typeIds.filter(Boolean);
  }

  function selectedBookSlots() {
    return state.bookSlots.filter((slot) => slot.bookId);
  }

  function isStageScopedBook(bookId) {
    return bookId === "m2_880" || bookId === "m2_1000";
  }

  function typeLabel(type) {
    return type?.cardTitle || type?.typeName || type?.typeId || "";
  }

  function chapterLabel() {
    const types = selectedTypeIds().map(findType).filter(Boolean);
    const chapterNames = [...new Set(types.map((type) => findChapter(type.chapterId)?.chapterName).filter(Boolean))];
    if (chapterNames.length === 1) return chapterNames[0];
    if (state.chapterId !== "all") return findChapter(state.chapterId)?.chapterName || "当前章节";
    return chapterNames.length ? chapterNames.join(" / ") : "全部章节";
  }

  function filteredTypes() {
    const keyword = state.search.trim().toLowerCase();
    return (DATA.questionTypes || [])
      .filter((type) => {
        const chapter = findChapter(type.chapterId);
        const matchesChapter = state.chapterId === "all" || type.chapterId === state.chapterId;
        const text = [
          type.typeId,
          type.cardTypeLabel,
          type.cardTitle,
          type.typeName,
          type.importanceTag,
          type.questionKind,
          type.introTitle,
          type.introBody,
          chapter?.chapterName,
        ]
          .join(" ")
          .toLowerCase();
        return matchesChapter && (!keyword || text.includes(keyword));
      })
      .sort((a, b) => {
        const ac = asNumber(a.chapterSort, 999);
        const bc = asNumber(b.chapterSort, 999);
        if (ac !== bc) return ac - bc;
        return String(a.sortCode || a.typeId).localeCompare(String(b.sortCode || b.typeId), "zh-CN");
      });
  }

  function enforceUniqueBooks(changedIndex) {
    const seen = new Set();
    state.bookSlots.forEach((slot, index) => {
      if (!slot.bookId) return;
      if (seen.has(slot.bookId)) {
        if (index === 0) return;
        slot.bookId = "";
        slot.stage = "both";
        if (changedIndex === index) showToast("书籍不能重复，已清空重复选项");
        return;
      }
      seen.add(slot.bookId);
    });
    if (!state.bookSlots[0].bookId) {
      state.bookSlots[0].bookId = books()[0]?.bookId || "";
    }
  }

  function enforceUniqueTypes(changedIndex) {
    const validIds = new Set(filteredTypes().map((type) => type.typeId));
    state.typeIds = state.typeIds.map((typeId, index) => {
      if (!typeId) return "";
      if (!validIds.has(typeId)) return "";
      const firstIndex = state.typeIds.indexOf(typeId);
      if (firstIndex !== index) {
        if (changedIndex === index) showToast("题型不能重复，已清空重复选项");
        return "";
      }
      return typeId;
    });
    if (!state.typeIds[0]) {
      state.typeIds[0] = filteredTypes()[0]?.typeId || "";
    }
  }

  function renderBookControls() {
    const allBooks = books();
    const selectedByOthers = (slotIndex) =>
      new Set(state.bookSlots.map((slot, index) => (index === slotIndex ? "" : slot.bookId)).filter(Boolean));

    state.bookSlots.forEach((slot, index) => {
      const disabledIds = selectedByOthers(index);
      const options = [
        ...(index > 0 ? [`<option value="">不选</option>`] : []),
        ...allBooks.map((book) => {
          const disabled = disabledIds.has(book.bookId) ? " disabled" : "";
          return `<option value="${escapeHtml(book.bookId)}"${disabled}>${escapeHtml(book.bookName)}</option>`;
        }),
      ];
      els.bookSelects[index].innerHTML = options.join("");
      els.bookSelects[index].value = slot.bookId;

      els.stageSelects[index].innerHTML = stageOptions
        .map((option) => `<option value="${option.value}">${escapeHtml(option.label)}</option>`)
        .join("");
      els.stageSelects[index].value = slot.stage || "both";
      els.stageSelects[index].disabled = !isStageScopedBook(slot.bookId);
      els.stageSelects[index].closest(".field").classList.toggle("is-disabled", !isStageScopedBook(slot.bookId));
    });
  }

  function renderTypeControls() {
    const types = filteredTypes();
    state.typeIds.forEach((typeId, index) => {
      const selectedByOthers = new Set(state.typeIds.filter((id, selectedIndex) => id && selectedIndex !== index));
      const options = [
        ...(index > 0 ? [`<option value="">不选</option>`] : []),
        ...types.map((type) => {
          const disabled = selectedByOthers.has(type.typeId) ? " disabled" : "";
          const chapter = state.chapterId === "all" ? `${findChapter(type.chapterId)?.chapterName || ""} / ` : "";
          return `<option value="${escapeHtml(type.typeId)}"${disabled}>${escapeHtml(chapter + typeLabel(type))}</option>`;
        }),
      ];
      els.typeSelects[index].innerHTML = options.join("");
      els.typeSelects[index].value = typeId;
      const type = findType(typeId);
      els.durationEls[index].textContent = type ? `建议 ${formatDays(type.duration100Days)}` : "建议 -";
    });

    const total = selectedTypeIds().reduce((sum, typeId) => sum + asNumber(findType(typeId)?.duration100Days, 0), 0);
    els.totalDuration.textContent = `合计建议时长：${formatDays(total)}（按 100 天节奏）`;
  }

  function renderStyleControls() {
    els.styleList.innerHTML = styles
      .map(
        (style) => `
          <button class="style-btn" type="button" data-style="${style.id}">
            <strong>${escapeHtml(style.name)}</strong>
            <span>${escapeHtml(style.desc)}</span>
          </button>
        `,
      )
      .join("");
    updateStyleActive();
  }

  function updateStyleActive() {
    document
      .querySelectorAll(".style-btn")
      .forEach((button) => button.classList.toggle("is-active", button.dataset.style === state.styleId));
  }

  function stageMatches(question, stage) {
    if (!stage || stage === "both") return true;
    const label = String(question.sourceSectionLabel || "");
    if (stage === "basic") return label.includes("基础");
    if (stage === "advanced") return label.includes("强化") || label.includes("综合");
    return true;
  }

  function levelMatches(question) {
    if (state.level === "all") return true;
    const levels = String(question.applicableLevels || "")
      .split(",")
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean);
    return levels.includes(state.level);
  }

  const chineseNumberMap = {
    一: 1,
    二: 2,
    两: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
  };

  function parseChineseNumber(value) {
    const text = String(value || "").replace(/[零〇]/g, "");
    if (!text) return null;
    if (text.includes("十")) {
      const [left, right] = text.split("十");
      const tens = left ? chineseNumberMap[left] || 0 : 1;
      const ones = right ? chineseNumberMap[right] || 0 : 0;
      return tens * 10 + ones;
    }
    return chineseNumberMap[text] || null;
  }

  function chapterOrder(label) {
    const text = cleanSourceLabel(label);
    if (!text) return 999;
    const arabic = text.match(/\d+/);
    if (arabic) return asNumber(arabic[0], 999);
    const chinese = text.match(/第?([一二两三四五六七八九十零〇]+)章/);
    return parseChineseNumber(chinese?.[1]) || 999;
  }

  function labelRank(label, ranks, fallback = 99) {
    const text = cleanSourceLabel(label);
    if (!text) return fallback;
    const match = ranks.find((item) => item.keywords.some((keyword) => text.includes(keyword)));
    return match?.rank ?? fallback;
  }

  function sectionOrder(label) {
    return labelRank(label, [
      { rank: 1, keywords: ["基础"] },
      { rank: 2, keywords: ["强化", "综合"] },
      { rank: 3, keywords: ["拓展", "拔高"] },
    ]);
  }

  function subsectionOrder(label) {
    return labelRank(label, [
      { rank: 1, keywords: ["选择"] },
      { rank: 2, keywords: ["填空"] },
      { rank: 3, keywords: ["解答"] },
    ]);
  }

  function questionSortKey(question) {
    return {
      chapter: chapterOrder(question.sourceChapterLabel),
      section: sectionOrder(question.sourceSectionLabel),
      subsection: subsectionOrder(question.sourceSubsectionLabel),
      order: asNumber(question.questionOrder, 0),
      id: String(question.questionId || ""),
    };
  }

  function compareQuestionSortKeys(a, b) {
    if (a.chapter !== b.chapter) return a.chapter - b.chapter;
    if (a.section !== b.section) return a.section - b.section;
    if (a.subsection !== b.subsection) return a.subsection - b.subsection;
    if (a.order !== b.order) return a.order - b.order;
    return a.id.localeCompare(b.id, "zh-CN");
  }

  function sortQuestions(a, b) {
    const bookSortA = asNumber(a.bookSort, 999);
    const bookSortB = asNumber(b.bookSort, 999);
    if (bookSortA !== bookSortB) return bookSortA - bookSortB;
    return compareQuestionSortKeys(questionSortKey(a), questionSortKey(b));
  }

  function groupBookRows(slot) {
    const typeSet = new Set(selectedTypeIds());
    const rows = (DATA.questions || [])
      .filter((question) => question.bookId === slot.bookId)
      .filter((question) => typeSet.has(question.typeId))
      .filter(levelMatches)
      .filter((question) => stageMatches(question, slot.stage))
      .sort(sortQuestions);

    const groupMap = new Map();
    rows.forEach((question) => {
      const key = [
        question.sourceChapterLabel || "",
        question.sourceSectionLabel || "",
        question.sourceSubsectionLabel || "",
      ].join("|");
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          chapter: question.sourceChapterLabel || "",
          section: question.sourceSectionLabel || "",
          subsection: question.sourceSubsectionLabel || "",
          order: asNumber(question.questionOrder, 0),
          sortKey: questionSortKey(question),
          numbers: [],
        });
      }
      const number = stripQuestionPrefix(question.sourceQuestionLabel || question.originalPositionText);
      if (number && !groupMap.get(key).numbers.includes(number)) {
        groupMap.get(key).numbers.push(number);
      }
    });

    return [...groupMap.values()].sort((a, b) => compareQuestionSortKeys(a.sortKey, b.sortKey));
  }

  function buildBookGroups() {
    return selectedBookSlots().map((slot) => {
      const book = findBook(slot.bookId);
      return {
        bookId: slot.bookId,
        bookName: book?.bookName || slot.bookId,
        bookLabel: book?.bookDisplayLabel || `《${book?.legacyCode || book?.bookName?.replace(/题$/, "") || slot.bookId}》`,
        stage: slot.stage,
        rows: groupBookRows(slot),
      };
    });
  }

  function countQuestionsInGroups(groups) {
    return groups.reduce(
      (total, group) => total + group.rows.reduce((sum, row) => sum + row.numbers.length, 0),
      0,
    );
  }

  function cleanSourceLabel(value) {
    const text = String(value || "").trim();
    return ["", "空", "无", "暂无", "None", "null"].includes(text) ? "" : text;
  }

  function rowTitle(row) {
    return [row.chapter, row.section, row.subsection].map(cleanSourceLabel).filter(Boolean).join(" · ") || "题号";
  }

  function renderBookGroup(group, index) {
    const rows =
      group.rows.length > 0
        ? group.rows
            .map(
              (row) => `
                <div class="task-row">
                  <div class="task-row-title">${escapeHtml(rowTitle(row))}</div>
                  <div class="task-row-numbers">题号 ${escapeHtml(row.numbers.join("、"))}</div>
                </div>
              `,
            )
            .join("")
        : `<div class="task-row is-empty">
            <div class="task-row-title">当前组合暂无题目</div>
            <div class="task-row-numbers">请换书或换题型</div>
          </div>`;

    return `
      <section class="task-book task-book-${index + 1} task-book-${escapeHtml(group.bookId.replace("m2_", ""))}">
        <div class="task-book-pin">${index + 1}</div>
        <h3>${escapeHtml(group.bookLabel)}</h3>
        <div class="task-table">${rows}</div>
      </section>
    `;
  }

  function renderPoster() {
    const groups = buildBookGroups();
    const selectedTypes = selectedTypeIds().map(findType).filter(Boolean);
    const typeText = selectedTypes.map(typeLabel).join(" + ");
    const empty = !groups.some((group) => group.rows.length);

    els.taskCard.innerHTML = `
      <article class="poster task-poster style-${state.styleId}" aria-label="今日做题任务">
        <div class="poster-decoration decoration-a"></div>
        <div class="poster-decoration decoration-b"></div>
        <div class="poster-decoration decoration-c"></div>
        <header class="poster-header">
          <h1>今日做题任务</h1>
          <div class="scribble-line"></div>
          <div class="topic-card">
            <p><span>章节：</span>${escapeHtml(chapterLabel())}</p>
            <p><span>题型：</span>${escapeHtml(typeText || "请选择题型")}</p>
          </div>
        </header>

        <section class="poster-mission">
          <h2><span>做题清单</span></h2>
          <div class="task-books">
            ${
              groups.length
                ? groups.map(renderBookGroup).join("")
                : `<div class="poster-empty">请至少选择一本书</div>`
            }
          </div>
          ${empty ? `<p class="empty-hint">当前所选书籍、范围和题型没有匹配题目，可以换成“基础 + 强化”或增加另一本书。</p>` : ""}
        </section>
      </article>
    `;
  }

  function renderTaskMeta() {
    const groups = buildBookGroups();
    const selectedTypes = selectedTypeIds().map(findType).filter(Boolean);
    const questionCount = countQuestionsInGroups(groups);
    const noRows = !groups.some((group) => group.rows.length);
    els.taskMeta.innerHTML = `
      <div>
        <span>当前范围</span>
        <strong>${escapeHtml(levelLabels[state.level] || state.level)}</strong>
      </div>
      <div>
        <span>合计题量</span>
        <strong>${questionCount} 题</strong>
      </div>
      <div>
        <span>题型数量</span>
        <strong>${selectedTypes.length} 个</strong>
      </div>
      ${noRows ? `<p>当前组合暂无题目，可以切换范围、书籍或题型。</p>` : ""}
    `;
  }

  function reminderText() {
    const selectedTypes = selectedTypeIds().map(findType).filter(Boolean);
    if (!selectedTypes.length) return "请先选择今日题型。";
    return selectedTypes
      .map((type, index) => {
        const tags = [type.importanceTag, type.questionKind, type.introTitle].filter(Boolean).join("｜");
        return [
          `题型${index + 1}：${typeLabel(type)}（建议 ${formatDays(type.duration100Days)}）`,
          tags,
          type.introBody || "先按题型识别，再做计算细节；错题要写清原因。",
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n\n");
  }

  function renderReminder() {
    const selectedTypes = selectedTypeIds().map(findType).filter(Boolean);
    if (!selectedTypes.length) {
      els.teacherReminderContent.innerHTML = `<p>请先选择今日题型。</p>`;
      return;
    }
    els.teacherReminderContent.innerHTML = selectedTypes
      .map((type, index) => {
        const tags = [type.importanceTag, type.questionKind, type.introTitle].filter(Boolean);
        return `
          <article class="reminder-item">
            <strong>题型${index + 1}：${escapeHtml(typeLabel(type))}</strong>
            <div>${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
            <p>${escapeHtml(type.introBody || "先按题型识别，再做计算细节；错题要写清原因。")}</p>
          </article>
        `;
      })
      .join("");
  }

  function buildTaskText() {
    const groups = buildBookGroups();
    const selectedTypes = selectedTypeIds().map(findType).filter(Boolean);
    const lines = [
      "今日做题任务",
      `章节：${chapterLabel()}`,
      `题型：${selectedTypes.map(typeLabel).join(" + ")}`,
      `范围：${levelLabels[state.level] || state.level}`,
      "",
    ];
    groups.forEach((group) => {
      lines.push(group.bookLabel);
      if (!group.rows.length) {
        lines.push("当前组合暂无题目");
      } else {
        group.rows.forEach((row) => {
          lines.push(`${rowTitle(row)}  题号 ${row.numbers.join("、")}`);
        });
      }
      lines.push("");
    });
    return lines.join("\n").trim();
  }

  function renderAll() {
    enforceUniqueBooks();
    enforceUniqueTypes();
    renderBookControls();
    renderTypeControls();
    renderPoster();
    renderTaskMeta();
    renderReminder();
  }

  function initControls() {
    els.chapterSelect.innerHTML = [
      `<option value="all">全部章节</option>`,
      ...(DATA.chapters || []).map((chapter) => `<option value="${escapeHtml(chapter.chapterId)}">${escapeHtml(chapter.chapterName)}</option>`),
    ].join("");
    if ((DATA.chapters || [])[0]) {
      state.chapterId = DATA.chapters[0].chapterId;
      els.chapterSelect.value = state.chapterId;
    }

    state.typeIds[0] = filteredTypes()[0]?.typeId || "";
    renderBookControls();
    renderTypeControls();
    renderStyleControls();
  }

  function bindEvents() {
    els.bookSelects.forEach((select, index) => {
      select.addEventListener("change", () => {
        state.bookSlots[index].bookId = select.value;
        if (!isStageScopedBook(select.value)) state.bookSlots[index].stage = "both";
        enforceUniqueBooks(index);
        renderAll();
      });
    });

    els.stageSelects.forEach((select, index) => {
      select.addEventListener("change", () => {
        state.bookSlots[index].stage = select.value;
        renderAll();
      });
    });

    els.chapterSelect.addEventListener("change", () => {
      state.chapterId = els.chapterSelect.value;
      state.typeIds = ["", "", ""];
      state.typeIds[0] = filteredTypes()[0]?.typeId || "";
      renderAll();
    });

    els.levelSelect.addEventListener("change", () => {
      state.level = els.levelSelect.value;
      renderAll();
    });

    els.typeSearch.addEventListener("input", () => {
      state.search = els.typeSearch.value;
      enforceUniqueTypes();
      renderAll();
    });

    els.typeSelects.forEach((select, index) => {
      select.addEventListener("change", () => {
        state.typeIds[index] = select.value;
        enforceUniqueTypes(index);
        renderAll();
      });
    });

    els.styleList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-style]");
      if (!button) return;
      state.styleId = button.dataset.style;
      updateStyleActive();
      renderPoster();
    });

    els.printBtn.addEventListener("click", () => window.print());
    els.copyTextBtn.addEventListener("click", () => copyToClipboard(buildTaskText(), "已复制任务文字"));
    els.copyReminderBtn.addEventListener("click", () => copyToClipboard(reminderText(), "已复制老师提醒"));
    els.exportPngBtn.addEventListener("click", exportPng);
  }

  function copyToClipboard(text, successMessage) {
    navigator.clipboard?.writeText(text).then(
      () => showToast(successMessage),
      () => showToast("复制失败，请手动选择文字"),
    );
  }

  function inlineStylesForExport(root) {
    const clone = root.cloneNode(true);
    const sourceNodes = [root, ...root.querySelectorAll("*")];
    const cloneNodes = [clone, ...clone.querySelectorAll("*")];
    sourceNodes.forEach((node, index) => {
      const computed = window.getComputedStyle(node);
      let cssText = "";
      for (let i = 0; i < computed.length; i += 1) {
        const name = computed.item(i);
        cssText += `${name}:${computed.getPropertyValue(name)};`;
      }
      cloneNodes[index].style.cssText = cssText;
    });
    return clone;
  }

  function buildPosterSvg() {
    const poster = els.taskCard.querySelector(".poster");
    if (!poster) return null;
    const width = Math.ceil(poster.getBoundingClientRect().width);
    const height = Math.ceil(poster.getBoundingClientRect().height);
    const clone = inlineStylesForExport(poster);
    clone.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
    const serialized = new XMLSerializer().serializeToString(clone);
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <foreignObject width="100%" height="100%">${serialized}</foreignObject>
      </svg>`;
    return { svg, width, height };
  }

  async function exportPng() {
    try {
      const payload = buildPosterSvg();
      if (!payload) return;
      showToast("正在生成 PNG...");
      await downloadPng(payload);
      showToast("PNG 已保存");
    } catch (error) {
      console.error(error);
      const payload = buildPosterSvg();
      if (payload) {
        downloadSvg(payload.svg);
        showToast("PNG 生成失败，已改存 SVG");
        return;
      }
      showToast("导出失败，请用打印保存 PDF");
    }
  }

  function downloadPng({ svg, width, height }) {
    return new Promise((resolve, reject) => {
      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const image = new Image();
      image.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = width * 2;
          canvas.height = height * 2;
          const ctx = canvas.getContext("2d");
          ctx.scale(2, 2);
          ctx.drawImage(image, 0, 0);
          URL.revokeObjectURL(url);
          canvas.toBlob((pngBlob) => {
            if (!pngBlob) {
              reject(new Error("canvas.toBlob returned empty"));
              return;
            }
            const link = document.createElement("a");
            link.href = URL.createObjectURL(pngBlob);
            link.download = `今日做题任务-${selectedTypeIds().join("-") || "task"}.png`;
            link.style.display = "none";
            document.body.appendChild(link);
            link.click();
            window.setTimeout(() => {
              URL.revokeObjectURL(link.href);
              link.remove();
            }, 1000);
            resolve();
          }, "image/png");
        } catch (error) {
          URL.revokeObjectURL(url);
          reject(error);
        }
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("image load failed"));
      };
      image.src = url;
    });
  }

  function downloadSvg(svg) {
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `今日做题任务-${selectedTypeIds().join("-") || "task"}.svg`;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    window.setTimeout(() => {
      URL.revokeObjectURL(link.href);
      link.remove();
    }, 1000);
  }

  initControls();
  bindEvents();
  renderAll();
})();

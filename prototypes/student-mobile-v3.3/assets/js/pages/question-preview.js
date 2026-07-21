(function (root) {
  function escapeText(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function scopeLabel(scope) {
    return {
      basic: "基础",
      advanced: "强化",
      both: "基础 + 强化",
    }[scope] || "全部";
  }

  function renderPrimaryBooks(books) {
    const items = Array.isArray(books) ? books : [];
    if (!items.length) return "";
    return `
      <div class="question-preview-books" aria-label="当前预览习题册">
        ${items.map((book) => `
          <span class="question-preview-book-chip">
            ${escapeText(book.bookLabel || `《${book.bookCode || ""}》`)}
            <small>${escapeText(scopeLabel(book.scope))}</small>
          </span>
        `).join("")}
      </div>
    `;
  }

  function renderSelects(options, selectedChapterId, selectedTypeId, disabled = false) {
    const chapters = Array.isArray(options?.chapters) ? options.chapters : [];
    const selectedChapter = chapters.find((chapter) => chapter.chapterId === selectedChapterId) || chapters[0] || {};
    const types = Array.isArray(selectedChapter.types) ? selectedChapter.types : [];
    return `
      <section class="question-preview-filters" aria-label="选择预览范围">
        <label class="question-preview-field">
          <span>选择章节</span>
          <select data-question-preview-chapter ${disabled ? "disabled" : ""}>
            ${chapters.map((chapter) => `
              <option value="${escapeText(chapter.chapterId)}" ${chapter.chapterId === selectedChapter.chapterId ? "selected" : ""}>
                ${escapeText(chapter.chapterName)}
              </option>
            `).join("")}
          </select>
        </label>
        <label class="question-preview-field">
          <span>选择题型</span>
          <select data-question-preview-type ${disabled || !types.length ? "disabled" : ""}>
            ${types.map((type) => `
              <option value="${escapeText(type.typeId)}" ${type.typeId === selectedTypeId ? "selected" : ""}>
                ${escapeText(type.displayTypeLabel ? `${type.displayTypeLabel}｜${type.typeName}` : type.typeName)}
              </option>
            `).join("")}
          </select>
        </label>
      </section>
    `;
  }

  function renderLoading() {
    return `
      <div class="question-preview-loading" role="status" aria-live="polite">
        <span class="question-preview-spinner" aria-hidden="true"></span>
        <span>正在加载题型题目...</span>
      </div>
      <div class="question-preview-skeleton" aria-hidden="true">
        <i></i><i></i><i></i>
      </div>
    `;
  }

  function renderError(message) {
    return `
      <div class="question-preview-state question-preview-error" role="alert">
        <strong>题目加载失败</strong>
        <p>${escapeText(message || "请检查网络后重试")}</p>
        <button type="button" data-question-preview-retry>重新加载</button>
      </div>
    `;
  }

  function renderEmptyState() {
    return `
      <div class="question-preview-state question-preview-empty">
        <strong>当前两本主练习册暂无该题型题目</strong>
        <p>可以切换本章其他题型继续查看。</p>
      </div>
    `;
  }

  function renderTypeDetail(detail) {
    const type = detail?.type || {};
    const sourceGroups = Array.isArray(detail?.sourceGroups) ? detail.sourceGroups : [];
    if (!sourceGroups.length) return renderEmptyState();
    if (typeof root.renderTypeCard !== "function") {
      return renderError("题型卡片组件加载失败，请刷新页面重试");
    }

    const summaryPrefix = [type.importanceTag, type.questionKind].filter(Boolean).join("｜");
    const summary = type.summary || (
      type.introTitle || type.introBody
        ? {
            title: `${summaryPrefix}${summaryPrefix ? "：" : ""}${type.introTitle || type.cardTitle || type.typeName || ""}`,
            body: type.introBody || "",
          }
        : null
    );
    return root.renderTypeCard({
      index: 1,
      typeId: type.typeId || "",
      displayTypeLabel: type.displayTypeLabel || "",
      cardTypeLabel: type.cardTypeLabel || type.displayTypeLabel || "",
      title: type.cardTitle || type.typeName || "题型题目",
      typeName: type.typeName || "",
      summary,
      theme: "green",
      sourceTitle: "习题来源",
      sourceGroups,
      sources: [],
      questions: Array.isArray(detail?.questions) ? detail.questions : [],
    });
  }

  function render(state = {}) {
    const view = document.querySelector("#questionPreviewView");
    if (!view) return;
    const options = state.options || {};
    const optionsLoading = state.status === "loading-options";
    let content = "";
    if (state.status === "error") {
      content = renderError(state.error);
    } else if (state.status === "loading-options" || state.status === "loading-detail") {
      content = renderLoading();
    } else if (state.detail) {
      content = renderTypeDetail(state.detail);
    } else {
      content = renderEmptyState();
    }

    view.innerHTML = `
      <div class="question-preview-page">
        <header class="question-preview-header">
          <button class="question-preview-back" type="button" data-question-preview-back aria-label="返回我的页面">
            <img src="assets/icons/icon-arrow-right.svg" alt="" aria-hidden="true" />
          </button>
          <div>
            <h1>题型题目预览</h1>
            <p>按你的两本主练习册查看</p>
          </div>
        </header>
        ${renderPrimaryBooks(options.primaryBooks)}
        ${renderSelects(options, state.selectedChapterId, state.selectedTypeId, optionsLoading)}
        <main class="question-preview-content">${content}</main>
      </div>
    `;
  }

  root.QuestionPreviewPage = { render };
})(typeof globalThis !== "undefined" ? globalThis : window);

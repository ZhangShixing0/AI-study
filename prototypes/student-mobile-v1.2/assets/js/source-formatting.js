(function (root) {
  const DIGIT_TO_CHINESE = {
    0: "零",
    1: "一",
    2: "二",
    3: "三",
    4: "四",
    5: "五",
    6: "六",
    7: "七",
    8: "八",
    9: "九",
    10: "十",
  };

  const QUESTION_TYPE_LABELS = {
    一: "选择题",
    二: "填空题",
    三: "解答题",
    1: "选择题",
    2: "填空题",
    3: "解答题",
  };

  function cleanSourceName(value) {
    return String(value || "")
      .replace(/^《|》$/g, "")
      .trim();
  }

  function sourceLabel(sourceName) {
    const cleanName = cleanSourceName(sourceName);
    return cleanName ? `《${cleanName}》` : "";
  }

  function toChineseNumber(value) {
    const text = String(value || "").trim();
    if (!/^\d+$/.test(text)) return text;

    const number = Number(text);
    if (number <= 10) return DIGIT_TO_CHINESE[number] || text;
    if (number < 20) return `十${DIGIT_TO_CHINESE[number - 10]}`;
    if (number < 100) {
      const tens = Math.floor(number / 10);
      const ones = number % 10;
      return `${DIGIT_TO_CHINESE[tens]}十${ones ? DIGIT_TO_CHINESE[ones] : ""}`;
    }
    return text;
  }

  function normalizeQuestionType(value) {
    return QUESTION_TYPE_LABELS[value] || "";
  }

  function sourceNameFromItem(item) {
    const match = String(item || "").match(/^《([^》]+)》/);
    return match ? match[1] : "";
  }

  function stripLeadingSourceLabels(item) {
    return String(item || "")
      .replace(/^(?:《[^》]+》\s*)+/, "")
      .trim();
  }

  function firstSourceName(sourceName, item) {
    return cleanSourceName(sourceName) || cleanSourceName(sourceNameFromItem(item));
  }

  function parseSourceItem(sourceName, item) {
    const raw = stripLeadingSourceLabels(item);
    const match = raw.match(/第\s*([一二三四五六七八九十百\d]+)\s*章\s*(基础|强化)\s*([一二三123])?\s*第\s*([0-9]+(?:[（(][^)）]+[）)])?(?:\s*[~～-]\s*(?:[0-9]+)?(?:[（(][^)）]+[）)])?)?)\s*题/);
    if (!match) return null;

    const questionTypeLabel = normalizeQuestionType(match[3]);
    const cleanName = firstSourceName(sourceName, item);
    return {
      sourceName: cleanName,
      sourceLabel: sourceLabel(cleanName),
      chapterLabel: `第${toChineseNumber(match[1])}章`,
      phaseLabel: match[2],
      questionTypeLabel,
      questionTypeShort: questionTypeLabel.replace(/题$/, ""),
      questionNumber: match[4],
    };
  }

  function titleForGroup(parsed, includeSource) {
    const typeText = parsed.questionTypeLabel ? ` ${parsed.questionTypeLabel}` : "";
    return `${includeSource ? parsed.sourceLabel : ""}${parsed.chapterLabel} ${parsed.phaseLabel}${typeText}：`;
  }

  function buildSourceGroups(sources = []) {
    const groups = [];
    const bookMap = new Map();
    const entryMap = new Map();

    function ensureBook(sourceName) {
      const cleanName = cleanSourceName(sourceName);
      const key = cleanName || "__unknown__";
      if (!bookMap.has(key)) {
        const bookGroup = {
          sourceName: cleanName,
          sourceLabel: sourceLabel(cleanName),
          entries: [],
        };
        bookMap.set(key, bookGroup);
        groups.push(bookGroup);
      }
      return bookMap.get(key);
    }

    sources.forEach((source) => {
      const sourceName = cleanSourceName(source?.source);
      const items = Array.isArray(source?.items) ? source.items : [];

      items.forEach((item) => {
        const parsed = parseSourceItem(sourceName, item);
        if (!parsed) {
          const fallbackName = firstSourceName(sourceName, item);
          const fallbackText = stripLeadingSourceLabels(item);
          const fallbackTitle = fallbackText.trim();
          if (fallbackTitle.trim()) {
            ensureBook(fallbackName).entries.push({
              title: fallbackTitle,
              continuationTitle: fallbackTitle,
              numbers: [],
            });
          }
          return;
        }

        const bookGroup = ensureBook(parsed.sourceName);
        const key = [
          parsed.sourceName,
          parsed.chapterLabel,
          parsed.phaseLabel,
          parsed.questionTypeLabel,
        ].join("|");

        if (!entryMap.has(key)) {
          const entry = {
            chapterLabel: parsed.chapterLabel,
            phaseLabel: parsed.phaseLabel,
            questionTypeLabel: parsed.questionTypeLabel,
            title: titleForGroup(parsed, false),
            continuationTitle: titleForGroup(parsed, false),
            numbers: [],
          };
          entryMap.set(key, entry);
          bookGroup.entries.push(entry);
        }

        entryMap.get(key).numbers.push(parsed.questionNumber);
      });
    });

    groups.forEach((group) => {
      const firstEntry = group.entries[0] || {};
      group.showSourceLabel = true;
      group.title = `${group.sourceLabel || ""}${firstEntry.continuationTitle || firstEntry.title || ""}`;
      group.continuationTitle = firstEntry.continuationTitle || firstEntry.title || "";
      group.numbers = firstEntry.numbers || [];
    });

    return groups;
  }

  function formatFeedbackLabel(item, fallbackSourceName = "") {
    const parsed = parseSourceItem(fallbackSourceName || sourceNameFromItem(item), item);
    if (!parsed) return String(item || "");
    const typeText = parsed.questionTypeShort ? ` ${parsed.questionTypeShort}` : "";
    return `${parsed.sourceLabel}${parsed.chapterLabel} ${parsed.phaseLabel}${typeText} 第${parsed.questionNumber}题`;
  }

  const api = {
    buildSourceGroups,
    formatFeedbackLabel,
    parseSourceItem,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  root.TodayPlanSourceFormatting = api;
})(typeof globalThis !== "undefined" ? globalThis : window);

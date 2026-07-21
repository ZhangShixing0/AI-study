const CHAPTER_ART_BASE = "assets/images/chapter-art/";

const MASTERY_GROUPS = [
  { groupId: "math2-limit", displayTitle: "极限", svg: "01-limit.svg", artLabel: "极限", chapterIds: ["M2-CH-0001"] },
  { groupId: "math2-derivative", displayTitle: "一元微分", svg: "02-derivative.svg", artLabel: "一元微分", chapterIds: ["M2-CH-0002", "M2-CH-0003", "M2-CH-0004"] },
  { groupId: "math2-integral", displayTitle: "一元积分", svg: "03-integral.svg", artLabel: "一元积分", chapterIds: ["M2-CH-0005", "M2-CH-0006"] },
  { groupId: "math2-differential-equation", displayTitle: "微分方程", svg: "04-differential-equation.svg", artLabel: "微分方程", chapterIds: ["M2-CH-0009"] },
  { groupId: "math2-multivariable-differential", displayTitle: "多元微分", svg: "05-multivariable-differential.svg", artLabel: "多元微分", chapterIds: ["M2-CH-0007"] },
  { groupId: "math2-double-integral", displayTitle: "二重积分", svg: "06-double-integral.svg", artLabel: "二重积分", chapterIds: ["M2-CH-0008"] },
  { groupId: "math2-determinant", displayTitle: "行列式", svg: "07-determinant.svg", artLabel: "行列式", chapterIds: ["M2-CH-0010"] },
  { groupId: "math2-matrix", displayTitle: "矩阵", svg: "08-matrix.svg", artLabel: "矩阵", chapterIds: ["M2-CH-0011"] },
  { groupId: "math2-vector", displayTitle: "向量", svg: "09-vector-group.svg", artLabel: "向量", chapterIds: ["M2-CH-0012"] },
  { groupId: "math2-linear-system", displayTitle: "线性方程组", svg: "10-linear-system.svg", artLabel: "线性方程组", chapterIds: ["M2-CH-0013"] },
  { groupId: "math2-eigenvalue", displayTitle: "特征值", svg: "11-eigenvalue.svg", artLabel: "特征值", chapterIds: ["M2-CH-0014"] },
  { groupId: "math2-quadratic-form", displayTitle: "二次型", svg: "12-quadratic-form.svg", artLabel: "二次型", chapterIds: ["M2-CH-0015"] },
];

MASTERY_GROUPS.forEach((group) => {
  group.chapterIds = [group.groupId];
});

const CHAPTER_ART_MAP = Object.fromEntries(MASTERY_GROUPS.map((group) => [group.groupId, group]));

const CHAPTER_ART_CACHE = new Map();

function clampRate(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function masteryTone(row, rate) {
  const tag = String(row.tag || "");
  if (tag.includes("未开始") || rate <= 0) return "neutral";
  if (rate < 60) return "weak";
  if (rate < 75) return "improving";
  return "strong";
}

function masteryAccent(tone) {
  return {
    weak: "#ff6b2c",
    improving: "#2f6fdf",
    strong: "#0aa58f",
    neutral: "#8b97a8",
  }[tone] || "#2f6fdf";
}

function chapterArtFor(row) {
  return CHAPTER_ART_MAP[row.groupId] || {
    displayTitle: row.name || "章节掌握",
    svg: "01-limit.svg",
    artLabel: "章节图谱",
  };
}

function toCount(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function tagForMastery(rate, submittedQuestionCount) {
  if (!submittedQuestionCount) return "未开始";
  if (rate >= 75) return "良好";
  if (rate >= 60) return "待提升";
  return "薄弱项";
}

function groupedMasteryRate(rows, correctQuestionCount, totalQuestionCount) {
  if (totalQuestionCount > 0) {
    const rate = clampRate((correctQuestionCount / totalQuestionCount) * 100);
    return correctQuestionCount > 0 && rate === 0 ? 1 : rate;
  }

  const startedRates = rows
    .map((row) => Number(row.rate))
    .filter((rate) => Number.isFinite(rate) && rate > 0);
  if (!startedRates.length) return 0;
  return clampRate(startedRates.reduce((total, rate) => total + rate, 0) / startedRates.length);
}

function buildGroupedMastery(mastery) {
  const rowsByChapterId = new Map((mastery || []).map((row) => [row.chapterId, row]));

  return MASTERY_GROUPS.map((group) => {
    const rows = group.chapterIds
      .map((chapterId) => rowsByChapterId.get(chapterId))
      .filter(Boolean);
    const submittedQuestionCount = rows.reduce((total, row) => total + toCount(row.submittedQuestionCount), 0);
    const wrongQuestionCount = rows.reduce((total, row) => total + toCount(row.wrongQuestionCount), 0);
    const correctQuestionCount = rows.reduce((total, row) => total + toCount(row.correctQuestionCount), 0);
    const totalQuestionCount = rows.reduce((total, row) => total + toCount(row.totalQuestionCount), 0);
    const rate = groupedMasteryRate(rows, correctQuestionCount, totalQuestionCount);
    const sourceNames = rows.map((row) => row.name).filter(Boolean);

    return {
      groupId: group.groupId,
      chapterIds: group.chapterIds,
      name: group.displayTitle,
      fullTitle: sourceNames.join(" / "),
      rate,
      tag: tagForMastery(rate, submittedQuestionCount),
      submittedQuestionCount,
      wrongQuestionCount,
      correctQuestionCount,
      totalQuestionCount,
    };
  });
}

function prepareChapterSvg(svgText) {
  return svgText
    .trim()
    .replace(/<style>[\s\S]*?<\/style>/i, "")
    .replace(/\s*<rect\b[^>]*fill-opacity="0\.06"[^>]*\/>\s*/i, "")
    .replace(/<svg\b([^>]*)>/i, '<svg$1 class="chapter-art-svg" aria-hidden="true" focusable="false">');
}

function chapterArtFilename(src) {
  return String(src || "").split("/").pop();
}

function loadInlineChapterSvg(src) {
  const filename = chapterArtFilename(src);
  const svgText = window.CHAPTER_ART_INLINE_SVGS?.[filename];
  if (!svgText) {
    return Promise.reject(new Error(`SVG 内联资源缺失: ${src}`));
  }
  return Promise.resolve(prepareChapterSvg(svgText));
}

function fetchChapterSvg(src) {
  return fetch(src)
    .then((response) => {
      if (!response.ok) throw new Error(`SVG 加载失败: ${src}`);
      return response.text();
    })
    .then(prepareChapterSvg);
}

function loadChapterSvg(src) {
  if (!CHAPTER_ART_CACHE.has(src)) {
    const loadSvg = window.location && window.location.protocol === "file:"
      ? loadInlineChapterSvg(src)
      : fetchChapterSvg(src).catch(() => loadInlineChapterSvg(src));
    CHAPTER_ART_CACHE.set(src, loadSvg);
  }
  return CHAPTER_ART_CACHE.get(src);
}

function hydrateChapterArt(root = document) {
  const nodes = Array.from(root.querySelectorAll(".mastery-art[data-art-src]"));
  nodes.forEach((node) => {
    const src = node.dataset.artSrc;
    if (!src || node.dataset.loaded === "true") return;
    loadChapterSvg(src)
      .then((svg) => {
        node.innerHTML = svg;
        node.dataset.loaded = "true";
        node.classList.add("is-loaded");
      })
      .catch(() => {
        node.classList.add("is-missing");
      });
  });
}

function formatHours(value) {
  const number = Number(value || 0);
  return Number.isInteger(number) ? String(number) : number.toFixed(1).replace(/\.0$/, "");
}

function masteryInsight(row) {
  if (row.rate < 60) return "薄弱环节 需要加强方法与计算";
  if (row.rate < 70) return "掌握一般 易在细节失分";
  return "基础扎实 稳中有升";
}

function lossTrendCaption(index) {
  return ["方法不稳", "计算粗心", "概念模糊", "审题遗漏"][index] || "持续观察";
}

function formatLossReasonName(value) {
  const text = String(value || "");
  if (text.includes("方法")) return "方法选择错误";
  if (text.includes("计算")) return "计算失误";
  if (text.includes("知识") || text.includes("概念")) return "知识点不熟";
  if (text.includes("条件") || text.includes("范围") || text.includes("边界")) {
    return "条件漏考虑";
  }
  if (text.length <= 5) return escapeHtml(text);

  const secondLineLength = Math.min(5, Math.max(3, Math.ceil(text.length * 0.42)));
  const splitIndex = Math.max(3, text.length - secondLineLength);
  return `${escapeHtml(text.slice(0, splitIndex))}<br>${escapeHtml(text.slice(splitIndex))}`;
}

function getMasteryCarouselElements() {
  const carousel = document.querySelector(".mastery-carousel");
  if (!carousel) return null;

  const cards = Array.from(carousel.querySelectorAll(".mastery-slide"));
  const realCards = cards.filter((card) => card.dataset.clone !== "true");
  const dots = Array.from(document.querySelectorAll(".carousel-dots i"));
  if (!cards.length) return null;

  return { carousel, cards, realCards, dots };
}

function setFocusedMasteryCard(elements, focusedCard) {
  if (!elements || !focusedCard) return;

  const activeIndex = Number(focusedCard.dataset.masteryIndex || 0);
  elements.cards.forEach((card) => {
    card.classList.toggle("is-active", card === focusedCard);
  });
  elements.dots.forEach((dot) => {
    dot.classList.toggle("active", Number(dot.dataset.dotIndex) === activeIndex);
  });
}

function defaultMasteryCard(elements) {
  if (!elements) return null;

  return (
    elements.realCards.find((card) => card.classList.contains("is-active")) ||
    elements.realCards[Math.min(1, elements.realCards.length - 1)] ||
    elements.cards[0]
  );
}

function centerMasteryCard(elements, card, behavior = "smooth") {
  if (!elements || !card || !elements.carousel.clientWidth || !card.offsetWidth) return;

  const targetLeft = card.offsetLeft - (elements.carousel.clientWidth - card.offsetWidth) / 2;
  elements.carousel.scrollTo({ left: Math.max(0, targetLeft), behavior });
}

function refreshMasteryCarouselFocus(behavior = "auto") {
  const elements = getMasteryCarouselElements();
  const initialCard = defaultMasteryCard(elements);
  if (!elements || !initialCard) return;

  setFocusedMasteryCard(elements, initialCard);
  requestAnimationFrame(() => {
    centerMasteryCard(elements, initialCard, behavior);
  });
}

window.refreshMasteryCarouselFocus = refreshMasteryCarouselFocus;

function setupMasteryCarouselFocus() {
  const elements = getMasteryCarouselElements();
  if (!elements) return;

  const { carousel, cards, realCards } = elements;

  function updateFocus() {
    const center = carousel.scrollLeft + carousel.clientWidth / 2;
    let activeCard = cards[0];
    let activeDistance = Number.POSITIVE_INFINITY;

    cards.forEach((card) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const distance = Math.abs(cardCenter - center);
      if (distance < activeDistance) {
        activeDistance = distance;
        activeCard = card;
      }
    });

    setFocusedMasteryCard(elements, activeCard);
    return activeCard;
  }

  function centerCard(card, behavior = "smooth") {
    centerMasteryCard(elements, card, behavior);
  }

  function matchingRealCard(card) {
    const activeIndex = Number(card.dataset.masteryIndex || 0);
    return realCards.find((item) => Number(item.dataset.masteryIndex || 0) === activeIndex);
  }

  let frame = 0;
  let loopTimer = 0;
  let initialized = false;
  carousel.addEventListener("scroll", () => {
    if (!initialized) return;
    cancelAnimationFrame(frame);
    clearTimeout(loopTimer);
    frame = requestAnimationFrame(updateFocus);
    loopTimer = setTimeout(() => {
      const activeCard = updateFocus();
      if (activeCard?.dataset.clone === "true") {
        const target = matchingRealCard(activeCard);
        if (target) {
          initialized = false;
          setFocusedMasteryCard(elements, target);
          centerCard(target, "auto");
          requestAnimationFrame(() => {
            initialized = true;
          });
        }
      }
    }, 140);
  }, { passive: true });

  const initialCard = defaultMasteryCard(elements);
  setFocusedMasteryCard(elements, initialCard);
  requestAnimationFrame(() => {
    centerCard(initialCard, "auto");
    requestAnimationFrame(() => {
      setFocusedMasteryCard(elements, initialCard);
      initialized = true;
    });
  });
}

function renderMasteryCard(row, index, activeMasteryIndex, isClone = false) {
  const rate = clampRate(row.rate);
  const tone = masteryTone(row, rate);
  const art = chapterArtFor(row);
  const title = art.displayTitle || row.name || "章节掌握";
  const accent = masteryAccent(tone);
  const artSrc = `${CHAPTER_ART_BASE}${art.svg}`;

  return `
    <article
      class="mastery-slide tone-${tone} ${index === activeMasteryIndex && !isClone ? "is-active" : ""}"
      style="--accent:${accent}; --rate:${rate};"
      data-mastery-index="${index}"
      data-clone="${isClone ? "true" : "false"}"
    >
      <div class="mastery-slide-title" title="${escapeHtml(row.fullTitle || row.name || title)}">${escapeHtml(title)}</div>
      <div class="mastery-slide-rate">${rate}<span>%</span></div>
      <div class="mastery-slide-label">掌握度</div>
      <div class="mastery-slide-divider" aria-hidden="true"></div>
      <div class="mastery-art" data-art-src="${escapeHtml(artSrc)}" aria-label="${escapeHtml(art.artLabel)}">
        <span>${escapeHtml(art.artLabel)}</span>
      </div>
      <div class="mastery-progress" aria-label="掌握度 ${rate}%">
        <i class="mastery-progress-fill" style="width:${rate}%"></i>
      </div>
      <p>${escapeHtml(masteryInsight(row))}</p>
    </article>
  `;
}

function weeklyQuestionTotal(activity) {
  return activity
    .slice(-7)
    .reduce((total, row) => total + Number(row.completedQuestions || 0), 0);
}

function growthStageItems() {
  return [
    {
      key: "foundation",
      title: "基础筑牢",
      desc: "已完成",
      state: "completed",
      icon: "book",
      iconSrc: "assets/icons/growth-stage-book.svg",
      pin: "assets/icons/green-completed-stage-pin.svg",
    },
    {
      key: "strengthen",
      title: "强化提升",
      desc: "进行中",
      state: "current",
      icon: "chart",
      iconSrc: "assets/icons/growth-stage-efficiency.svg",
      pin: "assets/icons/yellow-current-stage-pin.svg",
    },
    {
      key: "real",
      title: "真题演练",
      desc: "未解锁",
      state: "locked",
      icon: "list",
      iconSrc: "assets/icons/growth-stage-target.svg",
      pin: "assets/icons/gray-locked-stage-pin.svg",
    },
  ];
}

function renderHeatLegend() {
  return `
    <div class="heat-legend">
      <span class="legend-title">学习时长<br>（小时）</span>
      <div class="legend-scale" aria-label="学习时长分档">
        <span class="legend-level"><i class="legend-square none"></i><span>休息</span></span>
        <span class="legend-level"><i class="legend-square low"></i><span>0–2h</span></span>
        <span class="legend-level"><i class="legend-square mid"></i><span>2–3h</span></span>
        <span class="legend-level"><i class="legend-square high"></i><span>&gt;3h</span></span>
      </div>
      <div class="legend-note">
        <img class="legend-sprout" src="assets/icons/growth-legend-sprout.svg" alt="" />
        <span>每一次专注都是上岸的脚步。坚持下去，你比想象中更接近成功！</span>
      </div>
    </div>
  `;
}

function renderCurve(data) {
  const curve = data.curve || {};
  const activity = (curve.activity || []).slice(-14);
  const mastery = curve.mastery || [];
  const lossReasons = curve.lossReasons || [];
  const heatClass = { high: "high", medium: "mid", low: "low", none: "none" };
  const trendClasses = ["purple", "green", "orange", "blue"];
  const stages = growthStageItems();
  const weekly = curve.weekly || {};
  const weeklyCompletionRate = Number(weekly.completionRate ?? curve.weeklyCompletionRate ?? curve.overallAccuracy ?? 0);
  const weeklyAccuracyRate = Number(weekly.accuracyRate ?? curve.weeklyAccuracyRate ?? curve.overallAccuracy ?? 0);
  const weeklyQuestions = Number(weekly.questionCount ?? curve.weeklyQuestionCount ?? weeklyQuestionTotal(activity));
  const weeklyCompletedTypeCount = Number(weekly.completedTypeCount ?? curve.weeklyCompletedTypeCount ?? 0);
  const maxHours = Number(curve.activitySummary?.maxHours || 0);

  const groupedMastery = buildGroupedMastery(mastery);
  const activeMasteryIndex = Math.min(1, Math.max(0, groupedMastery.length - 1));
  const cloneCount = Math.min(2, groupedMastery.length);
  const masteryLoopItems = [
    ...groupedMastery.slice(-cloneCount).map((row, offset) => ({
      row,
      index: groupedMastery.length - cloneCount + offset,
      isClone: true,
    })),
    ...groupedMastery.map((row, index) => ({ row, index, isClone: false })),
    ...groupedMastery.slice(0, cloneCount).map((row, index) => ({ row, index, isClone: true })),
  ];
  const masteryCards = masteryLoopItems.map((item) => (
    renderMasteryCard(item.row, item.index, activeMasteryIndex, item.isClone)
  )).join("");
  const masteryDots = groupedMastery.map((_, index) => `
    <i class="${index === activeMasteryIndex ? "active" : ""}" data-dot-index="${index}"></i>
  `).join("");

  const trendCards = lossReasons.slice(0, 4).map((row, index) => {
    const rate = Number(row.rate || 0);
    const fallbackDelta = index === 0 ? -5 : index === 1 ? 3 : index === 2 ? -2 : -1;
    const delta = Number(row.trendDelta ?? row.displayTrendDelta ?? fallbackDelta);
    const trendClass = trendClasses[index % trendClasses.length];
    const deltaText = `${delta > 0 ? "↑" : "↓"}${Math.abs(delta)}%`;
    return `
      <article class="loss-trend-card ${trendClass}">
        <div class="loss-trend-top">
          <strong>${rate}%</strong>
        </div>
        <div class="loss-trend-name-row">
          <h3>${formatLossReasonName(row.name)}</h3>
          <span class="${delta > 0 ? "up" : "down"}">${deltaText}</span>
        </div>
        <div class="trend-bars" aria-hidden="true">
          <i style="--h:88%"></i>
          <i style="--h:72%"></i>
          <i style="--h:56%"></i>
          <i style="--h:38%"></i>
        </div>
        <p>${escapeHtml(lossTrendCaption(index))}</p>
      </article>
    `;
  }).join("");

  document.querySelector("#curveView").innerHTML = `
    <section class="curve-hero curve-mobile-hero growth-journey-banner">
      <img class="growth-journey-bg" src="assets/images/growth-banner-mountain-q99.jpg" alt="" />
      <div class="growth-journey-shade" aria-hidden="true"></div>
      <div class="growth-journey-copy">
        <h1>我的成长曲线</h1>
        <div class="weekly-chip">本周完成</div>
        <div class="weekly-rate">${weeklyCompletionRate}<span>%</span></div>
        <div class="weekly-caption">连续推进中 <img src="assets/icons/icon-progress-trend-up.svg" alt="" /></div>
      </div>
      <div class="target-score-card">
        <span>目标分数</span>
        <strong>${escapeHtml(curve.targetScore)}<small>分</small></strong>
      </div>
      <div class="growth-stage-layer" aria-label="备考阶段进度">
        ${stages.map((stage, index) => `
          <div class="stage-pin stage-pin-${index + 1} ${stage.state}">
            <img src="${stage.pin}" alt="" />
          </div>
          <article class="stage-card stage-card-${index + 1} ${stage.state}">
            <div class="stage-icon ${stage.icon}">
              <img src="${stage.iconSrc}" alt="" />
            </div>
            <div>
              <h2>${escapeHtml(stage.title)}</h2>
              <p>${escapeHtml(stage.desc)}</p>
            </div>
          </article>
        `).join("")}
      </div>
      <section class="growth-hero-stats" aria-label="成长关键数据">
        <div class="growth-stat-item">
          <span>本周正确率</span>
          <strong>${weeklyAccuracyRate}<small>%</small></strong>
        </div>
        <div class="growth-stat-item orange">
          <span>完成题型</span>
          <strong>${weeklyCompletedTypeCount}</strong>
        </div>
        <div class="growth-stat-item">
          <span>本周刷题</span>
          <strong>${weeklyQuestions}</strong>
        </div>
      </section>
    </section>

    <div class="curve-mobile-stack">
      <section class="curve-card heat-card-mobile">
        <div class="heat-card-heading">
          <div class="heat-title-wrap">
            <img class="heat-title-icon" src="assets/icons/growth-heatmap-title.svg" alt="" />
            <h2>最近14天学习热力图</h2>
          </div>
          <span>记录每日投入</span>
        </div>
        <div class="heat-summary">
          <div class="heat-stat">
            <span class="heat-stat-icon total" aria-hidden="true">
              <img src="assets/icons/growth-heat-calendar.svg" alt="" />
            </span>
            <span>累计自习</span>
            <strong>${formatHours(curve.activitySummary?.totalHours)}h</strong>
          </div>
          <div class="heat-stat">
            <span class="heat-stat-icon best" aria-hidden="true">
              <img src="assets/icons/growth-heat-medal.svg" alt="" />
            </span>
            <span>最高单日</span>
            <strong>${formatHours(curve.activitySummary?.maxHours)}h</strong>
          </div>
          <div class="heat-stat">
            <span class="heat-stat-icon streak" aria-hidden="true">
              <img src="assets/icons/icon-progress-trend-up.svg" alt="" />
            </span>
            <span>连续学习</span>
            <strong>${escapeHtml(curve.activitySummary?.continuousDays)}天</strong>
          </div>
        </div>
        <div class="heatmap">
          ${activity.map((row) => {
            const hours = Number(row.hours || 0);
            const isBest = row.studied && maxHours > 0 && hours === maxHours;
            return `
              <div class="heat-day ${isBest ? "is-best" : ""}">
                <span>${escapeHtml(row.date)}</span>
                <div class="heat-box ${heatClass[row.level] || "none"}"></div>
                <div class="heat-meta">${row.studied ? `${formatHours(row.hours)}h` : "休息"}</div>
              </div>
            `;
          }).join("")}
        </div>
        ${renderHeatLegend()}
      </section>

      <section class="curve-card mastery-carousel-card">
        <div class="curve-section-head">
          <div class="curve-section-title">
            <img class="section-title-svg" src="assets/icons/growth-mastery-title.svg" alt="" />
            <h2>${escapeHtml(curve.masteryLabel || "章节掌握度")}</h2>
          </div>
          <button type="button">定位薄弱章节，精准提分</button>
        </div>
        <div class="mastery-carousel">
          ${masteryCards}
        </div>
        <div class="carousel-dots" aria-hidden="true">${masteryDots}</div>
      </section>

      <section class="curve-card loss-trend-section">
        <div class="curve-section-head">
          <div class="curve-section-title">
            <img class="section-title-svg" src="assets/icons/growth-loss-diagnosis-title.svg" alt="" />
            <h2>错因诊断卡</h2>
          </div>
          <span>定位失分原因，针对突破</span>
        </div>
        <div class="loss-trend-grid">
          ${trendCards}
        </div>
      </section>
    </div>

  `;

  setupMasteryCarouselFocus();
  hydrateChapterArt(document.querySelector("#curveView"));
}

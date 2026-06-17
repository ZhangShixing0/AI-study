function shortCurveName(value, maxLength = 5) {
  const text = String(value || "");
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function masteryInsight(row) {
  if (row.rate < 60) return "薄弱环节 需加强方法与计算";
  if (row.rate < 70) return "掌握一般 易在细节失分";
  return "基础扎实 稳中有升";
}

function lossTrendCaption(index) {
  return ["方法不稳", "计算粗心", "概念模糊", "审题遗漏"][index] || "持续观察";
}

function formatLossReasonName(value) {
  const replacements = {
    "方法选择错误": "方法选择错误",
    "知识点不熟、概念混淆": "识点不熟概念混淆",
    "条件、范围、边界漏考虑": "条件、边界漏考虑",
  };
  const text = replacements[String(value || "")] || String(value || "");

  if (text === "方法选择错误") return "方法选择<br>错误";
  if (text === "识点不熟概念混淆") return "识点不熟<br>概念混淆";
  if (text === "条件、边界漏考虑") return "条件或边<br>界漏考虑";
  if (text.length <= 5) return escapeHtml(text);

  const secondLineLength = Math.min(5, Math.max(3, Math.ceil(text.length * 0.42)));
  const splitIndex = Math.max(3, text.length - secondLineLength);
  return `${escapeHtml(text.slice(0, splitIndex))}<br>${escapeHtml(text.slice(splitIndex))}`;
}

function setupMasteryCarouselFocus() {
  const carousel = document.querySelector(".mastery-carousel");
  if (!carousel) return;

  const cards = Array.from(carousel.querySelectorAll(".mastery-slide"));
  if (!cards.length) return;

  function setFocusedCard(focusedCard) {
    cards.forEach((card) => {
      card.classList.toggle("is-active", card === focusedCard);
    });
  }

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

    setFocusedCard(activeCard);
  }

  let frame = 0;
  let initialized = false;
  carousel.addEventListener("scroll", () => {
    if (!initialized) return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(updateFocus);
  }, { passive: true });

  const initialCard = cards[Math.min(1, cards.length - 1)];
  setFocusedCard(initialCard);
  requestAnimationFrame(() => {
    const targetLeft = initialCard.offsetLeft - (carousel.clientWidth - initialCard.offsetWidth) / 2;
    carousel.scrollTo({ left: Math.max(0, targetLeft), behavior: "auto" });
    requestAnimationFrame(() => {
      setFocusedCard(initialCard);
      initialized = true;
    });
  });
}

function renderCurve(data) {
  const activity = data.curve.activity.slice(-14);
  const mastery = data.curve.mastery || [];
  const lossReasons = data.curve.lossReasons || [];
  const priorities = data.curve.priorities || [];
  const heatClass = { high: "high", medium: "mid", low: "low", none: "none" };
  const trendClasses = ["purple", "green", "orange", "blue"];

  const activeMasteryIndex = Math.min(1, Math.max(0, mastery.length - 1));
  const masteryCards = mastery.map((row, index) => {
    const rate = Number(row.rate || 0);
    return `
      <article class="mastery-slide ${rate < 65 ? "weak" : ""} ${index === activeMasteryIndex ? "is-active" : ""}">
        <div class="mastery-slide-title">${escapeHtml(shortCurveName(row.name))}</div>
        <div class="mastery-slide-rate">${rate}<span>%</span></div>
        <div class="mastery-ring" style="--rate:${rate}"></div>
        <svg class="mastery-spark" viewBox="0 0 88 34" aria-hidden="true">
          <path d="M4 25 L18 18 L32 22 L46 13 L60 21 L74 15 L84 8"></path>
          <circle cx="4" cy="25" r="2.5"></circle>
          <circle cx="18" cy="18" r="2.5"></circle>
          <circle cx="32" cy="22" r="2.5"></circle>
          <circle cx="46" cy="13" r="2.5"></circle>
          <circle cx="60" cy="21" r="2.5"></circle>
          <circle cx="74" cy="15" r="2.5"></circle>
          <circle cx="84" cy="8" r="2.5"></circle>
        </svg>
        <p>${escapeHtml(masteryInsight(row))}</p>
      </article>
    `;
  }).join("");

  const trendCards = lossReasons.slice(0, 4).map((row, index) => {
    const rate = Number(row.rate || 0);
    const delta = index === 0 ? -5 : index === 1 ? 3 : index === 2 ? -2 : -1;
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

  const prioritiesHtml = priorities.map((row) => {
    const tagText = row.rate !== undefined ? "薄弱项" : row.tag;
    return `
      <div class="curve-priority-row">
        <div class="priority-index">${row.rank}</div>
        <div class="priority-name">${escapeHtml(shortCurveName(row.name, 5))}</div>
        <div class="tag">${escapeHtml(tagText)}</div>
        <div class="priority-desc">${escapeHtml(row.reason)}</div>
        <div class="priority-action">›</div>
      </div>
    `;
  }).join("");

  document.querySelector("#curveView").innerHTML = `
    <section class="curve-hero curve-mobile-hero">
      <h1>${escapeHtml(data.curve.title || "数学能力成长曲线")}</h1>
      <p class="curve-hero-subtitle">把握学习趋势，科学备战考研数学</p>
      <section class="metrics-panel curve-metrics-panel">
        <div class="metric-grid curve-metric-grid">
          <div class="metric-item"><div class="metric-icon">●</div><div><div class="metric-label">目标分数</div><div class="metric-value">${data.curve.targetScore}<small> 分</small></div></div></div>
          <div class="metric-item"><div class="metric-icon">↗</div><div><div class="metric-label">综合正确率</div><div class="metric-value">${data.curve.overallAccuracy}<small>%</small></div></div></div>
          <div class="metric-item"><div class="metric-icon warn">!</div><div><div class="metric-label">复错率</div><div class="metric-value orange">${data.curve.repeatWrongRate}<small>%</small></div></div></div>
        </div>
        <div class="curve-note"><span class="info">i</span><span><strong>注：</strong>别太在意第一遍学习的正确率，把重点放在真正掌握错题上。</span></div>
      </section>
    </section>

    <div class="curve-mobile-stack">
      <section class="curve-card heat-card-mobile">
        <h2>最近14天学习热力图 <span>?</span></h2>
        <div class="heat-summary">
          <div class="heat-stat"><span>累计自习</span><strong>${data.curve.activitySummary.totalHours}h</strong></div>
          <div class="heat-stat"><span>最高单日</span><strong>${data.curve.activitySummary.maxHours}h</strong></div>
          <div class="heat-stat"><span>连续学习</span><strong>${data.curve.activitySummary.continuousDays}天</strong></div>
        </div>
        <div class="heatmap">
          ${activity.map((row) => `
            <div class="heat-day"><span>${escapeHtml(row.date)}</span><div class="heat-box ${heatClass[row.level] || "none"}"></div><div class="heat-meta">${row.studied ? `${row.hours}h` : "休息"}</div></div>
          `).join("")}
        </div>
      </section>

      <section class="curve-card mastery-carousel-card">
        <div class="curve-section-head">
          <h2>${escapeHtml(data.curve.masteryLabel || "章节掌握度")}</h2>
          <button type="button">查看全部 〉</button>
        </div>
        <div class="mastery-carousel">
          ${masteryCards}
        </div>
        <div class="carousel-dots" aria-hidden="true"><i class="active"></i><i></i><i></i><i></i></div>
      </section>

      <section class="curve-card loss-trend-section">
        <div class="curve-section-head">
          <h2>错因趋势卡</h2>
          <span>定位失分根因，针对突破</span>
        </div>
        <div class="loss-trend-grid">
          ${trendCards}
        </div>
      </section>
    </div>

    <section class="priority-card curve-priority-card">
      <div class="priority-head"><div class="priority-icon">◎</div><h2>最该优先补强</h2></div>
      <div class="priority-list">
        ${prioritiesHtml}
      </div>
    </section>
  `;

  setupMasteryCarouselFocus();
}

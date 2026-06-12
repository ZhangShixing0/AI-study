function buildLossDonutSvg(lossReasons, colors) {
        const cx = 130;
        const cy = 104;
        const outerRadius = 86;
        const innerRadius = 43;
        const rawTotal = lossReasons.reduce((sum, row) => sum + Number(row.rate || 0), 0);
        const total = rawTotal || 1;
        let cursor = 0;
        const labels = [];
        const slices = rawTotal === 0
          ? `<path class="loss-slice" d="${describeDonutSlice(cx, cy, outerRadius, innerRadius, 0, 359.99)}" fill="#e5eaee"></path>`
          : lossReasons.map((row, index) => {
          const value = Number(row.rate || 0);
          if (value <= 0) return "";
          const startAngle = cursor / total * 360;
          const endAngle = (cursor + value) / total * 360;
          const midAngle = (startAngle + endAngle) / 2;
          cursor += value;

          const color = colors[index % colors.length];
          const path = describeDonutSlice(cx, cy, outerRadius, innerRadius, startAngle, endAngle);
          const showLabel = value >= 12;
          const labelRadius = (outerRadius + innerRadius) / 2;
          const labelPoint = polarToCartesian(cx, cy, labelRadius, midAngle);

          labels.push({
            rate: value,
            showLabel,
            x: labelPoint.x,
            y: labelPoint.y,
          });

          return `<path class="loss-slice" d="${path}" fill="${color}"></path>`;
        }).join("");

        const labelHtml = labels.map((item) => {
          if (!item.showLabel) return "";
          return `<text class="loss-slice-label" x="${item.x.toFixed(1)}" y="${item.y.toFixed(1)}">${item.rate}%</text>`;
        }).join("");

        return `
          <svg class="loss-donut-chart" viewBox="0 0 260 220" role="img" aria-label="失分原因比例">
            ${slices}
            <circle class="loss-center" cx="${cx}" cy="${cy}" r="${innerRadius - 2}"></circle>
            <text class="loss-center-text" x="${cx}" y="${cy - 8}">错因</text>
            <text class="loss-center-text" x="${cx}" y="${cy + 10}">比例</text>
            ${labelHtml}
          </svg>
        `;
      }



function renderCurve(data) {
        const activity = data.curve.activity.slice(-14);
        const heatClass = { high: "high", medium: "mid", low: "low", none: "none" };
        const colors = ["#13bfa8", "#42b977", "#ffa726", "#7e70f2", "#94a3b8"];
        const lossDonutSvg = buildLossDonutSvg(data.curve.lossReasons, colors);
        const prioritiesHtml = data.curve.priorities.map((row) => {
          const tagText = row.rate !== undefined ? `得分率 ${row.rate}%` : row.tag;
          const tagClass = row.rate !== undefined && row.rate < 65 ? "" : row.tag === "待提升" ? "blue" : "";
          return `
            <div class="priority-row">
              <div class="priority-index">${row.rank}</div>
              <div class="priority-name">${escapeHtml(row.name)}</div>
              <div class="tag ${tagClass}">${escapeHtml(tagText)}</div>
              <div class="priority-desc">${escapeHtml(row.reason)}</div>
              <div class="priority-action">▤</div>
            </div>
          `;
        }).join("");

        document.querySelector("#curveView").innerHTML = `
          <section class="curve-hero">
            <svg class="radar-art" viewBox="0 0 392 188" fill="none" aria-hidden="true">
              <circle cx="190" cy="115" r="118" stroke="#13BFA8" stroke-opacity=".12" />
              <circle cx="190" cy="115" r="92" stroke="#13BFA8" stroke-opacity=".12" />
              <circle cx="190" cy="115" r="66" stroke="#13BFA8" stroke-opacity=".12" />
              <circle cx="190" cy="115" r="40" stroke="#13BFA8" stroke-opacity=".12" />
              <path d="M70 153 112 118 136 140 170 93 198 118 282 28" stroke="#0BAE8F" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
              <path d="m266 32 18-6-6 18" stroke="#0BAE8F" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <h1>${escapeHtml(data.curve.title || "数学能力成长曲线")}</h1>
            <p class="curve-hero-subtitle">把握学习趋势，科学备战考研数学</p>
            <section class="metrics-panel">
              <div class="metric-grid">
                <div class="metric-item"><div class="metric-icon">●</div><div><div class="metric-label">目标分数</div><div class="metric-value">${data.curve.targetScore}<small> 分</small></div></div></div>
                <div class="metric-item"><div class="metric-icon">↗</div><div><div class="metric-label">综合正确率</div><div class="metric-value">${data.curve.overallAccuracy}<small>%</small></div></div></div>
                <div class="metric-item"><div class="metric-icon warn">!</div><div><div class="metric-label">复错率</div><div class="metric-value orange">${data.curve.repeatWrongRate}<small>%</small></div></div></div>
                <div class="metric-item"><div class="metric-icon">✓</div><div><div class="metric-label">本周完成率</div><div class="metric-value">${data.curve.weeklyCompletionRate}<small>%</small></div></div></div>
              </div>
              <div class="curve-note"><span class="info">i</span><span><strong>注：</strong>别太在意第一遍学习的正确率，把重点放在真正掌握错题上。</span></div>
            </section>
          </section>

          <div class="curve-grid">
            <section class="curve-card">
              <h2>最近14天学习热力图 <span style="font-size:20px;color:#64748b">?</span></h2>
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
              <div class="heat-legend">
                <span><i class="legend-square"></i>高强度</span>
                <span><i class="legend-square mid"></i>中等</span>
                <span><i class="legend-square low"></i>低强度</span>
                <span><i class="legend-square none"></i>未学习</span>
              </div>
            </section>

            <section class="curve-card mastery-card">
              <h2>${escapeHtml(data.curve.masteryLabel || "章节掌握度")}</h2>
              <div class="mastery-list mastery-scroll">
                ${data.curve.mastery.map((row) => `
                  <div class="mastery-row"><div>${escapeHtml(row.name)}</div><div class="mastery-percent">${row.rate}%</div><div class="bar-track"><div class="bar-fill ${row.rate < 65 ? "orange" : ""}" style="width:${row.rate}%"></div></div></div>
                `).join("")}
              </div>
            </section>

            <section class="curve-card loss-card">
              <h2>失分原因比例</h2>
              <div class="loss-content">
                <div class="loss-chart-wrap">${lossDonutSvg}</div>
                <div class="loss-legend-bottom">
                  ${data.curve.lossReasons.map((row, index) => `
                    <div class="loss-legend-row">
                      <i class="dot" style="background:${colors[index % colors.length]}"></i><span>${escapeHtml(row.name)}</span><strong>${row.rate}%</strong>
                    </div>
                  `).join("")}
                </div>
              </div>
            </section>
          </div>

          <section class="priority-card">
            <div class="priority-head"><div class="priority-icon">◎</div><h2>最该优先补强</h2></div>
            <div class="priority-list">
              ${prioritiesHtml}
            </div>
          </section>
        `;
      }



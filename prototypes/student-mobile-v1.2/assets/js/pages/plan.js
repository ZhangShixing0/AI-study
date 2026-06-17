      function renderSourceRows(type) {
        const groups = Array.isArray(type.sourceGroups) ? type.sourceGroups : [];
        if (groups.length) {
          return groups.map((group, index) => {
            const dotClass = type.theme === "purple" ? "purple" : "";
            const entries = Array.isArray(group.entries) && group.entries.length
              ? group.entries
              : [group];
            const entryLines = entries.map((entry, entryIndex) => {
              const numbers = Array.isArray(entry.numbers) ? entry.numbers : [];
              const titleText = entry.continuationTitle || entry.title || "";
              return `
                      <div class="source-entry ${entryIndex ? "source-entry-continuation" : ""}">
                        <div class="source-group-title">
                          ${entryIndex === 0 ? `<strong class="source-book-label">${escapeHtml(group.sourceLabel || "")}</strong>` : ""}
                          <span>${escapeHtml(titleText)}</span>
                        </div>
                        ${numbers.length ? `
                          <div class="source-question-line">
                            <span class="source-question-content">
                              <span class="source-question-label">题号：</span>
                              <span class="source-question-numbers">${numbers.map((number, numberIndex) => `<span class="source-question-number">${escapeHtml(number)}${numberIndex < numbers.length - 1 ? "、" : ""}</span>`).join("")}</span>
                            </span>
                          </div>
                        ` : ""}
                      </div>
                    `;
            }).join("");
            return `
                  <div class="source-row source-book-row">
                    <span class="book-dot ${dotClass}"></span>
                    <div class="source-group-copy">
                      ${entryLines}
                    </div>
                    <img src="assets/icons/icon-arrow-right.svg" alt="" />
                  </div>
                `;
          }).join("");
        }

        return type.sources.map((source, index) => `
                  <div class="source-row">
                    <span class="book-dot ${index % 2 ? "purple" : ""}"></span>
                    <span>${escapeHtml(source)}</span>
                    <img src="assets/icons/icon-arrow-right.svg" alt="" />
                  </div>
                `).join("");
      }

      const TYPE_SUMMARIES = {
        1: {
          title: "必会｜计算题：积分基本功题型",
          body: "常考换元、分部、凑微分和基本公式熟练度。注意不要漏常数 C，换元后要还原。",
        },
        2: {
          title: "重点｜概念题：左右极限与分段讨论",
          body: "关注趋近方向、定义域端点和函数表达式变化，先拆左右再判断极限是否存在。",
        },
      };

      function typeSummary(type) {
        return type.summary || TYPE_SUMMARIES[type.index] || {
          title: "重点｜今日核心题型",
          body: "先抓题型方法，再核对易错条件和计算细节，完成后及时提交做题反馈。",
        };
      }

      function formatFeedbackDisplayLabel(label) {
        const formatter = window.TodayPlanSourceFormatting;
        return formatter?.formatFeedbackLabel(label) || label;
      }

      function statusIconForPlan(plan) {
        return plan.rawStatus === "completed"
          ? "assets/icons/icon-status-check-c1.svg"
          : "assets/icons/icon-edit.svg";
      }

      function renderPlan(data) {
        const planView = document.querySelector("#planView");
        const wrongReasons = [
          ["method_error", "方法错"],
          ["calculation_error", "计算错"],
          ["knowledge_gap", "知识点"],
          ["condition_missed", "条件漏"],
        ];
        const cards = data.plan.types.map((type) => {
          const summary = typeSummary(type);
          return `
          <article class="type-card ${type.theme === "purple" ? "theme-purple" : ""}">
            <div class="type-card-head">
              <div class="type-label">题型 ${type.index}</div>
              <h3 class="type-title">${escapeHtml(type.title)}</h3>
            </div>
            <div class="type-summary">
              <div class="type-summary-title">${escapeHtml(summary.title)}</div>
              <div class="type-summary-body">${escapeHtml(summary.body)}</div>
            </div>
            <section class="source">
              <div class="source-head"><img src="assets/icons/icon-book.svg" alt="" />习题来源</div>
              <div class="source-list">
                ${renderSourceRows(type)}
              </div>
            </section>
          </article>
        `;
        }).join("");

        const feedbackRows = data.plan.feedbackItems.length
          ? data.plan.feedbackItems.map((item) => `
          <div class="feedback-row" data-question-id="${escapeHtml(item.questionId)}">
            <div class="feedback-title">${escapeHtml(formatFeedbackDisplayLabel(item.label))}</div>
            <div class="feedback-choices">
              <button class="choice correct" type="button">正确</button>
              <button class="choice wrong" type="button">错误</button>
              <button class="choice none" type="button">未作</button>
            </div>
            <div class="wrong-reasons" aria-label="错因选择">
              ${wrongReasons.map(([code, label]) => `
                <button class="wrong-reason" type="button" data-wrong-reason="${code}">${label}</button>
              `).join("")}
            </div>
          </div>
        `).join("")
          : `<div class="feedback-message success">当前没有开放中的反馈题型。</div>`;

        const isExpired = data.plan.rawStatus === "expired";
        const isCompleted = data.plan.rawStatus === "completed";
        const planMain = isExpired
          ? `
          <section class="plan-expired-card">
            <h2>服务已到期，今日计划暂不可用</h2>
            <p>${escapeHtml(data.plan.slogan || "请联系老师续费后继续查看今日计划。")}</p>
            <div class="plan-expired-meta">
              <div>当前学生<strong>${escapeHtml(data.student.name)}</strong></div>
              <div>到期日期<strong>${escapeHtml(data.student.paidUntil || "未设置")}</strong></div>
            </div>
          </section>
        `
          : isCompleted
          ? `
          <section class="completion-card">
            <h2>今日任务已完成</h2>
            <p>${escapeHtml(data.plan.completedMessage || "恭喜你完成今日全部题型！今天的坚持很漂亮，继续保持。")}</p>
            <button class="next-test-day-btn" type="button" data-load-next-test-day>开启下一日计划</button>
          </section>
        `
          : `
            <div class="section-head">
            <div class="section-title">
              <img src="assets/icons/icon-section-plan-c1.svg" alt="" />
              <h2>今日全部学习单元</h2>
            </div>
            <div class="type-count">共 <strong>${data.plan.totalTypes}</strong> 个题型</div>
          </div>

          ${cards}

          <section class="feedback">
            <div class="feedback-head">
              <img src="assets/icons/icon-feedback.svg" alt="" />
              <h2>做题反馈</h2>
              <div class="feedback-subtitle">请按顺序填写今日做题情况</div>
              <button class="all-none" type="button" id="allNone">本题型全部未作</button>
            </div>
            <div class="feedback-list">${feedbackRows}</div>
            <div class="feedback-actions">
              <button class="submit-feedback" id="submitFeedback" type="button" ${data.plan.feedbackItems.length ? "" : "disabled"}>提交本题型反馈</button>
              <div class="feedback-message" id="feedbackMessage">${data.plan.feedbacks?.length ? `已提交 ${data.plan.feedbacks.length} 条反馈记录` : ""}</div>
            </div>
          </section>
        `;

        planView.innerHTML = `
          <section class="banner">
            <div class="banner-text">
              <h1 class="banner-title">今日学习计划</h1>
              <div class="banner-meta">
                <span class="meta-item"><img src="assets/icons/icon-calendar.svg" alt="" />${escapeHtml(data.plan.date)}</span>
                <span>${escapeHtml(data.student.name)}</span>
              </div>
              <button class="status-btn" type="button"><img src="${statusIconForPlan(data.plan)}" alt="" />${escapeHtml(data.plan.status)}</button>
            </div>
            <img class="banner-student" src="assets/images/today-plan-banner-c1.png" alt="学生学习插画" />
            <div class="countdown">
              <div>
                <small>距考研</small>
                <strong>${data.plan.daysToExam}</strong>
                <span>天</span>
              </div>
            </div>
          </section>

          ${planMain}
        `;
      }

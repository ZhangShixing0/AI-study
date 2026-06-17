function renderPlan(data) {
        const planView = document.querySelector("#planView");
        const wrongReasons = [
          ["method_error", "方法错"],
          ["calculation_error", "计算错"],
          ["knowledge_gap", "知识点"],
          ["condition_missed", "条件漏"],
        ];
        const cards = data.plan.types.map((type) => `
          <article class="type-card ${type.theme === "purple" ? "theme-purple" : ""}">
            <div class="type-card-head">
              <div class="type-label">题型 ${type.index}</div>
              <h3 class="type-title">${escapeHtml(type.title)}</h3>
              <button class="arrow-circle" type="button" aria-label="查看详情">
                <img src="assets/icons/icon-arrow-right.svg" alt="" />
              </button>
            </div>
            <div class="lecture">
              <img class="lecture-img" src="${escapeHtml(type.image)}" alt="原创题型讲解图片" />
              <div class="play-pill"><img src="assets/icons/icon-play.svg" alt="" />原创题型讲解图片</div>
            </div>
            <section class="source">
              <div class="source-head"><img src="assets/icons/icon-book.svg" alt="" />习题来源</div>
              <div class="source-list">
                ${type.sources.map((source, index) => `
                  <div class="source-row">
                    <span class="book-dot ${index % 2 ? "purple" : ""}"></span>
                    <span>${escapeHtml(source)}</span>
                    <img src="assets/icons/icon-arrow-right.svg" alt="" />
                  </div>
                `).join("")}
              </div>
            </section>
          </article>
        `).join("");

        const feedbackRows = data.plan.feedbackItems.length
          ? data.plan.feedbackItems.map((item) => `
          <div class="feedback-row" data-question-id="${escapeHtml(item.questionId)}">
            <div class="feedback-title">${escapeHtml(item.label)}</div>
            <button class="choice correct" type="button">正确</button>
            <button class="choice wrong" type="button">错误</button>
            <button class="choice none" type="button">未作</button>
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
              <img src="assets/icons/icon-section-plan.svg" alt="" />
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
              <button class="status-btn" type="button"><img src="assets/icons/icon-edit.svg" alt="" />${escapeHtml(data.plan.status)}</button>
            </div>
            <img class="banner-student" src="assets/images/banner-student-study.placeholder.png" alt="学生学习插画" />
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

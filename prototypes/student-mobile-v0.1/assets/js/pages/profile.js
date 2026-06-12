function renderProfile(data) {
        const profile = data?.profile || {
          nickname: activeData?.student?.name || "数学er",
          mathType: activeData?.student?.mathType || "数学二",
          examSubject: activeData?.student?.mathType || "数学二",
          daysToExam: 0,
          continuousDays: 0,
          todayStudyHours: 0,
          dailyMathGoalHours: 3,
          primaryBooks: ["880", "660"],
          backupBooks: ["1000"],
          targetSchool: { name: "未选择" },
        };
        const targetSchool = profile.targetSchool?.name || "未选择";
        document.querySelector("#myView").innerHTML = `
          <div class="my-page">
            <section class="profile-hero">
              <div class="profile-top">
                <div class="profile-avatar">${escapeHtml((profile.nickname || "数").slice(0, 1))}</div>
                <div>
                  <div class="profile-title">你好，${escapeHtml(profile.nickname || "数学er")}</div>
                  <div class="profile-subtitle">${escapeHtml(profile.mathType || "数学二")}备考中</div>
                </div>
              </div>
              <div class="profile-stats-card">
                <div class="profile-stat">
                  <div class="profile-stat-label">距考研</div>
                  <div class="profile-stat-value">${profile.daysToExam}<span>天</span></div>
                </div>
                <div class="profile-stat">
                  <div class="profile-stat-label">连续学习</div>
                  <div class="profile-stat-value">${profile.continuousDays}<span>天</span></div>
                </div>
                <div class="profile-stat">
                  <div class="profile-stat-label">今日累计学习</div>
                  <div class="profile-stat-value">${Number(profile.todayStudyHours || 0).toFixed(1)}<span>小时</span></div>
                </div>
              </div>
            </section>

            <section class="profile-card">
              <div class="profile-card-head">
                <div class="profile-card-title"><span>▣</span>我的备考配置</div>
                <button class="profile-more" type="button">查看全部 〉</button>
              </div>
              <div class="config-row">
                <div class="config-icon">📖</div><div>考试科目</div><div class="config-value">${escapeHtml(profile.examSubject || "数学二")}</div><div>›</div>
              </div>
              <div class="config-row">
                <div class="config-icon">☆</div><div>主选习题册</div><div>${(profile.primaryBooks || []).filter(Boolean).map((book, index) => `<span class="book-pill ${index ? "blue" : ""}">《${escapeHtml(book)}》</span>`).join("")}</div><div>›</div>
              </div>
              <div class="config-row">
                <div class="config-icon">▤</div><div>备选习题册</div><div>${(profile.backupBooks || []).filter(Boolean).map((book) => `<span class="book-pill orange">《${escapeHtml(book)}》</span>`).join("")}</div><div>›</div>
              </div>
              <div class="config-row">
                <div class="config-icon">▱</div><div>目标院校</div><div><button class="school-value" type="button" data-open-school-search>${escapeHtml(targetSchool)}</button></div><div>›</div>
              </div>
              <div class="config-row">
                <div class="config-icon">◎</div><div>每日数学学习目标</div><div class="config-value">${Number(profile.dailyMathGoalHours || 3).toFixed(1).replace(".0", "")} 小时</div><div>›</div>
              </div>
            </section>
            <div class="school-search-modal" id="schoolSearchModal">
              <div class="school-sheet">
                <div class="school-sheet-head"><span>选择目标院校</span><button class="school-close" type="button" data-close-school-search>×</button></div>
                <input class="school-search-input" id="schoolSearchInput" type="search" placeholder="搜索院校名称，如 清华、复旦、武汉" />
                <div class="school-results" id="schoolResults"></div>
              </div>
            </div>
          </div>
        `;
      }



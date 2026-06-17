function renderProfile(data, rankings) {
  const profile = data?.profile || {
    nickname: activeData?.student?.name || "数学er",
    mathType: activeData?.student?.mathType || "数学二",
    examSubject: activeData?.student?.mathType || "数学二",
    daysToExam: activeData?.plan?.daysToExam || 0,
    continuousDays: 0,
    todayStudyHours: 0,
    dailyMathGoalHours: 3,
    primaryBooks: ["880", "1000"],
    backupBooks: ["660"],
    targetSchool: { name: "未选择" },
  };
  const summary = rankings?.summary || {};
  const continuousDays = Number(summary.continuousDays ?? profile.continuousDays ?? 0);
  const badgeTargets = [7, 14, 21, 30];
  const nextTarget = badgeTargets.find((target) => continuousDays < target) || 30;
  const nextProgress = Math.min(continuousDays, nextTarget);
  const nextRate = Math.min(100, Math.round((nextProgress / nextTarget) * 100));
  const remainingDays = Math.max(0, nextTarget - continuousDays);
  const nextBadgeName = summary.nextBadgeTarget || `${nextTarget}天连续学习勋章`;
  const targetSchool = profile.targetSchool?.name || "未选择";
  const planStatus = activeData?.plan?.status || "待反馈";
  const targetScore = profile.targetScore || activeData?.student?.targetScore || "-";
  const primaryBooks = (profile.primaryBooks || ["880", "1000"]).filter(Boolean);
  const backupBooks = (profile.backupBooks || ["660"]).filter(Boolean);
  const rankCards = [
    { label: "今日打卡", value: summary.todayRank ? `第${summary.todayRank}` : "未上榜" },
    { label: "本周坚持", value: summary.weeklyRank ? `第${summary.weeklyRank}` : "未上榜" },
    { label: "连续学习", value: summary.continuousRank ? `第${summary.continuousRank}` : "未上榜" },
  ];
  const earnedBadges = badgeTargets
    .filter((target) => continuousDays >= target)
    .map((target) => `${target}天`);
  const visibleBadges = earnedBadges.length ? earnedBadges : [`${nextTarget}天进行中`];

  document.querySelector("#myView").innerHTML = `
    <div class="my-page mobile-shell">
      <section class="profile-hero">
        <div class="profile-top">
          <div class="profile-avatar">${escapeHtml((profile.nickname || "数").slice(0, 1))}</div>
          <div>
            <div class="profile-title">你好，${escapeHtml(profile.nickname || "数学er")}</div>
            <div class="profile-subtitle">${escapeHtml(profile.mathType || "数学二")}备考中 · 目标 ${escapeHtml(targetScore)} 分</div>
          </div>
          <button class="profile-calendar-btn" type="button">打卡日历</button>
        </div>
        <div class="profile-stats-card">
          <div class="profile-stat">
            <div class="profile-stat-label">距考研</div>
            <div class="profile-stat-value">${Number(profile.daysToExam || 0)}<span>天</span></div>
          </div>
          <div class="profile-stat">
            <div class="profile-stat-label">连续学习</div>
            <div class="profile-stat-value">${continuousDays}<span>天</span></div>
          </div>
          <div class="profile-stat">
            <div class="profile-stat-label">累计学习</div>
            <div class="profile-stat-value">${Number(profile.todayStudyHours || 0).toFixed(1)}<span>小时</span></div>
          </div>
        </div>
      </section>

      <section class="profile-card">
        <div class="profile-card-head">
          <div class="profile-card-title"><span></span>我的备考配置</div>
          <button class="profile-more" type="button">查看全部</button>
        </div>
        <div class="config-row">
          <div class="config-icon">科</div><div>考试科目</div><div class="config-value">${escapeHtml(profile.examSubject || "数学二")}</div><div>›</div>
        </div>
        <div class="config-row">
          <div class="config-icon">主</div><div>主选习题册</div><div>${primaryBooks.map((book, index) => `<span class="book-pill ${index ? "blue" : ""}">《${escapeHtml(book)}》</span>`).join("")}</div><div>›</div>
        </div>
        <div class="config-row">
          <div class="config-icon">备</div><div>备选习题册</div><div>${backupBooks.map((book) => `<span class="book-pill orange">《${escapeHtml(book)}》</span>`).join("")}</div><div>›</div>
        </div>
        <div class="config-row">
          <div class="config-icon">校</div><div>目标院校</div><div><button class="school-value" type="button" data-open-school-search>${escapeHtml(targetSchool)}</button></div><div>›</div>
        </div>
        <div class="config-row">
          <div class="config-icon">时</div><div>每日数学学习目标</div><div class="config-value">${Number(profile.dailyMathGoalHours || 3).toFixed(1).replace(".0", "")} 小时</div><div>›</div>
        </div>
      </section>

      <section class="profile-card profile-status-card">
        <div class="profile-card-head">
          <div class="profile-card-title"><span></span>今日状态</div>
          <button class="profile-more" type="button" data-go-plan="true">去反馈</button>
        </div>
        <div class="today-state-grid">
          <div class="today-state-item">
            <div class="today-state-label">提交状态</div>
            <strong>${escapeHtml(planStatus)}</strong>
            <p>${activeData?.plan?.completedMessage ? escapeHtml(activeData.plan.completedMessage) : "完成今日题目后，系统会在明天继续推进计划。"}</p>
          </div>
          <div class="today-state-item">
            <div class="today-state-label">我的勋章</div>
            <strong>${visibleBadges.map((badge) => `<span class="mini-badge">${escapeHtml(badge)}</span>`).join("")}</strong>
            <p>当前连续学习 ${continuousDays} 天，下一枚目标是 ${escapeHtml(nextBadgeName)}。</p>
          </div>
        </div>
        <div class="profile-rank-strip">
          ${rankCards.map((card) => `
            <div class="profile-rank-chip">
              <span>${card.label}</span>
              <strong>${escapeHtml(card.value)}</strong>
            </div>
          `).join("")}
        </div>
        <button class="profile-rank-link" type="button" data-jump-view="rankView">查看完整排行</button>
      </section>

      <section class="rank-card next-goal profile-next-goal">
        <h2>下一枚勋章目标</h2>
        <div class="goal-content">
          <div class="goal-medal">
            <div class="medal teal">${nextTarget}</div>
            <div>${escapeHtml(nextBadgeName)}</div>
          </div>
          <div>
            <div class="goal-copy">再坚持 <strong>${remainingDays}</strong> 天即可点亮</div>
            <div class="goal-progress"><div class="progress-track"><div class="progress-fill" style="width:${nextRate}%"></div></div><span>${nextProgress}/${nextTarget} 天</span></div>
            <button class="continue-btn" type="button" data-go-plan="true">继续今日学习</button>
          </div>
          <div class="goal-calendar" aria-hidden="true"><div class="goal-calendar-grid"><i></i><i></i><i></i><i></i><i></i><i></i></div></div>
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

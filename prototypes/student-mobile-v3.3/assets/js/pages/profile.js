let profileLeaderBoardKey = "today";

function setProfileLeaderBoardKey(key) {
  profileLeaderBoardKey = key === "streak" ? "streak" : "today";
}

function getProfileSubmissionState(plan = {}) {
  const types = Array.isArray(plan.types) ? plan.types : [];
  const feedbacks = Array.isArray(plan.feedbacks) ? plan.feedbacks : [];
  const rawStatus = plan.rawStatus || plan.planStatus || "";
  const totalCount = Number(plan.totalTypes || types.length || 0);
  const submittedTypeIds = new Set(
    types
      .filter((type) => type?.feedbackStatus === "submitted")
      .map((type) => type.typeId || type.id || type.title || "")
      .filter(Boolean)
  );
  feedbacks.forEach((feedback) => {
    const typeId = feedback?.typeId || feedback?.type_id || feedback?.questionTypeId || feedback?.question_type_id || "";
    if (typeId) submittedTypeIds.add(typeId);
  });
  const submittedCount = rawStatus === "completed" && totalCount > 0
    ? totalCount
    : Math.min(totalCount || submittedTypeIds.size, submittedTypeIds.size);
  const completedRawStatuses = new Set(["completed", "blocked_by_unfinished", "submitted", "feedback_submitted", "checked_in", "done"]);

  if (completedRawStatuses.has(rawStatus) || (totalCount > 0 && submittedCount >= totalCount)) {
    return {
      key: "completed",
      status: "已完成",
      stateClass: "is-completed",
      icon: "assets/icons/profile-status-homework-done.svg",
      showCta: false,
      submittedCount,
      totalCount,
    };
  }

  if (submittedCount > 0 || plan.hasSubmittedFeedback === true || plan.feedbackSubmitted === true) {
    return {
      key: "in-progress",
      status: "进行中",
      stateClass: "is-progress",
      icon: "assets/icons/profile-status-homework-done.svg",
      showCta: true,
      submittedCount,
      totalCount,
    };
  }

  return {
    key: "pending",
    status: "待反馈",
    stateClass: "is-pending",
    icon: "assets/icons/profile-status-homework.svg",
    showCta: true,
    submittedCount: 0,
    totalCount,
  };
}

function renderProfile(data, rankings, notifications = {}) {
  const pickValue = (...values) => values.find((value) => {
    if (value === undefined || value === null) return false;
    if (typeof value === "string") return value.trim() !== "";
    return true;
  });
  const studentSource = data?.student || activeData?.student || {};
  const directProfileSource = data && !data.profile && !data.plan && !data.rank && !data.curve && !data.studyRoom
    ? data
    : {};
  const rawProfile = { ...directProfileSource, ...(data?.profile || {}) };
  const profile = {
    userId: activeData?.student?.userId || "",
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
    ...rawProfile,
  };
  profile.userId = pickValue(rawProfile.userId, rawProfile.studentId, rawProfile.student_id, rawProfile.id, studentSource.userId, studentSource.studentId, studentSource.student_id, profile.userId, "");
  profile.nickname = pickValue(rawProfile.nickname, rawProfile.name, studentSource.nickname, studentSource.name, profile.nickname, "数学er");
  profile.mathType = pickValue(rawProfile.mathType, rawProfile.examSubject, rawProfile.subject, studentSource.mathType, studentSource.examSubject, profile.mathType, "数学二");
  profile.examSubject = pickValue(rawProfile.examSubject, rawProfile.mathType, rawProfile.subject, studentSource.examSubject, studentSource.mathType, profile.examSubject, "数学二");
  profile.targetScore = pickValue(rawProfile.targetScore, rawProfile.goalScore, rawProfile.target_score, studentSource.targetScore, studentSource.goalScore, studentSource.target_score, profile.targetScore, "-");
  profile.dailyMathGoalHours = pickValue(rawProfile.dailyMathGoalHours, rawProfile.dailyGoalHours, rawProfile.mathGoalHours, rawProfile.dailyStudyHours, studentSource.dailyMathGoalHours, studentSource.dailyGoalHours, profile.dailyMathGoalHours, 3);
  profile.primaryBooks = rawProfile.primaryBooks || rawProfile.mainBooks || rawProfile.selectedBooks || studentSource.primaryBooks || profile.primaryBooks || ["880", "1000"];
  profile.backupBooks = rawProfile.backupBooks || rawProfile.optionalBooks || studentSource.backupBooks || profile.backupBooks || ["660"];
  profile.targetSchool = rawProfile.targetSchool || studentSource.targetSchool || profile.targetSchool || { name: "未选择" };
  profile.qqGroup = pickValue(rawProfile.qqGroup, rawProfile.qq, rawProfile.QQ, rawProfile.qq_group, rawProfile.groupNumber, studentSource.qqGroup, studentSource.qq, studentSource.QQ, profile.qqGroup, "-");
  profile.avatarUrl = pickValue(rawProfile.avatarUrl, rawProfile.avatar, rawProfile.profileAvatar, studentSource.avatarUrl, studentSource.avatar, profile.avatarUrl, "");
  const isExperienceMode = data?.isExperienceMode === true || activeData?.isExperienceMode === true;
  const rankSource = rankings || data?.rank || activeData?.rank || {};
  const hasUnreadNotifications = notifications?.hasUnread === true;
  const summary = rankSource?.summary || {};
  const boards = rankSource?.boards || {};
  const activeLeaderBoardKey = profileLeaderBoardKey === "streak" ? "streak" : "today";
  const rankBoard = boards[activeLeaderBoardKey] || rankSource;
  const continuousDays = Number(summary.continuousDays ?? profile.continuousDays ?? rankSource.myContinuousDays ?? 0);
  const badgeTargets = [7, 14, 21, 30];
  const badgeLabels = {
    7: "新起点",
    14: "稳步前进",
    21: "持之以恒",
    30: "突破自我",
  };
  const badgeIconMap = {
    7: "assets/icons/profile-badge-7.svg",
    14: "assets/icons/profile-badge-14.svg",
    21: "assets/icons/profile-badge-21.svg",
    30: "assets/icons/profile-badge-30.svg",
  };
  const lockedBadgeIcon = "assets/icons/profile-badge-locked.svg";
  const nextTarget = badgeTargets.find((target) => continuousDays < target) || 30;
  const nextProgress = Math.min(continuousDays, nextTarget);
  const nextRate = Math.min(100, Math.round((nextProgress / nextTarget) * 100));
  const nextBadgeName = `${nextTarget} 天勋章`;
  const targetSchool = pickValue(profile.targetSchool?.name, profile.targetSchoolName, profile.schoolName, "未选择");
  const profilePlan = activeData?.plan || data?.plan || {};
  const submittedPlanStatuses = new Set(["今日已完成", "今日未完成", "已提交", "已反馈", "已打卡", "已完成"]);
  const submittedRawStatuses = new Set(["completed", "blocked_by_unfinished", "submitted", "feedback_submitted", "checked_in", "done"]);
  const planHasFeedbackRecords = Array.isArray(profilePlan.feedbacks) && profilePlan.feedbacks.length > 0;
  const planHasSubmittedType = Array.isArray(profilePlan.types) &&
    profilePlan.types.some((type) => type?.feedbackStatus === "submitted");
  const hasSubmittedFeedback =
    submittedPlanStatuses.has(profilePlan.status) ||
    submittedRawStatuses.has(profilePlan.rawStatus) ||
    planHasFeedbackRecords ||
    planHasSubmittedType ||
    profilePlan.hasSubmittedFeedback === true ||
    profilePlan.feedbackSubmitted === true ||
    profilePlan.isCheckedIn === true;
  const submissionStatus = hasSubmittedFeedback ? "已打卡" : "待反馈";
  const submissionStateClass = hasSubmittedFeedback ? "is-submitted" : "is-pending";
  const submissionIcon = hasSubmittedFeedback
    ? "assets/icons/profile-status-homework-done.svg"
    : "assets/icons/profile-status-homework.svg";
  const feedbackCtaHtml = hasSubmittedFeedback
    ? ""
    : `<button class="profile-status-cta" type="button" data-go-plan="true">去完成反馈 <span>›</span></button>`;
  const profileSubmissionState = getProfileSubmissionState(profilePlan);
  const profileSubmissionStatus = profileSubmissionState.status;
  const profileSubmissionStateClass = profileSubmissionState.stateClass;
  const profileSubmissionIcon = profileSubmissionState.icon;
  const profileFeedbackCtaHtml = !profileSubmissionState.showCta
    ? ""
    : `<button class="profile-status-cta" type="button" data-go-plan="true">去完成反馈<span>›</span></button>`;
  const profileStatusCardClass = [
    "profile-card profile-status-card",
    profileSubmissionState.showCta ? "has-status-cta" : "is-status-complete",
  ].join(" ");
  const targetScore = pickValue(profile.targetScore, "-");
  const primaryBooks = (profile.primaryBooks || ["880", "1000"]).filter(Boolean);
  const backupBooks = (profile.backupBooks || ["660"]).filter(Boolean);
  const dailyMathGoalHours = Number(pickValue(profile.dailyMathGoalHours, 3)).toFixed(1).replace(".0", "");
  const qqGroup = pickValue(profile.qqGroup, "-");
  const configIconHtml = (name, extraClass = "") =>
    `<img class="config-icon-img ${extraClass}" src="assets/icons/${name}" alt="" aria-hidden="true" />`;
  const configTitleIconHtml =
    `<img class="profile-config-title-icon-img" src="assets/icons/icon-section-plan.svg" alt="" aria-hidden="true" />`;
  const renderBookPills = (books, tone = "") => books
    .map((book, index) => `<span class="book-pill ${tone || (index ? "blue" : "")}">《${escapeHtml(book)}》</span>`)
    .join("");
  const userId = pickValue(profile.userId, rankSource?.student?.userId, "");
  const profileAvatarFallbacks = [
    "assets/images/avatars/user/B_kaoyan_avatar_01.webp",
    "assets/images/avatars/user/G_kaoyan_avatar_02.webp",
    "assets/images/avatars/user/B_kaoyan_avatar_03.webp",
    "assets/images/avatars/user/G_kaoyan_avatar_04.webp",
    "assets/images/avatars/user/B_kaoyan_avatar_05.webp",
    "assets/images/avatars/user/G_kaoyan_avatar_06.webp",
  ];
  const avatarFallbackBySeed = (seed, defaultAvatar = profileAvatarFallbacks[0]) => {
    const text = String(seed || "");
    if (!text) return defaultAvatar;
    const index = [...text].reduce((sum, char) => sum + char.charCodeAt(0), 0) % profileAvatarFallbacks.length;
    return profileAvatarFallbacks[index] || defaultAvatar;
  };
  const resolveProfileAvatarUrl = (value, fallbackAvatar = profileAvatarFallbacks[0]) => {
    const text = String(value || "").trim();
    if (!text || text.startsWith("/avatars/")) return fallbackAvatar;
    return text;
  };
  const rawAvatarUrl = profile.avatarUrl || profile.avatar || activeData?.student?.avatarUrl || "";
  const avatarUrl = resolveProfileAvatarUrl(rawAvatarUrl, profileAvatarFallbacks[0]);
  const leaderboardFillers = [
    { userId: "rank-filler-111", name: "张同学", avatarUrl: "assets/images/avatars/study-room-fillers/111_ceshi.webp" },
    { userId: "rank-filler-112", name: "王同学", avatarUrl: "assets/images/avatars/study-room-fillers/112_ceshi.webp" },
    { userId: "rank-filler-113", name: "李同学", avatarUrl: "assets/images/avatars/study-room-fillers/113_ceshi.webp" },
    { userId: "rank-filler-114", name: "赵同学", avatarUrl: "assets/images/avatars/study-room-fillers/114_ceshi.webp" },
  ];
  const rankRows = (rankBoard?.rows || rankSource?.rows || []).filter((row) => row && !row.isDivider);
  const currentRankRow =
    rankBoard?.my ||
    rankSource?.my ||
    rankRows.find((row) => row.isMe || (userId && row.userId === userId)) ||
    null;
  const todayStudyHours = Number(profile.todayStudyHours || summary.todayStudyHours || 0);
  const summaryRank = {
    today: summary.todayRank,
    weekly: summary.weeklyRank,
    streak: summary.continuousRank,
  }[activeLeaderBoardKey];
  const myRank = rankBoard?.myRank ?? rankSource?.myRank ?? summaryRank ?? currentRankRow?.rank ?? currentRankRow?.rankInClass;
  const currentRankRowIsMe = currentRankRow?.isMe || (userId && currentRankRow?.userId === userId);
  const leaderboardUser = currentRankRow
    ? {
        ...currentRankRow,
        avatarUrl: currentRankRowIsMe
          ? (currentRankRow.avatarUrl || currentRankRow.avatar || currentRankRow.profileAvatar || avatarUrl)
          : currentRankRow.avatarUrl,
      }
    : {
        userId,
        name: profile.nickname || "我",
        isMe: true,
        avatarUrl,
        todayStudyHours,
        continuousDays,
        rank: myRank,
      };
  const rowKey = (row) => row?.userId || row?.id || row?.avatarUrl || row?.avatar || row?.name || "";
  const seedText = `${activeLeaderBoardKey}-${profile.userId || userId}-${activeData?.plan?.planDate || ""}`;
  const fillerOffset = [...seedText].reduce((sum, char) => sum + char.charCodeAt(0), 0) % leaderboardFillers.length;
  const rotatedFillers = [
    ...leaderboardFillers.slice(fillerOffset),
    ...leaderboardFillers.slice(0, fillerOffset),
  ];
  const isRankingFillerRow = (row) =>
    row?.isFiller === true || String(row?.userId || row?.id || "").startsWith("rank-filler-");
  const uniqueTopRows = [...(rankBoard?.top || rankSource?.top || []), ...rankRows]
    .filter(Boolean)
    .filter((row) => !isRankingFillerRow(row))
    .reduce((rows, row) => {
      const key = rowKey(row);
      if (!key || rows.some((item) => rowKey(item) === key)) return rows;
      return [...rows, row];
    }, [])
    .slice(0, 3);
  const usedLeaderNames = new Set(uniqueTopRows.map((row) => compactStudentName(row?.name)));
  const availableFillers = [
    ...rotatedFillers.filter((filler) => !usedLeaderNames.has(compactStudentName(filler.name))),
    ...rotatedFillers.filter((filler) => usedLeaderNames.has(compactStudentName(filler.name))),
  ];
  const fillerMetric = activeLeaderBoardKey === "streak" ? "打卡8天" : "专注1h";
  const fillerRows = availableFillers.map((filler, index) => ({
    ...filler,
    userId: `${filler.userId}-${activeLeaderBoardKey}`,
    isFiller: true,
    rank: index + 1,
    todayStudyMinutes: 60,
    todayStudyHours: 1,
    continuousDays: 8,
    metric: fillerMetric,
    status: fillerMetric,
  }));
  const hasTodayFocus = (row) => {
    const minutes = Number(row?.todayStudyMinutes || row?.focusMinutes || row?.completedMinutes || 0);
    const hours = Number(row?.todayStudyHours || row?.studyHours || row?.focusHours || row?.completedHours || 0);
    return minutes > 0 || hours > 0;
  };
  const shouldKeepPartialTodayRows =
    activeLeaderBoardKey === "today" && uniqueTopRows.some((row) => hasTodayFocus(row));
  const topRows =
    uniqueTopRows.length >= 3
      ? uniqueTopRows
      : shouldKeepPartialTodayRows
        ? [...uniqueTopRows, ...fillerRows].slice(0, 3)
        : fillerRows.slice(0, 3);

  const countQuestionsInEntry = (entry) => {
    if (!entry || typeof entry !== "object") return 0;
    if (Array.isArray(entry.numbers)) return entry.numbers.length;
    if (Array.isArray(entry.questions)) return entry.questions.length;
    if (Array.isArray(entry.items)) return entry.items.length;
    const explicitCount = [
      entry.questionCount,
      entry.problemCount,
      entry.totalQuestionCount,
      entry.completedQuestions,
      entry.count,
    ].find((value) => Number.isFinite(Number(value)) && Number(value) > 0);
    return explicitCount ? Number(explicitCount) : 0;
  };

  const countQuestionsInGroup = (group) => {
    if (!group || typeof group !== "object") return 0;
    const entries = Array.isArray(group.entries) ? group.entries : [];
    const entryTotal = entries.reduce((sum, entry) => sum + countQuestionsInEntry(entry), 0);
    return entryTotal || countQuestionsInEntry(group);
  };

  const computeTodayQuestionCount = () => {
    const plan = activeData?.plan || data?.plan || {};
    const explicitCount = [
      profile.todayQuestionCount,
      summary.todayQuestionCount,
      plan.todayQuestionCount,
      plan.totalQuestionCount,
      plan.questionCount,
    ].find((value) => Number.isFinite(Number(value)) && Number(value) >= 0);
    if (explicitCount !== undefined) return Number(explicitCount);

    const types = Array.isArray(plan.types) ? plan.types : [];
    const typeTotal = types.reduce((sum, type) => {
      const sourceGroups = Array.isArray(type.sourceGroups) ? type.sourceGroups : [];
      const sourceTotal = sourceGroups.reduce((groupSum, group) => groupSum + countQuestionsInGroup(group), 0);
      return sum + (sourceTotal || countQuestionsInEntry(type));
    }, 0);
    if (typeTotal) return typeTotal;

    const tasks = Array.isArray(plan.tasks) ? plan.tasks : [];
    const taskTotal = tasks.reduce((sum, task) => sum + countQuestionsInEntry(task), 0);
    if (taskTotal) return taskTotal;

    return Array.isArray(plan.feedbackItems) ? plan.feedbackItems.length : 0;
  };

  const formatHours = (value) => {
    const hours = Number(value);
    if (!Number.isFinite(hours) || hours <= 0) return "";
    return hours.toFixed(1).replace(".0", "");
  };

  const todayQuestionCount = computeTodayQuestionCount();
  const profileUserId = pickValue(profile.userId, activeData?.student?.userId, "-");
  const avatarHtml = avatarUrl
    ? `<img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(profile.nickname || "我的头像")}" loading="lazy" />`
    : escapeHtml((profile.nickname || "数").slice(0, 1));

  function compactStudentName(name, fallback = "同学") {
    const text = String(name || fallback).trim();
    if (!text) return fallback;
    if (/^[\u4e00-\u9fa5]同学$/.test(text)) return text;
    const firstVisibleChar = [...text].find((char) => /\S/.test(char)) || "同";
    return `${firstVisibleChar}同学`;
  }

  const formatLeaderMetric = (row, fallbackHours) => {
    const hoursText = formatHours(row?.todayStudyHours ?? row?.studyHours ?? row?.focusHours ?? row?.completedHours ?? fallbackHours);
    if (hoursText) return `专注${hoursText}h`;
    if (row?.metric) return escapeHtml(row.metric);
    if (Number.isFinite(Number(row?.continuousDays))) return `打卡${Number(row.continuousDays)}天`;
    if (Number.isFinite(Number(row?.todayCompletionRate))) return `完成 ${Number(row.todayCompletionRate)}%`;
    return "今日暂无数据";
  };

  const leaderInitial = (row) => escapeHtml(compactStudentName(row?.name).slice(0, 1));
  const leaderName = (row) => escapeHtml(compactStudentName(row?.name));
  const topRankNumber = (row, index) => Number(row?.rank ?? index + 1);
  const leaderCrownSrc = (rankNumber) => ({
    1: "assets/icons/profile-rank-crown-1.svg",
    2: "assets/icons/profile-rank-crown-2.svg",
    3: "assets/icons/profile-rank-crown-3.svg",
  }[rankNumber]);
  const leaderAvatarHtml = (row, extraClass = "") => {
    const rowAvatarUrl = row?.avatarUrl || row?.avatar || row?.profileAvatar || "";
    const rowIsMe = row?.isMe || (userId && row?.userId === userId);
    const fallbackAvatar = rowIsMe ? avatarUrl : avatarFallbackBySeed(row?.userId || row?.id || row?.name);
    const displayAvatarUrl = resolveProfileAvatarUrl(rowAvatarUrl, fallbackAvatar);
    const className = `leader-avatar ${extraClass}`.trim();
    if (displayAvatarUrl) {
      return `<div class="${className}"><img src="${escapeHtml(displayAvatarUrl)}" alt="${leaderName(row)}" loading="lazy" /></div>`;
    }
    return `<div class="${className}">${leaderInitial(row)}</div>`;
  };
  const formatLeaderStatus = (row, fallbackHours) => {
    if (activeLeaderBoardKey === "today") {
      const minuteHours = Number.isFinite(Number(row?.todayStudyMinutes)) ? Number(row.todayStudyMinutes) / 60 : undefined;
      const hoursText = formatHours(row?.todayStudyHours ?? row?.studyHours ?? row?.focusHours ?? row?.completedHours ?? minuteHours ?? fallbackHours);
      if (hoursText) return `专注${hoursText}h`;
      if (row?.metric) return escapeHtml(String(row.metric).replace(/\s+/g, ""));
      return "专注0h";
    }
    if (activeLeaderBoardKey === "streak") {
      const days = Number(row?.continuousDays ?? row?.streakDays ?? row?.studyDays);
      if (Number.isFinite(days) && days > 0) return `打卡${days}天`;
      if (row?.metric) return escapeHtml(String(row.metric).replace(/^连续\s*/, "打卡").replace(/\s+/g, ""));
      return "打卡0天";
    }
    return formatLeaderMetric(row, fallbackHours);
  };

  const badgeStagesHtml = badgeTargets.map((target) => {
    const isEarned = continuousDays >= target;
    const isCurrent = !isEarned && target === nextTarget;
    const icon = isEarned ? badgeIconMap[target] : lockedBadgeIcon;
    return `
      <div class="badge-stage ${isEarned ? "is-earned" : isCurrent ? "is-current" : "is-locked"}">
        <div class="badge-stage-days">${target} 天</div>
        <img class="badge-stage-icon" src="${icon}" alt="${target} 天勋章" loading="lazy" />
        <div class="badge-stage-label">${badgeLabels[target]}</div>
      </div>
    `;
  }).join("");

  const leaderboardHtml = topRows.map((row, index) => {
    const rankNumber = topRankNumber(row, index);
    const crownSrc = leaderCrownSrc(rankNumber);
    return `
      <div class="leader-podium-item rank-${rankNumber}">
        <div class="leader-crown">${crownSrc ? `<img src="${crownSrc}" alt="第 ${rankNumber} 名" />` : rankNumber}</div>
        ${leaderAvatarHtml(row)}
        <div class="leader-name">${leaderName(row)}</div>
        <div class="leader-metric">${formatLeaderStatus(row)}</div>
      </div>
    `;
  }).join("");

  document.querySelector("#myView").innerHTML = `
    <div class="my-page mobile-shell" data-figma-page="70:297">
      <section class="profile-page-head" aria-label="我的页面头部">
        <div>
          <h1 class="profile-page-title">我的</h1>
          <p class="profile-page-subtitle">每一步努力，都在靠近上岸</p>
          <span class="profile-page-accent" aria-hidden="true"></span>
        </div>
        <button class="profile-notify-button ${hasUnreadNotifications ? "has-unread" : ""}" type="button" aria-label="消息提醒" data-open-notifications>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 8.6a6 6 0 0 0-12 0c0 7-3 7.4-3 9.4h18c0-2-3-2.4-3-9.4Z"></path>
            <path d="M10 20a2 2 0 0 0 4 0"></path>
          </svg>
          ${hasUnreadNotifications ? `<span class="profile-notify-dot" aria-hidden="true"></span>` : ""}
        </button>
      </section>

      <section class="profile-hero profile-identity-card" data-figma-section="Section123456">
        <img class="profile-school-art" src="assets/images/profile-school-building.png" alt="" aria-hidden="true" />
        <div class="profile-identity-content">
          <div class="profile-identity-avatar">${avatarHtml}</div>
          <div class="profile-identity-info">
            <div class="profile-identity-title">${isExperienceMode ? "你好，体验号预览" : `你好， ${escapeHtml(profile.nickname || "数学er")}`}</div>
            <div class="profile-identity-meta">${escapeHtml(profile.mathType || "数学二")}备考中 · 目标 <span>${escapeHtml(targetScore)} 分</span></div>
            <div class="profile-identity-foot">
              <span class="profile-supervisor-pill">督学中</span>
              <span class="profile-id-text">ID: ${escapeHtml(profileUserId || "-")}</span>
            </div>
          </div>
        </div>
      </section>

      <section class="${profileStatusCardClass}" data-figma-section="Section12345">
        <div class="profile-card-head">
          <div class="profile-card-title">
            <img class="profile-status-title-icon" src="assets/icons/profile-status-pie.svg" alt="" aria-hidden="true" />
            <strong>今日状态</strong>
          </div>
        </div>
        <div class="profile-status-metrics">
          <article class="profile-status-metric-card is-feedback ${profileSubmissionStateClass}">
            <div class="profile-status-label">
              <img src="${profileSubmissionIcon}" alt="" aria-hidden="true" />
              <span>提交状态</span>
            </div>
            <strong>${profileSubmissionStatus}</strong>
          </article>
          <article class="profile-status-metric-card">
            <div class="profile-status-label">
              <img src="assets/icons/growth-stage-target.svg" alt="" aria-hidden="true" />
              <span>今日目标</span>
            </div>
            <strong>${todayQuestionCount}<span>道</span></strong>
          </article>
          <article class="profile-status-metric-card">
            <div class="profile-status-label">
              <img src="assets/icons/profile-status-calendar-note.svg" alt="" aria-hidden="true" />
              <span>已学</span>
            </div>
            <strong>${formatHours(todayStudyHours) || "0"}<span>h</span></strong>
          </article>
        </div>
        ${profileFeedbackCtaHtml}
      </section>

      <section class="profile-card profile-badge-progress" data-figma-section="70:90">
        <div class="profile-card-head">
          <div class="profile-card-title profile-badge-title">
            <img class="profile-badge-title-icon" src="assets/icons/profile-badge-title-trophy.svg" alt="" aria-hidden="true" />
            <strong>勋章进度</strong>
          </div>
          <div class="profile-progress-summary">已坚持 <strong>${nextProgress}</strong> / ${nextTarget} 天</div>
        </div>
        <div class="badge-progress-layout">
          <div class="badge-stage-track">
            ${badgeStagesHtml}
          </div>
          <div class="badge-next-card">
            <span>下一枚勋章</span>
            <strong>${escapeHtml(nextBadgeName)}</strong>
            <div class="profile-progress-track"><div class="profile-progress-fill" style="width:${nextRate}%"></div></div>
          </div>
        </div>
      </section>

      <section class="profile-card profile-leaderboard" data-figma-section="70:148">
        <div class="profile-card-head">
          <div class="profile-card-title profile-leaderboard-title">
            <img src="assets/icons/profile-leaderboard-title.svg" alt="" aria-hidden="true" />
            <strong>排行榜</strong>
          </div>
          <div class="leader-tabs">
            <button class="leader-tab ${activeLeaderBoardKey === "today" ? "active" : ""}" type="button" data-profile-leader-board="today" aria-pressed="${activeLeaderBoardKey === "today"}">今日</button>
            <button class="leader-tab ${activeLeaderBoardKey === "streak" ? "active" : ""}" type="button" data-profile-leader-board="streak" aria-pressed="${activeLeaderBoardKey === "streak"}">连续</button>
          </div>
        </div>
        <div class="leaderboard-layout">
          <div class="leader-podium">
            ${leaderboardHtml || `<div class="leader-empty">暂无榜单数据</div>`}
          </div>
          <div class="leader-me-card">
            <div class="leader-me-rank">${myRank || "-"}</div>
            ${leaderAvatarHtml(leaderboardUser, "is-me")}
            <div class="leader-name">我</div>
            <div class="leader-metric">${formatLeaderStatus(leaderboardUser, todayStudyHours)}</div>
            <strong>${myRank ? `第 ${myRank} 名` : "未上榜"}</strong>
          </div>
        </div>
      </section>

      <section class="profile-card profile-config-card" data-figma-section="70:207">
        <div class="profile-config-head">
          ${configTitleIconHtml}
          <h2>我的备考配置</h2>
        </div>
        <div class="profile-config-list">
          <div class="config-row">
            ${configIconHtml("profile-config-workbook.svg")}
            <div class="config-label">考试科目</div>
            <div class="config-value">${escapeHtml(profile.examSubject || "数学二")}</div>
            <div class="config-chevron">›</div>
          </div>
          <div class="config-row">
            ${configIconHtml("growth-stage-target.svg")}
            <div class="config-label">目标分数</div>
            <div class="config-value config-value-accent config-value-green">${escapeHtml(targetScore)} 分</div>
            <div class="config-chevron">›</div>
          </div>
          <div class="config-row config-row-stacked">
            ${configIconHtml("profile-config-workbook.svg")}
            <div class="config-label">主选习题册</div>
            <div class="config-pill-group is-stacked">${renderBookPills(primaryBooks)}</div>
            <div class="config-chevron">›</div>
          </div>
          <div class="config-row">
            ${configIconHtml("profile-config-workbook.svg")}
            <div class="config-label">备选习题册</div>
            <div class="config-pill-group">${renderBookPills(backupBooks, "orange")}</div>
            <div class="config-chevron">›</div>
          </div>
          <div class="config-row">
            ${configIconHtml("profile-config-school.svg")}
            <div class="config-label">目标院校</div>
            <div class="config-value"><button class="school-value config-value-orange" type="button" data-open-school-search>${escapeHtml(targetSchool)}</button></div>
            <div class="config-chevron">›</div>
          </div>
          <div class="config-row">
            ${configIconHtml("profile-config-daily-goal.svg")}
            <div class="config-label">每日数学学习目标</div>
            <div class="config-value config-value-accent config-value-green">${dailyMathGoalHours} 小时</div>
            <div class="config-chevron">›</div>
          </div>
          <div class="config-row">
            ${configIconHtml("profile-config-companion.svg")}
            <div class="config-label">所在QQ群</div>
            <div class="config-value">${escapeHtml(qqGroup)}</div>
            <div class="config-chevron">›</div>
          </div>
          <div class="config-row config-row-channel">
            ${configIconHtml("profile-config-wechat.svg")}
            <div class="config-label">公众号</div>
            <div class="config-value">上岸笔记本的满分课堂</div>
            <div class="config-chevron">›</div>
          </div>
          <div class="config-row config-row-channel">
            ${configIconHtml("profile-config-bilibili.svg")}
            <div class="config-label">B站</div>
            <div class="config-value">上岸笔记本的满分课堂</div>
            <div class="config-chevron">›</div>
          </div>
          <button class="config-row question-preview-entry" type="button" data-question-preview-open>
            ${configIconHtml("profile-config-workbook.svg")}
            <div class="config-label">预览全部题型题目</div>
            <div class="config-value" aria-hidden="true"></div>
            <div class="config-chevron">›</div>
          </button>
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

function renderFocusSessionPage(room) {
  const session = activeFocusSession || {};
  const targetMinutes = Math.max(10, Math.min(180, Number(session.targetMinutes || room.focusMinutes || 45)));
  const targetSeconds = targetMinutes * 60;
  const state = session.viewState || "running";
  const result = session.result || {};
  const countedMinutes = Math.max(0, Number(result.countedMinutes || 0));
  const awayMinutes = Math.max(1, Math.round(Number(session.pendingAwaySeconds || 0) / 60));

  if (state === "away-confirm") {
    return `
      <section class="focus-session-page focus-session-page-minimal focus-session-away" id="focusSessionPage" data-focus-progress style="--focus-progress:${session.lastProgress || 0}%">
        <div class="focus-session-inner">
          <div class="focus-status-pill">离开确认</div>
          <div class="focus-away-panel">
            <div class="focus-away-kicker">刚才离开了 ${awayMinutes} 分钟</div>
            <h1>是否计入本轮专注？</h1>
            <p>锁屏学习可以计入；如果刚才去了其他应用，可以扣除离开时间。</p>
            <div class="focus-away-actions">
              <button class="focus-away-primary" type="button" data-focus-away-count>计入本轮</button>
              <button class="focus-away-secondary" type="button" data-focus-away-deduct>扣除离开时间</button>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  if (state === "result") {
    const completed = result.reason === "natural" || result.reason === "away-complete";
    const returnSeconds = Math.max(1, Number(session.resultReturnSeconds || 5));
    const note = result.reason === "away-complete"
      ? "离开时间已确认计入，本轮只记录到目标时长，超出部分不计入。"
      : completed
        ? "完成得很好，今日专注时长已更新。"
        : "今日学习时长已更新。";
    return `
      <section class="focus-session-page focus-session-page-minimal focus-session-result" id="focusSessionPage" data-focus-progress style="--focus-progress:100%">
        <div class="focus-session-inner">
          <div class="focus-status-pill">${completed ? "已完成" : "已记录"}</div>
          <div class="focus-result-panel">
            <div class="focus-result-icon" aria-hidden="true">✓</div>
            <h1>${completed ? "本轮专注完成" : "本次专注已记录"}</h1>
            <div class="focus-result-minutes">已计入 ${countedMinutes} 分钟</div>
            <p>${note}</p>
          </div>
          <div class="focus-result-footer">
            <div><span data-focus-return-count>${returnSeconds}</span> 秒后自动返回自习室</div>
            <button class="focus-return-button" type="button" data-focus-return>返回自习室</button>
          </div>
        </div>
      </section>
    `;
  }

  return `
    <section class="focus-session-page focus-session-page-minimal" id="focusSessionPage" data-focus-progress style="--focus-progress:0%">
      <div class="focus-session-inner">
        <div class="focus-status-pill">专注中</div>
        <div class="focus-main-timer">
          <div class="focus-hint">稳住这一轮，离上岸近一点</div>
          <div class="focus-countdown" data-focus-countdown>${formatClock(targetSeconds)}</div>
          <div class="focus-session-progress" data-focus-progress style="--focus-progress:0%"><i></i></div>
          <div class="focus-timer-meta">
            <span>已完成 <strong data-focus-percent>0%</strong></span>
            <span>${targetMinutes} 分钟</span>
          </div>
        </div>
        <div class="focus-session-actions">
          <button class="focus-round-btn" type="button" data-focus-pause aria-label="暂停">
            <span data-focus-pause-icon>Ⅱ</span>
          </button>
          <div class="focus-round-label" data-focus-pause-label>暂停</div>
          <button class="focus-exit-main" type="button" data-focus-finish>退出专注</button>
        </div>
      </div>
    </section>
  `;
}

function renderStudyRoom(data) {
  const room = studyRoomModel(data);
  const fallbackAvatar = "assets/icons/study-peer-placeholder.svg";
  const peerAvatarSrc = (value) => {
    const avatar = String(value || "").trim();
    if (!avatar) return fallbackAvatar;
    if (/^(https?:)?\/\//.test(avatar) || avatar.startsWith("/") || avatar.startsWith("assets/")) return avatar;
    return `assets/images/${avatar}`;
  };
  const peerDisplayName = (name) => {
    const value = String(name || "").trim();
    if (!value) return "同学";
    return value.endsWith("同学") && value.length <= 3 ? value : `${value[0]}同学`;
  };
  const peerFocusText = (member) => (
    member.focusStatus === "completed_today" || member.status === "completed_today"
      ? "已专注"
      : "正在专注"
  );
  const durationOptions = [45, 60];
  const customDurationOptions = [60, 90, 120, 180];
  const formatHourDuration = (minutes) => `${(minutes / 60).toFixed(1)}h`;
  const customDuration = durationOptions.includes(room.focusMinutes)
    ? 60
    : (customDurationOptions.includes(room.focusMinutes) ? room.focusMinutes : 60);
  const activeDuration = durationOptions.includes(room.focusMinutes) ? room.focusMinutes : "custom";
  const targetHours = Math.round(room.targetMinutes / 30) / 2;
  const goalProgress = Math.max(0, Math.min(100, Number(room.completionRate) || 0));
  const goalProgressClass = goalProgress > 0 ? "has-goal-progress" : "is-goal-empty";
  const displayClassMemberCount = Math.max(4, Number(room.classMemberCount) || 0);
  const livePeerCompanions = (room.members || []).map((member) => ({
    name: peerDisplayName(member.name),
    avatar: peerAvatarSrc(member.avatarUrl),
    focusText: peerFocusText(member),
  }));
  const fillerPeerCompanions = [
    { name: "张同学", avatar: "assets/images/avatars/study-room-fillers/111_ceshi.webp", focusText: "正在专注" },
    { name: "王同学", avatar: "assets/images/avatars/study-room-fillers/112_ceshi.webp", focusText: "已专注" },
    { name: "李同学", avatar: "assets/images/avatars/study-room-fillers/113_ceshi.webp", focusText: "正在专注" },
    { name: "赵同学", avatar: "assets/images/avatars/study-room-fillers/114_ceshi.webp", focusText: "已专注" },
  ];
  const peerCompanions = [
    ...livePeerCompanions,
    ...fillerPeerCompanions,
  ].slice(0, 4);

  activeStudyRoom = { studyRoom: room };
  document.querySelector("#studyRoomView").innerHTML = `
    <div class="study-room">
      <div class="study-room-shell" id="studyRoomShell">
        <section class="study-hero" aria-label="考研自习室插画">
          <div class="study-hero-slider" aria-label="左右滑动切换白天和夜晚自习室">
            <img class="study-hero-slide" src="assets/images/study-room-hero-day.jpg" alt="白天自习室插画" />
            <img class="study-hero-slide" src="assets/images/study-room-hero-night.jpg" alt="夜晚自习室插画" />
          </div>
          <div class="study-hero-scrim"></div>
          <div class="study-hero-copy">
            <div class="study-hero-title-pill" aria-label="考研自习室，全班 ${displayClassMemberCount} 人">
              <h1>考研自习室</h1>
              <div class="study-hero-online">
                <span class="study-hero-online-icon" aria-hidden="true"></span>
                <span>全班 ${displayClassMemberCount} 人</span>
              </div>
            </div>
          </div>
          <div class="study-hero-dots" aria-hidden="true"><span></span><span></span></div>
        </section>

        <section class="study-focus-card focus-visual-card">
          <div class="focus-card-copy">
            <div class="focus-label">本轮专注时长</div>
            <div class="focus-time" data-focus-minutes>${String(room.focusMinutes).padStart(2, "0")}:00</div>
            <div class="focus-duration-options focus-time-options ${activeDuration === "custom" ? "is-custom" : ""}">
              <div class="duration-grid">
                ${durationOptions.map((minutes) => `
                  <button class="duration-option ${activeDuration === minutes ? "active" : ""}" type="button" data-duration="${minutes}">${minutes}分钟</button>
                `).join("")}
                <button class="duration-option duration-option-custom ${activeDuration === "custom" ? "active" : ""}" type="button" data-duration="custom" data-custom-minutes="${customDuration}">${formatHourDuration(customDuration)}</button>
              </div>
              <div class="custom-duration-sheet" id="customDurationSheet" hidden>
                <button class="custom-duration-backdrop" type="button" data-close-custom-duration aria-label="关闭自定义时长选择"></button>
                <div class="custom-duration-panel" role="dialog" aria-modal="true" aria-label="选择专注时长">
                  <div class="custom-duration-title">选择专注时长</div>
                  <div class="custom-duration-list">
                    ${customDurationOptions.map((minutes) => `
                      <button class="custom-duration-choice ${customDuration === minutes ? "active" : ""}" type="button" data-custom-duration="${minutes}">
                        ${formatHourDuration(minutes)}
                      </button>
                    `).join("")}
                  </div>
                </div>
              </div>
            </div>
            <div class="focus-actions">
              <button class="focus-start" type="button"><span class="focus-play-icon">▶</span>开始专注</button>
            </div>
          </div>
          <div class="focus-card-visual" aria-hidden="true">
            <img class="focus-card-art" src="assets/images/study-focus-card-art.jpg" alt="" />
          </div>
        </section>

        <section class="study-goal-card goal-card11 ${goalProgressClass}" style="--goal-progress:${goalProgress}">
          <div class="goal-title-row">
            <img class="goal-title-icon" src="assets/icons/growth-stage-target.svg" alt="" />
            <h2>今日目标</h2>
          </div>
          <div class="goal-card-content">
            <div class="goal-arc-panel" aria-hidden="true">
              <svg class="goal-ring" viewBox="0 0 150 122">
                <path class="goal-ring-track" pathLength="100" d="M22 105a55 55 0 1 1 94-45"/>
                <path class="goal-ring-progress" pathLength="100" d="M22 105a55 55 0 1 1 94-45"/>
              </svg>
              <img class="goal-star-img" src="assets/icons/study-goal-star.svg" alt="" />
            </div>
            <div class="goal-card-main">
              <div class="goal-target-line"><strong>${targetHours.toFixed(1)}</strong><span>小时</span></div>
              <div class="goal-complete-line">已完成 <strong>${room.completedHours.toFixed(1)}</strong> 小时</div>
              <div class="goal-card-progress"><i></i></div>
              <p>继续加油，完成目标就离上岸更近一步！</p>
            </div>
            <div class="goal-card-art" aria-hidden="true">
              <img class="goal-target-art" src="assets/images/study-goal-target-art.png" alt="" />
            </div>
          </div>
        </section>

        <section class="study-peer-card peer-companion-card">
          <div class="peer-head">
            <div class="peer-title">
              <img class="peer-title-icon" src="assets/icons/study-peer-team.svg" alt="" />
              <div class="study-card-title">同行陪伴</div>
            </div>
            <div class="peer-count">全班 ${displayClassMemberCount} 人</div>
          </div>
          <div class="peer-companion-list">
            ${peerCompanions.map((member) => `
              <article class="peer-companion-item">
                <img class="peer-avatar" src="${escapeHtml(member.avatar)}" alt="" />
                <div class="peer-name">${escapeHtml(member.name)}</div>
                <div class="peer-focus-text">${escapeHtml(member.focusText)}</div>
              </article>
            `).join("")}
          </div>
          <div class="peer-encourage-row">
            <img class="peer-sprout-icon" src="assets/icons/growth-legend-sprout.svg" alt="" />
            <span>你不是一个人在战斗，研友与你同行</span>
            <img class="peer-muscle-icon" src="assets/icons/study-peer-muscle.svg" alt="" />
          </div>
        </section>
      </div>
      ${renderFocusSessionPage(room)}
    </div>
  `;
}

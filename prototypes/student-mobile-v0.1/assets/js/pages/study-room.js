function renderFocusSessionPage(room) {
        const targetMinutes = activeFocusSession?.targetMinutes || room.focusMinutes;
        const taskName = displayTaskName(activeFocusSession?.taskName || room.currentTaskName);
        return `
          <section class="focus-session-page" id="focusSessionPage" data-focus-progress style="--focus-progress:0%">
            <div class="focus-session-inner">
              <div class="focus-session-top">
                <div class="focus-session-room">
                  <h1>${escapeHtml(room.roomName)}</h1>
                  <div class="focus-session-meta">安静模式</div>
                </div>
                <div class="focus-session-online">${room.onlineCount} 人在线</div>
              </div>
              <div class="focus-dial-wrap">
                <div class="focus-dial" data-focus-progress style="--focus-progress:0%">
                  <div class="focus-dial-core">
                    <div>
                      <div class="focus-task-name">本轮任务 ｜ ${escapeHtml(taskName)}</div>
                      <div class="focus-countdown" data-focus-countdown>${formatClock(targetMinutes * 60)}</div>
                      <div class="focus-current-time">当前时间 <strong data-focus-now>--:--</strong></div>
                    </div>
                  </div>
                </div>
                <div class="focus-session-goal">
                  <div>本轮专注目标 <strong>${targetMinutes}</strong> 分钟</div>
                  <div>已完成 <strong data-focus-percent>0%</strong></div>
                  <div class="focus-session-progress" data-focus-progress style="--focus-progress:0%"><i></i></div>
                  <div class="focus-session-note">现在只做这一件事，其他都先放下。</div>
                </div>
              </div>
              <div class="focus-session-actions">
                <div>
                  <button class="focus-round-btn" type="button" data-focus-pause>Ⅱ</button>
                  <div class="focus-round-label" data-focus-pause-label>暂停</div>
                </div>
                <button class="focus-exit-main" type="button" data-focus-finish>退出专注</button>
                <div>
                  <button class="focus-round-btn" type="button">∿</button>
                  <div class="focus-round-label">白噪音</div>
                </div>
              </div>
            </div>
          </section>
        `;
      }



function renderStudyRoom(data) {
        const room = studyRoomModel(data);
        const avatars = [
          "study-room-avatar-1.png",
          "study-room-avatar-2.png",
          "study-room-avatar-3.png",
          "study-room-avatar-4.png",
          "study-room-avatar-5.png",
        ];
        const durationOptions = [30, 45, 60];
        const customDuration = durationOptions.includes(room.focusMinutes) ? 45 : room.focusMinutes;
        const activeDuration = durationOptions.includes(room.focusMinutes) ? room.focusMinutes : "custom";
        const targetHours = Math.round(room.targetMinutes / 30) / 2;
        const taskDisabled = room.taskOptions.length <= 1;
        const currentTaskIndex = Math.max(0, room.taskOptions.findIndex((task) => task.typeId === room.currentTaskTypeId));
        const currentTask = room.taskOptions[currentTaskIndex] || room.taskOptions[0] || {
          typeId: "",
          typeName: room.currentTaskName,
        };
        const members = room.members.slice(0, 5);
        activeStudyRoom = { studyRoom: room };
        document.querySelector("#studyRoomView").innerHTML = `
          <div class="study-room">
          <div class="study-room-shell" id="studyRoomShell">
            <section class="study-hero">
              <img class="study-hero-art" src="assets/images/study-room-hero-art.png" alt="自习室学习插画" />
              <div class="study-hero-copy">
                <h1>考研自习室</h1>
                <p class="study-hero-subtitle">专注当下，未来可期</p>
                <div class="study-room-name"><svg class="study-home-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 10.7 12 3l9 7.7v9.1a1.2 1.2 0 0 1-1.2 1.2h-5.1v-6.2H9.3V21H4.2A1.2 1.2 0 0 1 3 19.8v-9.1z"/></svg>${escapeHtml(room.roomName)}</div>
                <div class="study-online">在线 <strong>${room.onlineCount}</strong> 人</div>
                <div class="quiet-pill">安静模式</div>
              </div>
            </section>
            <section class="study-focus-card">
              <div class="focus-label">本轮专注时长</div>
              <div class="focus-time" data-focus-minutes>${String(room.focusMinutes).padStart(2, "0")}:00</div>
              <div class="focus-duration-options">
                <div class="duration-grid">
                  ${durationOptions.map((minutes) => `
                    <button class="duration-option ${activeDuration === minutes ? "active" : ""}" type="button" data-duration="${minutes}">${minutes}分钟</button>
                  `).join("")}
                  <button class="duration-option ${activeDuration === "custom" ? "active" : ""}" type="button" data-duration="custom">自定义</button>
                </div>
                <input class="custom-duration-input" id="customDurationInput" type="number" min="10" max="180" step="5" value="${customDuration}" aria-label="自定义专注分钟" />
              </div>
              <div class="task-label">当前任务</div>
              <div class="current-task"><span class="task-book"><img src="assets/icons/icon-book.svg" alt="" /></span><span data-current-task-name>${escapeHtml(currentTask.typeName)}</span></div>
              <div class="task-picker">
                <div class="task-card-pager" data-task-index="${currentTaskIndex}">
                  <button class="task-arrow" type="button" data-task-prev ${taskDisabled ? "disabled" : ""}>‹</button>
                  <div class="task-card-current" data-task-card data-task-type="${escapeHtml(currentTask.typeId)}" data-task-name="${escapeHtml(currentTask.typeName)}">${escapeHtml(currentTask.typeName)}</div>
                  <button class="task-arrow" type="button" data-task-next ${taskDisabled ? "disabled" : ""}>›</button>
                  <div class="task-card-dots">
                    ${room.taskOptions.map((task, index) => `<i class="${index === currentTaskIndex ? "active" : ""}"></i>`).join("")}
                  </div>
                </div>
              </div>
              <div class="focus-actions">
                <button class="focus-start" type="button">▶ 开始专注</button>
              </div>
            </section>
            <section class="study-goal-card">
              <div class="study-card-title">今日数学学习目标</div>
              <div class="goal-stats">
                <div class="goal-stat"><div class="goal-stat-label">目标时长</div><div class="goal-stat-value">${targetHours.toFixed(1)}<span>小时</span></div></div>
                <div class="goal-stat"><div class="goal-stat-label">已完成</div><div class="goal-stat-value">${room.completedHours.toFixed(1)}<span>小时</span></div></div>
              </div>
              <div class="goal-progress-row"><div class="study-progress-track"><div class="study-progress-fill" style="width:${room.completionRate}%"></div></div><div class="progress-percent">${room.completionRate}%</div></div>
            </section>
            <section class="study-peer-card">
              <div class="peer-head"><div class="study-card-title">同桌陪伴</div></div>
              <div class="peer-list">
                ${members.map((member, index) => `
                  <div class="peer"><img src="assets/images/${avatars[index % avatars.length]}" alt="" /><div class="peer-status">${escapeHtml(member.task)}</div><div class="peer-time">已专注 ${member.focusedMinutes} 分钟</div></div>
                `).join("")}
              </div>
            </section>
            <section class="study-rule-card">
              <svg class="rule-shield" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.5 4 5.8v5.8c0 5 3.3 8.2 8 9.9 4.7-1.7 8-4.9 8-9.9V5.8l-8-3.3z"/><path d="m10.4 13.3 4.7-4.7 1.3 1.3-6 6-3-3 1.3-1.3 1.7 1.7z" fill="#fff"/></svg>
              <h2>房间规则</h2>
              <p>${escapeHtml(room.rule)}</p>
              <img class="rule-art" src="assets/images/study-room-rule-art.png" alt="" />
            </section>
          </div>
          ${renderFocusSessionPage(room)}
          </div>
        `;
      }



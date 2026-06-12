function renderRank(rankings) {
        if (!rankings?.boards) return;
        activeRankings = rankings;
        const boardMeta = {
          today: { label: "今日打卡榜", subtitle: "按打卡速度排序，数字表示第几个打卡", rank: rankings.summary.todayRank, metricTitle: "打卡顺序" },
          weekly: { label: "本周完成榜", subtitle: "按本周坚持天数排序，最多 7 天", rank: rankings.summary.weeklyRank, metricTitle: "本周坚持" },
          streak: { label: "连续坚持榜", subtitle: "按连续学习天数排序", rank: rankings.summary.continuousRank, metricTitle: "坚持天数" },
        };
        const board = rankings.boards[activeRankBoard] || rankings.boards.today;
        const meta = boardMeta[activeRankBoard] || boardMeta.today;
        const top = board.top || [];
        const podium = [top[1], top[0], top[2]].filter(Boolean);
        const myRankText = meta.rank ? `第 ${meta.rank} 名` : "未上榜";
        const continuousDays = Number(rankings.summary.continuousDays || 0);
        const badgeTargets = [7, 14, 21, 30];
        const nextTarget = badgeTargets.find((target) => continuousDays < target) || 30;
        const nextProgress = Math.min(continuousDays, nextTarget);
        const nextRate = Math.min(100, Math.round((nextProgress / nextTarget) * 100));
        const remainingDays = Math.max(0, nextTarget - continuousDays);
        const nextBadgeName = rankings.summary.nextBadgeTarget || `${nextTarget}天连续学习勋章`;
        const medalClass = { 7: "teal", 14: "silver", 21: "gray", 30: "bronze" };
        const medalsHtml = badgeTargets.map((target) => {
          const isEarned = continuousDays >= target;
          const isCurrent = !isEarned && target === nextTarget;
          const medalProgress = isEarned ? target : Math.min(continuousDays, target);
          const medalRate = Math.min(100, Math.round((medalProgress / target) * 100));
          return `
            <div class="medal-item ${isEarned ? "earned" : isCurrent ? "current" : "locked"}">
              <div class="medal ${medalClass[target]} ${isEarned || isCurrent ? "" : "locked"}">
                ${target}
                ${isEarned ? `<span class="medal-status">已获得</span>` : isCurrent ? `<span class="medal-status">进行中</span>` : `<span class="medal-lock">锁</span>`}
              </div>
              <div class="medal-title">${target}天连续学习</div>
              ${isCurrent ? `<div class="badge-progress"><div class="progress-track"><div class="progress-fill" style="width:${medalRate}%"></div></div><span>${medalProgress}/${target}</span></div>` : ""}
            </div>
          `;
        }).join("");

        const rowsHtml = (board.rows || []).map((row) => {
          if (row.isDivider) {
            return `<div class="rank-divider-row">...</div>`;
          }
          return `
            <div class="rank-table-row ${row.isMe ? "me" : ""}">
              <div>${row.rank}</div>
              <div class="rank-name"><span class="mini-avatar">${row.isMe ? "我" : "同"}</span>${escapeHtml(row.isMe ? "我" : row.name)}</div>
              <div><span class="rank-metric">${escapeHtml(row.metric)}</span>${row.todayCheckinAt ? `<div class="rank-time">${escapeHtml(row.todayCheckinAt)}</div>` : ""}</div>
              <div class="status-ok">${escapeHtml(row.status)}</div>
            </div>
          `;
        }).join("");

        document.querySelector("#rankView").innerHTML = `
          <section class="rank-hero">
            <button class="rule-btn" type="button">规则说明</button>
            <div class="rank-hero-text">
              <h1>坚持排行榜</h1>
              <p class="rank-hero-subtitle">${escapeHtml(rankings.student.className)} · ${escapeHtml(rankings.student.name)}</p>
              <div class="rank-stat-card">
                <div class="rank-stat">
                  <div class="rank-stat-label">我的排名</div>
                  <div class="rank-stat-value"><span>${escapeHtml(myRankText.replace(/\d+.*/, ""))}</span><strong>${meta.rank || "-"}</strong><span>${meta.rank ? "名" : ""}</span></div>
                </div>
                <div class="rank-stat">
                  <div class="rank-stat-label">连续学习</div>
                  <div class="rank-stat-value"><strong>${rankings.summary.continuousDays}</strong><span>天</span></div>
                </div>
              </div>
            </div>
            <div class="rank-tip"><img src="assets/icons/icon-section-plan.svg" alt="" />再坚持 <strong>${remainingDays}</strong> 天，解锁 ${escapeHtml(nextBadgeName)}</div>
            <img class="rank-hero-img" src="assets/images/banner-student-study.placeholder.png" alt="学生学习插画" />
          </section>

          <section class="rank-card">
            <div class="rank-card-head">
              <h2>我的勋章墙</h2>
              <div class="rank-card-more">全部勋章 〉</div>
            </div>
            <div class="badge-wall">
              ${medalsHtml}
            </div>
            <div class="badge-wall-note">当前连续学习 ${continuousDays} 天，下一枚目标是 ${escapeHtml(nextBadgeName)}。</div>
          </section>

          <section class="rank-card">
            <div class="leader-tabs">
              <button class="leader-tab ${activeRankBoard === "today" ? "active" : ""}" type="button" data-rank-board="today">今日打卡榜</button>
              <button class="leader-tab ${activeRankBoard === "weekly" ? "active" : ""}" type="button" data-rank-board="weekly">本周完成榜</button>
              <button class="leader-tab ${activeRankBoard === "streak" ? "active" : ""}" type="button" data-rank-board="streak">连续坚持榜</button>
            </div>
            <div class="rank-board-title">
              <h2>${escapeHtml(meta.label)}</h2>
              <p>${escapeHtml(meta.subtitle)}</p>
            </div>
            <div class="podium">
              ${podium.map((row, index) => `
                <div class="podium-item ${index === 1 ? "first" : index === 0 ? "second" : "third"}">
                  <div class="avatar">${index === 1 ? "我" : "同"}</div>
                  <div>${escapeHtml(row.isMe ? "我" : row.name)}</div>
                  <div class="podium-days">${escapeHtml(row.metric)}</div>
                </div>
              `).join("")}
            </div>
            <div class="ranking-table">
              <div class="rank-table-row header"><div>排名</div><div>昵称</div><div>${escapeHtml(meta.metricTitle)}</div><div>状态</div></div>
              ${rowsHtml || `<div class="feedback-message">当前暂无榜单数据</div>`}
            </div>
          </section>

          <section class="rank-card next-goal">
            <h2>下一枚勋章目标</h2>
            <div class="goal-content">
              <div class="goal-medal">
                <div class="medal ${medalClass[nextTarget]}">${nextTarget}</div>
                <div>${escapeHtml(nextBadgeName)}</div>
              </div>
              <div>
                <div class="goal-copy">再坚持 <strong>${remainingDays}</strong> 天即可解锁</div>
                <div class="goal-progress"><div class="progress-track"><div class="progress-fill" style="width:${nextRate}%"></div></div><span>${nextProgress}/${nextTarget}</span></div>
                <button class="continue-btn" type="button" data-go-plan="true">继续今日学习 〉</button>
              </div>
              <div class="goal-calendar" aria-hidden="true"><div class="goal-calendar-grid"><i>✓</i><i>✓</i><i></i><i>✓</i><i></i><i>✓</i></div></div>
            </div>
          </section>
        `;
      }



const appData = window.APP_DATA;

      function resolveApiBase() {
        if (window.location.protocol !== "file:") return "";
        const params = new URLSearchParams(window.location.search);
        return params.get("api") || window.localStorage.getItem("AI_TUTOR_API_BASE") || "http://127.0.0.1:8000";
      }

      const API_BASE = resolveApiBase();
      const DEFAULT_PLAN_DATE = "2026-06-10";
      let activePlanDate = new URLSearchParams(window.location.search).get("date") || DEFAULT_PLAN_DATE;
      let activeData = appData;
      let activeUser = null;
      let activeRankings = null;
      let activeCurve = appData;
      let activeRankBoard = "today";
      let activeStudyRoom = appData;
      let activeProfile = appData;
      let pendingOnboardingUser = null;
      let schoolSearchTimer = null;
      let activeFocusSession = null;
      let focusTimerId = null;
      let focusStartedAt = 0;
      let focusPausedAt = 0;
      let focusPausedMs = 0;

      function escapeHtml(value) {
        return String(value ?? "")
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;");
      }

      function percent(value) {
        return `${Math.round(Number(value) || 0)}%`;
      }

      function formatPlanStatus(status) {
        const labels = {
          in_progress: "待反馈",
          completed: "今日已完成",
          blocked_by_unfinished: "有未作",
          expired: "已到期",
        };
        return labels[status] || status || "待反馈";
      }

      function formatPlanDate(value) {
        if (!value) return "";
        const [year, month, day] = value.split("-");
        return `${year}年${Number(month)}月${Number(day)}日`;
      }

      function addDays(dateText, days) {
        const date = new Date(`${dateText}T00:00:00`);
        date.setDate(date.getDate() + days);
        return date.toISOString().slice(0, 10);
      }

      function cleanBookName(value) {
        return String(value || "").replace(/^《|》$/g, "").trim();
      }

      function cleanSourceItem(item, sourceName) {
        const cleanName = cleanBookName(sourceName);
        return String(item || "")
          .replace(new RegExp(`^《?${cleanName}》?\\s*`), "")
          .trim();
      }

      function formatSourceLine(source) {
        const sourceName = cleanBookName(source.source);
        const items = (source.items || [])
          .map((item) => cleanSourceItem(item, sourceName))
          .filter(Boolean)
          .join("、");
        return `《${sourceName}》 ${items}`;
      }

      function normalizeApiPlan(apiPlan) {
        const plan = apiPlan.plan;
        const types = plan.types.map((type, index) => {
          const theme = index % 2 ? "purple" : "green";
          return {
            index: type.typeIndex,
            typeId: type.typeId,
            title: type.typeName,
            theme,
            image: theme === "purple" ? "assets/images/type-limit-purple.placeholder.png" : "assets/images/type-limit-green.placeholder.png",
            sources: type.sources.map(formatSourceLine),
            feedbackStatus: type.feedbackOpenStatus,
            questions: type.questions,
          };
        });
        const openType = types.find((type) => type.feedbackStatus === "open");
        return {
          ...appData,
          student: {
            ...appData.student,
            name: apiPlan.student.nickname,
            mathType: apiPlan.student.mathType,
            targetScore: apiPlan.student.targetScore,
            paidUntil: apiPlan.student.paidUntil || "",
          },
          plan: {
            date: formatPlanDate(plan.planDate),
            planDate: plan.planDate,
            planId: plan.planId,
            status: formatPlanStatus(plan.planStatus),
            rawStatus: plan.planStatus,
            slogan: plan.slogan,
            daysToExam: plan.daysToExam,
            completedMessage: plan.completedMessage || "",
            totalTypes: types.length,
            types,
            currentFeedbackTypeId: openType?.typeId || "",
            feedbackItems: openType?.questions || [],
            feedbacks: plan.feedbacks || [],
          },
        };
      }

      function apiConnectionHint() {
        if (window.location.protocol === "file:") {
          return "当前是直接打开 HTML 文件。电脑本地预览请先启动后端再访问 http://127.0.0.1:8000；手机预览请访问 http://电脑局域网IP:8000。";
        }
        return "请确认后端服务正在运行。";
      }

      async function apiRequest(path, options = {}) {
        let response;
        try {
          response = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers: {
              "Content-Type": "application/json",
              ...(options.headers || {}),
            },
          });
        } catch (error) {
          throw new Error(`连接后端失败。${apiConnectionHint()}`);
        }
        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          throw new Error(errorBody.detail || `请求失败：${response.status}`);
        }
        return response.json();
      }

      function setLoginMessage(message, isSuccess = false) {
        const messageEl = document.querySelector("#loginMessage");
        messageEl.textContent = message;
        messageEl.style.color = isSuccess ? "var(--color-primary)" : "var(--color-error)";
      }

      function showStudentApp(user) {
        document.querySelector("#loginScreen").hidden = true;
        document.querySelector("#appShell").hidden = false;
        document.querySelector("#currentUserBar").classList.add("visible");
        document.querySelector("#currentUserText").textContent = `${user.nickname} · ${user.userId}`;
        showView("planView");
        window.scrollTo({ top: 0, behavior: "instant" });
      }

      async function loadStudentPlan(user) {
        const [apiPlan, rankings, curve, studyRoom, profile] = await Promise.all([
          apiRequest(`/students/${user.userId}/daily-plan?date=${activePlanDate}`),
          apiRequest(`/students/${user.userId}/rankings?date=${activePlanDate}`),
          apiRequest(`/students/${user.userId}/curve?date=${activePlanDate}`),
          apiRequest(`/students/${user.userId}/study-room?date=${activePlanDate}`),
          apiRequest(`/students/${user.userId}/profile?date=${activePlanDate}`),
        ]);
        activeData = normalizeApiPlan(apiPlan);
        activeRankings = rankings;
        activeCurve = curve;
        activeStudyRoom = studyRoom;
        activeProfile = profile;
        activeUser = user;
        renderPlan(activeData);
        renderRank(activeRankings);
        renderCurve(activeCurve);
        renderStudyRoom(activeStudyRoom);
        renderProfile(activeProfile, activeRankings);
        showStudentApp(user);
      }

      async function loginAndLoadPlan(loginAccount, password) {
        const loginData = await apiRequest("/auth/login", {
          method: "POST",
          body: JSON.stringify({ loginAccount, password }),
        });
        pendingOnboardingUser = null;
        await loadStudentPlan(loginData.user);
      }

      function showOnboardingForm(user) {
        pendingOnboardingUser = user;
        document.querySelector("#testCodeForm").hidden = true;
        document.querySelector("#onboardingForm").hidden = false;
        document.querySelector("#targetScore").focus();
        setLoginMessage(`测试码已确认，请先为 ${user.nickname} 完成学习档案。`, true);
      }

      async function loginWithTestCode(code) {
        const loginData = await apiRequest("/auth/test-code", {
          method: "POST",
          body: JSON.stringify({ code }),
        });
        if (loginData.needsOnboarding) {
          showOnboardingForm(loginData.user);
          return;
        }
        pendingOnboardingUser = null;
        await loadStudentPlan(loginData.user);
      }

      function collectPrimaryBooks() {
        return [...document.querySelectorAll('input[name="primaryBooks"]:checked')]
          .map((item) => item.value);
      }

      async function submitOnboarding() {
        if (!pendingOnboardingUser) {
          throw new Error("请先输入有效测试码");
        }
        const targetScore = Number(document.querySelector("#targetScore").value);
        const level = document.querySelector("#classLevel").value;
        const primaryBooks = collectPrimaryBooks();
        const backupBook = document.querySelector("#backupBook").value.trim() || "660";
        const dailyTargetMinutes = Number(document.querySelector("#dailyTargetMinutes").value || 180);
        if (primaryBooks.length !== 2) {
          throw new Error("请选择两本核心习题册");
        }
        const result = await apiRequest(`/students/${pendingOnboardingUser.userId}/onboarding`, {
          method: "POST",
          body: JSON.stringify({
            targetScore,
            level,
            primaryBooks,
            backupBook,
            dailyTargetMinutes,
          }),
        });
        pendingOnboardingUser = null;
        await loadStudentPlan(result.user);
      }

      function collectFeedbackAnswers() {
        const rows = [...document.querySelectorAll("#planView .feedback-row")];
        const answers = [];
        let firstIncompleteRow = null;
        let missingReasonRow = null;
        rows.forEach((row) => row.classList.remove("feedback-row-error"));
        for (const row of rows) {
          const selected = row.querySelector(".choice.selected");
          if (!selected) {
            firstIncompleteRow ||= row;
            continue;
          }
          let result = "unattempted";
          if (selected.classList.contains("correct")) result = "correct";
          if (selected.classList.contains("wrong")) result = "wrong";
          const selectedReason = row.querySelector(".wrong-reason.selected");
          if (result === "wrong" && !selectedReason) {
            missingReasonRow ||= row;
            continue;
          }
          answers.push({
            questionId: row.dataset.questionId,
            result,
            wrongReason: result === "wrong" ? selectedReason.dataset.wrongReason : null,
          });
        }
        const problemRow = firstIncompleteRow || missingReasonRow;
        if (problemRow) {
          problemRow.classList.add("feedback-row-error");
          problemRow.scrollIntoView({ block: "center", behavior: "smooth" });
          return {
            ok: false,
            message: firstIncompleteRow ? "请先完成每一道题的反馈选择" : "请为错误题目选择错因",
          };
        }
        return { ok: true, answers };
      }

                  function polarToCartesian(cx, cy, radius, angle) {
        const radian = (angle - 90) * Math.PI / 180;
        return {
          x: cx + radius * Math.cos(radian),
          y: cy + radius * Math.sin(radian),
        };
      }

      function describeDonutSlice(cx, cy, outerRadius, innerRadius, startAngle, endAngle) {
        const outerStart = polarToCartesian(cx, cy, outerRadius, startAngle);
        const outerEnd = polarToCartesian(cx, cy, outerRadius, endAngle);
        const innerEnd = polarToCartesian(cx, cy, innerRadius, endAngle);
        const innerStart = polarToCartesian(cx, cy, innerRadius, startAngle);
        const largeArc = endAngle - startAngle > 180 ? 1 : 0;
        return [
          `M ${outerStart.x.toFixed(2)} ${outerStart.y.toFixed(2)}`,
          `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x.toFixed(2)} ${outerEnd.y.toFixed(2)}`,
          `L ${innerEnd.x.toFixed(2)} ${innerEnd.y.toFixed(2)}`,
          `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x.toFixed(2)} ${innerStart.y.toFixed(2)}`,
          "Z",
        ].join(" ");
      }

                  function formatClock(totalSeconds) {
        const minutes = Math.floor(Math.max(0, totalSeconds) / 60);
        const seconds = Math.max(0, totalSeconds) % 60;
        return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
      }

      function currentFocusElapsedSeconds() {
        if (!activeFocusSession?.startedAtMs) return 0;
        const runningUntil = activeFocusSession.paused ? focusPausedAt : Date.now();
        return Math.max(0, Math.floor((runningUntil - focusStartedAt - focusPausedMs) / 1000));
      }

      function updateFocusSessionClock() {
        if (!activeFocusSession) return;
        const elapsed = currentFocusElapsedSeconds();
        const targetSeconds = Math.max(1, activeFocusSession.targetMinutes * 60);
        const remaining = Math.max(0, targetSeconds - elapsed);
        const progress = Math.min(100, Math.round(elapsed / targetSeconds * 100));
        document.querySelectorAll("[data-focus-countdown]").forEach((node) => {
          node.textContent = formatClock(remaining);
        });
        document.querySelectorAll("[data-focus-progress]").forEach((node) => {
          node.style.setProperty("--focus-progress", `${progress}%`);
        });
        document.querySelectorAll("[data-focus-percent]").forEach((node) => {
          node.textContent = `${progress}%`;
        });
        const currentTime = document.querySelector("[data-focus-now]");
        if (currentTime) {
          currentTime.textContent = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
        }
      }

      function startFocusTicker() {
        clearInterval(focusTimerId);
        updateFocusSessionClock();
        focusTimerId = setInterval(updateFocusSessionClock, 1000);
      }

      function stopFocusTicker() {
        clearInterval(focusTimerId);
        focusTimerId = null;
      }

      function displayTaskName(value) {
        return String(value ?? "")
          .replace(/（[^）]*）/g, "")
          .replace(/\([^)]*\)/g, "")
          .trim();
      }

      function studyRoomModel(data) {
        const room = data?.studyRoom || data || {};
        const fallbackTasks = activeData?.plan?.types?.map((type) => ({
          typeId: type.typeId,
          typeName: displayTaskName(type.title),
          disabled: activeData.plan.types.length <= 1,
        })) || [];
        const taskOptions = (room.taskOptions?.length ? room.taskOptions : fallbackTasks).map((task) => ({
          ...task,
          typeName: displayTaskName(task.typeName),
        }));
        const targetMinutes = room.targetMinutes || Math.round((room.targetHours || 3) * 60);
        const completedMinutes = room.completedMinutes ?? Math.round((room.completedHours || 0) * 60);
        const focusMinutes = room.focusMinutes || 45;
        const currentTaskTypeId = room.currentTaskTypeId || taskOptions[0]?.typeId || "";
        const currentTaskName = displayTaskName(
          room.currentTaskName || taskOptions.find((row) => row.typeId === currentTaskTypeId)?.typeName || taskOptions[0]?.typeName || "今日数学任务"
        );
        return {
          ...room,
          roomName: room.roomName || "数学二冲刺自习室",
          onlineCount: room.onlineCount || 128,
          quietMode: room.quietMode ?? true,
          rule: room.rule || "不开麦、不聊天、按计划专注",
          taskOptions,
          targetMinutes,
          targetHours: Math.round(targetMinutes / 30) / 2,
          completedMinutes,
          completedHours: Math.round(completedMinutes / 6) / 10,
          completionRate: Math.min(100, Math.round(completedMinutes / Math.max(targetMinutes, 1) * 100)),
          focusMinutes,
          currentTaskTypeId,
          currentTaskName,
          members: [...(room.members || [])].sort((a, b) => (b.focusedMinutes || 0) - (a.focusedMinutes || 0)),
        };
      }

                        async function searchSchools(query = "") {
        const results = document.querySelector("#schoolResults");
        if (!results) return;
        results.innerHTML = `<div class="school-result">正在搜索...</div>`;
        try {
          const data = await apiRequest(`/institutions/search?q=${encodeURIComponent(query)}&limit=20`);
          results.innerHTML = data.items.length
            ? data.items.map((school) => `
              <button class="school-result" type="button" data-school-id="${escapeHtml(school.schoolId)}">
                ${escapeHtml(school.name)}
                <span>${escapeHtml(school.province || "")} ${escapeHtml((school.tags || []).join(" · "))}</span>
              </button>
            `).join("")
            : `<div class="school-result">没有找到匹配院校</div>`;
        } catch (error) {
          results.innerHTML = `<div class="school-result">搜索失败，请确认后端服务正在运行</div>`;
        }
      }

      function selectedFocusConfig() {
        const activeDuration = document.querySelector(".duration-option.active")?.dataset.duration || "45";
        let focusMinutes = activeDuration === "custom"
          ? Number(document.querySelector("#customDurationInput")?.value || 45)
          : Number(activeDuration);
        focusMinutes = Math.max(10, Math.min(180, focusMinutes || 45));
        const activeTask = document.querySelector("[data-task-card]");
        const room = studyRoomModel(activeStudyRoom);
        const taskTypeId = activeTask?.dataset.taskType || room.currentTaskTypeId || room.taskOptions[0]?.typeId || "";
        const taskName = displayTaskName(activeTask?.dataset.taskName || activeTask?.textContent?.trim() || room.currentTaskName);
        const dailyTargetMinutes = room.targetMinutes || Math.round((room.targetHours || 3) * 60);
        return { focusMinutes, taskTypeId, taskName, dailyTargetMinutes };
      }

      function setActiveTaskByIndex(nextIndex) {
        const room = studyRoomModel(activeStudyRoom);
        if (room.taskOptions.length <= 1) return;
        const index = (nextIndex + room.taskOptions.length) % room.taskOptions.length;
        const task = room.taskOptions[index];
        const pager = document.querySelector(".task-card-pager");
        const card = document.querySelector("[data-task-card]");
        if (!pager || !card || !task) return;
        pager.dataset.taskIndex = String(index);
        card.dataset.taskType = task.typeId;
        card.dataset.taskName = task.typeName;
        card.textContent = task.typeName;
        document.querySelector("[data-current-task-name]").textContent = task.typeName;
        document.querySelectorAll(".task-card-dots i").forEach((dot, dotIndex) => {
          dot.classList.toggle("active", dotIndex === index);
        });
        if (activeStudyRoom?.studyRoom) {
          activeStudyRoom.studyRoom.currentTaskTypeId = task.typeId;
          activeStudyRoom.studyRoom.currentTaskName = task.typeName;
        }
      }

      async function beginFocusSession() {
        const room = studyRoomModel(activeStudyRoom);
        const config = selectedFocusConfig();
        let session = {
          sessionId: "",
          status: "running",
          targetMinutes: config.focusMinutes,
          taskTypeId: config.taskTypeId,
          taskName: config.taskName,
        };
        if (activeUser) {
          const result = await apiRequest("/focus-sessions/start", {
            method: "POST",
            body: JSON.stringify({
              userId: activeUser.userId,
              planDate: activePlanDate,
              taskTypeId: config.taskTypeId,
              targetMinutes: config.focusMinutes,
              dailyTargetMinutes: config.dailyTargetMinutes,
            }),
          });
          session = result.session;
          activeStudyRoom = { studyRoom: result.studyRoom };
        }
        activeFocusSession = {
          ...session,
          targetMinutes: config.focusMinutes,
          taskName: displayTaskName(session.taskName || config.taskName),
          startedAtMs: Date.now(),
          paused: false,
        };
        const existingFocusPage = document.querySelector("#focusSessionPage");
        if (existingFocusPage) {
          existingFocusPage.outerHTML = renderFocusSessionPage({
            ...room,
            focusMinutes: config.focusMinutes,
            currentTaskName: activeFocusSession.taskName,
          });
        }
        focusStartedAt = Date.now();
        focusPausedAt = 0;
        focusPausedMs = 0;
        document.querySelector("#appShell")?.classList.add("focus-mode");
        document.querySelector("#studyRoomShell")?.classList.add("is-focusing");
        document.querySelector("#focusSessionPage")?.classList.add("active");
        startFocusTicker();
      }

      async function toggleFocusPause() {
        if (!activeFocusSession) return;
        const pauseButton = document.querySelector("[data-focus-pause]");
        const pauseLabel = document.querySelector("[data-focus-pause-label]");
        if (!activeFocusSession.paused) {
          activeFocusSession.paused = true;
          focusPausedAt = Date.now();
          if (activeFocusSession.sessionId) {
            await apiRequest(`/focus-sessions/${activeFocusSession.sessionId}/pause`, { method: "POST" });
          }
          pauseButton.textContent = "▶";
          pauseLabel.textContent = "继续";
          updateFocusSessionClock();
          return;
        }
        activeFocusSession.paused = false;
        focusPausedMs += Date.now() - focusPausedAt;
        if (activeFocusSession.sessionId) {
          await apiRequest(`/focus-sessions/${activeFocusSession.sessionId}/resume`, { method: "POST" });
        }
        pauseButton.textContent = "Ⅱ";
        pauseLabel.textContent = "暂停";
        updateFocusSessionClock();
      }

      async function finishFocusSession() {
        if (!activeFocusSession) return;
        const focusedSeconds = currentFocusElapsedSeconds();
        stopFocusTicker();
        let refreshedStudyRoom = activeStudyRoom;
        if (activeFocusSession.sessionId) {
          const result = await apiRequest(`/focus-sessions/${activeFocusSession.sessionId}/finish`, {
            method: "POST",
            body: JSON.stringify({ focusedSeconds }),
          });
          refreshedStudyRoom = { studyRoom: result.studyRoom };
        }
        activeFocusSession = null;
        document.querySelector("#focusSessionPage")?.classList.remove("active");
        document.querySelector("#studyRoomShell")?.classList.remove("is-focusing");
        document.querySelector("#appShell")?.classList.remove("focus-mode");
        activeStudyRoom = refreshedStudyRoom;
        setTimeout(() => renderStudyRoom(activeStudyRoom), 220);
      }

      if (appData) {
        renderPlan(appData);
        renderRank(appData);
        renderCurve(appData);
        renderStudyRoom(appData);
        renderProfile(appData, activeRankings);
      }

      const navButtons = document.querySelectorAll(".nav-item");
      const views = document.querySelectorAll(".view");

      function showView(viewId) {
        const targetButton = [...navButtons].find((item) => item.dataset.view === viewId);
        navButtons.forEach((item) => item.classList.toggle("active", item === targetButton));
        views.forEach((view) => {
          view.hidden = view.id !== viewId;
        });
      }

      navButtons.forEach((button) => {
        button.addEventListener("click", () => {
          showView(button.dataset.view);
          window.scrollTo({ top: 0, behavior: "instant" });
        });
      });

      const requestedView = new URLSearchParams(window.location.search).get("view");
      if (requestedView === "plan") showView("planView");
      if (requestedView === "rank") showView("rankView");
      if (requestedView === "curve") showView("curveView");
      if (requestedView === "studyRoom") showView("studyRoomView");
      if (requestedView === "my") showView("myView");

      document.querySelector("#testCodeForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        const testCode = document.querySelector("#testCode").value.trim();
        const submitButton = document.querySelector("#testCodeSubmit");
        if (!testCode) {
          setLoginMessage("请输入测试码");
          return;
        }
        submitButton.disabled = true;
        setLoginMessage("正在进入内测空间...", true);
        try {
          await loginWithTestCode(testCode);
        } catch (error) {
          setLoginMessage(error.message || `测试码无效。${apiConnectionHint()}`);
        } finally {
          submitButton.disabled = false;
        }
      });

      document.querySelector("#onboardingForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        const submitButton = document.querySelector("#onboardingSubmit");
        submitButton.disabled = true;
        setLoginMessage("正在保存档案并生成今日计划...", true);
        try {
          await submitOnboarding();
          setLoginMessage("");
        } catch (error) {
          setLoginMessage(error.message || "建档失败");
        } finally {
          submitButton.disabled = false;
        }
      });

      document.querySelector("#legacyLoginForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        const loginAccount = document.querySelector("#loginAccount").value.trim();
        const password = document.querySelector("#loginPassword").value;
        const submitButton = document.querySelector("#loginSubmit");
        if (!loginAccount || !password) {
          setLoginMessage("请输入账号和密码");
          return;
        }
        submitButton.disabled = true;
        setLoginMessage("正在加载该学生的今日计划...", true);
        try {
          await loginAndLoadPlan(loginAccount, password);
          setLoginMessage("");
        } catch (error) {
          setLoginMessage(error.message || `登录失败。${apiConnectionHint()}`);
        } finally {
          submitButton.disabled = false;
        }
      });

      document.querySelector("#logoutBtn").addEventListener("click", () => {
        activeUser = null;
        activeFocusSession = null;
        stopFocusTicker();
        document.querySelector("#appShell")?.classList.remove("focus-mode");
        document.querySelector("#appShell").hidden = true;
        document.querySelector("#loginScreen").hidden = false;
        document.querySelector("#currentUserBar").classList.remove("visible");
        document.querySelector("#testCodeForm").hidden = false;
        document.querySelector("#onboardingForm").hidden = true;
        document.querySelector("#testCode").value = "";
        document.querySelector("#loginPassword").value = "";
        document.querySelector("#testCode").focus();
        setLoginMessage("");
      });

      document.addEventListener("input", (event) => {
        if (event.target.matches("#customDurationInput")) {
          document.querySelectorAll(".duration-option").forEach((button) => button.classList.remove("active"));
          document.querySelector('[data-duration="custom"]')?.classList.add("active");
          const value = Math.max(10, Math.min(180, Number(event.target.value || 45)));
          document.querySelector("[data-focus-minutes]").textContent = `${String(value).padStart(2, "0")}:00`;
        }
        if (event.target.matches("#schoolSearchInput")) {
          clearTimeout(schoolSearchTimer);
          const query = event.target.value.trim();
          schoolSearchTimer = setTimeout(() => searchSchools(query), 180);
        }
      });

      document.addEventListener("click", async (event) => {
        const choice = event.target.closest(".choice");
        if (choice) {
          const row = choice.closest(".feedback-row");
          row.classList.remove("feedback-row-error");
          row.querySelectorAll(".choice").forEach((item) => item.classList.remove("selected"));
          choice.classList.add("selected");
          row.classList.toggle("show-wrong-reasons", choice.classList.contains("wrong"));
          if (!choice.classList.contains("wrong")) {
            row.querySelectorAll(".wrong-reason").forEach((item) => item.classList.remove("selected"));
          }
        }

        const wrongReason = event.target.closest(".wrong-reason");
        if (wrongReason) {
          const row = wrongReason.closest(".feedback-row");
          row.classList.remove("feedback-row-error");
          row.querySelectorAll(".wrong-reason").forEach((item) => item.classList.remove("selected"));
          wrongReason.classList.add("selected");
        }

        if (event.target.closest("#allNone")) {
          document.querySelectorAll(".feedback-row").forEach((row) => {
            row.classList.remove("feedback-row-error", "show-wrong-reasons");
            row.querySelectorAll(".choice").forEach((item) => item.classList.remove("selected"));
            row.querySelectorAll(".wrong-reason").forEach((item) => item.classList.remove("selected"));
            row.querySelector(".choice.none").classList.add("selected");
          });
        }

        const rankTab = event.target.closest("[data-rank-board]");
        if (rankTab && activeRankings) {
          activeRankBoard = rankTab.dataset.rankBoard;
          renderRank(activeRankings);
          return;
        }

        if (event.target.closest("[data-go-plan]")) {
          showView("planView");
          window.scrollTo({ top: 0, behavior: "instant" });
          return;
        }

        if (event.target.closest("[data-load-next-test-day]")) {
          if (!activeUser) return;
          activePlanDate = addDays(activeData?.plan?.planDate || activePlanDate, 1);
          await loadStudentPlan(activeUser);
          showView("planView");
          window.scrollTo({ top: 0, behavior: "instant" });
          return;
        }

        const jumpView = event.target.closest("[data-jump-view]");
        if (jumpView) {
          showView(jumpView.dataset.jumpView);
          window.scrollTo({ top: 0, behavior: "instant" });
          return;
        }

        if (event.target.closest("[data-open-school-search]")) {
          document.querySelector("#schoolSearchModal")?.classList.add("active");
          const input = document.querySelector("#schoolSearchInput");
          if (input) {
            input.value = "";
            input.focus();
          }
          await searchSchools("");
          return;
        }

        if (event.target.closest("[data-close-school-search]") || event.target.id === "schoolSearchModal") {
          document.querySelector("#schoolSearchModal")?.classList.remove("active");
          return;
        }

        const schoolButton = event.target.closest("[data-school-id]");
        if (schoolButton) {
          if (!activeUser) return;
          const result = await apiRequest(`/students/${activeUser.userId}/target-school`, {
            method: "POST",
            body: JSON.stringify({ schoolId: schoolButton.dataset.schoolId }),
          });
          activeProfile = result;
          renderProfile(activeProfile, activeRankings);
          return;
        }

        const durationButton = event.target.closest("[data-duration]");
        if (durationButton) {
          document.querySelectorAll(".duration-option").forEach((button) => button.classList.remove("active"));
          durationButton.classList.add("active");
          const value = durationButton.dataset.duration === "custom"
            ? Number(document.querySelector("#customDurationInput")?.value || 45)
            : Number(durationButton.dataset.duration);
          document.querySelector("[data-focus-minutes]").textContent = `${String(Math.max(10, Math.min(180, value))).padStart(2, "0")}:00`;
          return;
        }

        const previousTaskButton = event.target.closest("[data-task-prev]");
        if (previousTaskButton && !previousTaskButton.disabled) {
          const currentIndex = Number(document.querySelector(".task-card-pager")?.dataset.taskIndex || 0);
          setActiveTaskByIndex(currentIndex - 1);
          return;
        }

        const nextTaskButton = event.target.closest("[data-task-next]");
        if (nextTaskButton && !nextTaskButton.disabled) {
          const currentIndex = Number(document.querySelector(".task-card-pager")?.dataset.taskIndex || 0);
          setActiveTaskByIndex(currentIndex + 1);
          return;
        }

        if (event.target.closest(".focus-start")) {
          await beginFocusSession();
          return;
        }

        if (event.target.closest("[data-focus-pause]")) {
          await toggleFocusPause();
          return;
        }

        if (event.target.closest("[data-focus-finish]")) {
          await finishFocusSession();
          return;
        }

        const submitFeedbackButton = event.target.closest("#submitFeedback");
        if (submitFeedbackButton) {
          const feedbackMessage = document.querySelector("#feedbackMessage");
          if (!activeUser || !activeData?.plan?.currentFeedbackTypeId) {
            feedbackMessage.textContent = "请先登录学生账号后再提交反馈";
            return;
          }
          const feedbackResult = collectFeedbackAnswers();
          if (!feedbackResult.ok) {
            feedbackMessage.textContent = feedbackResult.message;
            return;
          }
          const answers = feedbackResult.answers;
          submitFeedbackButton.disabled = true;
          feedbackMessage.textContent = "正在提交反馈...";
          try {
            const result = await apiRequest("/feedback/submit", {
              method: "POST",
              body: JSON.stringify({
                userId: activeUser.userId,
                planDate: activeData.plan.planDate,
                typeId: activeData.plan.currentFeedbackTypeId,
                answers,
              }),
            });
            activeData = normalizeApiPlan(result.dailyPlan);
            renderPlan(activeData);
            activePlanDate = activeData.plan.planDate || activePlanDate;
            activeRankings = await apiRequest(`/students/${activeUser.userId}/rankings?date=${activePlanDate}`);
            renderRank(activeRankings);
            activeCurve = await apiRequest(`/students/${activeUser.userId}/curve?date=${activePlanDate}`);
            renderCurve(activeCurve);
            activeStudyRoom = await apiRequest(`/students/${activeUser.userId}/study-room?date=${activePlanDate}`);
            renderStudyRoom(activeStudyRoom);
            const refreshedMessage = document.querySelector("#feedbackMessage");
            if (refreshedMessage) {
              refreshedMessage.textContent = result.hasUnattempted
                ? "已提交，有未作题目，今日计划已暂停在待补做状态"
                : "已提交，系统已自动打开下一组题型";
            }
          } catch (error) {
            feedbackMessage.textContent = error.message || "反馈提交失败";
          } finally {
            submitFeedbackButton.disabled = false;
          }
        }
      });

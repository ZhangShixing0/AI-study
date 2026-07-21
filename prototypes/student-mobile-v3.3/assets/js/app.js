function createEmptyAppData() {
  return {
    student: {},
    plan: {
      types: [],
      feedbackItems: [],
      feedbacks: [],
      reviewItems: [],
      extraPracticeTypes: [],
      showExtraPractice: false,
    },
    rank: {},
    curve: {},
    studyRoom: {},
    profile: {},
  };
}

const hasStaticAppData = Boolean(window.APP_DATA);
const appData = window.APP_DATA || createEmptyAppData();

      function resolveApiBase() {
        if (window.location.protocol !== "file:") return "";
        const params = new URLSearchParams(window.location.search);
        return params.get("api") || window.localStorage.getItem("AI_TUTOR_API_BASE") || "http://127.0.0.1:8000";
      }

      const API_BASE = resolveApiBase();
      function todayDateText() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      }

      const DEFAULT_PLAN_DATE = todayDateText();
      const PROFILE_DEFAULT_NOTIFICATIONS = [];
      const FOCUS_AWAY_CONFIRM_SECONDS = 60;
      const FOCUS_RESULT_RETURN_MS = 5000;
      const FOCUS_STORAGE_KEY = "AI_TUTOR_ACTIVE_FOCUS_SESSION";
      const STUDENT_AUTH_STORAGE_KEY = "AI_TUTOR_STUDENT_AUTH";
      const STUDENT_DEVICE_ID_KEY = "AI_TUTOR_STUDENT_DEVICE_ID";
      const initialPlanDate = new URLSearchParams(window.location.search).get("date");
      const hasExplicitPlanDate = Boolean(initialPlanDate);
      let activePlanDate = initialPlanDate || DEFAULT_PLAN_DATE;
      let activeData = appData;
      let activeUser = null;
      let activeRankings = null;
      let activeCurve = appData;
      let activeStudyRoom = appData;
      let activeProfile = appData;
      let activeNotifications = { hasUnread: false };
      let pendingOnboardingUser = null;
      let schoolSearchTimer = null;
      let activeFocusSession = null;
      let focusTimerId = null;
      let studyRoomRefreshTimerId = null;
      let studyRoomRefreshInFlight = false;
      let focusStartedAt = 0;
      let focusPausedAt = 0;
      let focusPausedMs = 0;
      let focusResultReturnTimerId = null;
      let focusResultCountdownTimerId = null;
      let pendingFeedbackSubmission = null;
      let isExperienceMode = false;
      let experienceToastTimerId = null;
      let studentAuthGeneration = 0;
      let questionPreviewRequestId = 0;
      const questionPreviewCache = new Map();
      let questionPreviewState = {
        status: "idle",
        options: null,
        selectedChapterId: "",
        selectedTypeId: "",
        detail: null,
        error: "",
      };

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
          blocked_by_unfinished: "今日未完成",
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

      function structuredQuestionLabel(question) {
        const parts = [
          question.bookDisplayLabel,
          question.sourceChapterLabel,
          question.sourceSectionLabel,
          question.sourceSubsectionLabel,
          question.sourceQuestionLabel,
        ].filter(Boolean);
        return parts.join(" ");
      }

      function normalizeApiPlan(apiPlan) {
        const plan = apiPlan.plan;
        const apiStudent = apiPlan.student || {};
        const sourceFormatter = window.TodayPlanSourceFormatting;
        const feedbacks = plan.feedbacks || [];
        const reviewItems = feedbacks
          .map((feedback) => ({
            questionId: feedback.question_id || feedback.questionId || "",
            label: feedback.label || feedback.original_position_text || feedback.question_label || "",
            result: feedback.result || "",
            questionNote: feedback.question_note || feedback.questionNote || "",
          }))
          .filter((item) => item.questionNote && item.result !== "unattempted");
        const types = plan.types.map((type, index) => {
          const theme = index % 2 ? "purple" : "green";
          const summary = type.summary || (
            type.introTitle || type.introBody
              ? {
                  title: [type.importanceTag, type.questionKind].filter(Boolean).join("｜") +
                    ([type.importanceTag, type.questionKind].filter(Boolean).length ? "：" : "") +
                    (type.introTitle || type.cardTitle || type.typeName || ""),
                  body: type.introBody || "",
                }
              : null
          );
          return {
            index: type.typeIndex,
            typeId: type.typeId,
            displayTypeLabel: type.displayTypeLabel || "",
            studentTypeSortInChapter: type.studentTypeSortInChapter || 0,
            cardLabel: type.displayTypeLabel || type.cardTypeLabel || type.cardLabel || "",
            cardTypeLabel: type.displayTypeLabel || type.cardTypeLabel || type.cardLabel || "",
            title: type.cardTitle || type.typeName,
            typeName: type.typeName,
            cardTitle: type.cardTitle || "",
            importanceTag: type.importanceTag || "",
            questionKind: type.questionKind || "",
            introTitle: type.introTitle || "",
            introBody: type.introBody || "",
            summary,
            theme,
            image: theme === "purple" ? "assets/images/type-limit-purple.placeholder.png" : "assets/images/type-limit-green.placeholder.png",
            sources: (type.sources || []).map(formatSourceLine),
            sourceGroups: Array.isArray(type.sourceGroups) && type.sourceGroups.length
              ? type.sourceGroups
              : sourceFormatter?.buildSourceGroups(type.sources) || [],
            feedbackStatus: type.feedbackOpenStatus,
            questions: (type.questions || []).map((question) => ({
              ...question,
              label: question.label || structuredQuestionLabel(question),
            })),
          };
        });
        const openType = types.find((type) => type.feedbackStatus === "open");
        return {
          ...appData,
          student: {
            ...(appData.student || {}),
            userId: apiStudent.userId || apiStudent.studentId || "",
            studentId: apiStudent.userId || apiStudent.studentId || "",
            id: apiStudent.userId || apiStudent.studentId || "",
            name: apiStudent.nickname || apiStudent.name || "",
            nickname: apiStudent.nickname || apiStudent.name || "",
            mathType: apiStudent.mathType || "",
            examSubject: apiStudent.mathType || apiStudent.examSubject || "",
            targetScore: apiStudent.targetScore,
            avatarUrl: apiStudent.avatarUrl || apiStudent.avatar || "",
            paidUntil: apiStudent.paidUntil || "",
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
            feedbacks,
            reviewItems,
            extraPracticeTypes: plan.extraPracticeTypes || [],
            chapterSummary: plan.chapterSummary || plan.chapter_summary || null,
            showExtraPractice: false,
          },
        };
      }

      function apiConnectionHint() {
        if (window.location.protocol === "file:") {
          return "当前是直接打开 HTML 文件。电脑本地预览请先启动后端再访问 http://127.0.0.1:8000；手机预览请访问 http://电脑局域网IP:8000。";
        }
        return "请确认后端服务正在运行。";
      }

      function randomId(prefix) {
        let raw = "";
        try {
          if (window.crypto?.getRandomValues) {
            const bytes = new Uint32Array(4);
            window.crypto.getRandomValues(bytes);
            raw = [...bytes].map((value) => value.toString(16)).join("");
          }
        } catch (error) {}
        return `${prefix}-${raw || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
      }

      function getOrCreateStudentDeviceId() {
        let deviceId = "";
        try {
          deviceId = window.localStorage.getItem(STUDENT_DEVICE_ID_KEY) || "";
          if (!deviceId) {
            deviceId = randomId("web");
            window.localStorage.setItem(STUDENT_DEVICE_ID_KEY, deviceId);
          }
        } catch (error) {
          deviceId = randomId("web-memory");
        }
        return deviceId;
      }

      function saveStudentAuth(payload, loginAccount = "") {
        const deviceId = getOrCreateStudentDeviceId();
        const auth = {
          userId: payload?.user?.userId || "",
          token: payload?.token || "",
          sessionId: payload?.sessionId || "",
          deviceId,
          loginAccount,
          savedAt: new Date().toISOString(),
        };
        if (!auth.userId || !auth.token || !auth.sessionId) return null;
        try {
          window.localStorage.setItem(STUDENT_AUTH_STORAGE_KEY, JSON.stringify(auth));
        } catch (error) {}
        invalidateStudentAuthRestore();
        return auth;
      }

      function loadStudentAuth() {
        try {
          const auth = JSON.parse(window.localStorage.getItem(STUDENT_AUTH_STORAGE_KEY) || "null");
          return auth && typeof auth === "object" ? auth : null;
        } catch (error) {
          return null;
        }
      }

      function clearStudentAuth() {
        try {
          window.localStorage.removeItem(STUDENT_AUTH_STORAGE_KEY);
        } catch (error) {}
        invalidateStudentAuthRestore();
      }

      function invalidateStudentAuthRestore() {
        studentAuthGeneration += 1;
      }

      function isSameStudentAuthRecord(left, right) {
        return Boolean(
          left &&
          right &&
          left.userId === right.userId &&
          left.token === right.token &&
          left.sessionId === right.sessionId &&
          left.deviceId === right.deviceId
        );
      }

      function isCurrentRestoreAuth(auth, generation) {
        return generation === studentAuthGeneration && isSameStudentAuthRecord(auth, loadStudentAuth());
      }

      function isStudentSessionAuthError(error) {
        return Boolean(error?.studentSessionAuth);
      }

      function studentAuthHeaders(auth = loadStudentAuth()) {
        if (!auth?.token || !auth?.sessionId) return {};
        return {
          "Authorization": `Bearer ${auth.token}`,
          "X-Session-Id": auth.sessionId,
          "X-Device-Id": auth.deviceId || getOrCreateStudentDeviceId(),
        };
      }

      async function apiRequest(path, options = {}) {
        const requestAuth = loadStudentAuth();
        let response;
        try {
          response = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers: {
              "Content-Type": "application/json",
              ...studentAuthHeaders(requestAuth),
              ...(options.headers || {}),
            },
          });
        } catch (error) {
          throw new Error(`连接后端失败。${apiConnectionHint()}`);
        }
        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          const detail = errorBody?.detail;
          const code = detail && typeof detail === "object" ? detail.code : "";
          const message = detail && typeof detail === "object" ? detail.message : detail;
          const requestError = new Error(message || `请求失败：${response.status}`);
          requestError.status = response.status;
          requestError.code = code;
          if (code === "SESSION_REPLACED" || code === "SESSION_EXPIRED" || code === "SESSION_REQUIRED") {
            requestError.studentSessionAuth = true;
            handleStudentSessionExpired(message || "账号已在其他设备登录，请重新登录。", requestAuth);
          }
          throw requestError;
        }
        return response.json();
      }

      function renderQuestionPreviewState() {
        window.QuestionPreviewPage?.render(questionPreviewState);
      }

      function questionPreviewTypesForChapter(chapterId) {
        const chapters = Array.isArray(questionPreviewState.options?.chapters)
          ? questionPreviewState.options.chapters
          : [];
        const chapter = chapters.find((item) => item.chapterId === chapterId) || chapters[0];
        return Array.isArray(chapter?.types) ? chapter.types : [];
      }

      function resetQuestionPreviewState() {
        questionPreviewRequestId += 1;
        questionPreviewCache.clear();
        questionPreviewState = {
          status: "idle",
          options: null,
          selectedChapterId: "",
          selectedTypeId: "",
          detail: null,
          error: "",
        };
      }

      async function loadQuestionPreviewType(typeId) {
        if (!activeUser || !typeId) {
          questionPreviewState = { ...questionPreviewState, status: "ready", detail: null, error: "" };
          renderQuestionPreviewState();
          return;
        }
        const cacheKey = `${activeUser.userId}:${typeId}`;
        const cached = questionPreviewCache.get(cacheKey);
        if (cached) {
          questionPreviewState = {
            ...questionPreviewState,
            status: "ready",
            selectedTypeId: typeId,
            detail: cached,
            error: "",
          };
          renderQuestionPreviewState();
          return;
        }

        const requestId = ++questionPreviewRequestId;
        questionPreviewState = {
          ...questionPreviewState,
          status: "loading-detail",
          selectedTypeId: typeId,
          detail: null,
          error: "",
        };
        renderQuestionPreviewState();
        try {
          const detail = await apiRequest(`/students/${activeUser.userId}/question-preview/types/${encodeURIComponent(typeId)}`);
          if (requestId !== questionPreviewRequestId) return;
          questionPreviewCache.set(cacheKey, detail);
          questionPreviewState = { ...questionPreviewState, status: "ready", detail, error: "" };
        } catch (error) {
          if (requestId !== questionPreviewRequestId) return;
          questionPreviewState = {
            ...questionPreviewState,
            status: "error",
            detail: null,
            error: error.message || "题目加载失败",
          };
        }
        renderQuestionPreviewState();
      }

      async function openQuestionPreview() {
        if (isExperienceMode || !activeUser) {
          showExperienceNotice("正式学员登录后，可按自己的两本主练习册预览题目。");
          return;
        }
        const loadedUserId = questionPreviewState.options?.student?.userId;
        if (loadedUserId && String(loadedUserId) !== String(activeUser.userId)) {
          resetQuestionPreviewState();
        }
        showView("questionPreviewView");
        window.scrollTo({ top: 0, behavior: "instant" });

        if (questionPreviewState.options) {
          renderQuestionPreviewState();
          if (!questionPreviewState.detail && questionPreviewState.selectedTypeId) {
            await loadQuestionPreviewType(questionPreviewState.selectedTypeId);
          }
          return;
        }

        const requestId = ++questionPreviewRequestId;
        questionPreviewState = { ...questionPreviewState, status: "loading-options", error: "" };
        renderQuestionPreviewState();
        try {
          const options = await apiRequest(`/students/${activeUser.userId}/question-preview/options`);
          if (requestId !== questionPreviewRequestId) return;
          const chapters = Array.isArray(options.chapters) ? options.chapters : [];
          const selectedChapter = chapters.find((chapter) => chapter.chapterId === options.currentChapterId) || chapters[0];
          const types = Array.isArray(selectedChapter?.types) ? selectedChapter.types : [];
          const selectedType = types.find((type) => type.typeId === options.currentTypeId) || types[0];
          questionPreviewState = {
            status: "ready",
            options,
            selectedChapterId: selectedChapter?.chapterId || "",
            selectedTypeId: selectedType?.typeId || "",
            detail: null,
            error: "",
          };
          renderQuestionPreviewState();
          if (selectedType?.typeId) await loadQuestionPreviewType(selectedType.typeId);
        } catch (error) {
          if (requestId !== questionPreviewRequestId) return;
          questionPreviewState = {
            ...questionPreviewState,
            status: "error",
            error: error.message || "题目加载失败",
          };
          renderQuestionPreviewState();
        }
      }

      function handleStudentSessionExpired(message, authSnapshot = null) {
        if (authSnapshot && !isSameStudentAuthRecord(authSnapshot, loadStudentAuth())) return;
        if (typeof window.closeStudentOnboarding === "function") {
          window.closeStudentOnboarding();
        }
        clearStudentAuth();
        stopStudyRoomAutoRefresh();
        pendingOnboardingUser = null;
        activeFocusSession = null;
        clearFocusSessionSnapshot();
        setFocusShellActive(false);
        document.querySelector("#appShell").hidden = true;
        document.querySelector("#loginScreen").hidden = false;
        setLoginMessage(message || "请重新登录。");
      }

      async function restoreStudentSession() {
        let auth = loadStudentAuth();
        if (!auth?.token || !auth?.sessionId || !auth?.userId) return false;
        let restoreGeneration = studentAuthGeneration;
        try {
          setLoginMessage("正在恢复登录...", true);
          const me = await apiRequest("/auth/me");
          if (!isCurrentRestoreAuth(auth, restoreGeneration)) return false;
          if (me?.token && me?.sessionId) {
            auth = saveStudentAuth(me, auth.loginAccount || "") || auth;
            restoreGeneration = studentAuthGeneration;
          }
          if (!isCurrentRestoreAuth(auth, restoreGeneration)) return false;
          isExperienceMode = false;
          if (me.needsOnboarding) {
            pendingOnboardingUser = me.user;
            if (typeof window.showStudentOnboarding !== "function") {
              throw new Error("首次资料填写页未加载，请刷新页面后重试");
            }
            await window.showStudentOnboarding({
              user: me.user,
              apiRequest,
              onComplete: async (completedUser, completedResult) => {
                if (!isCurrentRestoreAuth(auth, restoreGeneration)) return;
                if (completedResult?.token && completedResult?.sessionId) {
                  auth = saveStudentAuth(completedResult, auth.loginAccount || "") || auth;
                  restoreGeneration = studentAuthGeneration;
                }
                if (!isCurrentRestoreAuth(auth, restoreGeneration)) return;
                pendingOnboardingUser = null;
                await loadStudentPlan(completedUser || me.user);
              },
            });
            return true;
          }
          if (!isCurrentRestoreAuth(auth, restoreGeneration)) return false;
          pendingOnboardingUser = null;
          await loadStudentPlan(me.user);
          if (!isCurrentRestoreAuth(auth, restoreGeneration)) return false;
          setLoginMessage("");
          return true;
        } catch (error) {
          if (isStudentSessionAuthError(error) && isCurrentRestoreAuth(auth, restoreGeneration)) {
            clearStudentAuth();
            pendingOnboardingUser = null;
            setLoginMessage("");
          }
          setLoginMessage("");
          return false;
        }
      }

      function setLoginMessage(message, isSuccess = false) {
        const messageEl = document.querySelector("#loginMessage");
        messageEl.textContent = message;
        messageEl.style.color = isSuccess ? "var(--color-primary)" : "var(--color-error)";
      }

      function clonePlainObject(value) {
        if (typeof structuredClone === "function") return structuredClone(value);
        return JSON.parse(JSON.stringify(value));
      }

      function showExperienceNotice(message) {
        let toast = document.querySelector("#experienceToast");
        if (!toast) {
          toast = document.createElement("div");
          toast.id = "experienceToast";
          toast.className = "experience-toast";
          document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.classList.add("is-visible");
        clearTimeout(experienceToastTimerId);
        experienceToastTimerId = setTimeout(() => {
          toast.classList.remove("is-visible");
        }, 2400);
      }

      function experiencePool() {
        return Array.isArray(window.EXPERIENCE_DATA) ? window.EXPERIENCE_DATA : [];
      }

      function pickExperienceAccount() {
        const pool = experiencePool();
        if (!pool.length) {
          throw new Error("体验数据暂未加载，请刷新页面后重试。");
        }
        return pool.find((item) => item.id === "experience-b") || pool[0];
      }

      function enterExperienceMode(experience) {
        isExperienceMode = true;
        pendingOnboardingUser = null;
        stopStudyRoomAutoRefresh();
        activeFocusSession = null;
        clearFocusSessionSnapshot();
        setFocusShellActive(false);

        const snapshot = clonePlainObject(experience.data);
        snapshot.isExperienceMode = true;
        snapshot.plan = {
          ...snapshot.plan,
          daysToExam: "xx",
        };
        snapshot.profile = {
          ...snapshot.profile,
          nickname: "体验号预览",
          daysToExam: "xx",
        };

        activeData = snapshot;
        activeRankings = snapshot.rank;
        activeCurve = { curve: snapshot.curve };
        activeStudyRoom = { studyRoom: snapshot.studyRoom };
        activeProfile = { profile: snapshot.profile, isExperienceMode: true };
        activeNotifications = { hasUnread: false, items: PROFILE_DEFAULT_NOTIFICATIONS };
        activeUser = {
          ...(experience.user || {}),
          userId: experience.id,
          nickname: "体验号预览",
          isExperienceMode: true,
          currentTestDate: snapshot.plan.planDate || activePlanDate,
        };

        renderPlan(activeData);
        renderCurve(activeCurve);
        renderStudyRoom(activeStudyRoom);
        renderProfile(activeProfile, activeRankings, activeNotifications);
        showStudentApp(activeUser);
      }

      function startExperienceMode() {
        const experience = pickExperienceAccount();
        enterExperienceMode(experience);
      }

      function showStudentApp(user) {
        document.querySelector("#loginScreen").hidden = true;
        document.querySelector("#appShell").hidden = false;
        showView("planView");
        window.scrollTo({ top: 0, behavior: "instant" });
      }

      function closeNotificationSheet() {
        document.querySelector("#notificationSheet")?.remove();
      }

      function notificationImageHtml(item) {
        if (!item?.imageUrl) return "";
        return `<img class="notification-image" src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title || "公告图片")}" loading="lazy" />`;
      }

      function renderNotificationSheet(items) {
        const listHtml = items.length
          ? items.map((item) => `
              <article class="notification-item ${item.isRead ? "" : "is-unread"}">
                <div class="notification-item-head">
                  <strong>${escapeHtml(item.title)}</strong>
                  <span>${escapeHtml(item.publishedAt || "")}</span>
                </div>
                <p>${escapeHtml(item.content || "")}</p>
                ${notificationImageHtml(item)}
              </article>
            `).join("")
          : `<div class="notification-empty">暂无公告</div>`;

        document.body.insertAdjacentHTML("beforeend", `
          <div class="notification-sheet" id="notificationSheet" role="dialog" aria-modal="true" aria-labelledby="notificationSheetTitle">
            <button class="notification-backdrop" type="button" data-close-notifications aria-label="关闭消息通知"></button>
            <section class="notification-panel">
              <div class="sheet-drag-handle"></div>
              <div class="notification-head">
                <h2 id="notificationSheetTitle">消息通知</h2>
                <button type="button" class="notification-close" data-close-notifications aria-label="关闭">×</button>
              </div>
              <div class="notification-list">${listHtml}</div>
            </section>
          </div>
        `);
      }

      async function openNotificationSheet() {
        if (!activeUser?.userId) return;
        closeNotificationSheet();
        if (activeUser.isExperienceMode) {
          renderNotificationSheet(activeNotifications.items || PROFILE_DEFAULT_NOTIFICATIONS);
          activeNotifications = { hasUnread: false, items: PROFILE_DEFAULT_NOTIFICATIONS };
          document.querySelector(".profile-notify-button")?.classList.remove("has-unread");
          document.querySelector(".profile-notify-dot")?.remove();
          return;
        }
        const data = await apiRequest(`/students/${activeUser.userId}/notifications`);
        renderNotificationSheet(data.items || PROFILE_DEFAULT_NOTIFICATIONS);
        await apiRequest(`/students/${activeUser.userId}/notifications/read-all`, { method: "POST" });
        activeNotifications = { hasUnread: false };
        document.querySelector(".profile-notify-button")?.classList.remove("has-unread");
        document.querySelector(".profile-notify-dot")?.remove();
      }

      function canRefreshStudentPageData() {
        return Boolean(activeUser?.userId && !isExperienceMode);
      }

      function isViewVisible(viewId) {
        const view = document.querySelector(`#${viewId}`);
        return Boolean(view && !view.hidden);
      }

      function logOptionalRefreshError(label, error) {
        if (isStudentSessionAuthError(error)) return;
        console.warn(`Optional ${label} refresh failed`, error);
      }

      function applyNotificationsStatus(notifications) {
        activeNotifications = {
          ...(notifications || {}),
          items: notifications?.items || PROFILE_DEFAULT_NOTIFICATIONS,
        };
      }

      async function refreshCurveData() {
        if (!canRefreshStudentPageData()) return null;
        try {
          activeCurve = await apiRequest(`/students/${activeUser.userId}/curve?date=${activePlanDate}`);
          renderCurve(activeCurve);
          return activeCurve;
        } catch (error) {
          logOptionalRefreshError("curve", error);
          return null;
        }
      }

      async function refreshStudyRoomData() {
        if (!canRefreshStudentPageData()) return null;
        try {
          activeStudyRoom = await apiRequest(`/students/${activeUser.userId}/study-room?date=${activePlanDate}`);
          if (!activeFocusSession && isViewVisible("studyRoomView")) {
            renderStudyRoom(activeStudyRoom);
          }
          return activeStudyRoom;
        } catch (error) {
          logOptionalRefreshError("study room", error);
          return null;
        }
      }

      async function refreshProfileData() {
        if (!canRefreshStudentPageData()) return null;
        const [rankingsResult, profileResult, notificationsResult] = await Promise.allSettled([
          apiRequest(`/students/${activeUser.userId}/rankings?date=${activePlanDate}`),
          apiRequest(`/students/${activeUser.userId}/profile?date=${activePlanDate}`),
          apiRequest(`/students/${activeUser.userId}/notifications/status`),
        ]);
        if (rankingsResult.status === "fulfilled") {
          activeRankings = rankingsResult.value;
        } else {
          logOptionalRefreshError("rankings", rankingsResult.reason);
        }
        if (profileResult.status === "fulfilled") {
          activeProfile = profileResult.value;
        } else {
          logOptionalRefreshError("profile", profileResult.reason);
        }
        if (notificationsResult.status === "fulfilled") {
          applyNotificationsStatus(notificationsResult.value);
        } else {
          logOptionalRefreshError("notifications", notificationsResult.reason);
        }
        if (isViewVisible("myView")) {
          renderProfile(activeProfile, activeRankings, activeNotifications);
        }
        return activeProfile;
      }

      async function refreshSupplementalStudentData() {
        if (!canRefreshStudentPageData()) return;
        await Promise.allSettled([
          refreshCurveData(),
          refreshStudyRoomData(),
          refreshProfileData(),
        ]);
      }

      async function loadStudentPlan(user) {
        if (!hasExplicitPlanDate && user.currentTestDate) {
          activePlanDate = user.currentTestDate;
        }
        const apiPlan = await apiRequest(`/students/${user.userId}/daily-plan?date=${activePlanDate}`);
        activeData = normalizeApiPlan(apiPlan);
        activeUser = { ...user, currentTestDate: activePlanDate };
        renderPlan(activeData);
        renderCurve(activeCurve);
        renderStudyRoom(activeStudyRoom);
        renderProfile(activeProfile, activeRankings, activeNotifications);
        showStudentApp(user);
        void refreshSupplementalStudentData();
      }

      async function loginAndLoadPlan(loginAccount, password) {
        invalidateStudentAuthRestore();
        const loginData = await apiRequest("/auth/login", {
          method: "POST",
          body: JSON.stringify({
            loginAccount,
            password,
            deviceId: getOrCreateStudentDeviceId(),
            deviceName: navigator.userAgent || "Student Browser",
          }),
        });
        saveStudentAuth(loginData, loginAccount);
        isExperienceMode = false;
        pendingOnboardingUser = null;
        if (loginData.needsOnboarding) {
          pendingOnboardingUser = loginData.user;
          if (typeof window.showStudentOnboarding !== "function") {
            throw new Error("首次资料填写页未加载，请刷新页面后重试");
          }
          await window.showStudentOnboarding({
            user: loginData.user,
            apiRequest,
            onComplete: async (completedUser, completedResult) => {
              if (completedResult?.token && completedResult?.sessionId) {
                saveStudentAuth(completedResult, loginAccount);
              }
              pendingOnboardingUser = null;
              await loadStudentPlan(completedUser || loginData.user);
            },
          });
          return;
        }
        await loadStudentPlan(loginData.user);
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

      function closeUnattemptedSheet() {
        document.querySelector("#unattemptedSheet")?.remove();
        pendingFeedbackSubmission = null;
      }

      function showUnattemptedSheet(answers) {
        closeUnattemptedSheet();
        const unattemptedCount = answers.filter((item) => item.result === "unattempted").length;
        const completedCount = answers.length - unattemptedCount;
        pendingFeedbackSubmission = { answers };
        document.body.insertAdjacentHTML("beforeend", `
          <div class="unattempted-sheet" id="unattemptedSheet" role="dialog" aria-modal="true" aria-labelledby="unattemptedSheetTitle">
            <button class="unattempted-sheet-backdrop" type="button" data-unattempted-close aria-label="关闭未作确认"></button>
            <section class="unattempted-panel">
              <div class="sheet-drag-handle"></div>
              <div class="sheet-kicker">发现未作题目</div>
              <h2 id="unattemptedSheetTitle">本题型还有 ${unattemptedCount} 道未作，怎么处理？</h2>
              <p class="sheet-intro">选择后会保存已完成题目的正确/错误记录。不同选择会影响后续题型是否开放。</p>
              <div class="sheet-rule"><strong>按错题记录：</strong>未作题计入错题，并开放下一题型。</div>
              <div class="sheet-rule"><strong>没做完：</strong>后续题型不再开放提交，明天从本题型继续布置。</div>
              <div class="sheet-stats" aria-label="本题型反馈统计">
                <div><strong>${completedCount}</strong><span>已完成</span></div>
                <div><strong>${unattemptedCount}</strong><span>未作</span></div>
              </div>
              <button class="sheet-primary-action" type="button" data-unattempted-action="mark_wrong">按错题记录，继续下一题型</button>
              <button class="sheet-secondary-action" type="button" data-unattempted-action="defer">没做完，明天从本题型继续</button>
              <div class="sheet-message" id="unattemptedSheetMessage">返回或点空白处，可继续修改反馈</div>
            </section>
          </div>
        `);
      }

      function feedbackSubmitMessage(result) {
        if (result.hasUnattempted && result.unattemptedAction === "mark_wrong") {
          return "已按错题记录未作题目，并打开下一组题型";
        }
        if (result.hasUnattempted && result.unattemptedAction === "defer") {
          return "已记录没做完，明天会从本题型继续";
        }
        return "已提交，系统已自动打开下一组题型";
      }

      function completeExperienceFeedback(answers = []) {
        const completion = activeData?.plan?.experienceCompletion || {};
        const feedbacks = answers.map((answer) => ({
          questionId: answer.questionId,
          result: answer.result,
          wrongReason: answer.wrongReason || "",
          submittedAt: activeData?.plan?.planDate || activePlanDate,
        }));
        activeData = {
          ...activeData,
          plan: {
            ...activeData.plan,
            status: completion.status || "今日已完成",
            rawStatus: completion.rawStatus || "completed",
            completedMessage: completion.completedMessage || "今日题型已完成，保持这个反馈节奏，薄弱点会越来越清楚。",
            currentFeedbackTypeId: "",
            feedbackItems: [],
            feedbacks,
            reviewItems: clonePlainObject(completion.reviewItems || activeData.plan.reviewItems || []),
            chapterSummary: clonePlainObject(completion.chapterSummary || activeData.plan.chapterSummary || null),
            extraPracticeTypes: clonePlainObject(completion.extraPracticeTypes || activeData.plan.extraPracticeTypes || []),
            showExtraPractice: false,
          },
        };
        renderPlan(activeData);
        showExperienceNotice("体验反馈已提交，已生成今日完成状态和章节小结。");
        return { experienceMode: true, dailyPlan: activeData };
      }

      async function submitFeedbackAnswers(answers, unattemptedAction = null) {
        const feedbackMessage = document.querySelector("#feedbackMessage");
        const submitFeedbackButton = document.querySelector("#submitFeedback");
        if (isExperienceMode) {
          return completeExperienceFeedback(answers);
        }
        const normalizedAnswers = unattemptedAction === "mark_wrong"
          ? answers.map((answer) => (
              answer.result === "unattempted"
                ? { ...answer, wrongReason: answer.wrongReason || "knowledge_gap" }
                : answer
            ))
          : answers;
        const payload = {
          userId: activeUser.userId,
          planDate: activeData.plan.planDate,
          typeId: activeData.plan.currentFeedbackTypeId,
          answers: normalizedAnswers,
        };
        if (unattemptedAction) {
          payload.unattemptedAction = unattemptedAction;
        }
        if (submitFeedbackButton) submitFeedbackButton.disabled = true;
        if (feedbackMessage) feedbackMessage.textContent = "正在提交反馈...";
        try {
          const result = await apiRequest("/feedback/submit", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          activeData = normalizeApiPlan(result.dailyPlan);
          renderPlan(activeData);
          activePlanDate = activeData.plan.planDate || activePlanDate;
          await refreshSupplementalStudentData();
          const refreshedMessage = document.querySelector("#feedbackMessage");
          if (refreshedMessage) refreshedMessage.textContent = feedbackSubmitMessage(result);
          return result;
        } finally {
          if (submitFeedbackButton?.isConnected) submitFeedbackButton.disabled = false;
        }
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

      function focusTargetSeconds() {
        return Math.max(1, Number(activeFocusSession?.targetMinutes || 45) * 60);
      }

      function countedFocusMinutes(focusedSeconds) {
        const seconds = Math.max(0, Number(focusedSeconds) || 0);
        if (seconds < 50) return 0;
        return Math.floor((seconds + 10) / 60);
      }

      function persistFocusSession() {
        if (!activeFocusSession) {
          window.sessionStorage.removeItem(FOCUS_STORAGE_KEY);
          return;
        }
        window.sessionStorage.setItem(FOCUS_STORAGE_KEY, JSON.stringify({
          activeFocusSession,
          focusStartedAt,
          focusPausedAt,
          focusPausedMs,
          activePlanDate,
          activeUser,
        }));
      }

      function clearFocusSessionSnapshot() {
        window.sessionStorage.removeItem(FOCUS_STORAGE_KEY);
      }

      function renderActiveFocusSessionPage() {
        const room = studyRoomModel(activeStudyRoom);
        const focusPage = document.querySelector("#focusSessionPage");
        if (focusPage) {
          focusPage.outerHTML = renderFocusSessionPage(room);
        }
        document.querySelector("#focusSessionPage")?.classList.add("active");
      }

      function setFocusShellActive(isActive) {
        document.querySelector("#appShell")?.classList.toggle("focus-mode", isActive);
        document.querySelector("#studyRoomShell")?.classList.toggle("is-focusing", isActive);
      }

      function currentFocusElapsedSeconds() {
        if (!activeFocusSession?.startedAtMs) return 0;
        const isFrozen = activeFocusSession.paused || activeFocusSession.viewState === "away-confirm";
        const runningUntil = isFrozen ? focusPausedAt : Date.now();
        return Math.max(0, Math.floor((runningUntil - focusStartedAt - focusPausedMs) / 1000));
      }

      async function updateFocusSessionClock() {
        if (!activeFocusSession || activeFocusSession.viewState === "result") return;
        const targetSeconds = focusTargetSeconds();
        const elapsed = currentFocusElapsedSeconds();
        const displayElapsed = Math.min(elapsed, targetSeconds);
        const remaining = Math.max(0, targetSeconds - displayElapsed);
        const progress = Math.min(100, Math.round(displayElapsed / targetSeconds * 100));
        activeFocusSession.lastProgress = progress;
        document.querySelectorAll("[data-focus-countdown]").forEach((node) => {
          node.textContent = formatClock(remaining);
        });
        document.querySelectorAll("[data-focus-progress]").forEach((node) => {
          node.style.setProperty("--focus-progress", `${progress}%`);
        });
        document.querySelectorAll("[data-focus-percent]").forEach((node) => {
          node.textContent = `${progress}%`;
        });
        persistFocusSession();
        if (
          activeFocusSession.viewState === "running" &&
          !activeFocusSession.finishing &&
          elapsed >= targetSeconds
        ) {
          await completeFocusSession("natural");
        }
      }

      function startFocusTicker() {
        clearInterval(focusTimerId);
        updateFocusSessionClock();
        focusTimerId = setInterval(() => {
          updateFocusSessionClock();
        }, 1000);
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
        const activePlanTypes = activeData?.plan?.types || [];
        const fallbackTasks = activePlanTypes.map((type) => ({
          typeId: type.typeId,
          typeName: displayTaskName(type.title),
          disabled: activePlanTypes.length <= 1,
        }));
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
          classMemberCount: room.classMemberCount || room.onlineCount || 128,
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

      function stopStudyRoomAutoRefresh() {
        clearInterval(studyRoomRefreshTimerId);
        studyRoomRefreshTimerId = null;
      }

      function startStudyRoomAutoRefresh() {
        if (isExperienceMode) return;
        if (!activeUser || studyRoomRefreshTimerId) return;
        refreshStudyRoomData();
      }

      function formatHourDuration(minutes) {
        return `${(minutes / 60).toFixed(1)}h`;
      }

      function updateFocusDurationDisplay(minutes) {
        const value = Math.max(10, Math.min(180, Number(minutes) || 45));
        const time = document.querySelector("[data-focus-minutes]");
        if (time) time.textContent = `${String(value).padStart(2, "0")}:00`;
        return value;
      }

      function setCustomDurationSheetOpen(isOpen) {
        const sheet = document.querySelector("#customDurationSheet");
        if (!sheet) return;
        sheet.hidden = !isOpen;
        sheet.classList.toggle("active", isOpen);
        document.querySelector("#appShell")?.classList.toggle("custom-duration-open", isOpen);
      }

      function activateCustomDuration(minutes) {
        const value = updateFocusDurationDisplay(minutes);
        const customButton = document.querySelector('[data-duration="custom"]');
        document.querySelectorAll("#studyRoomView .duration-option").forEach((button) => button.classList.remove("active"));
        customButton?.classList.add("active");
        if (customButton) {
          customButton.textContent = formatHourDuration(value);
          customButton.dataset.customMinutes = String(value);
        }
        document.querySelector(".focus-duration-options")?.classList.add("is-custom");
        document.querySelectorAll("#studyRoomView .custom-duration-choice").forEach((button) => {
          button.classList.toggle("active", Number(button.dataset.customDuration) === value);
        });
      }

      async function searchSchools(query = "") {
        const results = document.querySelector("#schoolResults");
        if (!results) return;
        results.innerHTML = `<div class="school-result">正在搜索...</div>`;
        try {
          const data = await apiRequest(`/institutions/search?q=${encodeURIComponent(query)}&limit=20`);
          results.innerHTML = data.items.length
            ? data.items.map((school) => {
              const schoolId = school.schoolId || school.id || "";
              const schoolTags = Array.isArray(school.tags)
                ? school.tags
                : String(school.tags || "").split(",").filter(Boolean);
              return `
              <button class="school-result" type="button" data-school-id="${escapeHtml(schoolId)}">
                ${escapeHtml(school.name)}
                <span>${escapeHtml(school.province || "")} ${escapeHtml(schoolTags.join(" · "))}</span>
              </button>
            `;
            }).join("")
            : `<div class="school-result">没有找到匹配院校</div>`;
        } catch (error) {
          results.innerHTML = `<div class="school-result">搜索失败，请确认后端服务正在运行</div>`;
        }
      }

      function selectedFocusConfig() {
        const activeDuration = document.querySelector(".duration-option.active")?.dataset.duration || "45";
        let focusMinutes = activeDuration === "custom"
          ? Number(document.querySelector('[data-duration="custom"]')?.dataset.customMinutes || 60)
          : Number(activeDuration);
        focusMinutes = Math.max(10, Math.min(180, focusMinutes || 45));
        const room = studyRoomModel(activeStudyRoom);
        const defaultTask = room.taskOptions[0] || {};
        const taskTypeId = room.currentTaskTypeId || defaultTask.typeId || "";
        const taskName = displayTaskName(room.currentTaskName || defaultTask.typeName || "今日数学任务");
        const dailyTargetMinutes = room.targetMinutes || Math.round((room.targetHours || 3) * 60);
        return { focusMinutes, taskTypeId, taskName, dailyTargetMinutes };
      }

      async function beginFocusSession() {
        const room = studyRoomModel(activeStudyRoom);
        const config = selectedFocusConfig();
        if (isExperienceMode) {
          showExperienceNotice("体验模式不会记录自习时长，正式学员登录后可开始专注。");
          return;
        }
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
        focusStartedAt = Date.now();
        focusPausedAt = 0;
        focusPausedMs = 0;
        clearTimeout(focusResultReturnTimerId);
        clearInterval(focusResultCountdownTimerId);
        focusResultCountdownTimerId = null;
        activeFocusSession = {
          ...session,
          targetMinutes: config.focusMinutes,
          taskName: displayTaskName(session.taskName || config.taskName),
          startedAtMs: focusStartedAt,
          paused: false,
          viewState: "running",
          pendingAwaySeconds: 0,
          awayStartedAtMs: 0,
          finishing: false,
        };
        renderActiveFocusSessionPage();
        setFocusShellActive(true);
        showView("studyRoomView");
        window.scrollTo({ top: 0, behavior: "instant" });
        persistFocusSession();
        startFocusTicker();
      }

      async function toggleFocusPause() {
        if (isExperienceMode) {
          showExperienceNotice("体验模式不会记录自习时长，正式学员登录后可开始专注。");
          return;
        }
        if (!activeFocusSession || activeFocusSession.viewState !== "running") return;
        const pauseIcon = document.querySelector("[data-focus-pause-icon]");
        const pauseLabel = document.querySelector("[data-focus-pause-label]");
        if (!activeFocusSession.paused) {
          activeFocusSession.paused = true;
          focusPausedAt = Date.now();
          if (activeFocusSession.sessionId) {
            await apiRequest(`/focus-sessions/${activeFocusSession.sessionId}/pause`, { method: "POST" });
          }
          if (pauseIcon) pauseIcon.textContent = "▶";
          if (pauseLabel) pauseLabel.textContent = "继续";
          updateFocusSessionClock();
          persistFocusSession();
          return;
        }
        activeFocusSession.paused = false;
        focusPausedMs += Date.now() - focusPausedAt;
        focusPausedAt = 0;
        if (activeFocusSession.sessionId) {
          await apiRequest(`/focus-sessions/${activeFocusSession.sessionId}/resume`, { method: "POST" });
        }
        if (pauseIcon) pauseIcon.textContent = "Ⅱ";
        if (pauseLabel) pauseLabel.textContent = "暂停";
        updateFocusSessionClock();
        persistFocusSession();
      }

      async function refreshFocusDataFromFinishResult(result) {
        if (result.studyRoom) {
          activeStudyRoom = { studyRoom: result.studyRoom };
        } else if (activeUser) {
          activeStudyRoom = await apiRequest(`/students/${activeUser.userId}/study-room?date=${activePlanDate}`);
        }
        if (result.profile) {
          activeProfile = result.profile;
        } else if (activeUser) {
          activeProfile = await apiRequest(`/students/${activeUser.userId}/profile?date=${activePlanDate}`);
        }
        if (result.curve) {
          activeCurve = result.curve;
        } else if (activeUser) {
          activeCurve = await apiRequest(`/students/${activeUser.userId}/curve?date=${activePlanDate}`);
        }
        if (result.rankings) {
          activeRankings = result.rankings;
        } else if (activeUser) {
          activeRankings = await apiRequest(`/students/${activeUser.userId}/rankings?date=${activePlanDate}`);
        }
        renderCurve(activeCurve);
        renderProfile(activeProfile, activeRankings, activeNotifications);
      }

      function showFocusResult(reason, sessionResult) {
        if (!activeFocusSession) return;
        activeFocusSession.viewState = "result";
        activeFocusSession.resultReturnSeconds = Math.ceil(FOCUS_RESULT_RETURN_MS / 1000);
        activeFocusSession.result = {
          reason,
          countedMinutes: Number(sessionResult.countedMinutes || 0),
          focusedSeconds: Number(sessionResult.focusedSeconds || 0),
        };
        renderActiveFocusSessionPage();
        clearFocusSessionSnapshot();
        clearTimeout(focusResultReturnTimerId);
        startFocusResultCountdown();
        focusResultReturnTimerId = setTimeout(returnFromFocusResult, FOCUS_RESULT_RETURN_MS);
      }

      function startFocusResultCountdown() {
        clearInterval(focusResultCountdownTimerId);
        const returnAt = Date.now() + FOCUS_RESULT_RETURN_MS;
        const tick = () => {
          if (!activeFocusSession || activeFocusSession.viewState !== "result") {
            clearInterval(focusResultCountdownTimerId);
            focusResultCountdownTimerId = null;
            return;
          }
          const seconds = Math.max(1, Math.ceil((returnAt - Date.now()) / 1000));
          activeFocusSession.resultReturnSeconds = seconds;
          document.querySelectorAll("[data-focus-return-count]").forEach((node) => {
            node.textContent = String(seconds);
          });
        };
        tick();
        focusResultCountdownTimerId = setInterval(tick, 250);
      }

      function returnFromFocusResult() {
        clearTimeout(focusResultReturnTimerId);
        clearInterval(focusResultCountdownTimerId);
        focusResultCountdownTimerId = null;
        stopFocusTicker();
        activeFocusSession = null;
        focusStartedAt = 0;
        focusPausedAt = 0;
        focusPausedMs = 0;
        clearFocusSessionSnapshot();
        setFocusShellActive(false);
        renderStudyRoom(activeStudyRoom);
        showView("studyRoomView");
        window.scrollTo({ top: 0, behavior: "instant" });
      }

      async function completeFocusSession(reason) {
        if (isExperienceMode) {
          showExperienceNotice("体验模式不会记录自习时长，正式学员登录后可开始专注。");
          return;
        }
        if (!activeFocusSession || activeFocusSession.finishing) return;
        activeFocusSession.finishing = true;
        stopFocusTicker();
        const focusedSeconds = Math.min(currentFocusElapsedSeconds(), focusTargetSeconds());
        try {
          let result = {
            session: {
              focusedSeconds,
              countedMinutes: countedFocusMinutes(focusedSeconds),
            },
          };
          if (activeFocusSession.sessionId) {
            result = await apiRequest(`/focus-sessions/${activeFocusSession.sessionId}/finish`, {
              method: "POST",
              body: JSON.stringify({ focusedSeconds }),
            });
          }
          await refreshFocusDataFromFinishResult(result);
          showFocusResult(reason, result.session);
        } catch (error) {
          activeFocusSession.finishing = false;
          activeFocusSession.viewState = "running";
          renderActiveFocusSessionPage();
          startFocusTicker();
          const exitButton = document.querySelector("[data-focus-finish]");
          if (exitButton) exitButton.textContent = error.message || "记录失败，请重试";
        }
      }

      async function finishFocusSession() {
        if (!activeFocusSession || activeFocusSession.viewState !== "running") return;
        await completeFocusSession("early-exit");
      }

      function handleFocusVisibilityChange() {
        if (!activeFocusSession || activeFocusSession.viewState === "result") return;
        if (activeFocusSession.paused) return;
        if (document.hidden) {
          activeFocusSession.awayStartedAtMs = Date.now();
          persistFocusSession();
          return;
        }
        if (!activeFocusSession.awayStartedAtMs) return;
        const awaySeconds = Math.max(0, Math.floor((Date.now() - activeFocusSession.awayStartedAtMs) / 1000));
        activeFocusSession.awayStartedAtMs = 0;
        if (awaySeconds < FOCUS_AWAY_CONFIRM_SECONDS) {
          updateFocusSessionClock();
          return;
        }
        activeFocusSession.pendingAwaySeconds = awaySeconds;
        activeFocusSession.viewState = "away-confirm";
        focusPausedAt = Date.now();
        stopFocusTicker();
        renderActiveFocusSessionPage();
        persistFocusSession();
      }

      function handleVisibilityChange() {
        handleFocusVisibilityChange();
        if (
          !document.hidden &&
          !isExperienceMode &&
          activeUser &&
          !document.querySelector("#studyRoomView")?.hidden
        ) {
          refreshStudyRoomData();
        }
      }

      async function resolveFocusAway(shouldCountAway) {
        if (!activeFocusSession || activeFocusSession.viewState !== "away-confirm") return;
        const confirmationPausedMs = focusPausedAt ? Date.now() - focusPausedAt : 0;
        focusPausedMs += Math.max(0, confirmationPausedMs);
        if (!shouldCountAway) {
          focusPausedMs += Math.max(0, Number(activeFocusSession.pendingAwaySeconds || 0)) * 1000;
        }
        activeFocusSession.pendingAwaySeconds = 0;
        activeFocusSession.viewState = "running";
        focusPausedAt = 0;
        renderActiveFocusSessionPage();
        if (currentFocusElapsedSeconds() >= focusTargetSeconds()) {
          await completeFocusSession("away-complete");
          return;
        }
        persistFocusSession();
        startFocusTicker();
      }

      function restoreFocusSessionFromSnapshot() {
        const raw = window.sessionStorage.getItem(FOCUS_STORAGE_KEY);
        if (!raw || activeFocusSession) return;
        let snapshot;
        try {
          snapshot = JSON.parse(raw);
        } catch (error) {
          clearFocusSessionSnapshot();
          return;
        }
        if (!snapshot?.activeFocusSession?.sessionId) {
          clearFocusSessionSnapshot();
          return;
        }
        activeUser = snapshot.activeUser || activeUser;
        activePlanDate = snapshot.activePlanDate || activePlanDate;
        activeFocusSession = {
          ...snapshot.activeFocusSession,
          viewState: snapshot.activeFocusSession.viewState === "away-confirm" ? "running" : snapshot.activeFocusSession.viewState,
          pendingAwaySeconds: 0,
          awayStartedAtMs: 0,
          finishing: false,
        };
        focusStartedAt = Number(snapshot.focusStartedAt || activeFocusSession.startedAtMs || Date.now());
        focusPausedAt = Number(snapshot.focusPausedAt || 0);
        focusPausedMs = Number(snapshot.focusPausedMs || 0);
        if (snapshot.activeFocusSession.viewState === "away-confirm") {
          focusPausedMs += Math.max(0, Number(snapshot.activeFocusSession.pendingAwaySeconds || 0)) * 1000;
          focusPausedAt = 0;
        }
        if (snapshot.activeFocusSession.awayStartedAtMs) {
          focusPausedMs += Math.max(0, Date.now() - Number(snapshot.activeFocusSession.awayStartedAtMs || 0));
        }
        renderActiveFocusSessionPage();
        setFocusShellActive(true);
        showView("studyRoomView");
        startFocusTicker();
      }

      if (hasStaticAppData) {
        renderPlan(appData);
        renderCurve(appData);
        renderStudyRoom(appData);
        renderProfile(appData, activeRankings, activeNotifications);
      }

      const navButtons = document.querySelectorAll(".nav-item");
      const views = document.querySelectorAll(".view");

      function showView(viewId) {
        const navViewId = viewId === "questionPreviewView" ? "myView" : viewId;
        const targetButton = [...navButtons].find((item) => item.dataset.view === navViewId);
        document.querySelector("#appShell")?.classList.toggle(
          "question-preview-active",
          viewId === "questionPreviewView"
        );
        navButtons.forEach((item) => item.classList.toggle("active", item === targetButton));
        views.forEach((view) => {
          view.hidden = view.id !== viewId;
        });
        if (viewId === "studyRoomView") {
          startStudyRoomAutoRefresh();
          refreshStudyRoomData();
        } else {
          stopStudyRoomAutoRefresh();
        }
        if (viewId === "curveView") {
          refreshCurveData();
          requestAnimationFrame(() => {
            window.refreshMasteryCarouselFocus?.();
          });
        }
        if (viewId === "myView") {
          refreshProfileData();
        }
      }

      navButtons.forEach((button) => {
        button.addEventListener("click", () => {
          showView(button.dataset.view);
          window.scrollTo({ top: 0, behavior: "instant" });
        });
      });

      const requestedView = new URLSearchParams(window.location.search).get("view");
      if (requestedView === "plan") showView("planView");
      if (requestedView === "curve") showView("curveView");
      if (requestedView === "studyRoom") showView("studyRoomView");
      if (requestedView === "my") showView("myView");
      restoreFocusSessionFromSnapshot();

      document.querySelector("#experienceLoginButton")?.addEventListener("click", () => {
        try {
          setLoginMessage("正在进入体验预览...", true);
          startExperienceMode();
          setLoginMessage("");
        } catch (error) {
          setLoginMessage(error.message || "体验数据加载失败");
        }
      });

      const passwordInput = document.querySelector("#loginPassword");
      const passwordToggle = document.querySelector(".login-password-eye");
      if (passwordInput && passwordToggle) {
        passwordToggle.addEventListener("click", () => {
          const shouldShow = passwordInput.type === "password";
          passwordInput.type = shouldShow ? "text" : "password";
          passwordToggle.classList.toggle("is-visible", shouldShow);
          passwordToggle.setAttribute("aria-pressed", String(shouldShow));
          passwordToggle.setAttribute("aria-label", shouldShow ? "隐藏密码" : "显示密码");
          try {
            passwordInput.focus({ preventScroll: true });
          } catch (error) {
            passwordInput.focus();
          }
        });
      }

      restoreStudentSession();

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

      document.addEventListener("input", (event) => {
        if (event.target.matches("#schoolSearchInput")) {
          clearTimeout(schoolSearchTimer);
          const query = event.target.value.trim();
          schoolSearchTimer = setTimeout(() => searchSchools(query), 180);
        }
      });

      document.addEventListener("change", async (event) => {
        if (event.target.matches("[data-question-preview-chapter]")) {
          const chapterId = event.target.value;
          const types = questionPreviewTypesForChapter(chapterId);
          const typeId = types[0]?.typeId || "";
          questionPreviewState = {
            ...questionPreviewState,
            selectedChapterId: chapterId,
            selectedTypeId: typeId,
            detail: null,
            error: "",
          };
          renderQuestionPreviewState();
          await loadQuestionPreviewType(typeId);
          return;
        }
        if (event.target.matches("[data-question-preview-type]")) {
          await loadQuestionPreviewType(event.target.value);
        }
      });

      document.addEventListener("click", async (event) => {
        if (event.target.closest("[data-question-preview-open]")) {
          await openQuestionPreview();
          return;
        }

        if (event.target.closest("[data-question-preview-back]")) {
          questionPreviewRequestId += 1;
          showView("myView");
          window.scrollTo({ top: 0, behavior: "instant" });
          return;
        }

        if (event.target.closest("[data-question-preview-retry]")) {
          if (!questionPreviewState.options) {
            await openQuestionPreview();
          } else {
            await loadQuestionPreviewType(questionPreviewState.selectedTypeId);
          }
          return;
        }

        if (event.target.closest("[data-open-notifications]")) {
          try {
            await openNotificationSheet();
          } catch (error) {
            showExperienceNotice(error.message || "消息加载失败");
          }
          return;
        }

        if (event.target.closest("[data-close-notifications]")) {
          closeNotificationSheet();
          return;
        }

        if (event.target.closest("[data-unattempted-close]")) {
          closeUnattemptedSheet();
          return;
        }

        const unattemptedActionButton = event.target.closest("[data-unattempted-action]");
        if (unattemptedActionButton) {
          if (!pendingFeedbackSubmission) {
            closeUnattemptedSheet();
            return;
          }
          const sheet = document.querySelector("#unattemptedSheet");
          const sheetMessage = document.querySelector("#unattemptedSheetMessage");
          sheet?.querySelectorAll("button").forEach((button) => {
            button.disabled = true;
          });
          if (sheetMessage) sheetMessage.textContent = "正在提交反馈...";
          try {
            await submitFeedbackAnswers(
              pendingFeedbackSubmission.answers,
              unattemptedActionButton.dataset.unattemptedAction
            );
            closeUnattemptedSheet();
          } catch (error) {
            if (sheetMessage) sheetMessage.textContent = error.message || "反馈提交失败";
            sheet?.querySelectorAll("button").forEach((button) => {
              button.disabled = false;
            });
          }
          return;
        }

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

        if (event.target.closest("[data-go-plan]")) {
          showView("planView");
          window.scrollTo({ top: 0, behavior: "instant" });
          return;
        }

        if (event.target.closest("[data-show-extra-practice]")) {
          if (!activeData?.plan) return;
          activeData = {
            ...activeData,
            plan: {
              ...activeData.plan,
              showExtraPractice: true,
            },
          };
          renderPlan(activeData);
          document.querySelector(".extra-practice-card")?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });
          return;
        }

        const profileLeaderBoardButton = event.target.closest("[data-profile-leader-board]");
        if (profileLeaderBoardButton) {
          if (typeof setProfileLeaderBoardKey === "function") {
            setProfileLeaderBoardKey(profileLeaderBoardButton.dataset.profileLeaderBoard);
          }
          renderProfile(activeProfile || activeData, activeRankings, activeNotifications);
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
          if (isExperienceMode) {
            document.querySelector("#schoolSearchModal")?.classList.remove("active");
            showExperienceNotice("体验模式不会保存目标院校，正式学员登录后可修改。");
            return;
          }
          const result = await apiRequest(`/students/${activeUser.userId}/target-school`, {
            method: "POST",
            body: JSON.stringify({ schoolId: schoolButton.dataset.schoolId }),
          });
          activeProfile = result;
          renderProfile(activeProfile, activeRankings, activeNotifications);
          return;
        }

        if (event.target.closest("[data-close-custom-duration]")) {
          setCustomDurationSheetOpen(false);
          return;
        }

        const customDurationChoice = event.target.closest("[data-custom-duration]");
        if (customDurationChoice) {
          activateCustomDuration(customDurationChoice.dataset.customDuration);
          setCustomDurationSheetOpen(false);
          return;
        }

        const durationButton = event.target.closest("[data-duration]");
        if (durationButton) {
          const durationOptions = durationButton.closest(".focus-duration-options");
          document.querySelectorAll("#studyRoomView .duration-option").forEach((button) => button.classList.remove("active"));
          durationButton.classList.add("active");
          if (durationButton.dataset.duration === "custom") {
            durationOptions?.classList.add("is-custom");
            activateCustomDuration(durationButton.dataset.customMinutes || 60);
            setCustomDurationSheetOpen(true);
            return;
          }
          durationOptions?.classList.remove("is-custom");
          setCustomDurationSheetOpen(false);
          updateFocusDurationDisplay(durationButton.dataset.duration);
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

        if (event.target.closest("[data-focus-away-count]")) {
          await resolveFocusAway(true);
          return;
        }

        if (event.target.closest("[data-focus-away-deduct]")) {
          await resolveFocusAway(false);
          return;
        }

        if (event.target.closest("[data-focus-return]")) {
          returnFromFocusResult();
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
          if (answers.some((item) => item.result === "unattempted")) {
            showUnattemptedSheet(answers);
            feedbackMessage.textContent = "请先选择未作题目的处理方式";
            return;
          }
          try {
            await submitFeedbackAnswers(answers);
          } catch (error) {
            feedbackMessage.textContent = error.message || "反馈提交失败";
          }
        }
      });

      document.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener("pagehide", () => {
        persistFocusSession();
      });

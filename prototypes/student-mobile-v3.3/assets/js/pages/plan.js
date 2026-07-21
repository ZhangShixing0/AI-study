      function displaySourceQuestionNumber(value) {
        const text = String(value ?? "").trim();
        const parsed = globalThis.TodayPlanSourceFormatting?.parseSourceItem?.("", text);
        if (parsed?.questionNumber) return parsed.questionNumber;
        const match = text.match(/^第\s*(.+?)\s*题$/);
        if (match) return match[1].trim();
        const tailMatch = text.match(/第\s*([0-9]+(?:[（(][^)）]+[）)])?(?:\s*[~～-]\s*[0-9]+(?:[（(][^)）]+[）)])?)?)\s*题$/);
        return tailMatch ? tailMatch[1].trim() : text;
      }

      function renderSourceRows(type) {
        const groups = Array.isArray(type.sourceGroups) ? type.sourceGroups : [];
        const isPurple = type.theme === "purple";
        const bookIcon = isPurple ? "assets/icons/Purple1.svg" : "assets/icons/green1.svg";
        const bookColorClass = isPurple ? "source-book-name-purple" : "source-book-name-green";
        const entrySourceMeta = (entry) => {
          const firstNumber = Array.isArray(entry.numbers) ? entry.numbers[0] : "";
          const raw = firstNumber || entry.title || entry.continuationTitle || "";
          return globalThis.TodayPlanSourceFormatting?.parseSourceItem?.("", raw) || null;
        };
        const joinNumbers = (numbers) => numbers
          .map((number, numberIndex) => `<span class="source-question-number">${escapeHtml(displaySourceQuestionNumber(number))}${numberIndex < numbers.length - 1 ? "、" : ""}</span>`)
          .join("");
        const taskLabelFor = (entry) => {
          const parsed = entrySourceMeta(entry);
          const label = String(entry.questionTypeShort || entry.questionTypeLabel || parsed?.questionTypeShort || parsed?.questionTypeLabel || "").replace(/题$/, "");
          return label || "题号";
        };
        const taskLabelSuffixFor = () => "";
        const sectionTitleFor = (entry) => {
          const parsed = entrySourceMeta(entry);
          const chapter = String(entry.chapterLabel || parsed?.chapterLabel || "").trim();
          const phase = String(entry.phaseLabel || parsed?.phaseLabel || "").trim();
          return [chapter, phase].filter(Boolean).join(" · ") || "题目";
        };
        const sectionEntriesFor = (entries) => {
          const sections = [];
          const sectionMap = new Map();
          entries.forEach((entry) => {
            const parsed = entrySourceMeta(entry);
            const key = [
              entry.chapterLabel || parsed?.chapterLabel || "",
              entry.phaseLabel || parsed?.phaseLabel || "",
            ].join("|");
            if (!sectionMap.has(key)) {
              const section = {
                title: sectionTitleFor(entry),
                entries: [],
                entryMap: new Map(),
              };
              sectionMap.set(key, section);
              sections.push(section);
            }
            const section = sectionMap.get(key);
            const numbers = Array.isArray(entry.numbers) ? entry.numbers.filter(Boolean) : [];
            if (!numbers.length) {
              section.entries.push(entry);
              return;
            }
            const taskKey = taskLabelFor(entry);
            if (!section.entryMap.has(taskKey)) {
              const mergedEntry = {
                ...entry,
                numbers: [],
              };
              section.entryMap.set(taskKey, mergedEntry);
              section.entries.push(mergedEntry);
            }
            section.entryMap.get(taskKey).numbers.push(...numbers);
          });
          return sections;
        };
        const renderSourceText = (text) => {
          const raw = String(text || "");
          const match = raw.match(/^(《[^》]+》)\s*(.*)$/);
          if (!match) return `<span class="source-book-desc">${escapeHtml(raw)}</span>`;
          const descText = String(match[2] || "").trimStart();
          const cleanDesc = descText.startsWith(match[1])
            ? descText.slice(match[1].length).trimStart()
            : descText;
          return `
                    <span class="source-book-name ${bookColorClass}">${escapeHtml(match[1])}</span>
                    <span class="source-book-desc">${escapeHtml(cleanDesc ? ` ${cleanDesc}` : "")}</span>
                  `;
        };

        if (groups.length) {
          return groups.map((group) => {
            const entries = Array.isArray(group.entries) && group.entries.length
              ? group.entries
              : [group];
            const sections = sectionEntriesFor(entries);
            return `
                  <div class="source-row source-book-row source-book-card">
                    <div class="source-book-header">
                      <img class="source-book-icon" src="${bookIcon}" alt="" aria-hidden="true" />
                      <strong class="source-book-name ${bookColorClass}">${escapeHtml(group.sourceLabel || "")}</strong>
                    </div>
                    <div class="source-book-sections">
                      ${sections.map((section) => `
                        <div class="source-chapter-group">
                          <div class="source-chapter-title">${escapeHtml(section.title)}</div>
                          <div class="source-task-list">
                            ${section.entries.map((entry) => {
                              const numbers = Array.isArray(entry.numbers) ? entry.numbers : [];
                              return `
                                <div class="source-task-row">
                                  <span class="source-task-label">${escapeHtml(taskLabelFor(entry))}${escapeHtml(taskLabelSuffixFor(entry))}</span>
                                  <span class="source-task-numbers">${numbers.length ? joinNumbers(numbers) : "—"}</span>
                                </div>
                              `;
                            }).join("")}
                          </div>
                        </div>
                      `).join("")}
                    </div>
                  </div>
                `;
          }).join("");
        }

        const sources = Array.isArray(type.sources) ? type.sources : [];
        return sources.map((source, index) => `
                  <div class="source-row">
                    <img class="source-book-icon" src="${bookIcon}" alt="" aria-hidden="true" />
                    <span class="source-inline-text">${renderSourceText(source)}</span>
                    <img src="assets/icons/icon-arrow-right.svg" alt="" />
                  </div>
                `).join("");
      }

      function typeSummary(type) {
        const summary = type.summary || {};
        if (summary.title || summary.body) {
          return summary;
        }
        return {
          title: "重点｜今日核心题型",
          body: "先抓题型方法，再核对易错条件和计算细节，完成后及时提交做题反馈。",
        };
      }

      const FALLBACK_EXTRA_PRACTICE_SETS = {
        "G-01-Z-01": {
          sourceName: "1000",
          chapterLabel: "第一章",
          phaseLabel: "基础巩固",
          questionTypeLabel: "选择题",
          questionTypeShort: "选择",
          numbers: ["21", "22", "26"],
        },
        "G-01-Z-02": {
          sourceName: "1000",
          chapterLabel: "第一章",
          phaseLabel: "基础巩固",
          questionTypeLabel: "选择题",
          questionTypeShort: "选择",
          numbers: ["31", "34", "36"],
        },
      };

      function fallbackExtraPracticeSet(type, index) {
        if (FALLBACK_EXTRA_PRACTICE_SETS[type.typeId]) {
          return FALLBACK_EXTRA_PRACTICE_SETS[type.typeId];
        }
        return {
          sourceName: "1000",
          chapterLabel: "备选加练",
          phaseLabel: "",
          questionTypeLabel: "题号",
          questionTypeShort: "题号",
          numbers: [1, 2, 3].map((order) => String(40 + index * 10 + order)),
        };
      }

      function extraPracticeSourceGroups(set) {
        return [
          {
            sourceName: set.sourceName,
            sourceLabel: `《${set.sourceName}》`,
            entries: [
              {
                chapterLabel: set.chapterLabel,
                phaseLabel: set.phaseLabel,
                questionTypeLabel: set.questionTypeLabel,
                questionTypeShort: set.questionTypeShort,
                numbers: set.numbers,
              },
            ],
          },
        ];
      }

      function extraPracticeQuestions(type, set) {
        return set.numbers.map((number, numberIndex) => ({
          questionId: `${set.sourceName}-${type.typeId || "extra"}-${number}`,
          label: `《${set.sourceName}》${set.chapterLabel}${set.phaseLabel}第${number}题`,
          order: numberIndex + 1,
        }));
      }

      function fallbackExtraPracticeFor(type, index) {
        const set = fallbackExtraPracticeSet(type, index);
        return {
          ...type,
          index: index + 1,
          cardLabel: `加练 ${index + 1}`,
          sourceTitle: "备选习题来源",
          hideSummary: true,
          sources: [],
          sourceGroups: extraPracticeSourceGroups(set),
          questions: extraPracticeQuestions(type, set),
        };
      }

      function extraPracticeTypesFor(plan) {
        if (Array.isArray(plan.extraPracticeTypes)) {
          const explicitTypes = plan.extraPracticeTypes;
          return explicitTypes.map((type, index) => {
            const hasSourceGroups = Array.isArray(type.sourceGroups) && type.sourceGroups.length;
            const fallbackSet = fallbackExtraPracticeSet(type, index);
            return {
              ...type,
              index: index + 1,
              cardLabel: type.cardLabel || `加练 ${index + 1}`,
              sourceTitle: type.sourceTitle || "备选习题来源",
              hideSummary: true,
              sources: hasSourceGroups ? type.sources : [],
              sourceGroups: hasSourceGroups ? type.sourceGroups : extraPracticeSourceGroups(fallbackSet),
              questions: Array.isArray(type.questions) && type.questions.length
                ? type.questions
                : extraPracticeQuestions(type, fallbackSet),
            };
          });
        }
        return (Array.isArray(plan.types) ? plan.types : []).map(fallbackExtraPracticeFor);
      }

      function renderTypeCard(type) {
        const summary = typeSummary(type);
        if (type.displayTypeLabel) {
          type = { ...type, cardTypeLabel: type.displayTypeLabel };
        }
        const typeLabel = type.cardTypeLabel || type.cardLabel || `题型 ${type.index}`;
        return `
          <article class="type-card ${type.theme === "purple" ? "theme-purple" : ""}">
            <div class="type-card-head">
              <div class="type-label">${escapeHtml(typeLabel)}</div>
              <h3 class="type-title">${escapeHtml(type.title)}</h3>
            </div>
            ${type.hideSummary ? "" : `
              <div class="type-summary">
                <div class="type-summary-title">${escapeHtml(summary.title)}</div>
                <div class="type-summary-body">${escapeHtml(summary.body)}</div>
              </div>
            `}
            <section class="source">
              <div class="source-head">
                <img class="source-header-icon" src="${type.theme === "purple" ? "assets/icons/Purple2.svg" : "assets/icons/green2.svg"}" alt="" aria-hidden="true" />
                <span>${escapeHtml(type.sourceTitle || "习题来源")}</span>
              </div>
              <div class="source-list">
                ${renderSourceRows(type)}
              </div>
            </section>
          </article>
        `;
      }

      function renderExtraPracticeCards(plan) {
        if (!plan.showExtraPractice) return "";
        const extraPracticeTypes = extraPracticeTypesFor(plan);
        if (!extraPracticeTypes.length) return "";
        return `
          <section class="extra-practice-card" aria-label="额外加练题目">
            ${extraPracticeTypes.map(renderTypeCard).join("")}
          </section>
        `;
      }

      function formatFeedbackDisplayLabel(label) {
        const formatter = window.TodayPlanSourceFormatting;
        return formatter?.formatFeedbackLabel(label) || label;
      }

      function statusIconForPlan(plan) {
        return plan.rawStatus === "completed"
          ? "assets/icons/icon-status-check-c1.svg"
          : "assets/icons/icon-feedback-pending-query.svg";
      }

      function reviewResultLabel(result) {
        return result === "correct" ? "正确" : result === "wrong" ? "错误" : "未作";
      }

      function renderReviewCard(plan) {
        const reviewItems = Array.isArray(plan.reviewItems) ? plan.reviewItems : [];
        const visibleItems = reviewItems.filter((item) => {
          const note = String(item.questionNote || "").trim();
          return note && item.result !== "unattempted";
        });
        if (!visibleItems.length) return "";

        return `
          <section class="daily-review-card">
            <div class="daily-review-head">
              <img src="assets/icons/feedback.svg" alt="" aria-hidden="true" />
              <div>
                <h2>今日题目复盘</h2>
                <p>只展示今天已做且有复盘笔记的题目</p>
              </div>
            </div>
            <div class="daily-review-list">
              ${visibleItems.map((item) => {
                const resultClass = item.result === "wrong" ? "is-wrong" : "is-correct";
                return `
                  <article class="daily-review-item">
                    <div class="daily-review-item-head">
                      <strong>${escapeHtml(formatFeedbackDisplayLabel(item.label || item.questionId))}</strong>
                      <span class="daily-review-status ${resultClass}">${escapeHtml(reviewResultLabel(item.result))}</span>
                    </div>
                    <p>${escapeHtml(item.questionNote)}</p>
                  </article>
                `;
              }).join("")}
            </div>
          </section>
        `;
      }

      function chapterSummaryValue(source, ...keys) {
        for (const key of keys) {
          const value = source?.[key];
          if (value !== undefined && value !== null && String(value).trim() !== "") {
            return value;
          }
        }
        return "";
      }

      function chapterSummaryText(value) {
        if (Array.isArray(value)) {
          return value.map((item) => String(item || "").trim()).filter(Boolean).join("、");
        }
        return String(value ?? "").trim();
      }

      function formatChapterSummaryPercent(value) {
        const text = chapterSummaryText(value);
        if (!text) return "—";
        if (text.includes("%")) return text;
        const number = Number(text);
        if (!Number.isFinite(number)) return text;
        const percent = number <= 1 ? number * 100 : number;
        return `${Math.round(percent)}%`;
      }

      function formatChapterSummaryDays(value) {
        const text = chapterSummaryText(value);
        if (!text) return "—";
        if (/[天小时分钟]/.test(text)) return text;
        const number = Number(text);
        if (!Number.isFinite(number)) return text;
        return `${number}天`;
      }

      function chapterSummaryItems(content) {
        const items = (Array.isArray(content) ? content : [content])
          .map(chapterSummaryText)
          .filter(Boolean);
        return items;
      }

      function chapterSummaryTitleHtml(title) {
        return escapeHtml(chapterSummaryText(title)).replace(/(总结)$/, '<span class="chapter-summary-title-tail">$1</span>');
      }

      function ChapterSummaryCard({
        title,
        subtitle,
        accuracy,
        days,
        lossReason,
        examInsight,
        coreAbility,
        commonMistakes,
        reviewAdvice,
      }) {
        const metrics = [
          {
            icon: "chapter-summary-icon-target.svg",
            label: "本章正确率",
            value: accuracy,
          },
          {
            icon: "chapter-summary-icon-calendar.svg",
            label: "本章用时",
            value: days,
          },
          {
            icon: "chapter-summary-icon-warning.svg",
            label: "主要失分原因",
            value: lossReason,
            wide: true,
          },
        ];
        const sections = [
          {
            icon: "chapter-summary-icon-clipboard.svg",
            title: "本章在真题中的考察",
            content: examInsight,
            highlight: true,
          },
          {
            icon: "chapter-summary-icon-star.svg",
            title: "核心能力",
            content: coreAbility,
          },
          {
            icon: "chapter-summary-icon-warning.svg",
            title: "常见失分点",
            content: commonMistakes,
            decor: true,
          },
          {
            icon: "chapter-summary-review-advice.svg",
            title: "复习建议",
            content: reviewAdvice,
          },
        ];
        const sectionHtml = sections.map((section) => {
          const items = chapterSummaryItems(section.content);
          if (!items.length) return "";
          return `
            <article class="chapter-summary-section ${section.highlight ? "is-highlight" : ""} ${section.decor ? "has-book-decor" : ""}">
              <div class="chapter-summary-section-icon" aria-hidden="true">
                <img src="assets/icons/${section.icon}" alt="" />
              </div>
              <div class="chapter-summary-section-body">
                <h3>${escapeHtml(section.title)}</h3>
                ${items.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}
              </div>
              ${section.decor ? `<img class="chapter-summary-book-stack" src="assets/icons/chapter-summary-book-stack.svg" alt="" aria-hidden="true" />` : ""}
            </article>
          `;
        }).join("");

        if (!chapterSummaryText(title) || !sectionHtml) return "";
        return `
          <section class="chapter-summary-card" aria-label="${escapeHtml(title)}">
            <img class="chapter-summary-open-book-decor" src="assets/icons/chapter-summary-open-book.svg" alt="" aria-hidden="true" />
            <div class="chapter-summary-head">
              <div class="chapter-summary-title-wrap">
                <div class="chapter-summary-kicker" aria-label="章节小结">
                  <img src="assets/icons/chapter-summary-badge.svg" alt="" aria-hidden="true" />
                </div>
                <h2>${chapterSummaryTitleHtml(title)}</h2>
                ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
                <i class="chapter-summary-title-line" aria-hidden="true"></i>
              </div>
            </div>
            <div class="chapter-summary-metrics">
              ${metrics.map((metric) => `
                <div class="chapter-summary-metric${metric.wide ? " is-wide" : ""}">
                  <div class="chapter-summary-metric-icon" aria-hidden="true">
                    <img src="assets/icons/${metric.icon}" alt="" />
                  </div>
                  <div class="chapter-summary-metric-copy">
                    <span>${escapeHtml(metric.label)}</span>
                    <strong>${escapeHtml(chapterSummaryText(metric.value) || "—")}</strong>
                  </div>
                </div>
              `).join("")}
            </div>
            <div class="chapter-summary-section-list">
              ${sectionHtml}
            </div>
          </section>
        `;
      }

      function renderChapterSummaryCard(plan) {
        const summary = plan.chapterSummary || plan.chapter_summary;
        if (!summary) return "";

        const chapterName = chapterSummaryText(chapterSummaryValue(summary, "chapterName", "chapter_name")) || "本章";
        const templateTitle = chapterSummaryText(chapterSummaryValue(summary, "summaryTitle", "summary_title"));
        const keyPoints = chapterSummaryValue(summary, "keyPoints", "key_points", "coreAbilities", "core_abilities");
        const commonMistakes = chapterSummaryValue(summary, "commonMistakes", "common_mistakes", "commonLossPoints", "common_loss_points");
        const reviewAdvice = chapterSummaryValue(summary, "reviewAdvice", "review_advice", "advice", "studyAdvice", "study_advice");
        const examTexts = [
          chapterSummaryValue(summary, "examWeightText", "exam_weight_text", "examFocusText", "exam_focus_text", "examFocus", "exam_focus"),
          chapterSummaryValue(summary, "examPatternText", "exam_pattern_text"),
        ].map(chapterSummaryText).filter(Boolean);

        return ChapterSummaryCard({
          title: `${chapterName} 总结`,
          subtitle: templateTitle && templateTitle !== `${chapterName} 总结` ? templateTitle : "",
          accuracy: formatChapterSummaryPercent(chapterSummaryValue(summary, "accuracyRate", "accuracy_rate")),
          days: formatChapterSummaryDays(chapterSummaryValue(summary, "spentDays", "spent_days")),
          lossReason: chapterSummaryText(chapterSummaryValue(summary, "mainLossReasons", "main_loss_reasons")) || "—",
          examInsight: examTexts,
          coreAbility: keyPoints,
          commonMistakes,
          reviewAdvice: reviewAdvice || "围绕本章错题先完成一次二刷，再把易混条件、常用方法和计算检查点整理到复习清单中。",
        });
      }

      function renderIncompleteCard() {
        return `
          <section class="incomplete-result-card">
            <div class="incomplete-result-kicker">已记录今日反馈</div>
            <h2>今日计划未完成</h2>
            <p>今天已经完成的题目反馈已保存，剩下未作的题目会在明天从当前题型继续安排。先稳住节奏，明天接着来。</p>
          </section>
        `;
      }

      function renderTestOnlyNextDayAction() {
        return "";
      }

      function renderPlan(data) {
        const planView = document.querySelector("#planView");
        const wrongReasons = [
          ["method_error", "方法错"],
          ["calculation_error", "计算错"],
          ["knowledge_gap", "知识点"],
          ["condition_missed", "条件漏"],
        ];
        const cards = data.plan.types.map(renderTypeCard).join("");

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

        const isExperienceMode = data.isExperienceMode === true;
        const feedbackSubmitText = "提交本题型反馈";
        const daysToExamText = data.plan.daysToExam === "xx" || isExperienceMode ? "xx" : data.plan.daysToExam;
        const isExpired = data.plan.rawStatus === "expired";
        const isCompleted = data.plan.rawStatus === "completed";
        const isBlockedByUnfinished = data.plan.rawStatus === "blocked_by_unfinished";
        const chapterSummaryCard = renderChapterSummaryCard(data.plan);
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
            <button class="more-practice-btn" type="button" data-show-extra-practice aria-expanded="${data.plan.showExtraPractice ? "true" : "false"}" ${data.plan.showExtraPractice ? "disabled" : ""}>
              ${data.plan.showExtraPractice ? "已加入加练题目" : "我还想做更多题目"}
            </button>
          </section>
          ${chapterSummaryCard}
          ${renderExtraPracticeCards(data.plan)}
          ${renderReviewCard(data.plan)}
        `
          : isBlockedByUnfinished
          ? `
          ${renderIncompleteCard()}
          ${renderReviewCard(data.plan)}
        `
          : `
            <div class="section-head">
            <div class="section-title">
              <img src="assets/icons/icon-section-plan-c1.svg" alt="" />
              <h2>今日做题清单</h2>
            </div>
            <div class="type-count">共 <strong>${data.plan.totalTypes}</strong> 个题型</div>
          </div>

          ${cards}

          <section class="feedback">
            <div class="feedback-head">
              <img class="feedback-icon" src="assets/icons/feedback.svg" alt="" aria-hidden="true" />
              <h2>做题反馈</h2>
              <div class="feedback-subtitle">（按顺序填写）</div>
              <button class="all-none" type="button" id="allNone">本题型全部未作</button>
            </div>
            <div class="feedback-list">${feedbackRows}</div>
            <div class="feedback-actions">
              <button class="submit-feedback" id="submitFeedback" type="button" ${data.plan.feedbackItems.length ? "" : "disabled"}>${feedbackSubmitText}</button>
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
              <button class="status-btn ${data.plan.rawStatus === "completed" ? "is-completed" : "is-pending"}" type="button"><img src="${statusIconForPlan(data.plan)}" alt="" />${escapeHtml(data.plan.status)}</button>
            </div>
      <img class="banner-student" src="assets/images/today-plan-banner-c1.jpg" alt="学生学习插画" />
            <div class="countdown">
              <div>
                <small>距考研</small>
                <strong>${daysToExamText}</strong>
                <span>天</span>
              </div>
            </div>
          </section>

          ${planMain}
        `;
      }

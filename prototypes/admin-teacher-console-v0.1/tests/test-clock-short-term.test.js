const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");

assert.ok(
  !source.includes("/api/test-clock"),
  "production admin console should not call the backend test clock"
);
assert.ok(
  source.includes("loadTestClock"),
  "admin console should centralize current-date loading"
);
assert.ok(
  source.includes("new Date().toISOString().slice(0, 10)") &&
    source.includes("DATA.today = clock.currentDate"),
  "admin console should derive DATA.today from the browser's real current date"
);
assert.ok(
  !source.includes("BroadcastChannel(\"ai-supervisor-test-clock\")"),
  "production admin console should not listen for student-side test-day notifications"
);
assert.ok(
  source.includes("getShortTermVisibleStatus"),
  "short-term accounts should have a visible-status helper"
);
assert.ok(
  source.includes("expiredGrace"),
  "short-term accounts should keep expired accounts visible during the 3-day grace period"
);
assert.ok(
  source.includes("shouldDelete"),
  "short-term accounts should hide accounts expired for more than 3 days"
);
assert.ok(
  source.includes("开通短期号"),
  "short-term account page should expose a create button"
);
assert.ok(
  source.includes("activate_short_term_account"),
  "short-term create button should use an explicit activation action"
);
assert.ok(
  source.includes("const account = target || state.shortTermSummary?.nextShortTermAccount || nextUnusedTrialAccount()?.loginAccount"),
  "short-term activation modal should display the same account as its operation target"
);
assert.ok(
  source.includes("/admin/short-term-accounts/activate-next"),
  "short-term create action should call the backend activation API"
);
assert.ok(
  source.includes("shortTermActivationResult"),
  "short-term activation should keep the returned password visible after creation"
);
assert.ok(
  source.includes("loadShortTermAccounts"),
  "short-term account page should load backend data through a dedicated loader"
);
assert.ok(
  source.includes("/admin/short-term-accounts?"),
  "short-term account page should request the backend list endpoint"
);
assert.ok(
  source.includes("state.shortTermLoaded = false"),
  "test-clock changes should invalidate cached short-term account data"
);
assert.ok(
  source.includes("studentDetail("),
  "short-term detail should reuse the shared student detail structure"
);
assert.ok(
  source.includes("data.formalDetail"),
  "short-term detail should feed the backend formalDetail payload into the shared detail renderer"
);
assert.ok(
  source.includes("userId: shortTermStudent.userId"),
  "short-term detail should preserve the selected short-term account identity"
);
assert.ok(
  source.includes("loadShortTermDetail(state.selectedTrialDetailId, true)"),
  "test-clock changes should reload the selected short-term detail"
);
assert.ok(
  source.includes("renderPendingShortTermDetail"),
  "pending short-term accounts should use a readonly pending detail panel"
);
assert.ok(
  source.includes('detailStudent.shortTermStatus === "pending_onboarding"'),
  "pending short-term detail should not render the generic editable student detail"
);
assert.ok(
  source.includes('if (state.view === "shortTerm")') && source.includes("await loadShortTermDetail(data.student.userId, true)"),
  "saving from the short-term detail page should refresh short-term list and selected detail"
);
assert.ok(
  source.includes("/admin/short-term-accounts/${apiSegment(target)}/migrate-to-formal"),
  "short-term migrate action should hit the backend migrate endpoint"
);
assert.ok(
  source.includes("/admin/short-term-accounts/${apiSegment(target)}/deactivate"),
  "short-term deactivate action should hit the backend deactivate endpoint"
);
assert.ok(
  !source.includes("cleanupExpiredShortTermAccounts();"),
  "short-term page should not perform front-end cleanup before rendering"
);
assert.ok(
  source.includes("startsAfterOnboarding"),
  "short-term activation should mark that the seven-day service starts after onboarding"
);
assert.ok(
  source.includes("首次填写资料后开始计算"),
  "short-term activation result should explain when the seven-day service starts"
);
assert.ok(
  source.includes("nextTrialConversionFormalAccount"),
  "trial conversion should use a dedicated 40001-59999 target pool"
);
assert.ok(
  source.includes("nextSequentialLoginAfterMaxInRange"),
  "trial conversion target pool should advance monotonically instead of backfilling gaps"
);
assert.ok(
  source.includes("短期转正式目标池"),
  "trial conversion UI should label the dedicated target pool clearly"
);

assert.ok(
  source.includes("const DEFAULT_PAGE_SIZE = 50"),
  "admin console pagination should default to 50 rows per page"
);

for (const pageKey of ["accounts", "students", "shortTerm", "audit", "expiry", "renewals", "abnormal", "feedback"]) {
  assert.ok(
    source.includes(`"${pageKey}"`),
    `pagination state should include ${pageKey}`
  );
  assert.ok(
    source.includes(`paginateRows("${pageKey}",`),
    `${pageKey} renderer should slice rows through shared pagination`
  );
  assert.ok(
    source.includes(`renderPagination("${pageKey}",`),
    `${pageKey} renderer should render the shared pagination footer`
  );
}

for (const helperName of [
  "createPaginationState",
  "paginationState",
  "paginationTotalPages",
  "clampPaginationPage",
  "paginateRows",
  "renderPagination",
  "resetPagination",
  "resetAllPagination",
  "setPaginationPage"
]) {
  assert.ok(
    source.includes(`function ${helperName}`),
    `admin console should define pagination helper ${helperName}`
  );
}

assert.ok(
  source.includes('data-page-action="prev"') && source.includes('data-page-action="next"'),
  "pagination footer should expose previous and next page controls"
);
assert.ok(
  source.includes("data-page-input"),
  "pagination footer should expose a page jump input"
);
assert.ok(
  source.includes("resetAllPagination();"),
  "global search and broad context switches should reset pagination"
);
assert.ok(
  source.includes('resetPagination("accounts")'),
  "account filters should reset account pagination"
);
assert.ok(
  source.includes('resetPagination("shortTerm")'),
  "short-term tab switches should reset short-term pagination"
);

assert.ok(
  source.includes("studentWrongQuestionExportUrl"),
  "student detail should centralize wrong-question export URL generation"
);
assert.ok(
  source.includes("/admin/students/${apiSegment(student.userId)}/wrong-questions.xlsx"),
  "student detail export should call the backend wrong-question xlsx endpoint"
);
assert.ok(
  source.includes("${ADMIN_API_BASE}/admin/students/${apiSegment(student.userId)}/wrong-questions.xlsx"),
  "student detail export should use the configured admin API base URL"
);
assert.ok(
  source.includes("data-wrong-question-export"),
  "student detail should expose a wrong-question export download control"
);
assert.ok(
  source.includes("download>导出错题清单") || source.includes("data-wrong-question-export download"),
  "student detail export should be a download control with the export label"
);

console.log("admin test clock and short-term account contract ok");

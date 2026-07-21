const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(
  path.join(__dirname, "../assets/js/pages/profile.js"),
  "utf8"
);

const myView = { innerHTML: "" };
const context = {
  activeData: {
    student: {
      userId: "60001",
      name: "张家界",
      mathType: "数学二",
    },
    plan: {
      planDate: "2026-06-29",
      daysToExam: 173,
      types: [],
    },
  },
  document: {
    querySelector(selector) {
      return selector === "#myView" ? myView : null;
    },
  },
  escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  },
};

vm.runInNewContext(source, context);

const podiumHtml = () => {
  const match = myView.innerHTML.match(/<div class="leader-podium">([\s\S]*?)<\/div>\s*<div class="leader-me-card">/);
  return match ? match[1] : "";
};

context.setProfileLeaderBoardKey("today");
context.renderProfile(
  {
    profile: {
      userId: "60001",
      nickname: "张家界",
      avatarUrl: "assets/images/avatars/user/current-user.webp",
      todayStudyHours: 0,
    },
  },
  {
    summary: { todayRank: 1, continuousRank: 1 },
    boards: {
      today: {
        top: [],
        rows: [
          {
            userId: "60001",
            name: "张家界",
            isMe: true,
            rank: 1,
            todayStudyHours: 0,
            metric: "专注0h",
          },
        ],
        myRank: 1,
      },
    },
  }
);

let podium = podiumHtml();
assert.equal((podium.match(/study-room-fillers/g) || []).length, 3);
assert.equal((podium.match(/专注1h/g) || []).length, 3);
assert.ok(!podium.includes("专注8h"));
assert.ok(!podium.includes("current-user.webp"));

context.renderProfile(
  {
    profile: {
      userId: "60001",
      nickname: "张家界",
      avatarUrl: "assets/images/avatars/user/current-user.webp",
      todayStudyHours: 1,
    },
  },
  {
    summary: { todayRank: 1 },
    boards: {
      today: {
        top: [
          {
            userId: "60001",
            name: "张家界",
            isMe: true,
            rank: 1,
            todayStudyHours: 1,
            avatarUrl: "assets/images/avatars/user/current-user.webp",
          },
        ],
        rows: [],
        myRank: 1,
      },
    },
  }
);

podium = podiumHtml();
assert.equal((podium.match(/study-room-fillers/g) || []).length, 2);
assert.ok(podium.includes("current-user.webp"));

context.renderProfile(
  {
    profile: {
      userId: "60001",
      nickname: "张家界",
      avatarUrl: "assets/images/avatars/user/current-user.webp",
      todayStudyHours: 1,
    },
  },
  {
    summary: { todayRank: 1 },
    boards: {
      today: {
        top: [
          { userId: "60001", name: "张家界", isMe: true, rank: 1, todayStudyHours: 1, avatarUrl: "assets/images/avatars/user/current-user.webp" },
          { userId: "60002", name: "王同学", rank: 2, todayStudyHours: 0.8, avatarUrl: "assets/images/avatars/user/peer-2.webp" },
          { userId: "60003", name: "李同学", rank: 3, todayStudyHours: 0.6, avatarUrl: "assets/images/avatars/user/peer-3.webp" },
        ],
        rows: [],
        myRank: 1,
      },
    },
  }
);

podium = podiumHtml();
assert.equal((podium.match(/study-room-fillers/g) || []).length, 0);
assert.ok(podium.includes("current-user.webp"));
assert.ok(podium.includes("peer-2.webp"));
assert.ok(podium.includes("peer-3.webp"));

console.log("profile leaderboard filler policy ok");

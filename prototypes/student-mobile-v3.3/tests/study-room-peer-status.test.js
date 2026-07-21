const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(
  path.join(__dirname, "../assets/js/pages/study-room.js"),
  "utf8"
);

const studyRoomView = { innerHTML: "" };
const context = {
  activeFocusSession: null,
  activeStudyRoom: null,
  document: {
    querySelector(selector) {
      return selector === "#studyRoomView" ? studyRoomView : null;
    },
  },
  escapeHtml(value) {
    return String(value ?? "");
  },
  formatClock(seconds) {
    const minutes = Math.floor(Number(seconds || 0) / 60);
    return `${String(minutes).padStart(2, "0")}:00`;
  },
  studyRoomModel(data) {
    return data.studyRoom || data;
  },
};

vm.runInNewContext(source, context);

assert.equal(typeof context.renderStudyRoom, "function");

context.renderStudyRoom({
  studyRoom: {
    roomName: "数学二冲刺自习室",
    classMemberCount: 6,
    focusMinutes: 45,
    targetMinutes: 180,
    completedMinutes: 0,
    completedHours: 0,
    completionRate: 0,
    currentTaskName: "今日数学任务",
    members: [
      {
        userId: "10002",
        name: "王同学",
        avatarUrl: "",
        focusStatus: "running",
        focusedMinutes: 0,
      },
      {
        userId: "10003",
        name: "李同学",
        avatarUrl: "",
        focusStatus: "completed_today",
        focusedMinutes: 1,
      },
    ],
    taskOptions: [],
  },
});

assert.ok(studyRoomView.innerHTML.includes("正在专注"));
assert.ok(studyRoomView.innerHTML.includes("已专注"));
assert.ok(!studyRoomView.innerHTML.includes("已专注 1 分钟"));

assert.equal((studyRoomView.innerHTML.match(/peer-companion-item/g) || []).length, 4);
assert.equal((studyRoomView.innerHTML.match(/study-room-fillers/g) || []).length, 2);

console.log("study room peer status ok");

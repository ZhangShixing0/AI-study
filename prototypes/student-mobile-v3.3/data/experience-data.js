(function () {
  const EXPERIENCE_DATA_VERSION = "2026-06-30-experience-studyroom-curve";

  const buildActivity = (hours) => hours.map((hour, index) => ({
    date: `06.${String(10 + index).padStart(2, "0")}`,
    rawDate: `2026-06-${String(10 + index).padStart(2, "0")}`,
    level: hour >= 2.5 ? "high" : hour >= 1.5 ? "medium" : hour > 0 ? "low" : "none",
    hours: hour,
    minutes: Math.round(hour * 60),
    studied: hour > 0,
  }));

  const mastery = [
    { chapterId: "math2-limit", name: "极限", rate: 83, tag: "良好", submittedQuestionCount: 30, wrongQuestionCount: 5 },
    { chapterId: "math2-derivative", name: "一元微分", rate: 71, tag: "待提升", submittedQuestionCount: 64, wrongQuestionCount: 19 },
    { chapterId: "math2-integral", name: "一元积分", rate: 62, tag: "待提升", submittedQuestionCount: 45, wrongQuestionCount: 18 },
    { chapterId: "math2-differential-equation", name: "微分方程", rate: 72, tag: "待提升", submittedQuestionCount: 18, wrongQuestionCount: 5 },
    { chapterId: "math2-multivariable-differential", name: "多元微分", rate: 61, tag: "待提升", submittedQuestionCount: 18, wrongQuestionCount: 7 },
    { chapterId: "math2-double-integral", name: "二重积分", rate: 47, tag: "薄弱项", submittedQuestionCount: 15, wrongQuestionCount: 8 },
    { chapterId: "math2-determinant", name: "行列式", rate: 75, tag: "良好", submittedQuestionCount: 20, wrongQuestionCount: 5 },
    { chapterId: "math2-matrix", name: "矩阵", rate: 64, tag: "待提升", submittedQuestionCount: 22, wrongQuestionCount: 8 },
    { chapterId: "math2-vector", name: "向量", rate: 58, tag: "薄弱项", submittedQuestionCount: 19, wrongQuestionCount: 8 },
    { chapterId: "math2-linear-system", name: "线性方程组", rate: 69, tag: "待提升", submittedQuestionCount: 16, wrongQuestionCount: 5 },
    { chapterId: "math2-eigenvalue", name: "特征值", rate: 54, tag: "薄弱项", submittedQuestionCount: 13, wrongQuestionCount: 6 },
    { chapterId: "math2-quadratic-form", name: "二次型", rate: 49, tag: "薄弱项", submittedQuestionCount: 11, wrongQuestionCount: 6 },
  ];

  const lossReasons = [
    { name: "方法选择错误", rate: 32, count: 16 },
    { name: "计算失误", rate: 28, count: 14 },
    { name: "知识点不熟、概念混淆", rate: 22, count: 11 },
    { name: "条件、范围、边界漏考虑", rate: 18, count: 9 },
  ];

  const priorities = [
    { rank: 1, chapterId: "G-08", name: "多元微分", rate: 48, tag: "薄弱项", reason: "多元微分正确率偏低，优先复盘偏导、全微分和极值条件。", icon: "triangle" },
    { rank: 2, chapterId: "G-05", name: "一元积分", rate: 62, tag: "待提升", reason: "积分题计算链较长，建议集中训练换元和分部积分。", icon: "note" },
    { rank: 3, chapterId: "L-02", name: "矩阵", rate: 61, tag: "待提升", reason: "矩阵运算容易在符号和初等变换处失分，适合做一轮专项巩固。", icon: "book" },
  ];

  const baseRank = {
    summary: { continuousDays: 8, todayStudyHours: 1.8, todayQuestionCount: 12, todayRank: 9, weeklyRank: 12, continuousRank: 7 },
    boards: {
      today: {
        myRank: 9,
        rows: [
          { userId: "exp-peer-1", name: "周同学", todayStudyHours: 3.2, rank: 1, status: "已打卡" },
          { userId: "exp-peer-2", name: "李同学", todayStudyHours: 2.7, rank: 2, status: "已打卡" },
          { userId: "exp-peer-3", name: "王同学", todayStudyHours: 2.4, rank: 3, status: "已打卡" },
        ],
        my: { userId: "experience", name: "体验号预览", todayStudyHours: 1.8, rank: 9, isMe: true, status: "预览中" },
      },
    },
  };

  const baseStudyRoom = {
    roomName: "强化阶段自习室",
    classMemberCount: 36,
    targetMinutes: 180,
    completedHours: 1.5,
    completionRate: 50,
    focusMinutes: 45,
    currentTaskName: "高数 | 积分专项",
    members: [
      { name: "周同学", avatarUrl: "assets/images/avatars/study-room-fillers/111_ceshi.webp", focusedMinutes: 62 },
      { name: "李同学", avatarUrl: "assets/images/avatars/study-room-fillers/112_ceshi.webp", focusedMinutes: 48 },
      { name: "王同学", avatarUrl: "assets/images/avatars/study-room-fillers/113_ceshi.webp", focusedMinutes: 55 },
      { name: "赵同学", avatarUrl: "assets/images/avatars/study-room-fillers/114_ceshi.webp", focusedMinutes: 35 },
    ],
  };

  const baseProfile = {
    userId: "experience",
    nickname: "体验号预览",
    avatarUrl: "assets/images/graduate-avatar-about-300kb.jpg",
    mathType: "数学二",
    examSubject: "数学二",
    targetScore: 120,
    daysToExam: "xx",
    continuousDays: 8,
    todayStudyHours: 1.5,
    dailyMathGoalHours: 3,
    primaryBooks: ["880", "1000"],
    backupBooks: ["660"],
    targetSchool: { schoolId: "", name: "体验模式不保存院校", province: "", tags: [] },
    qqGroup: "体验模式",
  };

  const planTypes = [
    {
      index: 1,
      typeId: "M2-QT-0014",
      title: "数列极限大题：结合函数性态、夹逼等",
      theme: "green",
      sources: ["《880》第1章强化三第17题", "《1000》第2章强化第11题"],
      sourceGroups: [
        {
          sourceLabel: "《880》",
          entries: [
            { chapterLabel: "第一章", phaseLabel: "综合", questionTypeShort: "解答", numbers: ["17"] },
          ],
        },
        {
          sourceLabel: "《1000》",
          entries: [
            { chapterLabel: "第二章", phaseLabel: "强化", questionTypeShort: "题号", numbers: ["11"] },
          ],
        },
      ],
      feedbackStatus: "open",
      questions: [
        { questionId: "M2-880-01-QH3-017", label: "《880》第1章强化三第17题", order: 1 },
        { questionId: "M2-1000-02-QH-011", label: "《1000》第2章强化第11题", order: 2, questionNote: "由f(0)=0构造拉格朗日中值" },
      ],
      summary: {
        title: "拔高 | 综合题：数列极限大题",
        body: "数列极限大题常联动函数以及拉格朗日中值定理，要么是单调有界准则，要么是压缩映射。",
      },
    },
    {
      index: 2,
      typeId: "M2-QT-0015",
      title: "知识点：导数定义（左右导数）和可导",
      theme: "purple",
      sources: [],
      sourceGroups: [
        {
          sourceLabel: "《880》",
          entries: [
            { chapterLabel: "第二章", phaseLabel: "基础", questionTypeShort: "选择", numbers: ["1", "3", "4", "5", "6", "13", "17", "18"] },
            { chapterLabel: "第二章", phaseLabel: "基础", questionTypeShort: "填空", numbers: ["1", "15", "19"] },
            { chapterLabel: "第二章", phaseLabel: "综合", questionTypeShort: "选择", numbers: ["5", "6", "10"] },
          ],
        },
        {
          sourceLabel: "《1000》",
          entries: [
            { chapterLabel: "第三章", phaseLabel: "基础", questionTypeShort: "题号", numbers: ["2", "5", "11"] },
            { chapterLabel: "第三章", phaseLabel: "强化", questionTypeShort: "题号", numbers: ["1", "2", "3", "5"] },
          ],
        },
      ],
      feedbackStatus: "locked",
      questions: [],
      summary: {
        title: "易错 | 概念题：左右导数可导",
        body: "左右导数和判断可导的题目要先分开算两侧极限，两边相等才可导，可导的易错点很多。",
      },
    },
  ];

  const experienceReviewItems = [
    { questionId: "M2-1000-02-QH-011", label: "《1000》第2章强化第11题", result: "wrong", questionNote: "由f(0)=0构造拉格朗日中值" },
    { questionId: "M2-880-02-JC1-005", label: "《880》第2章基础一第5题", result: "wrong", questionNote: "含绝对值的不可导点结论" },
    { questionId: "M2-880-02-JC1-006", label: "《880》第2章基础一第6题", result: "wrong", questionNote: "含绝对值的不可导点结论" },
    { questionId: "M2-880-02-JC1-017", label: "《880》第2章基础一第17题", result: "correct", questionNote: "取特例f(x)=0，则排除 A、B、D" },
    { questionId: "M2-880-02-JC1-018", label: "《880》第2章基础一第18题", result: "wrong", questionNote: "注意一点处导数与单调性无关" },
    { questionId: "M2-880-02-JC2-015", label: "《880》第2章基础二第15题", result: "wrong", questionNote: "注意两个符号的意思，见笔记" },
    { questionId: "M2-1000-03-QH-002", label: "《1000》第3章强化第2题", result: "wrong", questionNote: "等式脱帽得到f(x)" },
    { questionId: "M2-S2-00186", label: "《1000》第3章基础第2题", result: "correct", questionNote: "取φ(x)=|x|，a=0可秒杀" },
    { questionId: "M2-S2-00187", label: "《1000》第3章基础第5题", result: "wrong", questionNote: "结合夹逼" },
  ];

  const experienceExtraPracticeTypes = [
    {
      index: 1,
      typeId: "M2-QT-0015",
      title: "知识点：导数定义（左右导数）和可导",
      theme: "purple",
      cardLabel: "加练 1",
      sourceTitle: "备选习题来源",
      hideSummary: true,
      sourceGroups: [
        {
          sourceLabel: "《660》",
          entries: [
            { chapterLabel: "", phaseLabel: "", questionTypeShort: "题号", numbers: ["254", "255", "256", "257", "267", "268", "269", "270", "274", "282", "283", "284", "285", "289", "290"] },
          ],
        },
      ],
      questions: [
        { questionId: "M2-S2-00171", label: "《660》第254题", order: 1 },
        { questionId: "M2-S2-00172", label: "《660》第255题", order: 2 },
        { questionId: "M2-S2-00173", label: "《660》第256题", order: 3 },
        { questionId: "M2-S2-00174", label: "《660》第257题", order: 4 },
        { questionId: "M2-S2-00175", label: "《660》第267题", order: 5 },
        { questionId: "M2-S2-00176", label: "《660》第268题", order: 6 },
        { questionId: "M2-S2-00177", label: "《660》第269题", order: 7 },
        { questionId: "M2-S2-00178", label: "《660》第270题", order: 8 },
        { questionId: "M2-S2-00179", label: "《660》第274题", order: 9 },
        { questionId: "M2-S2-00180", label: "《660》第282题", order: 10 },
        { questionId: "M2-S2-00181", label: "《660》第283题", order: 11 },
        { questionId: "M2-S2-00182", label: "《660》第284题", order: 12 },
        { questionId: "M2-S2-00183", label: "《660》第285题", order: 13 },
        { questionId: "M2-S2-00184", label: "《660》第289题", order: 14 },
        { questionId: "M2-S2-00185", label: "《660》第290题", order: 15 },
      ],
    },
  ];

  const firstChapterSummary = {
    summaryTemplateId: "M2-CST-0001",
    rawChapterId: "M2-CH-0001",
    chapterName: "极限",
    summaryTitle: "极限真题小结",
    accuracyRate: 0.82,
    spentDays: 6,
    mainLossReasons: "趋近方向漏判、等价替换条件不清",
    examFocus: "近六年极限累计80分，年均13.3分，占全卷约8.9%，6年均出现。它主要在选择题和填空题中考基础判断，也偶尔进入解答题，是导数、积分和函数性态继续得分的底座。",
    keyPoints: "等价无穷小与泰勒展开、连续与间断点、数列极限概念。",
    commonMistakes: "没先判断趋近方向和定义域；等价替换条件不清；把无界、无穷大和极限不存在混在一起。",
    reviewAdvice: "错题按计算型、概念辨析型、数列型归类；每题补写趋近方向、主导项和可替换条件。",
  };

  const buildExperience = ({ id, status, completedMessage, feedbackItems, reviewItems, hours, titleSuffix, chapterSummary = null, experienceCompletion = null }) => ({
    id,
    label: titleSuffix,
    user: { userId: id, nickname: "体验号预览", currentTestDate: "2026-06-24" },
    data: {
      isExperienceMode: true,
      student: { userId: id, name: "体验号预览", mathType: "数学二", targetScore: 120, qqGroup: "体验模式" },
      plan: {
        date: "2026年6月24日",
        planDate: "2026-06-24",
        planId: `${id}-plan`,
        status,
        rawStatus: status === "今日已完成" ? "completed" : "in_progress",
        slogan: "强化阶段，把每一道题变成提分线索",
        daysToExam: "xx",
        completedMessage,
        totalTypes: planTypes.length,
        types: planTypes,
        currentFeedbackTypeId: feedbackItems.length ? planTypes[0].typeId : "",
        feedbackItems,
        feedbacks: [],
        reviewItems,
        chapterSummary,
        extraPracticeTypes: [],
        showExtraPractice: false,
        experienceCompletion,
      },
      rank: baseRank,
      curve: {
        title: "数学能力成长曲线",
        targetScore: 120,
        overallAccuracy: 74,
        repeatWrongRate: 31,
        weeklyCompletionRate: 73,
        activitySummary: { totalHours: hours.reduce((sum, value) => sum + value, 0), maxHours: Math.max(...hours), continuousDays: 8 },
        activity: buildActivity(hours),
        mastery,
        lossReasons,
        priorities,
      },
      studyRoom: baseStudyRoom,
      profile: baseProfile,
    },
  });

  window.EXPERIENCE_DATA_VERSION = EXPERIENCE_DATA_VERSION;
  window.EXPERIENCE_DATA = [
    buildExperience({
      id: "experience-a",
      titleSuffix: "待反馈体验号",
      status: "待反馈",
      completedMessage: "",
      feedbackItems: planTypes[0].questions,
      reviewItems: [],
      hours: [1.2, 2.0, 0, 1.7, 2.4, 2.8, 1.4, 0, 2.1, 2.6, 1.9, 2.7, 2.2, 1.5],
    }),
    buildExperience({
      id: "experience-b",
      titleSuffix: "完整闭环体验号",
      status: "待反馈",
      completedMessage: "",
      feedbackItems: planTypes[0].questions,
      reviewItems: [],
      experienceCompletion: {
        status: "今日已完成",
        rawStatus: "completed",
        completedMessage: "今日题型已完成，章节小结已经生成。还想保持手感的话，可以继续做一组备选加练题。",
        reviewItems: experienceReviewItems,
        chapterSummary: firstChapterSummary,
        extraPracticeTypes: experienceExtraPracticeTypes,
      },
      hours: [1.6, 2.4, 1.8, 2.1, 2.6, 2.9, 2.2, 1.5, 2.0, 2.8, 2.4, 3.0, 2.5, 2.1],
    }),
    buildExperience({
      id: "experience-c",
      titleSuffix: "薄弱诊断体验号",
      status: "待反馈",
      completedMessage: "",
      feedbackItems: planTypes[0].questions.slice(0, 2),
      reviewItems: [],
      hours: [0.8, 1.1, 0, 1.4, 1.6, 2.0, 1.2, 0, 1.5, 1.8, 1.3, 2.1, 1.7, 1.0],
    }),
  ];
})();

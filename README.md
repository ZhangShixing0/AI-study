# AI督学项目结构

这个仓库目前主要保存“考研数学 AI 督学”MVP 的产品规格、样例数据和学生手机端静态网页原型。

## 目录说明

- `docs/specs/`
  - 产品与页面规格文档。
  - 包含业务逻辑说明、开发执行规格和学生手机端低保真页面规格。

- `data/samples/`
  - 项目级样例数据。
  - 当前保留 `sample.xlsx`，用于后续梳理题目、计划或反馈等数据结构。

- `prototypes/`
  - 可直接打开或本地预览的网页原型。
  - 当前原型是 `student-mobile-v0.1/`。

- `prototypes/student-mobile-v0.1/`
  - 学生手机端 V0.1 静态页面。
  - `index.html` 是页面入口。
  - `styles/` 保存设计 token 和基础样式变量。
  - `assets/` 保存页面图片、图标、参考图和标注资料。
  - `data/` 保存该原型对应的静态样例 JSON。

## 网页入口

直接打开：

```text
prototypes/student-mobile-v0.1/index.html
```

这个原型不依赖构建工具，HTML、CSS 和资源文件都在同一原型目录内。

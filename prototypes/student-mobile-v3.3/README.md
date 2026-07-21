# Student Mobile v3.3

这是当前学生端，提供登录、入学配置、今日计划、学习室、成长曲线和个人中心。它由 FastAPI 在根路径 `/` 提供，并通过同源 API 读取运行时数据。

## 本地运行

从仓库根目录启动后端，不要直接双击 `index.html`：

```powershell
python -m backend.seed_db
python -m uvicorn backend.main:app --reload
```

然后访问 `http://127.0.0.1:8000/`。

## 结构

- `index.html`：入口与资源版本键。
- `assets/js/`、`styles/`：页面逻辑与样式。
- `data/experience-data.js`：无需后端时的受控体验数据，不是生产用户数据。
- `tests/`：Node 契约与回归测试。

运行本组件测试：

```powershell
node --test prototypes/student-mobile-v3.3/tests/*.test.js
```

修改静态资源后应同步更新入口中的缓存版本键，并运行仓库级发布检查。

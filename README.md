# 🧠 Claude 学习日志

AI 辅助开发的认知进化记录。每次有价值的会话自动生成带日期归档的子页面。

## 架构

```
新增学习记录 = 1 个 HTML 文件 + 1 条 JSON 记录
永远不修改 index.html
```

- `index.html` — 主页骨架，JS 动态渲染
- `data/entries.json` — 唯一数据源
- `assets/app.js` — JSON→DOM 渲染引擎
- `entries/` — 各条目的独立 HTML 页面

## 添加新条目

1. 复制 `entries/_template.html` → `entries/YYYY-MM-DD-slug.html`
2. 填写四个板块：认知更新 / 行为变更 / 新习惯 / 关键教训
3. 在 `data/entries.json` 中追加一条记录
4. 推送 → Cloudflare Pages 自动部署

## 部署

Cloudflare Pages · `claude-learning-log.pages.dev`

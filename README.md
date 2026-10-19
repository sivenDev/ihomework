# 汉字闯关

科学、有趣的小学低年级语文学习系统。基础薄弱的孩子用它补漏追上进度，基础好的孩子用它拓展提高。

- 在线使用：<https://sivendev.github.io/ihomework/>（推荐安卓平板 Chrome 横屏）
- 学习数据只保存在本机浏览器里，不上传；可以在家长模式中导出备份。
- 需求与计划：[`docs/superplan/human/prd.md`](docs/superplan/human/prd.md)、[`docs/superplan/plans/`](docs/superplan/plans/README.md)

## 开发

需要 Node.js 22 或更高版本。

```bash
npm install
npm run dev          # 本地开发，局域网内的平板可以通过电脑 IP 访问
npm run verify       # 代码检查 + 类型检查 + 单元测试 + 生产构建
npx playwright install chromium   # 首次运行端到端测试前安装浏览器
npm run test:e2e     # 端到端测试（安卓平板横屏视口）
```

推送到 `main` 分支后，GitHub Actions 会先运行全部检查，通过后自动发布到 GitHub Pages。

## 目录

| 路径 | 内容 |
|---|---|
| `src/app/` | 路由、孩子/家长模式、页面 |
| `src/components/` | 共享组件（点读汉字、PIN 键盘、休息提醒） |
| `src/db/` | 本地数据库（IndexedDB）、设置、备份导入导出 |
| `src/lib/` | 与界面无关的逻辑：语音、拼音、计时、PIN |
| `src/features/` | 各功能模块（后续计划逐步加入） |
| `e2e/` | Playwright 端到端测试 |

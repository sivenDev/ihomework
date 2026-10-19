---
id: "01"
title: "应用骨架、本地数据层与儿童交互基础"
type: "required"
status: "in_progress"
summary: "搭建可在安卓平板运行的 React PWA 骨架，包含孩子/家长双模式、IndexedDB 数据层、JSON 导入导出、汉字点读与统一验证命令。"
source: "docs/superplan/human/prd.md"
created: "2026-10-19"
order: 1
depends_on: []
parent: ""
---

# 应用骨架、本地数据层与儿童交互基础 Plan

**Goal:** 建立后续所有功能共用的工程骨架、数据存储和儿童友好的交互基础。

**Scope:**
- Vite + React + TypeScript 单页应用，横屏平板优先布局（参考视口 1280×800），兼容桌面 Chrome。
- 路由骨架：孩子首页（闯关地图占位）、家长模式入口；家长模式用 4 位 PIN 进入，首次使用时设置 PIN。
- IndexedDB 数据层（Dexie）：定义版本化 schema，覆盖设置、学习进度、作答记录、错字卡、评估记录、经验值、阅读打卡、写作记录；后续计划只追加表或字段，通过 Dexie 版本升级迁移。
- 数据导出为一个 JSON 文件，并能从该文件完整导入（覆盖前需要确认）。
- 汉字点读组件：任意汉字可点击，显示拼音并用 Web Speech API（zh-CN）朗读；设备不支持中文语音时给出可见提示，不阻断使用。
- 使用时长计时与“该休息了”提示，上限由家长设置，默认 20 分钟（计划 06 改为随练习级别变化）。
- 统一的验证命令：`npm run verify`（ESLint + `tsc --noEmit` + Vitest + 生产构建），以及 `npm run test:e2e`（Playwright，平板视口）。
- 持续部署：推送到 GitHub 仓库 `sivenDev/ihomework` 的 `main` 分支后，GitHub Actions 先运行 `npm run verify`，通过后把构建产物发布到 GitHub Pages（`https://sivendev.github.io/ihomework/`）。每完成一个计划，平板上就能直接打开最新版本试用。

**Non-Goals:**
- 不做 PWA 离线缓存（计划 08）、课本字库（计划 02）或任何学习玩法。
- 不做账号、云同步、多孩子。
- 不做视觉美术定稿；只建立设计令牌（颜色、字号、触控尺寸 ≥ 48px）和基础组件。

**Architecture:**
- 目录约定：`src/app/`（路由与布局）、`src/db/`（schema、仓储函数、导入导出）、`src/lib/`（语音、拼音、计时等无界面逻辑）、`src/components/`（共享组件）、`src/features/<模块>/`（各功能模块）、`e2e/`（Playwright）。
- 业务逻辑写成纯函数，放在 `src/features/*/logic/` 或 `src/lib/`，用 Vitest 测试；界面组件只负责调用。
- 拼音使用 pinyin-pro；语音封装在 `src/lib/speech.ts`，测试中可替换为假实现。
- 所有数据只在本机；除静态资源外不发起网络请求。
- 应用部署在子路径 `/ihomework/` 下：Vite `base` 和路由的 basename 统一从一个配置读取，本地开发时为 `/`。路由使用 HashRouter，避免 GitHub Pages 刷新子页面时返回 404。

**Exit Criteria:**
- `npm run verify` 通过。
- Playwright 在 1280×800 视口下验证：首次设置 PIN、进入和退出家长模式、点读汉字后显示拼音、导出后清空数据再导入能恢复同样的设置。
- 推送到 `main` 后，GitHub Actions 部署成功，安卓平板 Chrome 打开 `https://sivendev.github.io/ihomework/` 能完成上述操作（人工检查）。

## Task 1: 工程脚手架与统一验证命令

**Outcome:** 项目可以安装、启动、构建，`npm run verify` 和 `npm run test:e2e` 可执行。

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `eslint.config.js`, `playwright.config.ts`, `index.html`, `src/main.tsx`, `src/app/App.tsx`, `.gitignore`, `README.md`, `.github/workflows/deploy.yml`

**Verification:**
- `npm install && npm run verify`
- `npm run test:e2e`
- 推送后 `gh run watch` 显示部署成功，Pages 地址可访问

- [ ] 脚手架可启动，验证命令全部通过，GitHub Pages 自动部署可用

## Task 2: 版本化本地数据层与导入导出

**Outcome:** 各模块通过统一的仓储函数读写 IndexedDB；数据可以完整导出和导入。

**Files:**
- Create: `src/db/schema.ts`, `src/db/repo.ts`, `src/db/backup.ts`
- Test: `src/db/backup.test.ts`（使用 fake-indexeddb）

**Verification:**
- `npx vitest run src/db`

- [ ] 导出 → 清空 → 导入 后数据一致；导入格式错误的文件时报错且不破坏现有数据

## Task 3: 双模式、点读与时长提醒

**Outcome:** 孩子模式和家长模式（PIN）可切换；汉字可点读；超过时长上限会提示休息。

**Files:**
- Create: `src/app/routes.tsx`, `src/app/ParentGate.tsx`, `src/components/HanziSpeak.tsx`, `src/lib/speech.ts`, `src/lib/pinyin.ts`, `src/lib/sessionTimer.ts`, `src/styles/tokens.css`
- Test: `src/lib/sessionTimer.test.ts`, `e2e/shell.spec.ts`

**Verification:**
- `npm run verify`
- `npm run test:e2e`

- [ ] PIN 设置与校验、点读、时长提醒在平板视口下可用

## References
- `docs/superplan/human/prd.md`（第 3、4.9、5、6 节）

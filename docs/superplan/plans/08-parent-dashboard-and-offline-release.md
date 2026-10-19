---
id: "08"
title: "家长看板、PWA 离线与 MVP 验收"
type: "required"
status: "draft"
summary: "提供识字量曲线、错字清单、打卡和用时的家长看板，实现 PWA 离线安装，并在安卓平板上完成 PRD 全部 MVP 验收。"
source: "docs/superplan/human/prd.md"
created: "2026-10-19"
order: 8
depends_on: ["03", "06", "07"]
parent: ""
---

# 家长看板、PWA 离线与 MVP 验收 Plan

**Goal:** 让家长一眼看到孩子的进步，让应用像 App 一样在安卓平板上离线使用，并完成 MVP 验收。

**Scope:**
- **家长看板**：
  - 识字量曲线：认读和书写两条线，数据来自评估和周 Boss 战。
  - 当前错字清单和 Boss 击败率。
  - 当前练习级别、系统的级别建议（可一键采纳或忽略），补漏进度（已攻克 / 剩余）和预计补完周数。
  - 连续打卡天数、近 7 天每日用时。
  - 评估历史对比入口；距离下次复评（每 4 周）的提醒。
  - 汇总设置入口：课本进度、练习级别、字词管理、奖励清单、时长上限、PIN 修改、数据导出导入。
- **PWA**：
  - Web App Manifest 和应用图标，安卓 Chrome 可以“添加到主屏幕”并全屏打开。
  - Service Worker 预缓存应用、字库和笔顺数据，断网后所有功能可用。
  - 新版本可用时提示刷新，不在使用中途强制刷新。
- **部署方式**：沿用计划 01 建立的 GitHub Pages 自动部署（HTTPS，满足 PWA 安装要求）；Service Worker 和应用清单的作用域、起始地址都设为 `/ihomework/`。编写使用说明：在安卓平板上打开地址、添加到主屏幕、离线使用、备份数据。
- **MVP 验收**：按 PRD 第 8 节逐条验收并记录结果。

**Non-Goals:**
- 不做 Capacitor 安卓 App 打包（见计划 10）。
- 不做云端备份。

**Architecture:**
- 使用 vite-plugin-pwa（Workbox）生成 Service Worker；预缓存清单包含 `textbook.json` 和 `public/strokes/`。
- 图表使用轻量图表库或手写 SVG，横屏平板上无横向滚动。
- 增加一条 Playwright 检查：使用过程中除同源静态资源外没有任何网络请求（对应 PRD“数据不上传”）。

**Exit Criteria:**
- Playwright：看板数据与测试中预置的记录一致；离线模式（`context.setOffline(true)`）下完成一次 Boss 战和一次默写；全流程中没有发往其他域名的请求。
- Lighthouse PWA 可安装性检查通过。
- 在安卓平板 Chrome 上人工完成 PRD 第 8 节全部 11 条验收，结果记录在本计划中。
- `npm run verify` 与 `npm run test:e2e` 通过。

## Task 1: 家长看板

**Outcome:** 家长可以在一个页面看到全部关键数据并进入各项设置。

**Files:**
- Create: `src/features/dashboard/DashboardPage.tsx`, `src/features/dashboard/logic/metrics.ts`
- Test: `src/features/dashboard/logic/metrics.test.ts`, `e2e/dashboard.spec.ts`

**Verification:**
- `npm run verify`
- `npm run test:e2e`

- [ ] 指标计算和看板展示通过测试

## Task 2: PWA 离线与无外部请求检查

**Outcome:** 应用可安装、可离线；测试证明没有外部网络请求。

**Files:**
- Modify: `vite.config.ts`, `index.html`
- Create: `public/icons/`, `e2e/offline.spec.ts`, `docs/USAGE.md`

**Verification:**
- `npm run build && npm run test:e2e`
- Lighthouse 可安装性检查

- [ ] 离线使用与无外部请求测试通过

## Task 3: 安卓平板 MVP 验收

**Outcome:** PRD 第 8 节全部验收条目在真实设备上逐条确认。

**Files:**
- Modify: `docs/superplan/plans/08-parent-dashboard-and-offline-release.md`（记录验收结果）

**Verification:**
- 在安卓平板 Chrome 上按 PRD 第 8 节逐条人工验收

- [ ] 11 条验收全部通过并记录

## References
- `docs/superplan/human/prd.md`（第 4.9、5、8 节）

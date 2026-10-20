---
id: "08"
title: "家长看板、PWA 离线与 MVP 验收"
type: "required"
status: "in_progress"
summary: "提供识字量曲线、学习路线进度、写作等级、错字清单、打卡和用时的家长看板，实现 PWA 离线安装，并在安卓平板上完成 PRD 全部 MVP 验收。"
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
  - 识字量曲线：课内认读、书写、课外识字三条线，数据来自评估和周 Boss 战。
  - 写作等级和历次写作评分。
  - 当前错字清单和 Boss 击败率。
  - 当前学习路线（是否锁定）、练习级别、系统的建议（可一键采纳或忽略）；路线进度：补漏显示已攻克 / 剩余和预计补完周数，拓展显示课外新学字数和每周增长。
  - 连续打卡天数、近 7 天每日用时。
  - 评估历史对比入口；距离下次复评（每 4 周）的提醒。
  - 汇总设置入口：课本进度、超前学习开关、学习路线与练习级别、字词管理、奖励清单、时长上限、PIN 修改、数据导出导入。
- **PWA**：
  - Web App Manifest 和应用图标，安卓 Chrome 可以“添加到主屏幕”并全屏打开。
  - Service Worker 预缓存应用、课本字库、拓展字库和 3500 字的笔顺数据，断网后所有功能可用；首次安装时显示下载进度。
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

- [x] 指标计算和看板展示通过测试

## Task 2: PWA 离线与无外部请求检查

**Outcome:** 应用可安装、可离线；测试证明没有外部网络请求。

**Files:**
- Modify: `vite.config.ts`, `index.html`
- Create: `public/icons/`, `e2e/offline.spec.ts`, `docs/USAGE.md`

**Verification:**
- `npm run build && npm run test:e2e`
- Lighthouse 可安装性检查

- [x] 离线使用与无外部请求测试通过

## Task 3: 安卓平板 MVP 验收

**Outcome:** PRD 第 8 节全部验收条目在真实设备上逐条确认。

**Files:**
- Modify: `docs/superplan/plans/08-parent-dashboard-and-offline-release.md`（记录验收结果）

**Verification:**
- 在安卓平板 Chrome 上按 PRD 第 8 节逐条人工验收

- [ ] 11 条验收全部通过并记录

## Delivery Notes

- 看板放在家长模式首页（`/parent`）上方，下面是“设置与管理”：课本进度与字词、现状评估、级别与路线（含超前学习开关、每段时长上限）、奖励清单、看图写作评分、推荐书单、家长 PIN（新增修改功能）、数据备份。
- 识字量曲线的口径：
  - 评估点：课内认读用报告估算；课内会写 = 听写正确率 × 已学写字表字数；课外识字用拓展认读估算。
  - 周 Boss 点：课内认读 = 认读正确率 × 已学生字数；课内会写 = 默写正确率 × 已学写字表字数；课外 = 最近一次课外估算 + 之后新字任务学过的课外字。
  - 某项没有新数据时沿用上一次的值。周 Boss 从本计划起分开记录认读、默写结果和出题时的课本进度；更早的记录用总结果代替认读结果。
- 每日用时：数据库 v6 新增 `usage` 表，只记孩子模式下页面可见的时间，规则和休息提醒的计时相同，每 15 秒写一次。
- 级别建议在看板上可以“采纳”（改为建议的级别）或“忽略”（7 天内不再显示）。
- **实现与原定架构不同（机制调整，范围不变）**：
  - 没有用 vite-plugin-pwa / Workbox，改为自己写的 Service Worker（`scripts/pwa/sw.template.js`），构建后由 `scripts/pwa/build-sw.ts` 生成预缓存清单（约 3660 个文件、约 11.4 MB）。原因：
    - Workbox 安装时不报告进度，无法实现“首次安装显示下载进度”。
    - 自己写的版本只重新下载内容有变化的文件，不引入新依赖，约 100 行。
  - Lighthouse 12 起已删除 PWA 类别，改用 Chrome 的 `Page.getInstallabilityErrors` 检查可安装性，结果必须为空，写在 `e2e/offline.spec.ts` 里。
- 新版本下载完后进入等待，页面左下角提示“有新版本了”，点“更新”才切换并刷新。
- 页面按路由懒加载：首屏包从 873 kB 降到 546 kB。仍超过 500 kB 的只有拼音词典和字库数据两块，所以把提醒阈值设为 800 kB，并在 `vite.config.ts` 中写明原因。
- 离线测试使用单独的 Playwright 项目 `offline`：用 `/ihomework/` 子路径构建到 `dist-e2e/`，再用 `vite preview` 运行，和线上一致，也不影响要部署的 `dist/`。
- 使用说明：`docs/USAGE.md`。应用图标由 `scripts/build-icons.ts` 生成。

## Verification Evidence

- `npm run verify`：lint、typecheck、Vitest 35 个文件 209 个测试（新增 `metrics.test.ts` 7 个）、build 全部通过，没有大文件警告。
- `npm run test:e2e`：43 个通过，其中新增：
  - `e2e/dashboard.spec.ts` 2 个：看板数据与预置记录一致，包括采纳和忽略建议；修改 PIN。
  - `e2e/offline.spec.ts` 2 个：
    - 预缓存完成后可安装性检查无错误；断网后完成 Boss 战（认读 + 默写）和写字练习（描红 + 默写），各页面都能打开；全程没有发往其他域名的请求。
    - 新版本只有点了“更新”才刷新。
- 在 1280×800 视口截图检查了家长看板，调大了用时柱状图的文字。

## MVP 验收记录（Task 3）

自动化证据已列出；“平板人工验收”一列等家长在安卓平板 Chrome 上确认后填写。

| # | PRD 第 8 节条目 | 自动化证据 | 平板人工验收 |
|---|---|---|---|
| 1 | 4 册课本字库 + 拓展字库；进度可设到任意一课；可改字词；出题范围与进度一致 | `scripts/build-data/validate.test.ts`、`scope.test.ts`、`e2e/textbook.spec.ts` | 待确认 |
| 2 | 评估报告（识字量、待攻克、写作等级、路线和级别建议）；认读 ≥ 90% 加测拓展；报告存入历史 | `report.test.ts`、`e2e/assessment.spec.ts` | 待确认 |
| 3 | 三个玩法可玩，每关 ≤ 5 分钟，难度升降，最高难度含拓展字，错字进入 Boss | `difficulty.test.ts`、`generators.test.ts`、`e2e/challenges.spec.ts` | 待确认 |
| 4 | Boss 按 1、2、4、7、15 天间隔复习，连续 3 次答对打败，答错重置，有自动化测试 | `scheduler.test.ts`、`e2e/boss.spec.ts` | 待确认 |
| 5 | 每日任务按进度、路线和级别生成；加强分两段并休息；新字进入 Boss；Boss 积压时减少新字；路线自动切换并提示；周末周 Boss | `planner.test.ts`、`routes.test.ts`、`daily/store.test.ts`、`e2e/daily.spec.ts` | 待确认 |
| 6 | 看图写作全流程；写作等级按规则提升 | `writing/logic/*.test.ts`、`e2e/writing.spec.ts` | 待确认 |
| 7 | 经验值和等级按规则累计，不扣分 | `xp.test.ts`、`e2e/daily.spec.ts`、`e2e/reading.spec.ts` | 待确认 |
| 8 | 看板显示识字量曲线、路线进度、写作等级、错字清单、打卡天数；JSON 导出和导入 | `metrics.test.ts`、`e2e/dashboard.spec.ts`、`backup.test.ts`、`e2e/shell.spec.ts` | 待确认 |
| 9 | 用手指描红和默写，逐笔判断；默写错的字进 Boss；课本字和拓展字都支持 | `judge.test.ts`、`e2e/handwriting.spec.ts` | 待确认 |
| 10 | 安卓平板和桌面 Chrome 可用；断网后所有功能可用；孩子模式汉字可点读 | `e2e/offline.spec.ts`、`e2e/speech.spec.ts` | 待确认 |
| 11 | 数据只存本机，没有上传请求 | `e2e/offline.spec.ts`（无其他域名请求） | 待确认 |

## References
- `docs/superplan/human/prd.md`（第 4.9、5、8 节）

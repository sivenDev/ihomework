---
id: "F004"
title: "闯关界面调整：部首侦探间距、去掉字族收藏入口"
type: "feature"
status: "complete"
summary: "部首侦探的问题与选项之间留出更大间距；字族网络去掉“我的收藏”入口，后台仍优先出没拼过的字族。"
source: "docs/superplan/human/features.md"
created: "2026-10-19"
depends_on: ["05"]
parent: ""
---

# 闯关界面调整 Plan

**Goal:** 根据试用反馈让闯关界面更清爽。

**Scope:**
- 部首侦探：问题标题与选项、两个问题之间、讲解区之间加大间距。
- 字族网络：去掉“我的收藏”按钮和收藏页；完成后仍显示本次的字族导图；后台继续记录拼过的字族，用于优先出新的字族。

**Non-Goals:**
- 不删除已经记录的字族数据。

**Exit Criteria:**
- Playwright：字族网络页面没有“我的收藏”；完成后显示字族导图；部首侦探问题与选项间距不小于 16px（截图人工确认）。
- `npm run verify` 与 `npm run test:e2e` 通过。

## Task 1: 调整界面

**Outcome:** 间距加大，收藏入口移除。

**Files:**
- Modify: `src/features/challenges/RadicalDetective.tsx`, `src/features/challenges/CharacterFamily.tsx`, `src/features/challenges/challenges.css`
- Test: `e2e/challenges.spec.ts`

**Verification:**
- `npm run verify`
- `npm run test:e2e`

- [x] 间距和收藏入口调整完成

## References
- `docs/superplan/human/features.md`（F004）

## Evidence（2026-10-19）
- 部首侦探：问题与选项间距 16px，两个问题之间加分隔线和 24px 间距，讲解区上方分隔（截图确认）。
- 字族网络：移除“我的收藏”按钮和收藏页，完成后仍显示本次字族导图；后台继续记录拼过的字族以优先出新字族。Playwright 断言页面上没有“我的收藏”。
- `npm run verify` 与 `npm run test:e2e` 通过（104 / 28）。

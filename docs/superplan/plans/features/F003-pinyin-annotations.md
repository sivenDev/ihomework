---
id: "F003"
title: "孩子界面的题目和说明加注拼音"
type: "feature"
status: "complete"
summary: "孩子界面中的说明、题目、选项、按钮和结果文字用注音（ruby）标出拼音，题目旁可以点 🔊 朗读。"
source: "docs/superplan/human/features.md"
created: "2026-10-19"
depends_on: ["05"]
parent: ""
---

# 孩子界面的题目和说明加注拼音 Plan

**Goal:** 识字量还不够的孩子也能自己读懂游戏的说明和题目。

**Scope:**
- 新的注音组件：每个汉字上方显示拼音（按词语上下文选多音字读音），拼音不计入按钮和标题的无障碍名称；可选 🔊 朗读整句。
- 应用范围：孩子首页的关卡名称和说明，部首侦探、字族网络、生字闪认、错字 Boss、写字练习的说明、题目、意思选项、按钮和结果文字，每关结算和休息提醒。
- 题目（部首侦探的两个问题、写字练习和 Boss 的提示）旁边加 🔊。

**Non-Goals:**
- 家长界面不加拼音。
- 不提供关闭拼音的开关（以后需要再加）。
- 题目中要孩子认读的目标字本身不加拼音（否则就不用认了）。

**Exit Criteria:**
- 单元测试：注音组件按上下文注音（如“长大”的“长”读 zhǎng），非汉字原样显示，拼音不进入可访问名称。
- Playwright：部首侦探的问题和选项显示拼音；按钮仍可按原文字找到。
- `npm run verify` 与 `npm run test:e2e` 通过。

## Task 1: 注音组件并应用到孩子界面

**Outcome:** 孩子界面的文字都有拼音。

**Files:**
- Create: `src/components/PinyinText.tsx`, `src/components/PinyinText.test.tsx`
- Modify: 孩子界面各页面（`src/app/ChildHome.tsx`, `src/components/RestReminder.tsx`, `src/features/challenges/*`, `src/features/boss/BossBattlePage.tsx`, `src/features/handwriting/WritePracticePage.tsx`）, `src/styles/global.css`

**Verification:**
- `npm run verify`
- `npm run test:e2e`

- [x] 注音组件测试通过，孩子界面显示拼音

## References
- `docs/superplan/human/features.md`（F003）

## Evidence（2026-10-19）
- 注音组件 `PinyinText`：按词语上下文注音（“长大”zhǎng、“长江”cháng）；注音部分 aria-hidden，另放视觉隐藏的原文作为可访问文字——实测 Chrome 会在 ruby 之间插入空格，直接用注音部分会让按钮名称变成“部 首 侦 探”。
- 应用到孩子首页、三个闯关玩法、错字 Boss、写字练习、书写板按钮、每关结算、休息提醒和专注提醒；题目和说明旁加 🔊 朗读。拼音最小字号 11px。
- 截图发现并修复：组件内 span 样式覆盖了视觉隐藏样式，导致原文重复显示；视觉隐藏样式改为 !important。
- 单元测试 3 个通过；Playwright 断言部首侦探题目中“读”注 dú，所有按名称查找按钮 / 链接的测试仍然通过。
- `npm run verify` 与 `npm run test:e2e` 通过（104 / 28）。

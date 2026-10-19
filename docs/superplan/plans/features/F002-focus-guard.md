---
id: "F002"
title: "闯关防乱点：思考时间与专注提醒"
type: "feature"
status: "complete"
summary: "选项出现后短暂思考时间才能作答；连续乱点或答错时暂停并提醒孩子；部首侦探一关缩短到 6 题。"
source: "docs/superplan/human/features.md"
created: "2026-10-19"
depends_on: ["05"]
parent: ""
---

# 闯关防乱点：思考时间与专注提醒 Plan

**Goal:** 孩子注意力分散开始乱点时，游戏能察觉并把他拉回来，而不是让乱点变成常态。

**Scope:**
- **思考时间**：部首侦探的选项在题目出现 1.5 秒后才能点（显示“想一想”进度条）；生字闪认的“认识 / 跳过”在字出现 0.6 秒后才能点。
- **专注提醒**：最近 3 次作答全错，或其中至少 2 次是“刚能点就点、而且错了”（0.8 秒内），弹出提醒：“慢一点，先看清题目再选哦”，可以选“休息一下”回首页，或等 5 秒后“我准备好了”继续。生字闪认连续 4 次在 0.7 秒内点“认识”时提醒“要大声读出来再点哦”。字族网络连续 3 次放错偏旁时提醒，并提示声旁的读音。
- 部首侦探一关从 8 题缩短为 6 题。
- 提醒期间计时暂停（生字闪认）。

**Non-Goals:**
- 不做摄像头或眼动等注意力检测。
- 不改变难度升降规则（乱点答错照常计入正确率）。

**Exit Criteria:**
- 单元测试：专注提醒规则的各种情况（3 连错、快速错答、只快不错不提醒、闪认快速连点）。
- Playwright：选项在思考时间内不可点；部首侦探 3 次答错后出现提醒，“我准备好了”5 秒后可点并继续；生字闪认快速连点出现提醒。
- `npm run verify` 与 `npm run test:e2e` 通过。

## Task 1: 思考时间、专注提醒与短一关

**Outcome:** 三个闯关玩法都有思考时间和专注提醒。

**Files:**
- Create: `src/features/challenges/logic/focus.ts`, `src/features/challenges/FocusBreak.tsx`, `src/features/challenges/useThinkDelay.ts`
- Modify: `src/features/challenges/RadicalDetective.tsx`, `src/features/challenges/CharacterFamily.tsx`, `src/features/challenges/FlashRecall.tsx`, `src/features/challenges/challenges.css`
- Test: `src/features/challenges/logic/focus.test.ts`, `e2e/challenges.spec.ts`

**Verification:**
- `npm run verify`
- `npm run test:e2e`

- [x] 思考时间与专注提醒在三个玩法中生效

## References
- `docs/superplan/human/features.md`（F002）

## Evidence（2026-10-19）
- 用户在对话中选择“先实测再决定（其他反馈先改）”，据此执行。
- 专注规则单元测试 6 个通过（3 连错、2 次抢答错、只快不错不提醒、只看最近 3 次、闪认连续 4 次 0.9 秒内点按）。实现中把闪认“没读就点”的阈值从计划的 0.7 秒调整为 0.9 秒（从字出现算起；大声读一个字约需 1 秒，而选项本身 0.6 秒后才能点）。
- Playwright：部首侦探选项在思考时间内不可点并显示“想一想”；3 次答错后出现提醒，“准备中”倒计时 5 秒后才能点“我准备好了”，继续到第 4 题；生字闪认连续 4 次快速点“认识”出现提醒，提醒期间倒计时不走。字族网络连续 3 次放错偏旁时提醒并提示声旁读音（最多 2 个干扰偏旁，正常游玩不会误触发）。
- `npm run verify`：Vitest 104 个测试通过；`npm run test:e2e`：28 个测试通过。

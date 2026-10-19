---
id: "F001"
title: "错字 Boss 打败后第 7、15 天复查"
type: "feature"
status: "complete"
summary: "打败的字在第 7 天和第 15 天各复查一次，答错回到错字 Boss，两次都对才算彻底记住。"
source: "docs/superplan/human/features.md"
created: "2026-10-19"
depends_on: ["04"]
parent: ""
---

# 错字 Boss 打败后第 7、15 天复查 Plan

**Goal:** 让 PRD 规定的第 7、15 天复习间隔真正发挥作用，检查打败的字是否长期记住。

**Scope:**
- 连续答对 3 次后，字进入“战利品”，并在打败当天起第 7 天出现在错字 Boss 中复查；第一次复查答对，再过 8 天（即第 15 天）第二次复查；两次都对后彻底记住，不再出现。
- 复查答错：回到错字 Boss 第 1 档（次日复习、连续答对次数清零、复查次数清零）。
- 复查卡片在 Boss 战中显示“复查”标记；战利品区分“复查中”和“已牢记”。
- 已打败或已牢记的字再次出错（评估、写字等）时，照常回到错字 Boss。
- 已有的旧战利品数据（没有复查次数字段）视为未复查，按规则安排复查。

**Non-Goals:**
- 不提供复查间隔的自定义设置。

**Exit Criteria:**
- 单元测试：打败后第 7 天到期；第一次复查对后 +8 天；第二次复查对后不再到期；复查错回到第 1 档并清零；逾期复查从实际日期起算；牢记后再出错重新激活。
- Playwright（模拟日期）：一个字连续 3 次答对后，第 7 天在 Boss 战中以“复查”出现。
- `npm run verify` 与 `npm run test:e2e` 通过。

## Task 1: 复查规则与界面

**Outcome:** 打败的字按第 7、15 天复查，界面能区分复查和已牢记。

**Files:**
- Modify: `src/features/boss/logic/scheduler.ts`, `src/db/schema.ts`, `src/features/boss/BossBattlePage.tsx`, `src/features/boss/boss.css`
- Test: `src/features/boss/logic/scheduler.test.ts`, `e2e/boss.spec.ts`

**Verification:**
- `npx vitest run src/features/boss`
- `npm run verify`
- `npm run test:e2e`

- [x] 复查规则测试先失败后通过，Boss 战显示复查

## References
- `docs/superplan/human/features.md`（F001）
- `docs/superplan/plans/04-error-boss-and-handwriting.md`

## Evidence（2026-10-19）
- 用户在对话中确认需要该规则（“要加”），并按上述范围执行。
- 先写测试：6 个复查测试在实现前失败，实现后 `src/features/boss` 17 个测试全部通过；原“已打败的字不再出现”的测试按新规则改为“彻底记住的字不再出现、到期复查的字出现”。
- `npm run verify`：Vitest 85 个测试通过，构建通过。
- `npm run test:e2e`：22 个测试通过；新增“打败后第 6 天不出现、第 7 天以复查出现、第 15 天复查后彻底记住、此后不再出现”（模拟日期）。

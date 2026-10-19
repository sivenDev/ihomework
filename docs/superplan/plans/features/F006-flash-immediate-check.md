---
id: "F006"
title: "生字闪认读错当场纠正"
type: "feature"
status: "complete"
summary: "声音模式中每读完一个字，立即回放自己的读音和标准读音，孩子判断“一样 / 不一样”；不一样就再读一遍，最多重读两次；纠错期间倒计时暂停。"
source: "docs/superplan/human/features.md"
created: "2026-10-19"
depends_on: ["F005"]
parent: ""
---

# 生字闪认读错当场纠正 Plan

**Goal:** 读错的字当场听到正确读音并重读，而不是等一关结束后才发现。

**Scope:**
- 声音模式中，检测到孩子读完一个字后进入“对一对”：自动依次播放“你读的”录音和标准读音，并显示拼音；播放结束后才能点“一样”或“不一样”，也可以单独重听。
- “一样”：进入下一个字。
- “不一样”：显示并朗读“听一听：<拼音>，再读一遍”，回到听读状态重新录这个字；同一个字第 2 次仍“不一样”时，提示“没关系，记住它”，跳到下一个字。
- 计分：第一次就判断“一样”的字记为读对；改正过的字和放弃的字记为需要多练（学过的字进入错字 Boss）。
- “对一对”和重读提示期间倒计时暂停；回放的声音不会被当成孩子在读（只接受恢复听读之后开始的读音）。
- 时间到或提前结束后直接出成绩，并列出“需要多练的字”，不再需要逐个回听标记。
- 按钮模式保持不变。

**Non-Goals:**
- 不做自动判断读音对错（与用户确认：在线识别不可用，离线识别准确度不足）。

**Exit Criteria:**
- 单元测试：“对一对”的状态流转（一样 → 下一个；不一样 → 重读；第 2 次不一样 → 放弃并下一个）与计分规则。
- Playwright（模拟麦克风）：读完进入“对一对”，播放结束前按钮不可点；“一样”后下一个字；“不一样”后提示重读，重读后再次对照；连续两次“不一样”后跳到下一个字；对照期间倒计时不走；成绩和“需要多练的字”正确。
- `npm run verify` 与 `npm run test:e2e` 通过。

## Task 1: 当场纠错流程

**Outcome:** 声音模式读错能当场纠正。

**Files:**
- Create: `src/features/challenges/logic/flashCheck.ts`
- Modify: `src/features/challenges/FlashRecall.tsx`, `src/features/challenges/audio/mic.ts`, `src/lib/speech.ts`, `src/features/challenges/challenges.css`
- Test: `src/features/challenges/logic/flashCheck.test.ts`, `e2e/flash-voice.spec.ts`

**Verification:**
- `npm run verify`
- `npm run test:e2e`

- [x] 当场纠错流程测试通过

## References
- `docs/superplan/human/features.md`（F006）
- `docs/superplan/plans/features/F005-flash-voice-mode.md`

## Evidence（2026-10-19）
- 用户选定做法“读完听标准音自己对”，按此实现。
- 先写测试：`flashCheck.test.ts` 5 个测试（一次读对、不一样重读、第二次一样算改正、第二次仍不一样放弃、计分与需要多练的字）在实现前失败、实现后通过。
- 实现：读完进入“对一对”，依次播放孩子的录音和标准读音（新增 `speakAndWait`，读完或超时后继续），播放完才能判断；对照、重读提示期间倒计时暂停；只接受恢复听读之后开始的读音，避免把回放声音当成孩子在读。暂停期间麦克风提示显示“先听一听…”（截图发现原来会残留“正在听…”，已修复）。声音模式结束后直接出成绩并列出“需要多练的字”，按钮模式保持原来的回看自评。
- Playwright（模拟麦克风）：第 1 个字一次读对；播放完前按钮不可点、对照期间倒计时不走；第 2 个字两次“不一样”后提示“没关系，记住它”并进入下一个字；第 3 个字重读后改正；成绩 1 个字，需要多练的字包含第 2、3 个字。慢速模拟（slowMo 300 毫秒）下重复 3 次通过。
- `npm run verify`：Vitest 118 个测试通过；`npm run test:e2e`：31 个测试通过。
- 待人工确认：在用户平板上实测（回放音量、标准读音与录音的衔接）。

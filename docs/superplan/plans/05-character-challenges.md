---
id: "05"
title: "汉字闯关：部首侦探、字族网络、生字闪认"
type: "required"
status: "approved"
summary: "实现三个 P0 闯关玩法，难度随正确率自动调整，每关不超过 5 分钟，出错的字进入错字 Boss。"
source: "docs/superplan/human/prd.md"
created: "2026-10-19"
order: 5
depends_on: ["04"]
parent: ""
---

# 汉字闯关：部首侦探、字族网络、生字闪认 Plan

**Goal:** 用推理和挑战代替机械重复，让孩子主动去认字、理解字的规律；难度能一直往上走，基础好的孩子也有挑战。

**Scope:**
- **部首侦探**：出一个形声字，孩子先从 3～4 个选项中推理读音，再推理意思类别（如“和水有关”）；揭晓时用图示说明形旁和声旁。优先从当前课和下一课选字，也可以出少量未学字作为“挑战题”。
- **字族网络**：以一个声旁为中心（如“青”），孩子把偏旁卡拖到中心组成新字；组成后显示读音、组词并朗读；全部完成后生成一张字族导图，可以在“我的收藏”里回看。拓展路线或高难度时，字族中可以出现课外字（标为“新发现”）。
- **生字闪认**：限时快速认读当前课和已学的字，孩子自判“认识 / 不认识”，家长在旁时可切换为家长判定；记录个人最好成绩，挑战打破纪录。
- **自适应难度**：最近一关正确率 ≥ 85% 时升一级，< 60% 时降一级；等级决定题目范围（当前课 → 本册 → 跨册 → 超前课程 → 拓展字）和限时长短。
- 每关题量控制在 3～5 分钟内完成；结束页显示本关得分和新纪录。
- 闯关中出错的已学字调用 `addMistake` 进入错字 Boss；本关结果写入作答记录，供计划 06 发放经验值。

**Non-Goals:**
- 不做字理故事、汉字积木、找不同、字谜（见计划 09）。
- 不做排行榜和多人对战。

**Architecture:**
- 出题器（选字、生成干扰项、调整难度）是纯函数，依赖计划 02 的出题范围和字族索引；干扰项读音来自同字族或同韵母，意思类别来自形旁映射表。
- 形旁 → 意思类别映射表放在数据文件中（如 氵→水、讠→说话），可以扩充。
- 界面动画保持简短，适合平板触控拖拽。

**Exit Criteria:**
- 出题器单元测试：题目只来自允许的范围；干扰项不含正确答案、不重复；难度升降符合阈值。
- Playwright 在平板视口下各完成一关三个玩法；出错的字出现在错字 Boss 中。
- `npm run verify` 与 `npm run test:e2e` 通过。

## Task 1: 出题器与难度调整

**Outcome:** 三个玩法共用的出题和难度逻辑可独立测试。

**Files:**
- Create: `src/features/challenges/logic/generators.ts`, `src/features/challenges/logic/difficulty.ts`, `data/semantic-radicals.yaml`
- Test: `src/features/challenges/logic/generators.test.ts`, `src/features/challenges/logic/difficulty.test.ts`

**Verification:**
- `npx vitest run src/features/challenges`

- [ ] 出题范围、干扰项和难度规则测试通过

## Task 2: 三个玩法界面与结果记录

**Outcome:** 孩子可以从闯关地图进入三个玩法并完成，结果和错字被记录。

**Files:**
- Create: `src/features/challenges/RadicalDetective.tsx`, `src/features/challenges/CharacterFamily.tsx`, `src/features/challenges/FlashRecall.tsx`, `src/features/challenges/ChallengeMap.tsx`
- Modify: `src/db/schema.ts`（作答记录、个人纪录、字族收藏）
- Test: `e2e/challenges.spec.ts`

**Verification:**
- `npm run verify`
- `npm run test:e2e`

- [ ] 三个玩法在平板视口可完整游玩

## References
- `docs/superplan/human/prd.md`（第 4.3 节）

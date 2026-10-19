---
id: "04"
title: "错字 Boss 间隔复习与描红默写"
type: "required"
status: "approved"
summary: "实现按第 1、2、4、7、15 天间隔复习的错字 Boss，以及基于标准笔顺逐笔判断的描红和默写，默写出错自动进入错字 Boss。"
source: "docs/superplan/human/prd.md"
created: "2026-10-19"
order: 4
depends_on: ["02"]
parent: ""
---

# 错字 Boss 间隔复习与描红默写 Plan

**Goal:** 用间隔复习代替反复抄写，并让孩子能在安卓平板上用手指描红、默写，系统即时判断。

**Scope:**
- **错字 Boss 调度**：
  - 错字卡来源：评估、闯关、默写自动加入，家长手动加入；同一个字不重复建卡，再次出错时重置间隔。
  - 复习间隔：第 1、2、4、7、15 天。答对进入下一档；答错回到第 1 档。
  - 连续 3 次正确视为“击败”，移进“战利品”。
  - 到期但当天没复习的卡，顺延到下次打开时，不惩罚。
- **Boss 战界面**：显示 Boss 血条（今日剩余待复习数）；每张卡先认读（家长或孩子自判），写字表中的字再进入默写。
- **描红**：田字格内显示浅色字形，先播放笔顺动画，孩子逐笔描写，写错即时提示并可重写。
- **默写**：不显示字形，只播放读音、显示拼音和组词，孩子按笔顺逐笔书写；连续错 3 笔后给出下一笔提示；结果记为“正确 / 有提示 / 错误”，后两种进入错字 Boss。
- 笔顺数据随应用打包，课本字和拓展字（一级字表全部 3500 字）都可以离线描红和默写。

**Non-Goals:**
- 不做任意手写识别（只按标准笔顺比对）。
- 不做笔画美观度评分。
- 不自定义复习间隔（以后有需要再加设置项）。

**Architecture:**
- 调度器是纯函数：输入卡片状态、作答结果和日期，输出新状态；日期由调用方传入，便于测试。按“本地自然日”计算间隔，避免时区和夜里跨天问题。
- 笔顺书写使用 Hanzi Writer 的 quiz 模式，笔顺数据来自 `hanzi-writer-data` npm 包，构建时只复制一级字表的 3500 字，遵守其许可并写入 `THIRD_PARTY_NOTICES.md`；构建脚本输出数据总体积，供计划 08 评估离线缓存。
- 提供 `addMistake(char, source)` 接口给其他模块调用；接入计划 03 中暂存的待处理错字。

**Exit Criteria:**
- 调度器单元测试覆盖：首次建卡、各档前进、答错重置、连续 3 次击败、重复加入同一字、逾期顺延、跨月日期。
- 在平板视口下，Playwright 用模拟触控完成一次描红和一次默写；默写写错的字出现在错字 Boss 中。
- 在安卓平板上人工确认手指书写跟手、判断正确。
- `npm run verify` 与 `npm run test:e2e` 通过。

## Task 1: 错字调度器（先写测试）

**Outcome:** 间隔复习规则有完整的自动化测试保证。

**Files:**
- Create: `src/features/boss/logic/scheduler.ts`
- Test: `src/features/boss/logic/scheduler.test.ts`

**Verification:**
- `npx vitest run src/features/boss`

- [ ] 所有调度规则测试先失败后通过

## Task 2: 描红与默写组件、离线笔顺数据

**Outcome:** 课本字和拓展字都能离线描红和默写，结果可回传。

**Files:**
- Create: `src/features/handwriting/TraceBoard.tsx`, `src/features/handwriting/DictationBoard.tsx`, `scripts/build-data/strokes.ts`, `public/strokes/`
- Modify: `THIRD_PARTY_NOTICES.md`
- Test: `e2e/handwriting.spec.ts`

**Verification:**
- `npm run data:build`
- `npm run test:e2e`

- [ ] 描红、默写在平板视口可完成；一级字表 3500 字都有笔顺数据（构建脚本校验）

## Task 3: Boss 战界面与错字接入

**Outcome:** 孩子每天可以打 Boss 战；评估和默写的错字自动进入。

**Files:**
- Create: `src/features/boss/BossBattlePage.tsx`, `src/features/boss/api.ts`
- Modify: `src/db/schema.ts`（错字卡表）
- Test: `e2e/boss.spec.ts`

**Verification:**
- `npm run verify`
- `npm run test:e2e`

- [ ] Boss 战完整流程通过，击败的字进入战利品

## References
- `docs/superplan/human/prd.md`（第 4.4、4.7A 节）

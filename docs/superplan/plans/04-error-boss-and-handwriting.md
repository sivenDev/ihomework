---
id: "04"
title: "错字 Boss 间隔复习与描红默写"
type: "required"
status: "complete"
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

- [x] 所有调度规则测试先失败后通过

## Task 2: 描红与默写组件、离线笔顺数据

**Outcome:** 课本字和拓展字都能离线描红和默写，结果可回传。

**Files:**
- Create: `src/features/handwriting/TraceBoard.tsx`, `src/features/handwriting/DictationBoard.tsx`, `scripts/build-data/strokes.ts`, `public/strokes/`
- Modify: `THIRD_PARTY_NOTICES.md`
- Test: `e2e/handwriting.spec.ts`

**Verification:**
- `npm run data:build`
- `npm run test:e2e`

- [x] 描红、默写在平板视口可完成；一级字表 3500 字都有笔顺数据（构建脚本校验）

## Task 3: Boss 战界面与错字接入

**Outcome:** 孩子每天可以打 Boss 战；评估和默写的错字自动进入。

**Files:**
- Create: `src/features/boss/BossBattlePage.tsx`, `src/features/boss/api.ts`
- Modify: `src/db/schema.ts`（错字卡表）
- Test: `e2e/boss.spec.ts`

**Verification:**
- `npm run verify`
- `npm run test:e2e`

- [x] Boss 战完整流程通过，击败的字进入战利品

## References
- `docs/superplan/human/prd.md`（第 4.4、4.7A 节）

## Evidence（2026-10-19）
- 调度器先写测试：`scheduler.test.ts` 在实现前因模块不存在而失败，实现后 8 个测试通过（首次建卡次日到期、1→2→4 天逐档前进、连续 3 次击败、答错回到第 1 档、重复加入不重复建卡并合并来源、已击败的字再错时复活、逾期顺延且从实际复习日起算、跨月跨年和闰年日期）。
- 规则说明：按 PRD“连续答对 3 次击败”，实际只会用到第 1、2、4 天三档；第 7、15 天两档在当前规则下不会触发（已向用户说明，可作为后续“战利品复查”改进）。
- 笔顺数据：`npm run data:strokes` 复制 3507 个字（一级字表全部 + 课本字），约 9.5 MB，无缺失；文件不入库，构建和端到端测试前自动生成。
- 书写判定：默写写错笔画 ≤ 2 且未出现提示为“正确”，出现提示或错笔较多为“有提示”，点“写不出，看答案”为“错误”；后两种进入错字 Boss（单元测试覆盖）。
- 计划 03 的评估错字改为直接进入错字 Boss；启动时导入此前评估留下的待处理错字（`api.test.ts` 覆盖）。家长可以在“课本与字库”中手动把字加入错字 Boss。
- 认读页、Boss 战的大字改用笔顺数据绘制的楷体字形（解决计划 03 的遗留项）。
- `npm run verify`：Vitest 79 个测试通过，构建通过。
- `npm run test:e2e`：21 个测试通过。新增 4 个：按标准笔顺模拟手写，完成描红和默写；乱画的笔画不被接受；写不出的字次日出现在错字 Boss；Boss 战在模拟日期下按 1、2 天间隔复习（家长手动加入两个字，“上”认读和默写都对后隔 2 天回来，“五”读错后次日回来）。书写与 Boss 测试重复 3 次稳定。
- 待人工确认：在安卓平板上用手指描红和默写，确认跟手且判定合理。

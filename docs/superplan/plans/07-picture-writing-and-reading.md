---
id: "07"
title: "侦探看图写作、写作等级与阅读打卡"
type: "required"
status: "draft"
summary: "实现“找线索 → 推理 → 写报告 → 句子升级 → 家长评分”的看图写作引导流程和 5 级写作等级阶梯，以及阅读打卡和分难度推荐书单。"
source: "docs/superplan/human/prd.md"
created: "2026-10-19"
order: 7
depends_on: ["06"]
parent: ""
---

# 侦探看图写作、写作等级与阅读打卡 Plan

**Goal:** 把看图写作变成可分步完成的“破案”过程，用等级阶梯让不同基础的孩子都有下一步目标，并用打卡把每天的阅读习惯固定下来。

**Scope:**
- **侦探看图写作**：
  1. 家长添加图片（拍照或从相册选择）。
  2. 找线索：依次问“时间、地点、人物、事件”，每题有语音朗读；孩子可以打字回答，家长也可以代为记录。
  3. 推理：用“因为……所以……结果……”模板把线索串成故事线；多幅图时每图一句。
  4. 写报告：孩子在纸上写后拍照上传，或在屏幕上输入。
  5. 句子升级：展示 1～4 级示例，孩子选一句自评“几级”，再改写升一级。
  6. 家长评分：沿用计划 03 的 5 项评分表，并勾选本次是否达到当前等级目标，记入写作历史。
- **写作等级阶梯**（PRD 4.6）：1 级 3 句完整的话 → 2 级 5 句以上、四要素齐全 → 3 级一段话有起因、经过、结果 → 4 级有开头结尾和细节的短文 → 5 级恰当使用修辞和好词。
  - 起始等级取自计划 03 的评估；没有评估时从 1 级开始。
  - 达到当前等级目标 2 次后提示升级，升级时发放经验值。
  - 每次写作按当前等级显示目标、提示和示例；学习路线为“拓展”时，目标提高一级作为挑战（不影响实际等级）。
- **阅读打卡**：记录书名、时长，一键完成；标记“读完”时发放读完奖励；接入每日任务中的阅读项。
- **推荐书单**：内置书名和简介，按“入门 / 进阶”分级（如入门：《父与子》《小猪唏哩呼噜》《米小圈上学记》；进阶：《屁屁侦探》《神奇校车》），家长可以增删。

**Non-Goals:**
- 不做漫画分镜和“我的词库”（见计划 09）。
- 不做 AI 批改作文、语音转文字。
- 不收录书籍正文。

**Architecture:**
- 写作流程状态保存在 IndexedDB，可以中断后继续。
- 评分表组件与计划 03 共用，放在 `src/components/` 或 `src/features/writing/` 后由评估模块引用，不复制两份。

**Exit Criteria:**
- 单元测试：等级升级规则（达标 2 次升级、不跨级、5 级封顶）、拓展路线的挑战目标不改变实际等级。
- Playwright：完成一次完整写作流程（含图片和家长评分），写作历史中出现记录；连续两次达标后等级提升、经验值增加；中途退出后可以继续。
- Playwright：阅读打卡后，每日任务中的阅读项变为完成；标记读完后获得奖励。
- `npm run verify` 与 `npm run test:e2e` 通过。

## Task 1: 侦探看图写作流程

**Outcome:** 孩子可以在引导下完成一次看图写作，家长评分后记入历史，写作等级按规则提升。

**Files:**
- Create: `src/features/writing/` 下各步骤页面，`src/features/writing/logic/flow.ts`, `src/features/writing/logic/levels.ts`
- Modify: `src/db/schema.ts`（写作记录）；评估模块改为引用共享评分表组件
- Test: `src/features/writing/logic/flow.test.ts`, `src/features/writing/logic/levels.test.ts`, `e2e/writing.spec.ts`

**Verification:**
- `npm run verify`
- `npm run test:e2e`

- [ ] 写作全流程可完成，可中断续写，等级按规则提升

## Task 2: 阅读打卡与推荐书单

**Outcome:** 阅读可以打卡并计入每日任务和经验值。

**Files:**
- Create: `src/features/reading/ReadingLogPage.tsx`, `src/features/reading/booklist.ts`
- Modify: `src/features/daily/`（接入阅读任务）
- Test: `e2e/reading.spec.ts`

**Verification:**
- `npm run verify`
- `npm run test:e2e`

- [ ] 打卡、读完奖励、每日任务联动通过

## References
- `docs/superplan/human/prd.md`（第 4.6、4.7 节）

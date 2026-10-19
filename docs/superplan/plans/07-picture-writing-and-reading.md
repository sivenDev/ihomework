---
id: "07"
title: "侦探看图写作与阅读打卡"
type: "required"
status: "draft"
summary: "实现“找线索 → 推理 → 写报告 → 句子升级 → 家长评分”的看图写作引导流程，以及阅读打卡和推荐书单。"
source: "docs/superplan/human/prd.md"
created: "2026-10-19"
order: 7
depends_on: ["06"]
parent: ""
---

# 侦探看图写作与阅读打卡 Plan

**Goal:** 把看图写作变成可分步完成的“破案”过程，并用打卡把每天的阅读习惯固定下来。

**Scope:**
- **侦探看图写作**：
  1. 家长添加图片（拍照或从相册选择）。
  2. 找线索：依次问“时间、地点、人物、事件”，每题有语音朗读；孩子可以打字回答，家长也可以代为记录。
  3. 推理：用“因为……所以……结果……”模板把线索串成故事线；多幅图时每图一句。
  4. 写报告：孩子在纸上写后拍照上传，或在屏幕上输入。
  5. 句子升级：展示 1～4 级示例，孩子选一句自评“几级”，再改写升一级。
  6. 家长评分：沿用计划 03 的 5 项评分表，记入写作历史；升级时发放经验值。
- **阅读打卡**：记录书名、时长，一键完成；标记“读完”时发放读完奖励；接入每日任务中的阅读项。
- **推荐书单**：内置书名和简介（如《屁屁侦探》《神奇校车》《父与子》《米小圈上学记》《小猪唏哩呼噜》），家长可以增删。

**Non-Goals:**
- 不做漫画分镜和“我的词库”（见计划 09）。
- 不做 AI 批改作文、语音转文字。
- 不收录书籍正文。

**Architecture:**
- 写作流程状态保存在 IndexedDB，可以中断后继续。
- 评分表组件与计划 03 共用，放在 `src/components/` 或 `src/features/writing/` 后由评估模块引用，不复制两份。

**Exit Criteria:**
- Playwright：完成一次完整写作流程（含图片和家长评分），写作历史中出现记录，经验值增加；中途退出后可以继续。
- Playwright：阅读打卡后，每日任务中的阅读项变为完成；标记读完后获得奖励。
- `npm run verify` 与 `npm run test:e2e` 通过。

## Task 1: 侦探看图写作流程

**Outcome:** 孩子可以在引导下完成一次看图写作，家长评分后记入历史。

**Files:**
- Create: `src/features/writing/` 下各步骤页面，`src/features/writing/logic/flow.ts`
- Modify: `src/db/schema.ts`（写作记录）；评估模块改为引用共享评分表组件
- Test: `src/features/writing/logic/flow.test.ts`, `e2e/writing.spec.ts`

**Verification:**
- `npm run verify`
- `npm run test:e2e`

- [ ] 写作全流程可完成，可中断续写

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

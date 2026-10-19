---
id: "03"
title: "现状评估中心与评估报告"
type: "required"
status: "draft"
summary: "提供认读抽测、听写、组词、朗读计时和看图写作评分五项评估，生成识字量估算、待攻克清单、补强建议和建议练习级别，并保存历史供复评对比。"
source: "docs/superplan/human/prd.md"
created: "2026-10-19"
order: 3
depends_on: ["02"]
parent: ""
---

# 现状评估中心与评估报告 Plan

**Goal:** 让家长用 3～4 次、每次不超过 20 分钟的评估，摸清孩子的识字、书写、词汇、朗读和写作现状，并能每 4 周复评对比。

**Scope:**
- **认读抽测**：从已学识字表按册随机抽字（每册 30～40 个，数量可调），一屏一个大字；家长点“对 / 错”；可以中途暂停，下次接着做。
- **听写**：系统朗读字词，孩子在纸上写，家长逐个标记“写不出 / 写错 / 正确”。
- **组词与词语理解**：出字让孩子口头组词，出词让孩子说意思或造句，家长判定。
- **朗读计时**：家长粘贴文本，计时并记录卡顿次数，计算每分钟字数。
- **看图写作评分**：家长选择图片（存入本地），按 5 项评分表（每项 1～3 分）打分，可附作文照片。
- **评估报告**：估算识字量（各册正确率 × 该册已学字数之和）、书写正确率、待攻克清单、“优先补识字 / 优先补写作”建议、**建议练习级别**（轻松 / 标准 / 追赶）；保存历史，可以与上次对比。
- 待攻克清单保存为“补漏来源”，供计划 06 的补漏任务按天取字。
- 认读和听写中出错的字交给错字 Boss（通过计划 04 提供的接口；若计划 04 尚未完成，先写入待处理队列，计划 04 接入时导入）。

**Non-Goals:**
- 不做语音识别自动判定，所有判定由家长完成。
- 不做跨家庭常模比较；只和课本要求及自己的历史比较。

**Architecture:**
- 报告计算（识字量估算、建议规则）是纯函数，放在 `src/features/assessment/logic/`，与界面分离。
- 建议规则：认读正确率 < 75% → 优先补识字；认读 ≥ 90% 且写作总分 ≤ 9/15 → 优先补写作；其他情况 → 识字与写作并行。阈值集中定义为常量。
- 级别建议规则（PRD 4.5.1）：认读 < 75% → 追赶；认读 ≥ 90% 且书写 ≥ 85% → 轻松；其他 → 标准。只作建议，由家长在计划 06 的设置中决定。
- 图片和照片以 Blob 存入 IndexedDB，导出时编码进 JSON。

**Exit Criteria:**
- 五项评估都能从家长模式开始并完成，中断后可继续。
- 报告数值与单元测试中的手算样例一致；补强建议和级别建议的各个分支（含 75%、90%、85% 边界值）都有测试。
- 历史中至少两次评估时，报告页显示前后对比。
- `npm run verify` 与 `npm run test:e2e` 通过。

## Task 1: 评估计算逻辑

**Outcome:** 识字量估算、正确率、待攻克清单和建议规则可以独立测试。

**Files:**
- Create: `src/features/assessment/logic/report.ts`, `src/features/assessment/logic/sampling.ts`
- Test: `src/features/assessment/logic/report.test.ts`, `src/features/assessment/logic/sampling.test.ts`

**Verification:**
- `npx vitest run src/features/assessment`

- [ ] 估算、抽样（只抽已学范围、不重复）、补强建议和级别建议测试通过

## Task 2: 五项评估流程与报告页面

**Outcome:** 家长可以完成全部评估，查看报告和历史对比。

**Files:**
- Create: `src/features/assessment/` 下各评估页面与报告页
- Modify: `src/db/schema.ts`（评估记录、图片）
- Test: `e2e/assessment.spec.ts`

**Verification:**
- `npm run verify`
- `npm run test:e2e`

- [ ] 一次完整评估生成报告并保存；第二次评估后显示对比

## References
- `docs/superplan/human/prd.md`（第 4.2 节）

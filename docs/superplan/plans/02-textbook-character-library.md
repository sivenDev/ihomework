---
id: "02"
title: "课本字库、拓展字库、课本进度与家长字词管理"
type: "required"
status: "approved"
summary: "整理部编版一上至二下的识字表与写字表，以及《通用规范汉字表》一级字中的课外拓展字，补全拼音、部首、构字、组词数据，支持家长设置课本进度、超前学习和修改字词。"
source: "docs/superplan/human/prd.md"
created: "2026-10-19"
order: 2
depends_on: ["01"]
parent: ""
---

# 课本字库、拓展字库、课本进度与家长字词管理 Plan

**Goal:** 为所有出题、复习和评估功能提供准确、可核对、可修改的课本字库和拓展字库，以及“学到哪一课”的进度，让基础弱和基础好的孩子都有合适的字可学。

**Scope:**
- 根据公开资料整理部编版（统编版）一年级上册、一年级下册、二年级上册、二年级下册的“识字表”和“写字表”，按“册 → 单元 → 课”组织。
- **拓展字库**：《通用规范汉字表》一级字表（3500 字）中不在四册课本里的字，按现代汉语常用程度排序。
- 每个字补全：拼音（课本字的多音字取课本读音，拓展字取最常用读音）、部首、结构类型、笔画数、构字信息（象形 / 会意 / 形声及其形旁、声旁）、2～4 个常用组词。
- 源数据放在人工可读的 YAML 文件中，由生成脚本校验并输出应用使用的 JSON。
- 家长模式：设置当前册和当前课；“允许超前学习”开关；按课查看字词；修改、添加、删除字词（家长修改单独保存，覆盖内置数据，不改内置文件）；每个字有“已核对”标记。
- 出题范围查询函数：已学的字、当前课的字、下一课的字（预习用）。
- 拓展候选查询函数：超前课程的字（受开关控制）、已学字所在字族中的课外字、拓展字库按常用度排序的字；都排除已掌握的字。

**Non-Goals:**
- 不收录课文正文。
- 不做三年级及以上的课本字表（课外学习用拓展字库），不做其他教材版本。
- 不保证内置字库与课本 100% 一致；准确性由“已核对”标记和家长修改兜底。

**Architecture:**
- 字表来源：通过网络检索公开发布的部编版各册生字表，记录每册的来源网址；各册字数与课程标准公开的数量（约一上认 300 写 100、一下认 400 写 200、二上认 450 写 250、二下认 450 写 250）对照，偏差写入数据说明。
- 构字和部首：使用 Make Me a Hanzi 的 `dictionary.txt`（构字类型、形旁/声旁提示、部首），遵守其许可并在 `THIRD_PARTY_NOTICES.md` 注明。
- 一级字表：使用教育部 2013 年发布的《通用规范汉字表》一级字表；常用度排序使用公开的现代汉语字频表，在 `SOURCES.md` 记录来源和使用条件。
- 组词：从 CC-CEDICT（CC BY-SA 4.0）中挑选常用词，课本字优先用已学字组成的词，再人工抽查；注明出处。
- 字族（声旁）索引覆盖课本字和拓展字，由构字数据自动生成，供计划 05、06 使用。
- 运行时合并顺序：内置数据 → 家长修改。

**Baseline:**
- 计划 01 已提供 IndexedDB 仓储和家长模式。

**Exit Criteria:**
- `npm run data:build` 生成 `src/data/textbook.json` 和 `src/data/extension.json`，校验全部通过：没有缺拼音、缺部首的字；每课都有归属；各册字数与上面的公开数量偏差在 ±5% 内，或在数据说明中写明原因；拓展字库与课本字不重叠，课本字与拓展字合计覆盖一级字表全部 3500 字。
- 家长可以把进度设到四册中任意一课；出题范围和拓展候选查询结果与进度、超前学习开关一致（单元测试覆盖册与册之间的边界）。
- 家长修改字词后，出题和点读立即使用修改后的数据；导出导入后修改仍在。

## Task 1: 整理四册源数据与第三方数据

**Outcome:** 四册字表 YAML 文件和构字、组词数据就位，来源和许可有记录。

**Files:**
- Create: `data/textbook/g1a.yaml`, `data/textbook/g1b.yaml`, `data/textbook/g2a.yaml`, `data/textbook/g2b.yaml`, `data/textbook/SOURCES.md`, `data/extension/level1-chars.txt`, `data/extension/frequency.txt`, `data/vendor/`（构字与词典原始数据）, `THIRD_PARTY_NOTICES.md`

**Verification:**
- 人工检查 `data/textbook/SOURCES.md` 中每册都有来源和字数对照

- [ ] 四册字表与来源记录完成

## Task 2: 字库生成与校验脚本

**Outcome:** 一条命令生成应用使用的字库 JSON，并在数据不合格时失败。

**Files:**
- Create: `scripts/build-data/index.ts`, `scripts/build-data/validate.ts`, `src/data/textbook.json`, `src/data/extension.json`
- Test: `scripts/build-data/validate.test.ts`

**Verification:**
- `npm run data:build`
- `npx vitest run scripts/build-data`

- [ ] 生成成功，校验能识别缺字段、重复字、未归属的课

## Task 3: 课本进度、出题范围与家长字词管理

**Outcome:** 家长能设置进度、修改字词；其他模块通过统一函数获取出题范围。

**Files:**
- Create: `src/features/textbook/logic/scope.ts`, `src/features/textbook/logic/extension.ts`, `src/features/textbook/logic/merge.ts`, `src/features/textbook/ParentTextbookPage.tsx`
- Modify: `src/db/schema.ts`（家长修改、进度表）
- Test: `src/features/textbook/logic/scope.test.ts`, `src/features/textbook/logic/extension.test.ts`, `e2e/textbook.spec.ts`

**Verification:**
- `npm run verify`
- `npm run test:e2e`

- [ ] 进度设置、出题范围、家长修改覆盖均通过测试

## References
- `docs/superplan/human/prd.md`（第 4.1、4.5.2 节、第 10 节）

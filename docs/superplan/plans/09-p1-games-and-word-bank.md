---
id: "09"
title: "P1 扩展玩法：字理故事、汉字积木、找不同、字谜、漫画分镜、我的词库"
type: "future"
status: "draft"
summary: "在 MVP 之后增加四个汉字闯关玩法、漫画分镜写作和分类词库。"
source: "docs/superplan/human/prd.md"
created: "2026-10-19"
order: 9
depends_on: ["08"]
parent: ""
---

# P1 扩展玩法 Plan

**Goal:** MVP 稳定后，增加更多有挑战、更生动的玩法，保持孩子的新鲜感。

**Scope:**
- **字理故事**：象形字、会意字演变卡片（自绘或许可明确的图示 + 简短说明），看图猜字。
- **汉字积木**：给出一组部件，限时尽量多地拼出字（用计划 02 的构字数据判断）。
- **找不同**：易混字对比（己/已/巳、买/卖等），选出正确的字填进句子；易混字表可以由家长扩充。
- **字谜**：内置字谜，孩子可以自己编字谜存入“我的字谜库”，在家长模式中给家长做。
- **漫画分镜**：孩子在 4 格画布上画画或拍照上传，再接入看图写作流程写成文字。
- **我的词库**：按动作、心情、颜色、声音分类收集好词，写作时可在侧边栏查看。
- 每个玩法接入错字 Boss、经验值和自适应难度。

**Non-Goals:**
- 不做排行榜、社交分享。
- 不使用版权不明的甲骨文图片。

**Exit Criteria:**
- 每个新玩法有出题逻辑单元测试和一条 Playwright 游玩流程测试。
- 漫画分镜可以走完写作流程并由家长评分。
- `npm run verify` 与 `npm run test:e2e` 通过。

## Task 1: 四个汉字玩法

**Outcome:** 字理故事、汉字积木、找不同、字谜可以从闯关地图进入并完成。

**Files:**
- Create: `src/features/challenges/` 下对应玩法与逻辑文件
- Test: 对应 `*.test.ts` 与 `e2e/challenges-p1.spec.ts`

**Verification:**
- `npm run verify`
- `npm run test:e2e`

- [ ] 四个玩法可游玩并接入错字 Boss 和经验值

## Task 2: 漫画分镜与我的词库

**Outcome:** 孩子可以画漫画再写作，并收集、查看好词。

**Files:**
- Create: `src/features/writing/ComicPanels.tsx`, `src/features/wordbank/`
- Test: `e2e/comic-wordbank.spec.ts`

**Verification:**
- `npm run verify`
- `npm run test:e2e`

- [ ] 漫画写作流程和词库功能通过测试

## References
- `docs/superplan/human/prd.md`（第 4.3、4.6、4.7 节）

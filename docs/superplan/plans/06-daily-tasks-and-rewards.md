---
id: "06"
title: "三级练习量、每日任务、周 Boss 战与激励系统"
type: "required"
status: "draft"
summary: "按课本进度和轻松/标准/追赶三个练习级别自动生成每日预习、复习、补漏任务及周 Boss 战和单元挑战，并实现只加不扣的经验值、等级和家长确认的奖励兑换。"
source: "docs/superplan/human/prd.md"
created: "2026-10-19"
order: 6
depends_on: ["03", "04", "05"]
parent: ""
---

# 三级练习量、每日任务、周 Boss 战与激励系统 Plan

**Goal:** 把预习、复习、补漏和挑战组织成每天固定的短流程，练习量能按孩子的基础在三个级别间调整，让基础薄弱时可以追赶进度，并用看得见的成长激励孩子坚持。

**Scope:**
- **三个练习级别**（PRD 4.5.1）：

  | 级别（孩子看到的名称） | 每日时长 | 内容 | 补漏字/天 | Boss 上限 |
  |---|---|---|---|---|
  | 轻松（日常巡逻） | 约 15 分钟，1 段 | 当天复习、Boss、阅读 | 0 | 10 |
  | 标准（侦探训练） | 约 20 分钟，1 段 | 再加预习、补漏 | 3 | 15 |
  | 追赶（特训营） | 约 30 分钟，2 段，每段 ≤ 15 分钟，中间休息 5 分钟 | 同标准，补漏加量；周末加 15 分钟补漏闯关 | 8 | 25 |

  - 家长在家长模式中设置级别，并可在级别内微调补漏字数、Boss 上限和时长。
  - 当天可以临时切到“轻松”，第二天自动恢复原级别。
  - 使用时长提醒（计划 01）改为读取当前级别的每段时长；追赶级别第一段结束后显示休息倒计时，再进入第二段。
- **补漏任务**：
  - 补漏队列来源：计划 03 的待攻克清单，以及进度之前各课中从未答对过的字（按课本顺序，先早后晚）。
  - 每天按级别配额取字：先做一次部首侦探或字族学习，写字表中的字再描红，然后以来源 `backlog` 调用 `addMistake` 进入错字 Boss。
  - **防过载**：当天到期的 Boss 卡已超过上限时，新补漏字数按超出量减少（最少为 0）；超出上限的 Boss 卡顺延到第二天。
- **每日任务清单**（孩子首页）：
  - 按级别生成：预习“侦察任务”（下一课生字的部首侦探）、当天复习（本课生字闪认）、补漏、错字 Boss 战、阅读打卡（入口由计划 07 提供，本计划先占位）。
  - 每项标注预计时长，总和不超过该级别时长；超出时按优先级“Boss 战 → 当天复习 → 补漏 → 预习”保留，其余标为“可选”。
- **级别建议**（只提示，不自动切换）：
  - 首次评估后，采用计划 03 报告中的建议级别作为默认值，供家长确认。
  - 连续 3 天没完成必做任务 → 建议降一级。
  - 补漏队列已清空且周 Boss 正确率连续 2 周 ≥ 90% → 建议从“追赶”降到“标准”。
  - 周 Boss 正确率连续 2 周 < 70% → 建议升一级。
- **补漏进度**：已攻克 / 剩余字数，以及“预计还需几周补完”= 剩余字数 ÷（每日配额 × 最近 2 周平均每周练习天数），供家长看板（计划 08）显示。
- **周 Boss 战**：每周六起可用，从本周学过的生字抽 20 个，认读加默写；记录正确率并与上周对比。
- **单元挑战**：家长把进度推进到新单元时，为刚结束的单元生成一次综合挑战。
- **经验值与等级**：攻克 1 个字 +1，写作升一级 +5，读完 1 本书 +20，完成每日任务 +10（追赶级别完成两段 +20，体现多付出的努力）；等级称号为汉字学徒 → 部首侦探 → 字族猎人 → 文字大师（每个称号分 3 个小级，阈值集中定义）；只加不扣，升级时有庆祝动画。
- **奖励兑换**：家长在家长模式中设置奖励清单（名称、所需经验值）；孩子申请兑换，家长确认后扣除可用经验值（等级按累计经验值计算，不会因兑换下降）。
- **连续打卡天数**：完成当日必做任务即记一天。

**Non-Goals:**
- 不做排行榜、扣分、惩罚。
- 不做推送通知。

**Architecture:**
- 级别配置（时长、分段、补漏配额、Boss 上限）集中定义在 `src/features/daily/logic/levels.ts`，家长微调值覆盖默认值。
- 任务生成、补漏取字、防过载、级别建议、补漏预计、经验值计算、等级计算都是纯函数，输入为日期、级别配置、进度、补漏队列、错字卡和作答记录；经验值从作答记录事件推导或以事件表累加，保证同一事件不会重复加分（事件带唯一 id）。
- “累计经验值”决定等级，“可用经验值”用于兑换，两者分开存储。

**Exit Criteria:**
- 单元测试：三个级别生成的任务内容、时长与分段；补漏按配额和课本顺序取字；Boss 积压时减少新补漏字（含减到 0）；当天临时降级不影响第二天；四条级别建议规则及其边界；补漏预计周数；任务总时长裁剪规则；周 Boss 只抽本周字；单元挑战的触发；经验值不会重复发放；兑换后等级不变。
- Playwright：在“追赶”级别下完成两段任务（中间出现休息倒计时）后连续天数 +1、经验值增加，补漏字出现在错字 Boss 中；家长切换级别后首页任务随之变化；家长添加奖励、孩子申请、家长确认兑换的完整流程。
- `npm run verify` 与 `npm run test:e2e` 通过。

## Task 1: 任务生成与激励计算逻辑

**Outcome:** 三个级别、补漏、防过载、级别建议、每日任务、周 Boss、单元挑战、经验值和等级规则可以独立测试。

**Files:**
- Create: `src/features/daily/logic/levels.ts`, `src/features/daily/logic/backlog.ts`, `src/features/daily/logic/advisor.ts`, `src/features/daily/logic/planner.ts`, `src/features/rewards/logic/xp.ts`, `src/features/rewards/logic/ranks.ts`
- Test: `src/features/daily/logic/planner.test.ts`, `src/features/daily/logic/backlog.test.ts`, `src/features/daily/logic/advisor.test.ts`, `src/features/rewards/logic/xp.test.ts`

**Verification:**
- `npx vitest run src/features/daily src/features/rewards`

- [ ] 规则测试全部通过

## Task 2: 每日任务首页、级别设置、周 Boss 与奖励界面

**Outcome:** 孩子首页按级别显示今日任务（追赶级别分两段）和等级；家长可以设置级别、查看建议和管理奖励。

**Files:**
- Create: `src/features/daily/TodayPage.tsx`, `src/features/daily/WeeklyBossPage.tsx`, `src/features/daily/ParentPracticeLevelPage.tsx`, `src/features/rewards/LevelBadge.tsx`, `src/features/rewards/ParentRewardsPage.tsx`
- Modify: `src/db/schema.ts`（练习级别设置、补漏队列、经验值事件、奖励、打卡）, `src/lib/sessionTimer.ts`（按级别分段）
- Test: `e2e/daily.spec.ts`

**Verification:**
- `npm run verify`
- `npm run test:e2e`

- [ ] 三个级别的每日任务、追赶分段休息、级别设置、周 Boss、兑换流程在平板视口可完成

## References
- `docs/superplan/human/prd.md`（第 4.5、4.5.1、4.8 节）

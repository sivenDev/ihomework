---
id: "F005"
title: "生字闪认：读出声自动翻页与录音回听"
type: "feature"
status: "complete"
summary: "生字闪认用麦克风判断孩子读完一个字后自动翻页，并录下每个字的读音，结束后逐个回听“自己读的 vs 标准读音”；全程离线、录音不保存。"
source: "docs/superplan/human/features.md"
created: "2026-10-19"
depends_on: ["F002", "F003"]
parent: ""
---

# 生字闪认：读出声自动翻页与录音回听 Plan

**Goal:** 孩子在限时过程中只需要大声读，不用点“认识”；结束后通过听自己的录音来纠错。

**Scope:**
- **声音模式**（默认推荐）：开始时请求麦克风权限。每个字出现后，检测到孩子开口、读完并停顿约 0.6 秒，即记为“读过”并自动换下一个字；不认识的字可以点“跳过”；可以“提前结束”。
- **录音**：每个字截取孩子读的那一段（向前多留 0.3 秒、向后 0.2 秒），只保存在内存中，本关结束或离开页面即释放，不写入数据库、不上传。
- **回听纠错**：结束后每个字有“▶ 我读的”和“🔊 标准读音”两个按钮，以及“从头听一遍”（依次播放自己的读音和标准读音）；听出读错的点一下，仍按原规则计分和送入错字 Boss。
- **按钮模式**：麦克风不可用或孩子 / 家长选择时，使用原来的“认识 / 跳过”方式（保留 F002 的快速连点提醒）。
- 删除临时测试页 `#/asr-check`。

**Non-Goals:**
- 不做自动判断读音对错（在线识别在用户设备上不可用，离线识别准确度不足，已与用户确认）。
- 不保存录音历史。

**Architecture:**
- 开口检测（纯函数）：按约 20 毫秒一帧的音量，开头 0.5 秒估计环境噪音，阈值取噪音的 3 倍与固定下限中的较大值；连续 100 毫秒以上超过阈值算开口，开口后连续 600 毫秒低于阈值算读完；读音短于 150 毫秒的视为杂音忽略。时间按采样数计算，不依赖系统时钟。
- 录音：Web Audio 采集麦克风，降采样到 16 kHz 存入本关的缓冲区，按开口检测给出的区间截取为 WAV。
- 播放：录音用 `<audio>` 播放，标准读音沿用点读（Web Speech）。

**Exit Criteria:**
- 单元测试：开口检测（安静不触发、短促杂音忽略、正常读一个字触发一次、连读两个字触发两次、噪音大的环境自动提高阈值）；WAV 编码头部与长度正确。
- Playwright（模拟麦克风）：声音模式下“说话”后自动翻页；跳过和提前结束；回听页每个读过的字都有“我读的”录音可播放；麦克风被拒绝时退回按钮模式。
- `npm run verify` 与 `npm run test:e2e` 通过；用户在平板上实测声音模式（人工确认）。

## Task 1: 开口检测与录音

**Outcome:** 可测试的开口检测和本地录音截取。

**Files:**
- Create: `src/features/challenges/audio/vad.ts`, `src/features/challenges/audio/wav.ts`, `src/features/challenges/audio/mic.ts`
- Test: `src/features/challenges/audio/vad.test.ts`, `src/features/challenges/audio/wav.test.ts`

**Verification:**
- `npx vitest run src/features/challenges/audio`

- [x] 开口检测与 WAV 编码测试通过

## Task 2: 声音模式与回听

**Outcome:** 生字闪认支持声音模式和录音回听，临时测试页删除。

**Files:**
- Modify: `src/features/challenges/FlashRecall.tsx`, `src/features/challenges/challenges.css`, `src/app/routes.tsx`
- Delete: `src/app/AsrCheck.tsx`
- Test: `e2e/flash-voice.spec.ts`

**Verification:**
- `npm run verify`
- `npm run test:e2e`

- [x] 模拟麦克风的端到端测试通过

## References
- `docs/superplan/human/features.md`（F005）

## Evidence（2026-10-19）
- 方案来源：用户实测在线识别（`#/asr-check`）——浏览器支持接口，但一直“正在听”无任何结果；用户选定“读出声自动翻页 + 录音回听”。临时测试页已删除。
- 开口检测先写测试：8 个场景（安静、读一个字、停顿不够、短促杂音、字内短暂停顿、连读两个字、嘈杂环境自动提高阈值、校准期忽略）在实现前失败、实现后通过；WAV 编码测试通过。
- 声音模式：麦克风音频降采样到 16 kHz 暂存于内存，按开口区间（前 0.3 秒、后 0.2 秒）截取 WAV；录音地址在开始新一关和离开页面时统一释放（修复了初版中新增录音会提前释放旧录音的问题）；回听支持单个播放和“从头听一遍”。麦克风被拒绝时自动改用按钮模式并提示。
- Playwright（Web Audio 振荡器模拟麦克风）：读 3 个字自动翻页、跳过、提前结束、每个读过的字都有可播放的录音、标为读错后计分 2；60 毫秒的杂音不翻页；拒绝麦克风时退回按钮模式。慢速模拟（slowMo 300 毫秒）下重复 3 次通过。
- `npm run verify`：Vitest 113 个测试通过；`npm run test:e2e`：31 个测试通过。
- 待人工确认：在用户平板的 Chrome 上实测声音模式（环境噪音、孩子音量下的翻页灵敏度）。

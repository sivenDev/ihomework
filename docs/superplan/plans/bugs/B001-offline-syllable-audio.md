---
id: "B001"
title: "点读改用应用自带的普通话音节录音"
type: "bugfix"
status: "draft"
summary: "在不支持网页朗读的浏览器（如荣耀自带浏览器）上点读无声；改为播放应用自带的离线音节录音，系统语音只作后备。"
source: "docs/superplan/human/bugs.md"
created: "2026-10-19"
depends_on: ["02"]
parent: ""
---

# 点读改用应用自带的普通话音节录音 Plan

**Goal:** 任何安卓平板和浏览器上，点汉字都能听到正确的普通话读音，不依赖设备的语音引擎。

**Scope:**
- 打包普通话音节录音：只包含四册课本字和一级字表 3500 字实际用到的带调音节（约 1200 个），离线可用。
- 点读单字时，按字库中的课本读音（家长修改优先）找到对应音节录音播放；连续点击时停止上一个声音。
- 设备支持网页朗读（`speechSynthesis`）且有中文语音时，录音缺失的情况（如少数没有录音的音节）改用系统朗读；两者都不可用时才显示“无法发声”的提示。
- “没有中文语音”的黄色提示改为只在录音和系统朗读都不可用时出现。
- 删除临时诊断页 `#/speech-check`。

**Non-Goals:**
- 不做整句、整段朗读的录音（以后的听写、看图写作如需朗读句子，再单独规划）。
- 不做在线语音合成服务（违反“数据不上传、可离线”的要求）。
- 不做录音的音量、语速调节。

**Baseline:**
- 计划 01 的点读完全依赖 Web Speech API（`src/lib/speech.ts`）。
- 计划 02 提供每个字的课本读音（`chars.json` 的 `py[0]`，家长修改优先）。

**Reproduction:**
- 设备：荣耀平板 BVL-AN00，Android 16，荣耀自带浏览器（用户代理伪装为 Chrome/149）。
- 打开 `https://sivendev.github.io/ihomework/#/speech-check`，点 1–5 号试读按钮：全部无声；页面显示 `speechSynthesis: 不支持`、`语音数量: 0`（用户 2026-10-19 截图）。
- 在孩子首页点汉字：拼音正常弹出，但没有声音。

**Root Cause:**
- 该浏览器基于安卓 WebView，WebView 不提供 Web Speech API 的 `speechSynthesis`。应用的点读只有这一种发声方式，所以在这类浏览器上必然无声。
- 华为/荣耀设备通常没有谷歌语音服务；即使换用真正的 Chrome，也可能没有可用的中文语音引擎。所以单纯提示“换浏览器 / 装语音包”不能可靠解决，需要应用自带发音。

**Architecture:**
- 录音来源：hugolpz/audio-cmn 的音节录音（Chen Wang 录制，CC BY-SA，共 1707 个带调音节），选用低码率版本以控制体积；在 `THIRD_PARTY_NOTICES.md` 署名，录音文件按 CC BY-SA 原样分发。实施时先抽查音质和覆盖率；如果不合适，改用许可明确的开源语音合成模型在构建时离线生成同样的音节文件，播放逻辑不变。
- 读音 → 文件名：带调拼音转数字调（`qíng` → `qing2`，`lǜ` → `lv4`，轻声 `de` → 用第一声文件或单独的轻声文件，按录音集实际情况确定），写成纯函数并测试。
- 构建脚本 `scripts/build-data/audio.ts` 只复制用到的音节到 `public/audio/syllables/`，并校验每个课本字的读音都有录音（没有的列出来，播放时退回系统朗读）。
- 播放：`src/lib/speech.ts` 增加录音播放器（`HTMLAudioElement`），对外仍是 `getSpeaker().speak(text)`；单字走录音，其余走系统朗读。
- 离线缓存在计划 08 的 Service Worker 中统一处理（音频目录加入预缓存）。

**Exit Criteria:**
- 单元测试：读音到文件名的转换覆盖四个声调、ü、轻声、儿化等情况；播放器在录音缺失时退回系统朗读，两者都不可用时报告不可用。
- 构建校验：四册课本字的课本读音全部有对应录音（或列出明确的缺失清单并由系统朗读兜底）。
- Playwright：把 `window.speechSynthesis` 删除来模拟 WebView 浏览器，点汉字时请求并播放对应的音节文件（如“闯”请求 `chuang3.mp3`），页面不出现“无法发声”的提示。
- 在用户的荣耀平板上用自带浏览器点读，能听到正确读音（人工确认）。
- `npm run verify` 与 `npm run test:e2e` 通过。

## Task 1: 读音到音节文件的映射与录音打包（先写测试）

**Outcome:** 每个课本字和一级字都能找到对应的音节录音，录音随应用发布。

**Files:**
- Create: `src/lib/syllable.ts`, `scripts/build-data/audio.ts`, `public/audio/syllables/`
- Modify: `package.json`（`data:audio` 脚本）, `THIRD_PARTY_NOTICES.md`, `data/textbook/SOURCES.md`
- Test: `src/lib/syllable.test.ts`

**Verification:**
- `npx vitest run src/lib/syllable.test.ts`
- `npm run data:audio`

- [ ] 映射测试先失败后通过；打包脚本报告覆盖率

## Task 2: 录音优先的点读播放与回归测试

**Outcome:** 在没有 `speechSynthesis` 的浏览器里点读有声音；诊断页删除。

**Files:**
- Modify: `src/lib/speech.ts`, `src/lib/useSpeech.ts`, `src/components/SpeechNotice.tsx`, `src/app/routes.tsx`
- Delete: `src/app/SpeechCheck.tsx`
- Test: `src/lib/speech.test.ts`, `e2e/speech.spec.ts`

**Verification:**
- `npm run verify`
- `npm run test:e2e`
- 荣耀平板自带浏览器人工点读

- [ ] 模拟 WebView 的端到端测试通过，真机能听到读音

## References
- `docs/superplan/human/bugs.md`（B001）
- `docs/superplan/plans/02-textbook-character-library.md`

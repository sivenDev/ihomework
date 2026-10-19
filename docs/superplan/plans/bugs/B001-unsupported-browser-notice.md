---
id: "B001"
title: "不支持朗读的浏览器给出明确提示并引导用 Chrome 打开"
type: "bugfix"
status: "complete"
summary: "荣耀自带浏览器等基于 WebView 的浏览器没有网页朗读功能；检测到时提示并提供一键用 Chrome 打开，删除临时诊断页。"
source: "docs/superplan/human/bugs.md"
created: "2026-10-19"
depends_on: ["02"]
parent: ""
---

# 不支持朗读的浏览器给出明确提示并引导用 Chrome 打开 Plan

**Goal:** 孩子或家长在不支持朗读的浏览器里打开网站时，立刻知道原因并能一键换到 Chrome，而不是“点了没声音”。

**Scope:**
- 区分两种情况：浏览器根本没有网页朗读功能（`speechSynthesis` 不存在）；浏览器支持但设备没有中文语音。
- 第一种情况显示提示“这个浏览器不支持朗读……请用 Chrome 打开”，并提供“用 Chrome 打开”按钮（安卓 intent 链接，带上当前地址）和网址文本。
- 第二种情况保留原来的“安装中文语音包”提示。
- 删除临时诊断页 `#/speech-check`。

**Non-Goals:**
- 不打包自带录音（用户确认 Chrome 下点读正常，2026-10-19）；如果以后需要在其他浏览器中发声，再单独规划。
- 不检测或屏蔽具体的浏览器品牌。

**Baseline:**
- 计划 01 的点读只依赖 Web Speech API；不支持时 `getSpeaker().status()` 与“没有中文语音”同样返回 `unavailable`，提示内容误导（让用户去装语音包）。

**Reproduction:**
- 荣耀平板 BVL-AN00（Android 16）自带浏览器打开网站：诊断页显示 `speechSynthesis: 不支持`、语音数量 0，点读无声（用户截图，2026-10-19）。
- 同一平板用 Chrome 打开：点读有声音（用户确认，2026-10-19）。

**Root Cause:**
- 荣耀自带浏览器基于安卓 WebView，WebView 不提供 `speechSynthesis`。应用没有区分“不支持”和“没有中文语音”，提示内容不对，用户无从知道应该换 Chrome。

**Exit Criteria:**
- 单元测试：没有 `speechSynthesis` 时状态为 `unsupported`；有但无中文语音时为 `unavailable`；有中文语音时为 `available`。
- Playwright：删除 `window.speechSynthesis` 模拟 WebView 浏览器时，出现“请用 Chrome 打开”的提示，按钮链接指向 Chrome 并带当前地址；正常浏览器中不出现该提示。
- `#/speech-check` 不再存在（访问后回到首页）。
- `npm run verify` 与 `npm run test:e2e` 通过；用户在荣耀自带浏览器中能看到提示并跳转到 Chrome（人工确认）。

## Task 1: 区分不支持与无中文语音，并引导用 Chrome 打开

**Outcome:** 不支持朗读的浏览器给出明确提示和一键跳转；诊断页删除。

**Files:**
- Modify: `src/lib/speech.ts`, `src/components/SpeechNotice.tsx`, `src/app/App.css`, `src/app/routes.tsx`
- Delete: `src/app/SpeechCheck.tsx`
- Test: `src/lib/speech.test.ts`, `e2e/speech.spec.ts`

**Verification:**
- `npm run verify`
- `npm run test:e2e`

- [x] 三种语音状态测试通过，模拟 WebView 的端到端测试通过

## References
- `docs/superplan/human/bugs.md`（B001）

## Evidence（2026-10-19）
- 方案调整：用户在同一台荣耀平板上改用 Chrome 后点读正常，并选择“轻量修复”（不打包自带录音）。
- 回归测试先失败后通过：`src/lib/speech.test.ts` 中“没有 speechSynthesis 时为 unsupported”修复前返回 `unavailable`。
- `npm run verify`：Vitest 39 个测试通过（新增语音三种状态、Chrome intent 链接），构建通过。
- `npm run test:e2e`：13 个测试通过（新增：模拟 WebView 浏览器出现“请用 Chrome 打开”提示且链接正确、关闭后刷新不再出现；正常浏览器不出现；诊断页已删除）。
- 待人工确认：在荣耀自带浏览器打开网站，看到提示并能跳转到 Chrome。

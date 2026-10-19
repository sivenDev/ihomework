---
id: "10"
title: "安卓 APK 打包（Capacitor）"
type: "future"
status: "approved"
summary: "在需要时把同一套 Web 代码用 Capacitor 打包成可直接安装的安卓 APK。"
source: "docs/superplan/human/prd.md"
created: "2026-10-19"
order: 10
depends_on: ["08"]
parent: ""
---

# 安卓 APK 打包（Capacitor） Plan

**Goal:** 如果 PWA 安装方式不方便（比如没有 HTTPS 托管），提供一个可以直接安装到安卓平板的 APK。

**Scope:**
- 用 Capacitor 包装构建产物，生成 debug APK，可以通过 USB 或文件传输安装。
- 安卓系统自带的中文语音引擎可用时正常朗读；不可用时显示 PRD 要求的提示。
- 数据仍只保存在本机；提供从 PWA 版导出、在 APK 版导入的迁移说明。

**Non-Goals:**
- 不上架应用商店，不做签名发布流程。
- 不做 iOS 打包。

**Exit Criteria:**
- 在安卓平板上安装 APK 后，PRD 第 8 节的验收条目（PWA 离线一项除外，改为“断网可用”）全部通过。
- 从 PWA 导出的数据可以在 APK 中导入。

## Task 1: Capacitor 打包与设备验证

**Outcome:** 生成可安装的 APK 并在平板上通过验收。

**Files:**
- Create: `capacitor.config.ts`, `android/`, `docs/ANDROID.md`
- Modify: `package.json`（打包脚本）

**Verification:**
- `npm run build && npx cap sync android && (cd android && ./gradlew assembleDebug)`
- 在安卓平板上人工验收

- [ ] APK 可安装并通过验收

## References
- `docs/superplan/human/prd.md`（第 6 节）

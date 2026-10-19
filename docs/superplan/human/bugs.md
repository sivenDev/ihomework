# Bugs

> 缺陷清单（人工维护）。每条缺陷一个 `## ` 小节，编号 `B001`、`B002` … 顺序递增、不复用；linked worktree 中自动编号会追加分支限定，如 `B001@branch-slug`。
>
> 录入方式：对 AI 说“新建 bug: <标题>”，或手动复制下方模板。
>
> `status`：`proposed`（默认，待人工复核）→ `accepted`（已确认、可规划）→ `done`（已修复）。仅当用户明确授权录入并继续规划、内容忠实且不存在实质歧义时，AI 才可直接记录为 `accepted`；否则保持 `proposed` 并等待复核。`accepted` 只批准规划，不批准实施。

<!-- 新增条目模板（把 B<NNN> 替换为下一个编号，例如 B001）：

## B<NNN>: 简短标题

- status: proposed
- created: YYYY-MM-DD

复现步骤：
1. ...
期望：... ／ 实际：...
-->

## B001: 安卓平板 Chrome 上点读汉字听不到声音

- status: done
- created: 2026-10-19

复现步骤：
1. 在安卓平板 Chrome 打开 https://sivendev.github.io/ihomework/
2. 在孩子首页点任意汉字
期望：显示拼音并朗读该字 ／ 实际：听不到声音（用户在真机上反馈，2026-10-19；拼音是否显示、是否出现“没有中文语音”提示待确认）

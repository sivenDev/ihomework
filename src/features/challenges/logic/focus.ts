// 专注提醒（F002）：察觉孩子开始乱点。纯函数，时间由调用方测量。

/** 选项出现后多久才能作答（毫秒） */
export const THINK_MS = 1500
/** 生字闪认：字出现后多久才能点 */
export const FLASH_THINK_MS = 600
/** 一能点就点（毫秒内）视为“抢答” */
export const RUSH_MS = 800
/** 生字闪认：每个字从出现到点按钮不到这么久，视为没有认真读（大声读一个字约需 1 秒） */
export const FLASH_RUSH_MS = 900
/** 提醒弹出后，多少秒才能点“我准备好了” */
export const BREAK_SECONDS = 5

export interface Answer {
  correct: boolean
  /** 从可以作答到作答的时间 */
  ms: number
}

/** 最近 3 次全错，或其中至少 2 次是抢答且答错 → 需要提醒。 */
export function needsFocusBreak(history: Answer[]): boolean {
  const last = history.slice(-3)
  if (last.length < 3) return false
  if (last.every((a) => !a.correct)) return true
  return last.filter((a) => !a.correct && a.ms < RUSH_MS).length >= 2
}

/** 生字闪认：连续 4 次在字出现后很快就点按钮 → 提醒大声读出来。 */
export function flashRushing(intervals: number[], streak = 4): boolean {
  const last = intervals.slice(-streak)
  return last.length === streak && last.every((ms) => ms < FLASH_RUSH_MS)
}

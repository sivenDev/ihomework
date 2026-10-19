/** 闯关难度 1～5：决定出题范围和限时（PRD 4.3、计划 05） */
export const MIN_LEVEL = 1
export const MAX_LEVEL = 5
export const LEVEL_UP_ACCURACY = 0.85
export const LEVEL_DOWN_ACCURACY = 0.6

export const LEVEL_NAMES = ['', '当前课', '本册', '已学全部', '超前课程', '课外拓展'] as const

/** 生字闪认每关限时（秒），难度越高越短 */
export const FLASH_SECONDS = [0, 90, 75, 60, 50, 45] as const

/** 最近一关正确率 ≥ 85% 升一级，< 60% 降一级。 */
export function nextLevel(level: number, accuracy: number): number {
  if (accuracy >= LEVEL_UP_ACCURACY) return Math.min(MAX_LEVEL, level + 1)
  if (accuracy < LEVEL_DOWN_ACCURACY) return Math.max(MIN_LEVEL, level - 1)
  return level
}

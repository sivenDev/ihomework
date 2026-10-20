// 三条学习路线（PRD 4.5.2）：路线决定新字任务练什么。纯函数。
import type { Route } from '../../assessment/logic/types'

export const EXTENSION_RULES = {
  /** 周 Boss 正确率连续 2 周达到 */
  weeklyAccuracy: 0.9,
  weeklyStreak: 2,
  /** 首次评估课内认读、书写（听写）正确率 */
  recognition: 0.9,
  dictation: 0.85,
} as const

export interface RouteInput {
  /** 家长锁定的路线 */
  lock: Route | null
  /** 补漏清单中还没攻克的字数 */
  backlogRemaining: number
  /** 已完成的周 Boss 正确率，按周从早到晚 */
  weeklyAccuracies: number[]
  /** 第一次评估的认读、听写正确率 */
  firstAssessment?: { recognition: number; dictation?: number }
}

/** 拓展条件：周 Boss 最近连续 2 周 ≥ 90%，或首次评估课内认读 ≥ 90% 且书写 ≥ 85%。 */
export function qualifiesForExtension(input: Pick<RouteInput, 'weeklyAccuracies' | 'firstAssessment'>): boolean {
  const recent = input.weeklyAccuracies.slice(-EXTENSION_RULES.weeklyStreak)
  if (recent.length === EXTENSION_RULES.weeklyStreak && recent.every((a) => a >= EXTENSION_RULES.weeklyAccuracy)) return true
  const first = input.firstAssessment
  return !!first && first.recognition >= EXTENSION_RULES.recognition && (first.dictation ?? 0) >= EXTENSION_RULES.dictation
}

/** 每天生成任务前判断路线：家长锁定优先；有没攻克的补漏字就补漏（拓展也会回到补漏）；满足拓展条件就拓展；否则同步。 */
export function decideRoute(input: RouteInput): Route {
  if (input.lock) return input.lock
  if (input.backlogRemaining > 0) return '补漏'
  return qualifiesForExtension(input) ? '拓展' : '同步'
}

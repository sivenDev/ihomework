// 写作等级阶梯（PRD 4.6）：当前等级达标 2 次后提示升一级，一次只升一级，5 级封顶。纯函数。
import { WRITING_LEVELS } from '../../assessment/logic/types'
import type { Route } from '../../assessment/logic/types'

export type WritingLevel = 1 | 2 | 3 | 4 | 5

/** 升级需要的达标次数 */
export const HITS_TO_LEVEL_UP = 2
export const MAX_WRITING_LEVEL: WritingLevel = 5

/** 每一级的目标、写作提示和示例 */
export const WRITING_LADDER: Record<WritingLevel, { goal: string; tip: string; example: string }> = {
  1: {
    goal: WRITING_LEVELS[0].goal,
    tip: '每句话说清楚“谁在做什么”，句末加句号。',
    example: '小明在踢球。小狗跑过来了。他们玩得很开心。',
  },
  2: {
    goal: WRITING_LEVELS[1].goal,
    tip: '写清楚什么时候、在哪里、有谁、发生了什么事。',
    example: '星期天下午，小明和爸爸来到公园。他们在草地上踢球。一只小狗跑了过来。小狗追着球跑。大家都笑了。',
  },
  3: {
    goal: WRITING_LEVELS[2].goal,
    tip: '按“起因 → 经过 → 结果”的顺序写：先写为什么，再写怎么做，最后写结果怎样。',
    example: '星期天下午，小明在公园踢球，一不小心把球踢进了小河里。他急得团团转。这时，一只小狗跳进河里，把球叼了回来。小明谢过小狗，和它一起玩了起来。',
  },
  4: {
    goal: WRITING_LEVELS[3].goal,
    tip: '开头交代事情，结尾写感受；中间加上动作、说的话和心情。',
    example: '星期天，我和爸爸去公园踢球。……我大声说：“谢谢你，小狗！”回家的路上，我一直在想：小狗真是我的好朋友。',
  },
  5: {
    goal: WRITING_LEVELS[4].goal,
    tip: '试着用比喻、拟人，用上你积累的好词。',
    example: '球像一颗流星飞了出去，“扑通”一声掉进了小河。河水轻轻地推着它，好像在和它玩捉迷藏。',
  },
}

/** 句子升级的 1～4 级示例 */
export const SENTENCE_LADDER: { level: 1 | 2 | 3 | 4; text: string; note: string }[] = [
  { level: 1, text: '小明踢球。', note: '谁 + 做什么' },
  { level: 2, text: '下午，小明在操场上踢球。', note: '加上时间、地点' },
  { level: 3, text: '下午，小明在操场上开心地踢足球。', note: '加上怎么样地做' },
  { level: 4, text: '下午，小明在操场上带着球飞快地跑，一脚把球踢进了球门，高兴得跳了起来。', note: '加上连续的动作和心情' },
]

/** 起始等级：家长确认过的等级优先，其次用评估结果，都没有时从 1 级开始。 */
export function currentWritingLevel(saved: WritingLevel | null | undefined, assessed: number | undefined): WritingLevel {
  if (saved) return saved
  if (assessed && assessed >= 1 && assessed <= MAX_WRITING_LEVEL) return assessed as WritingLevel
  return 1
}

/** 本次写作的目标：拓展路线提高一级作为挑战（不影响实际等级），5 级时不再提高。 */
export function challengeGoal(level: WritingLevel, route: Route): WritingLevel {
  return route === '拓展' ? (Math.min(level + 1, MAX_WRITING_LEVEL) as WritingLevel) : level
}

/** 家长评分时勾选的结果：没达到、达到当前等级目标、达到挑战目标 */
export type GoalResult = 'none' | 'level' | 'challenge'

export interface ScoredWriting {
  /** 写作时的实际等级 */
  level: WritingLevel
  result: GoalResult
}

/**
 * 当前等级的达标情况：只数在当前等级写、达到目标（含挑战目标）的作文。
 * 升级后旧等级的达标记录不再计入，所以每次只升一级。
 */
export function levelStatus(records: ScoredWriting[], level: WritingLevel): { hits: number; canLevelUp: boolean } {
  const hits = records.filter((r) => r.level === level && r.result !== 'none').length
  return { hits, canLevelUp: level < MAX_WRITING_LEVEL && hits >= HITS_TO_LEVEL_UP }
}

export function nextWritingLevel(level: WritingLevel): WritingLevel {
  return Math.min(level + 1, MAX_WRITING_LEVEL) as WritingLevel
}

// 等级称号（PRD 4.8）：按累计经验值计算，兑换奖励不会让等级下降。

export const TITLES = ['汉字学徒', '部首侦探', '字族猎人', '文字大师'] as const
export const STEPS_PER_TITLE = 3

/** 每一级需要的累计经验值（4 个称号 × 3 小级） */
export const RANK_THRESHOLDS = [0, 30, 70, 120, 190, 280, 390, 520, 680, 870, 1100, 1400] as const

export interface Rank {
  index: number
  title: (typeof TITLES)[number]
  /** 称号内的小级 1～3 */
  step: number
  name: string
  /** 本级起点 */
  floor: number
  /** 下一级需要的累计经验值；已经最高级时为 null */
  next: number | null
}

export function rankOf(totalXp: number): Rank {
  let index = 0
  while (index + 1 < RANK_THRESHOLDS.length && totalXp >= RANK_THRESHOLDS[index + 1]) index++
  const title = TITLES[Math.floor(index / STEPS_PER_TITLE)]
  const step = (index % STEPS_PER_TITLE) + 1
  return { index, title, step, name: `${title} ${step} 级`, floor: RANK_THRESHOLDS[index], next: RANK_THRESHOLDS[index + 1] ?? null }
}

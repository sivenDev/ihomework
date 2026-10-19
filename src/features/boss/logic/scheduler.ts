// 错字 Boss 的间隔复习规则（PRD 4.4）。纯函数：日期由调用方传入，格式 YYYY-MM-DD（本地自然日）。

/** 复习间隔（天）：第 1、2、4、7、15 天 */
export const INTERVALS = [1, 2, 4, 7, 15] as const
/** 连续答对几次算“击败” */
export const DEFEAT_STREAK = 3

export interface BossCard {
  char: string
  /** 当前所在的间隔档（0 表示第 1 档） */
  stage: number
  /** 连续答对次数 */
  streak: number
  /** 下次复习日期 */
  due: string
  status: 'active' | 'defeated'
  /** 来源：assessment、flash、dictation、backlog、parent… */
  sources: string[]
  updatedAt: number
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + days))
  return t.toISOString().slice(0, 10)
}

/** 记录一次出错：新建卡片，或把已有卡片（含已击败的）重置到第 1 档。 */
export function addMistake(existing: BossCard | undefined, char: string, source: string, today: string, now = Date.now()): BossCard {
  return {
    char,
    stage: 0,
    streak: 0,
    due: addDays(today, INTERVALS[0]),
    status: 'active',
    sources: [...new Set([...(existing?.sources ?? []), source])],
    updatedAt: now,
  }
}

/** 记录一次复习结果。答对进入下一档，连续答对 3 次击败；答错回到第 1 档。间隔从实际复习的那天算起。 */
export function answer(card: BossCard, correct: boolean, today: string, now = Date.now()): BossCard {
  if (!correct) return { ...card, stage: 0, streak: 0, due: addDays(today, INTERVALS[0]), status: 'active', updatedAt: now }
  const streak = card.streak + 1
  if (streak >= DEFEAT_STREAK) return { ...card, streak, status: 'defeated', updatedAt: now }
  const stage = Math.min(card.stage + 1, INTERVALS.length - 1)
  return { ...card, stage, streak, due: addDays(today, INTERVALS[stage]), updatedAt: now }
}

/** 到期（含逾期顺延）的卡片。 */
export function isDue(card: BossCard, today: string): boolean {
  return card.status === 'active' && card.due <= today
}

export function dueCards(cards: BossCard[], today: string): BossCard[] {
  return cards.filter((c) => isDue(c, today)).sort((a, b) => a.due.localeCompare(b.due) || a.updatedAt - b.updatedAt)
}

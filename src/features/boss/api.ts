import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/schema'
import { localDate } from '../../lib/date'
import { defeatXpEvent } from '../rewards/logic/xp'
import { awardXp } from '../rewards/store'
import { addMistake, answer, type BossCard } from './logic/scheduler'

/** 其他模块记录错字的统一入口：新建或重置错字卡（同一个字不重复建卡）。 */
export async function addMistakes(chars: string[], source: string, today = localDate()): Promise<void> {
  if (!chars.length) return
  await db.transaction('rw', db.bossCards, async () => {
    for (const char of new Set(chars)) {
      const existing = await db.bossCards.get(char)
      await db.bossCards.put(addMistake(existing, char, source, today))
    }
  })
}

/** 记录一次复习；第一次打败这个字时经验值 +1。 */
export async function answerCard(char: string, correct: boolean, today = localDate()): Promise<BossCard | undefined> {
  const result = await db.transaction('rw', db.bossCards, async () => {
    const card = await db.bossCards.get(char)
    if (!card) return undefined
    const next = answer(card, correct, today)
    await db.bossCards.put(next)
    return { next, defeated: card.status === 'active' && next.status === 'defeated' }
  })
  if (result?.defeated) await awardXp([defeatXpEvent(char, Date.now())])
  return result?.next
}

/** 导入计划 04 之前评估留下的待处理错字。 */
export async function importPendingMistakes(today = localDate()): Promise<number> {
  return db.transaction('rw', db.bossCards, db.pendingMistakes, async () => {
    const pending = await db.pendingMistakes.toArray()
    for (const p of pending) {
      const existing = await db.bossCards.get(p.char)
      let card = existing
      for (const source of p.sources) card = addMistake(card, p.char, source, today)
      await db.bossCards.put(card!)
    }
    await db.pendingMistakes.clear()
    return pending.length
  })
}

export function useBossCards(): BossCard[] | undefined {
  return useLiveQuery(() => db.bossCards.toArray())
}

import { useLiveQuery } from 'dexie-react-hooks'
import { db, type ChallengeActivity, type ChallengeStatRow, type FamilyCollectionRow } from '../../db/schema'
import { localDate } from '../../lib/date'
import { addMistakes } from '../boss/api'
import { nextLevel } from './logic/difficulty'

export interface RoundAnswer {
  char: string
  correct: boolean
  /** 是否是已学的字：只有已学的字答错才进入错字 Boss */
  learned: boolean
}

export interface RoundResult {
  activity: ChallengeActivity
  level: number
  score: number
  answers: RoundAnswer[]
}

export interface RoundOutcome {
  accuracy: number
  newBest: boolean
  previousBest: number
  level: number
  nextLevel: number
}

export function defaultStat(activity: ChallengeActivity): ChallengeStatRow {
  return { activity, level: 1, best: {}, plays: 0 }
}

export function useChallengeStat(activity: ChallengeActivity): ChallengeStatRow | undefined {
  return useLiveQuery(async () => (await db.challengeStats.get(activity)) ?? defaultStat(activity), [activity])
}

/** 保存一关的结果：作答记录、个人纪录、难度升降；已学字答错进入错字 Boss。 */
export async function recordRound(result: RoundResult, today = localDate()): Promise<RoundOutcome> {
  const { activity, level, score, answers } = result
  const accuracy = answers.length ? answers.filter((a) => a.correct).length / answers.length : 0
  const ts = Date.now()
  const outcome = await db.transaction('rw', db.attempts, db.challengeStats, async () => {
    await db.attempts.bulkAdd(
      answers.map((a) => ({ char: a.char, activity, result: a.correct ? ('correct' as const) : ('wrong' as const), date: today, ts })),
    )
    const stat = (await db.challengeStats.get(activity)) ?? defaultStat(activity)
    const previousBest = stat.best[level] ?? 0
    const newLevel = nextLevel(level, accuracy)
    await db.challengeStats.put({
      ...stat,
      level: newLevel,
      best: { ...stat.best, [level]: Math.max(previousBest, score) },
      plays: stat.plays + 1,
      lastAccuracy: accuracy,
    })
    return { accuracy, newBest: score > previousBest, previousBest, level, nextLevel: newLevel }
  })
  await addMistakes(
    answers.filter((a) => !a.correct && a.learned).map((a) => a.char),
    activity,
    today,
  )
  return outcome
}

export async function saveFamily(phonetic: string, chars: string[], today = localDate()) {
  const existing = await db.familyCollection.get(phonetic)
  await db.familyCollection.put({ phonetic, chars: [...new Set([...(existing?.chars ?? []), ...chars])], date: today })
}

export function useFamilyCollection(): FamilyCollectionRow[] | undefined {
  return useLiveQuery(() => db.familyCollection.toArray())
}

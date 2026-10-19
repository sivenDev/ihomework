// 生字闪认当场纠错（F006）：孩子对照自己的读音和标准读音后，决定下一步。

/** 同一个字最多读几次（第一次 + 重读一次） */
export const MAX_READINGS = 2

export type CheckResult = 'first-try' | 'corrected' | 'gave-up' | 'skipped'

export interface FlashRecord {
  char: string
  result: CheckResult
}

/** readings：这个字已经读了几次（含刚读的这次） */
export function decide(readings: number, decision: 'same' | 'different'): { next: 'advance' | 'retry'; result?: CheckResult } {
  if (decision === 'same') return { next: 'advance', result: readings === 1 ? 'first-try' : 'corrected' }
  if (readings < MAX_READINGS) return { next: 'retry' }
  return { next: 'advance', result: 'gave-up' }
}

/** 只有第一次就读对的字得分；改正过、放弃和跳过的字都需要多练。 */
export function scoreFlash(records: FlashRecord[], learned: Set<string>) {
  const answers = records.map((r) => ({ char: r.char, correct: r.result === 'first-try', learned: learned.has(r.char) }))
  return {
    score: answers.filter((a) => a.correct).length,
    needPractice: records.filter((r) => r.result !== 'first-try').map((r) => r.char),
    answers,
  }
}

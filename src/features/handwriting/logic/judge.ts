/** 默写结果：正确 / 有提示（需要再练）/ 错误（写不出） */
export type WritingResult = 'correct' | 'hinted' | 'wrong'

/** 写错笔画总数不超过这个值、且没出现提示，算一次写对 */
export const ALLOWED_MISTAKES = 2

export function judgeWriting({ totalMistakes, hinted, gaveUp }: { totalMistakes: number; hinted: boolean; gaveUp: boolean }): WritingResult {
  if (gaveUp) return 'wrong'
  if (hinted || totalMistakes > ALLOWED_MISTAKES) return 'hinted'
  return 'correct'
}

import { LEVEL_NAMES } from './logic/difficulty'
import type { RoundOutcome } from './store'

/** 一关结束：得分、新纪录、难度变化。 */
export function RoundSummary({
  title,
  score,
  unit,
  outcome,
  onAgain,
}: {
  title: string
  score: number
  unit: string
  outcome: RoundOutcome
  onAgain: () => void
}) {
  const levelText =
    outcome.nextLevel > outcome.level
      ? `升级啦！下一关难度 ${outcome.nextLevel}：${LEVEL_NAMES[outcome.nextLevel]}`
      : outcome.nextLevel < outcome.level
        ? `下一关降到难度 ${outcome.nextLevel}：${LEVEL_NAMES[outcome.nextLevel]}，先把基础打牢`
        : `下一关还是难度 ${outcome.level}：${LEVEL_NAMES[outcome.level]}`
  return (
    <section className="card round-summary" role="status">
      <div className="summary-emoji" aria-hidden="true">
        {outcome.newBest ? '🏅' : outcome.accuracy >= 0.85 ? '🎉' : '💪'}
      </div>
      <h2>{title}</h2>
      <div className="summary-score" data-testid="round-score">
        {score} {unit}
      </div>
      {outcome.newBest && outcome.previousBest > 0 && <p className="summary-best">新纪录！比之前的 {outcome.previousBest} 多了 {score - outcome.previousBest}</p>}
      {outcome.newBest && outcome.previousBest === 0 && <p className="summary-best">第一次挑战这个难度，纪录就是你的！</p>}
      <p data-testid="level-change">{levelText}</p>
      <button type="button" className="btn btn-primary big-btn" onClick={onAgain}>
        再来一关
      </button>
    </section>
  )
}

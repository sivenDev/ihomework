import { RUBRIC_ITEMS, WRITING_LEVELS, type RubricKey, type RubricScores } from '../features/assessment/logic/types'

/** 看图写作评分表：5 项，每项 1～3 分（评估中心与侦探看图写作共用）。 */
export function WritingRubric({
  scores,
  onChange,
}: {
  scores: Partial<RubricScores>
  onChange: (key: RubricKey, value: 1 | 2 | 3) => void
}) {
  return (
    <div className="rubric">
      {RUBRIC_ITEMS.map((item) => (
        <fieldset key={item.key} className="rubric-row">
          <legend>{item.label}</legend>
          <div className="segmented">
            {([1, 2, 3] as const).map((v) => (
              <button
                type="button"
                key={v}
                className="btn"
                aria-pressed={scores[item.key] === v}
                aria-label={`${item.label} ${v} 分`}
                onClick={() => onChange(item.key, v)}
              >
                {v} 分
              </button>
            ))}
          </div>
          <p className="muted rubric-hint">
            1 分：{item.low}；3 分：{item.high}
          </p>
        </fieldset>
      ))}
      <p className="rubric-total">
        总分：{Object.values(scores).reduce((n, s) => n + (s ?? 0), 0)} / 15
      </p>
    </div>
  )
}

export function WritingLevelPicker({ level, onChange }: { level?: number; onChange: (level: 1 | 2 | 3 | 4 | 5) => void }) {
  return (
    <div className="level-picker" role="radiogroup" aria-label="写作等级">
      {WRITING_LEVELS.map((l) => (
        <button
          type="button"
          role="radio"
          key={l.level}
          aria-checked={level === l.level}
          className="level-option"
          onClick={() => onChange(l.level)}
        >
          <strong>{l.level} 级</strong>
          <span>{l.goal}</span>
        </button>
      ))}
    </div>
  )
}

import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { StoredImage } from '../../components/StoredImage'
import { WritingLevelPicker, WritingRubric } from '../../components/WritingRubric'
import { updateSettings } from '../../db/settings'
import { RUBRIC_ITEMS, type RubricScores } from '../assessment/logic/types'
import { CLUES, storySlots } from './logic/flow'
import { HITS_TO_LEVEL_UP, MAX_WRITING_LEVEL, nextWritingLevel, WRITING_LADDER, type GoalResult } from './logic/levels'
import { levelUpWriting, scoreWriting, useWriting, useWritings, useWritingStatus } from './store'
import './writing.css'

const RESULT_TEXT: Record<GoalResult, string> = { none: '没达到', level: '达到等级目标', challenge: '达到挑战目标' }

/** 家长：写作等级、等待评分的作文、写作历史。 */
export function ParentWritingPage() {
  const status = useWritingStatus()
  const writings = useWritings()
  const [adjust, setAdjust] = useState(false)

  if (!status || !writings) return <div className="page muted">正在加载…</div>
  const waiting = writings.filter((w) => w.data.status === 'submitted')
  const history = writings.filter((w) => w.data.status === 'scored')
  const next = nextWritingLevel(status.level)

  return (
    <div className="page">
      <div className="topbar">
        <h1>看图写作评分</h1>
        <Link className="btn btn-quiet" to="/parent">
          返回家长模式
        </Link>
      </div>

      <div className="parent-grid">
        <section className="card" aria-labelledby="writing-level-title">
          <h2 id="writing-level-title">写作等级</h2>
          <p data-testid="parent-writing-level">
            当前 {status.level} 级：{WRITING_LADDER[status.level].goal}
          </p>
          {status.level < MAX_WRITING_LEVEL && (
            <p className="muted">
              这一级已达标 {status.hits} 次，达标 {HITS_TO_LEVEL_UP} 次后可以升级。
            </p>
          )}
          {status.canLevelUp && (
            <div className="notice" role="status" data-testid="writing-level-up">
              <p>
                已经达标 {status.hits} 次，可以升到 {next} 级（{WRITING_LADDER[next].goal}）。升级时孩子得到 5 经验值。
              </p>
              <button type="button" className="btn btn-primary" onClick={() => void levelUpWriting()}>
                升到 {next} 级
              </button>
            </div>
          )}
          <div className="button-row">
            <button type="button" className="btn btn-quiet" aria-expanded={adjust} onClick={() => setAdjust(!adjust)}>
              手动调整等级
            </button>
          </div>
          {adjust && (
            <>
              <p className="muted">手动调整不发经验值。起始等级默认取自最近一次评估。</p>
              <WritingLevelPicker level={status.level} onChange={(level) => void updateSettings({ writingLevel: level })} />
            </>
          )}
        </section>

        <section className="card" aria-labelledby="writing-waiting-title">
          <h2 id="writing-waiting-title">等待评分</h2>
          {waiting.length === 0 ? (
            <p className="muted">孩子交上来的看图写作会出现在这里。</p>
          ) : (
            <ul className="reward-list">
              {waiting.map((w) => (
                <li key={w.id} className="reward-item">
                  <span>
                    {w.data.submittedOn ?? w.date} · {w.data.level} 级
                    {w.data.goal > w.data.level && `（挑战 ${w.data.goal} 级）`}
                  </span>
                  <Link className="btn btn-primary" to={`/parent/writing/${w.id}`}>
                    评分
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <h2 className="writing-section">写作历史</h2>
          {history.length === 0 ? (
            <p className="muted">还没有评过分的作文。</p>
          ) : (
            <ul className="reward-list">
              {history.map((w) => (
                <li key={w.id} className="reward-item" data-testid="writing-history">
                  <span>
                    {w.data.score!.date} · {w.data.level} 级 · {w.data.score!.total} / 15 分
                  </span>
                  <span className="muted">{RESULT_TEXT[w.data.score!.result]}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

/** 家长给一篇看图写作评分：5 项评分表 + 本次是否达到目标。 */
export function ParentWritingScorePage() {
  const { id } = useParams()
  const writing = useWriting(Number(id))
  const navigate = useNavigate()
  const [scores, setScores] = useState<Partial<RubricScores>>({})
  const [result, setResult] = useState<GoalResult | null>(null)

  if (writing === undefined) return <div className="page muted">正在加载…</div>
  const back = (
    <Link className="btn btn-quiet" to="/parent/writing">
      返回
    </Link>
  )
  if (!writing)
    return (
      <div className="page">
        <div className="topbar">
          <h1>看图写作评分</h1>
          {back}
        </div>
        <p className="card">没有找到这篇作文。</p>
      </div>
    )

  const { data } = writing
  const slots = storySlots(data.imageIds.length)
  const complete = RUBRIC_ITEMS.every((i) => scores[i.key]) && result !== null
  const options: { value: GoalResult; label: string }[] = [
    { value: 'level', label: `达到 ${data.level} 级目标：${WRITING_LADDER[data.level].goal}` },
    ...(data.goal > data.level ? [{ value: 'challenge' as const, label: `达到挑战目标（${data.goal} 级）：${WRITING_LADDER[data.goal].goal}` }] : []),
    { value: 'none', label: '这次还没达到' },
  ]

  return (
    <div className="page">
      <div className="topbar">
        <h1>看图写作评分</h1>
        {back}
      </div>
      <div className="writing-score-grid">
        <section className="card">
          <h2>孩子的作品</h2>
          <div className="writing-images">
            {data.imageIds.map((img, i) => (
              <StoredImage key={img} id={img} alt={`第 ${i + 1} 幅图`} className="writing-thumb" />
            ))}
          </div>
          <h3>线索</h3>
          <ul className="clue-list">
            {CLUES.map((c) => (
              <li key={c.key}>
                <strong>{c.label}</strong>：{data.clues[c.key]}
              </li>
            ))}
          </ul>
          <h3>推理</h3>
          <ul className="clue-list">
            {slots.map((label, i) => (
              <li key={label}>
                <strong>{label}</strong>：{data.story[i]}
              </li>
            ))}
          </ul>
          <h3>报告</h3>
          {data.report.text && <p className="writing-report">{data.report.text}</p>}
          {data.report.photoId && <StoredImage id={data.report.photoId} alt="作文照片" className="writing-photo" />}
          <h3>句子升级</h3>
          <p>
            原句（自评 {data.upgrade.selfLevel} 级）：{data.upgrade.sentence}
            <br />
            改写：{data.upgrade.rewrite}
          </p>
        </section>

        <section className="card">
          <h2>按评分表打分</h2>
          <WritingRubric scores={scores} onChange={(key, value) => setScores({ ...scores, [key]: value })} />
          <h2 className="writing-section">这次达到目标了吗？</h2>
          <div className="level-picker" role="radiogroup" aria-label="是否达到目标">
            {options.map((o) => (
              <button type="button" role="radio" key={o.value} aria-checked={result === o.value} className="level-option" onClick={() => setResult(o.value)}>
                {o.label}
              </button>
            ))}
          </div>
          <div className="button-row">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!complete}
              onClick={async () => {
                await scoreWriting(writing.id, scores as RubricScores, result!)
                navigate('/parent/writing')
              }}
            >
              保存评分
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}

import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { localDate } from '../../lib/date'
import { LEVELS } from '../daily/logic/levels'
import { WRITING_LADDER } from '../writing/logic/levels'
import { useDataset } from '../textbook/useDataset'
import { LiteracyChart, UsageBars } from './Charts'
import { CURVE_SERIES } from './logic/metrics'
import { adoptAdvice, dismissAdvice, loadDashboard } from './store'
import './dashboard.css'

const RESULT_TEXT = { none: '没达到', level: '达到等级目标', challenge: '达到挑战目标' } as const

/** 家长看板：识字量曲线、路线与级别、写作、错字 Boss、打卡与用时、复评提醒。 */
export function DashboardPage() {
  const ds = useDataset()
  const today = localDate()
  const data = useLiveQuery(async () => (ds ? loadDashboard(ds, today) : undefined), [ds, today])

  if (!data) return <p className="muted">正在加载看板…</p>
  const { state, overview, curve, writing, boss, usage, checkin, reassess } = data
  const latest = curve.at(-1)
  const usageTotal = usage.reduce((n, d) => n + d.minutes, 0)

  return (
    <div className="dashboard">
      <section className="card dashboard-wide" aria-labelledby="literacy-title">
        <h2 id="literacy-title">识字量</h2>
        {latest ? (
          <>
            <ul className="chart-legend" data-testid="literacy-latest">
              {CURVE_SERIES.map((s) => (
                <li key={s.key} className={`series-${s.key}`}>
                  <span className="legend-swatch" aria-hidden="true" />
                  {s.label} {latest[s.key] ?? '—'}
                </li>
              ))}
            </ul>
            <LiteracyChart points={curve} />
            <p className="muted">★ 为评估，其余为周 Boss 战。会写数据来自听写和默写；课外识字 = 拓展认读估算 + 之后学的课外字。</p>
          </>
        ) : (
          <p className="muted">
            完成一次<Link to="/parent/assessment">现状评估</Link>或周 Boss 战后，这里会显示课内认读、课内会写、课外识字三条曲线。
          </p>
        )}
      </section>

      <section className="card" aria-labelledby="route-dash-title">
        <h2 id="route-dash-title">路线与级别</h2>
        <p data-testid="dash-route">
          路线：<strong>{state.route}</strong>
          {state.settings.routeLock ? '（家长锁定）' : '（自动）'} · 级别：<strong>{overview.base}</strong>（{LEVELS[overview.base].kidName}）
          {!state.settings.practiceLevel && '，待家长确认'}
        </p>
        <p data-testid="dash-backlog">
          补漏：已攻克 {overview.backlog.conquered} / 剩余 {overview.backlog.remaining}
          {overview.backlog.remaining > 0 && (overview.backlog.weeks === null ? '，练几天后可以估计还需几周' : `，预计还需 ${overview.backlog.weeks} 周`)}
        </p>
        <p data-testid="dash-extension">
          拓展：课外新学 {overview.extension.total} 字（本周 {overview.extension.thisWeek}，上周 {overview.extension.lastWeek}）
        </p>
        {data.advice.map((a) => (
          <div key={a.kind} className="notice" data-testid="dash-advice">
            <p>
              {a.kind === 'down'
                ? `最近 3 天都没完成必做任务，建议降到“${a.to}”，先保护积极性。`
                : `周 Boss 正确率连续 2 周低于 70%：${a.to ? `建议升到“${a.to}”增加复习时间，` : ''}也检查一下每天的新字是否太多。`}
            </p>
            <div className="button-row">
              {a.to && (
                <button type="button" className="btn btn-primary" onClick={() => void adoptAdvice(a.to!)}>
                  采纳：改为{a.to}
                </button>
              )}
              <button type="button" className="btn btn-quiet" onClick={() => void dismissAdvice(a.kind)}>
                忽略
              </button>
            </div>
          </div>
        ))}
        <Link className="btn" to="/parent/practice">
          调整级别与路线
        </Link>
      </section>

      <section className="card" aria-labelledby="writing-dash-title">
        <h2 id="writing-dash-title">写作</h2>
        <p data-testid="dash-writing">
          写作等级 <strong>{writing.level} 级</strong>：{WRITING_LADDER[writing.level].goal}（本级已达标 {writing.hits} 次）
        </p>
        {writing.recent.length === 0 ? (
          <p className="muted">还没有评过分的看图写作。</p>
        ) : (
          <ul className="dash-list">
            {writing.recent.map((w, i) => (
              <li key={i} data-testid="dash-writing-score">
                {w.score!.date} · {w.level} 级 · {w.score!.total} / 15 分 · {RESULT_TEXT[w.score!.result]}
              </li>
            ))}
          </ul>
        )}
        <Link className="btn" to="/parent/writing">
          看图写作评分
        </Link>
      </section>

      <section className="card" aria-labelledby="boss-dash-title">
        <h2 id="boss-dash-title">错字 Boss</h2>
        <p data-testid="dash-boss">
          击败率 <strong>{boss.rate === null ? '—' : `${Math.round(boss.rate * 100)}%`}</strong>（已打败 {boss.defeated} / 共 {boss.total} 个）
        </p>
        {boss.active.length === 0 ? (
          <p className="muted">现在没有要复习的错字。</p>
        ) : (
          <>
            <p className="muted">还没打败的 {boss.active.length} 个字（先到期的在前）：</p>
            <p className="dash-chars" data-testid="dash-boss-chars">
              {boss.active.join(' ')}
            </p>
          </>
        )}
      </section>

      <section className="card" aria-labelledby="checkin-title">
        <h2 id="checkin-title">打卡与用时</h2>
        <p data-testid="dash-checkin">
          连续打卡 <strong>{checkin.streak}</strong> 天 · 累计完成 {checkin.total} 天
        </p>
        <p className="muted" data-testid="dash-usage">
          近 7 天共用 {usageTotal} 分钟（只算孩子模式下页面打开的时间）
        </p>
        <UsageBars days={usage} />
      </section>

      <section className="card" aria-labelledby="assess-dash-title">
        <h2 id="assess-dash-title">评估</h2>
        {!reassess ? (
          <p className="notice" data-testid="dash-reassess">
            还没有做过现状评估。做一次评估，系统会建议学习路线和练习级别。
          </p>
        ) : (
          <p className={reassess.daysLeft <= 0 ? 'notice' : ''} data-testid="dash-reassess">
            上次评估 {data.lastAssessment}。
            {reassess.daysLeft > 0 ? `距离下次复评（每 4 周）还有 ${reassess.daysLeft} 天。` : '已经到了复评的时间，建议再做一次评估，对比进步。'}
          </p>
        )}
        <Link className="btn" to="/parent/assessment">
          评估与历史对比
        </Link>
      </section>
    </div>
  )
}

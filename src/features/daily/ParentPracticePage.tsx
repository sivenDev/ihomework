import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { useSettings } from '../../app/useSettings'
import { updateSettings, type AppSettings } from '../../db/settings'
import { localDate } from '../../lib/date'
import type { PracticeLevel, Route } from '../assessment/logic/types'
import { useDataset } from '../textbook/useDataset'
import { LEVEL_ORDER, LEVELS, SEGMENT_MINUTE_OPTIONS, TWEAK_LIMITS, type LevelTweak } from './logic/levels'
import { loadDailyState, practiceOverview } from './store'
import './daily.css'

const ROUTES: Route[] = ['补漏', '同步', '拓展']
const ROUTE_NOTES: Record<Route, string> = {
  补漏: '先补以前没掌握的字（评估待攻克字、从没答对的字），按课本顺序先早后晚。',
  同步: '跟着课本学本课和下一课的字。',
  拓展: '超前课程（需开启超前学习）、字族里的课外字、常用字轮流学。',
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="setting-row">
      <span>{label}</span>
      <span className="stepper">
        <button type="button" className="btn" aria-label={`减少${label}`} disabled={value <= min} onClick={() => onChange(value - 1)}>
          −
        </button>
        <span className="stepper-value" data-testid={`tweak-${label}`}>
          {value}
        </span>
        <button type="button" className="btn" aria-label={`增加${label}`} disabled={value >= max} onClick={() => onChange(value + 1)}>
          ＋
        </button>
      </span>
    </div>
  )
}

/** 家长设置练习级别（练多少）和学习路线（练什么），查看系统建议和路线进度。 */
export function ParentPracticePage() {
  const ds = useDataset()
  const settings = useSettings()
  const today = localDate()
  const state = useLiveQuery(async () => (ds ? loadDailyState(ds, today) : undefined), [ds, today])

  if (!ds || !settings || !state) return <div className="page muted">正在加载…</div>

  // 微调的是家长选定的级别（还没选时是评估建议或默认的“标准”）
  const { base, cfg, advice, backlog, extension, weekly } = practiceOverview(state)
  const tweak = settings.levelTweaks[base] ?? {}
  const setTweak = (patch: LevelTweak) => updateSettings({ levelTweaks: { ...settings.levelTweaks, [base]: { ...tweak, ...patch } } })
  const chooseLevel = (level: PracticeLevel) => updateSettings({ practiceLevel: level, levelSince: today })
  const toggle = (key: keyof Pick<AppSettings, 'allowAhead' | 'extensionWriting'>) => updateSettings({ [key]: !settings[key] })

  return (
    <div className="page">
      <div className="topbar">
        <h1>练习级别与路线</h1>
        <Link className="btn btn-quiet" to="/parent">
          返回家长模式
        </Link>
      </div>

      <div className="parent-grid">
        <section className="card" aria-labelledby="level-title">
          <h2 id="level-title">练习级别（每天练多少）</h2>
          <div className="segmented" role="group" aria-labelledby="level-title">
            {LEVEL_ORDER.map((l) => (
              <button type="button" key={l} className="btn" aria-pressed={settings.practiceLevel === l} onClick={() => chooseLevel(l)}>
                {l}（{LEVELS[l].kidName}）
              </button>
            ))}
          </div>
          {!settings.practiceLevel && (
            <p className="notice" data-testid="level-suggestion">
              {state.suggested ? `评估建议：${state.suggested}。` : '还没有评估，暂按“标准”。'}请选择一个级别确认。
            </p>
          )}
          <div className="setting-row">
            <span>今天作业多，临时用“轻松”（明天自动恢复）</span>
            <button
              type="button"
              className="btn"
              aria-pressed={settings.easyDay === today}
              onClick={() => updateSettings({ easyDay: settings.easyDay === today ? null : today })}
            >
              今天轻松
            </button>
          </div>
          <p className="muted" data-testid="today-plan">
            今天实际：{state.level} · 约 {state.cfg.segments * state.cfg.segmentMinutes} 分钟
            {state.cfg.segments === 2 ? `（两段，中间休息 5 分钟）` : ''} · 新字 {state.cfg.newChars} 个/天 · Boss 上限 {state.cfg.bossCap}
          </p>
        </section>

        <section className="card" aria-labelledby="tweak-title">
          <h2 id="tweak-title">微调“{base}”</h2>
          <Stepper label="每天新字" value={cfg.newChars} {...TWEAK_LIMITS.newChars} onChange={(n) => setTweak({ newChars: n })} />
          <Stepper label="Boss 上限" value={cfg.bossCap} {...TWEAK_LIMITS.bossCap} onChange={(n) => setTweak({ bossCap: n })} />
          <div className="setting-row">
            <span id="segment-title">每段时长</span>
            <div className="segmented" role="group" aria-labelledby="segment-title">
              {SEGMENT_MINUTE_OPTIONS.map((m) => (
                <button type="button" key={m} className="btn" aria-pressed={cfg.segmentMinutes === m} onClick={() => setTweak({ segmentMinutes: m })}>
                  {m} 分钟
                </button>
              ))}
            </div>
          </div>
          <p className="muted">到时间后会提醒孩子休息{cfg.segments === 2 ? '；第一段结束后休息 5 分钟再开始第二段' : ''}。</p>
          <div className="button-row">
            <button type="button" className="btn btn-quiet" onClick={() => updateSettings({ levelTweaks: { ...settings.levelTweaks, [base]: {} } })}>
              恢复默认
            </button>
          </div>
        </section>

        <section className="card" aria-labelledby="route-title">
          <h2 id="route-title">学习路线（练什么）</h2>
          <p data-testid="current-route">
            当前路线：<strong>{state.route}</strong>
            {settings.routeLock ? '（家长锁定）' : '（自动）'}
          </p>
          <p className="muted">{ROUTE_NOTES[state.route]}</p>
          <div className="segmented" role="group" aria-label="锁定路线">
            <button type="button" className="btn" aria-pressed={!settings.routeLock} onClick={() => updateSettings({ routeLock: null })}>
              自动
            </button>
            {ROUTES.map((r) => (
              <button type="button" key={r} className="btn" aria-pressed={settings.routeLock === r} onClick={() => updateSettings({ routeLock: r })}>
                锁定{r}
              </button>
            ))}
          </div>
          {settings.routeNotice && (
            <p className="notice" data-testid="route-notice">
              {settings.routeNotice.date}：路线已从“{settings.routeNotice.from}”自动切换为“{settings.routeNotice.to}”。
              <button type="button" className="btn btn-quiet" onClick={() => updateSettings({ routeNotice: null })}>
                知道了
              </button>
            </p>
          )}
          <div className="setting-row">
            <span>允许超前学习后续课程（拓展路线）</span>
            <button type="button" className="btn" aria-pressed={settings.allowAhead} onClick={() => toggle('allowAhead')}>
              超前学习
            </button>
          </div>
          <div className="setting-row">
            <span>拓展字也要求会写（默认只认读）</span>
            <button type="button" className="btn" aria-pressed={settings.extensionWriting} onClick={() => toggle('extensionWriting')}>
              拓展字书写
            </button>
          </div>
        </section>

        <section className="card" aria-labelledby="progress-title">
          <h2 id="progress-title">路线进度与建议</h2>
          <p data-testid="backlog-progress">
            补漏：已攻克 {backlog.conquered} / 剩余 {backlog.remaining}
            {backlog.remaining > 0 && (backlog.weeks === null ? '，练几天后可以估计还需几周' : `，预计还需 ${backlog.weeks} 周`)}
          </p>
          <p data-testid="extension-progress">
            拓展：课外新学 {extension.total} 字（本周 {extension.thisWeek}，上周 {extension.lastWeek}）
          </p>
          {weekly.length > 0 && (
            <p>
              周 Boss：
              {weekly
                .slice(0, 4)
                .map((e) => `${e.key.slice(5)} 那周 ${Math.round((e.accuracy ?? 0) * 100)}%`)
                .join('，')}
            </p>
          )}
          {advice.length === 0 ? (
            <p className="muted">暂时没有调整建议。</p>
          ) : (
            advice.map((a) => (
              <p key={a.kind} className="notice" data-testid="level-advice">
                {a.kind === 'down'
                  ? `最近 3 天都没完成必做任务，可以考虑降到“${a.to}”，先保护积极性。`
                  : `周 Boss 正确率连续 2 周低于 70%：${a.to ? `可以考虑升到“${a.to}”增加复习时间，` : ''}也检查一下每天的新字是否太多。`}
              </p>
            ))
          )}
        </section>
      </div>
    </div>
  )
}

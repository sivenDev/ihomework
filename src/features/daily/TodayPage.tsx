import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useSettings } from '../../app/useSettings'
import { PinyinText } from '../../components/PinyinText'
import { db, type DailyPlanRow } from '../../db/schema'
import { updateSettings } from '../../db/settings'
import { localDate } from '../../lib/date'
import type { Route } from '../assessment/logic/types'
import { LevelBadge, LevelUp } from '../rewards/LevelBadge'
import { rankOf } from '../rewards/logic/ranks'
import { streakDays } from '../rewards/logic/xp'
import { useXp } from '../rewards/store'
import { useDataset } from '../textbook/useDataset'
import { LEVELS, REST_MINUTES } from './logic/levels'
import type { DailyTask, TaskId } from './logic/planner'
import { requiredSegments, segmentDone } from './logic/planner'
import { weeklyBossOpen, weekStart } from './logic/weekly'
import { ensureTodayPlan, useExams, useTodayPlan } from './store'
import './daily.css'

const NEW_CHAR_NOTES: Record<Route, string> = {
  补漏: '把以前没记住的字补回来',
  同步: '学本课和下一课的新字',
  拓展: '学课外的新字',
}

function taskInfo(task: DailyTask, route: Route): { name: string; icon: string; note: string; to?: string } {
  const info: Record<TaskId, { name: string; icon: string; note: string; to?: string }> = {
    preview: { name: '侦察任务', icon: '🔭', note: `先认识下一课的 ${task.chars?.length ?? 0} 个字`, to: '/learn?task=preview' },
    review: { name: '当天复习', icon: '⚡', note: '本课生字闪认', to: '/flash?task=review' },
    newChars: { name: '新字任务', icon: '🌱', note: `${NEW_CHAR_NOTES[route]}：${task.picks?.length ?? 0} 个`, to: '/learn?task=newChars' },
    boss: { name: '错字 Boss 战', icon: '🐉', note: `今天打 ${task.count ?? 0} 个`, to: '/boss?task=boss' },
    reading: { name: '阅读打卡', icon: '📖', note: '读一会儿书，记下来', to: '/reading?task=reading' },
    bonus: { name: '周末特训', icon: '🏋️', note: '部首侦探特训闯关', to: '/detective?task=bonus' },
  }
  return info[task.id]
}

function TaskCard({ task, plan }: { task: DailyTask; plan: DailyPlanRow }) {
  const info = taskInfo(task, plan.route)
  const done = !!plan.done[task.id]
  const locked = task.segment === 2 && plan.segment === 1
  const status = done ? '✓ 完成' : locked ? '🔒 休息后开始' : task.required ? `约 ${task.minutes} 分钟` : `可选 · 约 ${task.minutes} 分钟`
  const body = (
    <>
      <span className="task-icon" aria-hidden="true">
        {info.icon}
      </span>
      <span className="task-text">
        <span className="task-name">
          <PinyinText text={info.name} />
        </span>
        <span className="muted">
          <PinyinText text={info.note} />
        </span>
      </span>
      <span className="task-status muted">{status}</span>
    </>
  )
  const state = done ? 'done' : locked ? 'locked' : task.required ? 'todo' : 'optional'
  return (
    <li data-testid={`task-${task.id}`} data-state={state}>
      {info.to && !locked ? (
        <Link className="card task-card" to={info.to} data-state={state} aria-label={`${info.name}，${status}`}>
          {body}
        </Link>
      ) : (
        <div className="card task-card" data-state={state} aria-label={`${info.name}，${status}`}>
          {body}
        </div>
      )}
    </li>
  )
}

/** 孩子首页的今日任务：等级、连续天数、按级别和路线生成的任务（加强级别分两段）、周 Boss 与单元挑战。 */
export function TodayPage() {
  const ds = useDataset()
  const settings = useSettings()
  const plan = useTodayPlan()
  const xp = useXp()
  const exams = useExams()
  const days = useLiveQuery(() => db.dailyPlans.toArray())
  const today = localDate()

  useEffect(() => {
    if (ds && settings) void ensureTodayPlan(ds)
  }, [ds, settings])

  const rank = xp ? rankOf(xp.total) : null
  // 第一次显示等级时只记下，不弹庆祝
  const rankIndex = rank?.index
  useEffect(() => {
    if (rankIndex !== undefined && settings && settings.lastSeenRank === null) void updateSettings({ lastSeenRank: rankIndex })
  }, [rankIndex, settings])

  if (!settings || !xp || !days || !exams || plan === undefined) return <div className="muted">正在加载…</div>

  const streak = streakDays(days, today)
  const weeklyDone = exams.some((e) => e.kind === 'weekly' && e.key === weekStart(today) && e.status === 'done')
  const units = exams.filter((e) => e.kind === 'unit' && e.status === 'pending')
  const segments = plan ? requiredSegments(plan.tasks) : []

  return (
    <section aria-labelledby="today-title" className="today">
      <LevelBadge total={xp.total} available={xp.available} streak={streak} />

      <h2 id="today-title" className="section-title">
        <PinyinText text="今日任务" />
        {plan && (
          <span className="muted today-level" data-testid="today-level">
            {' '}
            {LEVELS[plan.level].kidName} · 约 {plan.tasks.filter((t) => t.required).reduce((n, t) => n + t.minutes, 0)} 分钟
          </span>
        )}
      </h2>

      {!settings.progressLessonId ? (
        <p className="card">
          <PinyinText text="请家长先在“课本与字库”里设置当前学到的课。" />
        </p>
      ) : !plan ? (
        <p className="muted">正在准备今天的任务…</p>
      ) : (
        <>
          {plan.complete && (
            <p className="card today-complete" role="status">
              🎉 <PinyinText text={`今天的任务完成啦！经验值 +${segments.length * 10}`} />
            </p>
          )}
          {[1, 2].map((seg) => {
            const tasks = plan.tasks.filter((t) => t.segment === seg)
            if (!tasks.length) return null
            return (
              <div key={seg} className="task-segment">
                {segments.length > 1 && (
                  <h3 className="segment-title">
                    <PinyinText text={seg === 1 ? '第一段' : '第二段'} />
                    {segmentDone(plan.tasks, plan.done, seg as 1 | 2) && <span className="muted"> ✓</span>}
                  </h3>
                )}
                <ul className="task-list">
                  {tasks.map((t) => (
                    <TaskCard key={t.id} task={t} plan={plan} />
                  ))}
                </ul>
                {seg === 1 && segments.length > 1 && (
                  <p className="muted segment-break">
                    <PinyinText text={`⏸️ 休息 ${REST_MINUTES} 分钟`} />
                  </p>
                )}
              </div>
            )
          })}
        </>
      )}

      {((weeklyBossOpen(today) && !weeklyDone) || units.length > 0) && (
        <ul className="task-list challenge-list" aria-label="挑战">
          {weeklyBossOpen(today) && !weeklyDone && (
            <li>
              <Link className="card task-card" to="/exam/weekly" data-state="optional">
                <span className="task-icon" aria-hidden="true">
                  👹
                </span>
                <span className="task-text">
                  <span className="task-name">
                    <PinyinText text="周 Boss 战" />
                  </span>
                  <span className="muted">
                    <PinyinText text="本周学过的字，认一认、写一写" />
                  </span>
                </span>
              </Link>
            </li>
          )}
          {units.map((u) => (
            <li key={u.id}>
              <Link className="card task-card" to={`/exam/unit/${u.id}`} data-state="optional">
                <span className="task-icon" aria-hidden="true">
                  🏯
                </span>
                <span className="task-text">
                  <span className="task-name">
                    <PinyinText text="单元挑战" />
                  </span>
                  <span className="muted">
                    <PinyinText text={u.title} />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {rank && settings.lastSeenRank !== null && rank.index > settings.lastSeenRank && (
        <LevelUp rank={rank} onClose={() => void updateSettings({ lastSeenRank: rank.index })} />
      )}
    </section>
  )
}

import { Outlet } from 'react-router-dom'
import { RestReminder } from '../components/RestReminder'
import { SegmentRest } from '../features/daily/SegmentRest'
import { requiredSegments } from '../features/daily/logic/planner'
import { beginSegmentTwo, useTodayPlan } from '../features/daily/store'
import { useTodayLevel } from '../features/daily/useDaily'
import { LEVELS } from '../features/daily/logic/levels'
import { useSessionTimer } from '../lib/useSessionTimer'
import { useUsageRecorder } from '../lib/useUsageRecorder'

/** 孩子模式的外壳：记录每日用时；按当前练习级别的每段时长计时；加强级别第一段结束后休息 5 分钟再进入第二段。 */
export function ChildLayout() {
  const today = useTodayLevel()
  const plan = useTodayPlan()
  const timer = useSessionTimer(today?.cfg.segmentMinutes ?? LEVELS['标准'].segmentMinutes)
  useUsageRecorder()

  const twoSegments = !!plan && requiredSegments(plan.tasks).includes(2)
  // 第一段的任务做完或者时间到了，都进入两段之间的休息
  const segmentRest = twoSegments && plan.segment === 1 && (plan.restUntil !== undefined || timer.needsRest)

  return (
    <>
      <Outlet />
      {segmentRest ? (
        <SegmentRest
          until={plan.restUntil}
          onStart={() => {
            void beginSegmentTwo(plan.date)
            timer.reset()
          }}
        />
      ) : (
        timer.needsRest && <RestReminder minutes={timer.minutes} onResume={timer.reset} />
      )}
    </>
  )
}

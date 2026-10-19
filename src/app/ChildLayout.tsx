import { Outlet } from 'react-router-dom'
import { RestReminder } from '../components/RestReminder'
import { DEFAULT_SETTINGS } from '../db/settings'
import { useSessionTimer } from '../lib/useSessionTimer'
import { useSettings } from './useSettings'

/** 孩子模式的外壳：负责使用时长计时和休息提醒。 */
export function ChildLayout() {
  const settings = useSettings()
  const limit = settings?.sessionLimitMinutes ?? DEFAULT_SETTINGS.sessionLimitMinutes
  const timer = useSessionTimer(limit)

  return (
    <>
      <Outlet />
      {timer.needsRest && <RestReminder minutes={timer.minutes} onResume={timer.reset} />}
    </>
  )
}

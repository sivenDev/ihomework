import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Dataset } from '../../data/types'
import { useDataset } from '../textbook/useDataset'
import { useActiveRun, type Run } from './store'

/** 各评估页面共用：取得字库和正在进行的评估；没有进行中的评估时回到评估首页。 */
export function useAssessment(): { ds: Dataset; run: Run } | undefined {
  const ds = useDataset()
  const run = useActiveRun()
  const navigate = useNavigate()
  useEffect(() => {
    if (run === null) navigate('/parent/assessment', { replace: true })
  }, [run, navigate])
  return ds && run ? { ds, run } : undefined
}

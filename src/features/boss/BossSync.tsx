import { useEffect } from 'react'
import { importPendingMistakes } from './api'

/** 启动时导入早先评估留下的待处理错字（计划 04 之前生成的报告）。 */
export function BossSync() {
  useEffect(() => {
    void importPendingMistakes()
  }, [])
  return null
}

import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { loadDataset } from '../../data/load'
import type { Dataset } from '../../data/types'
import { db } from '../../db/schema'
import { applyEdits, type CharEdit } from './logic/merge'

/** 应用实际使用的字库：内置字库 + 家长修改，修改后自动刷新。加载完成前为 undefined。 */
export function useDataset(): Dataset | undefined {
  const [base, setBase] = useState<Dataset>()
  useEffect(() => {
    let alive = true
    void loadDataset().then((ds) => alive && setBase(ds))
    return () => {
      alive = false
    }
  }, [])
  const lessonEdits = useLiveQuery(() => db.lessonEdits.toArray())
  const charEdits = useLiveQuery(() => db.charEdits.toArray())
  return useMemo(
    () => (base && lessonEdits && charEdits ? applyEdits(base, lessonEdits, charEdits) : undefined),
    [base, lessonEdits, charEdits],
  )
}

export function useCharEdits(): Map<string, CharEdit> {
  const edits = useLiveQuery(() => db.charEdits.toArray())
  return useMemo(() => new Map((edits ?? []).map((e) => [e.char, e])), [edits])
}

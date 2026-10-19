import { useEffect } from 'react'
import { setReadingSource } from '../../lib/pinyin'
import { useDataset } from './useDataset'

/** 把字库读音同步给点读组件。放在应用根部，不渲染任何内容。 */
export function ReadingSync() {
  const ds = useDataset()
  useEffect(() => setReadingSource(ds?.chars), [ds])
  return null
}

import { useEffect, useState } from 'react'
import { db } from '../db/schema'

/** 显示保存在本地数据库里的图片。 */
export function StoredImage({ id, alt, className }: { id: string; alt: string; className?: string }) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    let objectUrl: string | undefined
    let alive = true
    void db.blobs.get(id).then((row) => {
      if (!row || !alive) return
      objectUrl = URL.createObjectURL(row.blob)
      setUrl(objectUrl)
    })
    return () => {
      alive = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [id])
  return url ? <img src={url} alt={alt} className={className} /> : null
}

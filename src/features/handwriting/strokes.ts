/** 从本站加载笔顺数据（构建时复制到 public/strokes，可离线使用）。 */
export function loadStrokes(char: string): Promise<unknown> {
  return fetch(`${import.meta.env.BASE_URL}strokes/${encodeURIComponent(char)}.json`).then((res) => {
    if (!res.ok) throw new Error(`没有“${char}”的笔顺数据`)
    return res.json()
  })
}

export const strokeLoader = (char: string, onLoad: (data: never) => void, onError: (err?: unknown) => void) => {
  loadStrokes(char).then((d) => onLoad(d as never), onError)
}

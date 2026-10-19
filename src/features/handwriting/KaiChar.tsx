import HanziWriter from 'hanzi-writer'
import { useEffect, useRef, useState } from 'react'
import { strokeLoader } from './strokes'
import './handwriting.css'

interface Props {
  char: string
  size?: number
  className?: string
}

/** 用笔顺数据画出楷体大字（与课本字形一致）；没有笔顺数据时退回系统字体。 */
export function KaiChar(props: Props) {
  return <KaiCharInner key={`${props.char}-${props.size ?? 220}`} {...props} />
}

function KaiCharInner({ char, size = 220, className = '' }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const [fallback, setFallback] = useState(false)

  useEffect(() => {
    const el = host.current
    if (!el) return
    el.innerHTML = ''
    HanziWriter.create(el, char, {
      width: size,
      height: size,
      padding: 0,
      showOutline: false,
      strokeColor: '#2b2622',
      charDataLoader: strokeLoader,
      onLoadCharDataError: () => setFallback(true),
    })
  }, [char, size])

  return (
    <div className={`kai-char ${className}`} style={{ width: size, height: size }} data-testid="kai-char" aria-label={char} role="img">
      <div ref={host} hidden={fallback} />
      {fallback && (
        <span className="kai-char-fallback" style={{ fontSize: size * 0.8 }}>
          {char}
        </span>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { isHanzi, pinyinOf } from '../lib/pinyin'
import { getSpeaker } from '../lib/speech'
import './HanziSpeak.css'

const PINYIN_VISIBLE_MS = 4_000

/** 点读文本：每个汉字都可以点击，显示拼音并朗读。 */
export function HanziSpeak({ text, className = '' }: { text: string; className?: string }) {
  const [active, setActive] = useState<number | null>(null)

  useEffect(() => {
    if (active === null) return
    const id = window.setTimeout(() => setActive(null), PINYIN_VISIBLE_MS)
    return () => window.clearTimeout(id)
  }, [active])

  return (
    <span className={`hanzi-text ${className}`}>
      {Array.from(text).map((ch, i) =>
        isHanzi(ch) ? (
          <button
            type="button"
            key={i}
            className="hanzi"
            aria-label={`${ch}，${pinyinOf(ch)}`}
            aria-expanded={active === i}
            onClick={() => {
              setActive(i)
              getSpeaker().speak(ch)
            }}
          >
            {active === i && (
              <span className="hanzi-pinyin" data-testid="pinyin">
                {pinyinOf(ch)}
              </span>
            )}
            {ch}
          </button>
        ) : (
          <span key={i}>{ch}</span>
        ),
      )}
    </span>
  )
}

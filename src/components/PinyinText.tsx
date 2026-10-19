import { pinyin } from 'pinyin-pro'
import { useMemo } from 'react'
import { getSpeaker } from '../lib/speech'

/**
 * 带拼音的文字：每个汉字上方注拼音（按词语上下文选多音字读音）。
 * 注音部分只用于显示（aria-hidden），另放一份视觉隐藏的原文作为可访问文字——
 * 浏览器会在 ruby 之间插入空格，直接用注音部分会让按钮名称变成“部 首 侦 探”。
 * speak 为 true 时旁边加 🔊 朗读整句。
 */
export function PinyinText({ text, speak = false, className = '' }: { text: string; speak?: boolean; className?: string }) {
  const parts = useMemo(() => pinyin(text, { type: 'all', toneType: 'symbol' }), [text])
  return (
    <span className={`pinyin-text ${className}`}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {parts.map((p, i) =>
          p.isZh ? (
            <ruby key={i}>
              {p.origin}
              <rt>{p.pinyin}</rt>
            </ruby>
          ) : (
            <span key={i}>{p.origin}</span>
          ),
        )}
      </span>
      {speak && (
        <button
          type="button"
          className="speak-inline"
          aria-label={`朗读：${text}`}
          onClick={(e) => {
            e.stopPropagation()
            getSpeaker().speak(text)
          }}
        >
          🔊
        </button>
      )}
    </span>
  )
}

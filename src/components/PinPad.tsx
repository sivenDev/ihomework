import { useState } from 'react'
import { PIN_LENGTH } from '../lib/pin'
import './PinPad.css'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']

/** 数字键盘：输满 4 位后自动提交。 */
export function PinPad({ onComplete }: { onComplete: (pin: string) => void }) {
  const [digits, setDigits] = useState('')

  const press = (key: string) => {
    if (key === '⌫') {
      setDigits((d) => d.slice(0, -1))
      return
    }
    const next = (digits + key).slice(0, PIN_LENGTH)
    setDigits(next)
    if (next.length === PIN_LENGTH) {
      setDigits('')
      onComplete(next)
    }
  }

  return (
    <div className="pinpad">
      <div className="pinpad-dots" aria-label={`已输入 ${digits.length} 位`}>
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <span key={i} className="pinpad-dot" data-filled={i < digits.length} />
        ))}
      </div>
      <div className="pinpad-keys">
        {KEYS.map((key, i) =>
          key ? (
            <button
              type="button"
              key={i}
              className="btn"
              aria-label={key === '⌫' ? '删除' : key}
              onClick={() => press(key)}
            >
              {key}
            </button>
          ) : (
            <span key={i} />
          ),
        )}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { PinPad } from '../components/PinPad'
import { updateSettings } from '../db/settings'
import { hashPin, makeSalt, verifyPin } from '../lib/pin'
import { useParentSession } from './ParentSession'
import { useSettings } from './useSettings'

/** 家长模式入口：首次使用设置 PIN，之后输入 PIN 才能进入。 */
export function ParentGate() {
  const settings = useSettings()
  const { unlocked, unlock } = useParentSession()
  const [firstPin, setFirstPin] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  if (unlocked) return <Outlet />
  if (!settings) return <div className="page muted">正在加载…</div>

  const hasPin = Boolean(settings.pinHash && settings.pinSalt)

  let title: string
  let hint: string
  let onComplete: (pin: string) => void

  if (!hasPin && firstPin === null) {
    title = '设置家长 PIN'
    hint = '请设置一个 4 位数字 PIN，孩子不知道的那种。'
    onComplete = (pin) => {
      setFirstPin(pin)
      setMessage(null)
    }
  } else if (!hasPin) {
    title = '再输入一次 PIN'
    hint = '确认一下刚才的 4 位数字。'
    onComplete = async (pin) => {
      if (pin !== firstPin) {
        setFirstPin(null)
        setMessage('两次输入不一致，请重新设置。')
        return
      }
      const salt = makeSalt()
      await updateSettings({ pinSalt: salt, pinHash: hashPin(pin, salt) })
      unlock()
    }
  } else {
    title = '输入家长 PIN'
    hint = '家长模式用于设置和查看学习情况。'
    onComplete = (pin) => {
      if (verifyPin(pin, settings.pinSalt!, settings.pinHash!)) unlock()
      else setMessage('PIN 不正确，请再试一次。')
    }
  }

  return (
    <div className="page">
      <div className="topbar">
        <h1>{title}</h1>
        <Link className="btn btn-quiet" to="/">
          返回
        </Link>
      </div>
      <div className="card gate-card">
        <p className="muted">{hint}</p>
        {message && (
          <p className="error" role="alert">
            {message}
          </p>
        )}
        <PinPad key={title} onComplete={onComplete} />
      </div>
    </div>
  )
}

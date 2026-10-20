import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PinyinText } from '../../components/PinyinText'
import { requestRedemption, useRedemptions, useRewards, useXp } from './store'
import './rewards.css'

const STATUS_TEXT = { pending: '等家长确认', confirmed: '已兑换', declined: '家长没有同意' } as const

/** 孩子用经验值申请兑换奖励，家长确认后生效。 */
export function RewardShopPage() {
  const rewards = useRewards()
  const redemptions = useRedemptions()
  const xp = useXp()
  const [message, setMessage] = useState<string | null>(null)

  if (!rewards || !redemptions || !xp) return <div className="page muted">正在加载…</div>

  return (
    <div className="page">
      <div className="topbar">
        <h1>⭐ 我的奖励</h1>
        <Link className="btn btn-quiet" to="/">
          <PinyinText text="回首页" />
        </Link>
      </div>

      <section className="card">
        <p className="badge-name" data-testid="shop-available">
          <PinyinText text={`可兑换的经验值：${xp.available}`} />
        </p>
        <p className="muted">
          <PinyinText text="兑换不会让你的等级下降。" />
        </p>
        {rewards.length === 0 ? (
          <p>
            <PinyinText text="家长还没有设置奖励。" />
          </p>
        ) : (
          <ul className="reward-list">
            {rewards.map((r) => (
              <li key={r.id} className="reward-item">
                <span>
                  <span className="reward-name">
                    <PinyinText text={r.name} />
                  </span>{' '}
                  · {r.cost}
                </span>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={xp.available < r.cost}
                  aria-label={`申请兑换“${r.name}”`}
                  onClick={async () => setMessage((await requestRedemption(r)) ? '已经申请，等家长确认。' : '经验值还不够，继续加油！')}
                >
                  <PinyinText text={xp.available < r.cost ? `还差 ${r.cost - xp.available}` : '申请兑换'} />
                </button>
              </li>
            ))}
          </ul>
        )}
        {message && (
          <p role="status">
            <PinyinText text={message} />
          </p>
        )}
      </section>

      {redemptions.length > 0 && (
        <section className="card" style={{ marginTop: 'var(--space-4)' }}>
          <h2>
            <PinyinText text="我的申请" />
          </h2>
          <ul className="reward-list">
            {redemptions.slice(0, 10).map((r) => (
              <li key={r.id} className="reward-item" data-testid="my-redemption">
                <span>{r.name}</span>
                <span className="muted">
                  <PinyinText text={STATUS_TEXT[r.status]} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

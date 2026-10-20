import { useState } from 'react'
import { Link } from 'react-router-dom'
import { addReward, decideRedemption, removeReward, useRedemptions, useRewards, useXp } from './store'
import './rewards.css'

const STATUS_TEXT = { pending: '等待确认', confirmed: '已兑换', declined: '没有同意' } as const

/** 家长设置奖励清单，确认孩子的兑换申请。 */
export function ParentRewardsPage() {
  const rewards = useRewards()
  const redemptions = useRedemptions()
  const xp = useXp()
  const [name, setName] = useState('')
  const [cost, setCost] = useState('50')

  if (!rewards || !redemptions || !xp) return <div className="page muted">正在加载…</div>
  const pending = redemptions.filter((r) => r.status === 'pending')
  const history = redemptions.filter((r) => r.status !== 'pending')
  const costValue = Number(cost)
  const valid = name.trim().length > 0 && Number.isInteger(costValue) && costValue > 0

  return (
    <div className="page">
      <div className="topbar">
        <h1>奖励清单</h1>
        <Link className="btn btn-quiet" to="/parent">
          返回家长模式
        </Link>
      </div>

      <div className="parent-grid">
        <section className="card" aria-labelledby="xp-title">
          <h2 id="xp-title">孩子的经验值</h2>
          <p data-testid="parent-xp">
            累计 {xp.total}（决定等级，不会减少）· 可兑换 {xp.available}
          </p>
          <h3>等待确认的申请</h3>
          {pending.length === 0 ? (
            <p className="muted">暂时没有申请。</p>
          ) : (
            <ul className="reward-list">
              {pending.map((r) => (
                <li key={r.id} className="reward-item">
                  <span>
                    <span className="reward-name">{r.name}</span> · {r.cost} 经验值
                  </span>
                  <span className="button-row">
                    <button type="button" className="btn btn-primary" onClick={() => void decideRedemption(r.id, true)}>
                      确认兑换
                    </button>
                    <button type="button" className="btn" onClick={() => void decideRedemption(r.id, false)}>
                      不同意
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {history.length > 0 && (
            <>
              <h3>兑换记录</h3>
              <ul className="reward-list">
                {history.slice(0, 10).map((r) => (
                  <li key={r.id} className="reward-item">
                    <span>
                      {r.name} · {r.cost}
                    </span>
                    <span className="muted">{STATUS_TEXT[r.status]}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="card" aria-labelledby="rewards-title">
          <h2 id="rewards-title">奖励设置</h2>
          <p className="muted">建议用体验类奖励，例如选周末去哪里玩、一起做一件事。</p>
          <form
            className="reward-form"
            onSubmit={(e) => {
              e.preventDefault()
              if (!valid) return
              void addReward(name, costValue)
              setName('')
            }}
          >
            <label>
              奖励名称
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={30} />
            </label>
            <label>
              需要经验值
              <input type="number" inputMode="numeric" min={1} value={cost} onChange={(e) => setCost(e.target.value)} />
            </label>
            <button type="submit" className="btn btn-primary" disabled={!valid}>
              添加奖励
            </button>
          </form>
          {rewards.length > 0 && (
            <ul className="reward-list" aria-label="奖励">
              {rewards.map((r) => (
                <li key={r.id} className="reward-item">
                  <span>
                    <span className="reward-name">{r.name}</span> · {r.cost} 经验值
                  </span>
                  <button type="button" className="btn btn-quiet" aria-label={`删除“${r.name}”`} onClick={() => void removeReward(r.id)}>
                    删除
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

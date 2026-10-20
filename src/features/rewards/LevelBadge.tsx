import { Link } from 'react-router-dom'
import { PinyinText } from '../../components/PinyinText'
import { rankOf, type Rank } from './logic/ranks'
import './rewards.css'

/** 等级、经验值进度、连续打卡天数。 */
export function LevelBadge({ total, available, streak }: { total: number; available: number; streak: number }) {
  const rank = rankOf(total)
  const progress = rank.next === null ? 1 : (total - rank.floor) / (rank.next - rank.floor)
  return (
    <section className="card level-badge" aria-label="我的等级">
      <div className="badge-rank">
        <span className="badge-icon" aria-hidden="true">
          {RANK_ICONS[Math.floor(rank.index / 3)]}
        </span>
        <div>
          <div className="badge-name" data-testid="rank-name">
            <PinyinText text={rank.name} />
          </div>
          <div className="xp-bar" aria-hidden="true">
            <div className="xp-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <div className="muted" data-testid="xp-total">
            经验值 {total}
            {rank.next !== null && ` / ${rank.next}`}
          </div>
        </div>
      </div>
      <div className="badge-stats">
        <span className="badge-stat" data-testid="streak">
          🔥 <PinyinText text={`连续 ${streak} 天`} />
        </span>
        <Link className="btn btn-quiet" to="/rewards" data-testid="xp-available">
          ⭐ <PinyinText text={`可兑换 ${available}`} />
        </Link>
      </div>
    </section>
  )
}

const RANK_ICONS = ['🐣', '🔍', '🏹', '👑']

/** 升级时的庆祝动画。 */
export function LevelUp({ rank, onClose }: { rank: Rank; onClose: () => void }) {
  return (
    <div className="rest-overlay" role="dialog" aria-modal="true" aria-labelledby="level-up-title">
      <div className="card rest-card level-up">
        <div className="level-up-icon" aria-hidden="true">
          {RANK_ICONS[Math.floor(rank.index / 3)]}
        </div>
        <h2 id="level-up-title">
          <PinyinText text="升级啦！" speak />
        </h2>
        <p className="badge-name">
          <PinyinText text={`你现在是 ${rank.name}`} />
        </p>
        <button type="button" className="btn btn-primary big-btn" onClick={onClose}>
          <PinyinText text="太棒了" />
        </button>
      </div>
    </div>
  )
}

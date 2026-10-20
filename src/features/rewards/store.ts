import { useLiveQuery } from 'dexie-react-hooks'
import { db, type RedemptionRow, type RewardRow } from '../../db/schema'
import { newId } from '../../lib/id'
import { freshEvents, xpSummary, type XpEvent } from './logic/xp'

/** 记录经验值事件；同一个 id 只记一次。返回这次新记上的事件。 */
export async function awardXp(events: XpEvent[]): Promise<XpEvent[]> {
  if (!events.length) return []
  return db.transaction('rw', db.xpEvents, async () => {
    const existing = await db.xpEvents.bulkGet(events.map((e) => e.id))
    const fresh = freshEvents(
      existing.filter((e) => e).map((e) => e!.id),
      events,
    )
    await db.xpEvents.bulkAdd(fresh)
    return fresh
  })
}

export async function loadXp() {
  const [events, redemptions] = await Promise.all([db.xpEvents.toArray(), db.redemptions.toArray()])
  return xpSummary(events, redemptions)
}

export function useXp() {
  return useLiveQuery(loadXp)
}

export function useRewards(): RewardRow[] | undefined {
  return useLiveQuery(() => db.rewards.toArray().then((rows) => rows.sort((a, b) => a.cost - b.cost || a.createdAt - b.createdAt)))
}

export function useRedemptions(): RedemptionRow[] | undefined {
  return useLiveQuery(() => db.redemptions.toArray().then((rows) => rows.sort((a, b) => b.requestedAt - a.requestedAt)))
}

export async function addReward(name: string, cost: number) {
  await db.rewards.add({ id: newId(), name: name.trim(), cost, createdAt: Date.now() })
}

export async function removeReward(id: string) {
  await db.rewards.delete(id)
}

/** 孩子申请兑换：可用经验值够才会记下申请，等家长确认。 */
export async function requestRedemption(reward: RewardRow): Promise<boolean> {
  return db.transaction('rw', db.xpEvents, db.redemptions, async () => {
    const { available } = await loadXp()
    if (available < reward.cost) return false
    await db.redemptions.add({ id: newId(), rewardId: reward.id, name: reward.name, cost: reward.cost, status: 'pending', requestedAt: Date.now() })
    return true
  })
}

/** 家长确认（扣除可用经验值）或不同意（退回）。等级按累计经验值计算，不受影响。 */
export async function decideRedemption(id: string, confirm: boolean) {
  await db.redemptions.update(id, { status: confirm ? 'confirmed' : 'declined', decidedAt: Date.now() })
}

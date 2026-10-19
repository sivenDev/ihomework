import { describe, expect, it } from 'vitest'
import { addDays, addMistake, answer, dueCards, INTERVALS, isDue, type BossCard } from './scheduler'

const TODAY = '2026-10-19'

describe('addDays', () => {
  it('handles month and year boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-12-30', 4)).toBe('2027-01-03')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2026-03-28', 7)).toBe('2026-04-04')
  })
})

describe('addMistake', () => {
  it('creates a card due the next day', () => {
    const card = addMistake(undefined, '晴', 'assessment', TODAY)
    expect(card).toMatchObject({ char: '晴', stage: 0, streak: 0, due: '2026-10-20', status: 'active', sources: ['assessment'] })
  })

  it('resets an existing card instead of duplicating it, keeping its sources', () => {
    let card = addMistake(undefined, '晴', 'assessment', TODAY)
    card = answer(card, true, '2026-10-20')
    card = addMistake(card, '晴', 'flash', '2026-10-21')
    expect(card).toMatchObject({ stage: 0, streak: 0, due: '2026-10-22', status: 'active', sources: ['assessment', 'flash'] })
  })

  it('brings a defeated card back when the character is missed again', () => {
    let card = addMistake(undefined, '晴', 'assessment', TODAY)
    for (const d of ['2026-10-20', '2026-10-22', '2026-10-26']) card = answer(card, true, d)
    expect(card.status).toBe('defeated')
    card = addMistake(card, '晴', 'dictation', '2026-11-01')
    expect(card).toMatchObject({ status: 'active', due: '2026-11-02', streak: 0 })
  })
})

describe('answer', () => {
  it('moves through the 1, 2, 4 day intervals and is defeated after 3 correct answers in a row', () => {
    expect(INTERVALS).toEqual([1, 2, 4, 7, 15])
    let card = addMistake(undefined, '晴', 'assessment', TODAY)
    card = answer(card, true, '2026-10-20')
    expect(card).toMatchObject({ stage: 1, streak: 1, due: '2026-10-22' })
    card = answer(card, true, '2026-10-22')
    expect(card).toMatchObject({ stage: 2, streak: 2, due: '2026-10-26' })
    card = answer(card, true, '2026-10-26')
    expect(card).toMatchObject({ streak: 3, status: 'defeated' })
  })

  it('goes back to the first interval after a wrong answer', () => {
    let card = addMistake(undefined, '晴', 'assessment', TODAY)
    card = answer(card, true, '2026-10-20')
    card = answer(card, true, '2026-10-22')
    card = answer(card, false, '2026-10-26')
    expect(card).toMatchObject({ stage: 0, streak: 0, due: '2026-10-27', status: 'active' })
  })

  it('schedules from the day it was actually reviewed when overdue', () => {
    let card = addMistake(undefined, '晴', 'assessment', TODAY)
    card = answer(card, true, '2026-10-25')
    expect(card.due).toBe('2026-10-27')
  })
})

describe('due cards', () => {
  const make = (char: string, due: string, status: BossCard['status'] = 'active'): BossCard => ({
    char,
    stage: 0,
    streak: 0,
    due,
    status,
    sources: [],
    updatedAt: 0,
  })

  it('includes overdue cards, excludes future and defeated ones, oldest first', () => {
    const cards = [make('甲', '2026-10-21'), make('乙', '2026-10-15'), make('丙', TODAY), make('丁', '2026-10-01', 'defeated')]
    expect(isDue(cards[1], TODAY)).toBe(true)
    expect(isDue(cards[0], TODAY)).toBe(false)
    expect(dueCards(cards, TODAY).map((c) => c.char)).toEqual(['乙', '丙'])
  })
})

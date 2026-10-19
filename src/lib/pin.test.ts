import { describe, expect, it } from 'vitest'
import { hashPin, isValidPin, makeSalt, verifyPin } from './pin'

describe('pin', () => {
  it('accepts exactly four digits', () => {
    expect(isValidPin('0420')).toBe(true)
    expect(isValidPin('123')).toBe(false)
    expect(isValidPin('12345')).toBe(false)
    expect(isValidPin('12a4')).toBe(false)
  })

  it('verifies only the original pin', () => {
    const salt = makeSalt()
    const hash = hashPin('2468', salt)
    expect(verifyPin('2468', salt, hash)).toBe(true)
    expect(verifyPin('2469', salt, hash)).toBe(false)
  })

  it('produces different hashes for different salts', () => {
    expect(hashPin('2468', makeSalt())).not.toBe(hashPin('2468', makeSalt()))
  })
})

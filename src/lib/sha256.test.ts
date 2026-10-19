import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { sha256Hex } from './sha256'

describe('sha256Hex', () => {
  it('matches the standard test vector', () => {
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })

  it('matches node crypto for empty, multi-block and non-ASCII input', () => {
    for (const input of ['', 'a'.repeat(55), 'a'.repeat(56), 'b'.repeat(200), '汉字闯关:1234']) {
      expect(sha256Hex(input)).toBe(createHash('sha256').update(input, 'utf8').digest('hex'))
    }
  })
})

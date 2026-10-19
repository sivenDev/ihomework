import { describe, expect, it } from 'vitest'
import { chromeIntentUrl } from './chrome'

describe('chromeIntentUrl', () => {
  it('keeps the path and hash route of the published site', () => {
    expect(chromeIntentUrl('https://sivendev.github.io/ihomework/#/parent')).toBe(
      'intent://sivendev.github.io/ihomework/#/parent#Intent;scheme=https;package=com.android.chrome;end',
    )
  })
})

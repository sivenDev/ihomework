import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PinyinText } from './PinyinText'

describe('PinyinText', () => {
  it('annotates each character with pinyin chosen by context', () => {
    const { container } = render(<PinyinText text="长大了，长江。" />)
    const rts = [...container.querySelectorAll('rt')].map((rt) => rt.textContent)
    expect(rts).toEqual(['zhǎng', 'dà', 'le', 'cháng', 'jiāng'])
    expect(container.querySelector('[aria-hidden="true"]')!.textContent).toContain('，')
  })

  it('keeps pinyin out of the accessible name of buttons and headings', () => {
    render(
      <button type="button">
        <PinyinText text="我会读" />
      </button>,
    )
    expect(screen.getByRole('button', { name: '我会读' })).toBeInTheDocument()
  })

  it('adds a speak button when asked', () => {
    render(<PinyinText text="它可能读什么？" speak />)
    expect(screen.getByRole('button', { name: '朗读：它可能读什么？' })).toBeInTheDocument()
  })
})

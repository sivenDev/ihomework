// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { fixtureDataset } from '../../src/test/fixtures'
import { structureOf } from './build'
import { validateDataset } from './validate'

const level1 = ['天', '地', '人', '青', '山', '晴', '请', '情', '蜻', '清', '睛', '大', '小']

describe('validateDataset', () => {
  it('accepts a consistent dataset', () => {
    expect(validateDataset(fixtureDataset(), level1).errors).toEqual([])
  })

  it('reports count mismatches against the printed totals', () => {
    const ds = fixtureDataset()
    ds.books[0].printed.shizi = 6
    expect(validateDataset(ds, level1).errors).toContain('一年级上册识字表 5 字，与课本标注的 6 字不符')
  })

  it('reports duplicate lesson ids and duplicate characters within a book', () => {
    const ds = fixtureDataset()
    ds.books[1].lessons[1].id = 'g1b-s1'
    ds.books[0].lessons[2].shizi.push({ char: '天', py: 'tiān' })
    const { errors } = validateDataset(ds, level1)
    expect(errors).toContain('课的编号重复：g1b-s1')
    expect(errors).toContain('一年级上册识字表中“天”重复出现（g1a-k1）')
  })

  it('reports missing titles, units and dictionary fields', () => {
    const ds = fixtureDataset()
    ds.books[0].lessons[0].title = ''
    ds.books[0].lessons[0].unit = 0
    ds.chars['人'] = { ...ds.chars['人'], py: [], radical: '' }
    delete ds.chars['山']
    const { errors } = validateDataset(ds, level1)
    expect(errors).toEqual(
      expect.arrayContaining([
        'g1a-s1 缺少课题',
        'g1a-s1 没有归属单元',
        '“人”缺少拼音',
        '“人”缺少部首',
        '字典缺少课本字“山”',
      ]),
    )
  })

  it('reports extension characters that overlap the textbook and uncovered level-1 characters', () => {
    const ds = fixtureDataset()
    ds.extension = ['天', '大']
    const { errors } = validateDataset(ds, level1)
    expect(errors).toContain('拓展字“天”与课本字重复')
    expect(errors).toContain('一级字表中有 3 字未被收录：清睛小')
  })

  it('only warns about textbook quirks', () => {
    const ds = fixtureDataset()
    ds.books[0].lessons[0].xiezi.push('元')
    ds.books[0].printed.xiezi += 1
    ds.chars['元'] = { ...ds.chars['天'] }
    const { errors, warnings } = validateDataset(ds, level1)
    expect(errors).toEqual([])
    expect(warnings).toContain('g1a-s1 写字“元”不在识字表中')
  })
})

describe('structureOf', () => {
  it('maps decomposition operators to structures', () => {
    expect(structureOf('⿰日青')).toBe('左右')
    expect(structureOf('⿱艹田')).toBe('上下')
    expect(structureOf('⿴囗玉')).toBe('包围')
    expect(structureOf('？')).toBe('独体')
    expect(structureOf('')).toBe('独体')
  })
})

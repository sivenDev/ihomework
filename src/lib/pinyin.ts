import { pinyin } from 'pinyin-pro'

const HAN = /\p{Script=Han}/u

export function isHanzi(ch: string): boolean {
  return HAN.test(ch)
}

let readings: Record<string, { py: string[] }> | undefined

/** 字库加载后注册课本读音和家长修改的读音，点读时优先使用。 */
export function setReadingSource(source: Record<string, { py: string[] }> | undefined) {
  readings = source
}

/** 单个汉字的带声调拼音：优先用字库里的课本读音，没有时用拼音库。 */
export function pinyinOf(ch: string): string {
  return readings?.[ch]?.py[0] ?? pinyin(ch, { toneType: 'symbol' })
}

import { pinyin } from 'pinyin-pro'

const HAN = /\p{Script=Han}/u

export function isHanzi(ch: string): boolean {
  return HAN.test(ch)
}

/** 单个汉字的带声调拼音。课本多音字读音由字库（计划 02）覆盖。 */
export function pinyinOf(ch: string): string {
  return pinyin(ch, { toneType: 'symbol' })
}

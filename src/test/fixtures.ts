import type { Book, CharInfo, Dataset, Lesson } from '../data/types'

function lesson(book: Book['id'], id: string, shizi: string, xiezi = '', duoyin = ''): Lesson {
  const reading = (s: string) => [...s].map((char) => ({ char, py: `py-${char}` }))
  return { id, book, unit: 1, kind: '阅读', num: 1, title: id, shizi: reading(shizi), duoyin: reading(duoyin), xiezi: [...xiezi] }
}

function info(rank: number, extra: Partial<CharInfo> = {}): CharInfo {
  return { py: ['x'], radical: '口', strokes: 3, structure: '左右', formation: '其他', words: [], rank, level1: rank, ...extra }
}

/** 两册小课本：g1a 有一节没有生字的拼音课，用来测试跨册和跳过空课。 */
export function fixtureDataset(): Dataset {
  const books: Book[] = [
    {
      id: 'g1a',
      name: '一年级上册',
      printed: { shizi: 5, xiezi: 2 },
      lessons: [lesson('g1a', 'g1a-s1', '天地人', '人'), lesson('g1a', 'g1a-p1', ''), lesson('g1a', 'g1a-k1', '青山', '山')],
    },
    {
      id: 'g1b',
      name: '一年级下册',
      printed: { shizi: 4, xiezi: 1 },
      lessons: [lesson('g1b', 'g1b-s1', '晴请', '晴', '地'), lesson('g1b', 'g1b-k1', '情蜻')],
    },
  ]
  const chars: Record<string, CharInfo> = {
    天: info(1),
    地: info(2),
    人: info(3),
    青: info(4),
    山: info(5),
    晴: info(6, { formation: '形声', semantic: '日', phonetic: '青' }),
    请: info(7, { formation: '形声', semantic: '讠', phonetic: '青' }),
    情: info(8, { formation: '形声', semantic: '忄', phonetic: '青' }),
    蜻: info(30, { formation: '形声', semantic: '虫', phonetic: '青' }),
    清: info(9, { formation: '形声', semantic: '氵', phonetic: '青' }),
    睛: info(20, { formation: '形声', semantic: '目', phonetic: '青' }),
    大: info(10),
    小: info(11),
  }
  return {
    books,
    chars,
    extension: ['清', '大', '小', '睛'],
    families: { 青: ['晴', '请', '情', '清', '睛', '蜻'] },
  }
}

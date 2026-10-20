// 推荐书单（PRD 4.7）：只有书名和简介，不收录正文。家长可以增删。纯函数。

export type BookLevel = '入门' | '进阶'

export interface BookEntry {
  id: string
  title: string
  intro: string
  level: BookLevel
}

export const BOOK_LEVELS: { level: BookLevel; note: string }[] = [
  { level: '入门', note: '图多字少，全注音或短句' },
  { level: '进阶', note: '字多一些，故事更长' },
]

export const BUILTIN_BOOKS: BookEntry[] = [
  { id: 'fu-yu-zi', title: '父与子', intro: '不用认字也能看懂的漫画，讲一对父子的快乐日常。', level: '入门' },
  { id: 'xi-li-hu-lu', title: '小猪唏哩呼噜', intro: '全注音童话，小猪唏哩呼噜的冒险故事。', level: '入门' },
  { id: 'mi-xiao-quan', title: '米小圈上学记', intro: '小学生的日记，写学校和家里的趣事。', level: '入门' },
  { id: 'qing-wa', title: '青蛙和蟾蜍', intro: '一对好朋友的小故事，句子短，好读。', level: '入门' },
  { id: 'mei-tou-nao', title: '没头脑和不高兴', intro: '两个小朋友闹出的好笑故事。', level: '入门' },
  { id: 'pi-pi', title: '屁屁侦探', intro: '跟着侦探找线索、破案的图画书。', level: '进阶' },
  { id: 'xiao-che', title: '神奇校车', intro: '坐上校车，去探索身体、太空和大自然。', level: '进阶' },
  { id: 'ben-lang', title: '笨狼的故事', intro: '傻乎乎的笨狼和朋友们的童话。', level: '进阶' },
  { id: 'xiao-ba-zhang', title: '小巴掌童话', intro: '一篇只有一两页的短童话，适合每天读一篇。', level: '进阶' },
]

/** 内置书单去掉家长删掉的，再加上家长添加的。 */
export function bookList(custom: BookEntry[], hidden: string[]): BookEntry[] {
  const removed = new Set(hidden)
  return [...BUILTIN_BOOKS.filter((b) => !removed.has(b.id)), ...custom.filter((b) => !removed.has(b.id))]
}

/** 用于“读完一本书”奖励去重：同一本书只奖励一次。 */
export function bookKey(title: string): string {
  return title.replace(/[《》\s]/g, '')
}

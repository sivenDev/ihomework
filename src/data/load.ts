import type { Book, CharInfo, Dataset } from './types'

let cached: Promise<Dataset> | undefined

/** 按需加载字库（单独的代码块，不进入首屏包）。 */
export function loadDataset(): Promise<Dataset> {
  cached ??= Promise.all([
    import('./generated/textbook.json'),
    import('./generated/chars.json'),
    import('./generated/extension.json'),
  ]).then(([textbook, chars, extension]) => ({
    books: (textbook.default as { books: Book[] }).books,
    chars: chars.default as unknown as Record<string, CharInfo>,
    extension: extension.default.extension,
    families: extension.default.families as Record<string, string[]>,
  }))
  return cached
}

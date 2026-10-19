"""从统编版语文教材 PDF 提取目录、识字表、写字表，输出 JSON。

用法：python extract_pdf.py <book-id> <pdf> <out.json>
"""
import json
import re
import sys
from collections import Counter, defaultdict

import pymupdf
from pypinyin import Style, pinyin

BLACK = 0x231F20
HAN = re.compile(r'^[一-鿿]$')
KIND_CODE = {'识字': 's', '汉语拼音': 'p', '阅读': 'k', '课文': 'k'}
CN_NUM = '一二三四五六七八'


def spans(page):
    for b in page.get_text('dict')['blocks']:
        for l in b.get('lines', []):
            for s in l['spans']:
                yield s


def parse_toc(doc):
    text = ''
    for i in range(1, 9):
        page = doc[i]
        if not re.search(r'第.单元·', page.get_text()):
            continue
        # 目录页是两栏排版：先左栏后右栏
        mid = page.rect.width / 2
        blocks = sorted(page.get_text('blocks'), key=lambda b: (b[0] >= mid, b[1], b[0]))
        text += '\n' + '\n'.join(b[4] for b in blocks)
    lines = [x.strip() for x in text.split('\n')]
    entries = []
    unit, kind = None, None
    i = 0
    while i < len(lines):
        ln = lines[i]
        m = re.match(r'第(.)单元·(\S+)', ln)
        if m:
            unit, kind = CN_NUM.index(m.group(1)) + 1, m.group(2)
            i += 1
            continue
        # "N title....page" 或 "N" / "title" / "page"
        m = re.match(r'^(\d+)\s*(\S.*?)?\.{2,}\s*(\d+)\s*$', ln)
        if m and m.group(2):
            entries.append((unit, kind, int(m.group(1)), m.group(2).strip(), int(m.group(3))))
            i += 1
            continue
        if re.fullmatch(r'\d+', ln) and i + 2 < len(lines) and unit:
            title = lines[i + 1]
            m2 = re.match(r'^(.*?)\.{2,}\s*(\d+)$', title)
            if m2:
                entries.append((unit, kind, int(ln), m2.group(1).strip(), int(m2.group(2))))
                i += 2
                continue
            if re.fullmatch(r'\d+', lines[i + 2]):
                entries.append((unit, kind, int(ln), title, int(lines[i + 2])))
                i += 3
                continue
        m = re.match(r'^◎?\s*(语文园地(.))\s*\.*\s*(\d+)?$', ln)
        if m and unit:
            page = m.group(3)
            if not page:
                page = re.sub(r'\D', '', lines[i + 1])
            entries.append((CN_NUM.index(m.group(2)) + 1, '语文园地', CN_NUM.index(m.group(2)) + 1, m.group(1), int(page)))
        i += 1
    seen, out = set(), []
    for e in sorted(entries, key=lambda e: e[4]):
        key = (e[1], e[2])
        if key in seen:
            continue
        seen.add(key)
        out.append(e)
    return out


def table_pages(doc, name):
    start = None
    names = ['识字表', '写字表', '词语表', '笔画名称表', '后记', '后  记']
    found = []
    for i in range(doc.page_count):
        head = doc[i].get_text()[:20].replace(' ', '').replace(' ', '')
        for n in names:
            if head.startswith(n.replace(' ', '')):
                found.append((i, n.replace(' ', '')))
    for idx, (i, n) in enumerate(found):
        if n == name:
            end = found[idx + 1][0] if idx + 1 < len(found) else doc.page_count
            return list(range(i, end))
    raise SystemExit(f'{name} not found')


def extract_table(doc, pages, carry_section=None):
    """返回 [(section, marker, char, pinyin_code, is_blue)]，按表格顺序。"""
    result = []
    total = None
    section = carry_section
    last_marker = None
    for pno in pages:
        page = doc[pno]
        items = list(spans(page))
        headings, markers, chars, pys = [], [], [], []
        for s in items:
            t = s['text'].strip()
            x0, y0, x1, y1 = s['bbox']
            if not t:
                continue
            m = re.search(r'共\s*(\d+)\s*个生?字', t)
            if m:
                total = int(m.group(1))
            if t in KIND_CODE and s['size'] < 16:
                headings.append((x0, y0, t))
            elif re.fullmatch(r'\d+', t) and s['size'] >= 16:
                markers.append({'x': x0, 'y': y0, 'id': int(t)})
            elif re.fullmatch(r'语文园地.', t):
                markers.append({'x': x0, 'y': y0, 'id': t})
            elif s['font'].startswith('Hanyu'):
                pys.append((x0, y0, x1, y1, t))
            elif HAN.match(t) and s['size'] >= 16:
                chars.append({'x': x0, 'y': y0, 'x1': x1, 'char': t, 'blue': s['color'] != BLACK})
        # 每个标记所属的部分（识字/汉语拼音/阅读）：同一栏中位于其上方最近的标题
        for mk in markers:
            if isinstance(mk['id'], str):
                mk['section'] = '语文园地'
                continue
            cands = [h for h in headings if abs(h[0] - mk['x']) < 60 and h[1] <= mk['y']]
            anywhere = [h for h in headings if h[1] <= mk['y']]
            if cands:
                mk['section'] = max(cands, key=lambda h: h[1])[2]
            elif anywhere:
                # 一个部分的标题下面分成左右两栏时，右栏没有自己的标题
                mk['section'] = max(anywhere, key=lambda h: h[1])[2]
            else:
                mk['section'] = section
        # 页面最后一个标题延续到下一页
        if headings:
            section = max(headings, key=lambda h: (h[0] > 200, h[1]))[2]
        # 每个字所属的标记：同一行左侧最近的标记；没有标记的续行继承正上方的字
        chars.sort(key=lambda c: (round(c['y']), c['x']))
        for c in chars:
            row = [m for m in markers if abs(m['y'] - c['y']) < 6 and m['x'] <= c['x']]
            if row:
                c['marker'] = max(row, key=lambda m: m['x'])
            else:
                above = [d for d in chars if d['y'] < c['y'] - 6 and 'marker' in d and abs(d['x'] - c['x']) < 14]
                if above:
                    c['marker'] = max(above, key=lambda d: d['y'])['marker']
                elif last_marker is not None:
                    # 上一页最后一课延续到本页顶部
                    c['marker'] = last_marker
                else:
                    raise SystemExit(f'page {pno}: cannot place {c["char"]} at {c["x"]:.0f},{c["y"]:.0f}')
            cx = (c['x'] + c['x1']) / 2
            near = [p for p in pys if abs((p[0] + p[2]) / 2 - cx) < 12 and -16 < c['y'] - p[3] + 2 < 12]
            c['py'] = min(near, key=lambda p: abs(c['y'] - p[3]))[4] if near else None
        # 按 栏 → 行 排序：同一页可能左右两栏
        def order(c):
            mk = c['marker']
            right = mk['x'] > 200 and any(m['x'] < 120 and m['y'] <= mk['y'] + 300 for m in markers)
            return (1 if right else 0, round(mk['y']), round(c['y']), c['x'])
        for c in sorted(chars, key=order):
            mk = c['marker']
            result.append((mk['section'], mk['id'], c['char'], c['py'], c['blue']))
            last_marker = mk
        for mk in markers:
            if mk.get('section') is None:
                print(f'  page {pno}: marker {mk["id"]} at {mk["x"]:.0f},{mk["y"]:.0f} has no section', file=sys.stderr)
    return result, total, section


def build_tone_map(rows):
    votes = defaultdict(Counter)
    for _, _, ch, code, _ in rows:
        if not code:
            continue
        for reading in set(pinyin(ch, style=Style.TONE, heteronym=True)[0]):
            if len(reading) != len(code):
                continue
            if all(a == b for a, b in zip(code, reading) if a.islower()):
                for a, b in zip(code, reading):
                    if not a.islower():
                        votes[a][b] += 1
    return {k: v.most_common(1)[0][0] for k, v in votes.items()}


def decode(code, tone_map):
    if code is None:
        return None
    return ''.join(tone_map.get(c, c) for c in code)


def main():
    book, path, out = sys.argv[1:4]
    doc = pymupdf.open(path)
    toc = parse_toc(doc)
    shizi_rows, shizi_total, _ = extract_table(doc, table_pages(doc, '识字表'))
    xiezi_rows, xiezi_total, _ = extract_table(doc, table_pages(doc, '写字表'))
    tone_map = build_tone_map(shizi_rows)
    # HanyuXi 字体把带调元音编码成大写字母；按统计结果核对后固定下来（V/C 只靠统计分不开）
    fixed = {'Q': 'ā', 'W': 'á', 'A': 'ǎ', 'S': 'à', 'E': 'ē', 'R': 'é', 'D': 'ě', 'F': 'è',
             'U': 'ī', 'I': 'í', 'J': 'ǐ', 'K': 'ì', 'T': 'ō', 'Y': 'ó', 'G': 'ǒ', 'H': 'ò',
             'O': 'ū', 'P': 'ú', 'L': 'ǔ', 'M': 'ù', 'V': 'ǚ', 'C': 'ǜ'}
    for k, v in tone_map.items():
        if k not in fixed or (fixed[k] != v and k not in 'VC'):
            raise SystemExit(f'unexpected tone letter {k}={v}')
    tone_map = fixed

    lessons = []
    by_key = {}
    for unit, kind, num, title, page in toc:
        code = 'g' if kind == '语文园地' else KIND_CODE.get(kind, 'k')
        lid = f'{book}-{code}{num}'
        lesson = {'id': lid, 'unit': unit, 'kind': kind, 'num': num, 'title': title, 'page': page,
                  'shizi': [], 'duoyin': [], 'xiezi': []}
        lessons.append(lesson)
        by_key[('语文园地' if kind == '语文园地' else kind, num)] = lesson

    def find(section, marker):
        if isinstance(marker, str):
            return by_key[('语文园地', CN_NUM.index(marker[-1]) + 1)]
        key = (section, marker)
        if key not in by_key and section == '课文':
            key = ('阅读', marker)
        if key not in by_key:
            raise SystemExit(f'no lesson for {key}')
        return by_key[key]

    for section, marker, ch, code, blue in shizi_rows:
        lesson = find(section, marker)
        entry = {'char': ch, 'py': decode(code, tone_map)}
        (lesson['duoyin'] if blue else lesson['shizi']).append(entry)
    for section, marker, ch, code, blue in xiezi_rows:
        find(section, marker)['xiezi'].append(ch)

    counts = {
        'shizi': sum(len(l['shizi']) for l in lessons),
        'duoyin': sum(len(l['duoyin']) for l in lessons),
        'xiezi': sum(len(l['xiezi']) for l in lessons),
        'shiziPrinted': shizi_total,
        'xieziPrinted': xiezi_total,
    }
    missing_py = [e['char'] for l in lessons for e in l['shizi'] + l['duoyin'] if not e['py']]
    data = {'book': book, 'counts': counts, 'toneMap': tone_map, 'missingPinyin': missing_py, 'lessons': lessons}
    json.dump(data, open(out, 'w'), ensure_ascii=False, indent=1)
    print(book, counts, 'missing py:', missing_py[:10], 'tone keys:', ''.join(sorted(tone_map)))


main()

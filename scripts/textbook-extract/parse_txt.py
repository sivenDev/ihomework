"""把人工转录的教材字表文本转换成与 PDF 提取相同的 JSON。"""
import json, re, sys
from pypinyin import Style, pinyin
CN = '一二三四五六七八'
KIND = {'识字': 's', '阅读': 'k', '汉语拼音': 'p', '园地': 'g'}
book, src, out = sys.argv[1:4]
lessons, by_key, mode, printed = [], {}, None, {}
counts = {'shizi': 0, 'duoyin': 0, 'xiezi': 0}
for raw in open(src, encoding='utf-8'):
    line = raw.strip()
    if not line or line.startswith('#'):
        continue
    if line.startswith('@'):
        parts = line[1:].split()
        mode = parts[0]
        if len(parts) > 1:
            printed[mode] = int(parts[1])
        continue
    if mode == 'toc':
        unit, kind, num, title, page = line.split()
        kind_name = '语文园地' if kind == '园地' else kind
        l = {'id': f'{book}-{KIND[kind]}{num}', 'unit': int(unit), 'kind': kind_name, 'num': int(num),
             'title': title, 'page': int(page), 'shizi': [], 'duoyin': [], 'xiezi': []}
        lessons.append(l)
        by_key[(kind, int(num))] = l
        continue
    kind, num, body = line.split(maxsplit=2)
    lesson = by_key[(kind, int(num))]
    for m in re.finditer(r'\[(.):([^\]]+)\]|(.)(?::([a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]+))?', body):
        if m.group(1):
            lesson['duoyin'].append({'char': m.group(1), 'py': m.group(2)})
            counts['duoyin'] += 1
            continue
        ch, py = m.group(3), m.group(4)
        if mode == 'shizi':
            readings = pinyin(ch, style=Style.TONE, heteronym=True)[0]
            lesson['shizi'].append({'char': ch, 'py': py or readings[0], 'pyChecked': bool(py) or len(readings) == 1})
            counts['shizi'] += 1
        else:
            lesson['xiezi'].append(ch)
            counts['xiezi'] += 1
counts['shiziPrinted'] = printed.get('shizi')
counts['xieziPrinted'] = printed.get('xiezi')
unchecked = [e['char'] for l in lessons for e in l['shizi'] if not e['pyChecked']]
json.dump({'book': book, 'counts': counts, 'lessons': lessons}, open(out, 'w'), ensure_ascii=False, indent=1)
print(book, counts, 'heteronyms without explicit book reading:', ''.join(unchecked))

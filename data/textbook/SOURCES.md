# 字库数据来源

## 课本字表（`data/textbook/*.yaml`）

四册均为**统编版（根据 2022 年版课程标准修订）**，即 2024 年起陆续使用的新版教材。来源是国家中小学智慧教育平台（basic.smartedu.cn）发布的官方电子教材。电子教材标注“仅供个人学习使用”，因此仓库只保存从中整理出的字表（哪一课有哪些字），不保存教材原文和 PDF。

| 册 | ISBN | 提取方式 | 识字表 | 写字表 | 与课本标注核对 |
|---|---|---|---|---|---|
| 一年级上册 | 9787107383007 | 官方 PDF 文字层自动提取（`scripts/textbook-extract/extract_pdf.py`） | 280 | 100 | 一致（课本标注“共 280 个生字”“共 100 个字”） |
| 一年级下册 | 9787107383014 | 官方页面图片（第 114–119 页）人工转录，自动识别交叉比对（`scripts/textbook-extract/g1b-transcription.txt`） | 410 | 200 | 一致 |
| 二年级上册 | 9787107397530 | 官方 PDF 文字层自动提取 | 460 | 250 | 一致 |
| 二年级下册 | 9787107406027 | 官方页面图片（第 113–119 页）人工转录，自动识别交叉比对（`scripts/textbook-extract/g2b-transcription.txt`） | 450 | 250 | 一致 |

说明：

- 新版教材的字数与旧版（2016 版，常见说法“一上认 300 写 100、一下认 400 写 200、二上认 450 写 250、二下认 450 写 250”）不同。以上数字以新版课本末尾的标注为准；四册识字表合计 1600 字，符合课程标准“一、二年级认识常用汉字 1600 个左右”。
- 读音：PDF 提取的两册使用课本标注的拼音；人工转录的两册对多音字和容易读错的字按课本写明读音，其余字用拼音库默认读音并逐一对照页面图片核对过。
- 识字表中蓝色的字（此前已学、此处学习新读音）单独记为 `duoyin`，不计入生字总数。
- 已知的课本特殊情况：一年级下册写字表第 15 课的“元”没有出现在识字表中（构建时作为提示输出）。
- 发现与课本不一致的地方，可以在应用的“家长模式 → 课本与字库”中直接修改；也可以修改这里的 YAML 后运行 `npm run data:build`。

## 字典与拓展字库（`data/vendor/*`）

由 `scripts/build-data/prepare-vendor.ts` 从以下原始数据中只提取需要的字生成，原始数据不入库：

| 文件 | 内容 | 来源 | 许可 |
|---|---|---|---|
| `level1.txt` | 《通用规范汉字表》一级字 3500 个（按表内序号） | Unicode Unihan 数据库 `kTGH` 字段（序号 1–3500） | Unicode License v3 |
| `hanzi.json` | 部首、构字（象形 / 会意 / 形声及形旁、声旁）、笔画数、字频 | Make Me a Hanzi `dictionary.txt`；Unihan `kTotalStrokes`；字频由 jieba 词频累加 | LGPL-3.0（Make Me a Hanzi 部分）；Unicode License v3；MIT |
| `words.tsv` | 组词候选及词频（已排除人名、地名、机构名等） | jieba `dict.txt` | MIT |

`data/word-blocklist.txt` 是不给孩子展示的组词，可以随时补充。

重新生成：

```bash
# 下载原始数据到任意目录后
npx tsx scripts/build-data/prepare-vendor.ts --unihan <Unihan 目录> --mmah <makemeahanzi/dictionary.txt> --jieba <jieba/dict.txt>
npm run data:build
```

## 笔顺数据（`public/strokes/`，构建时生成，不入库）

`npm run data:strokes` 从 `hanzi-writer-data` 复制课本字和一级字表用到的字（3507 个，约 9.5 MB），一级字表中缺少笔顺数据时构建失败。许可见 `THIRD_PARTY_NOTICES.md`。

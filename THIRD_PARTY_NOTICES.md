# 第三方数据与软件

本项目使用了以下第三方数据。详细的来源与生成方式见 `data/textbook/SOURCES.md`。

## Make Me a Hanzi — dictionary.txt

- 项目：https://github.com/skishore/makemeahanzi
- 用途：`data/vendor/hanzi.json` 中的部首、字形分解和构字（etymology）信息
- 许可：GNU Lesser General Public License v3.0 或更高版本（https://www.gnu.org/licenses/lgpl-3.0.html）
- `data/vendor/hanzi.json` 是 dictionary.txt 的派生数据，以同样的 LGPL 条款提供；你可以用 `scripts/build-data/prepare-vendor.ts` 从新版 dictionary.txt 重新生成并替换它。

## Unicode Unihan Database

- 项目：https://www.unicode.org/charts/unihan.html
- 用途：《通用规范汉字表》一级字序号（kTGH）、总笔画数（kTotalStrokes）
- 许可：Unicode License v3（https://www.unicode.org/license.txt）

## jieba 中文分词词典

- 项目：https://github.com/fxsjy/jieba
- 用途：`data/vendor/words.tsv` 组词候选和字频
- 许可：MIT License，Copyright (c) 2013 Sun Junyi

## Hanzi Writer 与 hanzi-writer-data

- 项目：https://github.com/chanind/hanzi-writer 、https://github.com/chanind/hanzi-writer-data
- 用途：描红、默写的逐笔判断（Hanzi Writer，MIT License）；笔顺和字形数据（hanzi-writer-data）
- 许可：hanzi-writer-data 源自 Make Me a Hanzi 的 graphics.txt，以 Arphic Public License 发布（见 `node_modules/hanzi-writer-data/ARPHICPL.TXT`）。构建时把需要的字复制到 `public/strokes/`，随网站一同发布，不修改数据内容。

## 统编版语文教材字表

- 来源：国家中小学智慧教育平台官方电子教材（人民教育出版社）
- 用途：`data/textbook/*.yaml` 中各课的识字表、写字表
- 仓库只收录字表（各课生字及读音），不收录教材原文、插图或 PDF。

## npm 依赖

运行时依赖（React、React Router、Dexie、pinyin-pro 等）的许可证见各自的 `node_modules/*/LICENSE`，均为 MIT 或兼容许可。

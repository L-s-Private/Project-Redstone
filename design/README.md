# design/ — 外部のグラフィックの原本

デザイナーや画像生成で作った絵の**原本**（大きいまま・加工前）を置く場所。アプリには入らない（exe が重くならないように）。
アプリで使うのは、ここから画面用に軽くしたもの（`app/assets/`）。

## フォルダ

| フォルダ | 中身 | 画面用（app/assets/） |
| --- | --- | --- |
| `key-art/` | ゲームモードのキーアート。ファイル名はゲームモードの id（`fill` / `mining_challenge`） | `art/<id>.jpg`（長い辺 1600px・JPEG 品質84） |
| `logo/` | ロゴ。`mark-*`（マークだけ）・`logotype-*`（マーク＋STATIC ARC）の黒と白 | `brand/mark.svg`・`brand/logotype.svg`（余計な情報を消し、色を文字の色にしたもの）、`brand/icon.svg`・`brand/icon.png`（アプリのアイコン。黒の角丸にマーク） |
| `guide/` | 操作のしかたのスクショ。`live-studio-1〜3`（1280×720、LIVE Studio に貼る手順）・`tiktok-id`・`minecraft-ready`（1000×625、はじめの準備）。押すところに印を付け、個人情報は隠す | `guide/<同じ名前>.webp`（WebP 品質90。`magick 原本.png -quality 90 先.webp`。はじめの準備の2枚は、スクロールしなくて済むように大事な所だけ 1000×320 に切り抜く: `-crop 1000x320+0+<上からの位置> +repage`） |

種類が増えたら、ここにフォルダを足して、この表に1行足す（例: `logo/`・`overlay/`・`thumbnail/`）。

## 新しい絵を足すとき

1. 原本をここの種類のフォルダに置く（ファイル名は英小文字・数字・`_` `-` だけ）
2. 画面用に軽くして `app/assets/<種類>/` に置く（写真のような絵は JPEG、透明が要る絵は PNG か WebP、線の絵は SVG）
3. どこで使うかを `app/src/assets.js` に書き、画面からは `/assets/<種類>/<名前>` で読む
4. アプリの `version` を上げる

## ロゴを変えたとき

1. `logo/` の原本を差し替える
2. `app/assets/brand/mark.svg`・`logotype.svg` を作り直す（原本の `<path>` だけを残し、`fill="currentColor"` にする）
3. `app/assets/brand/icon.svg` のマークを差し替えて、`cd app; npx electron scripts/make-icon.cjs` で `icon.png` を作る

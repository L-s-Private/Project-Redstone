# app/assets/ — アプリに入れるグラフィック

exe に入り、操作画面・配信画面から `/assets/<この中の場所>` で読める（`src/assets.js`・`src/server.js`）。
原本はリポジトリ直下の `design/` に置き、ここには画面用に軽くしたものだけを置く（使い方は `design/README.md`）。

- ファイル名・フォルダ名は英小文字・数字・`_` `-` だけ（それ以外の名前は配らない）
- 配れる種類: jpg / png / webp / gif / svg
- どの絵をどこで使うかは `src/assets.js` にまとめる（例: `KEY_ART`・`BRAND`）
- `brand/` はロゴ。操作画面の左上・はじめの案内・アプリのアイコン（`icon.png`。exe・タスクバー・ウィンドウ）に使う
- `guide/` は操作のしかたのスクショ。配信画面の「LIVE Studio での貼り方」・はじめの準備（TikTok ID・ランチャー）に使う

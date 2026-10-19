# アプリ ⇄ MOD 通信プロトコル

PCアプリ（`app/`）と Fabric MOD（`mod/`）は、同じPC内の TCP で通信する。

- 接続先: `127.0.0.1:25599`（MOD側はループバックにだけ待ち受ける）
- 形式: 1行1メッセージの JSON（UTF-8、改行 `\n` 区切り、1行は最大 8KB）
- アプリが要求を送り、MOD が1行で応答する。応答には要求の `id` がそのまま入る。

## 要求

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `id` | 文字列 | 応答と対応づけるためのID（任意） |
| `type` | 文字列 | `ping` / `tnt` / `mob` / `bury` / `message` |
| `count` | 数値 | 回数。種類ごとの上限で丸める（`tnt` 20、`mob` 10、`bury` 5） |
| `from` | 文字列 | ギフトを送った人の表示名（画面表示用、最大32文字） |
| `label` | 文字列 | 画面に出す文言（最大100文字）。`message` では本文 |
| `mob` | 文字列 | `type: mob` のときのモブ。`zombie` `skeleton` `creeper` `spider` `witch` `silverfish` |
| `block` | 文字列 | `type: bury` のときのブロック。`sand`（既定）か `gravel` |

### 妨害の内容

- `tnt`: プレイヤーの周りに点火済みTNTを `count` 個出す。
- `mob`: プレイヤーの近くに `mob` を `count` 体出す。
- `bury`: プレイヤーの頭上に砂（または砂利）を `count` 段降らせて埋める（埋め立て）。
- `message`: アクションバーに `label` を表示するだけ。

## 応答

```json
{"id":"42","ok":true}
{"id":"43","ok":false,"error":"未対応のモブです: ghast"}
{"id":"44","ok":true,"players":1}
```

`ping` の応答には、ワールドにいるプレイヤー数 `players` が入る。0 のときは妨害を出す相手がいない。

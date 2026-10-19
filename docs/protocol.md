# アプリ ⇄ MOD 通信プロトコル

PCアプリ（`app/`）と Fabric MOD（`mod/`）は、同じPC内の TCP で通信する。

- 接続先: `127.0.0.1:25599`（MOD側はループバックにだけ待ち受ける）
- 形式: 1行1メッセージの JSON（UTF-8、改行 `\n` 区切り、1行は最大 8KB）
- アプリが要求を送り、MOD が1行で応答する。応答には要求の `id` がそのまま入る。

## 要求

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `id` | 文字列 | 応答と対応づけるためのID（任意） |
| `type` | 文字列 | `ping` / `tnt` / `mob` / `message` / `fill_start` / `fill_stop` / `fill_expand` / `fill_shrink` / `fill_help` |
| `count` | 数値 | 回数。種類ごとの上限で丸める（`tnt` 20、`mob` 10、`fill_expand`・`fill_shrink` 5マス、`fill_help` 64個） |
| `from` | 文字列 | ギフトを送った人の表示名（画面表示用、最大32文字） |
| `label` | 文字列 | 画面に出す文言（最大100文字）。`message` では本文 |
| `mob` | 文字列 | `type: mob` のときのモブ。`zombie` `skeleton` `creeper` `spider` `witch` `silverfish` `pig` |
| `width` / `height` | 数値 | `fill_start` の枠の幅（奇数、3〜41。既定11）と高さ（1〜30。既定9） |
| `countdown` | 数値 | `fill_start` の、埋めきってからクリアまでの秒数（0〜600。既定10） |

### 妨害の内容

- `tnt`: 点火済みTNTを `count` 個出す。埋め立て中は枠の真上から落とし、埋めたブロックを壊す。それ以外はプレイヤーの周り。
- `mob`: プレイヤーの近くに `mob` を `count` 体出す。
- `message`: アクションバーに `label` を表示するだけ。

### 埋め立てモード

岩盤で囲った枠の中を、ブロックで埋めきるゲーム。埋めきるとカウントダウンが始まり、崩されずに 0 になればクリア。進み具合はボスバーに出る。壊れた枠は自動で直る。

- `fill_start`: プレイヤーの足元を床の中心にして枠を作り、中を空にする（前のゲームは終わる）。
- `fill_stop`: ゲームを終える（置いたブロックはそのまま）。
- `fill_expand` / `fill_shrink`: 枠を `count` マス広げる / 縮める。縮めて枠の外に出たブロックは消える。
- `fill_help`: 空いているマスを下の段から `count` 個、土で埋める（お助け）。

`fill_expand` などは、埋め立てが始まっていないと `"埋め立てが始まっていません"` で断る。

## 応答

```json
{"id":"42","ok":true}
{"id":"43","ok":false,"error":"未対応のモブです: ghast"}
{"id":"44","ok":true,"players":1}
```

`ping` の応答には、ワールドにいるプレイヤー数 `players` と、埋め立ての状況 `fill` が入る（始まっていなければ `null`）。

```json
{"id":"7","ok":true,"players":1,"fill":{"phase":"filling","filled":512,"total":1089,"percent":47,"width":11,"height":9,"countdownSecondsLeft":0,"countdownSeconds":10}}
```

`phase` は `filling`（埋めている途中）/ `countdown`（埋めきってカウントダウン中）/ `cleared`（クリア）。

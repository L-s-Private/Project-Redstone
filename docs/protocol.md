# アプリ ⇄ MOD 通信プロトコル

PCアプリ（`app/`）と Fabric MOD（`mod/`）は、同じPC内の TCP で通信する。

- 接続先: `127.0.0.1:25599`（MOD側はループバックにだけ待ち受ける）
- 形式: 1行1メッセージの JSON（UTF-8、改行 `\n` 区切り、1行は最大 8KB）
- アプリが要求を送り、MOD が1行で応答する。応答には要求の `id` がそのまま入る。

## 要求

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `id` | 文字列 | 応答と対応づけるためのID（任意） |
| `type` | 文字列 | `ping` / `tnt` / `mob` / `message` / `fill_start` / `fill_stop` / `fill_expand` / `fill_shrink` / `fill_help` / `fill_set` |
| `count` | 数値 | 回数。種類ごとの上限で丸める（`tnt` 20、`mob` 10、`fill_expand`・`fill_shrink` 5マス、`fill_help` 64個） |
| `from` | 文字列 | ギフトを送った人の表示名（画面表示用、最大32文字） |
| `label` | 文字列 | 画面に出す文言（最大100文字）。`message` では本文 |
| `mob` | 文字列 | `type: mob` のときのモブ。`zombie` `skeleton` `creeper` `spider` `witch` `silverfish` `pig` |
| `width` / `height` | 数値 | `fill_start` の枠の幅（奇数、3〜41。既定11）と高さ（1〜30。既定9） |
| `countdown` | 数値 | `fill_start` の、埋めきってからクリアまでの秒数（0〜600。既定10） |
| `wall` | 文字列 | `fill_start` の枠の素材。`glass`（既定）`white_stained_glass` `light_blue_stained_glass` `bedrock` |
| `block` | 文字列 | `fill_start` で配る・お助けで置くブロック。`amethyst_block`（既定）`diamond_block` `emerald_block` `gold_block` `iron_block` `lapis_block` `redstone_block` `quartz_block` |
| `skyY` | 数値 | `fill_start` の枠の床の高さ（既定150。ワールドの高さに収まるよう丸める） |
| `reach` | 数値 | `fill_start` で設定するブロックを置ける距離（1〜64。既定8。バニラは4.5） |
| `placeSpeed` | 文字列 | `fill_start` で設定する、右クリック押しっぱなしで置く速さ。`normal`（1秒に5個・バニラ）/ `fast`（10個・既定）/ `fastest`（20個） |
| `breakSpeed` | 文字列 | `fill_start` で設定する、左クリック押しっぱなしで壊す速さ。`normal`（バニラ）/ `fast`（1秒に10個・既定）/ `fastest`（20個）。`fast`・`fastest` では1個ずつは一瞬で壊れる（クリエイティブでも同じ速さ） |
| `rounds` | 数値 | `fill_start` のラウンド数（1〜99。既定10） |
| `percent` | 数値 | `fill_set` で埋める割合（0〜100。既定100） |

### 妨害の内容

- `tnt`: 点火済みTNTを `count` 個出す。埋め立て中は枠の真上から落とし、埋めたブロックを壊す。それ以外はプレイヤーの周り。
- `mob`: `mob` を `count` 体出す。埋め立て中は枠の中（その列の、埋めたブロックのすぐ上）。それ以外はプレイヤーの近く。
- `message`: アクションバーに `label` を表示するだけ。

### 埋め立てモード

空中（天空）に作った枠の中を、ブロックで埋めきるゲーム。埋めきるとカウントダウンが始まり、崩されずに 0 になればそのラウンドはクリア。`rounds` に届くまでは、枠を最初の大きさに戻して中を空にし、残っている TNT と枠に出したモブを消し、プレイヤーを枠の上に戻して次のラウンドを始める。`rounds` 回クリアしたら終わり（`cleared`）。進み具合とラウンドはボスバーに出る。枠（壁と床）は手で壊せず、枠に出したクリーパーの爆発も TNT と同じく中のブロックだけを消す（それでも壊れた枠は自動で直る）。枠から落ちたプレイヤーは枠の上に戻される。枠（壁を含む）の真上で、いちばん上の段より高いところにはブロックを置けない。

- `fill_start`: プレイヤーの真上、高さ `skyY` に枠（`wall`）を作り、プレイヤーを中へ移す。`block` を渡し、置いても減らないようにする（手に持っている分をいつも64個に戻す）。届く距離を `reach`、置く速さを `placeSpeed`、壊す速さを `breakSpeed` にする（前のゲームは終わる）。埋め立て中に落とした TNT は枠と床を壊さず、爆心から半径3マス以内の中のブロックだけを消す（アイテムは落ちない）。枠のまわりに落ちたアイテムは消す。
- `fill_stop`: ゲームを終える（置いたブロックはそのまま。届く距離と壊す速さは元に戻す）。
- `fill_expand` / `fill_shrink`: 枠を `count` マス広げる / 縮める。縮めて枠の外に出たブロックは消える。
- `fill_help`: 空いているマスを下の段から `count` 個、`block` で埋める（お助け）。
- `fill_set`: テスト用。中を下の段から `percent`% まで埋め、残りを空にする（0 なら空にする）。クリア後でも100%未満にすれば埋め立て中に戻る。

`fill_expand` などは、埋め立てが始まっていないと `"埋め立てが始まっていません"` で断る。

## 応答

```json
{"id":"42","ok":true}
{"id":"43","ok":false,"error":"未対応のモブです: ghast"}
{"id":"44","ok":true,"players":1}
```

`ping` の応答には、ワールドにいるプレイヤー数 `players` と、埋め立ての状況 `fill` が入る（始まっていなければ `null`）。

```json
{"id":"7","ok":true,"players":1,"fill":{"phase":"filling","filled":512,"total":1089,"percent":47,"width":11,"height":9,"countdownSecondsLeft":0,"countdownSeconds":10,"round":1,"rounds":10}}
```

`phase` は `filling`（埋めている途中）/ `countdown`（埋めきってカウントダウン中）/ `cleared`（全ラウンドクリア）。`round` はクリアしたラウンドの数、`rounds` はラウンド数。

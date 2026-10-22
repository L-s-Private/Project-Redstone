# アプリ ⇄ MOD 通信プロトコル

PCアプリ（`app/`）と Fabric MOD（`mod/`）は、同じPC内の TCP で通信する。

- 接続先: `127.0.0.1:25599`（MOD側はループバックにだけ待ち受ける）
- 形式: 1行1メッセージの JSON（UTF-8、改行 `\n` 区切り、1行は最大 8KB）
- アプリが要求を送り、MOD が1行で応答する。応答には要求の `id` がそのまま入る。

## 要求

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `id` | 文字列 | 応答と対応づけるためのID（任意） |
| `type` | 文字列 | `ping` / `tnt` / `mob` / `message` / `fill_start` / `fill_stop` / `fill_expand` / `fill_shrink` / `fill_help` / `fill_set` / `world` / `jail` / `freeze` / `fill_layer` / `fill_clear` / `lightning` / `levitate` / `night` / `fill_raise` / `stop_all` / `mining_start` / `mining_pause` / `mining_resume` / `mining_abort` / `mining_bonus_drop` / `mining_test` |
| `count` | 数値 | 回数。種類ごとの上限で丸める（`tnt` 20、`mob` 10、`fill_expand`・`fill_shrink` 5マス、`fill_help` 64個、`jail` 60秒、`freeze` 30秒、`fill_layer` 5段、`fill_clear` 1、`lightning` 10回、`levitate` 15秒、`night` 300秒、`fill_raise` 5段、`mining_bonus_drop` 16個） |
| `from` | 文字列 | ギフトを送った人の表示名（画面表示用、最大32文字） |
| `label` | 文字列 | 画面に出す文言（最大100文字）。`message` では本文 |
| `mob` | 文字列 | `type: mob` のときのモブ。`zombie` `skeleton` `creeper` `spider` `witch` `silverfish` `pig` |
| `width` / `height` | 数値 | `fill_start` の枠の幅（奇数、3〜41。既定11）と高さ（1〜30。既定9） |
| `countdown` | 数値 | `fill_start` の、埋めきってからクリアまでの秒数（0〜600。既定10） |
| `wall` | 文字列 | `fill_start` の枠の素材。`glass`（既定）`white_stained_glass` `light_blue_stained_glass` `bedrock` |
| `block` | 文字列 | `fill_start` で枠の中に置かれるブロック（お助けもこれ）。`amethyst_block`（既定）`diamond_block` `emerald_block` `gold_block` `iron_block` `lapis_block` `redstone_block` `quartz_block` |
| `handBlock` | 文字列 | `fill_start` で手に持たせるブロック（`block` と同じ中から。既定は `block` と同じ）。置くとすぐ `block` に変わる |
| `skyY` | 数値 | `fill_start` の枠の床の高さ（既定150。ワールドの高さに収まるよう丸める） |
| `reach` | 数値 | `fill_start` で設定するブロックを置ける距離（1〜64。既定8。バニラは4.5） |
| `placeSpeed` | 文字列 | `fill_start` で設定する、右クリック押しっぱなしで置く速さ。`normal`（1秒に5個・バニラ）/ `fast`（10個・既定）/ `fastest`（20個） |
| `breakSpeed` | 文字列 | `fill_start` で設定する、左クリック押しっぱなしで壊す速さ。`normal`（バニラ）/ `fast`（1秒に10個・既定）/ `fastest`（20個）。`fast`・`fastest` では1個ずつは一瞬で壊れる（クリエイティブでも同じ速さ） |
| `rounds` | 数値 | `fill_start` のラウンド数（1〜99。既定10） |
| `mobsAttack` | 真偽 | `fill_start` で、モブに攻撃されるようにするか（既定 true）。true なら、プレイヤー（スペクテイター以外）を埋め立て中だけサバイバル（飛べる・置いてもブロックが減らず一瞬で壊せる・おなかは減らない）にし、モブ（`Mob`）からの攻撃でだけダメージを受けるようにする（TNT・落下・窒息などでは受けない）。始めたとき・枠の上に戻したときは浮かせる（クリエイティブと同じく飛んでいる状態）。終えたら元のゲームモードに戻す。元のゲームモードはプレイヤーの印（`project_redstone_playing` と `project_redstone_mode_<名前>`）にも残し、埋め立て中にマイクラが閉じても、次にワールドに入ったときにゲームモード・届く距離・壊す速さを元に戻す |
| `time` | 文字列 | `world` の時間。`normal`（進む・既定）/ `day`（昼で止める）/ `night`（夜で止める） |
| `weather` | 文字列 | `world` の天気。`normal`（変わる・既定）/ `clear`（晴れで止める）/ `rain`（雨で止める） |
| `mobSpawning` | 真偽 | `world` で、モブが自然に湧くか（既定 true） |
| `keepInventory` | 真偽 | `world` で、やられても持ち物が残るか（既定 false） |
| `mobLifetime` | 数値 | `fill_start` で、枠に出したモブが消えるまでの秒数（0〜600。既定30。0 なら消えない）。消えるときは煙を出す |
| `percent` | 数値 | `fill_set` で埋める割合（0〜100。既定100）。`mining_test` の `progress` では進み具合の割合 |
| `item` | 文字列 | `mining_start` の対象アイテム。`minecraft:coal` `minecraft:raw_iron` `minecraft:raw_copper` `minecraft:raw_gold` `minecraft:diamond` `minecraft:emerald` `minecraft:lapis_lazuli` `minecraft:redstone` `minecraft:quartz` `minecraft:ancient_debris` `minecraft:amethyst_shard` `minecraft:flint` のどれか（ほかは断る） |
| `targetCount` | 数値 | `mining_start` の目標数（1〜512）。範囲の外は丸めずに断る |
| `seconds` | 数値 | `mining_start` の制限時間（30〜1800秒）。範囲の外は丸めずに断る |
| `terrain` | 真偽 | `tnt` `mob` で、爆発で地形を壊すか（既定 true）。アプリは採掘チャレンジのモードのとき false を付ける。false なら、埋め立ての枠の外では TNT とクリーパーの爆発をブロックを壊さない爆発に差し替える（ダメージと見た目はそのまま） |
| `op` | 文字列 | `mining_test` の操作。`drop`（数えないテスト用の対象アイテムを足元に1個出す）/ `progress`（進み具合を `percent`% にする）/ `time`（残りを5秒にする） |

### 妨害の内容

- `tnt`: 点火済みTNTを `count` 個出す。埋め立て中は枠の真上から落とし、埋めたブロックを壊す。それ以外はプレイヤーの周り。
- `mob`: `mob` を `count` 体出す（印 `project_redstone` を付け、昼でも燃えないようにする）。埋め立て中は枠の中（その列の、埋めたブロックのすぐ上）。それ以外はプレイヤーの近く。
- `message`: アクションバーに `label` を表示するだけ。
- `lightning`: 雷を `count` 回落とす（見た目だけの雷なので火事にはならない）。埋め立て中は枠の中の地上に落とし、落ちた所の中のブロックを半径1.5マスだけ消す。それ以外はプレイヤーの周り。
- `freeze`: `count` 秒、プレイヤーをその場から動けなくし、ブロックにも手が届かなくする（届く距離を0に）。続けて来たら時間を延ばす。埋め立て中でなくても使える。
- `levitate`: `count` 秒、浮遊の効果を付ける。
- `night`: `count` 秒だけ真夜中にし、終わったら夜にする前の時刻に戻す。夜の間にまた来たら延ばす。

### 埋め立てモード

空中（天空）に作った枠の中を、ブロックで埋めきるゲーム。埋めきるとカウントダウンが始まり、崩されずに 0 になればそのラウンドはクリア。`rounds` に届くまでは、枠を最初の大きさに戻して中を空にし、残っている TNT と枠に出したモブを消し、プレイヤーを枠の上に戻して次のラウンドを始める。`rounds` 回クリアしたら終わり（`cleared`）。埋めきってカウントダウン中なら、それが終わるまで待つ）。枠を縮めたとき・ラウンドが変わるときは、外に出た壁と床を消す（前のラウンドの広げた枠は残らない）。進み具合とラウンドはボスバーに出る。枠（壁と床）は手で壊せず、枠に出したクリーパーの爆発も TNT と同じく中のブロックだけを消す（それでも壊れた枠は自動で直る）。枠から落ちたプレイヤーは枠の上に戻される。枠に出したモブは、その列の地上（いちばん上に積まれたブロックの上）に出し、枠の外に出た・落ちた・ブロックに埋まったら、枠の中の地上に戻す（0.5秒ごとに確かめる）。埋め立て中は、枠と同じワールドでは枠の中（壁と床の内側、いちばん上の段まで）にしかブロックを置けない（枠の外・枠より上は断る）。カウントダウンの数字・逮捕／操作禁止の残り秒数は、ボスバーではなく画面の真ん中（タイトル）に出す。

- `fill_start`: プレイヤーの真上、高さ `skyY` に枠（`wall`）を作り、プレイヤーを中へ移す。`handBlock` を渡し、置いても減らないようにする（手に持っている分をいつも64個に戻す）。置いたブロックは同じ tick のうちに `block` へ差し替える。届く距離を `reach`、置く速さを `placeSpeed`、壊す速さを `breakSpeed` にする（前のゲームは終わる）。埋め立て中に落とした TNT は枠と床を壊さず、爆心から半径3マス以内の中のブロックだけを消す（アイテムは落ちない）。枠のまわりに落ちたアイテムは消す。
- `fill_stop`: ゲームを終える（置いたブロックはそのまま。届く距離と壊す速さは元に戻す）。
- `fill_expand` / `fill_shrink`: 枠を `count` マス広げる / 縮める。縮めて枠の外に出たブロックは消える。
- `fill_help`: 空いているマスを下の段から `count` 個、`block` で埋める（お助け）。
- `world`: ワールドの設定（`time` `weather` `mobSpawning` `keepInventory`）を入れる。アプリは、変えたときと、ワールドに入ってつながったときに送る。
- `jail`（逮捕）: 枠の真上（いちばん上の段から8マス上。TNT が落ちてくる所より上）に1マスの牢屋（床はガラスで下の枠が見える・天井は石レンガ・まわりは鉄格子）を作ってプレイヤーを入れ、`count` 秒たったら枠の上に戻す。その間はブロックに手が届かない。続けて来たら時間を延ばす。牢屋は誰もいなくなったら・ゲームを終えたら消す。逮捕中に枠を高くしたら、牢屋も上へ作り直す。
- `fill_layer`（一段埋め）: 空いているマスがあるいちばん下の段から、`count` 段をまるごと `block` で埋める（お助け）。
- `fill_clear`（全消し）: 枠の中を全部空にする。
- `fill_raise`: 枠を `count` 段高くする（30段まで）。次のラウンドでは元の高さに戻し、高くした分の壁と中を消す。カウントダウン中に高くしたら埋め立て中に戻る。
- `stop_all`（全妨害ストップ）: 起きている妨害をすべて止める。ギフトで出した TNT とモブ（印 `project_redstone` が付いたもの）をすべてのワールドから消し、逮捕・操作禁止・浮遊を解き、夜を元の時刻に戻し、予約した効果音を消す。逮捕していたプレイヤーは枠の上に戻す。埋め立ては続ける。アプリは「全妨害ストップ」を押したとき、一時停止中でも送る。
- `fill_set`: テスト用。中を下の段から `percent`% まで埋め、残りを空にする（0 なら空にする）。クリア後でも100%未満にすれば埋め立て中に戻る。

やられて生き返ったプレイヤーは、埋め立て中なら枠の上に戻す（逮捕中なら牢屋）。クリアまでのカウントダウンは最後の5秒ほどだんだん遅くなる（残り5・4秒は1.5秒、3秒は2秒、2秒は2.5秒、1秒は3秒かかる。`countdownSecondsLeft` は表示どおりの数）。

`fill_expand` `fill_shrink` `fill_help` `fill_set` `fill_stop` `jail` `fill_layer` `fill_clear` `fill_raise` は、埋め立てが始まっていないと `"埋め立てが始まっていません"` で断る。

### 採掘・収集チャレンジ

制限時間のうちに、対象アイテム（`item`）を目標数（`targetCount`）だけ集めるゲーム。埋め立てとは同時にできない（埋め立て中の `mining_start`、チャレンジ中の `fill_start` は断る）。時間はサーバーの tick で数えるので、ゲームが止まっている間（ポーズ画面など）は進まない。残り時間・進み具合はボスバーに出す（残り10秒からは赤く、1秒ごとに音を鳴らす）。

数えるのは、チャレンジ中の**そのプレイヤーが壊したブロック**から落ちた対象アイテムを、そのプレイヤーが**拾った**ときだけ（`Block.dropResources` から出たアイテムに印を付けて覚える）。アイテムがまとまった・分かれた・消えた（時間切れ・溶岩など）も追いかけ、同じアイテムを2回数えない。チェストの中身・もとから持っていた物・ほかのプレイヤーが壊した物・テスト用のアイテムは数えない。チャレンジの一時停止中に拾った分も数えない。

状態（`state`）: `countdown`（3秒）→ `running` ⇄ `paused` → `succeeded` / `failed` / `aborted`。終わった挑戦は再開しない（始め直すと新しい `sessionId`）。

- `mining_start`: 次をこの順で確かめ、だめなら理由を返して始めない: 埋め立て中でない・ほかのチャレンジ中でない・プレイヤーが生きている・サバイバルモード・対象アイテムがこのマイクラにある。通れば3秒のカウントダウン（画面の真ん中に 3・2・1・スタート！）のあと始める。
- `mining_pause` / `mining_resume`: チャレンジを一時停止／再開する（時間と進み具合を止める）。妨害の一時停止とは別。
- `mining_abort`: 中止する（カウントダウン中なら開始の取り消し `countdown_cancelled`、それ以外は `user_abort`）。掘ったブロック・拾ったアイテムはそのまま。
- `mining_bonus_drop`（収集支援）: チャレンジ中（`running`）だけ。対象アイテムを `count` 個（16個まで）プレイヤーの近くに落とす。拾ったときに数える（`support`）。1回の挑戦で支援で進められるのは目標数の4分の1まで（`supportLimit`、最低1）。足元が溶岩・水・奈落なら出さない。
- `mining_test`: テスト用。`op` を参照。`progress`・`time` を使った挑戦には `test: true` が付く。

チャレンジが終わったら、残っているアイテムの印・ボスバー・チャレンジ中に付けた浮遊を消す。プレイヤーがやられたら `failed`（`player_died`）、時間切れも `failed`（`timeout`）。ワールドを閉じたら `aborted`（`world_closed`）。マイクラの中で同じエラーが続いたら `aborted`（`error`）。

### 効果音

MOD はマイクラにもともとある音を、プレイヤーの位置で鳴らす（`action/Sounds.java`）。アプリから指定するものはない。配信で目立つよう、1つの場面で何個かの音を重ねたり、少しずつずらして続けて鳴らしたりする。

- 妨害・お助けが届いたとき: TNT（「ピピピッ」と警報）、モブ（スポナーと召喚の呪文）、逮捕（襲撃の角笛＋鉄格子「ガシャン」＋金床）、操作禁止（粉雪が割れる＋凍える音＋ガラス）、浮遊（ウインドチャージ＋シュルカーの弾）、夜（エルダーガーディアン＋鐘が3回）、枠を広げる・高くする（メイスの「ズドン」＋ピストン）、枠を縮める（ピストン＋チャイム）、全消し（ウィザーの出現音＋爆発2回＋ガラス）、お助け（経験値＋チャイムの「ポロロン」）、一段埋め（不死のトーテム＋レベルアップ）、メッセージ（「ポロロン」）、開始（エンドポータル＋ビーコン）、終了（ビーコン停止）。雷はもともと音が出るので足さない。
- 埋め立て: 埋めきった（鐘＋チャイム）、カウントダウンの1秒ごと（バスドラム「ドン」。残り5秒からは「ピッ」がだんだん高くなる）、カウントダウン中に崩された（金床が壊れる＋「ブッブー」）、ラウンドクリア（挑戦達成のファンファーレ＋レベルアップ＋花火2発）、全ラウンドクリア（同じく花火6発＋不死のトーテム）。
- そのほか: 逮捕が解けた（鉄のドアが開く＋チャイム）、操作禁止が解けた（ガラスが割れる）、落ちたり・やられたりして枠の上に戻された（テレポート）、モブが時間で消えた（火が消える音）。

## 応答

```json
{"id":"42","ok":true}
{"id":"43","ok":false,"error":"未対応のモブです: ghast"}
{"id":"44","ok":true,"players":1}
```

妨害の応答は、マイクラの中で実際に出し終わってから返す。何も起きなかったときは `ok:false` と理由を返す（アプリは「失敗」と数える）:

- プレイヤーがいない
- `tnt`: 枠の中の爆発していない TNT が上限（80個）で、1個も出せなかった
- `mob`: 1体も出せなかった
- `jail`: プレイヤーが枠と別のワールドにいる
- 実行中にエラーが起きた
- 5秒たっても出し終わらない（`"マイクラが応答しないので、出しませんでした"`）。このときは、あとから遅れて出ることはない

`ping` の応答には、ワールドにいるプレイヤー数 `players`、MOD の版 `version`（0.16.2 から。アプリは自分に入っている MOD と違えば知らせる）、埋め立ての状況 `fill` が入る（始まっていなければ `null`）。0.17.0 からは、採掘チャレンジの状況 `mining`（一度も始めていなければ無い）、プレイヤーの様子 `player`（`gameMode` と `alive`。いなければ無い）、このマイクラに無い対象アイテム `miningUnavailable`（あるときだけ）も入る。

```json
{"id":"7","ok":true,"players":1,"version":"0.16.2","fill":{"phase":"filling","filled":512,"total":1089,"percent":47,"width":11,"height":9,"countdownSecondsLeft":0,"countdownSeconds":10,"round":1,"rounds":10}}
```

```json
{"id":"8","ok":true,"players":1,"version":"0.17.0","fill":null,"player":{"gameMode":"survival","alive":true},"mining":{"sessionId":"b1c…","state":"running","item":"minecraft:raw_iron","targetCount":16,"progress":5,"mined":4,"support":1,"supportLimit":4,"remainingSeconds":131,"durationSeconds":180,"countdownSecondsLeft":0,"elapsedSeconds":49,"test":false,"seq":212,"debug":{"eligibleDropEntities":2,"pendingEligibleItems":3,"testPickedUp":0,"lastError":""}}}
```

`mining` の `progress` は `mined`（掘って拾った数）＋ `support`（支援で拾った数）。`failureReason` は終わったときだけ（`timeout` `player_died` `user_abort` `countdown_cancelled` `world_closed` `player_left` `error`）。`seq` は知らせるたびに増える番号で、アプリは同じ `sessionId` で `seq` が戻った知らせを使わない。

`phase` は `filling`（埋めている途中）/ `countdown`（埋めきってカウントダウン中）/ `cleared`（全ラウンドクリア）。`round` はクリアしたラウンドの数、`rounds` はラウンド数。

# Project Redstone

TikTok LIVE のギフトで、マイクラ（Java版）に妨害を出すツール。
配信者がいつものシングルワールドで遊んだまま、視聴者のギフトで TNT・モブ・埋め立てが起きる。

```
TikTok LIVE ──ギフト──▶ PCアプリ（app/, Node.js） ──TCP 127.0.0.1:25599──▶ Fabric MOD（mod/） ──▶ ワールド
```

- サーバーを立てなくてよい。MOD を入れたシングルワールドを開くだけで、アプリとつながる。
- 接続が切れても、アプリと MOD の両方が自動でつなぎ直す。
- 配信中に一時停止・全妨害ストップ・ルールごとのクールダウンが使える。

## 今できること

### 埋め立てモード

岩盤で囲った枠の中を、ブロックで埋めきるゲーム（TikTok の「妨害マイクラ」で定番の企画）。
埋めきるとカウントダウンが始まり、崩されずに 0 になればクリア。進み具合はボスバーとオーバーレイに出る。

| 妨害・お助け | 内容 | 1回の上限 |
| --- | --- | --- |
| `tnt` | 埋め立て中は枠の真上から点火済みTNTを落とし、埋めたブロックを壊す（それ以外はプレイヤーの周り） | 20個 |
| `mob` | 近くにモブを出す（ゾンビ・スケルトン・クリーパー・クモ・ウィッチ・シルバーフィッシュ・ブタ） | 10体 |
| `fill_expand` / `fill_shrink` | 枠を広げる / 縮める | 5マス |
| `fill_help` | 空いているマスを下から埋める（お助け） | 64個 |
| `message` | 画面下（アクションバー）に文字を出す | — |

きっかけは、ギフト名・ギフトID・ギフト1個あたりのダイヤ数・いいねの回数・フォロー・シェア。
最初に入っているルールは、調べた配信の例（バラ→ゾンビ、GG→スケルトン、花火→TNT、いいねでお助け・爆弾）。

## 使い方

### 1. MOD を入れる

対応: Minecraft Java版 **26.3** + Fabric Loader + Fabric API。ビルドには Java 25 が必要。

画面版アプリ（下記）を使うなら、この手順は不要。操作画面の「まとめて導入する」で、
Fabric Loader の起動構成・Fabric API・この MOD（アプリに同梱）がまとめて入る。手で入れる場合は以下。

```sh
cd mod
./gradlew build        # Windows は gradlew.bat build
```

`mod/build/libs/project-redstone-0.1.0.jar` を `.minecraft/mods` に入れる（Fabric API も同じ場所に必要）。
GitHub Actions の `project-redstone-mod` からも jar をダウンロードできる。

### 2. アプリを動かす

#### デスクトップ版（おすすめ）

GitHub Actions の `project-redstone-app-windows` から `ProjectRedstone-<版>.exe` をダウンロードして、ダブルクリックする。
インストールは不要。専用のウィンドウで操作画面が開く。

- 初回は「WindowsによってPCが保護されました」と出ることがある（署名なしのため）。「詳細情報」→「実行」で起動できる。
- 設定は `%APPDATA%\ProjectRedstone\config.json`、ログは同じフォルダの `app.log` に保存される。
- 「マイクラの準備」の「まとめて導入する」で、Fabric Loader・Fabric API・MOD（同梱）がまとめて入る。

操作画面でできること:

- 埋め立てモードの開始・終了と進み具合の表示、枠の拡大・縮小、お助け、TNT
- TikTok ID を入れて「保存して接続」（配信前に入れておけば、始まったら自動でつながる）
- 一時停止 / 再開、全妨害ストップ
- 「妨害の設定」で、ギフト・いいね・フォロー・シェアごとに出す妨害を編集
- テスト送信（ルールに合わせたボタン）
- LIVE Studio 用オーバーレイのURL（`http://127.0.0.1:25600/overlay`）。妨害の通知と埋め立ての進み具合が出る

#### 開発用

Node.js 20 以上が必要。

```sh
cd app
npm install
npm run app          # デスクトップ版（TikTok なしは npm run app:mock）
npm run gui          # 同じ画面をブラウザで開く
npm start            # ターミナル版（config.json を使う。TikTok なしは npm run mock）
npm run dist         # Windows 用 exe を作る（先に mod で ./gradlew build）
```

## 設定（`app/config.json`）

`rules` を上から順に見て、最初に合ったルールの妨害を出す。

```json
{ "gift": "Rose", "action": "tnt", "count": 1 }
```

| キー | 意味 |
| --- | --- |
| `gift` / `giftId` / `minDiamonds` / `likes` / `event` | どれか1つ。ギフト名（大文字小文字は区別しない）、ギフトID、1個あたりのダイヤ数がこれ以上、いいねがこの回数たまるたび、`follow` か `share` |
| `action` | `tnt` / `mob` / `fill_expand` / `fill_shrink` / `fill_help` / `message` |
| `count` | 1回あたりの数。ギフトを連打したら連打数ぶん、いいねはたまった回数ぶん掛ける |
| `maxCount` | 1回の上限（妨害ごとの上限より小さくしたいとき） |
| `mob` | `mob` のときのモブ |
| `label` | 画面に出す文。`message` では必須 |
| `cooldownSec` | 一度出したら、この秒数は同じルールを出さない |

## 開発

```sh
cd app && npm test        # アプリのテスト
cd mod && ./gradlew test  # MOD の通信部分のテスト
```

アプリと MOD の通信の決まりは [docs/protocol.md](docs/protocol.md)。

## この先（市場分析ドキュメントの「開発の順番」より）

1. ~~ギフトを受け取って表示する（Node.js）~~ ← v0.1
2. ~~Fabric MODで、シングルワールドにTNTを出す~~ ← v0.1
3. ~~埋め立てなど定番企画をMOD内に実装する~~ ← v0.5（埋め立てモード）
4. ~~日本語UIのPCアプリ（.exe）にまとめ、LIVE Studio用オーバーレイを付ける~~ ← v0.2〜v0.5（デスクトップ版・設定画面・初回ウィザード・MOD自動導入）
5. テスターに渡す

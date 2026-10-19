# Project Redstone

TikTok LIVE のギフトで、マイクラ（Java版）に妨害を出すツール。
配信者がいつものシングルワールドで遊んだまま、視聴者のギフトで TNT・モブ・埋め立てが起きる。

```
TikTok LIVE ──ギフト──▶ PCアプリ（app/, Node.js） ──TCP 127.0.0.1:25599──▶ Fabric MOD（mod/） ──▶ ワールド
```

- サーバーを立てなくてよい。MOD を入れたシングルワールドを開くだけで、アプリとつながる。
- 接続が切れても、アプリと MOD の両方が自動でつなぎ直す。
- 配信中に一時停止・全妨害ストップ・ルールごとのクールダウンが使える。

## 今できること（v0.1）

| 妨害 | 内容 | 1回の上限 |
| --- | --- | --- |
| `tnt` | 周りに点火済みTNTを出す | 20個 |
| `mob` | 近くにモブを出す（ゾンビ・スケルトン・クリーパー・クモ・ウィッチ・シルバーフィッシュ） | 10体 |
| `bury` | 頭上に砂（または砂利）を降らせて埋める | 5段 |
| `message` | 画面下（アクションバー）に文字を出す | — |
| `lightning` | 近くに雷を落とす（真上は避ける） | 5回 |
| `launch` | 浮遊の効果で空に打ち上げる（落下ダメージあり） | — |
| `heal` | 体力と満腹度を全回復（視聴者が助ける用） | — |

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

#### 画面版（おすすめ）

GitHub Actions の `project-redstone-app-windows` から `ProjectRedstone.exe` をダウンロードして、ダブルクリックする。
Node.js のインストールは不要。ブラウザに操作画面が開く。

- 黒いウィンドウ（ログ）を閉じるとアプリが終了する。
- 初回は「WindowsによってPCが保護されました」と出ることがある（署名なしのため）。「詳細情報」→「実行」で起動できる。
- 設定は `%APPDATA%\ProjectRedstone\config.json` に保存される。

操作画面でできること:

- TikTok ID を入れて「保存して接続」（配信前に入れておけば、始まったら自動でつながる）
- 一時停止 / 再開、全妨害ストップ
- TikTok・マイクラの接続状態、受信・妨害・見送り・失敗の件数、ログ
- テスト送信（ギフト名と個数、フォロー、シェア）
- LIVE Studio 用オーバーレイのURL（`http://127.0.0.1:25600/overlay`）。ブラウザ（リンク）のソースとして貼ると、妨害が出たときに「○○さん TNT ×3！」と表示される

#### ターミナル版

Node.js 20 以上が必要。

```sh
cd app
npm install
cp config.example.json config.json   # tiktokUsername に自分のIDを書く
npm start
```

マイクラでワールドを開くと「マイクラ（MOD）につながりました」と出る。

TikTok につながずに試すなら `npm run mock` で起動し、`gift Rose 3` のように打つ。
画面版を開発中に動かすなら `npm run gui`（TikTok なしは `npm run gui:mock`）。`npm run build:exe` で実行ファイルを作れる。

### 配信中のコマンド

| コマンド | 動き |
| --- | --- |
| `pause` / `resume` | 妨害を一時停止 / 再開 |
| `stop` | まだ出していない妨害を取り消して一時停止 |
| `status` | 接続状態と、受信・妨害・見送り・失敗の件数 |
| `gift <名前> [個数]` / `follow` / `share` | テスト送信 |

## 設定（`app/config.json`）

`rules` を上から順に見て、最初に合ったルールの妨害を出す。

```json
{ "gift": "Rose", "action": "tnt", "count": 1 }
```

| キー | 意味 |
| --- | --- |
| `gift` / `giftId` / `minDiamonds` / `event` | どれか1つ。ギフト名（大文字小文字は区別しない）、ギフトID、1個あたりのダイヤ数がこれ以上、`follow` か `share` |
| `action` | `tnt` / `mob` / `bury` / `message` |
| `count` | 1回あたりの数。ギフトを連打したら連打数ぶん掛ける |
| `maxCount` | 1回の上限（妨害ごとの上限より小さくしたいとき） |
| `mob` / `block` | `mob` のモブ、`bury` のブロック（`sand` / `gravel`） |
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
3. ~~埋め立てなど定番企画をMOD内に実装する~~ ← v0.4（雷・打ち上げ・回復と、企画プリセット5種）
4. ~~日本語UIのPCアプリ（.exe）にまとめ、LIVE Studio用オーバーレイを付ける~~ ← v0.2〜v0.4（設定画面・初回ウィザード・MOD自動導入）
5. テスターに渡す

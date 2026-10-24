# site/ — 公式サイト

STATIC ARC の公式サイト（トップ＝ダウンロード・できること・使い方ガイド・お知らせ・お問い合わせ・利用規約・プライバシーポリシー）。Next.js で作り、ビルドすると全ページが HTML になる（`out/`。サーバーは要らない）。

```powershell
cd site; npm install
npm run dev      # http://localhost:3000 で見ながら直す
npm run build    # out/ に公開用のファイルができる（見るときは npx serve out）
```

## 見た目とトップの流れ

- テーマは「下へスクロールするほど地面を掘り進む」（空 → 草 → 土 → 石 → 深い層 → 岩盤）。読みやすさが先なので、本文はいつも明るい背景にのせ、地層の色は節の境目の帯（`components/Strata.js`）にだけ使う
- トップは、見に来た配信者の疑問に上から順に答える：何？（いちばん上）→ どんなツール？ → どんなことが起きるの？ → 準備はむずかしい？ → 危なくない？ → よくある質問 → ダウンロード（使えるかの確認・ダウンロードしたあとの説明）
- ダウンロードのボタンはどこからでも押せる（パソコンは上の帯、スマホは画面の下の帯）。ボタンはどれもトップのいちばん下へ飛び、使えるかを確かめてからダウンロードしてもらう

## どこに何があるか

| 場所 | 中身 |
| --- | --- |
| `src/site.js` | サイトの住所・連絡先・Discord・ダウンロード先・施行日など、公開前に埋めるもの |
| `src/media.js` | サイトに置く画像・動画の一覧（下の「画像・動画を置く」） |
| `src/app/page.js` | トップ（ダウンロードページ） |
| `src/app/features/` | できること（ゲームモード・きっかけ・妨害の一覧など）。アプリで妨害を足したら、ここにも足す |
| `src/app/guide/` `terms/` `privacy/` | 使い方ガイド・利用規約・プライバシーポリシー |
| `src/news.js` → `src/app/news/` | お知らせ・更新履歴。新しい版を配ったら、`src/news.js` のいちばん上に1つ足す |
| `src/app/contact/` | お問い合わせ（Discord・メールと、不具合のときに付けてほしいもの） |
| `src/app/sitemap.js` `robots.js` | 検索エンジン向け（`sitemap.xml`・`robots.txt` になる） |
| `src/seo.js` | ページごとの説明文・正しい住所（canonical）・リンクを貼ったときの表示・パンくず。ページを足したら `pageMeta` を使い、`sitemap.js` にも足す |
| `src/components/Icon.js` | 線のアイコン（lucide-react）。名前は https://lucide.dev で探す |
| `src/components/CopyText.js` | フォルダの場所など、コピーして使う文字（横に「コピー」ボタン） |
| `src/components/PcHandoff.js` | スマホで見に来た人に「PC に送る・リンクをコピー」を出すカード（トップのダウンロード） |
| `src/components/HeroFx.js` | いちばん上の「ギフトの通知 → TNT が落ちる」の動き。画面に入ってから1回だけ動く |
| `src/components/Ticker.js` | 横に流れ続ける帯（きっかけ → 妨害の例）。例を変えるときはここの `ITEMS` |
| `src/components/MotionToggle.js` | ずっと動くもの（雲・流れる帯）を止めるボタン。ずっと動くものを足したら、これで止まるようにする（WCAG 2.2.2） |
| `src/components/TocNav.js` | 目次。今読んでいる節に印を付ける |
| `src/components/ExternalLink.js` | ほかのサイトへのリンク。新しいタブで開くことを、アイコンと読み上げの文で伝える。外へのリンクは必ずこれを使う |
| `src/components/CtaBand.js` | ページのいちばん下の「ダウンロード・Discord」の帯（`DocPage` に `cta` を付けると出る） |
| `src/app/not-found.js` | 住所が違うときのページ |
| `src/app/globals.css` | 見た目 |
| `public/brand/`・`public/screens/` | `app/assets/` の `brand/`・`guide/` の写し（変えたら両方）。screens はガイドで使う |

## 画像・動画を置く

まだ無い画像・動画は、ページに斜線の枠（PH）で「何を入れるか」が出ている。決まった場所にファイルを置いてビルドし直すと、枠と入れ替わる（コードは変えなくてよい）。

| 置く場所 | 中身 |
| --- | --- |
| `public/media/hero.mp4`（＋最初の1コマ `hero.jpg`） | トップのいちばん上の配信の録画。縦 9:16・音なし・10〜20秒 |
| `public/media/how-1.webp` 〜 `how-3.webp` | しくみの3コマのイラスト（4:3） |
| `public/media/mode-fill.mp4` `mode-mining.mp4`（＋ `.jpg`） | ゲームモードの録画（16:9・音なし） |
| `public/media/step-1.webp` 〜 `step-3.webp` | はじめ方の画面（16:10・押すところに印） |
| `public/media/smartscreen.webp` | 初めて開いたときの青い警告画面（16:10。「詳細情報」と「実行」に印）。ガイドの「はじめの準備」で使う |
| `public/icons/<名前>.svg` | 妨害のアイコン。名前は `src/media.js` の `ICONS`（`tnt`・`mob` など）。置くまでは仮の積み木の絵 |
| `public/og.png` | リンクを貼ったときに出る絵（1200×630）。置くまでは出さない |
| `public/shots/<名前>.webp` | 「できること」の妨害ごとのゲーム画面の写真。名前と中身は `src/media.js` の `SHOT_SPECS`。決まりは下の「妨害の写真」 |

- 録画の元のファイルは大きいので Git に入れない。MP4（H.264・音なし）に軽くしてから置く
- アイコン・イラストは「ブロックっぽさ」までにして、マイクラの絵（テクスチャ）・画面（持ち物画面の灰色など）・字体には似せない。Minecraft のガイドラインで、これらも Mojang の「ブランド」に入るため（録画・スクショはそのまま使ってよい）
- 置き場所や大きさを変えるときは `src/media.js` を直す

## 妨害の写真

「できること」の妨害の一覧には、その妨害が起きた瞬間のゲーム画面の写真を出す。マイクラの絵（テクスチャ）を切り出したアイコンは使わない（Minecraft のガイドラインで、プレイのスクショは使ってよいが、テクスチャは Mojang のブランドのため）。トップのマス目やボタンには、オリジナルのアイコン（`public/icons/`）を使う。

**撮り方**

- マイクラの画面の大きさは 1920×1080（横長 16:9）。F2 で撮る（`%APPDATA%\.minecraft\screenshots` に PNG で保存される）
- MOD は STATIC ARC だけ、リソースパックなし（ふつうのマイクラの見た目のまま）
- 妨害は、アプリの各ルールの「▶ 試す」で出す（本物の視聴者の名前が出ないように。画面下に金色で「テストさん: TNT ×3」のように出る）
- 画面下の持ち物の列と金色の文字は消さない（何が起きたかわかる）。F3 の情報画面・チャット・プレイヤーの一覧は出さない
- 同じワールド・同じスキン・明るい昼（「夜にする」以外）でそろえる
- 絵の一部だけ（アイテムの絵だけなど）を切り抜かない。画面全体か、16:9 のまま少し寄せるくらいにする
- 写真の上に、文字やロゴを書き足さない

**置き方**

- 撮った PNG を渡してもらえれば、WebP（1280×720・品質 85）に軽くして `public/shots/<名前>.webp` に置く
- 自分で置くとき：`magick 元.png -resize 1280x720 -quality 85 public/shots/tnt.webp`
- 名前（`tnt`・`mob`・`lightning`・`jail`・`freeze`・`levitate`・`night`・`fill_expand`・`fill_raise`・`fill_clear`・`fill_help`・`fill_layer`・`fill_shrink`・`message`・`mining_bonus_drop`）と、何を写すかは `src/media.js` の `SHOT_SPECS`。まだ無い写真は、ページに斜線の枠で「何を写すか」が出る

## 公開前に

- 画面に黄色の「未定：…」と斜線の枠（PH）が出ているところをすべて消す（`src/site.js` を埋める・ファイルを置く・文を直す）
- アプリや MOD の作りを変えたら、ガイドと「できること」の中身も合わせる

## あとで足すページ

- 有料版を始めるとき：料金・特定商取引法に基づく表記
- よくある質問が増えたら：トップから別のページに分ける

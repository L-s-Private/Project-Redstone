// サイトに置く画像・動画の一覧。ファイルを public/ の file の場所に置くと、ページに出る。
// まだ無いあいだは、斜線の入った枠（PH）に「何を入れるか」を出す（公開前にすべて置く）
// video は MP4（H.264・音なし）。poster は動画の最初の1コマ（JPEG）で、動画を読み込むまで出る
export const MEDIA = {
  hero: {
    file: '/media/hero.mp4', poster: '/media/hero.jpg', ratio: '9 / 16',
    label: '配信の録画',
    spec: '縦 9:16・音なし・10〜20秒でくり返し。ギフト通知が出る → TNT が落ちる → 崩れる',
  },
  how1: { file: '/media/how-1.webp', ratio: '4 / 3', label: 'イラスト①', spec: 'スマホでギフトを送る視聴者' },
  how2: { file: '/media/how-2.webp', ratio: '4 / 3', label: 'イラスト②', spec: 'PC の STATIC ARC が受け取る' },
  how3: { file: '/media/how-3.webp', ratio: '4 / 3', label: 'イラスト③', spec: 'TNT が降ってきて慌てる配信者' },
  modeFill: {
    file: '/media/mode-fill.mp4', poster: '/media/mode-fill.jpg', ratio: '16 / 9',
    label: '埋め立ての録画', spec: '16:9・音なし・くり返し。枠を埋める → TNT で崩される',
  },
  modeMining: {
    file: '/media/mode-mining.mp4', poster: '/media/mode-mining.jpg', ratio: '16 / 9',
    label: '採掘チャレンジの録画', spec: '16:9・音なし・くり返し。残り時間と集めた数が見えるもの',
  },
  step1: { file: '/media/step-1.webp', ratio: '16 / 10', label: 'アプリ画面', spec: '「まとめて導入する」に印' },
  step2: { file: '/media/step-2.webp', ratio: '16 / 10', label: 'アプリ画面', spec: 'TikTok ID の欄に印' },
  smartscreen: { file: '/media/smartscreen.webp', ratio: '16 / 10', label: 'Windows の警告画面', spec: '青い画面。「詳細情報」と、そのあと出る「実行」に印' },
  step3: { file: '/media/step-3.webp', ratio: '16 / 10', label: 'ランチャーの画面', spec: '起動構成に印' },
};

// 妨害のアイコン。public/icons/<名前>.svg を置くと、仮の絵と入れ替わる（components/ActionIcon.js）
export const ICONS = {
  tnt: 'TNT',
  mob: 'モブ',
  lightning: '雷',
  jail: '逮捕',
  freeze: '操作禁止',
  levitate: '浮遊',
  night: '夜にする',
  fill_expand: '枠を広げる',
  fill_raise: '枠を高くする',
  fill_clear: '全消し',
  fill_help: 'お助けブロック',
  fill_layer: '一段埋め',
  fill_shrink: '枠を縮める',
  message: 'メッセージだけ',
  mining_bonus_drop: '収集支援',
};

// 「できること」の妨害の写真（ゲーム画面のスクショ）。public/shots/<名前>.webp を置くと出る。決まりは site/README.md の「妨害の写真」
// マイクラの絵（テクスチャ）は使わず、妨害が起きた瞬間のゲーム画面をそのまま使う（Minecraft のガイドラインでスクショは使ってよい）
const SHOT_SPECS = {
  tnt: 'TNT が枠に落ちて、埋めたブロックが崩れている瞬間',
  mob: 'ゾンビ・クリーパーなどが何体か、枠のまわりに出ている',
  lightning: '雷が枠に落ちた瞬間（光っているところ）',
  jail: '牢屋の中にいるプレイヤー（F5 で後ろから）',
  freeze: '動けなくなった瞬間。画面下に金色の「操作禁止」の文字が出ている',
  levitate: '体が浮き上がっているプレイヤー（F5 で後ろから）',
  night: '夜になった枠のまわり',
  fill_expand: '広がった枠（少し上から見下ろす）',
  fill_raise: '高くなった枠（少し離れて横から）',
  fill_clear: '全部消えて空っぽになった枠',
  fill_help: '下から埋まった枠',
  fill_layer: 'いちばん下の段がまるごと埋まった枠',
  fill_shrink: '小さくなった枠（少し上から見下ろす）',
  message: '画面下に金色のメッセージが出ている',
  mining_bonus_drop: 'プレイヤーの近くに、対象のアイテムが落ちている',
};

export const shotItem = (name) => ({ file: `/shots/${name}.webp`, ratio: '16 / 9', label: 'ゲーム画面の写真', spec: SHOT_SPECS[name] ?? '' });

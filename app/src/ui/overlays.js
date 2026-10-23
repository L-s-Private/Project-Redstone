// 配信画面（オーバーレイ）の部品。LIVE Studio に「リンク」のソースとして1つずつ貼る（縦画面向け）。
// 背景は透明。文字や絵の大きさは枠の大きさに合わせて変わる（単位 --u。page() を参照）ので、LIVE Studio で枠を大きくすればそのまま大きくなる。
// URL の最後に #demo を付けると、試しのデータで動く（操作画面のプレビュー用）。#demo-mining はゲーム状況の採掘チャレンジの試し。
import { DEFAULT_OVERLAY_STYLE, OVERLAY_FONTS } from '../config.js';
import { MINING_TARGETS } from '../mining.js';
import { MC_ICON_CSS, MC_ICON_JS } from './mcIconScript.js';

/** 部品の一覧。size は縦画面（1080×1920）に置くときのおすすめの大きさ */
export const OVERLAY_WIDGETS = [
  { id: 'alerts', name: 'ギフト通知', description: 'ギフトが届いて妨害が出たら、ギフトの絵・送った人・出た妨害を大きく出します。', size: [1080, 560] },
  { id: 'gifts', name: 'ギフト表', description: 'どのギフトで何が起きるかの一覧表。「妨害の設定」のルールがそのまま出ます。', size: [1080, 608] },
  { id: 'round', name: 'ゲーム状況', description: 'ラウンドや集めた数・残り時間と、クリアの演出。ゲーム中だけ出ます。', size: [1080, 360] },
  { id: 'goal', name: 'いいねの目標', description: '「いいね あと 320 回で TNT ×5」のような、いいねの目標のバー（近い3つまで）。', size: [1080, 420] },
  { id: 'ranking', name: 'ギフトランキング', description: 'この配信でギフトを多く送ってくれた上位5人（コインの合計）。テスト送信は数えません。', size: [540, 600] },
];

const widgetSize = (id) => OVERLAY_WIDGETS.find((w) => w.id === id).size;

/** 見た目の既定値（操作画面と同じグレー）。applyStyle で上書きする */
const STYLE_VARS = (() => {
  const s = DEFAULT_OVERLAY_STYLE;
  const rgb = [1, 3, 5].map((i) => parseInt(s.panelColor.slice(i, i + 2), 16)).join(', ');
  return `--ov-text: ${s.textColor}; --ov-accent: ${s.accentColor}; --ov-panel-rgb: ${rgb}; --ov-panel-alpha: ${s.panelOpacity / 100}; `
    + `--ov-font: ${OVERLAY_FONTS[s.font]}; --ov-muted: color-mix(in srgb, var(--ov-text) 68%, transparent);`;
})();

const BASE_CSS = String.raw`
  html, body { margin: 0; height: 100%; background: transparent; overflow: hidden; }
  /* 操作画面と同じグレー。ゲーム画面の上でも読めるよう、濃いグレーの面に白い文字 */
  body {
    font: 700 calc(4.4 * var(--u))/1.3 var(--ov-font);
    font-feature-settings: "palt"; color: var(--ov-text);
  }
  .panel {
    background: rgba(var(--ov-panel-rgb), var(--ov-panel-alpha)); border: 1px solid rgba(255, 255, 255, .13); border-radius: calc(2.6 * var(--u));
    box-shadow: 0 calc(1 * var(--u)) calc(4 * var(--u)) rgba(0, 0, 0, .4);
  }
  .muted { color: var(--ov-muted); }
  .num { font-family: "Segoe UI Variable Display", "Segoe UI", system-ui, sans-serif; font-variant-numeric: tabular-nums; letter-spacing: -.02em; }
  .gift-img { object-fit: contain; display: block; }
  .badge {
    display: inline-flex; align-items: center; justify-content: center; flex: none;
    border-radius: 22%; background: rgba(255, 255, 255, .1); color: var(--ov-text);
  }
  .ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
  /* 2行まで折り返す（それでも入らなければ fitText で小さくする） */
  .clamp2 { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; overflow-wrap: anywhere; min-width: 0; }
`;

const BASE_JS = String.raw`
  const DEMO = location.hash.startsWith('#demo');
  const $ = (id) => document.getElementById(id);
  function el(tag, className, ...children) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.append(...children);
    return node;
  }
  /** ギフトの絵。読めなければ代わりの印 */
  function giftPicture(src, fallback) {
    if (!src) return el('span', 'badge', fallback);
    const img = Object.assign(document.createElement('img'), { className: 'gift-img', src, alt: '', referrerPolicy: 'no-referrer' });
    img.addEventListener('error', () => img.replaceWith(el('span', 'badge', fallback)));
    return img;
  }
  const coins = (n) => Number(n).toLocaleString('ja-JP');
  /**
   * 文字がはみ出すとき: .fit の文字を、入るまで少しずつ小さくする（元の 55% まで）。
   * それでも入らなければ、1行のもの（.ellipsis）は「…」、2行のもの（.clamp2）は2行目の最後で切れる
   */
  const MIN_FIT = 0.55;
  function fitText(root = document) {
    for (const node of root.querySelectorAll('.fit')) {
      node.style.fontSize = '';
      if (!node.clientWidth) continue; // 隠れているものは測れない
      const base = parseFloat(getComputedStyle(node).fontSize);
      let size = base;
      while ((node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1) && size > base * MIN_FIT) {
        size -= base * 0.05;
        node.style.fontSize = size + 'px';
      }
    }
  }
  // 枠の大きさが変わったら測り直す
  addEventListener('resize', () => fitText());
  /** 試しの表示用: ギフト名 → 公式の絵（ギフトの一覧から） */
  async function demoGiftImages() {
    try {
      const { gifts } = await (await fetch('/api/gifts')).json();
      return new Map(gifts.map((g) => [g.nameJa, g.image]));
    } catch {
      return new Map();
    }
  }
  /** アプリにつなぐ（つながらなければ自動でつなぎ直す） */
  function connect({ onState, onAlert }) {
    // どの部品かを名乗る（配信前のチェックで、LIVE Studio に貼られているかを見る）。試しの表示は数えない
    const events = new EventSource('/events?overlay=' + WIDGET + (DEMO ? '&demo=1' : ''));
    const handle = (state) => {
      applyStyle(state.overlayStyle);
      onState(state);
    };
    events.addEventListener('snapshot', (e) => handle(JSON.parse(e.data).state));
    events.addEventListener('state', (e) => handle(JSON.parse(e.data)));
    if (onAlert) events.addEventListener('alert', (e) => onAlert(JSON.parse(e.data)));
  }
  /** 見た目の設定（色・文字の形・通知の時間と数）を入れる */
  function applyStyle(style) {
    if (!style) return;
    STYLE = style;
    const root = document.documentElement.style;
    const hex = style.panelColor.slice(1);
    root.setProperty('--ov-text', style.textColor);
    root.setProperty('--ov-accent', style.accentColor);
    root.setProperty('--ov-panel-rgb', [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', '));
    root.setProperty('--ov-panel-alpha', String(style.panelOpacity / 100));
    root.setProperty('--ov-font', FONTS[style.font] ?? FONTS.gothic);
  }
`;

/**
 * size: おすすめの大きさ。文字や絵の大きさの単位 --u は「幅の1%」だが、枠がおすすめより横長のときは高さに合わせて小さくする
 * （LIVE Studio で枠をどんな形にしても、はみ出さないように）
 */
function page({ id, title, size, css, body, script }) {
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>:root { --u: min(1vw, calc(1vh * ${size[0]} / ${size[1]})); ${STYLE_VARS} }${BASE_CSS}${MC_ICON_CSS}${css}
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }
</style>
</head>
<body>
${body}
<script>
const FONTS = ${JSON.stringify(OVERLAY_FONTS)};
const WIDGET = ${JSON.stringify(id)};
let STYLE = ${JSON.stringify(DEFAULT_OVERLAY_STYLE)};
${MC_ICON_JS}
${BASE_JS}
// 試し表示（#demo）でも、見た目の設定だけは操作画面から受け取って、変えたらすぐ映す
if (DEMO) connect({ onState: () => {} });
${script}
</script>
</body>
</html>
`;
}

// ---- ギフト通知 ----
const ALERTS = page({
  title: 'ギフト通知',
  id: 'alerts',
  size: widgetSize('alerts'),
  css: String.raw`
  #stack { position: fixed; inset: 0; overflow: hidden; display: flex; flex-direction: column; align-items: center; gap: calc(2.4 * var(--u)); padding: calc(3 * var(--u)) calc(4 * var(--u)); box-sizing: border-box; }
  .alert {
    /* 枠が低くても縮ませない（入りきらないものは showAlert で消す） */
    position: relative; overflow: hidden; width: 100%; box-sizing: border-box; flex: none;
    display: grid; grid-template-columns: calc(20 * var(--u)) minmax(0, 1fr); align-items: center; gap: calc(3.6 * var(--u));
    padding: calc(3 * var(--u)) calc(4.4 * var(--u)) calc(3 * var(--u)) calc(3.4 * var(--u));
    animation: pop .55s cubic-bezier(.2, 1.4, .4, 1) both, glow 1.4s ease-out .2s both;
  }
  /* 光が横切る */
  .alert::after {
    content: ""; position: absolute; inset: 0; pointer-events: none;
    background: linear-gradient(105deg, transparent 35%, rgba(255, 255, 255, .22) 50%, transparent 65%);
    transform: translateX(-100%); animation: shine 1.1s ease-out .25s both;
  }
  .alert .picture { width: calc(20 * var(--u)); height: calc(20 * var(--u)); display: flex; align-items: center; justify-content: center; animation: bounce .7s cubic-bezier(.2, 1.6, .4, 1) .1s both; }
  .alert .picture .gift-img { width: 100%; height: 100%; }
  .alert .picture .badge { width: 100%; height: 100%; font-size: calc(9 * var(--u)); }
  .alert .picture .mc { --s: calc(15 * var(--u)); }
  .who { font-size: calc(4.2 * var(--u)); }
  .gift-name { font-size: calc(4.6 * var(--u)); margin-top: calc(.4 * var(--u)); }
  .gift-name .num { margin-left: calc(1 * var(--u)); }
  .what { display: flex; align-items: center; gap: calc(2.4 * var(--u)); margin-top: calc(1.6 * var(--u)); font-size: calc(8.4 * var(--u)); line-height: 1.1; color: var(--ov-text); }
  .what .mc { --s: calc(9 * var(--u)); }
  /* ルールの演出（画像・動画）。カードのいちばん上に大きく */
  .alert .media { grid-column: 1 / -1; display: flex; justify-content: center; margin: calc(-1 * var(--u)) 0 calc(.6 * var(--u)); }
  .alert .media img, .alert .media video { display: block; max-width: 100%; max-height: calc(34 * var(--u)); border-radius: calc(1.6 * var(--u)); object-fit: contain; }
  @keyframes pop { from { transform: translateY(calc(-4 * var(--u))) scale(.6); opacity: 0; filter: blur(6px); } to { transform: none; opacity: 1; filter: none; } }
  @keyframes glow { from { box-shadow: 0 0 0 calc(.6 * var(--u)) rgba(255, 255, 255, .55), 0 calc(1 * var(--u)) calc(4 * var(--u)) rgba(0, 0, 0, .4); } to { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0), 0 calc(1 * var(--u)) calc(4 * var(--u)) rgba(0, 0, 0, .4); } }
  @keyframes shine { to { transform: translateX(100%); } }
  @keyframes bounce { from { transform: scale(.2) rotate(-20deg); } to { transform: none; } }
`,
  body: '<div id="stack"></div>',
  script: String.raw`
  // 出しておく時間と同時に出す数は、見た目の設定（STYLE）で変えられる
  /** 前の通知が下へずれる・消える速さ */
  const SLIDE_MS = 450;
  const EASE = 'cubic-bezier(.2, .8, .3, 1)';
  /** 消えている途中ではない通知（上から新しい順） */
  const shown = () => [...$('stack').children].filter((card) => !card.classList.contains('leaving'));
  /** 下へ抜けながら消す。from: いまの見た目の位置（下へずらしている途中ならその分） */
  function dismiss(card, from = 0) {
    if (card.classList.contains('leaving')) return;
    card.classList.add('leaving');
    const drop = card.offsetHeight * 0.4;
    const anim = card.animate(
      [{ transform: 'translateY(' + from + 'px)', opacity: 1 }, { transform: 'translateY(' + (from + drop) + 'px)', opacity: 0 }],
      { duration: SLIDE_MS, easing: 'ease-in', fill: 'forwards' },
    );
    anim.finished.then(() => card.remove(), () => card.remove());
    // 画面が描かれていないとアニメーションが進まないので、時間が来たら必ず消す
    setTimeout(() => card.remove(), SLIDE_MS + 200);
  }
  function showAlert(alert) {
    const picture = el('div', 'picture');
    // ギフトならその絵、いいね・フォローなどは妨害の絵
    if (alert.giftImage) picture.append(giftPicture(alert.giftImage, '🎁'));
    else picture.append(mcIcon(alert.icon));
    const text = el('div', 'text', el('div', 'who muted ellipsis fit', alert.who));
    if (alert.giftName) {
      const name = el('div', 'gift-name ellipsis fit', alert.giftName);
      if (alert.count > 1) name.append(el('span', 'num muted', '×' + alert.count));
      text.append(name);
    }
    const what = el('div', 'what');
    if (alert.giftImage && alert.icon) what.append(mcIcon(alert.icon));
    what.append(el('span', 'clamp2 fit', alert.action + '！'));
    text.append(what);
    const card = el('div', 'alert panel', picture, text);
    // ルールの演出: 画像・動画はカードの上に出し、音は鳴らす
    let holdMs = STYLE.alertSeconds * 1000;
    const media = alert.media ?? {};
    const volume = (media.volume ?? 80) / 100;
    if (media.visual) {
      const src = '/media/' + encodeURIComponent(media.visual);
      if (/\.(mp4|webm)$/.test(media.visual)) {
        const video = Object.assign(document.createElement('video'), { src, autoplay: true, playsInline: true, volume });
        // 音つきで始められないとき（ブラウザの決まり）は、音なしで流す
        video.play().catch(() => {
          video.muted = true;
          video.play().catch(() => {});
        });
        // 動画は終わるまで出しておく（長くても30秒）
        video.addEventListener('loadedmetadata', () => {
          if (Number.isFinite(video.duration)) holdMs = Math.max(holdMs, Math.min(30, video.duration) * 1000);
        });
        card.prepend(el('div', 'media', video));
      } else {
        card.prepend(el('div', 'media', Object.assign(document.createElement('img'), { src, alt: '' })));
      }
    }
    if (media.sound) {
      const sound = new Audio('/media/' + encodeURIComponent(media.sound));
      sound.volume = volume;
      sound.play().catch(() => {});
    }
    const stack = $('stack');
    // いちばん上に新しい通知を入れ、前の通知は元の位置から新しい位置まで、するっと下へずらす
    const before = new Map(shown().map((c) => [c, c.getBoundingClientRect().top]));
    stack.prepend(card);
    fitText(card);
    shown().slice(1).forEach((c, i) => {
      const offset = before.get(c) - c.getBoundingClientRect().top;
      // 3件より多い・枠の下にはみ出すものは、下へ抜けながら消す（いちばん新しいものは必ず残す）
      if (i + 1 >= STYLE.alertMax || c.offsetTop + c.offsetHeight > stack.clientHeight) {
        dismiss(c, offset);
        return;
      }
      if (offset) c.animate([{ transform: 'translateY(' + offset + 'px)' }, { transform: 'none' }], { duration: SLIDE_MS, easing: EASE });
    });
    // 動画の長さがわかるまで待ってから、消す時間を決める
    setTimeout(() => setTimeout(() => dismiss(card), Math.max(0, holdMs - 1000)), 1000);
  }
  if (DEMO) {
    demoGiftImages().then((images) => {
      const samples = [
        { who: 'たろうさん', giftName: 'バラ', count: 5, action: 'ゾンビ ×5', icon: 'zombie' },
        { who: 'はなこさん', giftName: 'クラッカー', count: 1, action: 'TNT ×5', icon: 'tnt' },
        { who: 'じろうさん がフォロー', giftName: '', count: 1, action: '逮捕 10秒', icon: 'jail' },
      ].map((s) => ({ ...s, giftImage: images.get(s.giftName) ?? '' }));
      let i = 0;
      const next = () => showAlert(samples[i++ % samples.length]);
      next();
      setInterval(next, 2600);
    });
  } else {
    connect({ onState: () => {}, onAlert: showAlert });
  }
`,
});

// ---- ギフト表 ----
// 16:9 の1枚に、「ギフト（コイン数・いいね…）＋妨害」の正方形のカードを並べる。
// 基本は横5列×縦3行の大きさ。多いときは列と行を増やしてカードを小さくし、それでも PAGE_MAX を超えたらページを分ける
const GIFTS = page({
  title: 'ギフト表',
  id: 'gifts',
  size: widgetSize('gifts'),
  css: String.raw`
  #box { position: fixed; inset: calc(1.2 * var(--u)); display: flex; flex-direction: column; padding: calc(1.6 * var(--u)) calc(2 * var(--u)) calc(2 * var(--u)); box-sizing: border-box; }
  #box[hidden] { display: none; }
  header { display: flex; align-items: baseline; justify-content: space-between; gap: calc(2 * var(--u)); margin-bottom: calc(1.4 * var(--u)); }
  h1 { margin: 0; font-size: calc(3.4 * var(--u)); }
  header small { font-size: calc(1.9 * var(--u)); font-weight: 600; }
  #pages { flex: 1; min-height: 0; position: relative; }
  .grid {
    position: absolute; inset: 0; display: grid; gap: calc(1.2 * var(--u)); transition: opacity .5s;
    grid-template-columns: repeat(var(--cols), var(--t)); grid-auto-rows: var(--t); justify-content: center; align-content: center;
  }
  .grid.off { opacity: 0; pointer-events: none; }
  /* カード1枚 = きっかけ（上）＋妨害（下）。中の大きさはカードの大きさ --t に合わせる */
  .tile {
    box-sizing: border-box; width: var(--t); height: var(--t); padding: calc(var(--t) * .05);
    display: flex; flex-direction: column; align-items: center; justify-content: space-between; text-align: center;
    border-radius: calc(var(--t) * .08); background: rgba(255, 255, 255, .06); overflow: hidden;
  }
  .tile > div { width: 100%; display: flex; flex-direction: column; align-items: center; min-width: 0; }
  .tile .gift-img, .tile .badge { width: calc(var(--t) * .27); height: calc(var(--t) * .27); }
  .tile .badge { font-size: calc(var(--t) * .13); }
  /* ギフトは名前を出さないぶん、絵を大きく */
  .tile.gift .gift-img { width: calc(var(--t) * .4); height: calc(var(--t) * .4); }
  .tile .label { width: 100%; font-size: calc(var(--t) * .105); line-height: 1.2; margin-top: calc(var(--t) * .02); }
  .tile .label small { font-size: .8em; margin-left: .25em; font-weight: 600; }
  .tile .arrow { color: var(--ov-muted); font-size: calc(var(--t) * .05); line-height: 1; }
  .tile .mc { --s: calc(var(--t) * .24); }
  .tile .action { width: 100%; font-size: calc(var(--t) * .115); line-height: 1.15; color: var(--ov-text); margin-top: calc(var(--t) * .02); }
  /* 条件のあるルール（カウントダウン中だけ など） */
  #dots { display: flex; justify-content: center; gap: calc(.8 * var(--u)); margin-top: calc(1 * var(--u)); }
  #dots:empty { display: none; }
  #dots i { width: calc(.9 * var(--u)); height: calc(.9 * var(--u)); border-radius: 50%; background: rgba(255, 255, 255, .25); }
  #dots i.on { background: var(--ov-text); }
`,
  body: String.raw`<div id="box" class="panel" hidden>
  <header><h1>ギフトで妨害</h1><small class="muted">連打すると数も増える</small></header>
  <div id="pages"></div>
  <div id="dots"></div>
</div>`,
  script: String.raw`
  const PAGE_MS = 8000;
  /** 基本の並び（少ないときも、この並びのときの大きさのカードにする） */
  const BASE_COLS = 5;
  const BASE_ROWS = 3;
  /** 1ページに入れる数（横8×縦4くらい）。これを超えたらページを分ける */
  const PAGE_MAX = 32;
  const BADGES = { coins: '🪙', likes: '❤', comment: '💬', follow: '＋', share: '↗' };
  let lastKey = '';
  let pages = [];
  let current = 0;
  function tile(r) {
    const action = el('div', '', mcIcon(r.icon), el('div', 'action clamp2 fit', r.action));
    // ギフトは絵だけ（絵がないギフトだけ名前を出す）。コイン数・いいね・フォローは印＋文字
    if (r.trigger === 'gift' && r.image) return el('div', 'tile gift', el('div', '', giftPicture(r.image, '🎁')), el('span', 'arrow', '▼'), action);
    const label = el('div', 'label ellipsis fit', r.label);
    if (r.sub) label.append(el('small', 'muted', r.sub));
    const trigger = el('div', '', el('span', 'badge', r.trigger === 'gift' ? '🎁' : BADGES[r.trigger]), label);
    return el('div', 'tile', trigger, el('span', 'arrow', '▼'), action);
  }
  /** n 枚を入れるときの列の数とカードの大きさ（px） */
  function layout(n, width, height, gap) {
    const size = (cols, rows) => Math.min((width - (cols - 1) * gap) / cols, (height - (rows - 1) * gap) / rows);
    // 少ないときは 5×3 のときと同じ大きさで、真ん中に寄せる
    if (n <= BASE_COLS * BASE_ROWS) return { cols: Math.min(n, BASE_COLS), t: size(BASE_COLS, BASE_ROWS) };
    // 多いときは、カードがいちばん大きくなる列の数
    let best = { cols: BASE_COLS, t: 0 };
    for (let cols = BASE_COLS; cols <= n; cols++) {
      const t = size(cols, Math.ceil(n / cols));
      if (t > best.t) best = { cols, t };
    }
    return best;
  }
  function render(table) {
    const key = JSON.stringify(table);
    if (key === lastKey) return;
    lastKey = key;
    $('box').hidden = table.length === 0;
    if (!table.length) return;
    // 多すぎるときは、同じくらいの数ずつページに分ける
    const pageCount = Math.ceil(table.length / PAGE_MAX);
    const perPage = Math.ceil(table.length / pageCount);
    const area = $('pages');
    area.replaceChildren();
    pages = [];
    for (let i = 0; i < table.length; i += perPage) {
      const grid = el('div', 'grid off', ...table.slice(i, i + perPage).map(tile));
      area.append(grid);
      pages.push(grid);
    }
    const gap = parseFloat(getComputedStyle(pages[0]).rowGap) || 0;
    const { cols, t } = layout(perPage, area.clientWidth, area.clientHeight, gap);
    area.style.setProperty('--cols', cols);
    area.style.setProperty('--t', Math.max(0, Math.floor(t)) + 'px');
    fitText(area);
    current = 0;
    showPage(0);
  }
  function showPage(i) {
    pages.forEach((p, n) => p.classList.toggle('off', n !== i));
    $('dots').replaceChildren(...(pages.length > 1 ? pages.map((_, n) => el('i', n === i ? 'on' : '')) : []));
  }
  setInterval(() => {
    if (pages.length < 2) return;
    current = (current + 1) % pages.length;
    showPage(current);
  }, PAGE_MS);
  // 枠の大きさが変わったら並べ直す
  addEventListener('resize', () => {
    const table = JSON.parse(lastKey || '[]');
    lastKey = '';
    render(table);
  });
  if (DEMO) {
    demoGiftImages().then((images) => render([
      { trigger: 'gift', label: 'バラ', coins: 1, image: '', icon: 'zombie', action: 'ゾンビ ×1' },
      { trigger: 'gift', label: 'GG', coins: 1, image: '', icon: 'lightning', action: '雷 ×1' },
      { trigger: 'gift', label: '香水', coins: 20, image: '', icon: 'freeze', action: '操作禁止 5秒' },
      { trigger: 'gift', label: 'ドーナッツ', coins: 30, image: '', icon: 'jail', action: '逮捕 10秒' },
      { trigger: 'gift', label: 'クラッカー', coins: 100, image: '', icon: 'creeper', action: 'クリーパー ×3' },
      { trigger: 'coins', label: '100以上', sub: 'コイン', coins: 100, icon: 'tnt', action: 'TNT ×10' },
      { trigger: 'coins', label: '1000以上', sub: 'コイン', coins: 1000, icon: 'fill_clear', action: '全消し' },
      { trigger: 'likes', label: '100回', sub: 'いいね', icon: 'levitate', action: '浮遊 3秒' },
      { trigger: 'follow', label: 'フォロー', icon: 'fill_help', action: 'お助けブロック ×5' },
    ].map((r) => ({ ...r, image: images.get(r.label) ?? '' }))));
  } else {
    connect({ onState: (state) => render(state.giftTable ?? []) });
  }
`,
});

// ---- ゲーム状況（埋め立て: ラウンドと進み具合 / 採掘チャレンジ: 集めた数と残り時間） ----
// URL は前と同じ round.html（LIVE Studio に貼り直さなくてよいように）
const ROUND = page({
  title: 'ゲーム状況',
  id: 'round',
  size: widgetSize('round'),
  css: String.raw`
  #box { position: fixed; inset: calc(2 * var(--u)); padding: calc(3.4 * var(--u)) calc(4.4 * var(--u)) calc(4 * var(--u)); box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; overflow: hidden; }
  #box[hidden] { display: none; }
  .top { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: end; gap: calc(4 * var(--u)); }
  .round small { display: block; font-size: calc(3.4 * var(--u)); letter-spacing: .12em; }
  .round b { font-size: calc(10 * var(--u)); line-height: 1; }
  .round b span { font-size: calc(5.4 * var(--u)); color: var(--ov-muted); margin-left: calc(.6 * var(--u)); }
  #status { font-size: calc(5 * var(--u)); padding-bottom: calc(1 * var(--u)); }
  #percent { font-size: calc(10 * var(--u)); line-height: 1; }
  .bar { height: calc(2.4 * var(--u)); border-radius: calc(1.2 * var(--u)); background: rgba(255, 255, 255, .14); overflow: hidden; margin-top: calc(3 * var(--u)); }
  .bar div { height: 100%; width: 0; background: var(--ov-text); transition: width .5s ease-out; }
  #box.countdown .bar div, #box.cleared .bar div { background: var(--ov-accent); }
  #box.countdown { border-color: color-mix(in srgb, var(--ov-accent) 70%, transparent); }
  /* カウントダウン: 数字を大きく */
  #count {
    position: absolute; inset: 0; display: none; align-items: center; justify-content: center; gap: calc(4 * var(--u));
    background: rgba(var(--ov-panel-rgb), .94);
  }
  #box.countdown #count { display: flex; }
  #count b { font-size: calc(22 * var(--u)); line-height: 1; color: var(--ov-accent); }
  #count b.tick { animation: tick .6s cubic-bezier(.2, 1.5, .4, 1); }
  #count span { font-size: calc(5.6 * var(--u)); }
  /* クリアの演出 */
  #clear {
    position: absolute; inset: 0; display: none; align-items: center; justify-content: center; flex-direction: column;
    background: rgba(var(--ov-panel-rgb), .95); overflow: hidden;
  }
  #clear.on { display: flex; }
  #clear b { font-size: calc(12 * var(--u)); line-height: 1.05; letter-spacing: .02em; animation: slam .6s cubic-bezier(.2, 1.6, .4, 1) both; }
  #clear small { font-size: calc(4.6 * var(--u)); margin-top: calc(1.4 * var(--u)); animation: fade .6s .3s both; }
  #clear i { position: absolute; top: calc(-4 * var(--u)); width: calc(1.8 * var(--u)); height: calc(3 * var(--u)); border-radius: calc(.4 * var(--u)); animation: fall linear forwards; }
  /* 採掘チャレンジ: 左に資源、まん中に集めた数、右に残り時間 */
  #mine { display: none; }
  #box.mining .top, #box.mining > .bar { display: none; }
  #box.mining #mine { display: block; }
  #mine .head { display: flex; justify-content: space-between; gap: calc(3 * var(--u)); font-size: calc(3.6 * var(--u)); white-space: nowrap; }
  #mine .row { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: calc(4 * var(--u)); margin-top: calc(1.4 * var(--u)); }
  #mine .what { display: flex; align-items: center; gap: calc(2 * var(--u)); min-width: 0; }
  #mine .what .mc { --s: calc(8 * var(--u)); }
  #mineName { font-size: calc(5.6 * var(--u)); }
  #mineCount { font-size: calc(9.5 * var(--u)); line-height: 1; white-space: nowrap; }
  #mineCount span { font-size: calc(5 * var(--u)); color: var(--ov-muted); margin-left: calc(.6 * var(--u)); }
  #mineTime { font-size: calc(9.5 * var(--u)); line-height: 1; }
  #mineTime.warn { color: #ff6b5e; animation: pulse 1s ease-in-out infinite; }
  #mineState { overflow: hidden; text-overflow: ellipsis; min-width: 0; }
  #mineState.paused { color: var(--ov-accent); }
  #mine .bar div { background: var(--ov-accent); }
  #clear.fail b { color: #ff6b5e; }
  #clear.abort b { color: var(--ov-muted); }
  @keyframes pulse { 50% { opacity: .55; } }
  @keyframes tick { from { transform: scale(1.8); opacity: .3; } to { transform: none; opacity: 1; } }
  @keyframes slam { from { transform: scale(2.4); opacity: 0; } to { transform: none; opacity: 1; } }
  @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes fall { to { transform: translateY(130vh) rotate(720deg); } }
`,
  body: String.raw`<div id="box" class="panel" hidden>
  <div class="top">
    <div class="round"><small class="muted">ROUND</small><b class="num" id="round"></b></div>
    <div id="status" class="ellipsis fit"></div>
    <div id="percent" class="num"></div>
  </div>
  <div class="bar"><div id="bar"></div></div>
  <div id="mine">
    <div class="head muted"><span>採掘チャレンジ</span><span id="mineState"></span></div>
    <div class="row">
      <div class="what"><span id="mineIcon"></span><b id="mineName" class="ellipsis fit"></b></div>
      <b class="num" id="mineCount"></b>
      <b class="num" id="mineTime"></b>
    </div>
    <div class="bar"><div id="mineBar"></div></div>
  </div>
  <div id="count"><b class="num" id="countNum"></b><span id="countText">崩されなければクリア</span></div>
  <div id="clear"><b id="clearText"></b><small class="muted" id="clearSub"></small></div>
</div>`,
  script: String.raw`
  const CLEAR_MS = 3500;
  let lastRound = null;
  let lastCount = null;
  let clearTimer = null;
  function render(fill) {
    $('box').hidden = !fill;
    if (!fill) {
      lastRound = null;
      return;
    }
    $('box').className = 'panel ' + fill.phase;
    $('countText').textContent = '崩されなければクリア';
    const total = el('span', '', '/' + fill.rounds);
    $('round').replaceChildren(String(Math.min(fill.round + (fill.phase === 'cleared' ? 0 : 1), fill.rounds)), total);
    const status = fill.phase === 'cleared' ? '全ラウンドクリア！' : fill.filled.toLocaleString('ja-JP') + ' / ' + fill.total.toLocaleString('ja-JP');
    if ($('status').textContent !== status) {
      $('status').textContent = status;
      fitText($('box'));
    }
    $('percent').textContent = fill.percent + '%';
    $('bar').style.width = (fill.total ? Math.min(100, (fill.filled / fill.total) * 100) : 0) + '%';
    if (fill.phase === 'countdown' && fill.countdownSecondsLeft !== lastCount) {
      const num = $('countNum');
      num.textContent = fill.countdownSecondsLeft;
      num.classList.remove('tick');
      void num.offsetWidth;
      num.classList.add('tick');
    }
    lastCount = fill.phase === 'countdown' ? fill.countdownSecondsLeft : null;
    // クリアしたラウンドの数が増えたら演出
    if (lastRound !== null && fill.round > lastRound) celebrate(fill);
    lastRound = fill.round;
  }
  function celebrate(fill) {
    const all = fill.phase === 'cleared';
    showResult(all ? 'ALL CLEAR!' : 'ROUND CLEAR!', all ? fill.rounds + 'ラウンド全部クリア！' : fill.round + ' / ' + fill.rounds + ' クリア',
      '', all ? 60 : 32, all ? CLEAR_MS * 2 : CLEAR_MS);
  }
  /** 結果を大きく出す。pieces は紙吹雪の数（0 なら出さない） */
  function showResult(text, sub, kind, pieces, ms) {
    $('clearText').textContent = text;
    $('clearSub').textContent = sub;
    const box = $('clear');
    box.className = kind;
    box.querySelectorAll('i').forEach((i) => i.remove());
    const colors = ['#ffffff', '#cfcfd4', STYLE.accentColor, STYLE.textColor];
    for (let n = 0; n < pieces; n++) {
      const piece = document.createElement('i');
      piece.style.left = Math.random() * 100 + '%';
      piece.style.background = colors[n % colors.length];
      piece.style.animationDuration = 1.4 + Math.random() * 1.6 + 's';
      piece.style.animationDelay = Math.random() * .6 + 's';
      box.append(piece);
    }
    box.classList.add('on');
    clearTimeout(clearTimer);
    clearTimer = setTimeout(() => box.classList.remove('on'), ms);
  }

  // ---- 採掘チャレンジ ----
  const TARGETS = Object.fromEntries(${JSON.stringify(MINING_TARGETS.map((t) => [t.id, { name: t.name, icon: t.icon }]))});
  const ACTIVE = ['countdown', 'running', 'paused'];
  /** 終わった結果を出しておく時間（そのあとは隠す） */
  const RESULT_MS = 8000;
  let lastMining = null;
  let resultUntil = 0;
  let hideTimer = null;
  let lastState = null;
  const clockText = (s) => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  /** 採掘チャレンジを出すか（挑戦中か、終わってすぐ）。出したら true */
  function renderMining(m, connected) {
    const active = m && ACTIVE.includes(m.state);
    // 古い知らせ（前の挑戦・番号が戻った）では表示を戻さない
    if (m && lastMining && m.sessionId === lastMining.sessionId && (m.seq ?? 0) < (lastMining.seq ?? 0)) return true;
    const ended = m && lastMining && lastMining.sessionId === m.sessionId && ACTIVE.includes(lastMining.state) && !active;
    lastMining = m;
    if (ended) {
      const target = TARGETS[m.item]?.name ?? '';
      const count = target + ' ' + Math.min(m.progress, m.targetCount) + ' / ' + m.targetCount;
      if (m.state === 'succeeded') showResult('CLEAR!', count, '', 60, RESULT_MS);
      else if (m.state === 'failed') showResult(m.failureReason === 'player_died' ? 'GAME OVER' : 'TIME UP!', count, 'fail', 0, RESULT_MS);
      else showResult('中止', count, 'abort', 0, RESULT_MS);
      resultUntil = Date.now() + RESULT_MS;
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => lastState && renderAll(lastState), RESULT_MS + 50);
    }
    // 結果を出しているうちに次の挑戦が始まったら、結果は消す
    if (active && resultUntil > Date.now()) {
      resultUntil = 0;
      clearTimeout(clearTimer);
      $('clear').classList.remove('on');
    }
    if (!m || (!active && Date.now() > resultUntil)) return false;
    $('box').hidden = false;
    $('box').className = 'panel mining' + (m.state === 'countdown' ? ' countdown' : '');
    const target = TARGETS[m.item] ?? { name: m.item, icon: '' };
    if ($('mineName').textContent !== target.name) {
      $('mineName').textContent = target.name;
      $('mineIcon').replaceChildren(mcIcon(target.icon));
      fitText($('box'));
    }
    const shown = Math.min(m.progress, m.targetCount);
    $('mineCount').replaceChildren(String(shown), el('span', '', '/' + m.targetCount));
    $('mineBar').style.width = Math.min(100, (shown / m.targetCount) * 100) + '%';
    $('mineTime').textContent = clockText(m.remainingSeconds);
    $('mineTime').className = 'num' + (m.state === 'running' && m.remainingSeconds <= 10 ? ' warn' : '');
    const support = m.support > 0 ? '採掘 ' + m.mined + '・支援 ' + m.support : '';
    const status = !connected && active ? 'マイクラとの接続が切れています' : m.state === 'paused' ? '一時停止中' : support;
    $('mineState').textContent = status;
    $('mineState').className = m.state === 'paused' ? 'paused' : '';
    if (m.state === 'countdown' && m.countdownSecondsLeft !== lastCount) {
      $('countText').textContent = 'まもなくスタート';
      const num = $('countNum');
      num.textContent = m.countdownSecondsLeft;
      num.classList.remove('tick');
      void num.offsetWidth;
      num.classList.add('tick');
    }
    lastCount = m.state === 'countdown' ? m.countdownSecondsLeft : null;
    return true;
  }
  function renderAll(state) {
    lastState = state;
    if (renderMining(state.mining ?? null, state.mod?.connected !== false)) return;
    render(state.fill);
  }

  if (location.hash === '#demo-mining') {
    // 採掘チャレンジ: カウントダウン → 集める → クリア → もう一度 → 時間切れ をくり返す
    const base = { sessionId: 'demo', item: 'minecraft:raw_iron', targetCount: 16, progress: 0, mined: 0, support: 0, remainingSeconds: 180, countdownSecondsLeft: 0, seq: 0 };
    let step = 0;
    let seq = 0;
    setInterval(() => {
      step = (step + 1) % 40;
      seq++;
      let m;
      if (step < 3) m = { ...base, state: 'countdown', countdownSecondsLeft: 3 - step };
      else if (step < 15) m = { ...base, state: 'running', progress: (step - 2) + (step > 10 ? 3 : 0), mined: step - 2, support: step > 10 ? 3 : 0, remainingSeconds: 180 - (step - 2) * 9 };
      else if (step < 20) m = { ...base, state: 'succeeded', progress: 16, mined: 13, support: 3, remainingSeconds: 72 };
      else if (step < 22) m = { ...base, sessionId: 'demo2', state: 'countdown', countdownSecondsLeft: 22 - step };
      else if (step < 34) m = { ...base, sessionId: 'demo2', state: 'running', progress: Math.floor((step - 22) / 2), mined: Math.floor((step - 22) / 2), remainingSeconds: 12 - (step - 22) };
      else m = { ...base, sessionId: 'demo2', state: 'failed', failureReason: 'timeout', progress: 6, mined: 6, remainingSeconds: 0 };
      if (step === 0) lastMining = null;
      renderAll({ mining: { ...m, seq }, fill: null, mod: { connected: true } });
    }, 1000);
    renderAll({ mining: { ...base, state: 'countdown', countdownSecondsLeft: 3 }, fill: null, mod: { connected: true } });
  } else if (DEMO) {
    // 埋める → カウントダウン → クリア をくり返す
    let step = 0;
    const base = { filled: 0, total: 1089, rounds: 10, round: 2, countdownSecondsLeft: 0, phase: 'filling', percent: 0 };
    lastRound = 2;
    setInterval(() => {
      step = (step + 1) % 16;
      let fill;
      if (step < 8) fill = { ...base, filled: 140 * step, percent: Math.round(13 * step) };
      else if (step < 13) fill = { ...base, filled: 1089, percent: 100, phase: 'countdown', countdownSecondsLeft: 13 - step };
      else fill = { ...base, filled: 0, round: step === 13 ? 3 : 2 };
      if (step === 14) lastRound = 2;
      render(fill);
    }, 900);
    render(base);
  } else {
    connect({ onState: renderAll });
  }
`,
});

// ---- いいねの目標 ----
const GOAL = page({
  title: 'いいねの目標',
  id: 'goal',
  size: widgetSize('goal'),
  css: String.raw`
  #goals { position: fixed; inset: 0; display: flex; flex-direction: column; justify-content: center; gap: calc(1.6 * var(--u)); padding: calc(1 * var(--u)) calc(2 * var(--u)); box-sizing: border-box; }
  .goal { display: grid; grid-template-columns: calc(8 * var(--u)) minmax(0, 1fr); align-items: center; gap: calc(2.6 * var(--u)); padding: calc(1.6 * var(--u)) calc(3 * var(--u)) calc(1.8 * var(--u)) calc(2.2 * var(--u)); flex: none; }
  .goal .mc { --s: calc(7.4 * var(--u)); }
  .goal .icon { display: flex; align-items: center; justify-content: center; }
  .goal .icon .badge { width: calc(7.4 * var(--u)); height: calc(7.4 * var(--u)); font-size: calc(4.2 * var(--u)); }
  .line { display: flex; align-items: baseline; gap: calc(1.4 * var(--u)); font-size: calc(3.6 * var(--u)); min-width: 0; white-space: nowrap; }
  .line .left { font-size: calc(5 * var(--u)); color: var(--ov-accent); flex: none; }
  .line .muted { flex: none; }
  .line .what { font-size: calc(4.6 * var(--u)); color: var(--ov-text); }
  .line .cond { margin-left: auto; font-size: calc(3 * var(--u)); flex: none; }
  .bar { position: relative; height: calc(1.8 * var(--u)); margin-top: calc(1 * var(--u)); border-radius: 999px; background: rgba(255, 255, 255, .12); overflow: hidden; }
  .bar i { position: absolute; inset: 0 auto 0 0; border-radius: inherit; background: var(--ov-accent); transition: width .5s cubic-bezier(.2, .8, .3, 1); }
  .goal.hit { animation: hit 1.2s ease-out; }
  .goal.hit .left { color: var(--ov-text); }
  @keyframes hit { 0% { transform: scale(1.04); box-shadow: 0 0 0 calc(.6 * var(--u)) var(--ov-accent); } 100% { transform: none; box-shadow: 0 0 0 0 transparent; } }
`,
  body: '<div id="goals"></div>',
  script: String.raw`
  let last = new Map();
  let lastKey = '';
  function render(goals) {
    const key = JSON.stringify(goals);
    if (key === lastKey) return;
    lastKey = key;
    $('goals').replaceChildren(...goals.map((g) => {
      const id = g.likes + ':' + g.action;
      // 数が減った = 目標に届いて妨害が出た。少しのあいだ「達成！」を出す
      const hit = last.has(id) && g.current < last.get(id);
      const left = g.likes - g.current;
      const icon = g.icon === 'message' ? el('span', 'badge', '♥') : mcIcon(g.icon);
      const line = el('div', 'line', el('span', 'left num', hit ? '達成！' : 'あと ' + left.toLocaleString('ja-JP')), el('span', 'muted', hit ? '' : 'いいねで'),
        el('span', 'what ellipsis fit', g.action), ...(g.condition ? [el('span', 'cond muted', g.condition)] : []));
      const bar = el('div', 'bar', el('i'));
      bar.firstChild.style.width = (hit ? 100 : (g.current / g.likes) * 100) + '%';
      return el('div', 'goal panel' + (hit ? ' hit' : ''), el('span', 'icon', icon), el('div', '', line, bar));
    }));
    fitText($('goals'));
    last = new Map(goals.map((g) => [g.likes + ':' + g.action, g.current]));
  }
  if (DEMO) {
    // 試しの表示: いいねがたまっていく様子
    const goals = [
      { likes: 100, current: 40, action: 'お助けブロック ×5', icon: 'fill_help', condition: '' },
      { likes: 1000, current: 680, action: 'TNT ×10', icon: 'tnt', condition: '' },
    ];
    render(goals);
    setInterval(() => {
      goals.forEach((g) => (g.current = (g.current + Math.round(g.likes * 0.12)) % g.likes));
      render(goals.map((g) => ({ ...g })));
    }, 1400);
  } else {
    connect({ onState: (state) => render(state.likeGoals ?? []) });
  }
`,
});

// ---- ギフトランキング ----
const RANKING = page({
  title: 'ギフトランキング',
  id: 'ranking',
  size: widgetSize('ranking'),
  css: String.raw`
  #box { position: fixed; inset: calc(2 * var(--u)); padding: calc(4 * var(--u)) calc(4.4 * var(--u)); box-sizing: border-box; }
  h1 { margin: 0 0 calc(3.4 * var(--u)); font-size: calc(7 * var(--u)); display: flex; align-items: baseline; justify-content: space-between; gap: calc(3 * var(--u)); }
  h1 small { font-size: calc(3.8 * var(--u)); font-weight: 600; }
  #rows { display: flex; flex-direction: column; gap: calc(2 * var(--u)); }
  .row {
    display: grid; grid-template-columns: calc(11 * var(--u)) minmax(0, 1fr) auto; align-items: center; gap: calc(3 * var(--u));
    padding: calc(2 * var(--u)) calc(3 * var(--u)) calc(2 * var(--u)) calc(2 * var(--u)); border-radius: calc(2 * var(--u)); background: rgba(255, 255, 255, .05);
  }
  .rank { width: calc(11 * var(--u)); height: calc(11 * var(--u)); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: calc(6 * var(--u)); background: rgba(255, 255, 255, .1); }
  .row:first-child .rank { background: var(--ov-text); color: rgb(var(--ov-panel-rgb)); }
  .row:first-child { background: rgba(255, 255, 255, .1); }
  .name { font-size: calc(5.6 * var(--u)); }
  .coins { font-size: calc(5.4 * var(--u)); }
  .row.up { animation: up .9s ease-out; }
  .empty { font-size: calc(4.4 * var(--u)); padding: calc(2 * var(--u)) 0; }
  @keyframes up { from { background: rgba(255, 255, 255, .35); transform: scale(1.03); } }
`,
  body: String.raw`<div id="box" class="panel">
  <h1>ギフトランキング<small class="muted">この配信</small></h1>
  <div id="rows"></div>
</div>`,
  script: String.raw`
  let last = new Map();
  let lastKey = '';
  function render(ranking) {
    const key = JSON.stringify(ranking);
    if (key === lastKey) return;
    lastKey = key;
    if (!ranking.length) {
      $('rows').replaceChildren(el('div', 'empty muted', 'ギフトを送ると、ここに名前が出ます'));
      last = new Map();
      return;
    }
    $('rows').replaceChildren(...ranking.map((r, i) => {
      const line = el('div', 'row', el('span', 'rank num', String(i + 1)), el('span', 'name ellipsis fit', r.name), el('span', 'coins num', '🪙 ' + coins(r.coins)));
      // コインが増えた人を光らせる
      if (last.has(r.name) ? last.get(r.name) < r.coins : last.size > 0) line.classList.add('up');
      return line;
    }));
    fitText($('rows'));
    last = new Map(ranking.map((r) => [r.name, r.coins]));
  }
  if (DEMO) {
    const demo = [{ name: 'たろう', coins: 1200 }, { name: 'はなこ', coins: 860 }, { name: 'じろう', coins: 300 }, { name: 'さくら', coins: 99 }, { name: 'けん', coins: 30 }];
    render(demo);
    setInterval(() => {
      demo[2].coins += 500;
      demo.sort((a, b) => b.coins - a.coins);
      render(demo.map((r) => ({ ...r })));
    }, 4000);
  } else {
    connect({ onState: (state) => render(state.ranking ?? []) });
  }
`,
});

/** id → ページ */
export const OVERLAY_PAGES = { alerts: ALERTS, gifts: GIFTS, round: ROUND, goal: GOAL, ranking: RANKING };

// 操作画面。exe に入れるため、HTML ごと文字列で持つ。
import { MC_ICON_CSS, MC_ICON_JS } from './mcIconScript.js';
import { MAX_CHOICES, MAX_COUNT_BY_TYPE, MAX_WEIGHT } from '../rules.js';
import { PLANS } from '../plan.js';
import { OVERLAY_WIDGETS } from './overlays.js';
import { KEY_ART } from '../assets.js';
import { FILL_ONLY_ACTIONS, MINING_LIMITS, MINING_ONLY_ACTIONS, MINING_PRESETS, MINING_REASONS, MINING_TARGETS } from '../mining.js';

export const PANEL_HTML = String.raw`<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>STATIC ARC</title>
<style>
  /*
   * デスクトップアプリの形: 左にメニュー、右に画面。ウィンドウいっぱいを使い、画面ごとに役割を分ける。
   * ほぼ黒のグレースケール。強調は白抜き。色は意味のあるところ（接続ランプ・止めるボタン・注意）だけ。
   */
  :root {
    --bg: #0a0a0a;
    --sidebar: #0f0f0f;
    --surface: #141414;
    --raised: #1c1c1c;
    --hover: #242424;
    --line: #262626;
    --line-soft: #1b1b1b;
    --text: #ededed;
    --muted: #a6a6a6;
    /* 補足の文字。背景との差が足りるよう、前より明るくした */
    --faint: #808080;
    --invert-bg: #ededed;
    --invert-text: #0a0a0a;
    --ok: #5fb97f;
    --warn: #d0a94f;
    --bad: #d85c55;
    --stop: #7d2621;
    /* 分析のグラフの色（1つの数だけを出すので1色） */
    --data: #7fa8d9;
    --radius: 8px;
    --radius-sm: 6px;
  }
  * { box-sizing: border-box; }
  [hidden] { display: none !important; }
  html { color-scheme: dark; }
  html, body { height: 100%; }
  body {
    margin: 0; overflow: hidden;
    display: grid; grid-template-columns: 216px minmax(0, 1fr); grid-template-rows: minmax(0, 1fr);
    background: var(--bg); color: var(--text);
    font: 14px/1.65 "Yu Gothic UI", "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif;
    font-feature-settings: "palt";
    -webkit-font-smoothing: antialiased;
  }
  ::selection { background: var(--invert-bg); color: var(--invert-text); }
  :focus-visible { outline: 2px solid var(--text); outline-offset: 2px; }
  * { scrollbar-color: var(--line) transparent; scrollbar-width: thin; }

  /* ---- 左のメニュー ---- */
  body > aside {
    grid-row: 1; grid-column: 1;
    display: flex; flex-direction: column; min-height: 0; overflow-y: auto;
    background: var(--sidebar); border-right: 1px solid var(--line-soft); padding: 16px 10px 12px;
  }
  .brand { display: flex; align-items: center; gap: 10px; padding: 2px 8px 18px; }
  .brand-mark { width: 22px; height: 22px; border-radius: 5px; background: var(--invert-bg); position: relative; flex: none; }
  .brand-mark::after { content: ""; position: absolute; inset: 6px; border-radius: 2px; background: var(--bg); }
  .brand b { font-size: 14px; font-weight: 700; letter-spacing: .01em; }
  nav { display: flex; flex-direction: column; gap: 2px; }
  /* 使う場面ごとの小さな見出し */
  .nav-group { padding: 12px 10px 4px; font-size: 12px; color: var(--faint); letter-spacing: .04em; }
  .nav-group:first-child { padding-top: 0; }
  .nav-gap { height: 12px; }
  nav button {
    justify-content: flex-start; gap: 10px; width: 100%; padding: 8px 10px;
    background: transparent; border-color: transparent; color: var(--muted); font-weight: 600;
  }
  nav button svg { width: 16px; height: 16px; flex: none; }
  nav button:hover { background: var(--surface); color: var(--text); }
  nav button.active { background: var(--raised); color: var(--text); }
  .status { margin-top: auto; padding: 12px 8px 0; border-top: 1px solid var(--line-soft); display: flex; flex-direction: column; gap: 8px; }
  /* 低いウィンドウ（ノートの拡大150%など）でも、左下の接続状態まで見えるように詰める */
  @media (max-height: 720px) {
    .brand { padding-bottom: 10px; }
    .nav-group { padding: 6px 10px 2px; }
    .nav-gap { height: 6px; }
    nav button { padding: 5px 10px; }
    .status { padding-top: 8px; gap: 4px; }
  }
  /* 接続状態: 1行目に名前、2行目にいまの状態 */
  .chip { display: grid; grid-template-columns: 7px minmax(0, 1fr); align-items: center; column-gap: 9px; font-size: 13px; color: var(--muted); }
  .chip span:last-child { grid-column: 2; color: var(--text); line-height: 1.5; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--faint); }
  .dot.ok { background: var(--ok); }
  .dot.warn { background: var(--warn); }
  .dot.bad { background: var(--bad); }
  .version { color: var(--faint); font-size: 12px; }

  /* ---- 右の画面 ---- */
  /* スクロールバーの場所はいつも空けておく（画面によってヘッダーの幅が変わらないように） */
  main { grid-row: 1; grid-column: 2; display: flex; flex-direction: column; min-height: 0; overflow-y: auto; scrollbar-gutter: stable; }
  .page-head {
    position: sticky; top: 0; z-index: 5;
    display: flex; flex-wrap: wrap; align-items: center; gap: 10px;
    /* 大きいボタンがあってもなくても同じ高さ（画面を移ったときに見出しが上下しないように） */
    padding: 14px 28px; min-height: 70px; background: rgba(10, 10, 10, .9); backdrop-filter: blur(8px);
    border-bottom: 1px solid var(--line-soft);
  }
  .page-head h1 { font-size: 17px; font-weight: 700; margin: 0 auto 0 0; }
  .page { display: flex; flex-direction: column; gap: 16px; padding: 24px 28px 28px; flex: 1; min-height: 0; width: 100%; }
  /* 広い画面でも中身は 1600px まで（目が左右に行き来しすぎないように）。見出しと中身は同じ幅で真ん中に */
  .page-head, .page { padding-left: max(28px, calc((100% - 1600px) / 2)); padding-right: max(28px, calc((100% - 1600px) / 2)); }
  .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 16px; align-items: stretch; }
  /*
   * 画面の並べ方の決まり
   * - 一覧や状況を見る画面: 全幅
   * - 設定する画面: .split（左に設定、右に図や補足。右は画面を動かしてもついてくる）
   */
  .stack { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
  .split { display: grid; grid-template-columns: minmax(0, 1fr) minmax(280px, 360px); gap: 16px; align-items: start; }
  .split-side { position: sticky; top: 80px; display: flex; flex-direction: column; gap: 16px; min-width: 0; }
  /* 左に一覧、右に中身（分析） */
  .split.list-first { grid-template-columns: minmax(300px, 380px) minmax(0, 1fr); }
  .split.list-first > .split-side { order: -1; }
  .split.single { grid-template-columns: minmax(0, 1fr); }
  @media (max-width: 980px) {
    .split, .split.list-first { grid-template-columns: minmax(0, 1fr); }
    .split-side { position: static; }
  }
  /* くわしい説明は、開いたときだけ */
  details.more-info { border-top: 1px solid var(--line-soft); margin-top: 14px; padding-top: 10px; }
  details.more-info summary { color: var(--muted); font-size: 13px; }
  details.more-info summary:hover { color: var(--text); }
  details.more-info > :not(summary) { margin-top: 8px; }
  details.more-info ul { margin: 8px 0 0; padding-left: 20px; color: var(--muted); font-size: 13px; line-height: 1.8; }
  /* どの画面でも上に出す注意（マイクラにつながっていない、など） */
  .alert-bar { display: flex; flex-direction: column; gap: 8px; }
  .alert { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: var(--radius-sm); border: 1px solid; font-weight: 600; }
  .alert span { flex: 1; min-width: 0; }
  .alert.warn { border-color: var(--warn); color: var(--warn); }
  .alert.bad { border-color: var(--bad); color: var(--bad); background: rgba(216, 92, 85, .08); }
  .alert button { flex: none; }
  /* 埋め立ての枠の図 */
  .frame-figure svg { display: block; width: 100%; height: auto; }
  .frame-size { margin: 8px 0 0; font-size: 13px; color: var(--muted); }
  .frame-size b { color: var(--text); font-variant-numeric: tabular-nums; }
  .card { background: var(--surface); border: 1px solid var(--line-soft); border-radius: var(--radius); padding: 18px 20px; }
  .card h2 { font-size: 13px; font-weight: 700; margin: 0 0 4px; }
  .card .lead { color: var(--muted); font-size: 13px; margin: 0 0 14px; }
  .card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
  .card-head h2 { margin: 0 auto 0 0; }

  /* ---- 入力とボタン ---- */
  button, a.button {
    font: inherit; text-decoration: none; color: var(--text); background: var(--raised); border: 1px solid var(--line);
    border-radius: var(--radius-sm); padding: 6px 12px; cursor: pointer; white-space: nowrap;
    display: inline-flex; align-items: center; justify-content: center; gap: 7px;
    transition: background-color .12s, border-color .12s, color .12s;
  }
  button:hover, a.button:hover { background: var(--hover); }
  button:disabled { opacity: .4; cursor: default; }
  .primary, .next { background: var(--invert-bg); color: var(--invert-text); border-color: var(--invert-bg); font-weight: 700; }
  .primary:hover, .next:hover { background: #ffffff; }
  .ghost { background: transparent; border-color: transparent; color: var(--muted); }
  .ghost:hover { background: var(--raised); color: var(--text); }
  .danger { background: var(--stop); border-color: var(--stop); color: #fff; font-weight: 700; }
  .danger:hover { background: #962e28; }
  .lg { padding: 9px 18px; font-size: 13px; }
  label { display: block; font-size: 13px; color: var(--muted); margin-bottom: 6px; }
  input, select {
    font: inherit; color: var(--text); background: var(--bg); border: 1px solid var(--line);
    border-radius: var(--radius-sm); padding: 6px 10px; max-width: 100%; height: 32px;
  }
  input { width: 100%; }
  input:hover, select:hover { border-color: #3a3a3a; }
  input:focus, select:focus { outline: none; border-color: var(--text); }
  input[type="number"] { font-variant-numeric: tabular-nums; }
  input[type="color"] { height: 38px; padding: 3px; cursor: pointer; }
  .row { display: flex; gap: 8px; }
  .row > * { min-width: 0; }
  .row > button { flex: none; }
  .hint { color: var(--muted); font-size: 13px; line-height: 1.7; margin: 10px 0 0; max-width: 72ch; }
  .quick { display: flex; flex-wrap: wrap; gap: 6px; }
  .quick + .quick { margin-top: 6px; }
  code { flex: 1; background: var(--bg); border: 1px solid var(--line); padding: 6px 10px; border-radius: var(--radius-sm); font-size: 13px; color: var(--muted); word-break: break-all; }
  .group-label { font-size: 13px; color: var(--muted); margin: 0 0 8px; }
  .group-label.test-group { margin-top: 16px; }
  /* テストのギフトの入力は、狭い右の列では2段にする */
  #testForm .row { flex-wrap: wrap; }
  #testForm #giftName { flex: 1 1 100%; }

  /* ---- 配信 ---- */
  #toggle.paused { background: var(--invert-bg); color: var(--invert-text); border-color: var(--invert-bg); }
  .banner { padding: 10px 14px; border-radius: var(--radius-sm); border: 1px solid var(--warn); color: var(--warn); font-weight: 600; }
  .stats { display: grid; grid-template-columns: repeat(4, 1fr); }
  .stat { padding: 2px 16px; }
  .stat + .stat { border-left: 1px solid var(--line); }
  .stat small { display: block; color: var(--muted); font-size: 13px; }
  .stat b { display: block; font-size: 22px; font-weight: 600; font-variant-numeric: tabular-nums; line-height: 1.3; }
  .log-card { display: flex; flex-direction: column; }
  #log { list-style: none; margin: 0; padding: 0; max-height: 36vh; min-height: 120px; overflow-y: auto; font-size: 13px; font-variant-numeric: tabular-nums; }
  #log li { padding: 5px 0; border-bottom: 1px solid var(--line-soft); display: flex; gap: 10px; }
  #log li > span { min-width: 0; overflow-wrap: anywhere; }
  /* 配信の上の段: 3つの状態と4つの数 */
  .live-top { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)) minmax(0, 2.4fr); padding: 14px 6px; }
  .live-top > * { padding: 0 16px; min-width: 0; }
  .live-top > * + * { border-left: 1px solid var(--line-soft); }
  .status-tile { display: flex; align-items: center; gap: 12px; }
  .status-tile .dot { width: 10px; height: 10px; flex: none; }
  .status-tile > div { min-width: 0; }
  .status-tile small { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .status-tile small, .counts small { display: block; color: var(--muted); font-size: 12px; }
  .status-tile b { display: block; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .counts { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
  .counts b { display: block; font-size: 22px; font-weight: 600; line-height: 1.2; font-variant-numeric: tabular-nums; }
  @media (max-width: 1100px) {
    .live-top { grid-template-columns: repeat(3, minmax(0, 1fr)); row-gap: 14px; }
    .live-top .counts { grid-column: 1 / -1; border-left: 0; padding-top: 12px; border-top: 1px solid var(--line-soft); }
  }
  /* 届いたものと出した妨害（新しい順） */
  .feed-card { display: flex; flex-direction: column; min-height: calc(100vh - 260px); }
  .feed { list-style: none; margin: 0; padding: 0; }
  .feed li {
    display: grid; grid-template-columns: 62px minmax(0, 1.1fr) 18px minmax(0, 1fr); gap: 10px; align-items: center;
    padding: 8px 4px; border-bottom: 1px solid var(--line-soft);
  }
  .feed li.fresh { animation: feed-in 1.4s ease-out; }
  @keyframes feed-in { from { background: var(--hover); } }
  .feed time { color: var(--faint); font-size: 12px; font-variant-numeric: tabular-nums; }
  .feed-src, .feed-res { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .feed-src b { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 11em; flex: none; }
  .feed-src span, .feed-res span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
  .feed-src .muted { color: var(--muted); }
  .feed-src .rule-tag, .feed-res .rule-tag { flex: none; }
  .feed-arrow { color: var(--faint); text-align: center; }
  .feed-res.sent { font-weight: 700; }
  .feed-res.skip { color: var(--muted); }
  .feed-res.failed { color: var(--bad); }
  .feed-empty { color: var(--muted); padding: 24px 4px; max-width: 46em; }
  #log time { color: var(--faint); flex: none; }
  #log span { display: inline-flex; align-items: center; flex-wrap: wrap; }
  #log .ok { color: var(--text); }
  #log .info, #log .gift { color: var(--muted); }
  #log .warn { color: var(--warn); }
  #log .error { color: var(--bad); }

  /* 埋め立ての状況（配信中にいちばん見るところなので大きく） */
  .fill-hero { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; }
  #fillCard .empty { flex-direction: column; align-items: flex-start; gap: 10px; }
  .fill-round small, .fill-pct small { display: block; color: var(--muted); font-size: 13px; margin-bottom: 4px; }
  .fill-round b, .fill-pct b {
    display: block; font-family: "Segoe UI Variable Display", "Segoe UI", "Yu Gothic UI", sans-serif;
    font-weight: 600; font-size: 52px; line-height: 1; letter-spacing: -.03em; font-variant-numeric: tabular-nums;
  }
  .fill-round b span { color: var(--faint); font-size: 26px; letter-spacing: 0; margin-left: 4px; }
  .fill-pct { text-align: right; }
  .fill-progress { height: 4px; border-radius: 2px; background: var(--line); overflow: hidden; margin: 16px 0 10px; }
  .fill-progress div { height: 100%; width: 0; background: var(--text); transition: width .4s ease-out; }
  .fill-progress.countdown div, .fill-progress.cleared div { background: var(--ok); }
  .fill-meta { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 12px; }
  .fill-phase { font-weight: 700; }
  .fill-phase.countdown, .fill-phase.cleared { color: var(--ok); }
  .fill-detail { color: var(--muted); font-size: 13px; }
  .fill-buttons { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--line-soft); }
  .empty { display: flex; align-items: center; justify-content: space-between; gap: 16px; color: var(--muted); }

  /* ---- ゲームモード（埋め立て / 採掘・収集チャレンジ） ---- */
  .mode-cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .mode-card {
    position: relative; display: grid; grid-template-columns: auto minmax(0, 1fr); column-gap: 14px; row-gap: 2px; align-items: center;
    justify-content: stretch; text-align: left; padding: 14px 16px; white-space: normal; background: var(--surface); border-color: var(--line-soft);
  }
  .mode-card:hover { background: var(--raised); }
  .mode-card .mc { --s: 34px; grid-row: span 2; }
  .mode-card b { font-size: 14px; padding-right: 56px; }
  .mode-card small { color: var(--faint); font-size: 12px; font-weight: 400; }
  .mode-card.selected { border-color: var(--text); background: var(--raised); }
  .mode-card .in-use { position: absolute; top: 10px; right: 12px; font-size: 11px; color: var(--ok); font-weight: 700; }
  .mode-card:disabled { opacity: 1; }
  .mode-card:disabled:not(.selected) { opacity: .4; }
  @media (max-width: 720px) { .mode-cards { grid-template-columns: minmax(0, 1fr); } }
  /* 採掘チャレンジの状況（ゲームモードの画面と配信の画面で同じ形） */
  .mining-target { display: flex; align-items: center; gap: 10px; min-width: 0; margin-bottom: 14px; }
  .mining-target .mc { --s: 36px; }
  .mining-target div { min-width: 0; }
  .mining-target small { display: block; color: var(--muted); font-size: 12px; }
  .mining-target b { display: block; font-size: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .mining-hero { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; }
  .mining-time.warn b { color: var(--bad); }
  .fill-progress.cleared div { background: var(--ok); }
  .fill-progress.failed div { background: var(--bad); }
  .fill-progress.paused div, .fill-progress.aborted div { background: var(--muted); }
  .fill-phase.paused { color: var(--warn); }
  .fill-phase.failed { color: var(--bad); }
  .fill-phase.aborted { color: var(--muted); }
  /* モードの見出し（キーアートの帯）。絵は KEY_ART（src/assets.js）。左から暗くして文字を読みやすく */
  .mode-hero {
    position: relative; height: clamp(150px, 19vw, 230px); border-radius: var(--radius); overflow: hidden;
    border: 1px solid var(--line-soft); background: var(--surface);
  }
  .mode-hero img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
  .mode-hero::after {
    content: ""; position: absolute; inset: 0;
    background: linear-gradient(90deg, rgba(10, 10, 10, .88) 0%, rgba(10, 10, 10, .55) 34%, rgba(10, 10, 10, 0) 68%),
      linear-gradient(0deg, rgba(10, 10, 10, .55) 0%, rgba(10, 10, 10, 0) 45%);
  }
  .mode-hero-text { position: absolute; z-index: 1; left: 28px; bottom: 22px; right: 40%; color: #ffffff; text-shadow: 0 1px 12px rgba(0, 0, 0, .6); }
  .mode-hero-text small { display: block; font-size: 11px; font-weight: 700; letter-spacing: .18em; color: rgba(255, 255, 255, .72); }
  .mode-hero-text h2 { margin: 4px 0 6px; font-size: 26px; line-height: 1.2; font-weight: 800; letter-spacing: .02em; }
  .mode-hero-text p { margin: 0; font-size: 13px; line-height: 1.6; color: rgba(255, 255, 255, .86); }
  @media (max-width: 720px) {
    .mode-hero-text { left: 18px; bottom: 14px; right: 18px; }
    .mode-hero-text h2 { font-size: 21px; }
    .mode-hero-text p { display: none; }
  }
  #miningSettings.locked { opacity: .55; }
  #miningPresets { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); }
  #miningPresets .preset { min-width: 0; max-width: none; }
  .mining-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--line-soft); }
  .mining-actions:empty { display: none; }
  .rule-tag.warn { color: var(--warn); }

  /* ---- 埋め立ての設定 ---- */
  .fields { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 14px 14px; }
  .fields select { width: 100%; }
  .tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 6px; }
  .tiles button {
    flex-direction: column; gap: 8px; padding: 12px 4px 9px; font-size: 12px;
    color: var(--muted); background: var(--bg); border-color: var(--line-soft);
  }
  .tiles button:hover { background: var(--raised); color: var(--text); }
  .tiles button.selected { border-color: var(--text); color: var(--text); background: var(--raised); }

  /* ---- 設定の行（左に名前と説明、右に入力） ---- */
  .setting {
    display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 360px); gap: 8px 24px; align-items: center;
    padding: 12px 0; border-top: 1px solid var(--line-soft);
  }
  .setting.tall { align-items: start; }
  .setting-text label { margin: 0; font-size: 13px; font-weight: 600; color: var(--text); }
  .setting-text small { display: block; margin-top: 2px; font-size: 13px; color: var(--faint); }
  .setting-control { display: flex; justify-content: flex-end; min-width: 0; }
  .setting-control select { width: 100%; }
  .setting-control .tiles { width: 100%; grid-template-columns: repeat(4, minmax(0, 1fr)); }
  /* 数の入力（− と ＋ のボタンと単位つき） */
  .stepper {
    display: inline-flex; align-items: center; height: 32px; overflow: hidden;
    border: 1px solid var(--line); border-radius: var(--radius-sm); background: var(--bg);
  }
  .stepper:hover { border-color: #3a3a3a; }
  .stepper:focus-within { border-color: var(--text); }
  .stepper button { width: 32px; height: 100%; padding: 0; border: 0; border-radius: 0; background: transparent; color: var(--muted); font-size: 15px; }
  .stepper button:hover { background: var(--raised); color: var(--text); }
  .stepper input { width: 64px; height: 100%; padding: 0 4px; border: 0; border-radius: 0; background: transparent; text-align: right; -moz-appearance: textfield; }
  .stepper input::-webkit-inner-spin-button, .stepper input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  .stepper .unit { min-width: 2.6em; padding: 0 8px 0 3px; color: var(--muted); font-size: 13px; }
  @media (max-width: 720px) {
    .setting { grid-template-columns: minmax(0, 1fr); }
    .setting-control { justify-content: flex-start; }
  }

  /* ---- 接続と準備 ---- */
  .link-card { display: flex; align-items: center; gap: 16px; }
  .link-card > div { flex: 1; min-width: 0; }
  .link-card .lead { margin: 0; }
  .checks { list-style: none; margin: 0 0 14px; padding: 0; }
  .checks li { display: flex; gap: 10px; align-items: baseline; padding: 6px 0; border-bottom: 1px solid var(--line-soft); }
  .checks li:last-child { border-bottom: 0; }
  .checks .mark { width: 14px; flex: none; text-align: center; font-weight: 700; }
  .checks .yes .mark { color: var(--muted); }
  .checks .no .mark { color: var(--bad); }
  .checks small { color: var(--faint); display: block; font-size: 12px; word-break: break-all; }
  .ready { padding: 10px 12px; border-radius: var(--radius-sm); border: 1px solid var(--line); font-size: 13px; }
  .setup-ready { border-color: var(--ok); color: var(--ok); font-weight: 600; }

  /* ---- 妨害の設定 ---- */
  .count { color: var(--faint); font-weight: 600; margin-left: 4px; }
  .icon-only { padding: 4px 8px; background: transparent; border-color: transparent; color: var(--muted); font-size: 13px; }
  .icon-only:hover { background: var(--raised); color: var(--text); }
  .icon-only:disabled { opacity: .2; }
  /* プリセット */
  .presets { display: flex; flex-wrap: wrap; gap: 8px; }
  .preset {
    position: relative; flex-direction: column; align-items: flex-start; gap: 2px; min-width: 150px; max-width: 240px;
    padding: 9px 12px; text-align: left; background: var(--bg); border-color: var(--line-soft);
  }
  .preset:hover { background: var(--raised); border-color: var(--line); }
  .preset b { font-size: 13px; }
  .preset small { color: var(--faint); font-size: 12px; font-weight: 400; }
  .preset.current { border-color: var(--text); background: var(--raised); }
  .preset .in-use { position: absolute; top: 8px; right: 10px; font-size: 11px; color: var(--ok); font-weight: 700; }
  .preset-mine { display: inline-flex; align-items: stretch; }
  .preset-mine .preset { border-top-right-radius: 0; border-bottom-right-radius: 0; }
  .preset-mine .del { border: 1px solid var(--line-soft); border-left: 0; border-radius: 0 var(--radius-sm) var(--radius-sm) 0; padding: 0 9px; }
  .preset-mine .del:hover { color: var(--bad); }
  .preset-save { border-style: dashed; color: var(--muted); background: transparent; }
  .show-more { align-self: center; color: var(--text); text-decoration: underline; text-underline-offset: 3px; }
  /* ルールの一覧（きっかけの種類ごと） */
  .rules-top { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
  .rules-top h2 { font-size: 15px; margin: 0 auto 0 0; }
  .rule-group { margin-top: 18px; }
  .rule-group-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 8px; }
  .rule-group-head h3 { font-size: 13px; margin: 0; }
  .rule-group-head p { margin: 0 auto 0 0; color: var(--faint); font-size: 12px; }
  .rule-group-head button { padding: 3px 10px; font-size: 13px; }
  .rule-rows { display: flex; flex-direction: column; gap: 6px; }
  .rule-none { color: var(--faint); font-size: 13px; padding: 10px 14px; border: 1px dashed var(--line-soft); border-radius: var(--radius); }
  .rule {
    display: grid; align-items: center; column-gap: 12px; width: 100%; text-align: left;
    grid-template-columns: minmax(0, 230px) 18px minmax(0, 300px) minmax(0, 1fr) auto auto 30px;
    background: var(--surface); border: 1px solid var(--line-soft); border-radius: var(--radius); padding: 8px 6px 8px 12px;
    font-weight: 400; min-height: 46px; cursor: pointer;
  }
  .rule:hover { border-color: var(--line); background: var(--raised); }
  .rule-when, .rule-then { display: flex; align-items: center; gap: 8px; min-width: 0; font-weight: 600; }
  .rule-when > span, .rule-then > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .rule-when small, .rule-then small { color: var(--faint); font-weight: 400; margin-left: 2px; }
  .rule-when small.coin { flex: none; margin-left: -4px; white-space: nowrap; }
  .rule-when .gift-img { width: 26px; height: 26px; }
  .rule-when .unknown { color: var(--warn); }
  .rule-arrow { color: var(--faint); display: flex; justify-content: center; }
  .rule-arrow svg { width: 14px; height: 14px; }
  .rule-label { color: var(--muted); font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
  .rule-label.empty { color: var(--faint); }
  .rule-tag { font-size: 12px; color: var(--faint); border: 1px solid var(--line-soft); border-radius: 99px; padding: 1px 8px; white-space: nowrap; }
  .rule .del { padding: 4px 6px; }
  .rule .try { padding: 3px 10px; font-size: 12px; color: var(--muted); background: transparent; border-color: var(--line); }
  .rule .try:hover { color: var(--text); background: var(--hover); }
  .rule .del:hover { color: var(--bad); }
  .trigger-icon { width: 26px; height: 26px; display: inline-flex; align-items: center; justify-content: center; flex: none; border-radius: 6px; background: var(--raised); font-size: 13px; }
  @container rules (max-width: 820px) {
    .rule { grid-template-columns: minmax(0, 1fr) 18px minmax(0, 1fr) auto auto 30px; }
    .rule-label { display: none; }
  }
  .rule-list { container: rules / inline-size; }
  input.invalid { border-color: var(--warn); }
  .num-field { display: inline-flex; align-items: center; gap: 6px; color: var(--muted); font-size: 13px; white-space: nowrap; }
  .num-field .affix { color: var(--muted); }
  /* ギフトを選ぶボタン */
  .gift-pick { gap: 8px; height: 32px; padding: 3px 10px 3px 6px; background: var(--bg); max-width: 100%; min-width: 0; }
  .gift-pick .gift-img { width: 22px; height: 22px; }
  .gift-pick-name { overflow: hidden; text-overflow: ellipsis; font-weight: 600; }
  .gift-pick small { color: var(--faint); font-variant-numeric: tabular-nums; }
  .gift-pick .caret { color: var(--faint); font-size: 11px; }
  .gift-pick.unknown { border-color: var(--warn); }
  .gift-pick.unset { border-style: dashed; color: var(--warn); border-color: var(--warn); padding-left: 10px; }
  .dirty { color: var(--warn); font-size: 13px; }
  /* 最近届いたギフト（横1列。押すとルールを作る） */
  .recent-strip {
    display: flex; align-items: center; gap: 14px; min-width: 0;
    padding: 10px 14px; border: 1px solid var(--line-soft); border-radius: var(--radius); background: var(--surface);
  }
  .recent-title { font-size: 13px; font-weight: 700; white-space: nowrap; }
  .recent { display: flex; gap: 6px; overflow-x: auto; min-width: 0; padding: 2px 0; }
  .recent button { flex: none; padding: 3px 10px 3px 6px; font-size: 13px; }
  .recent-empty { color: var(--faint); font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  /* ルールを作る・変える窓 */
  #ruleEditor { width: min(780px, calc(100vw - 32px)); max-height: calc(100vh - 32px); padding: 0; }
  #ruleEditor[open] { display: flex; flex-direction: column; }
  .editor-body { overflow-y: auto; padding: 22px 26px 8px; }
  .editor-foot { display: flex; align-items: center; gap: 8px; padding: 14px 26px; border-top: 1px solid var(--line-soft); }
  .editor-foot .grow { flex: 1; }
  .editor-step { margin-bottom: 18px; }
  .editor-step > h3 { font-size: 13px; font-weight: 700; color: var(--muted); margin: 0 0 8px; }
  .editor-step > h3 b { color: var(--text); margin-right: 6px; }
  .segmented { display: inline-flex; border: 1px solid var(--line); border-radius: var(--radius-sm); overflow: hidden; margin-bottom: 10px; }
  .segmented button { border: 0; border-radius: 0; background: transparent; color: var(--muted); padding: 6px 14px; }
  .segmented button + button { border-left: 1px solid var(--line); }
  .segmented button.selected { background: var(--invert-bg); color: var(--invert-text); font-weight: 700; }
  .trigger-value { display: flex; align-items: center; gap: 8px; min-height: 32px; color: var(--muted); font-size: 13px; }
  .action-group { margin-bottom: 10px; }
  .action-group > span { display: block; font-size: 12px; color: var(--faint); margin-bottom: 5px; }
  .action-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(124px, 1fr)); gap: 5px; }
  .action-tiles button {
    justify-content: flex-start; gap: 8px; padding: 5px 8px; font-size: 13px; font-weight: 600;
    background: var(--bg); border-color: var(--line-soft); color: var(--muted); height: 36px;
  }
  .action-tiles button:hover { background: var(--raised); color: var(--text); }
  .action-tiles button.selected { border-color: var(--text); color: var(--text); background: var(--raised); }
  .action-tiles .mc { --s: 20px; }
  .action-desc { margin: 4px 0 0; padding: 8px 12px; border-radius: var(--radius-sm); background: var(--bg); color: var(--muted); font-size: 13px; }
  .editor-details { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 14px; align-items: end; }
  .editor-details label { display: flex; flex-direction: column; gap: 5px; font-size: 12px; color: var(--faint); min-width: 0; }
  .editor-details label input:not([type=number]) { width: 100%; }
  .editor-details .wide { grid-column: 1 / -1; }
  .choices { display: flex; flex-direction: column; gap: 6px; }
  .choice {
    display: grid; grid-template-columns: minmax(120px, 1fr) 150px 150px 3.6em; align-items: center; gap: 12px;
    padding: 6px 10px; border: 1px solid var(--line-soft); border-radius: var(--radius-sm); background: var(--bg);
  }
  .choice .name { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 13px; color: var(--text); min-width: 120px; }
  .choice .mc { --s: 20px; }
  .choice .odds { text-align: right; color: var(--faint); font-size: 12px; white-space: nowrap; }
  .editor-details .check-line { flex-direction: row; align-items: center; justify-content: flex-start; gap: 8px; font-size: 13px; color: var(--muted); }
  .editor-details label.check-line input[type=checkbox] { width: 16px; height: 16px; flex: none; margin: 0; }
  .action-tiles button:disabled { opacity: .35; cursor: not-allowed; }
  .plus-note { font-size: 12px; color: var(--faint); }
  .form-error { color: var(--warn); font-size: 13px; margin: 0; }

  /* ---- 配信画面（オーバーレイ） ---- */
  /* 部品の一覧（押すと右の試し表示が切り替わる） */
  .widget-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; align-items: stretch; }
  /* 2列だとリンクの最後（どの部品か）が切れるので、広い画面だけ2列 */
  @media (max-width: 1440px) { .widget-list { grid-template-columns: minmax(0, 1fr); } }
  .widget { display: flex; flex-direction: column; gap: 10px; cursor: pointer; }
  .widget:hover { border-color: var(--line); }
  .widget.selected { border-color: var(--text); }
  .widget .showing { font-size: 12px; color: var(--muted); }
  .widget-size { color: var(--faint); font-size: 13px; }
  .preview-card .stage { height: 380px; }
  .preview-card .preview { width: min(100%, calc(378px * var(--ratio))); }
  /* 試し表示の台。どの部品も同じ高さにして、カードの高さをそろえる */
  .stage {
    height: 200px; display: grid; place-items: center; overflow: hidden;
    border-radius: var(--radius-sm); border: 1px solid var(--line-soft);
    /* 透明の背景がわかるよう、ゲーム画面の代わりの市松模様 */
    background: repeating-conic-gradient(#1c1c1f 0 25%, #151517 0 50%) 0 0 / 16px 16px;
  }
  .stage .preview { position: relative; aspect-ratio: var(--ratio); }
  .stage .preview iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; color-scheme: normal; }
  .widget .card-head { margin: 0; }
  .widget .card-head h2 { margin-right: auto; }
  .widget .card-head button { padding: 3px 10px; font-size: 13px; }
  .widget .url { margin-top: auto; }
  /* 見た目の設定（色・面と文字・ギフト通知の3つに分ける） */
  .style-groups { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 0 32px; }
  .style-group h3 { margin: 0 0 2px; font-size: 13px; font-weight: 700; color: var(--muted); }
  .style-group .setting { grid-template-columns: minmax(0, 1fr) auto; padding: 10px 0; }
  .swatch { display: inline-flex; align-items: center; gap: 8px; }
  .swatch input[type="color"] { width: 34px; height: 32px; padding: 2px; flex: none; }
  .swatch code { flex: none; width: 6.5em; padding: 5px 0; text-align: center; font-variant-numeric: tabular-nums; }
  .range { display: inline-flex; align-items: center; gap: 10px; }
  .range input[type="range"] { width: 150px; height: auto; padding: 0; border: 0; background: none; accent-color: var(--text); }
  .range output { width: 3.4em; text-align: right; color: var(--muted); font-size: 13px; font-variant-numeric: tabular-nums; }
  /* 部品は明るい配色の前提のページなので、枠も同じにしないと白い背景が塗られる（本番の LIVE Studio では透明） */
  .widget .preview iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; color-scheme: normal; }
  .widget h2 { margin: 0; }
  .widget .lead { margin: 0; }
  .widget .url { display: flex; gap: 8px; align-items: center; min-width: 0; }
  .widget .url code { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .widget .size { color: var(--faint); font-size: 13px; }

  /* ---- テスト ---- */
  details summary { cursor: pointer; color: var(--muted); font-size: 13px; }
  details pre { margin: 10px 0 0; font-size: 12px; white-space: pre-wrap; color: var(--muted); }

  /* ---- ダイアログ ---- */
  dialog {
    background: var(--surface); color: var(--text); border: 1px solid var(--line); border-radius: 12px;
    padding: 28px; width: min(560px, calc(100vw - 32px));
  }
  dialog::backdrop { background: rgba(0, 0, 0, .75); }
  dialog h2 { margin: 0 0 6px; font-size: 18px; font-weight: 700; }
  .steps { color: var(--faint); font-size: 13px; margin-bottom: 18px; }
  .wizard-actions { display: flex; justify-content: space-between; gap: 8px; margin-top: 24px; }
  #offline {
    position: fixed; inset: auto 0 0 0; padding: 10px; text-align: center;
    background: var(--stop); color: #fff; font-weight: 600; display: none; z-index: 20;
  }
  @media (max-width: 760px) {
    body { grid-template-columns: 1fr; grid-template-rows: auto minmax(0, 1fr); }
    main { grid-column: 1; grid-row: 2; }
    body > aside { flex-direction: row; flex-wrap: wrap; align-items: center; gap: 8px; padding: 10px; border-right: 0; border-bottom: 1px solid var(--line-soft); }
    .brand { padding: 0 8px 0 4px; }
    nav { flex-direction: row; flex-wrap: wrap; }
    nav button { width: auto; }
    nav button svg { display: none; }
    .nav-group, .nav-gap { display: none; }
    .status { margin: 0; padding: 0; border: 0; flex-direction: row; gap: 14px; }
    .page-head, .page { padding-left: 16px; padding-right: 16px; }
  }
  /* お知らせ（右下） */
  .toasts { position: fixed; right: 20px; bottom: 20px; z-index: 30; display: flex; flex-direction: column; align-items: flex-end; gap: 8px; pointer-events: none; }
  .toast {
    max-width: 380px; padding: 10px 14px 10px 12px; border-radius: var(--radius); font-size: 13px;
    background: var(--raised); border: 1px solid var(--line); border-left: 3px solid var(--text);
    box-shadow: 0 10px 30px rgba(0, 0, 0, .6); animation: toast-in .16s ease-out;
  }
  .toast.error { border-left-color: var(--bad); }
  .toast.leaving { opacity: 0; transition: opacity .2s; }
  @keyframes toast-in { from { opacity: 0; transform: translateY(6px); } }
  /* 押したあと、終わるまで */
  button.busy { cursor: progress; }
  /* 保存していない印 */
  nav .badge { width: 6px; height: 6px; border-radius: 50%; background: var(--warn); margin-left: auto; }
  @media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }

  /* マイクラのアイコン（mcIconScript.js）と TikTok 公式のギフトの絵 */
  ${MC_ICON_CSS}
  .gift-img { width: 24px; height: 24px; object-fit: contain; vertical-align: middle; flex: none; }
  .gift-img.big { width: 56px; height: 56px; }
  .with-icon { display: flex; align-items: center; gap: 6px; }
  #log .gift-img { width: 20px; height: 20px; margin-right: 4px; }
  #log .mc { margin-right: 4px; }
  /* ギフトを絵で選ぶ */
  #giftPicker { width: min(780px, calc(100vw - 32px)); }
  .gift-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 6px; max-height: 60vh; overflow-y: auto; margin-top: 14px; padding-right: 4px; }
  .gift-grid button {
    flex-direction: column; gap: 2px; padding: 10px 4px; white-space: normal; font-size: 13px; line-height: 1.35;
    background: var(--bg); border-color: var(--line-soft);
  }
  .gift-grid button:hover { background: var(--raised); border-color: var(--line); }
  .gift-grid small { color: var(--faint); font-variant-numeric: tabular-nums; }

  /* ---- 有料版の画面 ---- */
  .plan-hero { display: grid; grid-template-columns: minmax(0, 1fr); gap: 24px; }
  .plan-hero.with-terms { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
  .plan-name { margin: 0; font-size: 13px; font-weight: 700; }
  .plan-price { margin: 2px 0 10px; color: var(--muted); }
  .plan-price b { margin-right: 4px; font-size: 34px; font-weight: 600; letter-spacing: -.02em; color: var(--text); font-variant-numeric: tabular-nums; }
  .plan-hero .lead { margin-bottom: 14px; }
  .plan-terms {
    margin: 0; padding-left: 24px; border-left: 1px solid var(--line-soft); align-content: start;
    display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 6px 14px; font-size: 13px; color: var(--muted);
  }
  .plan-terms dt { color: var(--text); white-space: nowrap; }
  .plan-terms dd { margin: 0; }
  .section-title { margin: 8px 0 -4px; font-size: 13px; font-weight: 700; }
  .plan-features { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
  .feature { display: flex; flex-direction: column; gap: 8px; }
  .feature h3 { margin: 0; font-size: 14px; }
  .feature p { margin: 0; color: var(--muted); font-size: 13px; }
  .feature .free-note { color: var(--faint); font-size: 12px; }
  .feature button { margin-top: auto; align-self: flex-start; }
  .plan-numbers { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
  .plan-numbers .card { display: flex; flex-direction: column; gap: 2px; }
  .plan-numbers b { font-size: 22px; font-weight: 600; line-height: 1.3; }
  .plan-numbers span { color: var(--muted); font-size: 13px; }
  .compare { width: 100%; border-collapse: collapse; }
  .compare th, .compare td { padding: 9px 12px; text-align: left; border-bottom: 1px solid var(--line-soft); vertical-align: top; }
  .compare tr:last-child th, .compare tr:last-child td { border-bottom: 0; }
  .compare thead th { font-size: 12px; font-weight: 400; color: var(--faint); border-bottom-color: var(--line); }
  .compare tbody th { font-weight: 400; color: var(--muted); }
  .compare td { white-space: nowrap; width: 22%; }
  .compare td.plus { color: var(--text); font-weight: 600; }
  .compare td.none { color: var(--faint); }
  @media (max-width: 1000px) {
    .plan-hero.with-terms, .plan-features { grid-template-columns: minmax(0, 1fr); }
    .plan-terms { padding-left: 0; border-left: 0; }
    .plan-numbers { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }

  /* ---- プラン（販売を始めるまでは出さない） ---- */
  .plan-badge { font-size: 12px; border: 1px solid var(--line); border-radius: 99px; padding: 1px 10px; color: var(--muted); }
  .plan-badge.plus { color: var(--text); border-color: var(--text); }
  .plan-chip { margin-top: 6px; align-self: flex-start; font-size: 12px; padding: 2px 10px; height: auto; color: var(--muted); background: transparent; border-color: var(--line); }
  .plan-chip.plus { color: var(--text); }
  .plus-link { margin-left: 6px; padding: 0; height: auto; border: 0; background: none; color: var(--text); text-decoration: underline; font-size: inherit; }

  /* ---- 妨害の設定の履歴 ---- */
  .history-list { list-style: none; margin: 10px 0 0; padding: 0; max-height: min(60vh, 520px); overflow-y: auto; }
  .history-list > li { padding: 12px 2px; border-bottom: 1px solid var(--line-soft); }
  .history-list:focus-visible { outline: none; }
  .history-list > li:last-child { border-bottom: 0; }
  .history-head { display: flex; align-items: center; gap: 10px; }
  .history-head b { font-variant-numeric: tabular-nums; }
  .history-head .grow { flex: 1; color: var(--muted); font-size: 13px; }
  .history-head .now { font-size: 12px; color: var(--faint); border: 1px solid var(--line); border-radius: 99px; padding: 1px 8px; }
  .history-diff { list-style: none; margin: 6px 0 0; padding: 0; font-size: 13px; color: var(--muted); }
  .history-diff li { padding: 1px 0; overflow-wrap: anywhere; }
  .history-diff .mark { display: inline-block; width: 3.4em; color: var(--faint); }

  /* ---- 分析 ---- */
  .stream-list { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
  .stream-list th { text-align: right; font-weight: 400; font-size: 12px; color: var(--faint); padding: 6px 10px; border-bottom: 1px solid var(--line); white-space: nowrap; }
  .stream-list td { text-align: right; padding: 8px 10px; border-bottom: 1px solid var(--line-soft); white-space: nowrap; }
  .stream-list th:first-child, .stream-list td:first-child { text-align: left; }
  .stream-list tbody tr { cursor: pointer; }
  .stream-list tbody tr:hover { background: var(--raised); }
  .stream-list tbody tr.selected { background: var(--raised); box-shadow: inset 2px 0 0 var(--text); }
  .stream-detail { display: flex; flex-direction: column; gap: 16px; }
  .detail-lists { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; align-items: stretch; }
  .key-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); }
  /* 幅が狭いと大きな数どうしがくっつくので 2×2 にする */
  .stream-detail > .card:first-child { container-type: inline-size; }
  @container (max-width: 620px) {
    .key-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); row-gap: 12px; }
    .key-stats .stat:nth-child(3) { border-left: 0; }
  }
  .key-stats .stat b.warn { color: var(--warn); }
  .key-stats .stat b.bad { color: var(--bad); }
  .sub-stats { margin: 12px 0 0; padding-top: 10px; border-top: 1px solid var(--line-soft); color: var(--muted); font-size: 13px; font-variant-numeric: tabular-nums; }
  .stream-list td.bad { color: var(--bad); }
  .stream-list td.warn { color: var(--warn); }
  @media (max-width: 900px) { .detail-lists { grid-template-columns: minmax(0, 1fr); } }
  .stats.wide { grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); row-gap: 12px; }
  .chart { position: relative; margin-bottom: 14px; }
  .chart-title { margin: 10px 0 4px; font-size: 13px; font-weight: 600; color: var(--muted); }
  .chart svg { display: block; width: 100%; height: 140px; overflow: visible; }
  .chart .axis { fill: var(--faint); font-size: 11px; }
  .chart .grid { stroke: var(--line-soft); stroke-width: 1; }
  .chart .base { stroke: var(--line); stroke-width: 1; }
  .chart .bar { fill: var(--data); }
  .chart .line { fill: none; stroke: var(--data); stroke-width: 2; stroke-linejoin: round; }
  .chart .cursor { stroke: var(--muted); stroke-width: 1; }
  .chart .tip {
    position: absolute; top: 0; pointer-events: none; transform: translateX(-50%);
    background: var(--raised); border: 1px solid var(--line); border-radius: var(--radius-sm); padding: 4px 8px; font-size: 13px; white-space: nowrap;
  }
  .chart .tip small { color: var(--muted); margin-right: 6px; }
  .rank-list { list-style: none; margin: 0; padding: 0; font-variant-numeric: tabular-nums; }
  .rank-list li { display: flex; align-items: center; gap: 10px; padding: 6px 0; border-bottom: 1px solid var(--line-soft); }
  .rank-list li:last-child { border-bottom: 0; }
  .rank-list .name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .rank-list .value { color: var(--muted); }
  .rank-list .gift-img { width: 22px; height: 22px; }
  .rank-list .mc { --s: 20px; }
</style>
</head>
<body>
<aside>
  <div class="brand"><span class="brand-mark"></span><b>STATIC ARC</b></div>
  <nav>
    <span class="nav-group">配信中</span>
    <button class="active" data-tab="tabLive">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="2"/><path d="M4.5 4.5a5 5 0 0 0 0 7M11.5 4.5a5 5 0 0 1 0 7M2.4 2.4a8 8 0 0 0 0 11.2M13.6 2.4a8 8 0 0 1 0 11.2"/></svg>配信</button>
    <button data-tab="tabFill">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M8 1.8 14 5v6l-6 3.2L2 11V5z"/><path d="M2 5l6 3.2L14 5M8 8.2v6"/></svg>ゲームモード</button>
    <span class="nav-group">準備</span>
    <button data-tab="tabRules">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 4h7M12 4h2M2 8h2M7 8h7M2 12h9M14 12h0"/><circle cx="10.5" cy="4" r="1.5"/><circle cx="5.5" cy="8" r="1.5"/><circle cx="12.5" cy="12" r="1.5"/></svg>妨害の設定<span class="badge" id="rulesBadge" title="保存していない変更があります" hidden></span></button>
    <button data-tab="tabOverlay">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><rect x="4" y="1.5" width="8" height="13" rx="1.5"/><path d="M6 5h4M6 7.5h2.5"/></svg>配信画面</button>
    <button data-tab="tabDebug">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M6 1.8h4M6.8 1.8v4.4L2.6 13a.8.8 0 0 0 .7 1.2h9.4a.8.8 0 0 0 .7-1.2L9.2 6.2V1.8"/><path d="M4.4 10h7.2"/></svg>テスト</button>
    <button data-tab="tabSetup">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M6 1.5v3M10 1.5v3M4 4.5h8v3a4 4 0 0 1-8 0zM8 11.5v3"/></svg>接続と準備</button>
    <span class="nav-group">ふり返り</span>
    <button data-tab="tabStats">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 14h12M4 11V8M8 11V3M12 11V6"/></svg>分析</button>
    <span class="nav-gap"></span>
    <button data-tab="tabPlan">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M4.5 2h7L14.5 6 8 14 1.5 6z"/><path d="M1.5 6h13M6 2 5.5 6 8 14l2.5-8L10 2"/></svg>有料版</button>
  </nav>
  <div class="alert-bar" id="alertBar" hidden></div>
  <div class="status">
    <span class="chip"><span class="dot" id="pauseDot"></span>妨害<span id="pauseText">—</span></span>
    <span class="chip"><span class="dot" id="tiktokDot"></span>TikTok<span id="tiktokText">—</span></span>
    <span class="chip"><span class="dot" id="modDot"></span>マイクラ<span id="modText">—</span></span>
    <span class="version" id="appVersion"></span>
    <button class="plan-chip" id="planChip" data-goto="tabPlan" title="有料版について" hidden></button>
  </div>
</aside>

<main id="tabLive">
  <div class="page-head">
    <h1>配信</h1>
    <button class="lg" id="toggle">一時停止</button>
    <button class="lg danger" id="stop">全妨害ストップ</button>
  </div>
  <div class="page">
    <section class="card live-top">
      <div class="status-tile" id="tileTiktok"><span class="dot"></span><div><small>TikTok</small><b>—</b></div></div>
      <div class="status-tile" id="tileMod"><span class="dot"></span><div><small>マイクラ</small><b>—</b></div></div>
      <div class="status-tile" id="tilePause"><span class="dot"></span><div><small>妨害</small><b>—</b></div></div>
      <div class="counts">
        <div title="届いたギフト・フォロー・シェアと、決めた回数に届いたいいねの数"><small>届いた</small><b id="received">0</b></div>
        <div title="マイクラに妨害を出した数"><small>妨害を出した</small><b id="sent">0</b></div>
        <div title="ルールがない・一時停止中・待ち時間中で、出さなかった数"><small>出さなかった</small><b id="skipped">0</b></div>
        <div title="マイクラに届かなかった数"><small>失敗</small><b id="failed">0</b></div>
      </div>
    </section>
    <div class="split">
      <section class="card feed-card">
        <div class="card-head"><h2>届いたものと出した妨害</h2><span class="hint" style="margin: 0;">新しい順</span></div>
        <ol class="feed" id="feed"></ol>
        <div class="feed-empty" id="feedEmpty">まだ何も届いていません。TikTok LIVE で届いたギフトと、それで出した妨害がここに並びます。「テスト」の画面で試しに送ることもできます。</div>
      </section>
      <aside class="split-side">
        <section class="card" id="fillCard">
          <div id="fillRunning" hidden>
            <div class="fill-hero">
              <div class="fill-round"><small>ラウンド（クリアした数）</small><b id="fillRound"></b></div>
              <div class="fill-pct"><small>埋まった割合</small><b id="fillPercent"></b></div>
            </div>
            <div class="fill-progress" id="fillBar"><div></div></div>
            <div class="fill-meta"><span class="fill-phase" id="fillPhase"></span><span class="fill-detail" id="fillDetail"></span></div>
            <div class="fill-buttons">
              <button data-action="fill_expand" data-icon="fill_expand">枠 +1</button>
              <button data-action="fill_shrink" data-icon="fill_shrink">枠 −1</button>
              <button data-action="fill_help" data-count="10" data-icon="fill_help">お助け +10</button>
              <button data-action="tnt" data-icon="tnt">TNT</button>
            </div>
          </div>
          <div id="liveMining" hidden>
            <div id="liveMiningStatus"></div>
            <div class="mining-actions">
              <button data-mining-op="pause">一時停止</button>
              <button data-mining-op="resume">再開する</button>
              <button data-mining-op="abort">中止する</button>
            </div>
          </div>
          <div class="empty" id="fillEmpty">
            <span id="fillEmptyText">埋め立ては始まっていません。</span>
            <button data-goto="tabFill">ゲームモードへ</button>
          </div>
        </section>
        <section class="card log-card">
          <div class="card-head"><h2>アプリの記録</h2><button class="ghost" id="logLatest" hidden>最新へ ↓</button></div>
          <ul id="log"></ul>
        </section>
      </aside>
    </div>
  </div>
</main>

<main id="tabFill" hidden>
  <div class="page-head">
    <h1>ゲームモード</h1>
    <button class="lg primary" id="fillStart">埋め立てを始める</button>
    <button class="lg" id="fillStop" hidden>埋め立てを終える</button>
    <button class="lg primary" id="miningStart" hidden>チャレンジを始める</button>
    <button class="lg" data-mining-op="pause" hidden>一時停止</button>
    <button class="lg" data-mining-op="resume" hidden>再開する</button>
    <button class="lg" data-mining-op="abort" hidden>中止する</button>
  </div>
  <div class="page">
    <section class="mode-cards" id="modeCards" aria-label="ゲームモード">
      <button type="button" class="mode-card" data-mode="fill" data-icon="amethyst_block"><b>埋め立て</b><small>空中の枠をブロックで埋めきればクリア。ギフトで枠が広がったり、TNT で崩されたりします</small><span class="in-use" hidden>選択中</span></button>
      <button type="button" class="mode-card" data-mode="mining_challenge" data-icon="mining"><b>採掘・収集チャレンジ</b><small>制限時間のうちに、決めた資源を決めた数だけ掘って拾えばクリア</small><span class="in-use" hidden>選択中</span></button>
    </section>
    <p class="hint" id="modeLocked" style="margin: -4px 0 0;" hidden>ゲーム中はモードを切り替えられません。今のゲームを終えてから切り替えてください。</p>
    <div id="modeMining" class="stack" hidden>
      <section class="mode-hero">
        <img src="${KEY_ART.mining_challenge.src}" style="object-position: ${KEY_ART.mining_challenge.position};" alt="">
        <div class="mode-hero-text"><small>GAME MODE</small><h2>採掘・収集チャレンジ</h2><p>制限時間のうちに、決めた資源を決めた数だけ掘って集めればクリア。視聴者のギフトで、モブや TNT のじゃまと収集支援が飛んできます。</p></div>
      </section>
      <div class="banner" id="miningBusy" hidden>チャレンジ中は設定を変えられません。変えるときは中止してから始め直してください。</div>
      <div class="split">
        <div class="stack">
          <section class="card" id="miningNow" hidden>
            <div id="miningNowStatus"></div>
            <div class="mining-actions" id="miningAgain" hidden><button class="primary" id="miningRetry">もう一度挑戦</button></div>
          </section>
          <section class="card" id="miningSettings">
            <h2>チャレンジの決まり</h2>
            <p class="lead">制限時間のうちに、対象の資源を目標の数だけ掘って拾えばクリアです。</p>
            <div class="presets" id="miningPresets" style="margin-bottom: 14px;"></div>
            <div class="setting tall"><div class="setting-text"><label for="miningItem">対象アイテム</label><small id="miningNote"></small></div><div class="setting-control">
              <select id="miningItem" data-tiles aria-label="対象アイテム">${MINING_TARGETS.map((t) => '<option value="' + t.icon + '">' + t.name + '</option>').join('')}</select></div></div>
            <div class="setting"><div class="setting-text"><label for="miningCount">目標数</label><small>${MINING_LIMITS.minCount}〜${MINING_LIMITS.maxCount}個</small></div><div class="setting-control"><input id="miningCount" type="number" min="${MINING_LIMITS.minCount}" max="${MINING_LIMITS.maxCount}" data-unit="個"></div></div>
            <div class="setting"><div class="setting-text"><label for="miningSeconds">制限時間</label><small id="miningClock"></small></div><div class="setting-control"><input id="miningSeconds" type="number" min="${MINING_LIMITS.minSeconds}" max="${MINING_LIMITS.maxSeconds}" step="30" data-unit="秒"></div></div>
          </section>
        </div>
        <aside class="split-side">
          <section class="card">
            <h2>始める前の確認</h2>
            <p class="lead">全部 ✓ になると始められます。</p>
            <ul class="checks" id="miningChecks"></ul>
            <details class="more-info">
              <summary>数え方と、妨害の出方</summary>
              <p class="hint" style="margin-top: 8px;">プレイヤーが掘ったブロックから落ちた対象アイテムを、拾ったときだけ数えます（チェストの中身・もともと持っていた物・ほかの人が掘った物は数えません）。シルクタッチで掘ると鉱石のまま落ちるので数えません。スーパーフラットのワールドには鉱石がありません。「始める」を押すと3秒のカウントダウンのあと始まり、残り時間はマイクラ画面の上のバーにも出ます。チャレンジの一時停止中は時間も進み具合も止まり、ギフトの妨害は出しません（あとからまとめて出すこともしません）。採掘チャレンジでは TNT とクリーパーの爆発で地形は壊れません。枠を使う妨害（枠を広げる・逮捕など）は出しません。</p>
            </details>
          </section>
        </aside>
      </div>
    </div>
    <div id="modeFill" class="stack">
      <section class="mode-hero">
        <img src="${KEY_ART.fill.src}" style="object-position: ${KEY_ART.fill.position};" alt="">
        <div class="mode-hero-text"><small>GAME MODE</small><h2>埋め立て</h2><p>空中のガラスの枠を、ブロックで埋めきればクリア。視聴者のギフトで、枠が広がったり TNT で崩されたりします。</p></div>
      </section>
    <div class="banner" id="fillBusy" hidden>埋め立て中です。設定を変えるときは、いったん終えてから始め直してください。</div>
    <div class="split">
    <div class="stack">
    <div id="fillIdle" class="stack">
      <section class="card">
        <h2>ゲームの決まり</h2>
        <p class="lead">埋めきって、決めた秒数崩されなければ 1ラウンドクリアです。</p>
        <div class="setting"><div class="setting-text"><label for="fillRounds">ラウンド数</label></div><div class="setting-control"><input id="fillRounds" type="number" min="1" max="99" data-unit="回"></div></div>
        <div class="setting"><div class="setting-text"><label for="fillCountdown">埋めきってからクリアまで</label><small>この秒数のあいだ崩されなければクリア</small></div><div class="setting-control"><input id="fillCountdown" type="number" min="0" max="600" data-unit="秒"></div></div>
        <div class="setting"><div class="setting-text"><label for="fillWidth">枠の幅</label><small>3〜41 の奇数</small></div><div class="setting-control"><input id="fillWidth" type="number" min="3" max="41" step="2" data-unit="マス"></div></div>
        <div class="setting"><div class="setting-text"><label for="fillHeight">枠の高さ</label></div><div class="setting-control"><input id="fillHeight" type="number" min="1" max="30" data-unit="マス"></div></div>
        <div class="setting"><div class="setting-text"><label for="fillSkyY">枠を作る高さ</label><small>Y 座標</small></div><div class="setting-control"><input id="fillSkyY" type="number" min="-60" max="300" data-unit=""></div></div>
        <div class="setting"><div class="setting-text"><label for="fillMobLifetime">モブが消えるまで</label><small>0 にすると消えません</small></div><div class="setting-control"><input id="fillMobLifetime" type="number" min="0" max="600" step="5" data-unit="秒"></div></div>
      </section>
      <section class="card">
        <h2>プレイヤー</h2>
        <p class="lead">埋め立て中だけ変わり、終えると元に戻ります。</p>
        <div class="setting"><div class="setting-text"><label for="fillMobsAttack">モブからの攻撃</label></div><div class="setting-control"><select id="fillMobsAttack">
          <option value="true">モブの攻撃でだけダメージ</option><option value="false">攻撃されない</option>
        </select></div></div>
        <div class="setting"><div class="setting-text"><label for="fillPlaceSpeed">置く速さ</label><small>押しっぱなしのとき</small></div><div class="setting-control"><select id="fillPlaceSpeed">
          <option value="normal">ふつう（1秒に5個）</option><option value="fast">速い（1秒に10個）</option><option value="fastest">とても速い（1秒に20個）</option>
        </select></div></div>
        <div class="setting"><div class="setting-text"><label for="fillBreakSpeed">壊す速さ</label><small>押しっぱなしのとき</small></div><div class="setting-control"><select id="fillBreakSpeed">
          <option value="normal">ふつう（バニラと同じ）</option><option value="fast">速い（1秒に10個）</option><option value="fastest">とても速い（1秒に20個）</option>
        </select></div></div>
        <div class="setting"><div class="setting-text"><label for="fillReach">届く距離</label></div><div class="setting-control"><input id="fillReach" type="number" min="1" max="64" data-unit="マス"></div></div>
      </section>
      <section class="card">
        <h2>見た目</h2>
        <p class="lead">配信に映るブロックと枠です。</p>
        <div class="setting tall"><div class="setting-text"><label for="fillHandBlock">手に持つブロック</label></div><div class="setting-control">
          <select id="fillHandBlock" data-tiles aria-label="手に持つブロック">
            <option value="amethyst_block">アメジスト</option><option value="diamond_block">ダイヤモンド</option>
            <option value="emerald_block">エメラルド</option><option value="gold_block">金</option>
            <option value="iron_block">鉄</option><option value="lapis_block">ラピスラズリ</option>
            <option value="redstone_block">レッドストーン</option><option value="quartz_block">クォーツ</option>
          </select></div></div>
        <div class="setting tall"><div class="setting-text"><label for="fillBlock">置かれるブロック</label><small>置いた瞬間にこれに変わります。お助けもこれ</small></div><div class="setting-control">
          <select id="fillBlock" data-tiles aria-label="置かれるブロック">
            <option value="amethyst_block">アメジスト</option><option value="diamond_block">ダイヤモンド</option>
            <option value="emerald_block">エメラルド</option><option value="gold_block">金</option>
            <option value="iron_block">鉄</option><option value="lapis_block">ラピスラズリ</option>
            <option value="redstone_block">レッドストーン</option><option value="quartz_block">クォーツ</option>
          </select></div></div>
        <div class="setting tall"><div class="setting-text"><label for="fillWall">枠の素材</label></div><div class="setting-control">
          <select id="fillWall" data-tiles aria-label="枠の素材">
            <option value="glass">ガラス</option><option value="white_stained_glass">白色のガラス</option>
            <option value="light_blue_stained_glass">空色のガラス</option><option value="bedrock">岩盤</option>
          </select></div></div>
      </section>
    </div>
    <section class="card">
      <h2>ワールド</h2>
      <p class="lead">コマンドの代わりです。変えるとすぐマイクラに入り、ワールドに入るたびにも入れ直します。埋め立て中でも変えられます。</p>
        <div class="setting"><div class="setting-text"><label for="worldTime">時間</label></div><div class="setting-control"><select id="worldTime">
          <option value="normal">進む（ふつう）</option><option value="day">昼で止める</option><option value="night">夜で止める</option>
        </select></div></div>
        <div class="setting"><div class="setting-text"><label for="worldWeather">天気</label></div><div class="setting-control"><select id="worldWeather">
          <option value="normal">変わる（ふつう）</option><option value="clear">晴れで止める</option><option value="rain">雨で止める</option>
        </select></div></div>
        <div class="setting"><div class="setting-text"><label for="worldMobSpawning">モブが自然に湧く</label></div><div class="setting-control"><select id="worldMobSpawning">
          <option value="true">湧く（ふつう）</option><option value="false">湧かない（妨害のモブだけ）</option>
        </select></div></div>
        <div class="setting"><div class="setting-text"><label for="worldKeepInventory">やられたときの持ち物</label></div><div class="setting-control"><select id="worldKeepInventory">
          <option value="false">落とす（ふつう）</option><option value="true">残る</option>
        </select></div></div>
    </section>
    </div>
    <aside class="split-side" id="fillSide">
      <section class="card">
        <h2>枠の大きさ</h2>
        <div class="frame-figure" id="frameFigure"></div>
        <p class="frame-size" id="frameSize"></p>
        <details class="more-info">
          <summary>始めるとどうなるか</summary>
          <p class="hint" style="margin-top: 8px;">プレイヤーの真上の空中に枠ができ、中へ移動します。置くブロックは減りません。枠は壊れず、枠の外と枠より上には置けません。落ちたら枠の上に戻ります。TNT とモブは枠の中に出ます。モブに攻撃される設定なら、埋め立て中はモブの攻撃でだけダメージを受けます（TNT・落下では減らず、浮いていられて、おなかも減りません）。終えると元のゲームモードに戻ります（マイクラが途中で閉じても、次に入ったときに戻ります）。カウントダウンや残り時間は画面の真ん中に出ます。</p>
        </details>
      </section>
    </aside>
    </div>
    </div>
  </div>
</main>

<main id="tabRules" hidden>
  <div class="page-head">
    <h1>妨害の設定</h1>
    <span class="dirty" id="dirty" hidden>保存していない変更があります</span>
    <button class="lg ghost" id="openHistory" title="保存するたびに残している、前の設定を見て戻せます">変更の履歴</button>
    <button class="lg ghost" id="revertRules" title="最後に保存したときの設定に戻します">保存前に戻す</button>
    <button class="lg next" id="saveRules">保存する</button>
  </div>
  <div class="page">
    <section class="card">
      <div class="card-head"><h2>プリセット</h2>
        <span id="settingsFile" hidden>
          <a class="button ghost" id="exportSettings" href="/api/settings/export" download title="今のルールと自分のプリセットを、ファイルに保存します（別の PC に持っていけます）">ファイルに書き出す</a>
          <button class="ghost" id="importSettings" title="書き出したファイルのプリセットを足します（今のルールは変わりません）">ファイルから読み込む</button>
          <input type="file" id="importFile" accept=".json,application/json" hidden>
        </span>
      </div>
      <p class="lead">押すと、ルールがまとめて入れ替わります（「保存する」で確定）。</p>
      <div class="presets" id="presets"></div>
    </section>
    <div class="recent-strip" title="押すと、そのギフトのルールを作ります">
      <span class="recent-title">最近届いたギフト</span>
      <div class="recent" id="recent"></div>
    </div>
    <section class="rules-section">
      <div class="rules-top">
        <h2>ルール <span class="count" id="ruleCount"></span></h2>
        <button class="lg next" id="addRule">＋ ルールを追加</button>
      </div>
      <p class="hint" style="margin-top: 0;">行を押すと変えられます。「▶ 試す」で、そのきっかけが届いたことにしてマイクラで試せます。ギフトを連打すると、出る数も増えます。</p>
      <div class="rule-list" id="ruleGroups"></div>
    </section>
  </div>
</main>

<main id="tabOverlay" hidden>
  <div class="page-head"><h1>配信画面</h1></div>
  <div class="page">
    <div class="split">
      <div class="stack">
        <section class="card">
          <h2>配信画面に出す部品</h2>
          <p class="lead" style="margin-bottom: 0;">部品の「コピー」を押し、TikTok LIVE Studio の「ソースを追加」→「リンク」に貼ります。部品ごとに好きな位置・大きさに置けます。</p>
          <details class="more-info">
            <summary>大きさについて</summary>
            <p class="hint">おすすめの大きさは、縦画面（1080×1920）のときのものです。枠を大きくすると、文字や絵も大きくなります。下の絵は試しの表示です。</p>
          </details>
        </section>
        <div class="widget-list" id="widgets"></div>
        <section class="card" id="styleCard" hidden>
          <div class="card-head"><h2>見た目</h2><button class="ghost" id="styleReset">元に戻す</button></div>
          <p class="lead">4つの部品すべてに効きます。変えると、すぐ配信画面と下の試し表示に映ります。大きさと位置は、LIVE Studio で枠を動かして変えてください。</p>
          <div class="style-groups" id="styleFields">
            <div class="style-group">
              <h3>色</h3>
              <div class="setting"><div class="setting-text"><label for="styleText">文字の色</label></div><div class="setting-control"><span class="swatch"><input type="color" id="styleText" data-style="textColor"><code></code></span></div></div>
              <div class="setting"><div class="setting-text"><label for="styleAccent">強調の色</label><small>カウントダウンなど</small></div><div class="setting-control"><span class="swatch"><input type="color" id="styleAccent" data-style="accentColor"><code></code></span></div></div>
              <div class="setting"><div class="setting-text"><label for="stylePanel">面の色</label></div><div class="setting-control"><span class="swatch"><input type="color" id="stylePanel" data-style="panelColor"><code></code></span></div></div>
            </div>
            <div class="style-group">
              <h3>面と文字</h3>
              <div class="setting"><div class="setting-text"><label for="styleOpacity">面の濃さ</label><small>0% で透明</small></div><div class="setting-control"><span class="range"><input type="range" id="styleOpacity" min="0" max="100" step="5" data-style="panelOpacity"><output for="styleOpacity"></output></span></div></div>
              <div class="setting"><div class="setting-text"><label for="styleFont">文字の形</label></div><div class="setting-control"><select id="styleFont" data-style="font">
                <option value="gothic">游ゴシック（ふつう）</option><option value="meiryo">メイリオ</option><option value="ud">BIZ UDPゴシック（読みやすい）</option><option value="mincho">游明朝</option>
              </select></div></div>
            </div>
            <div class="style-group">
              <h3>ギフト通知</h3>
              <div class="setting"><div class="setting-text"><label for="styleSeconds">出しておく時間</label></div><div class="setting-control"><input type="number" id="styleSeconds" min="2" max="15" step="0.5" data-style="alertSeconds" data-unit="秒"></div></div>
              <div class="setting"><div class="setting-text"><label for="styleMax">同時に出す数</label></div><div class="setting-control"><input type="number" id="styleMax" min="1" max="5" data-style="alertMax" data-unit="個"></div></div>
            </div>
          </div>
        </section>
      </div>
      <aside class="split-side">
        <section class="card preview-card">
          <div class="card-head"><h2 id="previewTitle"></h2><span class="widget-size" id="previewSize"></span></div>
          <div class="stage" id="previewStage"><div class="preview" id="previewBox"><iframe id="previewFrame" title="試しの表示" tabindex="-1"></iframe></div></div>
          <p class="hint">試しの表示です。見た目を変えると、すぐここと配信画面に映ります。左の部品を押すと切り替わります。</p>
        </section>
      </aside>
    </div>
  </div>
</main>

<main id="tabStats" hidden>
  <div class="page-head"><h1>分析</h1><button class="ghost" id="statsReload">最新にする</button></div>
  <div class="page">
    <div class="split list-first" id="statsSplit">
      <div class="stream-detail" id="streamDetail" hidden>
        <section class="card">
          <div class="card-head"><h2 id="detailTitle"></h2></div>
          <div class="key-stats" id="detailStats"></div>
          <p class="sub-stats" id="detailSub"></p>
        </section>
        <section class="card">
          <div class="card-head"><h2>流れ（1分ごと）</h2><div class="segmented" id="chartSwitch" style="margin: 0;">
            <button type="button" data-chart="chartCoins" class="selected">届いたコイン</button><button type="button" data-chart="chartActions">出した妨害</button><button type="button" data-chart="chartFill">埋まった割合</button>
          </div></div>
          <p class="lead">配信のどのあたりで盛り上がったかがわかります。グラフに重ねると数が出ます。</p>
          <div class="chart" id="chartCoins"></div>
          <div class="chart" id="chartActions" hidden></div>
          <div class="chart" id="chartFill" hidden></div>
        </section>
        <div class="detail-lists">
          <section class="card"><h2>よく届いたギフト</h2><ul class="rank-list" id="detailGifts"></ul></section>
          <section class="card"><h2>ギフトを送ってくれた人</h2><ul class="rank-list" id="detailSupporters"></ul></section>
          <section class="card"><h2>出した妨害</h2><ul class="rank-list" id="detailActions"></ul></section>
          <section class="card"><h2>出なかった理由</h2><ul class="rank-list" id="detailFailures"></ul></section>
        </div>
      </div>
      <aside class="split-side">
        <section class="card">
          <h2>配信ごとの記録</h2>
          <p class="lead" id="statsLead">直近30日分（テスト送信は数えません）。押すと右にくわしく出ます。開いているあいだは15秒ごとに新しくなります。</p>
          <p class="hint" id="statsPlusNote" hidden></p>
          <div style="overflow-x: auto;"><table class="stream-list" id="streamList"></table></div>
          <div class="empty" id="streamEmpty" hidden><span>まだ記録がありません。TikTok LIVE につないで配信すると、ここに出ます。</span></div>
        </section>
      </aside>
    </div>
  </div>
</main>

<main id="tabDebug" hidden>
  <div class="page-head"><h1>テスト</h1></div>
  <div class="page">
    <div class="split">
      <section class="card">
        <h2>妨害をそのまま出す</h2>
        <p class="lead">ルールを通さずにマイクラに出します。マイクラに届くかの確認に使えます（一時停止中は出ません）。</p>
        <p class="group-label">敵・爆発</p>
        <div class="quick">
          <button data-action="tnt" data-icon="tnt">TNT ×1</button>
          <button data-action="tnt" data-count="5" data-icon="tnt">TNT ×5</button>
          <button data-action="tnt" data-count="20" data-icon="tnt">TNT ×20</button>
          <button data-action="lightning" data-count="3" data-icon="lightning">雷 ×3</button>
          <button data-action="mob" data-mob="zombie" data-icon="zombie">ゾンビ</button>
          <button data-action="mob" data-mob="skeleton" data-icon="skeleton">スケルトン</button>
          <button data-action="mob" data-mob="creeper" data-icon="creeper">クリーパー</button>
          <button data-action="mob" data-mob="spider" data-icon="spider">クモ</button>
          <button data-action="mob" data-mob="witch" data-icon="witch">ウィッチ</button>
          <button data-action="mob" data-mob="silverfish" data-icon="silverfish">シルバーフィッシュ</button>
          <button data-action="mob" data-mob="pig" data-icon="pig">ブタ</button>
        </div>
        <p class="group-label test-group">動きをじゃまする</p>
        <div class="quick">
          <button data-action="jail" data-count="10" data-icon="jail">逮捕 10秒</button>
          <button data-action="freeze" data-count="5" data-icon="freeze">操作禁止 5秒</button>
          <button data-action="levitate" data-count="3" data-icon="levitate">浮遊 3秒</button>
          <button data-action="night" data-count="30" data-icon="night">夜にする 30秒</button>
        </div>
        <p class="group-label test-group">埋め立て中だけ</p>
        <div class="quick">
          <button data-action="fill_expand" data-icon="fill_expand">枠 +1</button>
          <button data-action="fill_shrink" data-icon="fill_shrink">枠 −1</button>
          <button data-action="fill_raise" data-icon="fill_raise">枠を高く +1段</button>
          <button data-action="fill_help" data-count="10" data-icon="fill_help">お助け +10</button>
          <button data-action="fill_help" data-count="64" data-icon="fill_help">お助け +64</button>
          <button data-action="fill_layer" data-icon="fill_layer">一段埋め</button>
          <button data-action="fill_clear" data-icon="fill_clear">全消し</button>
        </div>
        <p class="group-label test-group">採掘チャレンジ中だけ（進み具合・時間を変えた挑戦は「テスト」の印が付きます）</p>
        <div class="quick">
          <button data-mining-test="drop" data-icon="mining">テスト用のアイテムを出す（数えない）</button>
          <button data-mining-test="progress" data-percent="50" data-icon="mining">進み具合を 50% に</button>
          <button data-mining-test="progress" data-percent="100" data-icon="mining">進み具合を 100% に（クリア）</button>
          <button data-mining-test="time" data-icon="night">残り 5秒に</button>
          <button data-action="mining_bonus_drop" data-count="3" data-icon="mining_bonus_drop">収集支援 ×3</button>
        </div>
        <p class="group-label test-group">埋め立てを進める（下の段から順に埋めます）</p>
        <div class="quick">
          <button data-action="fill_set" data-percent="100" data-icon="fill_set">一気に埋める（100%）</button>
          <button data-action="fill_set" data-percent="90" data-icon="fill_set">90% まで</button>
          <button data-action="fill_set" data-percent="50" data-icon="fill_set">50% まで</button>
          <button data-action="fill_set" data-percent="0" data-icon="glass">枠の中を空にする</button>
        </div>
      </section>
      <aside class="split-side">
        <section class="card">
          <h2>ギフト・反応が届いたことにする</h2>
          <p class="lead">「妨害の設定」のルールどおりに出ます。ルールごとに試すなら、「妨害の設定」の「▶ 試す」が便利です。</p>
          <form id="testForm">
          <div class="row">
            <button type="button" id="pickTestGift" title="ギフトを絵から選ぶ">絵から選ぶ</button>
            <input id="giftName" list="giftList" placeholder="ギフト名" autocomplete="off">
            <input id="giftCount" type="number" min="1" max="100" value="1" style="width: 64px; flex: none;" aria-label="個数">
            <button type="submit" class="next">送る</button>
          </div>
          <datalist id="giftList"></datalist>
        </form>
          <div class="quick" id="quick" style="margin-top: 10px;"></div>
          <p class="group-label test-group">視聴者の反応</p>
          <div class="quick">
            <button data-test="like" data-count="100">いいね +100</button>
            <button data-test="like" data-count="1000">いいね +1000</button>
            <button data-test="like" data-count="10000">いいね +10000</button>
            <button data-test="follow">フォロー</button>
            <button data-test="share">シェア</button>
          </div>
        </section>
        <section class="card">
          <details>
            <summary>いまの状態（困ったときに見る）</summary>
            <pre id="debugState"></pre>
          </details>
        </section>
      </aside>
    </div>
  </div>
</main>

<main id="tabSetup" hidden>
  <div class="page-head">
    <h1>接続と準備</h1>
    <button class="lg" id="openWizard">はじめの設定をやり直す</button>
  </div>
  <div class="page">
    <div class="split">
    <div class="stack">
      <section class="card">
        <h2>マイクラ（Java版 <span id="mcVersion">26.3</span>）</h2>
        <p class="lead">MOD を動かすのに必要なものです。</p>
        <div class="ready setup-ready" hidden>✓ 準備できています。ランチャーで「fabric-loader-<span class="mcv"></span>」を選んで起動してください。</div>
        <div class="setup-todo" hidden>
          <p class="hint" style="margin: 0 0 10px; color: var(--warn);">足りないものがあります。マイクラを閉じた状態で押すと、足りないものだけ入れます。</p>
          <button class="primary install-btn" style="width: 100%;">まとめて導入する</button>
        </div>
        <details class="more-info" id="setupChecks">
          <summary>入っているもの</summary>
          <ul class="checks setup-checks"></ul>
        </details>
      </section>
      <section class="card">
        <h2>TikTok</h2>
        <p class="lead">LIVE を始める前に保存しておくと、配信が始まったら自動でつながります。</p>
        <form id="tiktokForm">
          <label for="username">TikTok ID（@なし）</label>
          <div class="row">
            <input id="username" autocomplete="off" spellcheck="false" placeholder="例: my_tiktok_id">
            <button type="submit" class="next">保存して接続</button>
          </div>
        </form>
      </section>
      <section class="card link-card">
        <div>
          <h2>配信画面に表示（オーバーレイ）</h2>
          <p class="lead">ギフト通知・ギフト表・ラウンド・ランキングを、部品ごとに LIVE Studio に貼れます。</p>
        </div>
        <button data-goto="tabOverlay">配信画面の部品を見る</button>
      </section>
    </div>
    <aside class="split-side">
      <section class="card">
        <h2>このアプリについて</h2>
        <p class="lead" style="margin: 0;">Windows 10 / 11 と Minecraft Java版 26.3 で動きます。TikTok のパスワードは使いません。</p>
        <details class="more-info">
          <summary>対応している環境</summary>
          <ul>
          <li>Windows 10 / 11</li>
          <li>Minecraft Java版 26.3（統合版は使えません）</li>
          <li>Fabric Loader 0.19.5 以上と Fabric API（「まとめて導入する」で入ります）</li>
          <li>シングルプレイのワールド（最初に入ったプレイヤーを配信者として扱います）</li>
          <li>配信画面の部品は、同じ PC の TikTok LIVE Studio で使います（127.0.0.1 の URL はほかの PC からは開けません）</li>
        </ul>
        </details>
        <details class="more-info">
          <summary>データの扱い</summary>
          <ul>
          <li>TikTok のパスワードやログインは使いません。入れるのは TikTok ID だけです</li>
          <li>TikTok LIVE には、非公式のしくみ（tiktok-live-connector）でつなぎます。つなぐとき、TikTok ID が外部のサービス Euler Stream（eulerstream.com）に送られます</li>
          <li>ギフトの一覧は TikTok から、マイクラの準備に使うものは Fabric と Modrinth から取ってきます</li>
          <li>保存するのはこの PC の中だけです: 設定（TikTok ID・妨害の設定・プリセット）、妨害の設定の変更の履歴（30件）、ギフトの一覧、ギフトランキング（視聴者の名前とコイン数）、配信ごとの分析（直近30日分。視聴者の名前とコイン数を含む）、ログ（視聴者の名前と届いたギフト）</li>
          <li>これらを作者などに送ることはありません</li>
          <li>消したいときは、アプリを閉じてから、フォルダ <code>%APPDATA%\ProjectRedstone</code> を消してください。設定・ログ・ランキング・分析がすべて消えます</li>
        </ul>
        </details>
      </section>
    </aside>
    </div>
  </div>
</main>

<main id="tabPlan" hidden>
  <div class="page-head"><h1>有料版</h1><span class="plan-badge" id="planBadge"></span></div>
  <div class="page">
    <section class="card plan-hero" id="licenseCard">
      <div>
        <p class="plan-name">${PLANS.plus.name}</p>
        <p class="plan-price"><b>980</b>円 / 月（税込）</p>
        <p class="lead" id="licenseText"></p>
        <div class="row" id="licenseLinks">
          <a class="button next lg" id="licenseBuy" target="_blank" rel="noopener" hidden>有料版を申し込む</a>
          <a class="button lg" id="licensePortal" target="_blank" rel="noopener" hidden>契約の確認・解約</a>
        </div>
      </div>
      <dl class="plan-terms" id="planTerms" hidden>
        <dt>内容</dt><dd>有料版の利用権1か月分。解約するまで1か月ごとに自動で更新します</dd>
        <dt>お支払い</dt><dd>クレジットカード。お申し込みのときと、毎月の更新日に請求します（決済は販売代行の Polar）</dd>
        <dt>使える時期</dt><dd>お支払いのあとすぐ。ライセンスキーをメールでお送りします</dd>
        <dt>解約</dt><dd>いつでも「契約の確認・解約」から。次の更新日の前日までに解約すると、次回から請求されません。途中で解約しても日割りの返金はなく、支払い済みの期間の終わりまで有料版を使えます</dd>
      </dl>
    </section>

    <h2 class="section-title">有料版でできること</h2>
    <div class="plan-features">
      <article class="card feature">
        <h3>配信ごとの分析</h3>
        <p>どの時間に、どのギフトで盛り上がったか。30日分の配信を、1分ごとのグラフと内訳（ギフト・送ってくれた人・出した妨害・出なかった理由）で見られます。</p>
        <p class="free-note">無料版: 直近の配信のまとめだけ</p>
        <button data-goto="tabStats">分析を開く</button>
      </article>
      <article class="card feature">
        <h3>ルールの作りこみ</h3>
        <p>ランダムの候補ごとの出やすさ（1〜10）、同じものを続けて出さない、何ラウンド目から出すか。配信の山場をルールで作れます。</p>
        <p class="free-note">無料版: ランダムと「いつ出すか」は使えます</p>
        <button data-goto="tabRules">妨害の設定を開く</button>
      </article>
      <article class="card feature">
        <h3>変更の履歴</h3>
        <p>妨害の設定を保存するたびに、何を変えたかを残します。30件までさかのぼって、前の設定にすぐ戻せます。</p>
        <p class="free-note">無料版: 新しい3件まで</p>
        <button data-goto="tabRules">妨害の設定を開く</button>
      </article>
    </div>
    <div class="plan-numbers">
      <div class="card"><b>${PLANS.plus.userPresets}個</b><span>保存できる自分のプリセット（無料版は${PLANS.free.userPresets}個）</span></div>
      <div class="card"><b>${PLANS.plus.rulesPerPreset}件</b><span>1つのプリセットに入れられるルール（無料版は${PLANS.free.rulesPerPreset}件）</span></div>
      <div class="card"><b>見た目</b><span>配信画面の部品の色・文字・通知の秒数を変えられる</span></div>
      <div class="card"><b>書き出し</b><span>設定をファイルにして、別の PC へ持っていける</span></div>
    </div>

    <section class="card">
      <h2>無料版とくらべる</h2>
      <div style="overflow-x: auto; margin-top: 8px;">
        <table class="compare">
          <thead><tr><th></th><th>無料版</th><th>${PLANS.plus.name}</th></tr></thead>
          <tbody>
            <tr><th>妨害14種類・埋め立て・配信画面の部品4つ</th><td>○</td><td class="plus">○</td></tr>
            <tr><th>一時停止・全妨害ストップ・テスト</th><td>○</td><td class="plus">○</td></tr>
            <tr><th>ランダムの妨害・「いつ出すか」</th><td>○</td><td class="plus">○</td></tr>
            <tr><th>自分のプリセット</th><td>${PLANS.free.userPresets}個</td><td class="plus">${PLANS.plus.userPresets}個</td></tr>
            <tr><th>ルールの数</th><td>${PLANS.free.rulesPerPreset}件</td><td class="plus">${PLANS.plus.rulesPerPreset}件</td></tr>
            <tr><th>ランダムの出やすさ・同じものを続けない・何ラウンド目から</th><td class="none">—</td><td class="plus">○</td></tr>
            <tr><th>配信画面の部品の見た目</th><td class="none">—</td><td class="plus">○</td></tr>
            <tr><th>設定の書き出し・読み込み</th><td class="none">—</td><td class="plus">○</td></tr>
            <tr><th>配信ごとの分析</th><td>直近の配信のまとめ</td><td class="plus">30日分・グラフと内訳</td></tr>
            <tr><th>妨害の設定の変更の履歴</th><td>新しい3件</td><td class="plus">30件</td></tr>
          </tbody>
        </table>
      </div>
      <p class="hint">有料版をやめても、設定は消えません。無料版の上限を超えた分もそのまま残り、新しく足すことだけができなくなります。</p>
    </section>

    <section class="card" id="licenseKeyCard" hidden>
      <h2>ライセンスキー</h2>
      <form id="licenseForm">
        <p class="lead">購入したときにメールで届いたキーを入れると、有料版になります。</p>
        <div class="row">
          <input id="licenseKey" autocomplete="off" spellcheck="false" placeholder="購入したときにメールで届いたキー" aria-label="ライセンスキー">
          <button type="submit" class="next" id="licenseActivate">有効にする</button>
        </div>
        <p class="hint">キーは、いま保存している TikTok ID 用になります。使える PC は2台までです。</p>
      </form>
      <div class="link-card" id="licenseDeactivateRow" hidden>
        <div><p class="lead">PC を買い替えるときは、前の PC で解除すると、新しい PC で使えます（設定は消えません）。</p></div>
        <button id="licenseDeactivate">この PC で解除する</button>
      </div>
    </section>
  </div>
</main>

<dialog id="wizard">
  <div class="steps" id="wizSteps"></div>
  <div data-step="0">
    <h2>マイクラの準備</h2>
    <p class="hint">Minecraft Java版 <span class="mcv"></span> に、必要なものをまとめて入れます。マイクラを閉じた状態で押してください。</p>
    <ul class="checks setup-checks"></ul>
    <div class="ready setup-ready" hidden>準備できています。</div>
    <div class="setup-todo" hidden><button class="primary install-btn">まとめて導入する</button></div>
  </div>
  <div data-step="1" hidden>
    <h2>TikTok ID</h2>
    <p class="hint">配信するアカウントのIDを入れてください（@なし）。配信が始まると自動でつながります。</p>
    <input id="wizUsername" autocomplete="off" spellcheck="false" placeholder="例: my_tiktok_id">
  </div>
  <div data-step="2" hidden>
    <h2>準備ができました</h2>
    <ol class="hint" style="font-size: 15px; line-height: 1.9; color: var(--text);">
      <li>ランチャーで「fabric-loader-<span class="mcv"></span>」を選んで起動</li>
      <li>ワールドを開く（左下の「マイクラ」が緑になります）</li>
      <li>枠を作りたい場所に立って、「埋め立て」の画面で「埋め立てを始める」</li>
      <li>「テスト」の画面で妨害が出るか試す</li>
      <li>TikTok LIVE を始める</li>
    </ol>
    <p class="hint">どのギフトで何が起きるかは「妨害の設定」で変えられます。</p>
  </div>
  <div class="wizard-actions">
    <button id="wizBack">戻る</button>
    <button id="wizNext" class="next">次へ</button>
  </div>
</dialog>

<dialog id="giftPicker">
  <h2>ギフトを選ぶ</h2>
  <div class="row" style="margin-top: 8px;">
    <input id="giftSearch" placeholder="名前で探す（例: バラ）" autocomplete="off" spellcheck="false">
    <button id="giftPickerClose">閉じる</button>
  </div>
  <div class="gift-grid" id="giftGrid"></div>
  <p class="hint" id="giftPickerHint"></p>
</dialog>

<dialog id="ruleEditor">
  <div class="editor-body">
    <h2 id="editorTitle">ルールを追加</h2>
    <p class="hint" style="margin: 0 0 18px;">①きっかけ → ②出す妨害 → ③数と見せ方 → ④出す条件 の順に決めます。③④はそのままでも使えます。</p>
    <div class="editor-step">
      <h3><b>①</b>きっかけ（何が起きたら）</h3>
      <div class="segmented" id="editorTriggers"></div>
      <div class="trigger-value" id="editorTriggerValue"></div>
    </div>
    <div class="editor-step">
      <h3><b>②</b>出す妨害</h3>
      <div id="editorActions"></div>
      <p class="action-desc" id="editorActionDesc"></p>
    </div>
    <div class="editor-step">
      <h3><b>③</b>数と見せ方</h3>
      <div class="editor-details" id="editorDetails"></div>
    </div>
    <div class="editor-step">
      <h3><b>④</b>出す条件（埋め立て中に使う）</h3>
      <div class="editor-details" id="editorConditions"></div>
    </div>
  </div>
  <div class="editor-foot">
    <button class="ghost" id="editorDelete">このルールを削除</button>
    <p class="form-error grow" id="editorError"></p>
    <button id="editorCancel">やめる</button>
    <button class="next" id="editorOk">決定</button>
  </div>
</dialog>

<dialog id="historyDialog" style="width: min(640px, calc(100vw - 32px));">
  <h2>妨害の設定の変更の履歴</h2>
  <p class="hint" style="margin: 0 0 6px;">「保存する」を押すたびに残しています（新しい順）。読み込むと、その時の設定に入れ替わります。「保存する」を押すまでは確定しません。</p>
  <p class="hint" id="historyPlusNote" hidden></p>
  <ul class="history-list" id="historyList"></ul>
  <div class="wizard-actions" style="justify-content: flex-end;"><button id="historyClose">閉じる</button></div>
</dialog>

<dialog id="presetDialog" style="width: min(420px, calc(100vw - 32px));">
  <h2>今の設定をプリセットに保存</h2>
  <p class="hint" style="margin: 0 0 14px;">今のルールに名前を付けて取っておきます。同じ名前なら上書きします。</p>
  <input id="presetName" maxlength="20" placeholder="名前（例: 土曜の配信）" autocomplete="off" style="width: 100%;">
  <div class="wizard-actions" style="justify-content: flex-end;">
    <button id="presetCancel">やめる</button>
    <button id="presetOk" class="next">保存する</button>
  </div>
</dialog>

<dialog id="confirmDialog" style="width: min(420px, calc(100vw - 32px));">
  <h2 id="confirmTitle"></h2>
  <p class="hint" id="confirmText"></p>
  <div class="wizard-actions" style="justify-content: flex-end;">
    <button id="confirmCancel">やめる</button>
    <button id="confirmOk" class="danger"></button>
  </div>
</dialog>

<div class="toasts" id="toasts" aria-live="polite"></div>

<div id="offline">アプリとの接続が切れました。アプリを起動し直してください。</div>

<script>
  const $ = (id) => document.getElementById(id);
  const TIKTOK = {
    connecting: ['warn', '接続中…'],
    waiting: ['warn', '配信待ち'],
    connected: ['ok', '接続中'],
    retrying: ['bad', '再接続中'],
  };
  let state = null;

  // ---- 絵 ----
  ${MC_ICON_JS}
  /** TikTok 公式のギフトの絵（url か、ギフト名から探す）。わからないギフトには絵を出さない（空の要素） */
  function giftIcon(nameOrUrl, big) {
    const url = /^https:/.test(nameOrUrl ?? '') ? nameOrUrl : giftFor(nameOrUrl)?.image;
    if (!url) return document.createDocumentFragment();
    // 一覧には700近くあるので、見えるところから読む
    const img = Object.assign(document.createElement('img'), { src: url, className: 'gift-img' + (big ? ' big' : ''), alt: '', referrerPolicy: 'no-referrer', loading: 'lazy' });
    img.addEventListener('error', () => img.remove());
    return img;
  }
  let gifts = [];
  let giftsVersion = -1;
  /** 名前（日本語・英語の小文字）→ ギフト。ルールの一覧を描くたびに引くので、一覧を読んだときに作っておく */
  let giftsByName = new Map();
  /** ギフト一覧から、日本語名・英語名のどちらでも探す */
  function giftFor(name) {
    const key = String(name ?? '').trim().toLowerCase();
    if (!key) return null;
    return giftsByName.get(key) ?? null;
  }
  function indexGifts() {
    const byJa = new Map();
    const byEn = new Map();
    for (const g of gifts) {
      if (!byJa.has(g.nameJa.toLowerCase())) byJa.set(g.nameJa.toLowerCase(), g);
      if (!byEn.has(g.name.toLowerCase())) byEn.set(g.name.toLowerCase(), g);
    }
    // 日本語名を先に探す
    giftsByName = new Map([...byEn, ...byJa]);
  }
  async function loadGifts(version) {
    giftsVersion = version;
    try {
      const res = await fetch('/api/gifts');
      if (!res.ok) return;
      gifts = (await res.json()).gifts;
      indexGifts();
    } catch {
      return;
    }
    const names = [...new Set(gifts.map((g) => g.nameJa))];
    $('giftList').replaceChildren(...names.map((name) => Object.assign(document.createElement('option'), { value: name })));
    renderRows();
    renderRecent();
    $('quick').dataset.key = '';
    if (state) renderState(state);
  }

  function renderState(next) {
    state = next;
    $('appVersion').textContent = state.version ? 'v' + state.version : '';
    let tiktok;
    if (state.mock) tiktok = ['warn', 'テストモード'];
    else if (!state.tiktokUsername) tiktok = ['bad', 'ID未設定'];
    else tiktok = TIKTOK[state.tiktok.state] ?? ['', '停止中'];
    $('tiktokDot').className = 'dot ' + tiktok[0];
    $('tiktokText').textContent = tiktok[1] + (state.tiktokUsername && !state.mock ? '（@' + state.tiktokUsername + '）' : '');
    $('tiktokText').title = $('tiktokText').textContent;

    const mod = !state.mod.connected ? ['bad', 'ワールドを開いてください']
      : state.mod.players === 0 ? ['warn', 'ワールドに入っていません']
      : state.mod.players === null ? ['warn', '確認中…']
      : ['ok', '接続中'];
    $('modDot').className = 'dot ' + mod[0];
    $('modText').textContent = mod[1];

    $('toggle').textContent = state.paused ? '再開する' : '一時停止';
    $('toggle').classList.toggle('paused', state.paused);
    $('pauseDot').className = 'dot ' + (state.paused ? 'warn' : 'ok');
    $('pauseText').textContent = state.paused ? '一時停止中' : '受け付け中';
    const tile = (id, level, text) => {
      $(id).querySelector('.dot').className = 'dot ' + level;
      $(id).querySelector('b').textContent = text;
    };
    tile('tileTiktok', tiktok[0], tiktok[1]);
    const tiktokId = state.tiktokUsername && !state.mock ? '@' + state.tiktokUsername : '';
    $('tileTiktok').querySelector('small').textContent = 'TikTok' + (tiktokId ? ' ' + tiktokId : '');
    $('tileTiktok').title = tiktokId;
    tile('tileMod', mod[0], mod[1]);
    tile('tilePause', state.paused ? 'warn' : 'ok', state.paused ? '一時停止中' : '受け付け中');
    for (const key of ['received', 'sent', 'skipped', 'failed']) $(key).textContent = state.stats[key];

    if (document.activeElement !== $('username')) $('username').value = state.tiktokUsername;

    const buttonsKey = JSON.stringify(state.testButtons);
    if ($('quick').dataset.key !== buttonsKey) {
      $('quick').dataset.key = buttonsKey;
      $('quick').replaceChildren(...showSome(state.testButtons.map(({ label, body }) => {
        const b = document.createElement('button');
        if (body.kind === 'gift' && !body.diamonds) b.append(giftIcon(body.giftName));
        b.append(label);
        b.addEventListener('click', () => post('/api/test', body, { button: b, done: '「' + label + '」が届いたことにしました' }));
        return b;
      }), QUICK_SHOWN, 'quick'));
    }
    if (state.giftCatalogVersion !== giftsVersion) loadGifts(state.giftCatalogVersion);

    renderAlerts(mod, tiktok);
    renderFill(state.fill);
    renderMining();
    $('debugState').textContent = JSON.stringify({ mod: { connected: state.mod.connected, players: state.mod.players }, gameMode: state.gameMode, fill: state.fill,
      mining: state.mining, player: state.player, paused: state.paused, stats: state.stats }, null, 2);
    renderFillSettings(state.fillSettings);
    renderWorldSettings(state.worldSettings);
    if (!rulesDirty) loadRules(state.rules);
    renderPresets();
    renderLicense();
    renderStyle();
    renderRecent();
    if (!wizardChecked) {
      wizardChecked = true;
      if (!state.tiktokUsername && !storage('redstone.wizardDone')) openWizard();
    }
  }

  /** 配信の前に直すべきことを、どの画面でも上に出す */
  function renderAlerts(mod, tiktok) {
    const items = [];
    if (state.paused) items.push(['warn', '一時停止中です。ギフトが来ても妨害は出ません。', '再開する', () => $('toggle').click()]);
    if (!state.mod.connected) items.push(['bad', 'マイクラにつながっていません。ランチャーで「fabric-loader」を選んで起動し、ワールドを開いてください。', '接続と準備へ', 'tabSetup']);
    if (!state.mock && !state.tiktokUsername) items.push(['bad', 'TikTok ID が入っていません。', '接続と準備へ', 'tabSetup']);
    else if (!state.mock && state.tiktok.state === 'retrying') items.push(['bad', 'TikTok LIVE との接続が切れました。つなぎ直しています。', null, null]);
    const key = JSON.stringify(items.map((i) => i[1]));
    if ($('alertBar').dataset.key === key) return;
    $('alertBar').dataset.key = key;
    $('alertBar').hidden = items.length === 0;
    $('alertBar').replaceChildren(...items.map(([level, text, label, action]) => {
      const row = el('div', 'alert ' + level, el('span', '', text));
      if (label) {
        const b = Object.assign(el('button', '', label), { type: 'button' });
        // 文字なら、その画面へ移る（その画面を開いているときはボタンを出さない）
        if (typeof action === 'string') {
          b.dataset.to = action;
          b.addEventListener('click', () => showTab(action));
        } else {
          b.addEventListener('click', action);
        }
        row.append(b);
      }
      return row;
    }));
    placeAlerts(document.querySelector('body > main:not([hidden])')?.id);
  }
  /** 注意の帯は、開いている画面のいちばん上に置く */
  function placeAlerts(id) {
    const page = $(id)?.querySelector('.page');
    if (page) page.prepend($('alertBar'));
    $('alertBar').querySelectorAll('[data-to]').forEach((b) => (b.hidden = b.dataset.to === id));
  }

  // ログはいつも最新（いちばん下）を見せる。上に戻して読んでいる間だけ追いかけるのを止め、「最新のログへ」で戻る。
  // 見えていない画面のあいだも追いかける（隠れている間は高さが 0 なので、そこで止めてしまわないように）
  let followLog = true;
  function scrollLogToEnd() {
    $('log').scrollTop = $('log').scrollHeight;
    followLog = true;
    $('logLatest').hidden = true;
  }
  $('log').addEventListener('scroll', () => {
    const log = $('log');
    if (log.clientHeight === 0) return;
    followLog = log.scrollTop + log.clientHeight >= log.scrollHeight - 24;
    $('logLatest').hidden = followLog;
  });
  $('logLatest').addEventListener('click', scrollLogToEnd);
  // あとから行が高くなったとき（ギフトの絵の読み込み・ウィンドウの大きさが変わった・隠れていた画面を開いた）も、いちばん下に付いていく
  const keepLogAtEnd = () => {
    if (followLog) $('log').scrollTop = $('log').scrollHeight;
  };
  $('log').addEventListener('load', keepLogAtEnd, true);
  new ResizeObserver(keepLogAtEnd).observe($('log'));

  function addLog(entry) {
    if (entry.level === 'gift' || entry.text.startsWith('  →')) return;
    const log = $('log');
    const li = document.createElement('li');
    const time = document.createElement('time');
    time.textContent = new Date(entry.time).toLocaleTimeString('ja-JP', { hour12: false });
    const text = document.createElement('span');
    text.className = entry.level;
    if (entry.giftImage) text.append(giftIcon(entry.giftImage));
    if (entry.icon) text.append(mcIcon(entry.icon, 18));
    text.append(entry.text);
    li.append(time, text);
    log.append(li);
    while (log.children.length > 300) log.firstChild.remove();
    if (followLog) log.scrollTop = log.scrollHeight;
  }

  // ---- 届いたものと出した妨害（新しい順） ----
  const SKIP_SHORT = {
    no_rule: 'ルールがないので出さず', paused: '一時停止中なので出さず', cooldown: '待ち時間中なので出さず',
    challenge_paused: 'チャレンジの一時停止中なので出さず', mode_incompatible: '今のゲームモードでは出せないので出さず',
    no_active_mode: 'チャレンジが始まっていないので出さず',
  };
  function activityResult(a) {
    if (a.status === 'pending') return 'マイクラを待っています…';
    if (a.status === 'sent') return a.action;
    if (a.status === 'failed') return '出せませんでした: ' + a.reason;
    return SKIP_SHORT[a.status] ?? a.reason;
  }
  function feedItem(a, fresh) {
    const time = el('time', '', new Date(a.time).toLocaleTimeString('ja-JP', { hour12: false }));
    const who = a.who ? a.who + 'さん' : '誰か';
    const src = el('div', 'feed-src');
    if (a.kind === 'gift') src.append(giftIcon(a.giftImage || a.gift), el('b', '', who), el('span', 'muted', a.gift + ' ×' + a.count));
    else if (a.kind === 'like') src.append(el('span', 'trigger-icon', '❤'), el('span', '', 'いいね ' + a.likes + '回'));
    else if (a.kind === 'follow') src.append(el('span', 'trigger-icon', '＋'), el('b', '', who), el('span', 'muted', 'がフォロー'));
    else if (a.kind === 'share') src.append(el('span', 'trigger-icon', '↗'), el('b', '', who), el('span', 'muted', 'がシェア'));
    else src.append(el('span', 'trigger-icon', '●'), el('span', '', '配信者のボタン'));
    if (a.test) src.append(el('span', 'rule-tag', 'テスト'));
    src.title = src.textContent;
    const kind = a.status === 'sent' ? 'sent' : a.status === 'failed' ? 'failed' : 'skip';
    // 結果が出たら、同じ行を書き換える
    const res = el('div', 'feed-res ' + kind);
    if (a.status === 'sent') res.append(mcIcon(a.icon, 20));
    res.append(el('span', '', activityResult(a)));
    if (a.random) res.append(el('span', 'rule-tag', 'ランダム'));
    res.title = a.reason || '';
    const li = el('li', fresh ? 'fresh' : '', time, src, el('span', 'feed-arrow', '→'), res);
    li.dataset.id = a.id;
    return li;
  }
  function addActivity(a, fresh) {
    const old = $('feed').querySelector('li[data-id="' + a.id + '"]');
    if (old) old.replaceWith(feedItem(a, false));
    else $('feed').prepend(feedItem(a, fresh));
    while ($('feed').children.length > 100) $('feed').lastChild.remove();
    $('feedEmpty').hidden = true;
    // ほかの画面からテストしたときは、どうなったかをお知らせで出す
    if (fresh && a.test && a.status !== 'pending' && $('tabLive').hidden) {
      const what = a.kind === 'gift' ? a.gift : a.kind === 'like' ? 'いいね ' + a.likes + '回' : a.kind === 'follow' ? 'フォロー' : 'シェア';
      toast('テスト: ' + what + ' → ' + activityResult(a), a.status === 'failed' ? 'error' : 'ok');
    }
  }

  // ---- お知らせ（右下に少しだけ出る。作業を止めない） ----
  function toast(text, kind = 'ok') {
    const el = Object.assign(document.createElement('div'), { className: 'toast ' + kind, textContent: text });
    el.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    $('toasts').append(el);
    while ($('toasts').children.length > 4) $('toasts').firstChild.remove();
    setTimeout(() => {
      el.classList.add('leaving');
      setTimeout(() => el.remove(), 200);
    }, kind === 'error' ? 6000 : 2600);
  }

  /**
   * アプリに頼む。失敗したら理由をお知らせに出す。
   * button を渡すと、終わるまで押せなくする（連打で何回も出ないように）。done は成功したときのお知らせ
   */
  async function post(path, body = {}, { button, done } = {}) {
    if (button) {
      button.disabled = true;
      button.classList.add('busy');
    }
    try {
      const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) toast(data.error ?? '操作できませんでした', 'error');
      else if (done) toast(done);
      return data;
    } catch {
      toast('アプリにつながりません。アプリを起動し直してください', 'error');
    } finally {
      if (button) {
        button.disabled = false;
        button.classList.remove('busy');
      }
    }
  }

  /** 確かめる窓。@returns {Promise<boolean>} */
  function askConfirm({ title, text, ok, cancel = 'やめる' }) {
    $('confirmTitle').textContent = title;
    $('confirmText').textContent = text;
    $('confirmOk').textContent = ok;
    $('confirmCancel').textContent = cancel;
    $('confirmDialog').showModal();
    $('confirmCancel').focus();
    return new Promise((resolve) => {
      $('confirmDialog').addEventListener('close', () => resolve($('confirmDialog').returnValue === 'ok'), { once: true });
    });
  }
  $('confirmOk').addEventListener('click', () => $('confirmDialog').close('ok'));
  $('confirmCancel').addEventListener('click', () => $('confirmDialog').close('cancel'));

  $('toggle').addEventListener('click', () => post(state?.paused ? '/api/resume' : '/api/pause', {}, { button: $('toggle') }));
  $('stop').addEventListener('click', () => post('/api/stop', {}, { button: $('stop'), done: '妨害を止めて、一時停止しました' }));
  // TikTok ID は24文字まで。先頭の @ は外してから数える（貼り付けた「@id」の最後が切れないように）
  for (const id of ['username', 'wizUsername']) {
    $(id).addEventListener('input', () => {
      const value = $(id).value.replace(/^@+/, '').slice(0, 24);
      if (value !== $(id).value) $(id).value = value;
    });
  }
  $('tiktokForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const button = e.submitter ?? $('tiktokForm').querySelector('button');
    post('/api/tiktok', { username: $('username').value }, { button, done: 'TikTok ID を保存しました' });
    $('username').blur();
  });
  $('testForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('giftName').value.trim();
    if (!name) {
      toast('ギフト名を入れるか、「絵から選ぶ」で選んでください', 'error');
      $('giftName').focus();
      return;
    }
    const count = Number($('giftCount').value);
    post('/api/test', { kind: 'gift', giftName: name, count }, { button: e.submitter, done: '「' + name + ' ×' + count + '」を送ったことにしました' });
  });

  function renderSetup(setup) {
    const items = [
      [setup.launcherFound, 'マイクラのランチャー', setup.launcherFound ? setup.dir : '見つかりません。ランチャーを一度起動して閉じてください'],
      [setup.fabric.installed, 'Fabric Loader', setup.fabric.versionId ?? '未導入'],
      [setup.fabricApi.installed, 'Fabric API', setup.fabricApi.fileName ?? '未導入'],
      [setup.mod.upToDate, 'STATIC ARC MOD', setup.mod.upToDate ? setup.mod.fileName : setup.mod.installed ? '古いバージョン（' + setup.mod.fileName + '）' : '未導入'],
    ];
    const make = () => items.map(([ok, name, detail]) => {
      const li = document.createElement('li');
      li.className = ok ? 'yes' : 'no';
      const mark = document.createElement('span');
      mark.className = 'mark';
      mark.textContent = ok ? '✓' : '✗';
      const text = document.createElement('div');
      text.textContent = name;
      const small = document.createElement('small');
      small.textContent = detail;
      text.append(small);
      li.append(mark, text);
      return li;
    });
    document.querySelectorAll('.setup-checks').forEach((el) => el.replaceChildren(...make()));
    $('mcVersion').textContent = setup.minecraftVersion;
    document.querySelectorAll('.mcv').forEach((el) => (el.textContent = setup.minecraftVersion));
    document.querySelectorAll('.setup-ready').forEach((el) => (el.hidden = !setup.ready));
    document.querySelectorAll('.setup-todo').forEach((el) => (el.hidden = setup.ready));
    // 全部そろっていれば中身はしまう。足りないときは開いて見せる（そろったかどうかが変わったときだけ）
    if (setupReady !== setup.ready) $('setupChecks').open = !setup.ready;
    setupReady = setup.ready;
  }
  let setupReady = null;

  async function loadSetup() {
    try {
      const res = await fetch('/api/setup');
      if (res.ok) renderSetup((await res.json()).setup);
    } catch {}
  }

  document.querySelectorAll('.install-btn').forEach((button) => button.addEventListener('click', async () => {
    const all = document.querySelectorAll('.install-btn');
    all.forEach((b) => { b.disabled = true; b.textContent = '導入中…'; });
    const data = await post('/api/setup/install');
    all.forEach((b) => { b.disabled = false; b.textContent = 'まとめて導入する'; });
    if (data?.setup) renderSetup(data.setup);
    else loadSetup();
  }));
  window.addEventListener('focus', loadSetup);
  loadSetup();

  // ---- 配信画面の部品（URL・おすすめの大きさ・試しの表示） ----
  const OVERLAY_WIDGETS = ${JSON.stringify(OVERLAY_WIDGETS)};
  // 右の大きな試し表示（選んだ部品）
  function showPreview(id) {
    const w = OVERLAY_WIDGETS.find((x) => x.id === id) ?? OVERLAY_WIDGETS[0];
    storage('redstone.preview', w.id);
    $('previewTitle').textContent = w.name;
    $('previewSize').textContent = '幅' + w.size[0] + '×高さ' + w.size[1];
    $('previewBox').style.setProperty('--ratio', String(w.size[0] / w.size[1]));
    const src = '/overlay/' + w.id + '#demo';
    if ($('previewFrame').getAttribute('src') !== src) $('previewFrame').setAttribute('src', src);
    document.querySelectorAll('#widgets .widget').forEach((card) => {
      const on = card.dataset.id === w.id;
      card.classList.toggle('selected', on);
      card.querySelector('.showing').hidden = !on;
    });
  }
  $('widgets').replaceChildren(...OVERLAY_WIDGETS.map((w) => {
    // 末尾の .html がないと LIVE Studio のリンク欄に「正しいURLを入力してください」と言われる
    const url = location.origin + '/overlay/' + w.id + '.html';
    const copy = Object.assign(el('button', '', 'コピー'), { type: 'button' });
    copy.addEventListener('click', async () => {
      await navigator.clipboard.writeText(url);
      copy.textContent = 'コピーしました';
      setTimeout(() => (copy.textContent = 'コピー'), 1500);
    });
    const head = el('div', 'card-head', el('h2', '', w.name), el('span', 'showing', '試し表示中'));
    if (w.id === 'ranking') {
      const reset = Object.assign(el('button', 'ghost', 'リセット'), { type: 'button', title: 'この配信のギフトの合計を0に戻します' });
      reset.addEventListener('click', async () => {
        const ok = await askConfirm({ title: 'ランキングをリセットしますか？', text: 'この配信のギフトの合計が0に戻ります。', ok: 'リセットする' });
        if (ok) post('/api/ranking/reset', {}, { button: reset, done: 'ランキングをリセットしました' });
      });
      head.append(reset);
    }
    const card = el('section', 'card widget', head, el('p', 'lead', w.description),
      el('div', 'url', el('code', '', url), copy), el('span', 'size', 'おすすめの大きさ: 幅' + w.size[0] + '×高さ' + w.size[1]));
    card.dataset.id = w.id;
    card.tabIndex = 0;
    card.addEventListener('click', (e) => {
      if (!e.target.closest('button')) showPreview(w.id);
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target === card) showPreview(w.id);
    });
    return card;
  }));

  function storage(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, value);
    } catch {}
    return null;
  }

  // ---- タブ ----
  function showTab(id) {
    document.querySelectorAll('nav [data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === id));
    document.querySelectorAll('body > main').forEach((page) => (page.hidden = page.id !== id));
    placeAlerts(id);
    // 分析は開いたときに読み直す
    if (id === 'tabStats') loadStreams();
    // 配信の画面に戻ったら、ログは最新を見せる
    if (id === 'tabLive' && followLog) $('log').scrollTop = $('log').scrollHeight;
    storage('redstone.tab', id);
  }
  document.querySelectorAll('nav [data-tab]').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));
  document.querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.goto)));
  showPreview(storage('redstone.preview'));
  // 前に開いていた画面を開く
  const lastTab = storage('redstone.tab');
  if (lastTab && $(lastTab)?.tagName === 'MAIN') showTab(lastTab);
  else placeAlerts('tabLive');

  // ---- 妨害の設定 ----
  /** 出す妨害。グループごとに絵つきで並べる。unit は数の単位（なければ数を決めない）、def は選んだときの数 */
  const ACTION_GROUPS = [
    ['敵・爆発', [
      ['tnt', 'TNT', '個', 1, '枠の中に TNT が落ちて、埋めたブロックを壊す（採掘チャレンジでは地形を壊さない）'],
      ['mob:zombie', 'ゾンビ', '体', 1], ['mob:skeleton', 'スケルトン', '体', 1], ['mob:creeper', 'クリーパー', '体', 1],
      ['mob:spider', 'クモ', '体', 1], ['mob:witch', 'ウィッチ', '体', 1], ['mob:silverfish', 'シルバーフィッシュ', '体', 1], ['mob:pig', 'ブタ', '体', 1],
      ['lightning', '雷', '回', 1, '枠の中に雷が落ちて、まわりのブロックを少し壊す（火事にはならない）'],
    ]],
    ['動きをじゃまする', [
      ['jail', '逮捕', '秒', 10, '枠の横の牢屋に入れられて、決めた秒数のあいだ埋められない。終わると枠に戻る'],
      ['freeze', '操作禁止', '秒', 5, 'その場から動けず、ブロックも置けない'],
      ['levitate', '浮遊', '秒', 3, '体がふわふわ浮き上がる'],
      ['night', '夜にする', '秒', 30, '決めた秒数のあいだ夜になる。終わると元の時刻に戻る'],
    ]],
    ['埋め立てをじゃまする', [
      ['fill_expand', '枠を広げる', 'マス', 1, '枠が広がって、埋める所が増える'],
      ['fill_raise', '枠を高くする', '段', 1, '枠が高くなって、埋める段が増える（次のラウンドで元に戻る）'],
      ['fill_clear', '全消し', '', 0, '埋めたブロックが全部消える'],
    ]],
    ['お助け', [
      ['fill_help', 'お助けブロック', '個', 10, '空いている所が下から埋まる'],
      ['fill_layer', '一段埋め', '段', 1, 'いちばん下の空いている段が、まるごと埋まる'],
      ['fill_shrink', '枠を縮める', 'マス', 1, '枠が小さくなって、埋める所が減る'],
      ['message', 'メッセージだけ', '', 0, '配信画面とマイクラに文を出すだけ（感謝などに）'],
    ]],
    ['採掘チャレンジのお助け', [
      ['mining_bonus_drop', '収集支援', '個', 3, '対象アイテムがプレイヤーの近くに落ちる。拾うと数える（1回の挑戦で目標数の4分の1まで。採掘チャレンジ中だけ）'],
    ]],
  ];
  const ACTION_INFO = Object.fromEntries(ACTION_GROUPS.flatMap(([, list]) => list.map(([key, name, unit, def, desc]) => [key, { name, unit, def, desc }])));
  const MAX_COUNT = ${JSON.stringify(MAX_COUNT_BY_TYPE)};
  /** ランダムの候補の数と出やすさの上限（rules.js と同じ） */
  const MAX_CHOICES = ${MAX_CHOICES};
  const MAX_WEIGHT = ${MAX_WEIGHT};
  const PLUS_NAME = ${JSON.stringify(PLANS.plus.name)};
  const TRIGGERS = [['gift', 'ギフト'], ['minDiamonds', 'コイン数で'], ['likes', 'いいね'], ['follow', 'フォロー'], ['share', 'シェア']];
  /** 一覧のグループ（きっかけの種類ごと） */
  const RULE_GROUPS = [
    ['gift', 'ギフト', 'このギフトが届いたら', ['gift', 'giftId']],
    ['minDiamonds', 'コイン数で', '名前で決めていないギフトは、コイン数で決めます（大きい数から当てはめます）', ['minDiamonds']],
    ['likes', 'いいね', 'いいねが決まった回数たまるたびに', ['likes']],
    ['follow', 'フォロー・シェア', '', ['follow', 'share']],
  ];

  let rows = [];
  let rulesDirty = false;
  let savedRulesKey = '';

  const actionKey = (row) => (row.action === 'mob' ? 'mob:' + row.mob : row.action);
  const hasCount = (action) => !!ACTION_INFO[action === 'mob' ? 'mob:zombie' : action]?.unit;
  const WHEN_OPTIONS = [['', 'いつでも'], ['filling', '埋めている途中だけ'], ['countdown', 'カウントダウン中だけ']];
  const choiceKey = (c) => (c.action === 'mob' ? 'mob:' + (c.mob ?? 'zombie') : c.action);
  const iconOf = (key) => (key.startsWith('mob:') ? key.slice(4) : key);

  function toRow(rule) {
    const trigger = rule.event ?? (rule.gift !== undefined ? 'gift' : rule.likes !== undefined ? 'likes' : rule.minDiamonds !== undefined ? 'minDiamonds' : 'giftId');
    const value = rule.gift ?? rule.likes ?? rule.minDiamonds ?? rule.giftId ?? '';
    // ランダムのルールは、1つ目の候補を「1つ決める」に戻したときの妨害にしておく
    const random = rule.action === 'random';
    const single = random ? rule.choices[0] : rule;
    return { trigger, value: String(value), action: single.action, mob: single.mob ?? 'zombie',
      label: rule.label ?? '', count: single.count ?? 1, cooldownSec: rule.cooldownSec ?? 0, maxCount: rule.maxCount,
      random, choices: (rule.choices ?? []).map((c) => ({ key: choiceKey(c), count: c.count ?? 1, weight: c.weight ?? 1 })),
      noRepeat: rule.noRepeat ?? false, when: rule.when ?? '', minRound: rule.minRound ? String(rule.minRound) : '' };
  }

  function toRule(row) {
    const rule = {};
    if (row.trigger === 'follow' || row.trigger === 'share') rule.event = row.trigger;
    else if (row.trigger === 'minDiamonds') rule.minDiamonds = Number(row.value);
    else if (row.trigger === 'likes') rule.likes = Number(row.value);
    else if (row.trigger === 'giftId') rule.giftId = row.value.trim();
    else rule.gift = row.value;
    if (row.random) {
      rule.action = 'random';
      rule.choices = row.choices.map((c) => {
        const [action, mob] = c.key.split(':');
        const choice = { action };
        if (mob) choice.mob = mob;
        if (hasCount(action)) choice.count = Number(c.count);
        if (Number(c.weight) !== 1) choice.weight = Number(c.weight);
        return choice;
      });
      if (row.noRepeat) rule.noRepeat = true;
    } else {
      rule.action = row.action;
      if (row.action === 'mob') rule.mob = row.mob;
      if (hasCount(row.action)) rule.count = Number(row.count);
    }
    if (row.when) rule.when = row.when;
    if (row.minRound) rule.minRound = Number(row.minRound);
    if (row.label) rule.label = row.label;
    if (Number(row.cooldownSec) > 0) rule.cooldownSec = Number(row.cooldownSec);
    if (row.maxCount !== undefined) rule.maxCount = row.maxCount;
    return rule;
  }

  /** 保存する順番: きっかけの種類ごと、コイン数は大きい順（当てはまり方は順番に関係ないが、設定ファイルを読みやすくする） */
  function sortedRules(list) {
    const groupOf = (row) => RULE_GROUPS.findIndex(([, , , triggers]) => triggers.includes(row.trigger));
    return list.map((row, i) => ({ row, i }))
      .sort((a, b) => groupOf(a.row) - groupOf(b.row)
        || (a.row.trigger === 'minDiamonds' ? Number(b.row.value) - Number(a.row.value) : 0)
        || (a.row.trigger === 'likes' ? Number(a.row.value) - Number(b.row.value) : 0)
        || a.i - b.i)
      .map(({ row }) => toRule(row));
  }
  const rulesKey = (rules) => JSON.stringify(sortedRules(rules.map(toRow)));

  function loadRules(rules) {
    const key = JSON.stringify(rules);
    if (key === savedRulesKey && rows.length) return;
    savedRulesKey = key;
    rows = rules.map(toRow);
    setDirty(false);
    renderRows();
  }

  function setDirty(value) {
    rulesDirty = value;
    $('dirty').hidden = !value;
    // ほかの画面にいても気づけるよう、左のメニューにも印を出す
    $('rulesBadge').hidden = !value;
    $('saveRules').disabled = !value;
    $('revertRules').disabled = !value;
    // 試すは保存したルールで動くので、変更があるあいだは押せなくする
    document.querySelectorAll('.rule .try').forEach((b) => {
      if (b.title !== 'このきっかけは試せません') b.disabled = value;
      if (b.title !== 'このきっかけは試せません') b.title = value ? '「保存する」を押すと試せます' : 'このきっかけが届いたことにして、マイクラに出します';
    });
  }

  function input(value, onInput, { list, ...attrs } = {}) {
    const el = Object.assign(document.createElement('input'), attrs);
    if (list) el.setAttribute('list', list); // list は代入できない
    el.value = value;
    el.addEventListener('input', () => onInput(el.value));
    return el;
  }

  function el(tag, className, ...children) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.append(...children);
    return node;
  }

  /** ギフトを選ぶボタン（絵・名前・コイン数）。押すとギフトの一覧が開く */
  function giftPickButton(row, onPicked) {
    const b = el('button', 'gift-pick' + (row.value.trim() ? '' : ' unset'));
    b.type = 'button';
    const gift = giftFor(row.value);
    if (!row.value.trim()) {
      b.append(el('span', 'gift-pick-name', 'ギフトを選ぶ'));
    } else {
      b.append(giftIcon(row.value), el('span', 'gift-pick-name', gift?.nameJa ?? row.value));
      if (gift) b.append(el('small', '', '🪙' + gift.diamonds));
      else b.classList.add('unknown');
    }
    b.append(el('span', 'caret', '▾'));
    b.title = !row.value.trim() ? 'ギフトを一覧から選ぶ'
      : gift ? (gift.nameJa ?? row.value) + '（🪙' + gift.diamonds + '）。押すと選び直せます'
      : '「' + row.value + '」はギフトの一覧にない名前です。押して選び直してください';
    b.addEventListener('click', () => openGiftPicker(onPicked));
    return b;
  }

  /** 数を入れる欄に、前後の文字（「×」「個」など）を付ける */
  function numberField(value, onInput, { before, after, min, max, width = 64, label }) {
    const field = input(value, onInput, { type: 'number', min, max, className: 'num' });
    field.style.width = width + 'px';
    if (label) field.setAttribute('aria-label', label);
    return el('span', 'num-field', ...(before ? [el('span', 'affix', before)] : []), field, ...(after ? [el('span', 'affix', after)] : []));
  }

  /** 一覧の左側: きっかけ（ギフトの絵・名前、コイン数など） */
  function triggerSummary(row) {
    const box = el('div', 'rule-when');
    const badge = (text) => el('span', 'trigger-icon', text);
    if (row.trigger === 'gift') {
      const gift = giftFor(row.value);
      const icon = giftIcon(row.value);
      box.append(icon.nodeType === 1 ? icon : badge('🎁'), el('span', gift ? '' : 'unknown', gift?.nameJa ?? row.value));
      if (gift) {
        box.append(el('small', 'coin', '🪙' + gift.diamonds));
        box.title = gift.nameJa + '（' + gift.diamonds + 'コイン）';
      } else {
        box.title = '「' + row.value + '」はギフトの一覧にない名前です';
      }
    } else if (row.trigger === 'giftId') {
      box.append(badge('🎁'), el('span', '', 'ギフトID ' + row.value));
    } else if (row.trigger === 'minDiamonds') {
      box.append(badge('🪙'), el('span', '', row.value + ' コイン以上'));
    } else if (row.trigger === 'likes') {
      box.append(badge('❤'), el('span', '', 'いいね ' + row.value + '回ごと'));
    } else {
      box.append(badge(row.trigger === 'follow' ? '＋' : '↗'), el('span', '', row.trigger === 'follow' ? 'フォロー' : 'シェア'));
    }
    return box;
  }

  /** 一覧の右側: 出す妨害（絵・名前・数）。ランダムは候補の名前を並べる */
  function actionSummary(row) {
    if (row.random) {
      const names = row.choices.map((c) => ACTION_INFO[c.key]?.name ?? c.key).join('・');
      return el('div', 'rule-then', mcIcon(iconOf(row.choices[0].key), 22), el('span', '', 'ランダム', el('small', '', ' ' + names)));
    }
    const info = ACTION_INFO[actionKey(row)];
    const text = el('span', '', info?.name ?? row.action);
    if (info?.unit) text.append(el('small', '', (info.unit === '秒' ? ' ' : ' ×') + row.count + info.unit));
    return el('div', 'rule-then', mcIcon(row.action === 'mob' ? row.mob : row.action, 22), text);
  }

  /** 選んでいるゲームモードで出ない妨害なら、その注意（ランダムは全部の候補が出ないときだけ） */
  const FILL_ONLY = ${JSON.stringify(FILL_ONLY_ACTIONS)};
  const MINING_ONLY = ${JSON.stringify(MINING_ONLY_ACTIONS)};
  function ruleModeNote(row) {
    const mining = state?.gameMode === 'mining_challenge';
    const types = row.random ? row.choices.map((c) => c.key.split(':')[0]) : [row.action];
    if (mining && types.every((t) => FILL_ONLY.includes(t))) return '採掘チャレンジでは出ません';
    if (!mining && types.every((t) => MINING_ONLY.includes(t))) return '埋め立てでは出ません';
    return '';
  }

  function renderRows() {
    $('ruleCount').textContent = rows.length ? rows.length + '件' : '';
    renderPresets();
    $('ruleGroups').replaceChildren(...RULE_GROUPS.map(([trigger, title, lead, triggers]) => {
      const add = Object.assign(el('button', '', '＋ 追加'), { type: 'button', title: title + 'のルールを追加' });
      add.addEventListener('click', () => openEditor(null, { trigger }));
      const head = el('div', 'rule-group-head', el('h3', '', title), el('p', '', lead), add);
      let list = rows.map((row, i) => ({ row, i })).filter(({ row }) => triggers.includes(row.trigger));
      if (trigger === 'minDiamonds') list = list.sort((a, b) => Number(b.row.value) - Number(a.row.value));
      if (trigger === 'likes') list = list.sort((a, b) => Number(a.row.value) - Number(b.row.value));
      const body = list.length === 0
        ? el('div', 'rule-none', 'まだありません')
        : el('div', 'rule-rows', ...list.map(({ row, i }) => ruleRow(row, i)));
      return el('div', 'rule-group', head, body);
    }));
  }

  function ruleRow(row, i) {
    const line = el('div', 'rule');
    line.tabIndex = 0;
    line.setAttribute('role', 'button');
    line.title = '押すと変えられます';
    const arrow = el('span', 'rule-arrow');
    arrow.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 8h11M9 4l4 4-4 4"/></svg>';
    const label = el('span', 'rule-label' + (row.label ? '' : ' empty'), row.label ? '「' + row.label + '」' : '');
    const tags = [
      row.minRound ? row.minRound + 'ラウンド目から' : '',
      row.when === 'filling' ? '埋め立て中' : row.when === 'countdown' ? 'カウントダウン中' : '',
      Number(row.cooldownSec) > 0 ? '待ち ' + row.cooldownSec + '秒' : '',
    ].filter(Boolean);
    const note = ruleModeNote(row);
    const tag = note ? el('span', 'rule-tag warn', [...tags, note].join('・')) : tags.length ? el('span', 'rule-tag', tags.join('・')) : el('span');
    // 試す: このルールのきっかけが届いたことにする（保存したルールで動くので、保存していない変更があるときは押せない）
    const body = testBodyFor(row);
    const tryIt = Object.assign(el('button', 'try', '▶ 試す'), { type: 'button' });
    tryIt.disabled = !body || rulesDirty;
    tryIt.title = !body ? 'このきっかけは試せません' : rulesDirty ? '「保存する」を押すと試せます' : 'このきっかけが届いたことにして、マイクラに出します';
    tryIt.addEventListener('click', (e) => {
      e.stopPropagation();
      post('/api/test', body, { button: tryIt });
    });
    tryIt.addEventListener('keydown', (e) => e.stopPropagation());
    const del = Object.assign(el('button', 'icon-only del', '✕'), { type: 'button', title: 'このルールを削除' });
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      removeRow(i);
    });
    line.append(triggerSummary(row), arrow, actionSummary(row), label, tag, tryIt, del);
    line.addEventListener('click', () => openEditor(i));
    line.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openEditor(i);
      }
    });
    return line;
  }

  /** ルールのきっかけを、テスト送信の中身にする（ギフトIDのルールは試せない） */
  function testBodyFor(row) {
    if (row.trigger === 'gift' && row.value) return { kind: 'gift', giftName: row.value, count: 1 };
    if (row.trigger === 'minDiamonds') return { kind: 'gift', giftName: row.value + 'コインのギフト', diamonds: Number(row.value), count: 1 };
    if (row.trigger === 'likes') return { kind: 'like', count: Number(row.value) };
    if (row.trigger === 'follow' || row.trigger === 'share') return { kind: row.trigger };
    return null;
  }

  function removeRow(i) {
    rows.splice(i, 1);
    setDirty(true);
    renderRows();
    toast('ルールを削除しました。「保存前に戻す」で取り消せます');
  }

  // ---- ルールを作る・変える窓 ----
  let editing = null; // { index, row }
  function openEditor(index, defaults = {}) {
    const row = index === null ? { ...toRow({ gift: '', action: 'tnt', count: 1 }), ...defaults } : { ...rows[index] };
    if (index === null && row.trigger !== 'gift') row.value = row.trigger === 'likes' ? '100' : row.trigger === 'minDiamonds' ? '100' : '';
    editing = { index, row };
    $('editorTitle').textContent = index === null ? 'ルールを追加' : 'ルールを変える';
    $('editorDelete').hidden = index === null;
    $('editorError').textContent = '';
    renderEditor();
    $('ruleEditor').showModal();
    $('ruleEditor').querySelector('.editor-body').scrollTop = 0;
  }

  function renderEditor() {
    const row = editing.row;
    // ① きっかけ
    const triggers = row.trigger === 'giftId' ? [...TRIGGERS, ['giftId', 'ギフトID']] : TRIGGERS;
    $('editorTriggers').replaceChildren(...triggers.map(([value, text]) => {
      const b = Object.assign(el('button', row.trigger === value ? 'selected' : '', text), { type: 'button' });
      b.addEventListener('click', () => {
        if (row.trigger === value) return;
        row.trigger = value;
        row.value = value === 'likes' ? '100' : value === 'minDiamonds' ? '100' : '';
        renderEditor();
      });
      return b;
    }));
    const value = $('editorTriggerValue');
    if (row.trigger === 'gift') {
      value.replaceChildren(giftPickButton(row, (name) => { row.value = name; renderEditor(); }), 'が届いたら');
    } else if (row.trigger === 'minDiamonds') {
      value.replaceChildren(numberField(row.value, (v) => (row.value = v), { min: 1, before: '🪙', after: 'コイン以上のギフトが届いたら', width: 80, label: 'コイン数' }));
    } else if (row.trigger === 'likes') {
      value.replaceChildren(numberField(row.value, (v) => (row.value = v), { min: 1, before: 'いいねが', after: '回たまるたびに', width: 80, label: 'いいねの回数' }));
    } else if (row.trigger === 'giftId') {
      value.replaceChildren(input(row.value, (v) => (row.value = v), { placeholder: 'ギフトID' }));
    } else {
      value.replaceChildren(row.trigger === 'follow' ? 'フォローされたら' : 'シェアされたら');
    }

    // ② 出す妨害（1つ決める / ランダム）
    const selected = actionKey(row);
    const mode = el('div', 'segmented');
    for (const [random, text] of [[false, '1つ決める'], [true, 'ランダム（いくつかから1つ）']]) {
      const b = Object.assign(el('button', row.random === random ? 'selected' : '', text), { type: 'button' });
      b.addEventListener('click', () => {
        if (row.random === random) return;
        row.random = random;
        // ランダムにしたら、今の妨害を1つ目の候補にする。戻したら、1つ目の候補を出す妨害にする
        if (random && row.choices.length === 0 && row.action !== 'message') row.choices = [{ key: selected, count: row.count, weight: 1 }];
        if (!random && row.choices.length) {
          const [action, mob] = row.choices[0].key.split(':');
          Object.assign(row, { action, count: row.choices[0].count }, mob ? { mob } : {});
        }
        $('editorError').textContent = '';
        renderEditor();
      });
      mode.append(b);
    }
    const chosen = (key) => (row.random ? row.choices.some((c) => c.key === key) : key === selected);
    $('editorActions').replaceChildren(mode, ...ACTION_GROUPS.map(([title, list]) => el('div', 'action-group', el('span', '', title),
      el('div', 'action-tiles', ...list.map(([key, name, , def]) => {
        const b = Object.assign(el('button', chosen(key) ? 'selected' : '', mcIcon(iconOf(key), 20), name), { type: 'button' });
        // メッセージだけは出す文が要るので、ランダムの候補にはしない
        if (row.random && key === 'message') {
          b.disabled = true;
          b.title = 'メッセージだけは、ランダムの候補にできません';
        }
        b.addEventListener('click', () => {
          if (row.random) {
            if (chosen(key)) {
              row.choices = row.choices.filter((c) => c.key !== key);
            } else if (row.choices.length >= MAX_CHOICES) {
              $('editorError').textContent = 'ランダムの候補は' + MAX_CHOICES + '個までです';
              return;
            } else {
              row.choices.push({ key, count: def || 1, weight: 1 });
            }
            $('editorError').textContent = '';
            renderEditor();
            return;
          }
          const [action, mob] = key.split(':');
          if (key !== selected && def) row.count = def;
          row.action = action;
          if (mob) row.mob = mob;
          renderEditor();
        });
        return b;
      })))));
    const info = row.random ? null : ACTION_INFO[selected];
    $('editorActionDesc').textContent = row.random
      ? '選んだ妨害（2〜' + MAX_CHOICES + '個）の中から、毎回1つを抽選して出します。押すと候補に入れる・外すができます'
      : info?.desc ?? '枠の中の地上に出る（埋め立て中でなければ、プレイヤーのまわり）';

    // ③ 細かい設定
    const details = [];
    // 出やすさ・同じものを続けない・何ラウンド目からは有料版の機能（今ある設定は消さずに見せる）
    const advanced = !!state.plan?.advancedRules;
    const plusNote = () => (advanced ? [] : [el('span', 'plus-note', '（' + PLUS_NAME + ' の機能）', ...plusLink())]);
    if (row.random) {
      const total = row.choices.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
      const list = el('div', 'choices', ...row.choices.map((c) => {
        const [action] = c.key.split(':');
        const cInfo = ACTION_INFO[c.key];
        const line = el('div', 'choice', el('span', 'name', mcIcon(iconOf(c.key), 20), cInfo?.name ?? c.key));
        if (cInfo?.unit) {
          line.append(numberField(c.count, (v) => (c.count = v), { min: 1, max: MAX_COUNT[action], before: cInfo.unit === '秒' ? '' : '×', after: cInfo.unit, width: 64, label: '数' }));
        } else {
          line.append(el('span'));
        }
        const odds = el('span', 'odds', '');
        const showOdds = () => {
          const sum = row.choices.reduce((acc, x) => acc + (Number(x.weight) || 0), 0);
          for (const [i, node] of [...list.querySelectorAll('.odds')].entries()) {
            node.textContent = sum > 0 ? '約' + Math.round((Number(row.choices[i].weight) || 0) / sum * 100) + '%' : '';
          }
        };
        const weight = numberField(c.weight, (v) => {
          c.weight = v;
          showOdds();
        }, { min: 1, max: MAX_WEIGHT, before: '出やすさ', width: 52, label: '出やすさ（1〜' + MAX_WEIGHT + '）' });
        weight.querySelector('input').disabled = !advanced;
        odds.textContent = total > 0 ? '約' + Math.round((Number(c.weight) || 0) / total * 100) + '%' : '';
        line.append(weight, odds);
        return line;
      }));
      details.push(el('div', 'wide', el('label', '', '候補（数は1回あたり。出やすさは大きいほど出やすい）', ...plusNote()),
        row.choices.length ? list : el('p', 'hint', '上の妨害を押して、候補を2つ以上選んでください')));
      const repeat = Object.assign(document.createElement('input'), { type: 'checkbox', checked: row.noRepeat, disabled: !advanced });
      repeat.addEventListener('change', () => (row.noRepeat = repeat.checked));
      details.push(el('label', 'wide check-line', repeat, '同じ妨害を2回続けて出さない', ...plusNote()));
    } else if (info?.unit) {
      const max = MAX_COUNT[row.action];
      details.push(el('label', '', '数（1回あたり・最大 ' + max + info.unit + '）',
        numberField(row.count, (v) => (row.count = v), { min: 1, max, before: info.unit === '秒' ? '' : '×', after: info.unit, width: 70, label: '数' })));
    }
    const needsLabel = row.action === 'message';
    const label = input(row.label, (v) => (row.label = v), { placeholder: needsLabel ? '出す文（例: ありがとう！）' : '空なら妨害の名前', maxLength: 100 });
    details.push(el('label', '', needsLabel ? '配信画面に出す文（必須）' : '配信画面に出す文', label));
    details.push(el('label', '', '待ち時間（続けて出さない）',
      numberField(row.cooldownSec, (v) => (row.cooldownSec = v), { min: 0, after: '秒', width: 60, label: '待ち時間（秒）' })));
    $('editorDetails').replaceChildren(...details);
    const conditions = [];
    // いつ出すか（埋め立ての状況で切り替える）
    const when = document.createElement('select');
    for (const [value, text] of WHEN_OPTIONS) when.append(Object.assign(document.createElement('option'), { value, textContent: text, selected: row.when === value }));
    when.addEventListener('change', () => (row.when = when.value));
    conditions.push(el('label', '', 'いつ出すか', when));
    const round = numberField(row.minRound, (v) => (row.minRound = v), { min: 1, max: 99, after: 'ラウンド目から', width: 60, label: '何ラウンド目から' });
    Object.assign(round.querySelector('input'), { placeholder: '最初', disabled: !advanced });
    conditions.push(el('label', '', '何ラウンド目から（空なら最初から）', round, ...plusNote()));
    const more = el('details', 'more-info wide', el('summary', '', '条件を決めたルールの使われ方'),
      el('p', 'hint', '条件を決めたルールは、それに合うときだけ使われ、同じきっかけの「いつでも」のルールより先になります（例: バラは普段ゾンビ、カウントダウン中だけ TNT）。埋め立てをしていないときは使われません。'));
    conditions.push(more);
    $('editorConditions').replaceChildren(...conditions);
  }

  /** 決定する前に確かめる。@returns 問題があれば理由 */
  function editorProblem(row) {
    if (row.trigger === 'gift' && !row.value.trim()) return 'ギフトを選んでください';
    if (row.trigger === 'giftId' && !row.value.trim()) return 'ギフトID を入れてください';
    if (row.trigger === 'minDiamonds' && !(Number(row.value) >= 1)) return 'コイン数は1以上にしてください';
    if (row.trigger === 'likes' && !(Number.isInteger(Number(row.value)) && Number(row.value) >= 1)) return 'いいねの回数は1以上の整数にしてください';
    if (row.random) {
      if (row.choices.length < 2) return 'ランダムにするときは、妨害を2つ以上選んでください';
      for (const c of row.choices) {
        const [action] = c.key.split(':');
        if (hasCount(action)) {
          const count = Number(c.count);
          if (!(Number.isInteger(count) && count >= 1)) return '数は1以上の整数にしてください';
          if (count > MAX_COUNT[action]) c.count = MAX_COUNT[action];
        }
        const weight = Number(c.weight);
        if (!(Number.isInteger(weight) && weight >= 1 && weight <= MAX_WEIGHT)) return '出やすさは1〜' + MAX_WEIGHT + 'の整数にしてください';
      }
    } else if (hasCount(row.action)) {
      const count = Number(row.count);
      if (!(Number.isInteger(count) && count >= 1)) return '数は1以上の整数にしてください';
      if (count > MAX_COUNT[row.action]) row.count = MAX_COUNT[row.action];
    }
    const minRound = Number(row.minRound);
    if (row.minRound !== '' && !(Number.isInteger(minRound) && minRound >= 1 && minRound <= 99)) {
      return '何ラウンド目からは、1〜99の整数にしてください（空なら最初から）';
    }
    if (!row.random && row.action === 'message' && !row.label.trim()) return '出す文を入れてください';
    if (!(Number(row.cooldownSec) >= 0)) return '待ち時間は0以上にしてください';
    return '';
  }

  $('editorOk').addEventListener('click', () => {
    const { index, row } = editing;
    const problem = editorProblem(row);
    if (problem) {
      $('editorError').textContent = problem;
      return;
    }
    if (index === null) rows.push(row);
    else rows[index] = row;
    setDirty(true);
    renderRows();
    $('ruleEditor').close();
    toast(index === null ? 'ルールを追加しました。「保存する」で使われます' : 'ルールを変えました。「保存する」で使われます');
  });
  $('editorCancel').addEventListener('click', () => $('ruleEditor').close());
  $('editorDelete').addEventListener('click', () => {
    $('ruleEditor').close();
    removeRow(editing.index);
  });

  $('addRule').addEventListener('click', () => openEditor(null));

  // ---- 分析 ----
  let selectedStream = '';
  const fmtNum = (n) => Number(n ?? 0).toLocaleString('ja-JP');
  const fmtDate = (t) => new Date(t).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' });
  const fmtClock = (t) => new Date(t).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  function fmtDuration(ms) {
    const min = Math.max(1, Math.round(ms / 60000));
    return min < 60 ? min + '分' : Math.floor(min / 60) + '時間' + (min % 60 ? (min % 60) + '分' : '');
  }

  /** 失敗の割合の色（2割以上は赤、少しでもあれば黄） */
  function failClass(rate) {
    return rate >= 20 ? 'bad' : rate > 0 ? 'warn' : '';
  }
  // グラフは1つずつ切り替えて見る
  $('chartSwitch').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-chart]');
    if (!b) return;
    $('chartSwitch').querySelectorAll('button').forEach((x) => x.classList.toggle('selected', x === b));
    for (const id of ['chartCoins', 'chartActions', 'chartFill']) $(id).hidden = id !== b.dataset.chart;
  });

  async function loadStreams() {
    let data;
    try {
      const res = await fetch('/api/analytics');
      data = await res.json();
    } catch {
      return;
    }
    const { streams, full, total } = data;
    $('streamEmpty').hidden = streams.length > 0;
    $('streamList').hidden = streams.length === 0;
    $('statsPlusNote').hidden = full;
    $('statsPlusNote').replaceChildren('30日分の一覧と、くわしい中身（流れのグラフ・内訳）は ' + PLUS_NAME + ' の機能です。無料版では直近の配信のまとめだけ見られます'
      + (total > 1 ? '（記録は続けているので、ほかに ' + (total - 1) + '回分あります）' : ''), ...plusLink());
    const head = el('tr', '', ...['日時', '長さ', 'コイン', '失敗'].map((t) => el('th', '', t)));
    const rows = streams.map((st) => {
      const tr = el('tr', st.id === selectedStream ? 'selected' : '',
        el('td', '', fmtDate(st.startedAt)), el('td', '', fmtDuration(st.endedAt - st.startedAt)),
        el('td', '', '🪙' + fmtNum(st.coins)), el('td', failClass(st.failureRate), st.failureRate + '%'));
      if (full) {
        tr.tabIndex = 0;
        const open = () => showStream(st.id);
        tr.addEventListener('click', open);
        tr.addEventListener('keydown', (e) => e.key === 'Enter' && open());
      } else {
        tr.style.cursor = 'default';
      }
      return tr;
    });
    $('streamList').replaceChildren(el('thead', '', head), el('tbody', '', ...rows));
    // 無料版は一覧だけなので1列
    $('statsSplit').classList.toggle('single', !full);
    if (!full) $('streamDetail').hidden = true;
    else if (selectedStream && streams.some((st) => st.id === selectedStream)) showStream(selectedStream);
    else if (streams[0]) showStream(streams[0].id);
  }

  async function showStream(id) {
    selectedStream = id;
    let d;
    try {
      const res = await fetch('/api/analytics/' + encodeURIComponent(id));
      d = await res.json();
      if (!res.ok) throw new Error(d.error);
    } catch (e) {
      toast(e.message || '読めませんでした');
      return;
    }
    // 一覧の選んだ行に印
    const index = [...$('streamList').querySelectorAll('tbody tr')].findIndex((tr) => tr.firstChild.textContent === fmtDate(d.startedAt));
    $('streamList').querySelectorAll('tbody tr').forEach((tr, i) => tr.classList.toggle('selected', i === index));
    $('streamDetail').hidden = false;
    $('detailTitle').textContent = fmtDate(d.startedAt) + ' 〜 ' + fmtClock(d.endedAt) + '（' + fmtDuration(d.endedAt - d.startedAt) + '）';
    const stat = (label, value, cls = '') => el('div', 'stat', el('small', '', label), el('b', cls, value));
    // 大事な4つを大きく。失敗が多いときは色で知らせる
    $('detailStats').replaceChildren(
      stat('コイン', fmtNum(d.coins)), stat('ギフト', fmtNum(d.gifts)), stat('妨害を出した', fmtNum(d.actions.sent)),
      stat('失敗', fmtNum(d.actions.failed) + '（' + d.failureRate + '%）', failClass(d.failureRate)));
    $('detailSub').textContent = '送ってくれた人 ' + fmtNum(d.supporterCount) + '人 ・ いいね ' + fmtNum(d.likes) + ' ・ フォロー ' + fmtNum(d.follows)
      + ' ・ シェア ' + fmtNum(d.shares) + ' ・ クリアしたラウンド ' + fmtNum(d.rounds);
    // 分ごとの記録（抜けている分は0）
    const minutes = (d.timeline.at(-1)?.m ?? 0) + 1;
    const at = new Map(d.timeline.map((b) => [b.m, b]));
    const series = (key) => Array.from({ length: minutes }, (_, m) => at.get(m)?.[key] ?? (key === 'fill' ? null : 0));
    const label = (m) => fmtClock(d.startedAt + m * 60000);
    barChart($('chartCoins'), series('coins'), label, (v) => '🪙' + fmtNum(v));
    barChart($('chartActions'), series('actions'), label, (v) => fmtNum(v) + '回');
    lineChart($('chartFill'), series('fill'), label);
    const item = (icon, name, value) => el('li', '', ...(icon ? [icon] : []), el('span', 'name', name), el('span', 'value', value));
    const none = (text) => el('li', '', el('span', 'name hint', text));
    $('detailGifts').replaceChildren(...(d.topGifts.length ? d.topGifts.map((g) => item(giftIcon(g.name), g.name, '×' + fmtNum(g.count) + '・🪙' + fmtNum(g.coins))) : [none('ギフトは届いていません')]));
    $('detailSupporters').replaceChildren(...(d.supporters.length ? d.supporters.map((x, i) => item(null, (i + 1) + '. ' + x.name, '🪙' + fmtNum(x.coins))) : [none('まだいません')]));
    $('detailActions').replaceChildren(...(d.byAction.length ? d.byAction.map((a) => item(mcIcon(iconOf(a.key), 20), ACTION_INFO[a.key]?.name ?? a.key, fmtNum(a.count) + '回')) : [none('出していません')]));
    const skipped = [['cooldown', '待ち時間（クールダウン）中'], ['paused', '一時停止中'], ['no_rule', '合うルールがない'],
      ['challenge_paused', '採掘チャレンジの一時停止中'], ['mode_incompatible', '今のゲームモードでは出せない'], ['no_active_mode', 'チャレンジが始まっていない']]
      .filter(([key]) => d.actions[key] > 0).map(([key, text]) => item(null, text, fmtNum(d.actions[key]) + '回'));
    const failures = d.failures.map((f) => item(null, '失敗: ' + f.reason, fmtNum(f.count) + '回'));
    $('detailFailures').replaceChildren(...(failures.length + skipped.length ? [...failures, ...skipped] : [none('すべて出せました')]));
  }

  /** グラフの枠（目盛り・横軸の時刻・重ねたときの数）。draw(w, h, x) で中身を描く */
  /** 目盛り用の短い数（12,345 → 1.2万、123,456,789 → 1.2億） */
  function fmtShort(v) {
    const n = Math.round(v);
    if (n >= 1e8) return (n / 1e8).toFixed(n >= 1e9 ? 0 : 1).replace(/\.0$/, '') + '億';
    if (n >= 1e4) return (n / 1e4).toFixed(n >= 1e5 ? 0 : 1).replace(/\.0$/, '') + '万';
    return fmtNum(n);
  }

  function chartFrame(box, values, label, format, max, draw) {
    const width = Math.max(240, box.clientWidth || 600);
    const height = 140;
    const pad = { l: 36, r: 8, t: 8, b: 20 };
    const w = width - pad.l - pad.r;
    const h = height - pad.t - pad.b;
    const n = values.length;
    const x = (i) => pad.l + (n <= 1 ? w / 2 : (i + 0.5) * (w / n));
    const y = (v) => pad.t + h - (v / max) * h;
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
    svg.setAttribute('role', 'img');
    const add = (tag, attrs, text) => {
      const node = document.createElementNS(NS, tag);
      for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
      if (text !== undefined) node.textContent = text;
      svg.append(node);
      return node;
    };
    // 横の目盛り（0・半分・最大）
    for (const v of [max / 2, max]) {
      add('line', { class: 'grid', x1: pad.l, x2: width - pad.r, y1: y(v), y2: y(v) });
      add('text', { class: 'axis', x: pad.l - 6, y: y(v) + 3, 'text-anchor': 'end' }, fmtShort(v));
    }
    add('text', { class: 'axis', x: pad.l - 6, y: y(0) + 3, 'text-anchor': 'end' }, '0');
    draw({ add, x, y, w, h, n, pad, height });
    add('line', { class: 'base', x1: pad.l, x2: width - pad.r, y1: y(0), y2: y(0) });
    // 横軸の時刻（多すぎないように間引く）
    const step = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(w / 64))));
    for (let i = 0; i < n; i += step) add('text', { class: 'axis', x: x(i), y: height - 4, 'text-anchor': 'middle' }, label(i));
    // 重ねたときの数
    const cursor = add('line', { class: 'cursor', y1: pad.t, y2: pad.t + h, visibility: 'hidden' });
    const tip = el('div', 'tip');
    tip.hidden = true;
    svg.addEventListener('pointermove', (e) => {
      const rect = svg.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * width;
      const i = Math.min(n - 1, Math.max(0, Math.floor(((px - pad.l) / w) * n)));
      if (values[i] === null) {
        tip.hidden = true;
        cursor.setAttribute('visibility', 'hidden');
        return;
      }
      cursor.setAttribute('x1', x(i));
      cursor.setAttribute('x2', x(i));
      cursor.setAttribute('visibility', 'visible');
      tip.replaceChildren(el('small', '', label(i)), format(values[i]));
      tip.style.left = (x(i) / width) * 100 + '%';
      tip.hidden = false;
    });
    svg.addEventListener('pointerleave', () => {
      tip.hidden = true;
      cursor.setAttribute('visibility', 'hidden');
    });
    box.replaceChildren(svg, tip);
  }

  function barChart(box, values, label, format) {
    const max = Math.max(1, ...values) * 1.1;
    chartFrame(box, values, label, format, max, ({ add, x, y, w, n }) => {
      const bw = Math.max(1, Math.min(24, w / n - 2)); // 棒の間に2px あける
      const r = bw >= 8 ? 4 : 0;
      values.forEach((v, i) => {
        if (!v) return;
        const top = y(v);
        const height = y(0) - top;
        // 上だけ角を丸める
        const rr = Math.min(r, height);
        const x0 = x(i) - bw / 2;
        add('path', { class: 'bar', d: 'M' + x0 + ',' + y(0) + 'V' + (top + rr) + 'q0,-' + rr + ' ' + rr + ',-' + rr + 'H' + (x0 + bw - rr) + 'q' + rr + ',0 ' + rr + ',' + rr + 'V' + y(0) + 'Z' });
      });
    });
  }

  function lineChart(box, values, label) {
    chartFrame(box, values, label, (v) => v + '%', 100, ({ add, x, y }) => {
      // 記録のない分（MOD につながっていなかった・埋め立てをしていなかった）は線を切る
      let d = '';
      let open = false;
      values.forEach((v, i) => {
        if (v === null) {
          open = false;
          return;
        }
        d += (open ? 'L' : 'M') + x(i) + ',' + y(v);
        open = true;
      });
      if (d) add('path', { class: 'line', d });
      else add('text', { class: 'axis', x: x(Math.floor(values.length / 2)), y: y(50), 'text-anchor': 'middle' }, 'この配信では埋め立ての記録がありません');
    });
  }
  $('statsReload').addEventListener('click', () => loadStreams());
  // 開いているあいだは、配信中の数が増えていくのが見えるよう自動で読み直す（グラフに重ねているときは待つ）
  setInterval(() => {
    if ($('tabStats').hidden || document.hidden || document.querySelector('#tabStats .chart:hover')) return;
    loadStreams();
  }, 15000);
  // 履歴に残す「何で変えたか」（プリセット・履歴から読み込んだあと、そのまま保存したとき）
  let pendingReason = 'edit';
  $('revertRules').addEventListener('click', () => {
    savedRulesKey = '';
    pendingReason = 'edit';
    loadRules(state.rules);
  });
  async function saveRules(list) {
    const data = await post('/api/rules', { rules: sortedRules(list), reason: pendingReason }, { button: $('saveRules'), done: '妨害の設定を保存しました' });
    if (data?.ok) {
      savedRulesKey = '';
      pendingReason = 'edit';
      loadRules(data.state.rules);
      return true;
    }
    return false;
  }

  // ---- 妨害の設定の履歴 ----
  $('openHistory').addEventListener('click', async () => {
    let data;
    try {
      const res = await fetch('/api/history');
      data = await res.json();
    } catch {
      toast('履歴を読めませんでした');
      return;
    }
    $('historyPlusNote').hidden = data.full;
    $('historyPlusNote').replaceChildren('無料版では新しい3件まで見られます。30件までさかのぼるのは ' + PLUS_NAME + ' の機能です', ...plusLink());
    const when = (t) => new Date(t).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' });
    $('historyList').replaceChildren(...data.entries.map((entry, i) => {
      const head = el('div', 'history-head', el('b', '', when(entry.time)), el('span', 'grow', entry.reasonText + '・ルール ' + entry.count + '件'));
      if (i === 0) {
        head.append(el('span', 'now', '今の設定'));
      } else {
        const load = Object.assign(el('button', '', 'この設定を読み込む'), { type: 'button' });
        load.addEventListener('click', () => restoreHistory(entry, when(entry.time)));
        head.append(load);
      }
      const lines = [];
      if (entry.diff) {
        for (const [mark, list] of [['増えた', entry.diff.added], ['消えた', entry.diff.removed], ['変えた', entry.diff.changed]]) {
          for (const text of list) lines.push(el('li', '', el('span', 'mark', mark), text));
        }
        if (lines.length === 0) lines.push(el('li', '', '並び順だけ変えました'));
      } else {
        lines.push(el('li', '', 'これより前の記録はありません'));
      }
      return el('li', '', head, el('ul', 'history-diff', ...lines));
    }));
    $('historyDialog').showModal();
  });
  $('historyClose').addEventListener('click', () => $('historyDialog').close());

  async function restoreHistory(entry, label) {
    if (rulesDirty) {
      const ok = await askConfirm({ title: '保存していない変更があります', text: '読み込むと、今の画面の変更はなくなります。', ok: '読み込む' });
      if (!ok) return;
    }
    let data;
    try {
      const res = await fetch('/api/history/' + encodeURIComponent(entry.id));
      data = await res.json();
      if (!res.ok) throw new Error(data.error);
    } catch (e) {
      toast(e.message || '読めませんでした');
      return;
    }
    rows = data.rules.map(toRow);
    pendingReason = 'restore';
    setDirty(true);
    renderRows();
    $('historyDialog').close();
    toast(label + ' の設定を読み込みました。よければ「保存する」を押してください');
  }
  $('saveRules').addEventListener('click', () => saveRules(rows));
  // Ctrl+S で保存（妨害の設定の画面を開いているとき）
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && !$('tabRules').hidden) {
      e.preventDefault();
      if (rulesDirty) saveRules(rows);
    }
  });

  // ---- プリセット ----
  let presetsKey = '';
  /** たくさん並ぶときは、はじめは limit 個だけ出して「すべて表示」を付ける（開いたかどうかは覚えておく） */
  const PRESETS_SHOWN = 8;
  const QUICK_SHOWN = 12;
  const expanded = new Set();
  function showSome(items, limit, key) {
    if (items.length <= limit + 1 || expanded.has(key)) return items;
    const more = Object.assign(el('button', 'ghost show-more', 'すべて表示（ほか ' + (items.length - limit) + '個）'), { type: 'button' });
    more.addEventListener('click', () => {
      expanded.add(key);
      more.replaceWith(...items.slice(limit));
    });
    return [...items.slice(0, limit), more];
  }

  function renderPresets() {
    if (!state?.presets) return;
    $('settingsFile').hidden = !state.plan?.importExport;
    const current = JSON.stringify(sortedRules(rows));
    // 状態はいいねや進み具合のたびに届くので、変わっていなければ作り直さない
    const key = JSON.stringify(state.presets) + current;
    if (key === presetsKey) return;
    presetsKey = key;
    const chip = (preset, description) => {
      const inUse = rows.length > 0 && rulesKey(preset.rules) === current;
      const b = Object.assign(el('button', 'preset' + (inUse ? ' current' : ''), el('b', '', preset.name), el('small', '', description)), { type: 'button' });
      if (inUse) b.append(el('span', 'in-use', '使用中'));
      b.title = preset.rules.length + '件のルール。押すと入れ替わります';
      b.addEventListener('click', () => applyPreset(preset));
      return b;
    };
    const mine = state.presets.mine.map((preset) => {
      const del = Object.assign(el('button', 'icon-only del', '✕'), { type: 'button', title: 'このプリセットを削除' });
      del.addEventListener('click', async () => {
        const ok = await askConfirm({ title: '「' + preset.name + '」を削除しますか？', text: '今のルールはそのままです。', ok: '削除する' });
        if (ok) await post('/api/presets/delete', { name: preset.name }, { done: 'プリセットを削除しました' });
      });
      return el('span', 'preset-mine', chip(preset, '自分で保存・' + preset.rules.length + '件'), del);
    });
    const save = Object.assign(el('button', 'preset preset-save', el('b', '', '＋ 今の設定を保存'), el('small', '', '名前を付けて取っておく')), { type: 'button' });
    save.addEventListener('click', () => {
      $('presetName').value = '';
      $('presetDialog').showModal();
      $('presetName').focus();
    });
    const all = [...state.presets.builtin.map((p) => chip(p, p.description)), ...mine];
    $('presets').replaceChildren(...showSome(all, PRESETS_SHOWN, 'presets'), save);
  }

  // ---- 配信画面の見た目（有料版の機能） ----
  function renderStyle() {
    $('styleCard').hidden = !state.plan?.overlayStyle;
    const saved = state.savedOverlayStyle;
    if (!saved) return;
    for (const input of document.querySelectorAll('[data-style]')) {
      // 入力中のものは上書きしない
      if (document.activeElement !== input) input.value = String(saved[input.dataset.style]);
    }
    syncStyleLabels();
  }
  /** 色の横の「#ffffff」と、濃さの「80%」 */
  function syncStyleLabels() {
    document.querySelectorAll('#styleFields .swatch').forEach((sw) => (sw.querySelector('code').textContent = sw.querySelector('input').value.toUpperCase()));
    const opacity = Number($('styleOpacity').value);
    $('styleOpacity').nextElementSibling.textContent = opacity === 0 ? '透明' : opacity + '%';
  }
  $('styleFields').addEventListener('input', syncStyleLabels);
  $('styleFields').addEventListener('change', (e) => {
    const key = e.target.dataset?.style;
    if (!key) return;
    const value = e.target.type === 'number' || e.target.type === 'range' ? Number(e.target.value) : e.target.value;
    post('/api/overlay/style', { style: { [key]: value } });
  });
  $('styleReset').addEventListener('click', async () => {
    const ok = await askConfirm({ title: '見た目を元に戻しますか？', text: '色・文字の形・通知の秒数と数が、はじめの設定に戻ります。', ok: '元に戻す' });
    if (ok) post('/api/overlay/style', { reset: true }, { done: '見た目を元に戻しました' });
  });

  // ---- 有料版のライセンス（販売を始めるまでは出さない） ----
  function renderLicense() {
    const lic = state.license ?? { enabled: false };
    if (!lic.enabled) {
      // 販売を始めるまでは無料ベータ。申し込みとキーの入力は出さない
      $('planBadge').textContent = '無料ベータ中';
      $('planBadge').classList.add('plus');
      $('licenseText').textContent = '今は無料ベータ中のため、有料版の機能もすべて使えます。販売が始まったら、ここから申し込めます。';
      $('licenseLinks').hidden = true;
      $('planTerms').hidden = true;
      $('licenseCard').classList.remove('with-terms');
      $('licenseKeyCard').hidden = true;
      return;
    }
    $('licenseKeyCard').hidden = false;
    const when = (t) => new Date(t).toLocaleString('ja-JP', { hour12: false });
    const texts = {
      none: '無料版で動いています。有料版を買うと、プリセットやルールをたくさん保存できます。',
      active: '有効です（@' + lic.tiktok + ' 用・最後に確かめた日時 ' + (lic.lastValidatedAt ? when(lic.lastValidatedAt) : '—') + '）。',
      offline: 'ネットにつながらず確かめられませんでした。' + (lic.graceUntil ? when(lic.graceUntil) : '') + ' までは有料版のまま使えます。',
      expired: lic.offline
        ? '7日以上確かめられなかったので、無料版で動いています。ネットにつなぐと戻ります。設定は消えていません。'
        : '期限切れか解約されたため、無料版で動いています。設定は消えていません。',
    };
    let text = texts[lic.state] ?? '';
    if ((lic.state === 'active' || lic.state === 'offline') && state.plan?.id !== 'plus') {
      text = 'このキーは @' + lic.tiktok + ' 用です。今の TikTok ID（@' + (state.tiktokUsername || '未設定') + '）では無料版で動いています。';
    }
    $('licenseText').textContent = text;
    $('licenseForm').hidden = lic.state !== 'none';
    $('licenseDeactivateRow').hidden = lic.state === 'none';
    const plus = state.plan?.id === 'plus';
    $('planBadge').textContent = plus ? '今は有料版' : '今は無料版';
    $('planBadge').classList.toggle('plus', plus);
    $('planChip').hidden = false;
    $('planChip').textContent = plus ? PLUS_NAME : '無料版';
    $('planChip').classList.toggle('plus', plus);
    // 買う: 無料版で動いているとき。契約の確認・解約: キーを入れたことがあるとき
    $('licenseBuy').hidden = plus || !lic.checkoutUrl;
    if (lic.checkoutUrl) $('licenseBuy').href = lic.checkoutUrl;
    $('licensePortal').hidden = lic.state === 'none' || !lic.portalUrl;
    if (lic.portalUrl) $('licensePortal').href = lic.portalUrl;
    $('licenseLinks').hidden = $('licenseBuy').hidden && $('licensePortal').hidden;
    // 月額の契約なので、申し込むボタンの横に契約の中身を出す
    $('planTerms').hidden = $('licenseBuy').hidden;
    $('licenseCard').classList.toggle('with-terms', !$('licenseBuy').hidden);
  }

  /** 有料版の機能の案内に付ける「有料版について」（販売を始めるまでは出さない） */
  function plusLink() {
    if (!state?.license?.enabled) return [];
    const b = Object.assign(el('button', 'plus-link', '有料版について'), { type: 'button' });
    b.addEventListener('click', () => {
      document.querySelectorAll('dialog[open]').forEach((d) => d.close());
      showTab('tabPlan');
    });
    return [b];
  }
  $('licenseForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = await post('/api/license/activate', { key: $('licenseKey').value }, { button: $('licenseActivate'), done: '有料版を有効にしました' });
    if (data?.ok) $('licenseKey').value = '';
  });
  $('licenseDeactivate').addEventListener('click', async () => {
    const ok = await askConfirm({ title: 'この PC で解除しますか？', text: 'この PC では無料版に戻ります（設定は消えません）。キーは別の PC で使えるようになります。', ok: '解除する' });
    if (ok) await post('/api/license/deactivate', {}, { button: $('licenseDeactivate'), done: '解除しました' });
  });

  // ---- 設定ファイル（書き出し・読み込み）。有料版の機能 ----
  $('importSettings').addEventListener('click', () => $('importFile').click());
  $('importFile').addEventListener('change', async () => {
    const file = $('importFile').files[0];
    $('importFile').value = '';
    if (!file) return;
    let data;
    try {
      data = JSON.parse(await file.text());
    } catch {
      toast('ファイルを読めませんでした。書き出した .json ファイルを選んでください', 'error');
      return;
    }
    const result = await post('/api/settings/import', { data }, { button: $('importSettings') });
    if (result?.ok) toast('プリセットを' + result.imported.length + '個読み込みました（' + result.imported.join('・') + '）');
  });

  async function applyPreset(preset) {
    if (rows.length > 0 && rulesKey(preset.rules) === JSON.stringify(sortedRules(rows))) return;
    const ok = await askConfirm({
      title: '「' + preset.name + '」に入れ替えますか？',
      text: '今のルールが「' + preset.name + '」のルール（' + preset.rules.length + '件）に入れ替わります。「保存する」を押すまでは確定しないので、「元に戻す」で戻せます。',
      ok: '入れ替える',
    });
    if (!ok) return;
    rows = preset.rules.map(toRow);
    pendingReason = 'preset';
    setDirty(true);
    renderRows();
    toast('「' + preset.name + '」を読み込みました。よければ「保存する」を押してください');
  }

  async function savePreset() {
    const name = $('presetName').value.trim();
    if (!name) {
      $('presetName').classList.add('invalid');
      return;
    }
    if (state.presets.mine.some((p) => p.name === name)) {
      const ok = await askConfirm({ title: '「' + name + '」を上書きしますか？', text: '同じ名前のプリセットがあります。中身が今のルールに置き換わります。', ok: '上書きする' });
      if (!ok) return;
    }
    // 保存していない変更があれば、先にルールを保存する（プリセットには保存したルールが入る）
    if (rulesDirty && !(await saveRules(rows))) return;
    const data = await post('/api/presets/save', { name }, { button: $('presetOk'), done: '「' + name + '」として保存しました' });
    if (data?.ok) $('presetDialog').close();
  }
  $('presetOk').addEventListener('click', savePreset);
  $('presetName').addEventListener('keydown', (e) => {
    $('presetName').classList.remove('invalid');
    if (e.key === 'Enter') savePreset();
  });
  $('presetCancel').addEventListener('click', () => $('presetDialog').close());

  // ---- 埋め立てモード ----
  function renderFill(fill) {
    // 配信画面は状況、埋め立て画面は設定（埋め立て中は変えられない）
    $('fillRunning').hidden = !fill;
    $('fillEmpty').hidden = !!fill;
    $('fillIdle').hidden = !!fill;
    $('fillSide').hidden = !!fill;
    $('fillBusy').hidden = !fill;
    $('fillStart').hidden = !!fill;
    $('fillStop').hidden = !fill;
    if (!fill) return;
    const phases = {
      filling: '埋めています',
      countdown: '完成！ あと ' + fill.countdownSecondsLeft + ' 秒守りきればクリア',
      cleared: '全ラウンドクリア！',
    };
    $('fillPhase').textContent = phases[fill.phase];
    $('fillPhase').className = 'fill-phase ' + fill.phase;
    const total = Object.assign(document.createElement('span'), { textContent: '/ ' + (fill.rounds ?? 1) });
    $('fillRound').replaceChildren(String(fill.round ?? 0), total);
    $('fillPercent').textContent = fill.percent + '%';
    $('fillBar').className = 'fill-progress ' + fill.phase;
    $('fillBar').firstElementChild.style.width = (fill.total ? (fill.filled / fill.total) * 100 : 0) + '%';
    $('fillDetail').textContent = fill.filled.toLocaleString('ja-JP') + ' / ' + fill.total.toLocaleString('ja-JP') + ' マス（幅' + fill.width + '・高さ' + fill.height + '）';
  }

  // ---- ゲームモードの切り替えと、採掘・収集チャレンジ ----
  const MINING_TARGETS = ${JSON.stringify(MINING_TARGETS)};
  const MINING_PRESETS = ${JSON.stringify(MINING_PRESETS)};
  const MINING_REASONS = ${JSON.stringify(MINING_REASONS)};
  const MINING_ACTIVE = ['countdown', 'running', 'paused'];
  const GAME_MODE_NAMES = { survival: 'サバイバル', creative: 'クリエイティブ', adventure: 'アドベンチャー', spectator: 'スペクテイター' };
  const clockText = (sec) => String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
  const targetOf = (id) => MINING_TARGETS.find((t) => t.id === id) ?? { id, name: id, icon: '', note: '' };
  /** 今のモード: 動いているゲームがあればそれ、なければ選んでいるモード */
  function effectiveMode() {
    if (state.fill) return 'fill';
    if (MINING_ACTIVE.includes(state.mining?.state)) return 'mining_challenge';
    return state.gameMode ?? 'fill';
  }
  function miningPhase(m) {
    if (m.state === 'countdown') return ['countdown', 'まもなくスタート（' + m.countdownSecondsLeft + '）'];
    if (m.state === 'running') return ['', '挑戦中'];
    if (m.state === 'paused') return ['paused', '一時停止中（時間と進み具合が止まっています）'];
    if (m.state === 'succeeded') return ['cleared', 'クリア！'];
    if (m.state === 'failed') return ['failed', m.failureReason === 'player_died' ? '失敗（プレイヤーが倒れた）' : '失敗（時間切れ）'];
    return ['aborted', '中止（' + (MINING_REASONS[m.failureReason] ?? '') + '）'];
  }
  /** 採掘チャレンジの状況（対象・集めた数・残り時間・バー・内訳） */
  function miningStatus(m) {
    const t = targetOf(m.item);
    const shown = Math.min(m.progress, m.targetCount);
    const [cls, text] = miningPhase(m);
    const bar = el('div', 'fill-progress ' + cls, el('div'));
    bar.firstChild.style.width = Math.min(100, (shown / m.targetCount) * 100) + '%';
    const warn = m.state === 'running' && m.remainingSeconds <= 10;
    const detail = '掘った ' + m.mined + '・支援 ' + m.support + '（支援は ' + m.supportLimit + '個まで）' + (m.test ? '・テスト' : '');
    return el('div', '',
      el('div', 'mining-target', mcIcon(t.icon, 36), el('div', '', el('small', '', '採掘・収集チャレンジ'), el('b', '', t.name))),
      el('div', 'mining-hero',
        el('div', 'fill-round', el('small', '', '集めた数'), el('b', '', String(shown), el('span', '', '/ ' + m.targetCount))),
        el('div', 'fill-pct mining-time' + (warn ? ' warn' : ''), el('small', '', '残り時間'), el('b', '', clockText(m.remainingSeconds)))),
      bar,
      el('div', 'fill-meta', el('span', 'fill-phase ' + cls, text), el('span', 'fill-detail', detail)));
  }
  /** 始める前の確認。[できているか, 名前, できていないときの説明] */
  function miningChecks() {
    const p = state.player;
    const inWorld = state.mod.connected && state.mod.players > 0;
    const item = state.miningSettings?.item;
    return [
      [state.mod.connected, 'マイクラにつながっている', 'ランチャーで「fabric-loader」を選んで起動してください'],
      [inWorld, 'ワールドに入っている', 'ワールドを開いてください'],
      [inWorld && p?.gameMode === 'survival', 'サバイバルモード', !p ? '確認中…' : 'いまは' + (GAME_MODE_NAMES[p.gameMode] ?? p.gameMode) + 'です。サバイバルに切り替えてください'],
      [inWorld && !!p?.alive, 'プレイヤーが生きている', !p ? '確認中…' : 'リスポーンしてから始めてください'],
      [!state.fill, '埋め立てをしていない', '埋め立てを終えてから始めてください'],
      [!(state.miningUnavailable ?? []).includes(item), '対象アイテムが使える', 'このマイクラでは使えません。別の対象を選んでください'],
    ];
  }
  let miningNowKey = '';
  let liveMiningKey = '';
  let miningChecksKey = '';
  function renderMining() {
    const mode = effectiveMode();
    const m = state.mining;
    const active = MINING_ACTIVE.includes(m?.state);
    const locked = !!state.fill || active;
    // モードのカード
    document.querySelectorAll('.mode-card').forEach((card) => {
      const on = card.dataset.mode === mode;
      card.classList.toggle('selected', on);
      card.querySelector('.in-use').hidden = !on;
      card.disabled = locked;
    });
    $('modeLocked').hidden = !locked;
    const mining = mode === 'mining_challenge';
    $('modeFill').hidden = mining;
    $('modeMining').hidden = !mining;
    // 上のボタン
    if (mining) {
      $('fillStart').hidden = true;
      $('fillStop').hidden = true;
    }
    $('miningStart').hidden = !mining || active;
    const checks = miningChecks();
    $('miningStart').disabled = !checks.every(([ok]) => ok);
    $('miningStart').title = $('miningStart').disabled ? '「始める前の確認」が全部 ✓ になると押せます' : '';
    document.querySelectorAll('[data-mining-op]').forEach((b) => {
      const op = b.dataset.miningOp;
      b.hidden = !mining || !(op === 'pause' ? m?.state === 'running' : op === 'resume' ? m?.state === 'paused' : active);
    });
    // 始める前の確認
    const checksKey = JSON.stringify(checks);
    if (checksKey !== miningChecksKey) {
      miningChecksKey = checksKey;
      $('miningChecks').replaceChildren(...checks.map(([ok, name, why]) =>
        el('li', ok ? 'yes' : 'no', el('span', 'mark', ok ? '✓' : '✗'), el('div', '', name, ok ? '' : el('small', '', why)))));
    }
    // 今の挑戦（終わったあとは結果と「もう一度挑戦」）
    $('miningBusy').hidden = !active;
    $('miningSettings').classList.toggle('locked', active);
    $('miningSettings').inert = active;
    $('miningNow').hidden = !m;
    $('miningAgain').hidden = !m || active;
    const nowKey = JSON.stringify(m);
    if (m && nowKey !== miningNowKey) $('miningNowStatus').replaceChildren(miningStatus(m));
    miningNowKey = nowKey;
    // 配信の画面のカード
    const showLive = mining && !state.fill;
    $('liveMining').hidden = !showLive || !m;
    if (showLive) {
      $('fillRunning').hidden = true;
      $('fillEmpty').hidden = !!m && active;
      $('fillEmptyText').textContent = m ? 'チャレンジは終わりました。' : '採掘・収集チャレンジは始まっていません。';
    } else {
      $('fillEmptyText').textContent = '埋め立ては始まっていません。';
    }
    const liveKey = showLive ? nowKey : '';
    if (showLive && m && liveKey !== liveMiningKey) $('liveMiningStatus').replaceChildren(miningStatus(m));
    liveMiningKey = liveKey;
    renderMiningSettings(state.miningSettings);
    // モードを変えたら、ルールの一覧の注意（このモードでは出ない）を出し直す
    if (state.gameMode !== rowsMode) {
      rowsMode = state.gameMode;
      renderRows();
    }
  }
  let rowsMode = null;

  // 採掘チャレンジの設定（前回の設定を入れる。入力中の欄は上書きしない）
  let miningSettingsKey = '';
  function renderMiningSettings(settings) {
    if (!settings) return;
    const key = JSON.stringify(settings);
    if (key === miningSettingsKey) return;
    miningSettingsKey = key;
    const t = targetOf(settings.item);
    $('miningItem').value = t.icon;
    $('miningItem').dispatchEvent(new Event('sync'));
    $('miningNote').textContent = t.note;
    for (const [id, value] of [['miningCount', settings.targetCount], ['miningSeconds', settings.seconds]]) {
      if (document.activeElement !== $(id)) $(id).value = String(value);
    }
    $('miningClock').textContent = '＝ ' + clockText(settings.seconds) + '（30〜1800秒）';
    const presets = [...MINING_PRESETS, { id: 'custom', name: 'カスタム', description: '自分で決める' }];
    $('miningPresets').replaceChildren(...presets.map((preset) => {
      const b = Object.assign(el('button', 'preset' + (settings.preset === preset.id ? ' current' : ''), el('b', '', preset.name),
        el('small', '', preset.item ? targetOf(preset.item).name + ' ' + preset.targetCount + '個・' + clockText(preset.seconds) : preset.description)), { type: 'button' });
      if (preset.item) b.addEventListener('click', () => saveMining({ item: preset.item, targetCount: preset.targetCount, seconds: preset.seconds }));
      else b.addEventListener('click', () => $('miningCount').focus());
      return b;
    }));
  }
  async function saveMining(body) {
    const data = await post('/api/mining', body);
    // 断られたら、保存されている値に戻す
    if (!data?.ok) {
      miningSettingsKey = '';
      if (state) renderMiningSettings(state.miningSettings);
    }
  }
  const miningForm = () => ({ item: 'minecraft:' + $('miningItem').value, targetCount: Number($('miningCount').value), seconds: Number($('miningSeconds').value) });
  $('miningItem').addEventListener('input', () => saveMining(miningForm()));
  ['miningCount', 'miningSeconds'].forEach((id) => $(id).addEventListener('change', () => saveMining(miningForm())));
  $('miningSeconds').addEventListener('input', () => {
    const sec = Number($('miningSeconds').value);
    if (Number.isInteger(sec) && sec >= 0) $('miningClock').textContent = '＝ ' + clockText(sec) + '（30〜1800秒）';
  });

  document.querySelectorAll('.mode-card').forEach((card) => card.addEventListener('click', () => {
    if (card.dataset.mode !== state?.gameMode) post('/api/mode', { mode: card.dataset.mode }, { button: card });
  }));
  const startMining = (button) => post('/api/mining/start', {}, { button, done: 'チャレンジを始めます（3秒のカウントダウン）' });
  $('miningStart').addEventListener('click', async () => {
    const data = await startMining($('miningStart'));
    if (data?.ok) showTab('tabLive');
  });
  $('miningRetry').addEventListener('click', () => startMining($('miningRetry')));
  document.querySelectorAll('[data-mining-op]').forEach((b) => b.addEventListener('click', async () => {
    const op = b.dataset.miningOp;
    if (op === 'abort') {
      const ok = await askConfirm({ title: 'チャレンジを中止しますか？', text: '現在の進捗は結果として保存されます。掘ったブロックや取得済みアイテムは元に戻りません。', ok: '中止する', cancel: '続ける' });
      if (!ok) return;
    }
    const done = { pause: 'チャレンジを一時停止しました', resume: 'チャレンジを再開しました', abort: 'チャレンジを中止しました' };
    post('/api/mining/control', { op }, { button: b, done: done[op] });
  }));
  document.querySelectorAll('[data-mining-test]').forEach((b) => b.addEventListener('click', () =>
    post('/api/mining/test', { op: b.dataset.miningTest, percent: Number(b.dataset.percent ?? 100) }, { button: b, done: '「' + b.textContent.trim() + '」をしました' })));

  // 前回の設定を入れる（入力中は上書きしない）
  const FILL_FIELDS = {
    fillWidth: 'width', fillHeight: 'height', fillCountdown: 'countdown', fillRounds: 'rounds', fillWall: 'wall', fillBlock: 'block', fillHandBlock: 'handBlock',
    fillSkyY: 'skyY', fillReach: 'reach', fillPlaceSpeed: 'placeSpeed', fillBreakSpeed: 'breakSpeed',
    fillMobsAttack: 'mobsAttack', fillMobLifetime: 'mobLifetime',
  };
  let fillFormDirty = false;
  Object.keys(FILL_FIELDS).forEach((id) => $(id).addEventListener('input', () => (fillFormDirty = true)));
  let fillSettingsKey = '';
  /** 右の枠の図（幅×幅×高さの箱。置かれるブロックの色で下から3分の1を塗る） */
  const BLOCK_COLORS = {
    amethyst_block: '#9a6fd6', diamond_block: '#5fd6d0', emerald_block: '#3fbf5f', gold_block: '#e8c23a',
    iron_block: '#d8d8d8', lapis_block: '#2f5bb7', redstone_block: '#c8302a', quartz_block: '#ece6dc',
  };
  const WALL_COLORS = { glass: '#cfe3ea', white_stained_glass: '#f0f0f0', light_blue_stained_glass: '#7fbfe6', bedrock: '#7a7a7a' };
  function renderFrameFigure() {
    const w = Math.max(1, Number($('fillWidth').value) || 1);
    const h = Math.max(1, Number($('fillHeight').value) || 1);
    // 斜め上から見た箱。いちばん大きい辺が図に収まるように縮める
    const unit = 120 / Math.max(w, h * 0.9);
    const dx = w * unit * 0.87, dy = w * unit * 0.5, hh = h * unit;
    const W = 2 * dx + 20, H = 2 * dy + hh + 20;
    const cx = W / 2, top = 10;
    const pt = (x, y) => x.toFixed(1) + ',' + y.toFixed(1);
    // 上の面の4つの角（奥・右・手前・左）
    const back = [cx, top], right = [cx + dx, top + dy], front = [cx, top + 2 * dy], left = [cx - dx, top + dy];
    const down = (p, k) => [p[0], p[1] + k];
    const fillH = hh / 3;
    const block = BLOCK_COLORS[$('fillBlock').value] ?? '#9a6fd6';
    const wall = WALL_COLORS[$('fillWall').value] ?? '#cfe3ea';
    const poly = (pts, attrs) => '<polygon points="' + pts.map((q) => pt(...q)).join(' ') + '" ' + attrs + '/>';
    const filledTop = [down(back, hh - fillH), down(right, hh - fillH), down(front, hh - fillH), down(left, hh - fillH)];
    $('frameFigure').innerHTML = '<svg viewBox="0 0 ' + W.toFixed(0) + ' ' + H.toFixed(0) + '" role="img" aria-label="枠の図">'
      // 埋まった部分（下から3分の1）
      + poly([down(left, hh - fillH), down(front, hh - fillH), down(front, hh), down(left, hh)], 'fill="' + block + '" opacity=".75"')
      + poly([down(front, hh - fillH), down(right, hh - fillH), down(right, hh), down(front, hh)], 'fill="' + block + '" opacity=".55"')
      + poly(filledTop, 'fill="' + block + '" opacity=".9"')
      // 枠（ガラスなど）
      + poly([left, front, down(front, hh), down(left, hh)], 'fill="' + wall + '" fill-opacity=".08" stroke="' + wall + '" stroke-opacity=".7"')
      + poly([front, right, down(right, hh), down(front, hh)], 'fill="' + wall + '" fill-opacity=".05" stroke="' + wall + '" stroke-opacity=".7"')
      + poly([back, right, front, left], 'fill="none" stroke="' + wall + '" stroke-opacity=".7" stroke-dasharray="3 3"')
      + '</svg>';
    const rounds = Number($('fillRounds').value) || 1;
    $('frameSize').innerHTML = '';
    $('frameSize').append('幅 ', el('b', '', String(w)), ' × 奥行き ', el('b', '', String(w)), ' × 高さ ', el('b', '', String(h)),
      ' ＝ ', el('b', '', (w * w * h).toLocaleString('ja-JP')), ' マス。全 ', el('b', '', String(rounds)), ' ラウンド');
  }
  ['fillWidth', 'fillHeight', 'fillRounds', 'fillBlock', 'fillWall'].forEach((id) => $(id).addEventListener('input', renderFrameFigure));

  function renderFillSettings(settings) {
    if (fillFormDirty || !settings) return;
    const key = JSON.stringify(settings);
    if (key === fillSettingsKey) return;
    fillSettingsKey = key;
    for (const [id, key] of Object.entries(FILL_FIELDS)) {
      $(id).value = String(settings[key]);
      $(id).dispatchEvent(new Event('sync'));
    }
    renderFrameFigure();
  }

  // ---- ワールドの設定（変えたらすぐ入れる） ----
  const WORLD_FIELDS = { worldTime: 'time', worldWeather: 'weather', worldMobSpawning: 'mobSpawning', worldKeepInventory: 'keepInventory' };
  function renderWorldSettings(settings) {
    if (!settings) return;
    for (const [id, key] of Object.entries(WORLD_FIELDS)) {
      if (document.activeElement !== $(id)) $(id).value = String(settings[key]);
    }
  }
  Object.keys(WORLD_FIELDS).forEach((id) => $(id).addEventListener('change', async () => {
    const body = {};
    for (const [field, key] of Object.entries(WORLD_FIELDS)) {
      const value = $(field).value;
      body[key] = value === 'true' ? true : value === 'false' ? false : value;
    }
    const data = await post('/api/world', body);
    if (data?.ok) toast(data.applied ? 'ワールドの設定をマイクラに入れました' : '保存しました。マイクラのワールドに入ったら入れます');
  }));

  $('fillStart').addEventListener('click', async () => {
    const body = {};
    for (const [id, key] of Object.entries(FILL_FIELDS)) {
      const value = $(id).value;
      body[key] = $(id).tagName !== 'SELECT' ? Number(value) : value === 'true' ? true : value === 'false' ? false : value;
    }
    const data = await post('/api/fill/start', body, { button: $('fillStart'), done: '埋め立てを始めました' });
    if (data?.ok) {
      fillFormDirty = false;
      // 保存された値（範囲に収めたもの）で入れ直す
      fillSettingsKey = '';
      // 始めたら、状況が見える配信の画面へ
      showTab('tabLive');
    }
  });
  $('fillStop').addEventListener('click', async () => {
    const ok = await askConfirm({ title: '埋め立てを終えますか？', text: '置いたブロックはそのまま残ります。届く距離などの設定は元に戻ります。', ok: '終える' });
    if (ok) post('/api/fill/stop', {}, { button: $('fillStop'), done: '埋め立てを終えました' });
  });
  const buttonText = (b) => b.textContent.trim();
  document.querySelectorAll('[data-action]').forEach((b) => b.addEventListener('click', () => {
    const body = { type: b.dataset.action, count: Number(b.dataset.count ?? 1) };
    if (b.dataset.mob) body.mob = b.dataset.mob;
    if (b.dataset.percent !== undefined) body.percent = Number(b.dataset.percent);
    post('/api/action', body, { button: b, done: '「' + buttonText(b) + '」を出しました' });
  }));
  document.querySelectorAll('[data-test]').forEach((b) => b.addEventListener('click', () =>
    post('/api/test', { kind: b.dataset.test, count: Number(b.dataset.count ?? 1) }, { button: b, done: '「' + buttonText(b) + '」が届いたことにしました' })));
  document.querySelectorAll('button[data-icon]').forEach((b) => b.prepend(mcIcon(b.dataset.icon)));

  // 設定の行の数の入力は、− と ＋ のボタンと単位をつける
  document.querySelectorAll('.setting input[type=number]').forEach((input) => {
    const box = el('div', 'stepper');
    const step = (dir) => {
      try {
        if (dir > 0) input.stepUp(); else input.stepDown();
      } catch {
        return;
      }
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const minus = Object.assign(el('button', '', '−'), { type: 'button', tabIndex: -1, title: '減らす' });
    const plus = Object.assign(el('button', '', '＋'), { type: 'button', tabIndex: -1, title: '増やす' });
    minus.addEventListener('click', () => step(-1));
    plus.addEventListener('click', () => step(1));
    input.before(box);
    box.append(minus, input, el('span', 'unit', input.dataset.unit ?? ''), plus);
  });

  // 置くブロック・枠の素材は、絵のタイルで選ぶ（値は隠した select に持つ）
  document.querySelectorAll('select[data-tiles]').forEach((sel) => {
    const tiles = document.createElement('div');
    tiles.className = 'tiles';
    const buttons = [...sel.options].map((option) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.append(mcIcon(option.value, 32), option.textContent);
      b.addEventListener('click', () => {
        sel.value = option.value;
        sel.dispatchEvent(new Event('input'));
        sync();
      });
      return b;
    });
    const sync = () => buttons.forEach((b, i) => b.classList.toggle('selected', sel.options[i].value === sel.value));
    sel.addEventListener('sync', sync);
    tiles.append(...buttons);
    sel.hidden = true;
    sel.after(tiles);
    sync();
  });

  // ---- 最近届いたギフト ----
  let recentKey = '';
  function renderRecent() {
    if (!state) return;
    const recent = state.recentGifts;
    // 変わっていなければ作り直さない（絵を読み直してちらつかないように）
    const key = giftsVersion + JSON.stringify(recent);
    if (key === recentKey) return;
    recentKey = key;
    if (!recent.length) {
      $('recent').replaceChildren(Object.assign(document.createElement('span'), { className: 'recent-empty', textContent: 'まだありません。TikTok LIVE につながると、届いたギフトがここに並びます' }));
      return;
    }
    $('recent').replaceChildren(...recent.map((gift) => {
      const b = document.createElement('button');
      b.className = 'icon-btn';
      b.append(giftIcon(gift.image || gift.giftName), gift.giftName + '（🪙' + gift.diamonds + '）');
      b.addEventListener('click', () => openEditor(null, { trigger: 'gift', value: gift.giftName }));
      return b;
    }));
  }

  // ---- ギフトを絵から選ぶ ----
  let onGiftPicked = null;
  function openGiftPicker(onPick) {
    onGiftPicked = onPick;
    $('giftSearch').value = '';
    renderGiftGrid();
    $('giftPicker').showModal();
    $('giftSearch').focus();
  }
  function renderGiftGrid() {
    const query = $('giftSearch').value.trim().toLowerCase();
    // 同じ日本語名のギフトは1つだけ（安いほう）出す
    const seen = new Set();
    const shown = gifts
      .filter((g) => !query || g.nameJa.toLowerCase().includes(query) || g.name.toLowerCase().includes(query))
      .filter((g) => !seen.has(g.nameJa) && seen.add(g.nameJa));
    $('giftGrid').replaceChildren(...shown.map((g) => {
      const b = document.createElement('button');
      b.type = 'button';
      const small = Object.assign(document.createElement('small'), { textContent: '🪙' + g.diamonds });
      b.append(giftIcon(g.image, true), g.nameJa, small);
      b.addEventListener('click', () => {
        $('giftPicker').close();
        onGiftPicked?.(g.nameJa);
      });
      return b;
    }));
    $('giftPickerHint').textContent = gifts.length === 0
      ? 'ギフトの一覧をまだ取れていません。インターネットにつながっているか確かめて、アプリを起動し直してください。'
      : (query ? shown.length + '件見つかりました。' : '全' + shown.length + '種類。') + 'コインの少ない順です。';
  }
  $('giftSearch').addEventListener('input', renderGiftGrid);
  // 一覧にあるギフトなら、ボタンにその絵を出す
  const showTestGift = () => $('pickTestGift').replaceChildren(giftFor($('giftName').value) ? giftIcon($('giftName').value) : '絵から選ぶ');
  $('giftName').addEventListener('input', showTestGift);
  $('pickTestGift').addEventListener('click', () => openGiftPicker((name) => {
    $('giftName').value = name;
    showTestGift();
  }));
  $('giftPickerClose').addEventListener('click', () => $('giftPicker').close());

  // ---- 初回ウィザード ----
  const STEP_NAMES = ['マイクラの準備', 'TikTok ID', '完了'];
  let wizardStep = 0;
  let wizardChecked = false;

  function showWizardStep(step) {
    wizardStep = step;
    document.querySelectorAll('#wizard [data-step]').forEach((el) => (el.hidden = Number(el.dataset.step) !== step));
    $('wizSteps').textContent = STEP_NAMES.map((name, i) => (i === step ? '● ' : '○ ') + name).join('　');
    $('wizBack').style.visibility = step === 0 ? 'hidden' : 'visible';
    $('wizNext').textContent = step === STEP_NAMES.length - 1 ? 'はじめる' : '次へ';
    if (step === 0) loadSetup();
    if (step === 1) $('wizUsername').value = state?.tiktokUsername ?? '';
  }

  function openWizard() {
    showWizardStep(0);
    $('wizard').showModal();
  }

  $('openWizard').addEventListener('click', openWizard);
  $('wizBack').addEventListener('click', () => showWizardStep(Math.max(0, wizardStep - 1)));
  $('wizNext').addEventListener('click', async () => {
    if (wizardStep === 1) {
      const username = $('wizUsername').value.trim();
      if (username && username !== state?.tiktokUsername) {
        const data = await post('/api/tiktok', { username });
        if (!data?.ok) return;
      }
    }
    if (wizardStep === STEP_NAMES.length - 1) {
      storage('redstone.wizardDone', '1');
      $('wizard').close();
      showTab('tabLive');
      return;
    }
    showWizardStep(wizardStep + 1);
  });
  $('wizard').addEventListener('close', () => storage('redstone.wizardDone', '1'));

  const events = new EventSource('/events');
  events.addEventListener('snapshot', (e) => {
    const { state, logs, activity } = JSON.parse(e.data);
    $('log').replaceChildren();
    logs.forEach(addLog);
    $('feed').replaceChildren();
    (activity ?? []).forEach((a) => addActivity(a, false));
    $('feedEmpty').hidden = $('feed').children.length > 0;
    renderState(state);
    $('offline').style.display = 'none';
  });
  events.addEventListener('state', (e) => renderState(JSON.parse(e.data)));
  events.addEventListener('log', (e) => addLog(JSON.parse(e.data)));
  events.addEventListener('activity', (e) => addActivity(JSON.parse(e.data), true));
  events.addEventListener('error', () => ($('offline').style.display = 'block'));
</script>
</body>
</html>
`;

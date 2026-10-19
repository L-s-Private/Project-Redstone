// 操作画面。exe に入れるため、HTML ごと文字列で持つ。
import { MC_ICON_CSS, MC_ICON_JS } from './mcIconScript.js';

export const PANEL_HTML = String.raw`<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Project Redstone</title>
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
    --muted: #8a8a8a;
    --faint: #565656;
    --invert-bg: #ededed;
    --invert-text: #0a0a0a;
    --ok: #5fb97f;
    --warn: #d0a94f;
    --bad: #d85c55;
    --stop: #7d2621;
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
    font: 13px/1.6 "Yu Gothic UI", "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif;
    font-feature-settings: "palt";
    -webkit-font-smoothing: antialiased;
  }
  ::selection { background: var(--invert-bg); color: var(--invert-text); }
  :focus-visible { outline: 2px solid var(--text); outline-offset: 2px; }
  * { scrollbar-color: var(--line) transparent; scrollbar-width: thin; }

  /* ---- 左のメニュー ---- */
  body > aside {
    grid-row: 1; grid-column: 1;
    display: flex; flex-direction: column; min-height: 0;
    background: var(--sidebar); border-right: 1px solid var(--line-soft); padding: 16px 10px 12px;
  }
  .brand { display: flex; align-items: center; gap: 10px; padding: 2px 8px 18px; }
  .brand-mark { width: 22px; height: 22px; border-radius: 5px; background: var(--invert-bg); position: relative; flex: none; }
  .brand-mark::after { content: ""; position: absolute; inset: 6px; border-radius: 2px; background: var(--bg); }
  .brand b { font-size: 14px; font-weight: 700; letter-spacing: .01em; }
  nav { display: flex; flex-direction: column; gap: 2px; }
  nav button {
    justify-content: flex-start; gap: 10px; width: 100%; padding: 8px 10px;
    background: transparent; border-color: transparent; color: var(--muted); font-weight: 600;
  }
  nav button svg { width: 16px; height: 16px; flex: none; }
  nav button:hover { background: var(--surface); color: var(--text); }
  nav button.active { background: var(--raised); color: var(--text); }
  .status { margin-top: auto; padding: 12px 8px 0; border-top: 1px solid var(--line-soft); display: flex; flex-direction: column; gap: 8px; }
  /* 接続状態: 1行目に名前、2行目にいまの状態 */
  .chip { display: grid; grid-template-columns: 7px minmax(0, 1fr); align-items: center; column-gap: 9px; font-size: 12px; color: var(--muted); }
  .chip span:last-child { grid-column: 2; color: var(--text); line-height: 1.5; }
  .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--faint); }
  .dot.ok { background: var(--ok); }
  .dot.warn { background: var(--warn); }
  .dot.bad { background: var(--bad); }
  .version { color: var(--faint); font-size: 11px; }

  /* ---- 右の画面 ---- */
  main { grid-row: 1; grid-column: 2; display: flex; flex-direction: column; min-height: 0; overflow-y: auto; }
  .page-head {
    position: sticky; top: 0; z-index: 5;
    display: flex; flex-wrap: wrap; align-items: center; gap: 10px;
    padding: 14px 28px; min-height: 64px; background: rgba(10, 10, 10, .9); backdrop-filter: blur(8px);
    border-bottom: 1px solid var(--line-soft);
  }
  .page-head h1 { font-size: 17px; font-weight: 700; margin: 0 auto 0 0; }
  .page { display: flex; flex-direction: column; gap: 16px; padding: 24px 28px 28px; flex: 1; min-height: 0; width: 100%; }
  .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 16px; align-items: start; }
  .card { background: var(--surface); border: 1px solid var(--line-soft); border-radius: var(--radius); padding: 18px 20px; }
  .card h2 { font-size: 13px; font-weight: 700; margin: 0 0 4px; }
  .card .lead { color: var(--muted); font-size: 12px; margin: 0 0 14px; }
  .card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
  .card-head h2 { margin: 0 auto 0 0; }

  /* ---- 入力とボタン ---- */
  button {
    font: inherit; color: var(--text); background: var(--raised); border: 1px solid var(--line);
    border-radius: var(--radius-sm); padding: 6px 12px; cursor: pointer; white-space: nowrap;
    display: inline-flex; align-items: center; justify-content: center; gap: 7px;
    transition: background-color .12s, border-color .12s, color .12s;
  }
  button:hover { background: var(--hover); }
  button:disabled { opacity: .4; cursor: default; }
  .primary, .next { background: var(--invert-bg); color: var(--invert-text); border-color: var(--invert-bg); font-weight: 700; }
  .primary:hover, .next:hover { background: #ffffff; }
  .ghost { background: transparent; border-color: transparent; color: var(--muted); }
  .ghost:hover { background: var(--raised); color: var(--text); }
  .danger { background: var(--stop); border-color: var(--stop); color: #fff; font-weight: 700; }
  .danger:hover { background: #962e28; }
  .lg { padding: 9px 18px; font-size: 13px; }
  label { display: block; font-size: 12px; color: var(--muted); margin-bottom: 6px; }
  input, select {
    font: inherit; color: var(--text); background: var(--bg); border: 1px solid var(--line);
    border-radius: var(--radius-sm); padding: 6px 10px; max-width: 100%; height: 32px;
  }
  input { width: 100%; }
  input:hover, select:hover { border-color: #3a3a3a; }
  input:focus, select:focus { outline: none; border-color: var(--text); }
  input[type="number"] { font-variant-numeric: tabular-nums; }
  .row { display: flex; gap: 8px; }
  .row > * { min-width: 0; }
  .row > button { flex: none; }
  .hint { color: var(--muted); font-size: 12px; line-height: 1.7; margin: 10px 0 0; max-width: 72ch; }
  .quick { display: flex; flex-wrap: wrap; gap: 6px; }
  .quick + .quick { margin-top: 6px; }
  code { flex: 1; background: var(--bg); border: 1px solid var(--line); padding: 6px 10px; border-radius: var(--radius-sm); font-size: 12px; color: var(--muted); word-break: break-all; }
  .group-label { font-size: 12px; color: var(--muted); margin: 0 0 8px; }

  /* ---- 配信 ---- */
  #toggle.paused { background: var(--invert-bg); color: var(--invert-text); border-color: var(--invert-bg); }
  .banner { padding: 10px 14px; border-radius: var(--radius-sm); border: 1px solid var(--warn); color: var(--warn); font-weight: 600; }
  .stats { display: grid; grid-template-columns: repeat(4, 1fr); }
  .stat { padding: 2px 16px; }
  .stat + .stat { border-left: 1px solid var(--line); }
  .stat small { display: block; color: var(--muted); font-size: 12px; }
  .stat b { display: block; font-size: 22px; font-weight: 600; font-variant-numeric: tabular-nums; line-height: 1.3; }
  .log-card { display: flex; flex-direction: column; flex: 1; min-height: 280px; }
  #log { list-style: none; margin: 0; padding: 0; flex: 1; min-height: 0; overflow-y: auto; font-variant-numeric: tabular-nums; }
  #log li { padding: 5px 0; border-bottom: 1px solid var(--line-soft); display: flex; gap: 14px; }
  #log time { color: var(--faint); flex: none; }
  #log span { display: inline-flex; align-items: center; flex-wrap: wrap; }
  #log .ok { color: var(--text); }
  #log .info, #log .gift { color: var(--muted); }
  #log .warn { color: var(--warn); }
  #log .error { color: var(--bad); }

  /* 埋め立ての状況（配信中にいちばん見るところなので大きく） */
  .fill-hero { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; }
  .fill-round small, .fill-pct small { display: block; color: var(--muted); font-size: 12px; margin-bottom: 4px; }
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
  .fill-detail { color: var(--muted); font-size: 12px; }
  .fill-buttons { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--line-soft); }
  .empty { display: flex; align-items: center; justify-content: space-between; gap: 16px; color: var(--muted); }

  /* ---- 埋め立ての設定 ---- */
  .fields { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 14px 14px; }
  .fields select { width: 100%; }
  .tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 6px; }
  .tiles button {
    flex-direction: column; gap: 8px; padding: 12px 4px 9px; font-size: 11px;
    color: var(--muted); background: var(--bg); border-color: var(--line-soft);
  }
  .tiles button:hover { background: var(--raised); color: var(--text); }
  .tiles button.selected { border-color: var(--text); color: var(--text); background: var(--raised); }

  /* ---- 接続と準備 ---- */
  .checks { list-style: none; margin: 0 0 14px; padding: 0; }
  .checks li { display: flex; gap: 10px; align-items: baseline; padding: 6px 0; border-bottom: 1px solid var(--line-soft); }
  .checks li:last-child { border-bottom: 0; }
  .checks .mark { width: 14px; flex: none; text-align: center; font-weight: 700; }
  .checks .yes .mark { color: var(--muted); }
  .checks .no .mark { color: var(--bad); }
  .checks small { color: var(--faint); display: block; font-size: 11px; word-break: break-all; }
  .ready { padding: 10px 12px; border-radius: var(--radius-sm); border: 1px solid var(--line); font-size: 12px; }

  /* ---- 妨害の設定 ---- */
  /* ルールは1行ずつ。見出しは一番上に1回だけ */
  .section-head { margin-bottom: 12px; }
  .section-head h2 { font-size: 13px; font-weight: 700; margin: 0 0 2px; }
  .section-head .lead { color: var(--muted); font-size: 12px; margin: 0; }
  .count { color: var(--faint); font-weight: 600; margin-left: 4px; }
  .rule-list { container-type: inline-size; }
  .rule-rows { display: flex; flex-direction: column; gap: 6px; }
  .rule {
    display: grid; align-items: center; column-gap: 12px;
    grid-template-columns: 44px minmax(270px, 1.4fr) 16px minmax(250px, .9fr) minmax(140px, .8fr) 96px 28px;
    grid-template-areas: "order when arrow then text cool del";
    background: var(--surface); border: 1px solid var(--line-soft); border-radius: var(--radius); padding: 8px 8px 8px 6px;
  }
  .rule:hover { border-color: var(--line); }
  .rule-header { background: transparent; border-color: transparent; padding-top: 0; padding-bottom: 6px; font-size: 11px; color: var(--faint); }
  .rule-header:hover { border-color: transparent; }
  .rule-header span:nth-child(1) { grid-area: order; text-align: center; }
  .rule-header span:nth-child(2) { grid-area: when; }
  .rule-header span:nth-child(4) { grid-area: then; }
  .rule-header span:nth-child(5) { grid-area: text; }
  .rule-header span:nth-child(6) { grid-area: cool; }
  .rule-order { grid-area: order; display: flex; align-items: center; justify-content: center; gap: 2px; }
  .rule-no { color: var(--faint); font-size: 12px; font-variant-numeric: tabular-nums; min-width: 14px; text-align: right; }
  .rule-move { display: flex; flex-direction: column; }
  .rule-move button { padding: 0 5px; font-size: 8px; line-height: 14px; height: 15px; }
  .icon-only { padding: 4px 8px; background: transparent; border-color: transparent; color: var(--muted); font-size: 12px; }
  .icon-only:hover { background: var(--raised); color: var(--text); }
  .icon-only:disabled { opacity: .2; }
  .rule-slot { min-width: 0; }
  .rule-when { grid-area: when; }
  .rule-arrow { grid-area: arrow; color: var(--faint); display: flex; justify-content: center; }
  .rule-arrow svg { width: 14px; height: 14px; }
  .rule-then { grid-area: then; }
  .slot-row { display: flex; align-items: center; gap: 6px; min-width: 0; }
  .slot-row > select { flex: none; width: 98px; }
  .slot-row > .gift-pick { flex: 1; justify-content: flex-start; }
  .gift-pick .caret { margin-left: auto; }
  .slot-row .with-icon { flex: 0 1 auto; min-width: 0; }
  .slot-row .with-icon select { width: 150px; min-width: 0; flex: 0 1 auto; }
  .rule-text { grid-area: text; display: flex; align-items: center; gap: 8px; min-width: 0; }
  .rule-cooldown { grid-area: cool; display: flex; align-items: center; gap: 8px; }
  .inline-label { display: none; font-size: 11px; color: var(--faint); white-space: nowrap; }
  .rule .del { grid-area: del; padding: 4px 6px; }
  .rule .del:hover { color: var(--bad); }
  .grow-input { flex: 1; min-width: 0; }
  /* 狭いとき: 表示する文と待ち時間を2段目に（見出しの代わりに小さなラベル） */
  @container (max-width: 940px) {
    .rule {
      grid-template-columns: 44px minmax(0, 1.3fr) 16px minmax(0, 1fr) auto 28px;
      grid-template-areas: "order when arrow then then del" ". text text text cool cool";
      row-gap: 8px;
    }
    .inline-label { display: inline; }
    .rule-header span:nth-child(5), .rule-header span:nth-child(6) { display: none; }
    .rule-text input, .rule-cooldown input { height: 28px; font-size: 12px; }
  }
  input.invalid { border-color: var(--warn); }
  .num-field { display: inline-flex; align-items: center; gap: 6px; color: var(--muted); font-size: 12px; white-space: nowrap; }
  .num-field .affix { color: var(--muted); }
  /* ギフトを選ぶボタン */
  .gift-pick { gap: 8px; height: 32px; padding: 3px 10px 3px 6px; background: var(--bg); max-width: 100%; min-width: 0; }
  .gift-pick .gift-img { width: 22px; height: 22px; }
  .gift-pick-name { overflow: hidden; text-overflow: ellipsis; font-weight: 600; }
  .gift-pick small { color: var(--faint); font-variant-numeric: tabular-nums; }
  .gift-pick .caret { color: var(--faint); font-size: 10px; }
  .gift-pick.unknown { border-color: var(--warn); }
  .gift-pick.unset { border-style: dashed; color: var(--warn); border-color: var(--warn); padding-left: 10px; }
  .rule-empty { border: 1px dashed var(--line); border-radius: var(--radius); padding: 28px; text-align: center; color: var(--muted); }
  .rule-empty p { margin: 0; }
  .rule-empty .hint { margin: 6px auto 0; }
  .dirty { color: var(--warn); font-size: 12px; }
  /* 最近届いたギフト（横1列。押すとルールに追加） */
  .recent-strip {
    display: flex; align-items: center; gap: 14px; min-width: 0;
    padding: 10px 14px; border: 1px solid var(--line-soft); border-radius: var(--radius); background: var(--surface);
  }
  .recent-title { font-size: 12px; font-weight: 700; white-space: nowrap; }
  .recent { display: flex; gap: 6px; overflow-x: auto; min-width: 0; padding: 2px 0; }
  .recent button { flex: none; padding: 3px 10px 3px 6px; font-size: 12px; }
  .recent-empty { color: var(--faint); font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* ---- テスト ---- */
  details summary { cursor: pointer; color: var(--muted); font-size: 12px; }
  details pre { margin: 10px 0 0; font-size: 11px; white-space: pre-wrap; color: var(--muted); }

  /* ---- ダイアログ ---- */
  dialog {
    background: var(--surface); color: var(--text); border: 1px solid var(--line); border-radius: 12px;
    padding: 28px; width: min(560px, calc(100vw - 32px));
  }
  dialog::backdrop { background: rgba(0, 0, 0, .75); }
  dialog h2 { margin: 0 0 6px; font-size: 18px; font-weight: 700; }
  .steps { color: var(--faint); font-size: 12px; margin-bottom: 18px; }
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
    flex-direction: column; gap: 2px; padding: 10px 4px; white-space: normal; font-size: 12px; line-height: 1.35;
    background: var(--bg); border-color: var(--line-soft);
  }
  .gift-grid button:hover { background: var(--raised); border-color: var(--line); }
  .gift-grid small { color: var(--faint); font-variant-numeric: tabular-nums; }
</style>
</head>
<body>
<aside>
  <div class="brand"><span class="brand-mark"></span><b>Project Redstone</b></div>
  <nav>
    <button class="active" data-tab="tabLive">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="2"/><path d="M4.5 4.5a5 5 0 0 0 0 7M11.5 4.5a5 5 0 0 1 0 7M2.4 2.4a8 8 0 0 0 0 11.2M13.6 2.4a8 8 0 0 1 0 11.2"/></svg>配信</button>
    <button data-tab="tabFill">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M8 1.8 14 5v6l-6 3.2L2 11V5z"/><path d="M2 5l6 3.2L14 5M8 8.2v6"/></svg>埋め立て</button>
    <button data-tab="tabRules">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 4h7M12 4h2M2 8h2M7 8h7M2 12h9M14 12h0"/><circle cx="10.5" cy="4" r="1.5"/><circle cx="5.5" cy="8" r="1.5"/><circle cx="12.5" cy="12" r="1.5"/></svg>妨害の設定<span class="badge" id="rulesBadge" title="保存していない変更があります" hidden></span></button>
    <button data-tab="tabDebug">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M6 1.8h4M6.8 1.8v4.4L2.6 13a.8.8 0 0 0 .7 1.2h9.4a.8.8 0 0 0 .7-1.2L9.2 6.2V1.8"/><path d="M4.4 10h7.2"/></svg>テスト</button>
    <button data-tab="tabSetup">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M6 1.5v3M10 1.5v3M4 4.5h8v3a4 4 0 0 1-8 0zM8 11.5v3"/></svg>接続と準備</button>
  </nav>
  <div class="status">
    <span class="chip"><span class="dot" id="pauseDot"></span>妨害<span id="pauseText">—</span></span>
    <span class="chip"><span class="dot" id="tiktokDot"></span>TikTok<span id="tiktokText">—</span></span>
    <span class="chip"><span class="dot" id="modDot"></span>マイクラ<span id="modText">—</span></span>
    <span class="version" id="appVersion"></span>
  </div>
</aside>

<main id="tabLive">
  <div class="page-head">
    <h1>配信</h1>
    <button class="lg" id="toggle">一時停止</button>
    <button class="lg danger" id="stop">全妨害ストップ</button>
  </div>
  <div class="page">
    <div class="banner" id="pausedBanner" hidden>一時停止中です。ギフトが来ても妨害は出ません。</div>

    <section class="card">
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
      <div class="empty" id="fillEmpty">
        <span>埋め立ては始まっていません。</span>
        <button data-goto="tabFill">埋め立ての設定へ</button>
      </div>
    </section>

    <section class="card">
      <div class="stats">
        <div class="stat"><small>届いた</small><b id="received">0</b></div>
        <div class="stat"><small>妨害を出した</small><b id="sent">0</b></div>
        <div class="stat"><small>見送り</small><b id="skipped">0</b></div>
        <div class="stat"><small>失敗</small><b id="failed">0</b></div>
      </div>
    </section>

    <section class="card log-card">
      <div class="card-head"><h2>ログ</h2></div>
      <ul id="log"></ul>
    </section>
  </div>
</main>

<main id="tabFill" hidden>
  <div class="page-head">
    <h1>埋め立て</h1>
    <button class="lg primary" id="fillStart">埋め立てを始める</button>
    <button class="lg" id="fillStop" hidden>埋め立てを終える</button>
  </div>
  <div class="page">
    <div class="banner" id="fillBusy" hidden>埋め立て中です。設定を変えるときは、いったん終えてから始め直してください。</div>
    <div id="fillIdle">
      <div class="grid-2">
        <section class="card">
          <h2>見た目</h2>
          <p class="lead">配信に映るブロックと枠です。</p>
          <p class="group-label">置くブロック</p>
          <select id="fillBlock" data-tiles aria-label="置くブロック">
            <option value="amethyst_block">アメジスト</option><option value="diamond_block">ダイヤモンド</option>
            <option value="emerald_block">エメラルド</option><option value="gold_block">金</option>
            <option value="iron_block">鉄</option><option value="lapis_block">ラピスラズリ</option>
            <option value="redstone_block">レッドストーン</option><option value="quartz_block">クォーツ</option>
          </select>
          <p class="group-label" style="margin-top: 16px;">枠の素材</p>
          <select id="fillWall" data-tiles aria-label="枠の素材">
            <option value="glass">ガラス</option><option value="white_stained_glass">白色のガラス</option>
            <option value="light_blue_stained_glass">空色のガラス</option><option value="bedrock">岩盤</option>
          </select>
        </section>
        <section class="card">
          <h2>ゲームの決まり</h2>
          <p class="lead">埋めきって、決めた秒数崩されなければ 1ラウンドクリアです。</p>
          <div class="fields">
            <div><label for="fillRounds">ラウンド数</label><input id="fillRounds" type="number" min="1" max="99"></div>
            <div><label for="fillCountdown">埋めきってからクリアまで（秒）</label><input id="fillCountdown" type="number" min="0" max="600"></div>
            <div><label for="fillWidth">枠の幅（マス）</label><input id="fillWidth" type="number" min="3" max="41" step="2"></div>
            <div><label for="fillHeight">枠の高さ（マス）</label><input id="fillHeight" type="number" min="1" max="30"></div>
            <div><label for="fillSkyY">枠を作る高さ（Y）</label><input id="fillSkyY" type="number" min="-60" max="300"></div>
          </div>
        </section>
        <section class="card">
          <h2>操作の速さ</h2>
          <p class="lead">埋め立て中だけ変わり、終えると元に戻ります。</p>
          <div class="fields">
            <div><label for="fillPlaceSpeed">置く速さ（押しっぱなし）</label><select id="fillPlaceSpeed">
              <option value="normal">ふつう（1秒に5個）</option><option value="fast">速い（1秒に10個）</option><option value="fastest">とても速い（1秒に20個）</option>
            </select></div>
            <div><label for="fillBreakSpeed">壊す速さ（押しっぱなし）</label><select id="fillBreakSpeed">
              <option value="normal">ふつう（バニラと同じ）</option><option value="fast">速い（1秒に10個）</option><option value="fastest">とても速い（1秒に20個）</option>
            </select></div>
            <div><label for="fillReach">届く距離（マス）</label><input id="fillReach" type="number" min="1" max="64"></div>
          </div>
        </section>
        <section class="card">
          <h2>始めるとどうなるか</h2>
          <p class="hint" style="margin: 6px 0 0;">プレイヤーの真上の空中に枠ができ、中へ移動します。置くブロックは減りません。枠は壊れず、枠より上には置けません。落ちたら枠の上に戻ります。TNT とモブは枠の中に出ます。</p>
        </section>
      </div>
    </div>
  </div>
</main>

<main id="tabRules" hidden>
  <div class="page-head">
    <h1>妨害の設定</h1>
    <span class="dirty" id="dirty" hidden>保存していない変更があります</span>
    <button class="lg" id="addRule">ルールを追加</button>
    <button class="lg ghost" id="revertRules">元に戻す</button>
    <button class="lg next" id="saveRules">保存する</button>
  </div>
  <div class="page">
    <div class="recent-strip" title="押すと、そのギフトのルールを一番上に追加します">
      <span class="recent-title">最近届いたギフト</span>
      <div class="recent" id="recent"></div>
    </div>
    <section class="rules-section">
      <div class="section-head">
        <h2>ルール <span class="count" id="ruleCount"></span></h2>
        <p class="lead">上から順に見て、最初に合ったルールの妨害を出します。ギフトを連打すると数も増えます。</p>
      </div>
      <div class="rule-list">
        <div class="rule rule-header" id="ruleHeader" aria-hidden="true">
          <span>順番</span><span>きっかけ</span><span></span><span>出す妨害</span><span>配信画面に出す文</span><span title="同じルールを続けて出さない秒数">待ち時間</span><span></span>
        </div>
        <div id="ruleRows" class="rule-rows"></div>
      </div>
    </section>
  </div>
</main>

<main id="tabDebug" hidden>
  <div class="page-head"><h1>テスト</h1></div>
  <div class="page">
    <div class="grid-2">
      <section class="card">
        <h2>ギフトを送ったことにする</h2>
        <p class="lead">「妨害の設定」のルールどおりに妨害が出ます。</p>
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
      </section>
      <section class="card">
        <h2>視聴者の反応</h2>
        <p class="lead">いいね・フォロー・シェアが届いたことにします。</p>
        <div class="quick">
          <button data-test="like" data-count="100">いいね +100</button>
          <button data-test="like" data-count="1000">いいね +1000</button>
          <button data-test="like" data-count="10000">いいね +10000</button>
          <button data-test="follow">フォロー</button>
          <button data-test="share">シェア</button>
        </div>
      </section>
    </div>
    <section class="card">
      <h2>妨害をそのまま出す</h2>
      <p class="lead">ルールを通さずに出します。一時停止中は出ません。</p>
      <div class="quick">
        <button data-action="tnt" data-icon="tnt">TNT ×1</button>
        <button data-action="tnt" data-count="5" data-icon="tnt">TNT ×5</button>
        <button data-action="tnt" data-count="20" data-icon="tnt">TNT ×20</button>
        <button data-action="fill_help" data-count="10" data-icon="fill_help">お助け +10</button>
        <button data-action="fill_help" data-count="64" data-icon="fill_help">お助け +64</button>
        <button data-action="fill_expand" data-icon="fill_expand">枠 +1</button>
        <button data-action="fill_shrink" data-icon="fill_shrink">枠 −1</button>
      </div>
      <div class="quick">
        <button data-action="mob" data-mob="zombie" data-icon="zombie">ゾンビ</button>
        <button data-action="mob" data-mob="skeleton" data-icon="skeleton">スケルトン</button>
        <button data-action="mob" data-mob="creeper" data-icon="creeper">クリーパー</button>
        <button data-action="mob" data-mob="spider" data-icon="spider">クモ</button>
        <button data-action="mob" data-mob="witch" data-icon="witch">ウィッチ</button>
        <button data-action="mob" data-mob="silverfish" data-icon="silverfish">シルバーフィッシュ</button>
        <button data-action="mob" data-mob="pig" data-icon="pig">ブタ</button>
      </div>
    </section>
    <section class="card">
      <h2>埋め立てを進める</h2>
      <p class="lead">埋め立て中に使えます。下の段から順に埋めます。</p>
      <div class="quick">
        <button data-action="fill_set" data-percent="100" data-icon="fill_set">一気に埋める（100%）</button>
        <button data-action="fill_set" data-percent="90" data-icon="fill_set">90% まで</button>
        <button data-action="fill_set" data-percent="50" data-icon="fill_set">50% まで</button>
        <button data-action="fill_set" data-percent="0" data-icon="glass">枠の中を空にする</button>
      </div>
    </section>
    <section class="card">
      <details>
        <summary>いまの状態（困ったときに見る）</summary>
        <pre id="debugState"></pre>
      </details>
    </section>
  </div>
</main>

<main id="tabSetup" hidden>
  <div class="page-head">
    <h1>接続と準備</h1>
    <button class="lg" id="openWizard">はじめの設定をやり直す</button>
  </div>
  <div class="page">
    <div class="grid-2">
      <section class="card">
        <h2>マイクラ（Java版 <span id="mcVersion">26.3</span>）</h2>
        <p class="lead">MOD を動かすのに必要なものです。</p>
        <ul class="checks setup-checks"></ul>
        <div class="ready setup-ready" hidden>準備できています。ランチャーで「fabric-loader-<span class="mcv"></span>」を選んで起動してください。</div>
        <div class="setup-todo" hidden>
          <button class="primary install-btn" style="width: 100%;">まとめて導入する</button>
          <p class="hint">マイクラを閉じた状態で押してください。足りないものだけ入れます。</p>
        </div>
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
      <section class="card">
        <h2>配信画面に表示（オーバーレイ）</h2>
        <p class="lead">LIVE Studio で「リンク」のソースを追加して、この URL を貼ります。妨害が出たときと埋め立て中に表示されます。</p>
        <div class="row">
          <code id="overlayUrl"></code>
          <button id="copyOverlay">コピー</button>
        </div>
      </section>
    </div>
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
    const img = Object.assign(document.createElement('img'), { src: url, className: 'gift-img' + (big ? ' big' : ''), alt: '', referrerPolicy: 'no-referrer' });
    img.addEventListener('error', () => img.remove());
    return img;
  }
  let gifts = [];
  let giftsVersion = -1;
  /** ギフト一覧から、日本語名・英語名のどちらでも探す */
  function giftFor(name) {
    const key = String(name ?? '').trim().toLowerCase();
    if (!key) return null;
    return gifts.find((g) => g.nameJa.toLowerCase() === key) ?? gifts.find((g) => g.name.toLowerCase() === key) ?? null;
  }
  async function loadGifts(version) {
    giftsVersion = version;
    try {
      const res = await fetch('/api/gifts');
      if (!res.ok) return;
      gifts = (await res.json()).gifts;
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

    const mod = !state.mod.connected ? ['bad', 'ワールドを開いてください']
      : state.mod.players === 0 ? ['warn', 'ワールドに入っていません']
      : state.mod.players === null ? ['warn', '確認中…']
      : ['ok', '接続中'];
    $('modDot').className = 'dot ' + mod[0];
    $('modText').textContent = mod[1];

    $('toggle').textContent = state.paused ? '再開する' : '一時停止';
    $('toggle').classList.toggle('paused', state.paused);
    $('pausedBanner').hidden = !state.paused;
    $('pauseDot').className = 'dot ' + (state.paused ? 'warn' : 'ok');
    $('pauseText').textContent = state.paused ? '一時停止中' : '受け付け中';
    for (const key of ['received', 'sent', 'skipped', 'failed']) $(key).textContent = state.stats[key];

    if (document.activeElement !== $('username')) $('username').value = state.tiktokUsername;

    const buttonsKey = JSON.stringify(state.testButtons);
    if ($('quick').dataset.key !== buttonsKey) {
      $('quick').dataset.key = buttonsKey;
      $('quick').replaceChildren(...state.testButtons.map(({ label, body }) => {
        const b = document.createElement('button');
        if (body.kind === 'gift' && !body.diamonds) b.append(giftIcon(body.giftName));
        b.append(label);
        b.addEventListener('click', () => post('/api/test', body, { button: b, done: '「' + label + '」が届いたことにしました' }));
        return b;
      }));
    }
    if (state.giftCatalogVersion !== giftsVersion) loadGifts(state.giftCatalogVersion);

    renderFill(state.fill);
    $('debugState').textContent = JSON.stringify({ mod: { connected: state.mod.connected, players: state.mod.players }, fill: state.fill, paused: state.paused, stats: state.stats }, null, 2);
    renderFillSettings(state.fillSettings);
    if (!rulesDirty) loadRules(state.rules);
    renderRecent();
    if (!wizardChecked) {
      wizardChecked = true;
      if (!state.tiktokUsername && !storage('redstone.wizardDone')) openWizard();
    }
  }

  function addLog(entry) {
    const log = $('log');
    const stick = log.scrollTop + log.clientHeight >= log.scrollHeight - 20;
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
    if (stick) log.scrollTop = log.scrollHeight;
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
  function askConfirm({ title, text, ok }) {
    $('confirmTitle').textContent = title;
    $('confirmText').textContent = text;
    $('confirmOk').textContent = ok;
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
      [setup.mod.upToDate, 'Project Redstone MOD', setup.mod.upToDate ? setup.mod.fileName : setup.mod.installed ? '古いバージョン（' + setup.mod.fileName + '）' : '未導入'],
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
  }

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

  $('overlayUrl').textContent = location.origin + '/overlay';
  $('copyOverlay').addEventListener('click', async () => {
    await navigator.clipboard.writeText(location.origin + '/overlay');
    $('copyOverlay').textContent = 'コピーしました';
    setTimeout(() => ($('copyOverlay').textContent = 'コピー'), 1500);
  });

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
    storage('redstone.tab', id);
  }
  document.querySelectorAll('nav [data-tab]').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));
  document.querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.goto)));
  // 前に開いていた画面を開く
  const lastTab = storage('redstone.tab');
  if (lastTab && $(lastTab)?.tagName === 'MAIN') showTab(lastTab);

  // ---- ルールの表 ----
  const ACTIONS = [
    ['tnt', 'TNT'], ['mob', 'モブ'], ['fill_expand', '枠を広げる'], ['fill_shrink', '枠を縮める'],
    ['fill_help', 'お助けブロック'], ['message', 'メッセージだけ'],
  ];
  /** 数の単位 */
  const UNITS = { tnt: '個', mob: '体', fill_expand: 'マス', fill_shrink: 'マス', fill_help: '個' };
  const MOBS = [['zombie', 'ゾンビ'], ['skeleton', 'スケルトン'], ['creeper', 'クリーパー'], ['spider', 'クモ'], ['witch', 'ウィッチ'], ['silverfish', 'シルバーフィッシュ'], ['pig', 'ブタ']];
  const TRIGGERS = [['gift', 'ギフト'], ['minDiamonds', 'ダイヤ数で'], ['likes', 'いいね'], ['follow', 'フォロー'], ['share', 'シェア'], ['giftId', 'ギフトID']];
  const NO_COUNT = new Set(['message']);
  const MAX_COUNT = { tnt: 20, mob: 10, fill_expand: 5, fill_shrink: 5, fill_help: 64 };

  let rows = [];
  let rulesDirty = false;
  let savedRulesKey = '';

  function toRow(rule) {
    const trigger = rule.event ?? (rule.gift !== undefined ? 'gift' : rule.likes !== undefined ? 'likes' : rule.minDiamonds !== undefined ? 'minDiamonds' : 'giftId');
    const value = rule.gift ?? rule.likes ?? rule.minDiamonds ?? rule.giftId ?? '';
    return { trigger, value: String(value), action: rule.action, mob: rule.mob ?? 'zombie',
      label: rule.label ?? '', count: rule.count ?? 1, cooldownSec: rule.cooldownSec ?? 0, maxCount: rule.maxCount };
  }

  function toRule(row) {
    const rule = {};
    if (row.trigger === 'follow' || row.trigger === 'share') rule.event = row.trigger;
    else if (row.trigger === 'minDiamonds') rule.minDiamonds = Number(row.value);
    else if (row.trigger === 'likes') rule.likes = Number(row.value);
    else if (row.trigger === 'giftId') rule.giftId = row.value.trim();
    else rule.gift = row.value;
    rule.action = row.action;
    if (row.action === 'mob') rule.mob = row.mob;
    if (!NO_COUNT.has(row.action)) rule.count = Number(row.count);
    if (row.label) rule.label = row.label;
    if (Number(row.cooldownSec) > 0) rule.cooldownSec = Number(row.cooldownSec);
    if (row.maxCount !== undefined) rule.maxCount = row.maxCount;
    return rule;
  }

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
  }

  function select(options, value, onChange) {
    const el = document.createElement('select');
    for (const [v, text] of options) el.append(Object.assign(document.createElement('option'), { value: v, textContent: text }));
    el.value = value;
    el.addEventListener('change', () => onChange(el.value));
    return el;
  }

  function input(value, onInput, { list, ...attrs } = {}) {
    const el = Object.assign(document.createElement('input'), attrs);
    if (list) el.setAttribute('list', list); // list は代入できない
    el.value = value;
    el.addEventListener('input', () => onInput(el.value));
    return el;
  }

  function withIcon(iconName, el) {
    const wrap = document.createElement('div');
    wrap.className = 'with-icon';
    wrap.append(mcIcon(iconName), el);
    return wrap;
  }

  function el(tag, className, ...children) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.append(...children);
    return node;
  }

  /** ギフトを選ぶボタン（絵・名前・ダイヤ数）。押すとギフトの一覧が開く */
  function giftPickButton(row, onPicked) {
    const b = el('button', 'gift-pick' + (row.value.trim() ? '' : ' unset'));
    b.type = 'button';
    const gift = giftFor(row.value);
    if (!row.value.trim()) {
      b.append(el('span', 'gift-pick-name', 'ギフトを選ぶ'));
    } else {
      b.append(giftIcon(row.value), el('span', 'gift-pick-name', gift?.nameJa ?? row.value));
      if (gift) b.append(el('small', '', '💎' + gift.diamonds));
      else b.classList.add('unknown');
    }
    b.append(el('span', 'caret', '▾'));
    b.title = !row.value.trim() ? 'ギフトを一覧から選ぶ'
      : gift ? (gift.nameJa ?? row.value) + '（💎' + gift.diamonds + '）。押すと選び直せます'
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

  /** 妨害の選択肢。モブは種類ごとに並べて、1回で選べるようにする（値は 'mob:creeper' の形） */
  function actionSelect(row, onChange) {
    const s = document.createElement('select');
    s.setAttribute('aria-label', '出す妨害');
    const add = (parent, value, text) => parent.append(Object.assign(document.createElement('option'), { value, textContent: text }));
    for (const [v, text] of ACTIONS) if (v !== 'mob') add(s, v, text);
    const mobs = Object.assign(document.createElement('optgroup'), { label: 'モブを出す' });
    for (const [v, text] of MOBS) add(mobs, 'mob:' + v, text);
    s.append(mobs);
    s.value = row.action === 'mob' ? 'mob:' + row.mob : row.action;
    s.addEventListener('change', () => {
      const [action, mob] = s.value.split(':');
      row.action = action;
      if (mob) row.mob = mob;
      onChange();
    });
    return s;
  }

  /** ルールを1行ずつ「きっかけ → 出す妨害」と並べる。狭いウィンドウでは表示する文・待ち時間を2段目へ */
  function renderRows() {
    const change = (row, key, rerender) => (value) => {
      row[key] = value;
      setDirty(true);
      if (rerender) renderRows();
    };
    $('ruleCount').textContent = rows.length ? rows.length + '件' : '';
    $('ruleHeader').hidden = rows.length === 0;
    if (rows.length === 0) {
      const empty = el('div', 'rule-empty', el('p', '', 'ルールがまだありません。'), el('p', 'hint', '「ルールを追加」から、どのギフトで何を出すかを決めます。'));
      $('ruleRows').replaceChildren(empty);
      return;
    }
    $('ruleRows').replaceChildren(...rows.map((row, i) => {
      // 順番
      const up = Object.assign(el('button', 'icon-only', '▲'), { disabled: i === 0, title: '上へ' });
      const down = Object.assign(el('button', 'icon-only', '▼'), { disabled: i === rows.length - 1, title: '下へ' });
      up.addEventListener('click', () => { [rows[i - 1], rows[i]] = [rows[i], rows[i - 1]]; setDirty(true); renderRows(); });
      down.addEventListener('click', () => { [rows[i + 1], rows[i]] = [rows[i], rows[i + 1]]; setDirty(true); renderRows(); });
      const order = el('div', 'rule-order', el('span', 'rule-no', String(i + 1)), el('span', 'rule-move', up, down));

      // きっかけ
      const when = el('div', 'rule-slot rule-when');
      const whenRow = el('div', 'slot-row', select(TRIGGERS, row.trigger, (v) => {
        row.trigger = v;
        row.value = v === 'likes' ? '1000' : v === 'minDiamonds' ? '100' : '';
        setDirty(true);
        renderRows();
      }));
      if (row.trigger === 'gift') {
        whenRow.append(giftPickButton(row, (name) => { row.value = name; setDirty(true); renderRows(); }));
      } else if (row.trigger === 'likes') {
        whenRow.append(numberField(row.value, change(row, 'value'), { min: 1, after: '回ごと', width: 80, label: 'いいねの回数' }));
      } else if (row.trigger === 'minDiamonds') {
        whenRow.append(numberField(row.value, change(row, 'value'), { min: 0, before: '💎', after: '以上', width: 72, label: 'ダイヤ数（以上のギフト）' }));
      } else if (row.trigger === 'giftId') {
        whenRow.append(input(row.value, change(row, 'value'), { placeholder: 'ギフトID', className: 'grow-input' }));
      }
      when.append(whenRow);

      // 出す妨害
      const then = el('div', 'rule-slot rule-then');
      const thenRow = el('div', 'slot-row', withIcon(row.action === 'mob' ? row.mob : row.action, actionSelect(row, () => { setDirty(true); renderRows(); })));
      if (!NO_COUNT.has(row.action)) {
        thenRow.append(numberField(row.count, change(row, 'count'), { before: '×', after: UNITS[row.action], min: 1, max: MAX_COUNT[row.action], width: 56, label: '数' }));
      }
      then.append(thenRow);

      // 表示する文（メッセージだけのときは必須）
      const needsLabel = row.action === 'message';
      const label = input(row.label, change(row, 'label'), {
        placeholder: needsLabel ? '出す文を入れてください' : '空なら妨害の名前', maxLength: 100, className: 'grow-input',
      });
      label.setAttribute('aria-label', '配信画面に出す文');
      if (needsLabel && !row.label.trim()) label.classList.add('invalid');
      label.addEventListener('input', () => label.classList.toggle('invalid', needsLabel && !label.value.trim()));
      const text = el('div', 'rule-text', el('span', 'inline-label', '表示する文'), label);
      const cooldown = el('div', 'rule-cooldown', el('span', 'inline-label', '待ち時間'),
        numberField(row.cooldownSec, change(row, 'cooldownSec'), { min: 0, after: '秒', width: 52, label: '待ち時間（秒）' }));

      const del = Object.assign(el('button', 'icon-only del', '✕'), { title: 'このルールを削除' });
      del.addEventListener('click', () => {
        rows.splice(i, 1);
        setDirty(true);
        renderRows();
        toast('ルールを削除しました。「元に戻す」で取り消せます');
      });

      const arrow = el('span', 'rule-arrow');
      arrow.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 8h11M9 4l4 4-4 4"/></svg>';
      return el('div', 'rule', order, when, arrow, then, text, cooldown, del);
    }));
  }

  $('addRule').addEventListener('click', () => {
    const row = toRow({ gift: '', action: 'tnt', count: 1 });
    rows.push(row);
    setDirty(true);
    renderRows();
    $('ruleRows').lastElementChild?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    // いちばん多いのはギフトのルールなので、すぐギフトを選べるようにする
    openGiftPicker((name) => { row.value = name; renderRows(); });
  });
  $('revertRules').addEventListener('click', () => {
    savedRulesKey = '';
    loadRules(state.rules);
  });
  async function saveRules(rules) {
    const data = await post('/api/rules', { rules }, { button: $('saveRules'), done: '妨害の設定を保存しました' });
    if (data?.ok) {
      savedRulesKey = '';
      loadRules(data.state.rules);
      return true;
    }
    return false;
  }
  $('saveRules').addEventListener('click', () => saveRules(rows.map(toRule)));
  // Ctrl+S で保存（妨害の設定の画面を開いているとき）
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && !$('tabRules').hidden) {
      e.preventDefault();
      if (rulesDirty) saveRules(rows.map(toRule));
    }
  });

  // ---- 埋め立てモード ----
  function renderFill(fill) {
    // 配信画面は状況、埋め立て画面は設定（埋め立て中は変えられない）
    $('fillRunning').hidden = !fill;
    $('fillEmpty').hidden = !!fill;
    $('fillIdle').hidden = !!fill;
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
    $('fillDetail').textContent = fill.filled + ' / ' + fill.total + ' マス（幅' + fill.width + '・高さ' + fill.height + '）';
  }

  // 前回の設定を入れる（入力中は上書きしない）
  const FILL_FIELDS = {
    fillWidth: 'width', fillHeight: 'height', fillCountdown: 'countdown', fillRounds: 'rounds', fillWall: 'wall', fillBlock: 'block',
    fillSkyY: 'skyY', fillReach: 'reach', fillPlaceSpeed: 'placeSpeed', fillBreakSpeed: 'breakSpeed',
  };
  let fillFormDirty = false;
  Object.keys(FILL_FIELDS).forEach((id) => $(id).addEventListener('input', () => (fillFormDirty = true)));
  function renderFillSettings(settings) {
    if (fillFormDirty || !settings) return;
    for (const [id, key] of Object.entries(FILL_FIELDS)) {
      $(id).value = settings[key];
      $(id).dispatchEvent(new Event('sync'));
    }
  }

  $('fillStart').addEventListener('click', async () => {
    const body = {};
    for (const [id, key] of Object.entries(FILL_FIELDS)) {
      body[key] = $(id).tagName === 'SELECT' ? $(id).value : Number($(id).value);
    }
    const data = await post('/api/fill/start', body, { button: $('fillStart'), done: '埋め立てを始めました' });
    if (data?.ok) {
      fillFormDirty = false;
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
  function renderRecent() {
    if (!state) return;
    const recent = state.recentGifts;
    if (!recent.length) {
      $('recent').replaceChildren(Object.assign(document.createElement('span'), { className: 'recent-empty', textContent: 'まだありません。TikTok LIVE につながると、届いたギフトがここに並びます' }));
      return;
    }
    $('recent').replaceChildren(...recent.map((gift) => {
      const b = document.createElement('button');
      b.className = 'icon-btn';
      b.append(giftIcon(gift.image || gift.giftName), gift.giftName + '（💎' + gift.diamonds + '）');
      b.addEventListener('click', () => {
        rows.unshift(toRow({ gift: gift.giftName, action: 'tnt', count: 1 }));
        setDirty(true);
        renderRows();
        toast('「' + gift.giftName + '」のルールを一番上に追加しました。妨害を選んで保存してください');
      });
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
      .filter((g) => !seen.has(g.nameJa) && seen.add(g.nameJa))
      .slice(0, 300);
    $('giftGrid').replaceChildren(...shown.map((g) => {
      const b = document.createElement('button');
      b.type = 'button';
      const small = Object.assign(document.createElement('small'), { textContent: '💎' + g.diamonds });
      b.append(giftIcon(g.image, true), g.nameJa, small);
      b.addEventListener('click', () => {
        $('giftPicker').close();
        onGiftPicked?.(g.nameJa);
      });
      return b;
    }));
    $('giftPickerHint').textContent = gifts.length === 0
      ? 'ギフトの一覧をまだ取れていません。インターネットにつながっているか確かめて、アプリを起動し直してください。'
      : 'ダイヤの少ない順です。' + (shown.length < gifts.length ? '名前で探すと、ほかのギフトも出ます。' : '');
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
    const { state, logs } = JSON.parse(e.data);
    $('log').replaceChildren();
    logs.forEach(addLog);
    renderState(state);
    $('offline').style.display = 'none';
  });
  events.addEventListener('state', (e) => renderState(JSON.parse(e.data)));
  events.addEventListener('log', (e) => addLog(JSON.parse(e.data)));
  events.addEventListener('error', () => ($('offline').style.display = 'block'));
</script>
</body>
</html>
`;

// LIVE Studio に貼るオーバーレイ。背景は透明で、妨害が出たときと、埋め立て中だけ表示する。
import { MC_ICON_CSS, MC_ICON_JS } from './mcIconScript.js';

export const OVERLAY_HTML = String.raw`<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>STATIC ARC オーバーレイ</title>
<style>
  html, body { margin: 0; background: transparent; overflow: hidden; }
  /* 操作画面と同じグレースケール。ゲーム画面の上でも読めるよう、濃いグレーの面に白い文字 */
  body {
    font: 700 28px/1.3 "Yu Gothic UI", "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif;
    font-feature-settings: "palt";
    color: #ededed;
  }
  #fill {
    position: fixed; left: 24px; right: 24px; top: 24px; display: none;
    padding: 14px 20px 16px; border-radius: 12px; background: rgba(27, 27, 29, .86); border: 1px solid rgba(255, 255, 255, .12);
  }
  #fill .row { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
  #fill .percent { font-family: "Segoe UI Variable Display", "Segoe UI", sans-serif; font-weight: 600; font-size: 44px; line-height: 1; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
  #fill .bar { height: 6px; border-radius: 3px; background: rgba(255, 255, 255, .14); overflow: hidden; margin-top: 12px; }
  #fill .bar div { height: 100%; width: 0; background: #ededed; transition: width .4s ease-out; }
  #fill.countdown .bar div, #fill.cleared .bar div { background: #6fbf8e; }
  #fill.countdown #fillText, #fill.cleared #fillText { color: #8fd3a8; }
  #stack {
    position: fixed; left: 24px; bottom: 24px; display: flex; flex-direction: column; gap: 10px;
    align-items: flex-start;
  }
  .alert {
    display: flex; align-items: center; gap: 14px;
    padding: 12px 22px 12px 14px; border-radius: 12px;
    background: rgba(27, 27, 29, .9); border: 1px solid rgba(255, 255, 255, .12);
    animation: pop .3s cubic-bezier(.2, 1.2, .4, 1) both;
  }
  .alert.leaving { animation: leave .35s ease-in forwards; }
  .who { color: #a5a5ab; font-size: 24px; }
  .gift { width: 56px; height: 56px; object-fit: contain; }
  ${MC_ICON_CSS}
  .what { color: #ffffff; font-size: 34px; }
  @media (prefers-reduced-motion: reduce) { .alert, .alert.leaving { animation: none; } }
  @keyframes pop { from { transform: translateX(-40px) scale(.8); opacity: 0; } to { transform: none; opacity: 1; } }
  @keyframes leave { to { transform: translateX(-40px); opacity: 0; } }
</style>
</head>
<body>
<div id="fill">
  <div class="row"><span id="fillText"></span><span class="percent" id="fillPercent"></span></div>
  <div class="bar"><div id="fillBar"></div></div>
</div>
<div id="stack"></div>
<script>
  ${MC_ICON_JS}
  const SHOW_MS = 5000;
  const MAX_VISIBLE = 3;
  const stack = document.getElementById('stack');

  function showAlert(alert) {
    const el = document.createElement('div');
    el.className = 'alert';
    const who = document.createElement('span');
    who.className = 'who';
    who.textContent = alert.who;
    const what = document.createElement('span');
    what.className = 'what';
    what.textContent = alert.action + '！';
    // 絵が読めなければ出さない
    const picture = (className, src) => {
      const img = Object.assign(document.createElement('img'), { className, src, alt: '', referrerPolicy: 'no-referrer' });
      img.addEventListener('error', () => img.remove());
      return img;
    };
    if (alert.giftImage) el.append(picture('gift', alert.giftImage));
    el.append(who);
    if (alert.icon) el.append(mcIcon(alert.icon, 48));
    el.append(what);
    stack.append(el);
    while (stack.children.length > MAX_VISIBLE) stack.firstChild.remove();
    setTimeout(() => {
      el.classList.add('leaving');
      setTimeout(() => el.remove(), 400);
    }, SHOW_MS);
  }

  function showFill(fill) {
    const box = document.getElementById('fill');
    box.style.display = fill ? 'block' : 'none';
    if (!fill) return;
    box.className = fill.phase;
    const texts = {
      filling: '埋め立て ' + fill.filled + ' / ' + fill.total,
      countdown: '完成！ あと ' + fill.countdownSecondsLeft + ' 秒',
      cleared: '全ラウンドクリア！',
    };
    const round = fill.rounds ? '【' + fill.round + ' / ' + fill.rounds + '】 ' : '';
    document.getElementById('fillText').textContent = round + texts[fill.phase];
    document.getElementById('fillPercent').textContent = fill.percent + '%';
    document.getElementById('fillBar').style.width = (fill.total ? (fill.filled / fill.total) * 100 : 0) + '%';
  }

  const events = new EventSource('/events');
  events.addEventListener('snapshot', (e) => showFill(JSON.parse(e.data).state.fill));
  events.addEventListener('state', (e) => showFill(JSON.parse(e.data).fill));
  events.addEventListener('alert', (e) => showAlert(JSON.parse(e.data)));
  if (location.hash === '#demo') {
    showAlert({ who: 'テストさん', action: 'TNT ×3', icon: 'tnt' });
    showFill({ phase: 'filling', filled: 512, total: 1089, percent: 47, round: 1, rounds: 10 });
  }
</script>
</body>
</html>
`;

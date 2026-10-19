// LIVE Studio に貼るオーバーレイ。背景は透明で、妨害が出たときと、埋め立て中だけ表示する。
import { MC_ICON_CSS, MC_ICON_JS } from './mcIconScript.js';

export const OVERLAY_HTML = String.raw`<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>Project Redstone オーバーレイ</title>
<style>
  html, body { margin: 0; background: transparent; overflow: hidden; }
  body {
    font: 700 28px/1.3 "Yu Gothic UI", "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif;
    color: #fff;
    text-shadow: 0 2px 4px rgba(0, 0, 0, .6);
  }
  #fill {
    position: fixed; left: 24px; right: 24px; top: 24px; display: none;
    padding: 12px 18px; border-radius: 14px; background: rgba(20, 22, 26, .82); border: 3px solid #f0b429;
  }
  #fill.countdown, #fill.cleared { border-color: #3ccf7a; }
  #fill .row { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
  #fill .percent { font-size: 40px; font-variant-numeric: tabular-nums; }
  #fill .bar { height: 18px; border-radius: 9px; background: rgba(255, 255, 255, .15); overflow: hidden; margin-top: 8px; }
  #fill .bar div { height: 100%; width: 0; background: #f0b429; transition: width .4s; }
  #fill.countdown .bar div, #fill.cleared .bar div { background: #3ccf7a; }
  #stack {
    position: fixed; left: 24px; bottom: 24px; display: flex; flex-direction: column; gap: 12px;
    align-items: flex-start;
  }
  .alert {
    display: flex; align-items: center; gap: 14px;
    padding: 14px 22px; border-radius: 14px;
    background: rgba(20, 22, 26, .82); border: 3px solid #e0483e;
    animation: pop .35s cubic-bezier(.2, 1.4, .4, 1) both;
  }
  .alert.leaving { animation: leave .4s ease-in forwards; }
  .who { color: #ffd76a; }
  .gift { width: 56px; height: 56px; object-fit: contain; }
  ${MC_ICON_CSS}
  .what { color: #ff8a80; font-size: 34px; }
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

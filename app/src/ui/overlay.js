// LIVE Studio に貼るオーバーレイ。背景は透明で、妨害が出たときだけ表示する。
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
  }
  #stack {
    position: fixed; left: 24px; bottom: 24px; display: flex; flex-direction: column; gap: 12px;
    align-items: flex-start;
  }
  .alert {
    display: flex; align-items: center; gap: 14px;
    padding: 14px 22px; border-radius: 14px;
    background: rgba(20, 22, 26, .82); border: 3px solid #e0483e;
    text-shadow: 0 2px 4px rgba(0, 0, 0, .6);
    animation: pop .35s cubic-bezier(.2, 1.4, .4, 1) both;
  }
  .alert.leaving { animation: leave .4s ease-in forwards; }
  .who { color: #ffd76a; }
  .what { color: #ff8a80; font-size: 34px; }
  @keyframes pop { from { transform: translateX(-40px) scale(.8); opacity: 0; } to { transform: none; opacity: 1; } }
  @keyframes leave { to { transform: translateX(-40px); opacity: 0; } }
</style>
</head>
<body>
<div id="stack"></div>
<script>
  const SHOW_MS = 5000;
  const MAX_VISIBLE = 3;
  const stack = document.getElementById('stack');

  function show({ from, action }) {
    const el = document.createElement('div');
    el.className = 'alert';
    const who = document.createElement('span');
    who.className = 'who';
    who.textContent = (from || '誰か') + 'さん';
    const what = document.createElement('span');
    what.className = 'what';
    what.textContent = action + '！';
    el.append(who, what);
    stack.append(el);
    while (stack.children.length > MAX_VISIBLE) stack.firstChild.remove();
    setTimeout(() => {
      el.classList.add('leaving');
      setTimeout(() => el.remove(), 400);
    }, SHOW_MS);
  }

  const events = new EventSource('/events');
  events.addEventListener('alert', (e) => show(JSON.parse(e.data)));
  if (location.hash === '#demo') show({ from: 'テスト', action: 'TNT ×3' });
</script>
</body>
</html>
`;

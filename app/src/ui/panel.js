// 操作画面。exe に入れるため、HTML ごと文字列で持つ。
export const PANEL_HTML = String.raw`<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Project Redstone</title>
<style>
  :root {
    --bg: #14161a;
    --panel: #1d2026;
    --line: #2c3038;
    --text: #e8eaed;
    --muted: #9aa0a8;
    --ok: #3ccf7a;
    --warn: #f0b429;
    --bad: #ef5350;
    --accent: #e0483e;
    --gift: #c792ea;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    font: 15px/1.5 "Yu Gothic UI", "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif;
  }
  header {
    display: flex; flex-wrap: wrap; align-items: center; gap: 12px;
    padding: 14px 20px; border-bottom: 1px solid var(--line); background: var(--panel);
  }
  header h1 { font-size: 18px; margin: 0 auto 0 0; letter-spacing: .02em; }
  header h1 span { color: var(--accent); }
  .chip {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 6px 12px; border-radius: 999px; border: 1px solid var(--line); background: var(--bg);
    font-size: 14px; white-space: nowrap;
  }
  .dot { width: 10px; height: 10px; border-radius: 50%; background: var(--muted); }
  .dot.ok { background: var(--ok); box-shadow: 0 0 8px var(--ok); }
  .dot.warn { background: var(--warn); }
  .dot.bad { background: var(--bad); }
  main {
    display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 16px;
    padding: 16px 20px; max-width: 1200px; margin: 0 auto;
  }
  @media (max-width: 820px) { main { grid-template-columns: 1fr; } }
  .card { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 16px; }
  .card h2 { font-size: 14px; color: var(--muted); font-weight: 600; margin: 0 0 12px; }
  .controls { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  button {
    font: inherit; color: var(--text); background: #2a2e36; border: 1px solid var(--line);
    border-radius: 8px; padding: 8px 14px; cursor: pointer; white-space: nowrap;
  }
  button:hover { filter: brightness(1.15); }
  button:disabled { opacity: .5; cursor: default; }
  .big { font-size: clamp(16px, 4.5vw, 20px); font-weight: 700; padding: 18px 8px; }
  #toggle.paused { background: #24533a; border-color: #2f6b4b; }
  #stop { background: #5a1f1d; border-color: #7a2a27; }
  .banner {
    margin-top: 12px; padding: 10px 14px; border-radius: 8px; font-weight: 600;
    background: #4a3a10; color: #ffd76a; display: none;
  }
  .banner.show { display: block; }
  .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 12px; }
  .stat { background: var(--bg); border-radius: 8px; padding: 10px; text-align: center; }
  .stat b { display: block; font-size: 22px; font-variant-numeric: tabular-nums; }
  .stat small { color: var(--muted); }
  #log {
    list-style: none; margin: 0; padding: 0; height: 420px; overflow-y: auto;
    font-size: 14px; font-variant-numeric: tabular-nums;
  }
  #log li { padding: 3px 0; border-bottom: 1px solid #22252b; display: flex; gap: 10px; }
  #log time { color: var(--muted); flex: none; }
  #log .ok { color: var(--ok); }
  #log .warn { color: var(--warn); }
  #log .error { color: var(--bad); }
  #log .gift { color: var(--gift); }
  .side { display: flex; flex-direction: column; gap: 16px; }
  label { display: block; font-size: 13px; color: var(--muted); margin-bottom: 4px; }
  input {
    font: inherit; color: var(--text); background: var(--bg); border: 1px solid var(--line);
    border-radius: 8px; padding: 8px 10px; width: 100%;
  }
  .row { display: flex; gap: 8px; }
  .row > * { min-width: 0; }
  .row > button { flex: none; }
  .hint { color: var(--muted); font-size: 13px; margin: 8px 0 0; }
  .quick { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .quick button { padding: 4px 10px; font-size: 13px; }
  code { background: var(--bg); padding: 2px 6px; border-radius: 4px; font-size: 13px; word-break: break-all; }
  .checks { list-style: none; margin: 0 0 12px; padding: 0; }
  .checks li { display: flex; gap: 10px; align-items: baseline; padding: 4px 0; }
  .checks .mark { width: 18px; flex: none; text-align: center; font-weight: 700; }
  .checks .yes .mark { color: var(--ok); }
  .checks .no .mark { color: var(--bad); }
  .checks small { color: var(--muted); display: block; font-size: 12px; word-break: break-all; }
  .primary { width: 100%; font-weight: 700; padding: 12px; background: #24533a; border-color: #2f6b4b; }
  .ready { padding: 10px 12px; border-radius: 8px; background: #17321f; color: #9be7b4; font-weight: 600; }
  #offline {
    position: fixed; inset: auto 0 0 0; padding: 10px; text-align: center;
    background: var(--bad); color: #fff; font-weight: 600; display: none;
  }
</style>
</head>
<body>
<header>
  <h1>Project <span>Redstone</span></h1>
  <span class="chip"><span class="dot" id="tiktokDot"></span>TikTok: <span id="tiktokText">—</span></span>
  <span class="chip"><span class="dot" id="modDot"></span>マイクラ: <span id="modText">—</span></span>
</header>

<main>
  <div class="side">
    <section class="card">
      <div class="controls">
        <button class="big" id="toggle">一時停止</button>
        <button class="big" id="stop">全妨害ストップ</button>
      </div>
      <div class="banner" id="pausedBanner">一時停止中です。ギフトが来ても妨害は出ません。</div>
      <div class="stats">
        <div class="stat"><b id="received">0</b><small>受信</small></div>
        <div class="stat"><b id="sent">0</b><small>妨害</small></div>
        <div class="stat"><b id="skipped">0</b><small>見送り</small></div>
        <div class="stat"><b id="failed">0</b><small>失敗</small></div>
      </div>
    </section>
    <section class="card">
      <h2>ログ</h2>
      <ul id="log"></ul>
    </section>
  </div>

  <div class="side">
    <section class="card">
      <h2>マイクラの準備（Java版 <span id="mcVersion">26.3</span>）</h2>
      <ul class="checks" id="checks"></ul>
      <div id="setupReady" class="ready" hidden>準備できています。ランチャーで「fabric-loader-<span class="mcv"></span>」を選んで起動してください。</div>
      <div id="setupTodo" hidden>
        <button class="primary" id="install">まとめて導入する</button>
        <p class="hint">マイクラを閉じた状態で押してください。足りないものだけ入れます。</p>
      </div>
    </section>

    <section class="card">
      <h2>TikTok</h2>
      <form id="tiktokForm">
        <label for="username">TikTok ID（@なし）</label>
        <div class="row">
          <input id="username" autocomplete="off" spellcheck="false" placeholder="例: my_tiktok_id">
          <button type="submit">保存して接続</button>
        </div>
      </form>
      <p class="hint">LIVE を始める前に接続しておくと、配信が始まったら自動でつながります。</p>
    </section>

    <section class="card">
      <h2>テスト送信</h2>
      <form id="testForm">
        <div class="row">
          <input id="giftName" list="giftList" placeholder="ギフト名" autocomplete="off">
          <input id="giftCount" type="number" min="1" max="100" value="1" style="width: 72px; flex: none;" aria-label="個数">
          <button type="submit">送る</button>
        </div>
        <datalist id="giftList"></datalist>
      </form>
      <div class="quick" id="quick"></div>
      <div class="quick">
        <button data-kind="follow">フォロー</button>
        <button data-kind="share">シェア</button>
      </div>
      <p class="hint">実際のギフトの代わりに、届いたことにして試せます。</p>
    </section>

    <section class="card">
      <h2>配信画面に表示（オーバーレイ）</h2>
      <p class="hint" style="margin-top: 0;">LIVE Studio でブラウザ（リンク）のソースを追加し、このURLを貼ると、妨害が出たときに名前と内容が表示されます。</p>
      <div class="row" style="margin-top: 8px;">
        <code id="overlayUrl"></code>
        <button id="copyOverlay" style="flex: none;">コピー</button>
      </div>
    </section>
  </div>
</main>

<div id="offline">アプリと切断されました。アプリ（黒いウィンドウ）が開いているか確認してください。</div>

<script>
  const $ = (id) => document.getElementById(id);
  const TIKTOK = {
    connecting: ['warn', '接続中…'],
    waiting: ['warn', '配信待ち'],
    connected: ['ok', '接続中'],
    retrying: ['bad', '再接続中'],
  };
  let state = null;

  function renderState(next) {
    state = next;
    let tiktok;
    if (state.mock) tiktok = ['warn', 'テストモード'];
    else if (!state.tiktokUsername) tiktok = ['bad', 'ID未設定'];
    else tiktok = TIKTOK[state.tiktok.state] ?? ['', '停止中'];
    $('tiktokDot').className = 'dot ' + tiktok[0];
    $('tiktokText').textContent = tiktok[1] + (state.tiktokUsername && !state.mock ? '（@' + state.tiktokUsername + '）' : '');

    const mod = !state.mod.connected ? ['bad', '未接続（ワールドを開いてください）']
      : state.mod.players === 0 ? ['warn', 'ワールドに入っていません']
      : state.mod.players === null ? ['warn', '確認中…']
      : ['ok', '接続中'];
    $('modDot').className = 'dot ' + mod[0];
    $('modText').textContent = mod[1];

    $('toggle').textContent = state.paused ? '再開する' : '一時停止';
    $('toggle').classList.toggle('paused', state.paused);
    $('pausedBanner').classList.toggle('show', state.paused);
    for (const key of ['received', 'sent', 'skipped', 'failed']) $(key).textContent = state.stats[key];

    if (document.activeElement !== $('username')) $('username').value = state.tiktokUsername;

    const names = state.giftNames;
    if ($('quick').dataset.names !== names.join('\n')) {
      $('quick').dataset.names = names.join('\n');
      $('quick').replaceChildren(...names.map((name) => {
        const b = document.createElement('button');
        b.textContent = name;
        b.addEventListener('click', () => post('/api/test', { kind: 'gift', giftName: name, count: 1 }));
        return b;
      }));
      $('giftList').replaceChildren(...names.map((name) => Object.assign(document.createElement('option'), { value: name })));
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
    text.textContent = entry.text;
    li.append(time, text);
    log.append(li);
    while (log.children.length > 300) log.firstChild.remove();
    if (stick) log.scrollTop = log.scrollHeight;
  }

  async function post(path, body = {}) {
    try {
      const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) alert(data.error ?? '操作できませんでした');
      return data;
    } catch {
      alert('アプリにつながりません');
    }
  }

  $('toggle').addEventListener('click', () => post(state?.paused ? '/api/resume' : '/api/pause'));
  $('stop').addEventListener('click', () => post('/api/stop'));
  $('tiktokForm').addEventListener('submit', (e) => {
    e.preventDefault();
    post('/api/tiktok', { username: $('username').value });
    $('username').blur();
  });
  $('testForm').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!$('giftName').value.trim()) return;
    post('/api/test', { kind: 'gift', giftName: $('giftName').value, count: Number($('giftCount').value) });
  });
  document.querySelectorAll('[data-kind]').forEach((b) =>
    b.addEventListener('click', () => post('/api/test', { kind: b.dataset.kind })));

  function renderSetup(setup) {
    const items = [
      [setup.launcherFound, 'マイクラのランチャー', setup.launcherFound ? setup.dir : '見つかりません。ランチャーを一度起動して閉じてください'],
      [setup.fabric.installed, 'Fabric Loader', setup.fabric.versionId ?? '未導入'],
      [setup.fabricApi.installed, 'Fabric API', setup.fabricApi.fileName ?? '未導入'],
      [setup.mod.upToDate, 'Project Redstone MOD', setup.mod.upToDate ? setup.mod.fileName : setup.mod.installed ? '古いバージョン（' + setup.mod.fileName + '）' : '未導入'],
    ];
    $('checks').replaceChildren(...items.map(([ok, name, detail]) => {
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
    }));
    $('mcVersion').textContent = setup.minecraftVersion;
    document.querySelectorAll('.mcv').forEach((el) => (el.textContent = setup.minecraftVersion));
    $('setupReady').hidden = !setup.ready;
    $('setupTodo').hidden = setup.ready;
  }

  async function loadSetup() {
    try {
      const res = await fetch('/api/setup');
      if (res.ok) renderSetup((await res.json()).setup);
    } catch {}
  }

  $('install').addEventListener('click', async () => {
    $('install').disabled = true;
    $('install').textContent = '導入中…';
    const data = await post('/api/setup/install');
    $('install').disabled = false;
    $('install').textContent = 'まとめて導入する';
    if (data?.setup) renderSetup(data.setup);
    else loadSetup();
  });
  window.addEventListener('focus', loadSetup);
  loadSetup();

  $('overlayUrl').textContent = location.origin + '/overlay';
  $('copyOverlay').addEventListener('click', async () => {
    await navigator.clipboard.writeText(location.origin + '/overlay');
    $('copyOverlay').textContent = 'コピーしました';
    setTimeout(() => ($('copyOverlay').textContent = 'コピー'), 1500);
  });

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

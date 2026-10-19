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
  [hidden] { display: none !important; }
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
  nav { display: flex; gap: 4px; margin-right: auto; }
  nav button { background: transparent; border-color: transparent; color: var(--muted); }
  nav button.active { background: var(--bg); border-color: var(--line); color: var(--text); }
  header h1 { margin-right: 12px; }
  main.single { display: block; max-width: 1100px; }
  main.single .card + .card { margin-top: 16px; }
  .table-wrap { overflow-x: auto; }
  table.rules { width: 100%; border-collapse: collapse; font-size: 14px; }
  table.rules th { text-align: left; color: var(--muted); font-weight: 600; font-size: 12px; padding: 6px 4px; border-bottom: 1px solid var(--line); white-space: nowrap; }
  table.rules td { padding: 6px 4px; border-bottom: 1px solid #22252b; vertical-align: middle; }
  table.rules select, table.rules input { padding: 6px 8px; }
  table.rules .num { width: 72px; }
  table.rules .order { white-space: nowrap; }
  table.rules .order button, table.rules .del { padding: 4px 8px; }
  .toolbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 12px; }
  .toolbar .grow { flex: 1; }
  .dirty { color: var(--warn); font-weight: 600; }
  .recent { display: flex; flex-wrap: wrap; gap: 6px; }
  .recent button { font-size: 13px; padding: 4px 10px; }
  select {
    font: inherit; color: var(--text); background: var(--bg); border: 1px solid var(--line);
    border-radius: 8px; padding: 8px 10px; max-width: 100%;
  }
  dialog {
    background: var(--panel); color: var(--text); border: 1px solid var(--line); border-radius: 14px;
    padding: 24px; width: min(560px, calc(100vw - 32px));
  }
  dialog::backdrop { background: rgba(0, 0, 0, .6); }
  dialog h2 { margin: 0 0 4px; font-size: 20px; }
  .steps { color: var(--muted); font-size: 13px; margin-bottom: 16px; }
  .wizard-actions { display: flex; justify-content: space-between; gap: 8px; margin-top: 20px; }
  .wizard-actions .next { background: #24533a; border-color: #2f6b4b; font-weight: 700; }
  .fill-progress { height: 22px; border-radius: 6px; background: var(--bg); overflow: hidden; margin: 8px 0; }
  .fill-progress div { height: 100%; width: 0; background: var(--warn); transition: width .4s; }
  .fill-progress.countdown div, .fill-progress.cleared div { background: var(--ok); }
  .fill-text { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
  .fill-text b { font-size: 26px; font-variant-numeric: tabular-nums; }
  .fill-form { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; margin-bottom: 10px; }
  .fill-form select { width: 100%; }
  .fill-buttons { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  #offline {
    position: fixed; inset: auto 0 0 0; padding: 10px; text-align: center;
    background: var(--bad); color: #fff; font-weight: 600; display: none;
  }
</style>
</head>
<body>
<header>
  <h1>Project <span>Redstone</span></h1>
  <nav>
    <button class="active" data-tab="tabLive">配信</button>
    <button data-tab="tabRules">妨害の設定</button>
    <button id="openWizard">はじめの設定</button>
  </nav>
  <span class="chip"><span class="dot" id="tiktokDot"></span>TikTok: <span id="tiktokText">—</span></span>
  <span class="chip"><span class="dot" id="modDot"></span>マイクラ: <span id="modText">—</span></span>
</header>

<main id="tabLive">
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
      <h2>埋め立てモード</h2>
      <div id="fillIdle">
        <div class="fill-form">
          <div><label for="fillBlock">置くブロック</label><select id="fillBlock">
            <option value="amethyst_block">アメジスト</option><option value="diamond_block">ダイヤモンド</option>
            <option value="emerald_block">エメラルド</option><option value="gold_block">金</option>
            <option value="iron_block">鉄</option><option value="lapis_block">ラピスラズリ</option>
            <option value="redstone_block">レッドストーン</option><option value="quartz_block">クォーツ</option>
          </select></div>
          <div><label for="fillWall">枠の素材</label><select id="fillWall">
            <option value="glass">ガラス</option><option value="white_stained_glass">白色のガラス</option>
            <option value="light_blue_stained_glass">空色のガラス</option><option value="bedrock">岩盤</option>
          </select></div>
          <div><label for="fillReach">届く距離（マス）</label><input id="fillReach" type="number" min="1" max="64"></div>
          <div><label for="fillWidth">枠の幅（マス）</label><input id="fillWidth" type="number" min="3" max="41" step="2"></div>
          <div><label for="fillHeight">枠の高さ（マス）</label><input id="fillHeight" type="number" min="1" max="30"></div>
          <div><label for="fillSkyY">枠を作る高さ（Y）</label><input id="fillSkyY" type="number" min="-60" max="300"></div>
          <div><label for="fillCountdown">埋めきってからクリアまで（秒）</label><input id="fillCountdown" type="number" min="0" max="600"></div>
        </div>
        <button class="primary" id="fillStart">埋め立てを始める</button>
        <p class="hint">押すと、マイクラのプレイヤーの真上の空中に枠ができ、中へ移動します。置くブロックが64個配られ、届く距離が伸びます（終えると元に戻ります）。枠から落ちると、自動で枠の上に戻ります。</p>
      </div>
      <div id="fillRunning" hidden>
        <div class="fill-text"><span id="fillPhase"></span><b id="fillPercent"></b></div>
        <div class="fill-progress" id="fillBar"><div></div></div>
        <div class="hint" id="fillDetail" style="margin: 0;"></div>
        <div class="fill-buttons">
          <button data-action="fill_expand">枠 +1</button>
          <button data-action="fill_shrink">枠 −1</button>
          <button data-action="fill_help" data-count="10">お助け +10</button>
          <button data-action="tnt">TNT</button>
          <span style="flex: 1;"></span>
          <button id="fillStop">終える</button>
        </div>
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
      <ul class="checks setup-checks"></ul>
      <div class="ready setup-ready" hidden>準備できています。ランチャーで「fabric-loader-<span class="mcv"></span>」を選んで起動してください。</div>
      <div class="setup-todo" hidden>
        <button class="primary install-btn">まとめて導入する</button>
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
      <p class="hint">実際のギフトの代わりに、届いたことにして試せます。ボタンは「妨害の設定」のルールに合わせて変わります。</p>
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

<main id="tabRules" class="single" hidden>
  <section class="card">
    <h2>ルール</h2>
    <p class="hint" style="margin: 0 0 12px;">上から順に見て、最初に合ったルールの妨害を出します。ギフトを連打すると、数も連打の回数だけ増えます。いいねのルールは、いいねが指定の回数たまるたびに出します。</p>
    <div class="table-wrap">
      <table class="rules">
        <thead><tr><th>順番</th><th>きっかけ</th><th></th><th>妨害</th><th>詳細</th><th>数</th><th>待ち時間（秒）</th><th></th></tr></thead>
        <tbody id="ruleRows"></tbody>
      </table>
    </div>
    <div class="toolbar">
      <button id="addRule">＋ ルールを追加</button>
      <span class="grow"></span>
      <span class="dirty" id="dirty" hidden>保存していない変更があります</span>
      <button id="revertRules">元に戻す</button>
      <button id="saveRules" class="next" style="background: #24533a; border-color: #2f6b4b; font-weight: 700;">保存する</button>
    </div>
  </section>

  <section class="card">
    <h2>最近届いたギフト</h2>
    <p class="hint" style="margin: 0 0 12px;">配信中に実際に届いたギフトです。押すと、そのギフト名のルールを一番上に追加します。</p>
    <div class="recent" id="recent"></div>
  </section>
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
      <li>ワールドを開く（上の「マイクラ」が緑になります）</li>
      <li>枠を作りたい場所に立って「埋め立てを始める」</li>
      <li>「テスト送信」のボタンで妨害が出るか試す</li>
      <li>TikTok LIVE を始める</li>
    </ol>
    <p class="hint">どのギフトで何が起きるかは「妨害の設定」で変えられます。</p>
  </div>
  <div class="wizard-actions">
    <button id="wizBack">戻る</button>
    <button id="wizNext" class="next">次へ</button>
  </div>
</dialog>

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

    const buttonsKey = JSON.stringify(state.testButtons);
    if ($('quick').dataset.key !== buttonsKey) {
      $('quick').dataset.key = buttonsKey;
      $('quick').replaceChildren(...state.testButtons.map(({ label, body }) => {
        const b = document.createElement('button');
        b.textContent = label;
        b.addEventListener('click', () => post('/api/test', body));
        return b;
      }));
      const names = state.testButtons.filter((t) => t.body.kind === 'gift' && !t.body.diamonds).map((t) => t.body.giftName);
      $('giftList').replaceChildren(...names.map((name) => Object.assign(document.createElement('option'), { value: name })));
    }

    renderFill(state.fill);
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
    $('tabLive').hidden = id !== 'tabLive';
    $('tabRules').hidden = id !== 'tabRules';
  }
  document.querySelectorAll('nav [data-tab]').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));

  // ---- ルールの表 ----
  const ACTIONS = [
    ['tnt', 'TNT'], ['mob', 'モブ'], ['fill_expand', '枠を広げる（マス）'], ['fill_shrink', '枠を縮める（マス）'],
    ['fill_help', 'お助けブロック（個）'], ['message', 'メッセージだけ'],
  ];
  const MOBS = [['zombie', 'ゾンビ'], ['skeleton', 'スケルトン'], ['creeper', 'クリーパー'], ['spider', 'クモ'], ['witch', 'ウィッチ'], ['silverfish', 'シルバーフィッシュ'], ['pig', 'ブタ']];
  const TRIGGERS = [['gift', 'ギフト名'], ['likes', 'いいね（回数ごと）'], ['minDiamonds', 'ダイヤ数が以上'], ['giftId', 'ギフトID'], ['follow', 'フォロー'], ['share', 'シェア']];
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

  function cell(...children) {
    const td = document.createElement('td');
    td.append(...children);
    return td;
  }

  function renderRows() {
    const change = (row, key, rerender) => (value) => {
      row[key] = value;
      setDirty(true);
      if (rerender) renderRows();
    };
    $('ruleRows').replaceChildren(...rows.map((row, i) => {
      const tr = document.createElement('tr');
      const up = Object.assign(document.createElement('button'), { textContent: '↑', disabled: i === 0, title: '上へ' });
      const down = Object.assign(document.createElement('button'), { textContent: '↓', disabled: i === rows.length - 1, title: '下へ' });
      up.addEventListener('click', () => { [rows[i - 1], rows[i]] = [rows[i], rows[i - 1]]; setDirty(true); renderRows(); });
      down.addEventListener('click', () => { [rows[i + 1], rows[i]] = [rows[i], rows[i + 1]]; setDirty(true); renderRows(); });
      const order = cell(up, ' ', down);
      order.className = 'order';

      const needsValue = row.trigger === 'gift' || row.trigger === 'minDiamonds' || row.trigger === 'giftId' || row.trigger === 'likes';
      const numeric = row.trigger === 'minDiamonds' || row.trigger === 'likes';
      const value = needsValue
        ? input(row.value, change(row, 'value'), numeric
          ? { type: 'number', min: row.trigger === 'likes' ? 1 : 0, className: 'num', placeholder: row.trigger === 'likes' ? '1000' : '1' }
          : { placeholder: row.trigger === 'gift' ? '例: Rose' : 'ID', list: 'giftList' })
        : document.createTextNode('');

      let detail;
      if (row.action === 'mob') detail = select(MOBS, row.mob, change(row, 'mob'));
      else detail = input(row.label, change(row, 'label'), { placeholder: row.action === 'message' ? '表示する文（必須）' : '表示する文（任意）', maxLength: 100 });

      const count = NO_COUNT.has(row.action)
        ? document.createTextNode('—')
        : input(row.count, change(row, 'count'), { type: 'number', min: 1, max: MAX_COUNT[row.action], className: 'num' });
      const cooldown = input(row.cooldownSec, change(row, 'cooldownSec'), { type: 'number', min: 0, className: 'num' });

      const del = Object.assign(document.createElement('button'), { textContent: '✕', className: 'del', title: '削除' });
      del.addEventListener('click', () => { rows.splice(i, 1); setDirty(true); renderRows(); });

      tr.append(
        order,
        cell(select(TRIGGERS, row.trigger, change(row, 'trigger', true))),
        cell(value),
        cell(select(ACTIONS, row.action, change(row, 'action', true))),
        cell(detail),
        cell(count),
        cell(cooldown),
        cell(del),
      );
      return tr;
    }));
  }

  $('addRule').addEventListener('click', () => {
    rows.push(toRow({ gift: '', action: 'tnt', count: 1 }));
    setDirty(true);
    renderRows();
  });
  $('revertRules').addEventListener('click', () => {
    savedRulesKey = '';
    loadRules(state.rules);
  });
  async function saveRules(rules) {
    const data = await post('/api/rules', { rules });
    if (data?.ok) {
      savedRulesKey = '';
      loadRules(data.state.rules);
      return true;
    }
    return false;
  }
  $('saveRules').addEventListener('click', () => saveRules(rows.map(toRule)));

  // ---- 埋め立てモード ----
  function renderFill(fill) {
    $('fillIdle').hidden = !!fill;
    $('fillRunning').hidden = !fill;
    if (!fill) return;
    const phases = {
      filling: '埋めています',
      countdown: '完成！ あと ' + fill.countdownSecondsLeft + ' 秒守りきればクリア',
      cleared: 'クリア！',
    };
    $('fillPhase').textContent = phases[fill.phase];
    $('fillPercent').textContent = fill.percent + '%';
    $('fillBar').className = 'fill-progress ' + fill.phase;
    $('fillBar').firstElementChild.style.width = (fill.total ? (fill.filled / fill.total) * 100 : 0) + '%';
    $('fillDetail').textContent = fill.filled + ' / ' + fill.total + ' マス（幅' + fill.width + '・高さ' + fill.height + '）';
  }

  // 前回の設定を入れる（入力中は上書きしない）
  const FILL_FIELDS = { fillWidth: 'width', fillHeight: 'height', fillCountdown: 'countdown', fillWall: 'wall', fillBlock: 'block', fillSkyY: 'skyY', fillReach: 'reach' };
  let fillFormDirty = false;
  Object.keys(FILL_FIELDS).forEach((id) => $(id).addEventListener('input', () => (fillFormDirty = true)));
  function renderFillSettings(settings) {
    if (fillFormDirty || !settings) return;
    for (const [id, key] of Object.entries(FILL_FIELDS)) $(id).value = settings[key];
  }

  $('fillStart').addEventListener('click', async () => {
    const body = {};
    for (const [id, key] of Object.entries(FILL_FIELDS)) {
      body[key] = $(id).tagName === 'SELECT' ? $(id).value : Number($(id).value);
    }
    const data = await post('/api/fill/start', body);
    if (data?.ok) fillFormDirty = false;
  });
  $('fillStop').addEventListener('click', () => {
    if (confirm('埋め立てを終えますか？（置いたブロックはそのまま残ります）')) post('/api/fill/stop');
  });
  document.querySelectorAll('[data-action]').forEach((b) => b.addEventListener('click', () =>
    post('/api/action', { type: b.dataset.action, count: Number(b.dataset.count ?? 1) })));

  // ---- 最近届いたギフト ----
  function renderRecent() {
    const gifts = state.recentGifts;
    if (!gifts.length) {
      $('recent').replaceChildren(Object.assign(document.createElement('span'), { className: 'hint', textContent: 'まだありません（TikTok LIVE につながると、届いたギフトがここに出ます）' }));
      return;
    }
    $('recent').replaceChildren(...gifts.map((gift) => {
      const b = document.createElement('button');
      b.textContent = gift.giftName + '（💎' + gift.diamonds + '）';
      b.addEventListener('click', () => {
        rows.unshift(toRow({ gift: gift.giftName, action: 'tnt', count: 1 }));
        setDirty(true);
        renderRows();
      });
      return b;
    }));
  }

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

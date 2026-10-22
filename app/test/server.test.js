import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import http from 'node:http';
import { test } from 'node:test';
import { KEY_ART } from '../src/assets.js';
import { createUiServer } from '../src/server.js';

class FakeEngine extends EventEmitter {
  constructor() {
    super();
    this.calls = [];
    this.config = { tiktokUsername: '' };
    this.logs = [{ time: 0, level: 'info', text: '起動しました' }];
  }
  get state() {
    return { paused: false };
  }
  pause() {
    this.calls.push('pause');
  }
  resume() {
    this.calls.push('resume');
  }
  stopAll() {
    this.calls.push('stop');
  }
  handleEvent(event) {
    this.calls.push(event);
  }
  async setTikTokUsername(username) {
    this.config.tiktokUsername = username;
  }
}

async function withServer(fn, { setup, icons, debug } = {}) {
  const engine = new FakeEngine();
  const saved = [];
  const ui = createUiServer({ engine, port: 0, setup, icons, debug, saveConfig: async (c) => saved.push({ ...c }) });
  const port = await ui.listen();
  try {
    await fn({ engine, saved, port });
  } finally {
    await ui.close();
  }
}

function request(port, { method = 'GET', path = '/', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, method, path, headers: { Host: `127.0.0.1:${port}`, ...headers } }, (res) => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', (c) => (text += c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text, json: () => JSON.parse(text) }));
    });
    req.on('error', reject);
    if (body !== undefined) req.write(body);
    req.end();
  });
}

const json = (port, path, data, headers = {}) =>
  request(port, { method: 'POST', path, headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(data) });

test('操作画面とオーバーレイを返す', async () => {
  await withServer(async ({ port }) => {
    const panel = await request(port);
    assert.equal(panel.status, 200);
    assert.match(panel.text, /全妨害ストップ/);
    assert.match((await request(port, { path: '/overlay' })).text, /オーバーレイ/);
    assert.equal((await request(port, { path: '/nope' })).status, 404);
  });
});

test('配る版（debug: false）では、テストの画面を隠す', async () => {
  await withServer(async ({ port }) => {
    assert.doesNotMatch((await request(port)).text, /<body class="release">/);
  });
  await withServer(async ({ port }) => {
    const panel = (await request(port)).text;
    assert.match(panel, /<body class="release">/);
    assert.match(panel, /body\.release \[data-tab="tabDebug"\]/);
  }, { debug: false });
});

test('マイクラのアイコンとギフトの一覧を返す', async () => {
  const icons = { get: async (name) => (name === 'tnt' ? Buffer.from('png') : null) };
  await withServer(async ({ engine, port }) => {
    const tnt = await request(port, { path: '/icons/mc/tnt.png' });
    assert.equal(tnt.status, 200);
    assert.equal(tnt.text, 'png');
    assert.equal((await request(port, { path: '/icons/mc/zombie.png' })).status, 404);
    assert.equal((await request(port, { path: '/icons/mc/..%2Fx.png' })).status, 404);

    assert.deepEqual((await request(port, { path: '/api/gifts' })).json(), { gifts: [] });
    engine.giftCatalog = { gifts: [{ name: 'Rose', diamonds: 1, image: 'https://p16-webcast.tiktokcdn.com/rose.webp' }] };
    assert.equal((await request(port, { path: '/api/gifts' })).json().gifts[0].name, 'Rose');
  }, { icons });
});

test('外部のグラフィック（app/assets/）を返す。キーアートは全部ある。おかしな場所は断る', async () => {
  await withServer(async ({ port }) => {
    for (const { src } of Object.values(KEY_ART)) {
      const art = await request(port, { path: src });
      assert.equal(art.status, 200, src);
      assert.equal(art.headers['content-type'], 'image/jpeg');
    }
    for (const path of ['/assets/art/nothing.jpg', '/assets/..%2Fpackage.json', '/assets/../package.json', '/assets/art/.hidden.png', '/assets/art/x.json']) {
      assert.equal((await request(port, { path })).status, 404, path);
    }
  });
});

test('ボタン操作をエンジンに伝える', async () => {
  await withServer(async ({ engine, port }) => {
    for (const path of ['/api/pause', '/api/resume', '/api/stop']) {
      assert.equal((await json(port, path, {})).status, 200);
    }
    await json(port, '/api/test', { kind: 'gift', giftName: 'Rose', count: 500 });
    await json(port, '/api/test', { kind: 'follow' });
    assert.deepEqual(engine.calls, [
      'pause',
      'resume',
      'stop',
      { kind: 'gift', giftId: '', giftName: 'Rose', diamonds: 0, count: 100, from: 'テスト', test: true },
      { kind: 'follow', from: 'テスト', test: true },
    ]);
    assert.equal((await json(port, '/api/test', { kind: 'gift' })).status, 400);
  });
});

test('TikTok ID を保存してつなぎ直す', async () => {
  await withServer(async ({ engine, saved, port }) => {
    assert.equal((await json(port, '/api/tiktok', { username: '@taro' })).status, 200);
    assert.equal(engine.config.tiktokUsername, 'taro');
    assert.deepEqual(saved, [{ tiktokUsername: 'taro' }]);
    assert.equal((await json(port, '/api/tiktok', { username: 'a b' })).status, 400);
  });
});

test('ほかのサイトやほかのホスト名からの操作を断る', async () => {
  await withServer(async ({ engine, port }) => {
    assert.equal((await json(port, '/api/stop', {}, { Origin: 'http://evil.example' })).status, 403);
    assert.equal((await request(port, { method: 'POST', path: '/api/stop', headers: { 'Content-Type': 'text/plain' }, body: '{}' })).status, 415);
    assert.equal((await request(port, { headers: { Host: 'evil.example' } })).status, 403);
    assert.equal((await json(port, '/api/stop', {}, { Origin: `http://localhost:${port}` })).status, 200);
    assert.deepEqual(engine.calls, ['stop']);
  });
});

test('大きすぎる送信や壊れたJSONを断る', async () => {
  await withServer(async ({ port }) => {
    const big = await request(port, { method: 'POST', path: '/api/test', headers: { 'Content-Type': 'application/json' }, body: 'x'.repeat(600000) }).catch(() => ({ status: 'closed' }));
    assert.ok(big.status === 400 || big.status === 'closed');
    assert.equal((await request(port, { method: 'POST', path: '/api/test', headers: { 'Content-Type': 'application/json' }, body: '{' })).status, 400);
  });
});

test('接続した画面に今の状態とログを送り、その後の変化も流す', async () => {
  await withServer(async ({ engine, port }) => {
    const received = await new Promise((resolve, reject) => {
      const req = http.get({ host: '127.0.0.1', port, path: '/events', headers: { Host: `127.0.0.1:${port}` } }, (res) => {
        let text = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          text += chunk;
          if (text.includes('event: snapshot') && !text.includes('event: alert')) {
            engine.emit('alert', { from: 'たろう', action: 'TNT ×1' });
          }
          if (text.includes('event: alert')) {
            req.destroy();
            resolve(text);
          }
        });
      });
      req.on('error', reject);
    });
    assert.match(received, /起動しました/);
    assert.match(received, /"action":"TNT ×1"/);
  });
});

test('マイクラの準備状況を返し、導入ボタンで導入する', async () => {
  let installed = false;
  const setup = {
    status: async () => ({ ready: installed }),
    install: async () => {
      if (installed) throw new Error('すでに入っています');
      installed = true;
      return { ready: true };
    },
  };
  await withServer(async ({ port }) => {
    assert.deepEqual((await request(port, { path: '/api/setup' })).json().setup, { ready: false });
    const first = await json(port, '/api/setup/install', {});
    assert.equal(first.status, 200);
    assert.deepEqual(first.json().setup, { ready: true });
    const second = await json(port, '/api/setup/install', {});
    assert.equal(second.status, 400);
    assert.equal(second.json().error, 'すでに入っています');
    assert.equal((await json(port, '/api/setup/install', {}, { Origin: 'http://evil.example' })).status, 403);
  }, { setup });
});

test('ルールを検査してから保存する', async () => {
  await withServer(async ({ engine, saved, port }) => {
    engine.setRules = (rules) => (engine.config.rules = rules);
    const ok = await json(port, '/api/rules', { rules: [{ minDiamonds: 1, action: 'tnt', count: 2, junk: 'x' }] });
    assert.equal(ok.status, 200);
    assert.deepEqual(engine.config.rules, [{ minDiamonds: 1, action: 'tnt', count: 2 }]);
    assert.deepEqual(saved.at(-1).rules, [{ minDiamonds: 1, action: 'tnt', count: 2 }]);

    const bad = await json(port, '/api/rules', { rules: [{ gift: '', action: 'tnt' }] });
    assert.equal(bad.status, 400);
    assert.match(bad.json().error, /1番目のルール: ギフト名を入れてください/);
    assert.equal((await json(port, '/api/rules', { rules: [] })).status, 400);
  });
});

test('テスト送信でダイヤ数も指定できる', async () => {
  await withServer(async ({ engine, port }) => {
    await json(port, '/api/test', { kind: 'gift', giftName: '100コインのギフト', diamonds: 100 });
    assert.equal(engine.calls[0].diamonds, 100);
  });
});

test('埋め立ての開始・終了を伝え、断られたら理由を返す', async () => {
  await withServer(async ({ engine, saved, port }) => {
    const calls = [];
    engine.startFill = async (opts) => calls.push(opts);
    engine.stopFill = async () => {
      throw new Error('埋め立てが始まっていません');
    };
    assert.equal((await json(port, '/api/fill/start', { width: 15, block: 'diamond_block', junk: 1 })).status, 200);
    assert.deepEqual(calls, [{
      width: 15, height: undefined, countdown: undefined, rounds: undefined, wall: undefined, block: 'diamond_block', handBlock: undefined,
      skyY: undefined, reach: undefined, placeSpeed: undefined, breakSpeed: undefined, mobsAttack: undefined,
      mobLifetime: undefined,
    }]);
    assert.equal(saved.length, 1, '始めたら設定を保存する');
    const stop = await json(port, '/api/fill/stop', {});
    assert.equal(stop.status, 400);
    assert.equal(stop.json().error, '埋め立てが始まっていません');
  });
});

test('テスト送信でいいねも送れる', async () => {
  await withServer(async ({ engine, port }) => {
    await json(port, '/api/test', { kind: 'like', count: 1000 });
    assert.deepEqual(engine.calls, [{ kind: 'like', count: 1000, from: 'テスト', test: true }]);
  });
});

test('テストタブの操作: 一気に埋める・モブを出す（決まったものだけ）', async () => {
  await withServer(async ({ engine, port }) => {
    const actions = [];
    engine.manualAction = async (action) => {
      actions.push(action);
      return { status: 'sent', action };
    };
    assert.equal((await json(port, '/api/action', { type: 'fill_set', percent: 150 })).status, 200);
    assert.equal((await json(port, '/api/action', { type: 'fill_set', percent: 0 })).status, 200);
    assert.equal((await json(port, '/api/action', { type: 'fill_set' })).status, 400);
    assert.equal((await json(port, '/api/action', { type: 'mob', mob: 'creeper', count: 99 })).status, 200);
    assert.equal((await json(port, '/api/action', { type: 'mob', mob: 'wither' })).status, 400);
    assert.equal((await json(port, '/api/action', { type: 'fill_start' })).status, 400);
    assert.deepEqual(actions, [
      { type: 'fill_set', percent: 100, from: '' },
      { type: 'fill_set', percent: 0, from: '' },
      { type: 'mob', count: 10, from: '', mob: 'creeper' },
    ]);
  });
});

test('プリセットの保存・削除を伝え、断られたら理由を返す', async () => {
  await withServer(async ({ engine, saved, port }) => {
    const calls = [];
    engine.savePreset = (name) => {
      if (!name) throw new Error('プリセットの名前は1〜20文字にしてください');
      calls.push(['save', name]);
    };
    engine.deletePreset = (name) => calls.push(['delete', name]);
    assert.equal((await json(port, '/api/presets/save', { name: 'いつもの' })).status, 200);
    assert.equal((await json(port, '/api/presets/delete', { name: 'いつもの' })).status, 200);
    const bad = await json(port, '/api/presets/save', { name: '' });
    assert.equal(bad.status, 400);
    assert.match(bad.json().error, /名前/);
    assert.deepEqual(calls, [['save', 'いつもの'], ['delete', 'いつもの']]);
    assert.equal(saved.length, 2);
  });
});

test('テストのボタンから新しい妨害も出せる', async () => {
  await withServer(async ({ engine, port }) => {
    const sent = [];
    engine.manualAction = async (action) => (sent.push(action), { status: 'sent' });
    assert.equal((await json(port, '/api/action', { type: 'jail', count: 999 })).status, 200);
    assert.equal((await json(port, '/api/action', { type: 'fill_clear' })).status, 200);
    assert.equal((await json(port, '/api/action', { type: 'message' })).status, 400);
    assert.deepEqual(sent.map((a) => [a.type, a.count]), [['jail', 60], ['fill_clear', 1]]);
  });
});

test('配信画面の部品は部品ごとの URL で開け、知らない部品は 404', async () => {
  await withServer(async ({ port }) => {
    for (const id of ['alerts', 'gifts', 'round', 'ranking']) {
      const res = await request(port, { path: `/overlay/${id}` });
      assert.equal(res.status, 200, id);
      assert.match(res.text, /<!doctype html>/);
    }
    assert.equal((await request(port, { path: '/overlay/unknown' })).status, 404);
    assert.equal((await request(port, { path: '/overlay/toString' })).status, 404);
    assert.equal((await request(port, { path: '/overlay' })).status, 200, '前からの URL も使える');
    // LIVE Studio のリンク欄に通る形（末尾 .html）。LIVE Studio が確かめに読めるよう、ほかのアプリからも読める
    for (const path of ['/overlay/alerts.html', '/overlay.html']) {
      const res = await request(port, { path });
      assert.equal(res.status, 200, path);
      assert.equal(res.headers['access-control-allow-origin'], '*', path);
    }
    assert.equal((await request(port, { path: '/overlay/unknown.html' })).status, 404);
    assert.equal((await request(port, { path: '/' })).headers['access-control-allow-origin'], undefined, '操作画面は読ませない');
  });
});

test('ランキングのリセットを伝える', async () => {
  await withServer(async ({ engine, port }) => {
    let reset = 0;
    engine.resetRanking = () => reset++;
    assert.equal((await json(port, '/api/ranking/reset', {})).status, 200);
    assert.equal(reset, 1);
  });
});

test('配信画面の部品だけ、同じアプリの中でなら枠に入れられる（操作画面は入れさせない）', async () => {
  await withServer(async ({ port }) => {
    const widget = await request(port, { path: '/overlay/gifts' });
    assert.match(widget.headers['content-security-policy'], /frame-ancestors 'self'/);
    const panel = await request(port, { path: '/' });
    assert.match(panel.headers['content-security-policy'], /frame-ancestors 'none'/);
  });
});

test('設定ファイルの書き出しはダウンロードとして返し、読み込みはエンジンに渡す', async () => {
  await withServer(async ({ engine, port }) => {
    engine.exportSettings = () => ({ format: 'project-redstone-settings', version: 1, exportedAt: '2026-10-21T00:00:00.000Z', rules: [], presets: [] });
    engine.importSettings = (data) => {
      if (!data) throw new Error('読めません');
      return ['A'];
    };
    const res = await request(port, { method: 'GET', path: '/api/settings/export' });
    assert.equal(res.status, 200);
    assert.match(res.headers['content-disposition'], /project-redstone-2026-10-21\.json/);
    const ok = await json(port, '/api/settings/import', { data: { x: 1 } });
    assert.equal(ok.status, 200);
    assert.deepEqual(ok.json().imported, ['A']);
    assert.equal((await json(port, '/api/settings/import', {})).status, 400);
  });
});

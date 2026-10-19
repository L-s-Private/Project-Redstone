import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import http from 'node:http';
import { test } from 'node:test';
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

async function withServer(fn, { setup } = {}) {
  const engine = new FakeEngine();
  const saved = [];
  const ui = createUiServer({ engine, port: 0, setup, saveConfig: async (c) => saved.push({ ...c }) });
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
      res.on('end', () => resolve({ status: res.statusCode, text, json: () => JSON.parse(text) }));
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
      { kind: 'gift', giftId: '', giftName: 'Rose', diamonds: 0, count: 100, from: 'テスト' },
      { kind: 'follow', from: 'テスト' },
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
    const big = await request(port, { method: 'POST', path: '/api/test', headers: { 'Content-Type': 'application/json' }, body: 'x'.repeat(10000) }).catch(() => ({ status: 'closed' }));
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

test('プリセットを返し、ルールを検査してから保存する', async () => {
  await withServer(async ({ engine, saved, port }) => {
    const presets = (await request(port, { path: '/api/presets' })).json().presets;
    assert.ok(presets.length >= 3);

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
    await json(port, '/api/test', { kind: 'gift', giftName: '100ダイヤのギフト', diamonds: 100 });
    assert.equal(engine.calls[0].diamonds, 100);
  });
});

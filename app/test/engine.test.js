import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { test } from 'node:test';
import { describeAction, Engine } from '../src/engine.js';

class FakeClient extends EventEmitter {
  constructor() {
    super();
    this.sent = [];
    this.status = { connected: true, players: 1 };
  }
  start() {}
  stop() {}
  clear() {
    return 2;
  }
  async send(action) {
    this.sent.push(action);
    return { ok: true };
  }
}

class FakeTikTok extends EventEmitter {
  constructor() {
    super();
    this.status = { state: 'idle', username: '' };
    this.started = [];
  }
  async start(username) {
    this.started.push(username);
  }
  async stop() {
    this.stopped = true;
  }
}

function setup(configOverrides = {}) {
  const config = { tiktokUsername: 'taro', mod: { host: '127.0.0.1', port: 1 }, rules: [{ gift: 'Rose', action: 'tnt', count: 2 }], ...configOverrides };
  const client = new FakeClient();
  const tiktok = new FakeTikTok();
  const engine = new Engine({ config, client, tiktok });
  const alerts = [];
  const logs = [];
  engine.on('alert', (a) => alerts.push(a));
  engine.on('log', (l) => logs.push(l));
  return { engine, client, tiktok, alerts, logs };
}

const rose = { kind: 'gift', giftId: '1', giftName: 'Rose', diamonds: 1, count: 3, from: 'たろう' };

test('TikTokのギフトを妨害にして、オーバーレイ用の通知を出す', async () => {
  const { engine, client, tiktok, alerts } = setup();
  tiktok.emit('event', rose);
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(client.sent, [{ type: 'tnt', count: 6, from: 'たろう' }]);
  assert.deepEqual(alerts, [{ from: 'たろう', trigger: 'たろうさんから Rose ×3', action: 'TNT ×6' }]);
  assert.equal(engine.state.stats.sent, 1);
});

test('起動時にIDがあればTikTokにつなぎ、モックではつながない', () => {
  const live = setup();
  live.engine.start();
  assert.deepEqual(live.tiktok.started, ['taro']);

  const mock = setup();
  mock.engine.start({ mock: true });
  assert.deepEqual(mock.tiktok.started, []);
  assert.equal(mock.engine.state.mock, true);
});

test('IDを変えるとつなぎ直し、空にすると止める', async () => {
  const { engine, tiktok } = setup({ tiktokUsername: '' });
  await engine.setTikTokUsername(' @hanako ');
  assert.equal(engine.config.tiktokUsername, 'hanako');
  assert.deepEqual(tiktok.started, ['hanako']);
  await engine.setTikTokUsername('');
  assert.equal(tiktok.stopped, true);
});

test('一時停止・全妨害ストップ', async () => {
  const { engine, client, alerts } = setup();
  engine.pause();
  await engine.handleEvent(rose);
  assert.equal(client.sent.length, 0);
  assert.equal(alerts.length, 0);
  engine.resume();
  assert.equal(engine.stopAll(), 2);
  assert.equal(engine.state.paused, true);
});

test('ログは新しい200件だけ残す', () => {
  const { engine } = setup();
  for (let i = 0; i < 250; i++) engine.log('info', `${i}`);
  assert.equal(engine.logs.length, 200);
  assert.equal(engine.logs[0].text, '50');
});

test('テスト送信の候補にルールのギフト名を出す', () => {
  const { engine } = setup({ rules: [{ gift: 'Rose', action: 'tnt' }, { event: 'follow', action: 'tnt' }, { gift: 'Rose', action: 'mob' }] });
  assert.deepEqual(engine.state.giftNames, ['Rose']);
});

test('妨害の表示名', () => {
  assert.equal(describeAction({ type: 'mob', mob: 'creeper', count: 2 }), 'クリーパー ×2');
  assert.equal(describeAction({ type: 'bury', count: 3 }), '埋め立て ×3');
  assert.equal(describeAction({ type: 'message', count: 1 }), 'メッセージ');
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Dispatcher } from '../src/dispatcher.js';

const rose = { kind: 'gift', giftId: '1', giftName: 'Rose', diamonds: 1, count: 1, from: 'たろう' };

function setup(rules, response = { ok: true }) {
  const sent = [];
  let now = 0;
  const client = {
    async send(action) {
      sent.push(action);
      if (response instanceof Error) throw response;
      return response;
    },
  };
  const dispatcher = new Dispatcher({ rules, client, now: () => now });
  return { dispatcher, sent, advance: (ms) => { now += ms; } };
}

test('ルールに合えば送る、合わなければ無視する', async () => {
  const { dispatcher, sent } = setup([{ gift: 'Rose', action: 'tnt' }]);
  assert.equal((await dispatcher.handle(rose)).status, 'sent');
  assert.equal((await dispatcher.handle({ ...rose, giftName: 'Galaxy' })).status, 'no_rule');
  assert.equal(sent.length, 1);
  assert.deepEqual(dispatcher.stats, { received: 2, sent: 1, skipped: 1, failed: 0 });
});

test('一時停止中は送らない', async () => {
  const { dispatcher, sent } = setup([{ gift: 'Rose', action: 'tnt' }]);
  dispatcher.paused = true;
  assert.equal((await dispatcher.handle(rose)).status, 'paused');
  dispatcher.paused = false;
  assert.equal((await dispatcher.handle(rose)).status, 'sent');
  assert.equal(sent.length, 1);
});

test('クールダウン中は同じルールを出さない', async () => {
  const { dispatcher, advance } = setup([{ gift: 'Rose', action: 'tnt', cooldownSec: 10 }, { event: 'follow', action: 'tnt' }]);
  assert.equal((await dispatcher.handle(rose)).status, 'sent');
  advance(9999);
  assert.equal((await dispatcher.handle(rose)).status, 'cooldown');
  assert.equal((await dispatcher.handle({ kind: 'follow', from: '' })).status, 'sent');
  advance(1);
  assert.equal((await dispatcher.handle(rose)).status, 'sent');
});

test('MODが断ったときや通信失敗を失敗として数える', async () => {
  const refused = setup([{ gift: 'Rose', action: 'tnt' }], { ok: false, error: 'ワールドにプレイヤーがいません' });
  assert.deepEqual(await refused.dispatcher.handle(rose), {
    status: 'failed',
    action: { type: 'tnt', count: 1, from: 'たろう' },
    error: 'ワールドにプレイヤーがいません',
  });
  const broken = setup([{ gift: 'Rose', action: 'tnt' }], new Error('MODとの接続が切れました'));
  assert.equal((await broken.dispatcher.handle(rose)).error, 'MODとの接続が切れました');
  assert.equal(broken.dispatcher.stats.failed, 1);
});

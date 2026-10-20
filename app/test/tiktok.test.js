import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { test } from 'node:test';
import { TikTokSource } from '../src/tiktok.js';

class UserOfflineError extends Error {}

const lib = {
  WebcastEvent: { GIFT: 'gift', FOLLOW: 'follow', SHARE: 'share', STREAM_END: 'streamEnd' },
  ControlEvent: { DISCONNECTED: 'disconnected' },
  UserOfflineError,
};

/** connect() の結果を順に返す偽の接続 */
function fakeConnections(...outcomes) {
  const made = [];
  const createConnection = async (username) => {
    const connection = new EventEmitter();
    connection.username = username;
    connection.connect = async () => {
      const outcome = outcomes.shift() ?? 'ok';
      if (outcome === 'offline') throw new UserOfflineError();
      if (outcome === 'error') throw new Error('通信エラー');
    };
    connection.disconnect = async () => {
      connection.disconnected = true;
    };
    made.push(connection);
    return { lib, connection };
  };
  return { made, createConnection };
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function track(source) {
  const states = [];
  const logs = [];
  source.on('status', (s) => states.push(s.state));
  source.on('log', (l) => logs.push(l.text));
  return { states, logs };
}

test('配信前は待ち、始まったらつながる。待っている間はログを繰り返さない', async () => {
  const { createConnection } = fakeConnections('offline', 'offline', 'offline', 'ok');
  const source = new TikTokSource({ createConnection, retryOfflineMs: 5 });
  const { states, logs } = track(source);
  await source.start('taro');
  await wait(60);
  assert.deepEqual(states, ['connecting', 'waiting', 'connected']);
  assert.equal(logs.filter((l) => l.includes('まだ配信していません')).length, 1);
  await source.stop();
});

test('ギフトを受け取って渡す（連打の途中は渡さない）', async () => {
  const { made, createConnection } = fakeConnections('ok');
  const source = new TikTokSource({ createConnection });
  const events = [];
  source.on('event', (e) => events.push(e));
  await source.start('taro');
  const gift = { giftId: '1', user: { nickname: 'はなこ' }, gift: { name: 'Rose', type: 1, diamondCount: 1 } };
  made[0].emit('gift', { ...gift, repeatCount: 2, repeatEnd: 0 });
  made[0].emit('gift', { ...gift, repeatCount: 5, repeatEnd: 1 });
  made[0].emit('follow', { user: { nickname: 'はなこ' } });
  assert.deepEqual(events.map((e) => [e.kind, e.count]), [['gift', 5], ['follow', undefined]]);
  await source.stop();
});

test('切れたらつなぎ直す', async () => {
  const { made, createConnection } = fakeConnections('ok', 'ok');
  const source = new TikTokSource({ createConnection, retryDisconnectedMs: 5 });
  const { states } = track(source);
  await source.start('taro');
  made[0].emit('disconnected');
  await wait(30);
  assert.deepEqual(states, ['connecting', 'connected', 'retrying', 'connecting', 'connected']);
  await source.stop();
});

test('IDを変えたら前の接続を切り、前の接続のイベントは無視する', async () => {
  const { made, createConnection } = fakeConnections('ok', 'ok');
  const source = new TikTokSource({ createConnection });
  const events = [];
  source.on('event', (e) => events.push(e));
  await source.start('taro');
  await source.start('hanako');
  assert.equal(made[0].disconnected, true);
  assert.equal(made[1].username, 'hanako');
  made[0].emit('follow', { user: { nickname: '古い接続' } });
  made[1].emit('follow', { user: { nickname: '新しい接続' } });
  assert.deepEqual(events.map((e) => e.from), ['新しい接続']);
  await source.stop();
  assert.equal(source.status.state, 'idle');
});

test('つながったら、どの配信か（roomId）を知らせる', async () => {
  const { made, createConnection } = fakeConnections('ok');
  const source = new TikTokSource({
    createConnection: async (username) => {
      const result = await createConnection(username);
      result.connection.connect = async () => ({ roomId: '7300' });
      return result;
    },
  });
  const lives = [];
  source.on('live', (l) => lives.push(l));
  await source.start('taro');
  assert.deepEqual(lives, [{ roomId: '7300' }]);
  assert.equal(made.length, 1);
  await source.stop();
});

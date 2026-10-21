import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Analytics, KEEP_DAYS } from '../src/analytics.js';

const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;
const rose = (extra = {}) => ({ kind: 'gift', giftName: 'Rose', giftNameJa: 'バラ', diamonds: 1, count: 5, from: 'たろう', ...extra });

function setup(saved) {
  let time = 1_000_000_000;
  const analytics = new Analytics(saved, () => time);
  return { analytics, advance: (ms) => (time += ms) };
}

test('配信ごとに、ギフト・コイン・いいね・フォロー・シェアと、分ごとの流れを数える', () => {
  const { analytics, advance } = setup();
  analytics.startStream('room-1');
  analytics.recordEvent(rose());
  analytics.recordEvent({ kind: 'gift', giftName: 'Galaxy', diamonds: 1000, count: 1, from: 'はなこ' });
  advance(2 * MIN);
  analytics.recordEvent({ kind: 'like', count: 30 });
  analytics.recordEvent({ kind: 'follow', from: 'じろう' });
  analytics.recordEvent({ kind: 'share', from: 'じろう' });
  const [s] = analytics.list();
  assert.equal(s.gifts, 6);
  assert.equal(s.coins, 1005);
  assert.equal(s.likes, 30);
  assert.equal(s.follows, 1);
  assert.equal(s.shares, 1);
  assert.equal(s.supporterCount, 2);
  const detail = analytics.get(s.id);
  assert.deepEqual(detail.timeline.map((b) => [b.m, b.coins, b.likes]), [[0, 1005, 0], [2, 0, 30]]);
  assert.deepEqual(detail.supporters.map((x) => x.name), ['はなこ', 'たろう'], 'コインの多い順');
  assert.equal(detail.topGifts[1].name, 'バラ', '日本語名で数える');
  assert.equal(detail.gifts, 6, 'まとめのギフト数はそのまま');
});

test('テスト送信は数えない', () => {
  const { analytics } = setup();
  assert.equal(analytics.recordEvent(rose({ test: true })), false);
  assert.equal(analytics.recordResult({ test: true }, { status: 'sent', action: { type: 'tnt' } }), false);
  assert.equal(analytics.list().length, 0);
});

test('出した妨害・失敗の理由・出さなかった理由を数え、失敗の割合を出す', () => {
  const { analytics } = setup();
  analytics.startStream('room-1');
  const ev = rose();
  analytics.recordResult(ev, { status: 'sent', action: { type: 'tnt', count: 5 } });
  analytics.recordResult(ev, { status: 'sent', action: { type: 'mob', mob: 'pig' } });
  analytics.recordResult(ev, { status: 'sent', action: { type: 'tnt' } });
  analytics.recordResult(ev, { status: 'failed', error: 'ワールドにプレイヤーがいません' });
  analytics.recordResult(ev, { status: 'cooldown' });
  const [s] = analytics.list();
  assert.deepEqual(s.actions, { sent: 3, failed: 1, cooldown: 1, paused: 0, no_rule: 0 });
  assert.equal(s.failureRate, 25);
  const detail = analytics.get(s.id);
  assert.deepEqual(detail.byAction, [{ key: 'tnt', count: 2 }, { key: 'mob:pig', count: 1 }]);
  assert.deepEqual(detail.failures, [{ reason: 'ワールドにプレイヤーがいません', count: 1 }]);
});

test('別の配信（roomId）になったら新しく数える。roomId がわかる前の分は、その配信にまとめる', () => {
  const { analytics, advance } = setup();
  analytics.recordEvent(rose());
  assert.equal(analytics.startStream('room-1'), false, 'さっきの分を room-1 にする');
  assert.equal(analytics.startStream('room-1'), false, '同じ配信につなぎ直しただけ');
  advance(3 * 60 * MIN);
  assert.equal(analytics.startStream('room-2'), true);
  analytics.recordEvent(rose());
  assert.deepEqual(analytics.list().map((s) => s.gifts), [5, 5], '新しい順');
});

test('埋め立ての進み具合は、配信中だけ記録する', () => {
  const { analytics, advance } = setup();
  assert.equal(analytics.recordGame({ phase: 'filling', percent: 10, round: 0 }), false, '配信がなければ記録しない');
  analytics.startStream('room-1');
  analytics.recordGame({ phase: 'filling', percent: 40, round: 2 });
  assert.equal(analytics.recordGame({ phase: 'filling', percent: 40, round: 2 }), false, '変わらなければ保存しない');
  advance(60 * MIN);
  assert.equal(analytics.recordGame({ phase: 'filling', percent: 90, round: 3 }), false, 'イベントのない時間が長ければ、配信は終わっている');
  const [s] = analytics.list();
  assert.equal(s.rounds, 2);
  assert.deepEqual(analytics.get(s.id).timeline, [{ m: 0, coins: 0, likes: 0, actions: 0, fill: 40, round: 2 }]);
});

test('30日より前の配信は消える。保存した形から戻せる', () => {
  const { analytics, advance } = setup();
  analytics.startStream('old');
  analytics.recordEvent(rose());
  advance((KEEP_DAYS + 1) * DAY);
  analytics.startStream('new');
  analytics.recordEvent(rose());
  assert.equal(analytics.list().length, 1);
  const restored = new Analytics(JSON.parse(JSON.stringify(analytics)), () => 1_000_000_000 + (KEEP_DAYS + 1) * DAY);
  assert.equal(restored.list()[0].gifts, 5);
  assert.equal(new Analytics({ streams: [{ broken: true }] }).list().length, 0, '壊れた記録は捨てる');
});

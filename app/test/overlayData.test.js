import assert from 'node:assert/strict';
import { test } from 'node:test';
import { describeAction } from '../src/engine.js';
import { giftTable, Ranking } from '../src/overlayData.js';

const catalog = { バラ: { nameJa: 'バラ', diamonds: 1, image: 'https://x/rose.png' }, クラッカー: { nameJa: 'クラッカー', diamonds: 100, image: 'https://x/c.png' } };
const find = (name) => catalog[name] ?? null;

test('ギフト表: 名前のギフト（安い順）→ コイン数 → いいね → フォローの順。メッセージだけのルールは出さない', () => {
  const rows = giftTable([
    { event: 'follow', action: 'jail', count: 10 },
    { minDiamonds: 100, action: 'tnt', count: 5 },
    { gift: 'クラッカー', action: 'mob', mob: 'zombie', count: 10 },
    { gift: 'ハートミー', action: 'message', label: 'ありがとう' },
    { likes: 100, action: 'fill_help', count: 5 },
    { minDiamonds: 1, action: 'tnt', count: 1 },
    { gift: 'バラ', action: 'fill_clear' },
    { gift: 'ないギフト', action: 'tnt', count: 99 },
  ], find, describeAction);
  assert.deepEqual(rows.map((r) => [r.trigger, r.label, r.action]), [
    ['gift', 'バラ', '全消し'],
    ['gift', 'クラッカー', 'ゾンビ ×10'],
    ['gift', 'ないギフト', 'TNT ×20'],
    ['coins', '1以上', 'TNT ×1'],
    ['coins', '100以上', 'TNT ×5'],
    ['likes', '100回', 'お助けブロック ×5'],
    ['follow', 'フォロー', '逮捕 10秒'],
  ]);
  assert.equal(rows[0].image, 'https://x/rose.png');
  assert.equal(rows[0].coins, 1);
  assert.equal(rows[1].icon, 'zombie');
  assert.equal(rows[2].image, '', '一覧にないギフトは絵なし');
});

test('ランキング: コインの多い順に5人まで。名前のない人と0コインは数えない', () => {
  const ranking = new Ranking();
  ranking.add('a', 10);
  ranking.add('b', 100);
  ranking.add('a', 95);
  assert.equal(ranking.add('', 50), false);
  assert.equal(ranking.add('c', 0), false);
  for (const name of ['d', 'e', 'f', 'g']) ranking.add(name, 1);
  assert.deepEqual(ranking.top(), [{ name: 'a', coins: 105 }, { name: 'b', coins: 100 }, { name: 'd', coins: 1 }, { name: 'e', coins: 1 }, { name: 'f', coins: 1 }]);
  ranking.reset();
  assert.deepEqual(ranking.top(), []);
});

test('ランキングは配信ごと: 違う配信につながったら0から。同じ配信なら続きから（保存して戻せる）', () => {
  const ranking = new Ranking();
  assert.equal(ranking.startStream('room1'), true);
  ranking.add('a', 10);
  assert.equal(ranking.startStream('room1'), false, 'つなぎ直しただけ');
  assert.deepEqual(ranking.top(), [{ name: 'a', coins: 10 }]);
  // 起動し直して、同じ配信に戻る
  const restored = new Ranking(JSON.parse(JSON.stringify(ranking)));
  assert.equal(restored.startStream('room1'), false);
  assert.deepEqual(restored.top(), [{ name: 'a', coins: 10 }]);
  // 次の配信
  assert.equal(restored.startStream('room2'), true);
  assert.deepEqual(restored.top(), []);
  // 壊れた保存は読み飛ばす
  assert.deepEqual(new Ranking({ roomId: 3, coins: [['', 5], ['b', 'x'], ['c', 2]] }).toJSON(), { roomId: '', coins: [['c', 2]] });
});

test('ギフト表: ランダムは候補を並べ、条件は出さない', () => {
  const [row] = giftTable([{ gift: 'バラ', action: 'random', choices: [{ action: 'tnt', count: 2 }, { action: 'mob', mob: 'pig' }], when: 'countdown', minRound: 2 }], find, describeAction);
  assert.equal(row.action, 'TNT・ブタ', 'カードに収まるよう名前だけ');
  assert.equal(row.icon, 'tnt');
  assert.equal(row.when, undefined, '小さすぎて読めないので出さない');
});

test('いいねの目標: いいねのルールだけを、あと少しのものから3つまで出す', async () => {
  const { likeGoals } = await import('../src/overlayData.js');
  const describe = (a) => (a.type === 'tnt' ? 'TNT ×' + a.count : a.type === 'mob' ? 'ゾンビ ×' + a.count : 'お助け ×' + a.count);
  const rules = [
    { gift: 'バラ', action: 'tnt', count: 1 },
    { likes: 100, action: 'fill_help', count: 5 },
    { likes: 1000, action: 'tnt', count: 10, when: 'filling' },
    { likes: 50, action: 'message', label: 'ありがとう！' },
    { likes: 300, action: 'random', choices: [{ action: 'tnt', count: 2 }, { action: 'mob', mob: 'zombie', count: 3 }] },
  ];
  const goals = likeGoals(rules, new Map([[1, 90], [2, 990], [3, 0], [4, 299]]), describe);
  assert.deepEqual(goals.map((g) => [g.likes, g.current]), [[300, 299], [100, 90], [1000, 990]]);
  assert.equal(goals[0].action, 'ランダム（TNT・ゾンビ）');
  assert.equal(goals[2].condition, '埋め立て中');
  assert.equal(likeGoals(rules, new Map(), describe).find((g) => g.likes === 50).action, 'ありがとう！');
});

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

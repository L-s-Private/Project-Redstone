import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildAction, describeEvent, findRuleIndex } from '../src/rules.js';

const gift = (giftName, extra = {}) => ({ kind: 'gift', giftId: '1', giftName, diamonds: 1, count: 1, from: 'たろう', ...extra });

const rules = [
  { gift: 'rose', action: 'tnt', count: 2 },
  { giftId: 99, action: 'mob', mob: 'creeper' },
  { minDiamonds: 100, action: 'tnt', count: 1 },
  { event: 'follow', action: 'message', label: 'ありがとう' },
];

test('ギフト名は大文字小文字を区別せず、上から順に合ったルールを使う', () => {
  assert.equal(findRuleIndex(rules, gift('Rose')), 0);
  assert.equal(findRuleIndex(rules, gift('Unknown', { giftId: '99' })), 1);
  assert.equal(findRuleIndex(rules, gift('Galaxy', { diamonds: 1000 })), 2);
  assert.equal(findRuleIndex(rules, { kind: 'follow', from: '' }), 3);
  assert.equal(findRuleIndex(rules, gift('Unknown')), -1);
  assert.equal(findRuleIndex(rules, { kind: 'share', from: '' }), -1);
});

test('連打の個数ぶん回数を増やし、上限で止める', () => {
  assert.deepEqual(buildAction(rules[0], gift('Rose', { count: 3 })), { type: 'tnt', count: 6, from: 'たろう' });
  assert.equal(buildAction(rules[0], gift('Rose', { count: 100 })).count, 20);
  assert.equal(buildAction({ ...rules[0], maxCount: 5 }, gift('Rose', { count: 100 })).count, 5);
  assert.equal(buildAction({ minDiamonds: 1, action: 'fill_expand', count: 2 }, gift('Galaxy', { count: 9 })).count, 5);
  assert.equal(buildAction({ likes: 100, action: 'fill_help', count: 10 }, { kind: 'like', count: 3, from: '' }).count, 30);
});

test('モブ・ブロック・表示文をそのまま渡す', () => {
  assert.deepEqual(buildAction(rules[1], gift('x')), { type: 'mob', count: 1, from: 'たろう', mob: 'creeper' });
  assert.deepEqual(buildAction(rules[3], { kind: 'follow', from: 'はなこ' }), { type: 'message', count: 1, from: 'はなこ', label: 'ありがとう' });
});

test('ログ用の説明文', () => {
  assert.equal(describeEvent(gift('Rose', { count: 5 })), 'たろうさんから Rose ×5');
  assert.equal(describeEvent({ kind: 'follow', from: '' }), '誰かがフォロー');
});

test('並び順に関係なく、名前のギフトが先、ダイヤ数は大きい数のルールを使う', () => {
  const mixed = [
    { minDiamonds: 1, action: 'tnt' },
    { minDiamonds: 100, action: 'fill_clear' },
    { minDiamonds: 30, action: 'fill_expand' },
    { gift: 'クラッカー', action: 'jail', count: 10 },
  ];
  assert.equal(findRuleIndex(mixed, gift('クラッカー', { diamonds: 100 })), 3, '名前で決めたルールが先');
  assert.equal(findRuleIndex(mixed, gift('Galaxy', { diamonds: 1000 })), 1, '100以上がいちばん大きい');
  assert.equal(findRuleIndex(mixed, gift('Donut', { diamonds: 30 })), 2);
  assert.equal(findRuleIndex(mixed, gift('Rose', { diamonds: 1 })), 0);
  assert.equal(findRuleIndex([{ gift: 'a', action: 'tnt' }, { gift: 'A', action: 'jail' }], gift('a')), 0, '同じなら上のもの');
});

test('新しい妨害も上限で止める（秒・段）', () => {
  assert.equal(buildAction({ gift: 'x', action: 'jail', count: 30 }, gift('x', { count: 5 })).count, 60);
  assert.equal(buildAction({ gift: 'x', action: 'fill_clear' }, gift('x', { count: 5 })).count, 1);
  assert.equal(buildAction({ gift: 'x', action: 'fill_layer', count: 1 }, gift('x', { count: 9 })).count, 5);
});

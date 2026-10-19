import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildAction, describeEvent, findRuleIndex } from '../src/rules.js';

const gift = (giftName, extra = {}) => ({ kind: 'gift', giftId: '1', giftName, diamonds: 1, count: 1, from: 'たろう', ...extra });

const rules = [
  { gift: 'rose', action: 'tnt', count: 2 },
  { giftId: 99, action: 'mob', mob: 'creeper' },
  { minDiamonds: 100, action: 'bury', count: 1 },
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
  assert.equal(buildAction({ ...rules[2], count: 2 }, gift('Galaxy', { count: 9 })).count, 5);
});

test('モブ・ブロック・表示文をそのまま渡す', () => {
  assert.deepEqual(buildAction(rules[1], gift('x')), { type: 'mob', count: 1, from: 'たろう', mob: 'creeper' });
  assert.deepEqual(buildAction(rules[3], { kind: 'follow', from: 'はなこ' }), { type: 'message', count: 1, from: 'はなこ', label: 'ありがとう' });
});

test('ログ用の説明文', () => {
  assert.equal(describeEvent(gift('Rose', { count: 5 })), 'たろうさんから Rose ×5');
  assert.equal(describeEvent({ kind: 'follow', from: '' }), '誰かがフォロー');
});

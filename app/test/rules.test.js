import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildAction, describeEvent, findRuleIndex, pickChoice } from '../src/rules.js';

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

test('条件のあるルールは、埋め立ての状況が合うときだけ当てはまり、合えば条件のないルールより先', () => {
  const list = [
    { gift: 'rose', action: 'mob', mob: 'zombie' },
    { gift: 'rose', action: 'tnt', when: 'countdown' },
    { minDiamonds: 1, action: 'lightning', when: 'filling', minRound: 3 },
  ];
  const filling = (round) => ({ phase: 'filling', round });
  assert.equal(findRuleIndex(list, gift('Rose')), 0, '埋め立てが始まっていなければ条件のないルール');
  assert.equal(findRuleIndex(list, gift('Rose'), { phase: 'countdown', round: 0 }), 1);
  assert.equal(findRuleIndex(list, gift('Rose'), filling(1)), 0, '3ラウンド目より前');
  assert.equal(findRuleIndex(list, gift('Rose'), filling(2)), 2, '3ラウンド目（クリア2回）からは条件つきが先');
  assert.equal(findRuleIndex(list, gift('Rose'), { phase: 'cleared', round: 10 }), 0, '全部クリアしたら条件は合わない');
});

test('ランダム: 重みで抽選し、noRepeat なら同じものを続けない', () => {
  const rule = { gift: 'rose', action: 'random', choices: [{ action: 'tnt', count: 2 }, { action: 'mob', mob: 'pig', weight: 3 }] };
  assert.equal(pickChoice(rule, undefined, () => 0.2), 0, '重み 1:3 なので 0〜0.25 は1つ目');
  assert.equal(pickChoice(rule, undefined, () => 0.3), 1);
  assert.equal(pickChoice({ ...rule, noRepeat: true }, 1, () => 0.99), 0, '前に出したものは選ばない');
  assert.deepEqual(buildAction({ ...rule, label: 'どれかな', maxCount: 3 }, gift('Rose', { count: 5 }), rule.choices[0]),
    { type: 'tnt', count: 3, from: 'たろう', label: 'どれかな' });
});

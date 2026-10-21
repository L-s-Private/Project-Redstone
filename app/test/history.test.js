import assert from 'node:assert/strict';
import { test } from 'node:test';
import { diffRules, MAX_ENTRIES, RulesHistory, triggerText } from '../src/history.js';

test('保存するたびに残し、同じなら残さない。新しい順に、1つ前との違いつきで出す', () => {
  let time = 1000;
  const history = new RulesHistory({}, () => time++);
  assert.equal(history.record([{ gift: 'バラ', action: 'tnt', count: 1 }], 'first'), true);
  assert.equal(history.record([{ gift: 'バラ', action: 'tnt', count: 1 }]), false, '変わっていなければ残さない');
  history.record([{ gift: 'バラ', action: 'tnt', count: 3 }, { likes: 100, action: 'night', count: 30 }], 'preset');
  const [latest, first] = history.list();
  assert.equal(latest.reasonText, 'プリセットを読み込んで保存');
  assert.equal(latest.count, 2);
  assert.deepEqual(latest.diff, { added: ['いいね100回ごと → night ×30'], removed: [], changed: ['バラ: tnt ×1 → tnt ×3'] });
  assert.equal(first.diff, null, 'いちばん古いものは比べる相手がない');
  assert.deepEqual(history.get(first.id).rules, [{ gift: 'バラ', action: 'tnt', count: 1 }]);
});

test('30件より古いものは消える。保存した形から戻せる', () => {
  let time = 0;
  const history = new RulesHistory({}, () => time++);
  for (let i = 1; i <= MAX_ENTRIES + 5; i++) history.record([{ likes: i, action: 'tnt' }]);
  assert.equal(history.list().length, MAX_ENTRIES);
  const restored = new RulesHistory(JSON.parse(JSON.stringify(history)));
  assert.equal(restored.list()[0].count, 1);
  assert.equal(new RulesHistory({ entries: [{ broken: 1 }] }).list().length, 0, '壊れたものは捨てる');
});

test('違い: 条件が違えば別のきっかけ。同じきっかけが2つあっても組にして比べる', () => {
  assert.equal(triggerText({ gift: 'バラ', when: 'countdown' }), 'バラ（カウントダウン中）');
  const d = diffRules(
    [{ gift: 'バラ', action: 'tnt' }, { gift: 'バラ', action: 'night', count: 30 }, { event: 'follow', action: 'message', label: 'ありがとう' }],
    [{ gift: 'バラ', action: 'tnt' }, { gift: 'バラ', action: 'night', count: 60 }, { gift: 'バラ', action: 'tnt', when: 'countdown' }],
  );
  assert.deepEqual(d, {
    added: ['バラ（カウントダウン中） → tnt ×1'],
    removed: ['フォロー → メッセージ・「ありがとう」'],
    changed: ['バラ: night ×30 → night ×60'],
  });
});

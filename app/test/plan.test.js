import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkPresetSave, checkRules, CURRENT_PLAN, MAX_RULES, MAX_USER_PRESETS, PLANS } from '../src/plan.js';
import { BUILTIN_PRESETS } from '../src/presets.js';

const rules = (n) => Array.from({ length: n }, () => ({ minDiamonds: 1, action: 'tnt' }));

test('無料ベータの間は、全員が有料版と同じ上限', () => {
  assert.equal(CURRENT_PLAN, 'plus');
  assert.equal(MAX_USER_PRESETS, 20);
  assert.equal(MAX_RULES, 50);
});

test('自分のプリセット: 上限までは保存でき、上限でも同じ名前の上書きはできる', () => {
  assert.equal(checkPresetSave('free', [], 'A'), null);
  assert.match(checkPresetSave('free', [{ name: 'A' }], 'B'), /無料版で保存できる自分のプリセットは1個まで/);
  assert.equal(checkPresetSave('free', [{ name: 'A' }], 'A'), null);
  assert.equal(checkPresetSave('plus', [{ name: 'A' }], 'B'), null);
});

test('ルール: 上限を超えて増やせないが、超えたまま減らす・変えるのはできる（消さない）', () => {
  assert.equal(checkRules('free', rules(12), 3), null);
  assert.match(checkRules('free', rules(13), 12), /無料版で使えるルールは12件まで/);
  assert.equal(checkRules('free', rules(30), 40), null, '有料版から戻ったあと、減らすのはよい');
  assert.equal(checkRules('free', rules(30), 30), null, '同じ数のまま変えるのはよい');
  assert.equal(checkRules('plus', rules(50), 0), null);
});

test('上限の数は、仕様書の案と同じ', () => {
  assert.deepEqual([PLANS.free.userPresets, PLANS.free.rulesPerPreset], [1, 12]);
  assert.deepEqual([PLANS.plus.userPresets, PLANS.plus.rulesPerPreset], [20, 50]);
});

test('（確認用）入っているプリセットのルール数', () => {
  // 無料版の12件を超えるものがある（激辛は14件）。無料版を効かせる前に、どちらかを決める必要がある
  const counts = Object.fromEntries(BUILTIN_PRESETS.map((p) => [p.name, p.rules.length]));
  assert.ok(counts['激辛'] > PLANS.free.rulesPerPreset);
});

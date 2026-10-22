import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkMining, clock, currentMode, modeNote, modeProblem, parseMining, presetOf } from '../src/mining.js';

test('採掘チャレンジの設定: おかしな値は既定値にし、プリセットと同じかを見分ける', () => {
  assert.deepEqual(parseMining(undefined), { preset: 'normal', item: 'minecraft:raw_iron', targetCount: 16, seconds: 180 });
  assert.deepEqual(parseMining({ item: 'minecraft:dirt', targetCount: 0, seconds: 9999 }), { preset: 'normal', item: 'minecraft:raw_iron', targetCount: 16, seconds: 180 });
  assert.equal(parseMining({ item: 'minecraft:diamond', targetCount: 3, seconds: 300 }).preset, 'hard');
  assert.equal(presetOf({ item: 'minecraft:diamond', targetCount: 4, seconds: 300 }), 'custom');
});

test('採掘チャレンジの設定: 範囲の外は丸めずに断る', () => {
  assert.equal(checkMining({ item: 'minecraft:coal', targetCount: 1, seconds: 30 }), null);
  assert.equal(checkMining({ item: 'minecraft:coal', targetCount: 512, seconds: 1800 }), null);
  assert.match(checkMining({ item: 'minecraft:stone', targetCount: 16, seconds: 180 }), /対象/);
  assert.match(checkMining({ item: 'minecraft:coal', targetCount: 513, seconds: 180 }), /目標数/);
  assert.match(checkMining({ item: 'minecraft:coal', targetCount: 1.5, seconds: 180 }), /目標数/);
  assert.match(checkMining({ item: 'minecraft:coal', targetCount: 16, seconds: 29 }), /制限時間/);
  assert.equal(clock(185), '03:05');
  assert.equal(clock(-3), '00:00');
});

test('今のモードは、動いているゲームを優先し、なければ選んでいるモード', () => {
  assert.deepEqual(currentMode({ fill: { phase: 'filling' } }, 'mining_challenge'), { mode: 'fill', running: true, paused: false });
  assert.deepEqual(currentMode({ mining: { state: 'paused' } }, 'fill'), { mode: 'mining_challenge', running: false, paused: true });
  assert.deepEqual(currentMode({ mining: { state: 'succeeded' } }, 'fill'), { mode: 'fill', running: false, paused: false }, '終わった挑戦は数えない');
  assert.deepEqual(currentMode({}, 'nope'), { mode: 'fill', running: false, paused: false });
});

test('埋め立て専用・採掘チャレンジ専用の妨害は、ほかのモードでは出さない', () => {
  const mining = { mode: 'mining_challenge', running: true, paused: false };
  const fill = { mode: 'fill', running: false, paused: false };
  assert.equal(modeProblem('jail', mining), 'mode_incompatible');
  assert.equal(modeProblem('tnt', mining), null);
  assert.equal(modeProblem('mining_bonus_drop', mining), null);
  assert.equal(modeProblem('mining_bonus_drop', fill), 'mode_incompatible');
  assert.equal(modeProblem('mining_bonus_drop', { mode: 'mining_challenge', running: false, paused: false }), 'no_active_mode');
  assert.equal(modeProblem('fill_help', fill), null);
  assert.match(modeNote('fill_expand', 'mining_challenge'), /採掘チャレンジでは出ません/);
  assert.equal(modeNote('tnt', 'mining_challenge'), '');
});

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { ConfigError, parseConfig } from '../src/config.js';
import { PRESETS } from '../src/presets.js';

const valid = { tiktokUsername: '@taro', rules: [{ gift: 'Rose', action: 'tnt' }] };

test('既定値を補い、@を取る', () => {
  const config = parseConfig(valid);
  assert.equal(config.tiktokUsername, 'taro');
  assert.deepEqual(config.mod, { host: '127.0.0.1', port: 25599 });
});

test('同梱の設定例が読める', async () => {
  const example = JSON.parse(await readFile(new URL('../config.example.json', import.meta.url), 'utf8'));
  assert.ok(parseConfig(example).rules.length > 0);
});

test('間違った設定は日本語で理由を返す', () => {
  const bad = (rules, extra = {}) => () => parseConfig({ ...valid, ...extra, rules });
  assert.throws(bad([]), ConfigError);
  assert.throws(bad([{ action: 'tnt' }]), /どれか1つだけ/);
  assert.throws(bad([{ gift: 'Rose', event: 'follow', action: 'tnt' }]), /どれか1つだけ/);
  assert.throws(bad([{ event: 'like', action: 'tnt' }]), /event は/);
  assert.throws(bad([{ gift: 'Rose', action: 'nuke' }]), /action は/);
  assert.throws(bad([{ gift: 'Rose', action: 'message' }]), /label/);
  assert.throws(bad([{ gift: 'Rose', action: 'mob', mob: 'ghast' }]), /mob は/);
  assert.throws(bad([{ gift: 'Rose', action: 'bury', block: 'lava' }]), /block は/);
  assert.throws(bad([{ gift: 'Rose', action: 'tnt', count: 0 }]), /count/);
  assert.throws(bad([{ gift: 'Rose', action: 'tnt', cooldownSec: -1 }]), /cooldownSec/);
  assert.throws(bad(valid.rules, { mod: { port: 70000 } }), /mod.port/);
  assert.throws(() => parseConfig([]), ConfigError);
});

test('プリセットはどれも正しい設定になっている', () => {
  for (const preset of PRESETS) {
    const { rules } = parseConfig({ rules: preset.rules });
    assert.equal(rules.length, preset.rules.length, preset.name);
    // ダイヤ数のルールは大きい順（上から順に判定するため）
    const tiers = rules.filter((r) => r.minDiamonds !== undefined).map((r) => r.minDiamonds);
    assert.deepEqual(tiers, [...tiers].sort((a, b) => b - a), preset.name);
  }
  assert.equal(new Set(PRESETS.map((p) => p.id)).size, PRESETS.length);
});

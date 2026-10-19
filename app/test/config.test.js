import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { ConfigError, DEFAULT_FILL, parseConfig, parseFill } from '../src/config.js';

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
  assert.throws(bad([{ gift: 'Rose', action: 'bury' }]), /action は/);
  assert.throws(bad([{ likes: 0, action: 'tnt' }]), /いいねの回数/);
  assert.throws(bad([{ likes: 100, gift: 'Rose', action: 'tnt' }]), /どれか1つだけ/);
  assert.throws(bad([{ gift: 'Rose', action: 'tnt', count: 0 }]), /count/);
  assert.throws(bad([{ gift: 'Rose', action: 'tnt', cooldownSec: -1 }]), /cooldownSec/);
  assert.throws(bad(valid.rules, { mod: { port: 70000 } }), /mod.port/);
  assert.throws(() => parseConfig([]), ConfigError);
});

test('いいねのルールと、埋め立ての妨害を受け付け、知らない項目は捨てる', () => {
  const { rules } = parseConfig({ rules: [
    { likes: 1000, action: 'fill_help', count: 10, block: 'sand' },
    { gift: ' GG ', action: 'fill_expand', count: 2 },
    { gift: 'バラ', action: 'mob', mob: 'pig' },
  ] });
  assert.deepEqual(rules, [
    { likes: 1000, action: 'fill_help', count: 10 },
    { gift: 'GG', action: 'fill_expand', count: 2 },
    { gift: 'バラ', action: 'mob', mob: 'pig' },
  ]);
});

test('埋め立ての設定は、なければ既定値、おかしな値も既定値か範囲内にする', () => {
  assert.deepEqual(parseConfig(valid).fill, DEFAULT_FILL);
  assert.deepEqual(DEFAULT_FILL, {
    width: 11, height: 9, countdown: 10, rounds: 10, wall: 'glass', block: 'amethyst_block', skyY: 150, reach: 8, placeSpeed: 'fast', breakSpeed: 'fast',
  });
  assert.deepEqual(parseFill({ wall: 'bedrock', block: 'emerald_block', skyY: 999, reach: 0, width: 2 }), {
    ...DEFAULT_FILL, wall: 'bedrock', block: 'emerald_block', skyY: 300, reach: 1, width: 3,
  });
  assert.deepEqual(parseFill('broken'), DEFAULT_FILL);
  assert.equal(parseFill({ placeSpeed: 'fastest' }).placeSpeed, 'fastest');
  assert.equal(parseFill({ placeSpeed: 'warp' }).placeSpeed, 'fast');
  assert.equal(parseFill({ breakSpeed: 'fastest' }).breakSpeed, 'fastest');
  assert.equal(parseFill({ breakSpeed: 'instant' }).breakSpeed, 'fast', '前の版の値は既定に戻す');
  assert.equal(parseFill({ breakSpeed: 'warp' }).breakSpeed, 'fast');
  assert.equal(parseFill({ rounds: 0 }).rounds, 1);
  assert.equal(parseFill({ rounds: 500 }).rounds, 99);
});

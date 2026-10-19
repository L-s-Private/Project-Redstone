import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { ConfigError, parseConfig } from '../src/config.js';

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

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { ConfigError, DEFAULT_FILL, DEFAULT_WORLD, parseConfig, parseFill, parseWorld } from '../src/config.js';

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

test('設定例のダイヤ数のルールは高い順（上から最初に合ったものを使うため、安い方が先だと高額ギフトも安い妨害になる）', async () => {
  const example = JSON.parse(await readFile(new URL('../config.example.json', import.meta.url), 'utf8'));
  const diamonds = example.rules.filter((r) => r.minDiamonds !== undefined).map((r) => r.minDiamonds);
  assert.deepEqual(diamonds, [...diamonds].sort((a, b) => b - a));
  // 名前で決めたギフトは、ダイヤ数のルールより上に置く
  const lastGift = example.rules.findLastIndex((r) => r.gift !== undefined);
  const firstDiamonds = example.rules.findIndex((r) => r.minDiamonds !== undefined);
  assert.ok(lastGift < firstDiamonds);
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
    width: 11, height: 9, countdown: 10, rounds: 10, wall: 'glass', block: 'amethyst_block', handBlock: 'amethyst_block', skyY: 150, reach: 8,
    placeSpeed: 'fast', breakSpeed: 'fast', mobsAttack: true, mobLifetime: 30,
  });
  assert.deepEqual(parseFill({ wall: 'bedrock', block: 'emerald_block', skyY: 999, reach: 0, width: 2 }), {
    ...DEFAULT_FILL, wall: 'bedrock', block: 'emerald_block', handBlock: 'emerald_block', skyY: 300, reach: 1, width: 3,
  });
  assert.equal(parseFill({ block: 'diamond_block', handBlock: 'amethyst_block' }).handBlock, 'amethyst_block', '手に持つのと置かれるのは別にできる');
  assert.equal(parseFill({ block: 'diamond_block', handBlock: 'tnt' }).handBlock, 'diamond_block');
  assert.deepEqual(parseFill('broken'), DEFAULT_FILL);
  assert.equal(parseFill({ placeSpeed: 'fastest' }).placeSpeed, 'fastest');
  assert.equal(parseFill({ placeSpeed: 'warp' }).placeSpeed, 'fast');
  assert.equal(parseFill({ breakSpeed: 'fastest' }).breakSpeed, 'fastest');
  assert.equal(parseFill({ breakSpeed: 'instant' }).breakSpeed, 'fast', '前の版の値は既定に戻す');
  assert.equal(parseFill({ breakSpeed: 'warp' }).breakSpeed, 'fast');
  assert.equal(parseFill({ timeLimit: 180 }).timeLimit, undefined, '制限時間はなくした');
  assert.equal(parseFill({ mobLifetime: 0 }).mobLifetime, 0, '0 なら消えない');
  assert.equal(parseFill({ mobLifetime: 9999 }).mobLifetime, 600);
  assert.equal(parseFill({ mobsAttack: false }).mobsAttack, false);
  assert.equal(parseFill({ mobsAttack: 'no' }).mobsAttack, true);
  assert.equal(parseFill({ rounds: 0 }).rounds, 1);
  assert.equal(parseFill({ rounds: 500 }).rounds, 99);
});

test('ワールドの設定は、なければバニラと同じ、おかしな値も既定値にする', () => {
  assert.deepEqual(parseConfig(valid).world, DEFAULT_WORLD);
  assert.deepEqual(DEFAULT_WORLD, { time: 'normal', weather: 'normal', mobSpawning: true, keepInventory: false });
  assert.deepEqual(parseWorld({ time: 'day', weather: 'rain', mobSpawning: false, keepInventory: true }),
    { time: 'day', weather: 'rain', mobSpawning: false, keepInventory: true });
  assert.deepEqual(parseWorld({ time: 'dusk', weather: 'snow', mobSpawning: 'no' }), DEFAULT_WORLD);
  assert.deepEqual(parseWorld('broken'), DEFAULT_WORLD);
});

test('プリセット: 壊れたものは捨て、名前の長さを確かめる', async () => {
  const { parsePresets, parsePreset } = await import('../src/config.js');
  const ok = { name: ' いつもの ', rules: [{ gift: 'バラ', action: 'freeze', count: 5 }] };
  assert.deepEqual(parsePresets([ok, { name: '', rules: ok.rules }, { name: 'x', rules: [] }, 'bad']), [{ name: 'いつもの', rules: ok.rules }]);
  assert.deepEqual(parsePresets(undefined), []);
  assert.throws(() => parsePreset({ name: 'あ'.repeat(21), rules: ok.rules }));
});

test('入っているプリセットは、いったん無し（初めてのルールは設定例のもの）', async () => {
  const { BUILTIN_PRESETS } = await import('../src/presets.js');
  assert.deepEqual(BUILTIN_PRESETS, []);
});

test('ランダムと条件のルールを読む。おかしいものは理由つきで断る', async () => {
  const { parseConfig } = await import('../src/config.js');
  const rule = { gift: 'バラ', action: 'random', choices: [{ action: 'tnt', count: 2, weight: 3, extra: 1 }, { action: 'mob', mob: 'pig' }], noRepeat: true, when: 'filling', minRound: 2 };
  assert.deepEqual(parseConfig({ rules: [rule] }).rules[0], { ...rule, choices: [{ action: 'tnt', count: 2, weight: 3 }, { action: 'mob', mob: 'pig' }] });
  assert.throws(() => parseConfig({ rules: [{ ...rule, choices: [{ action: 'tnt' }] }] }), /2〜6個/);
  assert.throws(() => parseConfig({ rules: [{ ...rule, choices: [{ action: 'tnt' }, { action: 'message' }] }] }), /2番目/);
  assert.throws(() => parseConfig({ rules: [{ ...rule, choices: [{ action: 'tnt', weight: 11 }, { action: 'night' }] }] }), /出やすさ/);
  assert.throws(() => parseConfig({ rules: [{ ...rule, when: 'always' }] }), /when/);
  assert.throws(() => parseConfig({ rules: [{ ...rule, minRound: 0 }] }), /ラウンド/);
  assert.deepEqual(parseConfig({ rules: [{ gift: 'バラ', action: 'tnt', choices: [], noRepeat: true }] }).rules[0], { gift: 'バラ', action: 'tnt' }, 'ランダムでなければ候補は捨てる');
});

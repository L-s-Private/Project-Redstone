import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { ConfigError } from '../src/config.js';
import { configDir, loadUserConfig, saveUserConfig } from '../src/userConfig.js';

test('Windows では APPDATA の下に置く', () => {
  assert.equal(configDir({ APPDATA: 'C:\\Users\\me\\AppData\\Roaming' }, '/home/me'), join('C:\\Users\\me\\AppData\\Roaming', 'ProjectRedstone'));
  assert.equal(configDir({}, '/home/me'), join('/home/me', '.config', 'project-redstone'));
});

test('初回は設定例から作り、保存した内容を次回読める', async () => {
  const dir = join(await mkdtemp(join(tmpdir(), 'redstone-')), 'ProjectRedstone');
  const first = await loadUserConfig(dir);
  assert.equal(first.created, true);
  assert.equal(first.config.tiktokUsername, '');
  assert.ok(first.config.rules.length > 0);

  first.config.tiktokUsername = 'taro';
  await saveUserConfig(first.path, first.config);
  const second = await loadUserConfig(dir);
  assert.equal(second.created, false);
  assert.equal(second.config.tiktokUsername, 'taro');
  assert.deepEqual(Object.keys(JSON.parse(await readFile(first.path, 'utf8'))), ['tiktokUsername', 'mod', 'rules']);
});

test('壊れた設定ファイルは理由つきで断る', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'redstone-'));
  await writeFile(join(dir, 'config.json'), '{ broken');
  await assert.rejects(loadUserConfig(dir), ConfigError);
});

test('前の版で削除した妨害のルールは取り除いて保存し直す', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'redstone-'));
  await writeFile(join(dir, 'config.json'), JSON.stringify({
    tiktokUsername: 'taro',
    rules: [
      { minDiamonds: 100, action: 'launch', label: '空の彼方へ！' },
      { minDiamonds: 30, action: 'bury', count: 3, block: 'sand' },
      { gift: 'Rose', action: 'tnt', count: 3 },
    ],
  }));
  const { config, removed } = await loadUserConfig(dir);
  assert.equal(removed, 2);
  assert.deepEqual(config.rules, [{ gift: 'Rose', action: 'tnt', count: 3 }]);
  assert.equal(config.tiktokUsername, 'taro');
  assert.deepEqual(JSON.parse(await readFile(join(dir, 'config.json'), 'utf8')).rules, config.rules);

  // 全部消えたら設定例のルールに戻す
  await writeFile(join(dir, 'config.json'), JSON.stringify({ rules: [{ minDiamonds: 1, action: 'lightning' }] }));
  const reset = await loadUserConfig(dir);
  assert.ok(reset.config.rules.some((r) => r.gift === 'GG'));
});

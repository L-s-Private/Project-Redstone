import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createMediaStore, isMediaName, MAX_MEDIA_BYTES } from '../src/media.js';

test('演出のファイル: 中身から名前を決めて写し、同じものは1つにする。おかしな名前は読まない', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'redstone-media-'));
  try {
    const store = createMediaStore(join(dir, 'media'));
    const a = await store.save(Buffer.from('sound-a'), 'MP3');
    assert.match(a.name, /^[0-9a-f]{16}\.mp3$/);
    assert.equal(a.kind, 'sound');
    assert.deepEqual(await store.save(Buffer.from('sound-a'), 'mp3'), a);
    assert.equal((await store.save(Buffer.from('pic'), '.jpeg')).name.endsWith('.jpg'), true);
    assert.equal((await readdir(join(dir, 'media'))).length, 2);
    const file = await store.read(a.name);
    assert.equal(file.mime, 'audio/mpeg');
    assert.equal(file.body.toString(), 'sound-a');
    assert.equal(await store.read('../config.json'), null);
    assert.equal(await store.read('0123456789abcdef.exe'), null);
    await assert.rejects(store.save(Buffer.from('x'), 'exe'), /使えません/);
    await assert.rejects(store.save(Buffer.alloc(0), 'mp3'), /空/);
    await assert.rejects(store.save({ length: MAX_MEDIA_BYTES + 1 }, 'mp3'), /大きすぎます/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('演出の名前は、種類も確かめられる', () => {
  assert.equal(isMediaName('0123456789abcdef.mp3', 'sound'), true);
  assert.equal(isMediaName('0123456789abcdef.mp3', 'visual'), false);
  assert.equal(isMediaName('0123456789abcdef.webm', 'visual'), true);
  assert.equal(isMediaName('0123456789ABCDEF.mp3'), false);
  assert.equal(isMediaName('../x.mp3'), false);
});

test('ルールの演出を読む。おかしいものは断る', async () => {
  const { parseConfig } = await import('../src/config.js');
  const rule = { gift: 'バラ', action: 'tnt', media: { sound: '0123456789abcdef.mp3', visual: 'fedcba9876543210.gif', volume: 60, extra: 1 } };
  assert.deepEqual(parseConfig({ rules: [rule] }).rules[0].media, { sound: '0123456789abcdef.mp3', visual: 'fedcba9876543210.gif', volume: 60 });
  for (const media of [{}, { sound: 'fedcba9876543210.gif' }, { visual: '../a.png' }, { sound: '0123456789abcdef.mp3', volume: 101 }, 'x']) {
    assert.throws(() => parseConfig({ rules: [{ ...rule, media }] }), /演出/);
  }
});

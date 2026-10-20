import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { GiftCatalog, mergeGiftLists, parseGiftList } from '../src/giftCatalog.js';

const img = (name) => ({ url_list: [`https://p16-webcast.tiktokcdn.com/${name}.webp`] });
const list = (names) => ({
  data: {
    gifts: [
      { id: 11046, name: names.galaxy, diamond_count: 1000, image: img('galaxy') },
      { id: 5655, name: names.rose, diamond_count: 1, image: img('rose') },
      { id: 5487, name: names.heart, diamond_count: 5, image: img('heart') },
      { id: 9, name: '', diamond_count: 1, image: img('x') },
      { id: 10, name: 'NoImage', diamond_count: 1 },
    ],
  },
});
const english = list({ galaxy: 'Galaxy', rose: 'Rose', heart: 'Finger Heart' });
const japanese = list({ galaxy: '銀河', rose: 'バラ', heart: 'フィンガーハート' });

/** 言語ごとに一覧を返す偽の fetch */
function fakeFetch(calls = []) {
  return async (url) => {
    calls.push(url);
    return { ok: true, json: async () => (url.includes('webcast_language=ja-JP') ? japanese : english) };
  };
}

test('名前と絵のないギフトは捨て、英語と日本語の一覧を ID で合わせて安い順に並べる', () => {
  assert.equal(parseGiftList(english).length, 3);
  assert.deepEqual(parseGiftList(null), []);
  assert.deepEqual(mergeGiftLists(parseGiftList(english), parseGiftList(japanese)), [
    { id: '5655', name: 'Rose', nameJa: 'バラ', diamonds: 1, image: 'https://p16-webcast.tiktokcdn.com/rose.webp' },
    { id: '5487', name: 'Finger Heart', nameJa: 'フィンガーハート', diamonds: 5, image: 'https://p16-webcast.tiktokcdn.com/heart.webp' },
    { id: '11046', name: 'Galaxy', nameJa: '銀河', diamonds: 1000, image: 'https://p16-webcast.tiktokcdn.com/galaxy.webp' },
  ]);
});

async function tempPath() {
  return join(await mkdtemp(join(tmpdir(), 'redstone-gifts-')), 'gifts.json');
}

test('一覧を取ってファイルに残し、次はファイルから読む（1日たつまで取り直さない）', async () => {
  const path = await tempPath();
  const calls = [];
  let now = 1_000_000_000;
  const first = new GiftCatalog({ path, fetch: fakeFetch(calls), now: () => now });
  await first.load();
  assert.equal(calls.length, 2, '英語と日本語の2つを取る');
  assert.equal(first.find({ giftName: 'Rose' }).nameJa, 'バラ');
  assert.ok(first.version > 0);
  assert.equal(JSON.parse(await readFile(path, 'utf8')).gifts.length, 3);

  const second = new GiftCatalog({ path, fetch: fakeFetch(calls), now: () => now + 1000 });
  await second.load();
  assert.equal(calls.length, 2, 'ファイルが新しければ取りに行かない');
  assert.equal(second.find({ giftName: '銀河' }).image, 'https://p16-webcast.tiktokcdn.com/galaxy.webp');

  now += 25 * 60 * 60 * 1000;
  await new GiftCatalog({ path, fetch: fakeFetch(calls), now: () => now }).load();
  assert.equal(calls.length, 4, '1日たったら取り直す');
});

test('取れなければエラーにし、前に残した分はそのまま使える', async () => {
  const path = await tempPath();
  await new GiftCatalog({ path, fetch: fakeFetch(), now: () => 0 }).refresh();
  const offline = new GiftCatalog({ path, fetch: async () => { throw new Error('offline'); }, now: () => 10 ** 12 });
  await assert.rejects(offline.load(), /offline/);
  assert.equal(offline.find({ giftName: 'バラ' }).id, '5655');
});

test('ID・日本語名・英語名のどれでも探せる', async () => {
  const catalog = new GiftCatalog({ path: await tempPath(), fetch: fakeFetch() });
  await catalog.refresh();
  assert.equal(catalog.find({ giftId: '5487' }).nameJa, 'フィンガーハート');
  assert.equal(catalog.find({ giftId: '999', giftName: 'finger heart' }).id, '5487', 'ID が一覧になければ名前で');
  assert.equal(catalog.find({ giftName: 'バラ' }).name, 'Rose');
  assert.equal(catalog.find({ giftName: '知らないギフト' }), null);
  assert.equal(catalog.find(), null);
});

test('find は一覧が入れ替わったら新しい一覧から探す（索引を作り直す）', () => {
  const catalog = new GiftCatalog({ path: 'unused' });
  catalog.gifts = [{ id: '1', name: 'Rose', nameJa: 'バラ', diamonds: 1, image: '' }];
  assert.equal(catalog.find({ giftName: 'rose' })?.id, '1');
  catalog.gifts = [{ id: '2', name: 'Rose', nameJa: 'ローズ', diamonds: 1, image: '' }];
  assert.equal(catalog.find({ giftName: 'Rose' })?.id, '2');
  assert.equal(catalog.find({ giftName: 'バラ' }), null);
  assert.equal(catalog.find({ giftId: 2 })?.nameJa, 'ローズ');
});

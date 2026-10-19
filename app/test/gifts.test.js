import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeGift, normalizeLike, normalizeSocial } from '../src/gifts.js';

test('v3形式の単発ギフトを読める', () => {
  const event = normalizeGift({
    giftId: '5655',
    repeatCount: 1,
    repeatEnd: 0,
    user: { nickname: 'たろう', displayId: 'taro' },
    gift: { name: 'Rose', type: 2, diamondCount: 1 },
  });
  assert.deepEqual(event, { kind: 'gift', giftId: '5655', giftName: 'Rose', diamonds: 1, count: 1, from: 'たろう', image: '' });
});

test('ギフトの絵の URL も読む', () => {
  const event = normalizeGift({
    giftId: 5655,
    repeatEnd: 1,
    giftDetails: { giftName: 'Rose', diamondCount: 1, giftImage: { url: ['https://p16-webcast.tiktokcdn.com/rose.webp'] } },
  });
  assert.equal(event.image, 'https://p16-webcast.tiktokcdn.com/rose.webp');
});

test('連打ギフトは途中では数えず、終わったときに合計個数で返す', () => {
  const base = { giftId: '5655', user: { nickname: 'たろう' }, gift: { name: 'Rose', type: 1, diamondCount: 1 } };
  assert.equal(normalizeGift({ ...base, repeatCount: 3, repeatEnd: 0 }), null);
  assert.equal(normalizeGift({ ...base, repeatCount: 7, repeatEnd: 1 }).count, 7);
});

test('旧形式（giftDetails）も読める', () => {
  const event = normalizeGift({
    giftId: 5655,
    repeatCount: 2,
    repeatEnd: 1,
    user: { uniqueId: 'taro' },
    giftDetails: { giftName: 'Rose', giftType: 1, diamondCount: 1 },
  });
  assert.equal(event.giftId, '5655');
  assert.equal(event.giftName, 'Rose');
  assert.equal(event.count, 2);
  assert.equal(event.from, 'taro');
});

test('フォローの送り主を読める', () => {
  assert.deepEqual(normalizeSocial('follow', { user: { nickname: 'はなこ' } }), { kind: 'follow', from: 'はなこ' });
  assert.deepEqual(normalizeSocial('share', {}), { kind: 'share', from: '' });
});

test('いいねはまとめて届いた回数を読む', () => {
  assert.deepEqual(normalizeLike({ likeCount: 15, totalLikeCount: 3000, user: { nickname: 'はなこ' } }), { kind: 'like', count: 15, from: 'はなこ' });
  assert.equal(normalizeLike({}).count, 0);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseConfig } from '../src/config.js';
import { Dispatcher } from '../src/dispatcher.js';
import { normalizeComment } from '../src/gifts.js';
import { COMMENT_VIEWER_COOLDOWN_SEC, describeEvent, matches } from '../src/rules.js';

const comment = (text, user = 'u1', extra = {}) => ({ kind: 'comment', text, from: 'たろう', user, ...extra });

test('コメント: その言葉だけのコメントで合う（全角半角・大文字小文字・ひらがなカタカナ・空白は気にしない）', () => {
  const rule = { comment: 'TNT', action: 'tnt' };
  for (const text of ['TNT', 'tnt', 'ＴＮＴ', ' t n t ']) assert.equal(matches(rule, comment(text)), true, text);
  for (const text of ['TNTください', 'TN', '']) assert.equal(matches(rule, comment(text)), false, text);
  assert.equal(matches({ comment: 'ばくはつ', action: 'tnt' }, comment('バクハツ')), true);
  // ほかのきっかけのルールには、コメントは合わない
  assert.equal(matches({ minDiamonds: 0, action: 'tnt' }, comment('TNT')), false);
  assert.equal(matches(rule, { kind: 'gift', giftName: 'TNT', diamonds: 1, count: 1 }), false);
  assert.equal(describeEvent(comment('TNT')), 'たろうさんのコメント「TNT」');
});

test('コメントのルールを読む。言葉が空・長すぎるものは断る', () => {
  assert.equal(parseConfig({ rules: [{ comment: ' 爆発 ', action: 'tnt' }] }).rules[0].comment, '爆発');
  for (const word of ['', '   ', 'あ'.repeat(31), 5]) {
    assert.throws(() => parseConfig({ rules: [{ comment: word, action: 'tnt' }] }), /コメント/);
  }
  assert.throws(() => parseConfig({ rules: [{ comment: 'a', gift: 'バラ', action: 'tnt' }] }), /1つだけ/);
});

test('コメント: 同じ人は30秒に1回まで。別の人・テスト送信は待たせない。合わないコメントは数えない', () => {
  let now = 0;
  const dispatcher = new Dispatcher({ rules: [{ comment: 'TNT', action: 'tnt' }], client: { send: async () => ({ ok: true }) }, now: () => now });
  assert.equal(dispatcher.takeComment(comment('こんにちは')), false);
  assert.equal(dispatcher.takeComment(comment('TNT')), true);
  assert.equal(dispatcher.takeComment(comment('TNT')), false);
  assert.equal(dispatcher.takeComment(comment('TNT', 'u2')), true);
  assert.equal(dispatcher.takeComment(comment('TNT', '', { test: true })), true);
  assert.equal(dispatcher.takeComment(comment('TNT', '', { test: true })), true);
  now = COMMENT_VIEWER_COOLDOWN_SEC * 1000;
  assert.equal(dispatcher.takeComment(comment('TNT')), true);
  assert.equal(dispatcher.stats.received, 0);
});

test('TikTok のコメントを、ルール判定用の形にそろえる', () => {
  assert.deepEqual(normalizeComment({ comment: 'TNT', user: { userId: 123, nickname: 'たろう', uniqueId: 'taro' } }), { kind: 'comment', text: 'TNT', from: 'たろう', user: '123' });
  assert.deepEqual(normalizeComment({}), { kind: 'comment', text: '', from: '', user: '' });
});

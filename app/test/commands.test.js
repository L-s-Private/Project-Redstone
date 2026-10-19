import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCommand } from '../src/commands.js';

test('gift コマンドは名前と個数を読む（名前に空白があってもよい）', () => {
  assert.equal(parseCommand('gift Rose').event.count, 1);
  assert.equal(parseCommand('gift Rose 5').event.count, 5);
  assert.equal(parseCommand('gift Finger Heart 3').event.giftName, 'Finger Heart');
  assert.equal(parseCommand('gift Finger Heart').event.giftName, 'Finger Heart');
  assert.equal(parseCommand('gift').command, 'unknown');
});

test('そのほかのコマンド', () => {
  assert.equal(parseCommand('').command, 'none');
  assert.equal(parseCommand('  PAUSE ').command, 'pause');
  assert.equal(parseCommand('exit').command, 'quit');
  assert.equal(parseCommand('follow').event.kind, 'follow');
  assert.equal(parseCommand('dance').command, 'unknown');
});

test('いいねと埋め立てのコマンド', () => {
  assert.deepEqual(parseCommand('like 1000').event, { kind: 'like', count: 1000, from: 'テスト' });
  assert.equal(parseCommand('like').command, 'unknown');
  assert.equal(parseCommand('fill start').command, 'fill_start');
  assert.equal(parseCommand('fill stop').command, 'fill_stop');
  assert.equal(parseCommand('fill').command, 'unknown');
});

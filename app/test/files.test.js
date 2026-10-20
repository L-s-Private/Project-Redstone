import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { writeFileSafely } from '../src/files.js';

test('同じファイルへの保存が重なっても、最後の内容が残り、作業用のファイルも残らない', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'redstone-'));
  try {
    const path = join(dir, 'sub', 'config.json');
    await Promise.all(Array.from({ length: 20 }, (_, i) => writeFileSafely(path, `{"n":${i}}`)));
    assert.equal(await readFile(path, 'utf8'), '{"n":19}');
    assert.deepEqual(await readdir(join(dir, 'sub')), ['config.json']);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

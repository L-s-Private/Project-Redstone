// ファイルの保存。途中で落ちても中身が半分だけの壊れたファイルにならないよう、別の名前に書いてから入れ替える。
// 同じファイルへの保存が重なったら、順番に書く（あとの内容が残る）。
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

/** ファイルごとの、書いている途中の保存 */
const writing = new Map();
let counter = 0;

/** text を path に書く。書き終わるまで、前の中身はそのまま残る */
export function writeFileSafely(path, text) {
  const previous = writing.get(path) ?? Promise.resolve();
  const next = previous.catch(() => {}).then(async () => {
    await mkdir(dirname(path), { recursive: true });
    const temp = `${path}.${process.pid}.${++counter}.tmp`;
    try {
      await writeFile(temp, text, 'utf8');
      await rename(temp, path);
    } catch (e) {
      await rm(temp, { force: true }).catch(() => {});
      throw e;
    }
  });
  writing.set(path, next);
  // 終わったら覚えておかない（ずっと増えないように）
  next.finally(() => {
    if (writing.get(path) === next) writing.delete(path);
  }).catch(() => {});
  return next;
}

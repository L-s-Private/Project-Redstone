// アプリに同梱した STATIC ARC MOD の jar。
// 配布版（Electron）では resources/mod、開発中は mod/build/libs にビルドしたものを使う。
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEV_LIBS = fileURLToPath(new URL('../../mod/build/libs/', import.meta.url));

export async function loadBundledMod(dir = process.env.REDSTONE_MOD_DIR ?? DEV_LIBS) {
  const fileName = (await readdir(dir).catch(() => [])).find((name) => /^static-arc-.*\.jar$/.test(name) && !name.endsWith('-sources.jar'));
  return fileName ? { fileName, read: () => readFile(join(dir, fileName)) } : null;
}

// アプリに同梱した Project Redstone MOD の jar。
// exe では中に埋め込んだもの、開発中は mod/build/libs にビルドしたものを使う。
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export async function loadBundledMod() {
  const sea = await import('node:sea').catch(() => null);
  if (sea?.isSea()) {
    try {
      const { fileName } = JSON.parse(sea.getAsset('mod-info.json', 'utf8'));
      return { fileName, read: async () => Buffer.from(sea.getAsset('mod.jar')) };
    } catch {
      return null;
    }
  }

  let libs = process.env.REDSTONE_MOD_DIR;
  try {
    libs ??= fileURLToPath(new URL('../../mod/build/libs/', import.meta.url));
  } catch {
    return null; // 1ファイルにまとめた状態で exe 以外から動かしたとき
  }
  const fileName = (await readdir(libs).catch(() => [])).find((name) => /^project-redstone-.*\.jar$/.test(name) && !name.endsWith('-sources.jar'));
  return fileName ? { fileName, read: () => readFile(join(libs, fileName)) } : null;
}

// 画面版を1つの実行ファイルにまとめる（Node.js の Single Executable Application）。
// 実行した OS 用のファイルができる。Windows で実行すると dist/ProjectRedstone.exe。
import { execFileSync } from 'node:child_process';
import { chmodSync, copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { build } from 'esbuild';
import { inject } from 'postject';

const isWindows = process.platform === 'win32';
const isMac = process.platform === 'darwin';
const output = isWindows ? 'dist/ProjectRedstone.exe' : 'dist/project-redstone';

// 同梱する MOD の jar（先に mod で ./gradlew build しておく。CI では mod のジョブが作ったものを使う）
const modDir = process.env.MOD_JAR_DIR ?? '../mod/build/libs';
const modJar = (() => {
  try {
    return readdirSync(modDir).find((name) => /^project-redstone-.*\.jar$/.test(name) && !name.endsWith('-sources.jar'));
  } catch {
    return undefined;
  }
})();
if (!modJar) {
  console.error(`MOD の jar が見つかりません（${modDir}）。先に mod フォルダで ./gradlew build を実行してください`);
  process.exit(1);
}

rmSync('build', { recursive: true, force: true });
mkdirSync('build', { recursive: true });
mkdirSync('dist', { recursive: true });

// 1. 依存ライブラリごと1つの JS にまとめる
await build({
  entryPoints: ['src/gui.js'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: `node${process.versions.node.split('.')[0]}`,
  outfile: 'build/gui.cjs',
  legalComments: 'none',
  logLevel: 'warning',
});

// 2. Node.js に埋め込む形に変換する
writeFileSync('build/mod-info.json', JSON.stringify({ fileName: modJar }));
writeFileSync(
  'build/sea-config.json',
  JSON.stringify({
    main: 'build/gui.cjs',
    output: 'build/sea-prep.blob',
    disableExperimentalSEAWarning: true,
    assets: { 'mod.jar': join(modDir, modJar), 'mod-info.json': 'build/mod-info.json' },
  }),
);
execFileSync(process.execPath, ['--experimental-sea-config', 'build/sea-config.json'], { stdio: 'inherit' });

// 3. いま動いている node 本体をコピーして、そこに埋め込む
rmSync(output, { force: true });
copyFileSync(process.execPath, output);
chmodSync(output, 0o755);
if (isMac) execFileSync('codesign', ['--remove-signature', output]);
await inject(output, 'NODE_SEA_BLOB', readFileSync('build/sea-prep.blob'), {
  sentinelFuse: 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
  ...(isMac ? { machoSegmentName: 'NODE_SEA' } : {}),
});
if (isMac) execFileSync('codesign', ['--sign', '-', output]);

console.log(`できました: ${output}（同梱MOD: ${modJar}）`);

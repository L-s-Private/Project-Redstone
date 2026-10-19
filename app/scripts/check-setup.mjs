// 本物の Fabric・Modrinth を使って、空の .minecraft に導入できるか確かめる（CI 用）。
// 使っている API の形が変わったら、ここで気づける。
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadBundledMod } from '../src/bundledMod.js';
import { installAll } from '../src/setup.js';

const dir = join(await mkdtemp(join(tmpdir(), 'mc-')), '.minecraft');
await mkdir(dir, { recursive: true });
await writeFile(join(dir, 'launcher_profiles.json'), JSON.stringify({ profiles: {} }));

const bundledMod = await loadBundledMod();
assert.ok(bundledMod, 'mod/build/libs に MOD の jar がありません');
const status = await installAll({ dir, bundledMod, log: (level, text) => console.log(`[${level}] ${text}`) });
console.log(JSON.stringify(status, null, 2));
console.log('mods:', await readdir(join(dir, 'mods')));
assert.equal(status.ready, true);

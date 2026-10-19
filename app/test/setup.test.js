import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { getSetupStatus, installAll, minecraftDir, PROFILE_KEY, SetupError } from '../src/setup.js';

const FABRIC_API_JAR = Buffer.from('fabric-api-jar');
const LOADER_ID = 'fabric-loader-0.19.5-26.3';

/** Fabric のサーバーと Modrinth の代わり */
function fakeFetch({ sha512 = createHash('sha512').update(FABRIC_API_JAR).digest('hex'), offline = false } = {}) {
  const calls = [];
  const fetch = async (url, options) => {
    calls.push(url);
    assert.match(options.headers['User-Agent'], /ProjectRedstone/);
    if (offline) throw new TypeError('fetch failed');
    const json = (body) => ({ ok: true, status: 200, json: async () => body });
    if (url === 'https://meta.fabricmc.net/v2/versions/loader/26.3') {
      return json([{ loader: { version: '0.20.0-beta.1', stable: false } }, { loader: { version: '0.19.5', stable: true } }]);
    }
    if (url === 'https://meta.fabricmc.net/v2/versions/loader/26.3/0.19.5/profile/json') {
      return json({ id: LOADER_ID, inheritsFrom: '26.3', mainClass: 'net.fabricmc.loader.impl.launch.knot.KnotClient' });
    }
    if (url.startsWith('https://api.modrinth.com/v2/project/fabric-api/version?')) {
      assert.match(decodeURIComponent(url), /game_versions=\["26\.3"\]&loaders=\["fabric"\]/);
      return json([
        { version_type: 'beta', files: [{ primary: true, filename: 'fabric-api-0.164.0+26.3.jar', url: 'https://cdn/beta.jar', hashes: {} }] },
        { version_type: 'release', files: [{ primary: true, filename: 'fabric-api-0.163.0+26.3.jar', url: 'https://cdn/release.jar', hashes: { sha512 } }] },
      ]);
    }
    if (url === 'https://cdn/release.jar') {
      return { ok: true, status: 200, arrayBuffer: async () => FABRIC_API_JAR.buffer.slice(FABRIC_API_JAR.byteOffset, FABRIC_API_JAR.byteOffset + FABRIC_API_JAR.length) };
    }
    return { ok: false, status: 404 };
  };
  return { fetch, calls };
}

const bundledMod = (fileName = 'project-redstone-0.2.0.jar') => ({ fileName, read: async () => Buffer.from(`mod:${fileName}`) });

async function minecraftFolder({ launcher = true, store = false } = {}) {
  const dir = join(await mkdtemp(join(tmpdir(), 'mc-')), '.minecraft');
  await mkdir(dir, { recursive: true });
  if (launcher) await writeFile(join(dir, 'launcher_profiles.json'), JSON.stringify({ profiles: { other: { name: 'Latest release' } }, settings: { keep: true } }));
  if (store) await writeFile(join(dir, 'launcher_profiles_microsoft_store.json'), JSON.stringify({ profiles: {} }));
  return dir;
}

test('マイクラのフォルダの場所', () => {
  assert.equal(minecraftDir({ platform: 'win32', env: { APPDATA: 'C:\\AppData' }, home: 'C:\\me' }), join('C:\\AppData', '.minecraft'));
  assert.equal(minecraftDir({ platform: 'darwin', env: {}, home: '/Users/me' }), join('/Users/me', 'Library', 'Application Support', 'minecraft'));
  assert.equal(minecraftDir({ platform: 'linux', env: {}, home: '/home/me' }), join('/home/me', '.minecraft'));
});

test('何も入っていない状態から、3つとも入れる', async () => {
  const dir = await minecraftFolder({ store: true });
  const before = await getSetupStatus({ dir, bundledMod: bundledMod() });
  assert.equal(before.ready, false);
  assert.equal(before.launcherFound, true);

  const logs = [];
  const after = await installAll({ dir, bundledMod: bundledMod(), fetch: fakeFetch().fetch, log: (level, text) => logs.push(text) });
  assert.equal(after.ready, true);
  assert.equal(after.fabric.versionId, LOADER_ID);

  // 起動構成: 安定版のローダーを選び、ほかの設定は残す
  const profiles = JSON.parse(await readFile(join(dir, 'launcher_profiles.json'), 'utf8'));
  assert.equal(profiles.profiles[PROFILE_KEY].lastVersionId, LOADER_ID);
  assert.equal(profiles.profiles[PROFILE_KEY].type, 'custom');
  assert.equal(profiles.profiles.other.name, 'Latest release');
  assert.equal(profiles.settings.keep, true);
  const store = JSON.parse(await readFile(join(dir, 'launcher_profiles_microsoft_store.json'), 'utf8'));
  assert.equal(store.profiles[PROFILE_KEY].lastVersionId, LOADER_ID);
  assert.equal(JSON.parse(await readFile(join(dir, 'versions', LOADER_ID, `${LOADER_ID}.json`), 'utf8')).inheritsFrom, '26.3');
  assert.equal((await stat(join(dir, 'versions', LOADER_ID, `${LOADER_ID}.jar`))).size, 0);

  // mods: 正式版の Fabric API と、同梱の MOD
  assert.deepEqual((await readdir(join(dir, 'mods'))).sort(), ['fabric-api-0.163.0+26.3.jar', 'project-redstone-0.2.0.jar']);
  assert.ok(logs.some((l) => l.includes('Fabric API を入れました')));
});

test('もう一度押しても、入っているものはダウンロードしない', async () => {
  const dir = await minecraftFolder();
  await installAll({ dir, bundledMod: bundledMod(), fetch: fakeFetch().fetch });
  const { fetch, calls } = fakeFetch();
  const status = await installAll({ dir, bundledMod: bundledMod(), fetch });
  assert.equal(status.ready, true);
  assert.deepEqual(calls, []);
});

test('古い MOD と別バージョンの Fabric API を入れ替え、ほかの MOD は残す', async () => {
  const dir = await minecraftFolder();
  await mkdir(join(dir, 'mods'));
  for (const name of ['project-redstone-0.1.0.jar', 'fabric-api-0.105.0+1.21.1.jar', 'sodium.jar']) {
    await writeFile(join(dir, 'mods', name), 'old');
  }
  const before = await getSetupStatus({ dir, bundledMod: bundledMod() });
  assert.equal(before.mod.installed, true);
  assert.equal(before.mod.upToDate, false);
  assert.equal(before.fabricApi.installed, false);

  await installAll({ dir, bundledMod: bundledMod(), fetch: fakeFetch().fetch });
  assert.deepEqual((await readdir(join(dir, 'mods'))).sort(), ['fabric-api-0.163.0+26.3.jar', 'project-redstone-0.2.0.jar', 'sodium.jar']);
});

test('ランチャーがない・ネットにつながらない・ダウンロードが壊れているときは理由を返す', async () => {
  await assert.rejects(
    installAll({ dir: await minecraftFolder({ launcher: false }), bundledMod: bundledMod(), fetch: fakeFetch().fetch }),
    (e) => e instanceof SetupError && /ランチャーを一度起動/.test(e.message),
  );
  await assert.rejects(
    installAll({ dir: await minecraftFolder(), bundledMod: bundledMod(), fetch: fakeFetch({ offline: true }).fetch }),
    /インターネットにつながりませんでした/,
  );
  const dir = await minecraftFolder();
  await assert.rejects(installAll({ dir, bundledMod: bundledMod(), fetch: fakeFetch({ sha512: 'bad' }).fetch }), /壊れていました/);
  assert.equal((await readdir(join(dir, 'mods')).catch(() => [])).some((n) => n.startsWith('fabric-api')), false);
});

test('同梱の MOD がないときは、ほかの2つだけ入れる', async () => {
  const dir = await minecraftFolder();
  const logs = [];
  const status = await installAll({ dir, bundledMod: null, fetch: fakeFetch().fetch, log: (level, text) => logs.push(text) });
  assert.equal(status.fabric.installed, true);
  assert.equal(status.fabricApi.installed, true);
  assert.equal(status.mod.installed, false);
  assert.ok(logs.some((l) => l.includes('MOD が入っていない')));
});

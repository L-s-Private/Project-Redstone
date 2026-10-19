// マイクラ側の準備（Fabric Loader・Fabric API・Project Redstone MOD の導入）を自動で行う。
// Fabric 公式インストーラーと同じく、ランチャーに「fabric-loader-26.3」の起動構成を追加する。
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const MINECRAFT_VERSION = '26.3';
export const PROFILE_KEY = `fabric-loader-${MINECRAFT_VERSION}`;

const FABRIC_META = 'https://meta.fabricmc.net/v2';
const MODRINTH_API = 'https://api.modrinth.com/v2';
const USER_AGENT = 'ProjectRedstone/0.2 (github.com/L-s-Private/Project-Redstone)';
const PROFILE_FILES = ['launcher_profiles.json', 'launcher_profiles_microsoft_store.json'];

const FABRIC_API_FILE = /^fabric-api-.*\.jar$/i;
const OUR_MOD_FILE = /^project-redstone-.*\.jar$/i;

export class SetupError extends Error {}

export function minecraftDir({ platform = process.platform, env = process.env, home = homedir() } = {}) {
  if (platform === 'win32') return join(env.APPDATA ?? join(home, 'AppData', 'Roaming'), '.minecraft');
  if (platform === 'darwin') return join(home, 'Library', 'Application Support', 'minecraft');
  return join(home, '.minecraft');
}

/**
 * いまの準備状況。
 * @param {{dir: string, bundledMod: {fileName: string} | null}} options
 */
export async function getSetupStatus({ dir, bundledMod }) {
  const launcherFound = await exists(join(dir, 'launcher_profiles.json'));
  const fabricVersionId = await installedFabricVersion(dir);
  const mods = await listMods(dir);
  const fabricApi = mods.find((name) => FABRIC_API_FILE.test(name) && name.includes(`+${MINECRAFT_VERSION}`)) ?? null;
  const ourMod = mods.find((name) => OUR_MOD_FILE.test(name)) ?? null;
  const modUpToDate = bundledMod ? ourMod === bundledMod.fileName : ourMod !== null;

  return {
    minecraftVersion: MINECRAFT_VERSION,
    dir,
    launcherFound,
    fabric: { installed: fabricVersionId !== null, versionId: fabricVersionId },
    fabricApi: { installed: fabricApi !== null, fileName: fabricApi },
    mod: { installed: ourMod !== null, upToDate: modUpToDate, fileName: ourMod, bundled: bundledMod?.fileName ?? null },
    ready: launcherFound && fabricVersionId !== null && fabricApi !== null && modUpToDate,
  };
}

/**
 * 足りないものだけ入れる。
 * @param {object} options
 * @param {string} options.dir .minecraft フォルダ
 * @param {{fileName: string, read: () => Promise<Buffer>} | null} options.bundledMod
 * @param {typeof fetch} [options.fetch]
 * @param {(level: string, text: string) => void} [options.log]
 */
export async function installAll({ dir, bundledMod, fetch = globalThis.fetch, log = () => {} }) {
  if (!(await exists(join(dir, 'launcher_profiles.json')))) {
    throw new SetupError(`マイクラのランチャーが見つかりません（${dir}）。ランチャーを一度起動して閉じてから、もう一度押してください`);
  }
  const http = httpClient(fetch);
  try {
    const before = await getSetupStatus({ dir, bundledMod });

    if (before.fabric.installed) {
      log('info', `Fabric Loader: 導入済み（${before.fabric.versionId}）`);
    } else {
      log('info', 'Fabric Loader を導入しています…');
      const versionId = await installFabricLoader(dir, http);
      log('ok', `Fabric Loader を導入しました（${versionId}）`);
    }

    if (before.fabricApi.installed) {
      log('info', `Fabric API: 導入済み（${before.fabricApi.fileName}）`);
    } else {
      log('info', 'Fabric API をダウンロードしています…');
      const fileName = await installFabricApi(dir, http);
      log('ok', `Fabric API を入れました（${fileName}）`);
    }

    if (!bundledMod) {
      log('warn', 'このアプリには MOD が入っていないため、Project Redstone MOD は入れませんでした');
    } else if (before.mod.upToDate) {
      log('info', `Project Redstone MOD: 導入済み（${bundledMod.fileName}）`);
    } else {
      await replaceMods(dir, OUR_MOD_FILE, bundledMod.fileName, await bundledMod.read());
      log('ok', `Project Redstone MOD を入れました（${bundledMod.fileName}）`);
    }
  } catch (e) {
    if (e instanceof SetupError) throw e;
    if (['EBUSY', 'EPERM', 'EACCES'].includes(e.code)) {
      throw new SetupError('ファイルを書き換えられませんでした。マイクラを閉じてから、もう一度押してください');
    }
    throw new SetupError(`導入できませんでした: ${e.message}`);
  }
  return getSetupStatus({ dir, bundledMod });
}

async function installFabricLoader(dir, http) {
  const loaders = await http.json(`${FABRIC_META}/versions/loader/${MINECRAFT_VERSION}`);
  if (!Array.isArray(loaders) || loaders.length === 0) {
    throw new SetupError(`Fabric Loader がまだ ${MINECRAFT_VERSION} に対応していません`);
  }
  const loader = (loaders.find((entry) => entry.loader?.stable) ?? loaders[0]).loader.version;
  const profile = await http.json(`${FABRIC_META}/versions/loader/${MINECRAFT_VERSION}/${encodeURIComponent(loader)}/profile/json`);
  const versionId = profile.id;
  if (typeof versionId !== 'string' || !/^[\w.+-]+$/.test(versionId)) {
    throw new SetupError('Fabric の起動構成を読み取れませんでした');
  }

  const versionDir = join(dir, 'versions', versionId);
  await mkdir(versionDir, { recursive: true });
  await writeFile(join(versionDir, `${versionId}.json`), JSON.stringify(profile, null, 2));
  // 公式インストーラーと同じく、中身のない jar を置く（古いランチャーが探すため）
  await writeFile(join(versionDir, `${versionId}.jar`), '');

  const now = new Date().toISOString();
  for (const file of PROFILE_FILES) {
    const path = join(dir, file);
    if (!(await exists(path))) continue;
    const profiles = JSON.parse(await readFile(path, 'utf8'));
    profiles.profiles ??= {};
    const existing = profiles.profiles[PROFILE_KEY] ?? {};
    profiles.profiles[PROFILE_KEY] = {
      ...existing,
      name: PROFILE_KEY,
      type: 'custom',
      created: existing.created ?? now,
      lastUsed: now,
      lastVersionId: versionId,
    };
    await writeFile(path, JSON.stringify(profiles, null, 2));
  }
  return versionId;
}

async function installFabricApi(dir, http) {
  const query = `game_versions=${encodeURIComponent(JSON.stringify([MINECRAFT_VERSION]))}&loaders=${encodeURIComponent(JSON.stringify(['fabric']))}`;
  const versions = await http.json(`${MODRINTH_API}/project/fabric-api/version?${query}`);
  if (!Array.isArray(versions) || versions.length === 0) {
    throw new SetupError(`Fabric API がまだ ${MINECRAFT_VERSION} に対応していません`);
  }
  const version = versions.find((v) => v.version_type === 'release') ?? versions[0];
  const file = version.files?.find((f) => f.primary) ?? version.files?.[0];
  if (!file?.url || !FABRIC_API_FILE.test(file.filename ?? '')) {
    throw new SetupError('Fabric API のダウンロード先を読み取れませんでした');
  }
  const data = await http.buffer(file.url);
  const expected = file.hashes?.sha512;
  if (expected && createHash('sha512').update(data).digest('hex') !== expected) {
    throw new SetupError('Fabric API のダウンロードが壊れていました。もう一度押してください');
  }
  await replaceMods(dir, FABRIC_API_FILE, file.filename, data);
  return file.filename;
}

/** pattern に合う古い jar を消して、新しい jar を置く */
async function replaceMods(dir, pattern, fileName, data) {
  const modsDir = join(dir, 'mods');
  await mkdir(modsDir, { recursive: true });
  for (const name of await listMods(dir)) {
    if (pattern.test(name) && name !== fileName) await rm(join(modsDir, name));
  }
  await writeFile(join(modsDir, fileName), data);
}

async function installedFabricVersion(dir) {
  for (const file of PROFILE_FILES) {
    try {
      const profiles = JSON.parse(await readFile(join(dir, file), 'utf8'));
      const versionId = profiles.profiles?.[PROFILE_KEY]?.lastVersionId;
      if (typeof versionId === 'string' && (await exists(join(dir, 'versions', versionId, `${versionId}.json`)))) {
        return versionId;
      }
    } catch {
      // ファイルがない・壊れている場合は未導入として扱う
    }
  }
  return null;
}

async function listMods(dir) {
  try {
    return await readdir(join(dir, 'mods'));
  } catch {
    return [];
  }
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function httpClient(fetch) {
  const get = async (url) => {
    let res;
    try {
      res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(30000) });
    } catch {
      throw new SetupError('インターネットにつながりませんでした。接続を確認して、もう一度押してください');
    }
    if (!res.ok) throw new SetupError(`ダウンロードに失敗しました（${res.status}）: ${url}`);
    return res;
  };
  return {
    json: async (url) => (await get(url)).json(),
    buffer: async (url) => Buffer.from(await (await get(url)).arrayBuffer()),
  };
}

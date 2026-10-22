// 画面に出すマイクラのアイコン。絵はアプリに入れず、PC に入っているマイクラ本体（versions/<版>/<版>.jar）から読む。
import { open, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { inflateRawSync } from 'node:zlib';
import { MINECRAFT_VERSION } from './setup.js';

/**
 * 画面で使う公式テクスチャ（名前 → jar の中の場所）。名前はマイクラのテクスチャ名そのまま。
 * どのアイコンをどう描くか（立方体にするか等）は ui/mcIconScript.js
 */
export const ICON_TEXTURES = Object.fromEntries([
  ...['tnt_top', 'tnt_side', 'amethyst_block', 'diamond_block', 'emerald_block', 'gold_block', 'iron_block', 'lapis_block', 'redstone_block',
    'quartz_block_top', 'quartz_block_side', 'glass', 'white_stained_glass', 'light_blue_stained_glass', 'bedrock'].map((n) => [n, `block/${n}`]),
  ...['zombie', 'skeleton', 'creeper', 'spider', 'witch', 'silverfish', 'pig'].map((m) => [`${m}_spawn_egg`, `item/${m}_spawn_egg`]),
  ['oak_sign', 'item/oak_sign'],
  // モブは体のテクスチャから顔を切り出して出す（ui/mcIconScript.js）
  ...[['zombie', 'zombie/zombie'], ['skeleton', 'skeleton/skeleton'], ['creeper', 'creeper/creeper'], ['spider', 'spider/spider'],
    ['witch', 'witch/witch'], ['silverfish', 'silverfish/silverfish'], ['pig', 'pig/pig_temperate']].map(([m, t]) => [`entity_${m}`, `entity/${t}`]),
  // v0.12 で足した妨害のアイコン
  ...['iron_bars', 'packed_ice', 'lightning_rod', 'ladder', 'scaffolding_top', 'scaffolding_side', 'piston_top', 'piston_side'].map((n) => [n, `block/${n}`]),
  ...['barrier', 'shulker_shell', 'clock_00', 'clock_32', 'trident'].map((n) => [n, `item/${n}`]),
  // 採掘チャレンジの資源と、支援のアイコン
  ...['coal', 'raw_iron', 'raw_copper', 'raw_gold', 'diamond', 'emerald', 'lapis_lazuli', 'redstone', 'quartz', 'amethyst_shard', 'flint',
    'iron_pickaxe', 'diamond_pickaxe'].map((n) => [n, `item/${n}`]),
  ...['ancient_debris_top', 'ancient_debris_side'].map((n) => [n, `block/${n}`]),
]);

/** マイクラ本体の jar の候補。ランチャーで一度でも起動していれば 1つ目がある（2つ目は開発用） */
export function clientJarCandidates({ dir, version = MINECRAFT_VERSION, home = homedir() }) {
  return [
    join(dir, 'versions', version, `${version}.jar`),
    join(home, '.gradle', 'caches', 'fabric-loom', version, 'minecraft-client.jar'),
  ];
}

/**
 * アイコンを読む。最初に頼まれたときに jar から全部読んで覚えておく。
 * @returns {{get: (name: string) => Promise<Buffer | null>}}
 */
export function createIconSource({ dir, candidates = clientJarCandidates({ dir }) }) {
  let loading = null;
  const load = async () => {
    for (const path of candidates) {
      try {
        if (!(await stat(path)).size) continue;
        const wanted = new Set(Object.values(ICON_TEXTURES).map((t) => `assets/minecraft/textures/${t}.png`));
        return await readZipEntries(path, wanted);
      } catch {
        // 次の候補へ
      }
    }
    return new Map();
  };
  return {
    async get(name) {
      const texture = ICON_TEXTURES[name];
      if (!texture) return null;
      loading ??= load();
      const entries = await loading;
      // 見つからなかったら、次に頼まれたときに読み直す（あとからマイクラを入れた場合）
      if (entries.size === 0) loading = null;
      return entries.get(`assets/minecraft/textures/${texture}.png`) ?? null;
    },
  };
}

/** zip（jar）から names のファイルだけを取り出す。@returns {Map<string, Buffer>} */
export async function readZipEntries(path, names) {
  const file = await open(path, 'r');
  try {
    const { size } = await file.stat();
    const read = async (position, length) => {
      const buffer = Buffer.alloc(length);
      await file.read(buffer, 0, length, position);
      return buffer;
    };
    // 終わりの目印（End of Central Directory）を後ろから探す
    const tailLength = Math.min(size, 65557);
    const tail = await read(size - tailLength, tailLength);
    let eocd = -1;
    for (let i = tail.length - 22; i >= 0; i--) {
      if (tail.readUInt32LE(i) === 0x06054b50) {
        eocd = i;
        break;
      }
    }
    if (eocd < 0) throw new Error('zip ではありません');
    const directorySize = tail.readUInt32LE(eocd + 12);
    const directoryOffset = tail.readUInt32LE(eocd + 16);
    const directory = await read(directoryOffset, directorySize);

    const found = new Map();
    for (let p = 0; p + 46 <= directory.length && directory.readUInt32LE(p) === 0x02014b50; ) {
      const method = directory.readUInt16LE(p + 10);
      const compressedSize = directory.readUInt32LE(p + 20);
      const nameLength = directory.readUInt16LE(p + 28);
      const extraLength = directory.readUInt16LE(p + 30);
      const commentLength = directory.readUInt16LE(p + 32);
      const localOffset = directory.readUInt32LE(p + 42);
      const name = directory.toString('utf8', p + 46, p + 46 + nameLength);
      p += 46 + nameLength + extraLength + commentLength;
      if (!names.has(name)) continue;
      const local = await read(localOffset, 30);
      const dataStart = localOffset + 30 + local.readUInt16LE(26) + local.readUInt16LE(28);
      const data = await read(dataStart, compressedSize);
      if (method === 0) found.set(name, data);
      else if (method === 8) found.set(name, inflateRawSync(data));
    }
    return found;
  } finally {
    await file.close();
  }
}

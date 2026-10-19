import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { deflateRawSync } from 'node:zlib';
import { createIconSource, ICON_TEXTURES, readZipEntries } from '../src/mcIcons.js';

/** テスト用の小さな zip を作る（files: 名前 → [中身, 圧縮するか]） */
function makeZip(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, [content, deflate]] of Object.entries(files)) {
    const nameBuf = Buffer.from(name);
    const data = deflate ? deflateRawSync(content) : content;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(deflate ? 8 : 0, 8);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(content.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(deflate ? 8 : 0, 10);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(content.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, nameBuf, data);
    centrals.push(central, nameBuf);
    offset += 30 + nameBuf.length + data.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}

async function writeJar(files) {
  const path = join(await mkdtemp(join(tmpdir(), 'redstone-jar-')), 'client.jar');
  await writeFile(path, makeZip(files));
  return path;
}

test('jar から欲しいファイルだけを取り出す（圧縮あり・なし）', async () => {
  const tnt = Buffer.from('tnt-png');
  const egg = Buffer.from('zombie-egg-png'.repeat(20));
  const path = await writeJar({
    'assets/minecraft/textures/block/tnt_side.png': [tnt, false],
    'assets/minecraft/textures/item/zombie_spawn_egg.png': [egg, true],
    'other.txt': [Buffer.from('x'), false],
  });
  const found = await readZipEntries(path, new Set(['assets/minecraft/textures/block/tnt_side.png', 'assets/minecraft/textures/item/zombie_spawn_egg.png']));
  assert.deepEqual(found.get('assets/minecraft/textures/block/tnt_side.png'), tnt);
  assert.deepEqual(found.get('assets/minecraft/textures/item/zombie_spawn_egg.png'), egg);
  assert.equal(found.size, 2);
});

test('アイコンの名前で絵を返し、知らない名前やマイクラがないときは null', async () => {
  const path = await writeJar({ 'assets/minecraft/textures/block/tnt_side.png': [Buffer.from('tnt'), true] });
  const icons = createIconSource({ dir: '', candidates: [join(tmpdir(), 'no-such.jar'), path] });
  assert.deepEqual(await icons.get('tnt_side'), Buffer.from('tnt'));
  assert.equal(await icons.get('zombie_spawn_egg'), null, 'jar にない');
  assert.equal(await icons.get('../secret'), null, '決まった名前だけ');
  assert.equal(await createIconSource({ dir: '', candidates: [] }).get('tnt_side'), null);
});

test('画面で描くアイコンのテクスチャが、すべて読めるものになっている', async () => {
  const { MC_ICON_JS } = await import('../src/ui/mcIconScript.js');
  const icons = new Function(`${MC_ICON_JS}; return MC_ICONS;`)();
  for (const name of ['tnt', 'zombie', 'skeleton', 'creeper', 'spider', 'witch', 'silverfish', 'pig', 'fill_expand', 'fill_shrink', 'fill_help', 'message',
    'amethyst_block', 'diamond_block', 'emerald_block', 'gold_block', 'iron_block', 'lapis_block', 'redstone_block', 'quartz_block',
    'glass', 'white_stained_glass', 'light_blue_stained_glass', 'bedrock']) {
    assert.ok(icons[name], `${name} のアイコンがある`);
  }
  for (const def of Object.values(icons)) {
    for (const texture of def.cube ?? [def.item]) assert.ok(ICON_TEXTURES[texture], texture);
  }
});

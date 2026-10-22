// マイクラのアイコンを、ゲームの持ち物欄と同じ見た目で描く（操作画面とオーバーレイで共通）。
// 絵はマイクラ本体の公式テクスチャ（/icons/mc/<名前>.png。mcIcons.js がマイクラ本体から読む）。
// ブロックは上面と側面のテクスチャで立方体に組み、アイテム（看板など）は平らな絵のまま出す。
// モブは体のテクスチャ（entity/...）から顔の正面を切り出して出す（ウィッチとブタは鼻も重ねる）。

export const MC_ICON_CSS = `
  .mc { --s: 20px; display: inline-block; position: relative; width: var(--s); height: var(--s); flex: none; vertical-align: middle; }
  .mc > img { width: 100%; height: 100%; image-rendering: pixelated; display: block; }
  .mc .cube {
    --c: calc(var(--s) * .62);
    position: absolute; left: 50%; top: 50%; width: var(--c); height: var(--c);
    margin: calc(var(--c) / -2) 0 0 calc(var(--c) / -2);
    transform-style: preserve-3d; transform: rotateX(-30deg) rotateY(45deg);
  }
  .mc .cube i { position: absolute; inset: 0; background-size: 100% 100%; image-rendering: pixelated; backface-visibility: hidden; }
  .mc .cube .top { transform: rotateX(90deg) translateZ(calc(var(--c) / 2)); }
  .mc .cube .front { transform: translateZ(calc(var(--c) / 2)); filter: brightness(.8); }
  .mc .cube .left { transform: rotateY(-90deg) translateZ(calc(var(--c) / 2)); filter: brightness(.6); }
  .mc .face { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); }
  .mc .face i { position: absolute; image-rendering: pixelated; background-repeat: no-repeat; }
`;

export const MC_ICON_JS = `
  // アイコンの名前 → 描き方（cube: [上面, 側面] / item: 平らな絵）
  const MC_ICONS = {
    tnt: { cube: ['tnt_top', 'tnt_side'] },
    // face: [テクスチャ, 幅, 高さ, 顔の x, y, 幅, 高さ, 重ねる絵 [[x, y, 幅, 高さ, 顔の中の左, 上], ...]]（テクスチャのピクセル）
    zombie: { face: ['entity_zombie', 64, 64, 8, 8, 8, 8] },
    skeleton: { face: ['entity_skeleton', 64, 32, 8, 8, 8, 8] },
    creeper: { face: ['entity_creeper', 64, 32, 8, 8, 8, 8] },
    spider: { face: ['entity_spider', 64, 32, 40, 12, 8, 8] },
    witch: { face: ['entity_witch', 64, 128, 8, 8, 8, 10, [[26, 2, 2, 4, 3, 6]]] },
    // シルバーフィッシュは顔が小さすぎて目しか見えないので、スポーンエッグ
    silverfish: { item: 'silverfish_spawn_egg' },
    pig: { face: ['entity_pig', 64, 64, 8, 8, 8, 8, [[17, 17, 4, 3, 2, 4]]] },
    spawn_egg: { face: ['entity_zombie', 64, 64, 8, 8, 8, 8] },
    // 透明なガラスは空っぽの箱に見えるので、枠が動く＝ピストン
    fill_expand: { cube: ['piston_top', 'piston_side'] },
    fill_shrink: { cube: ['piston_top', 'piston_side'] },
    fill_help: { cube: ['amethyst_block', 'amethyst_block'] },
    fill_set: { cube: ['amethyst_block', 'amethyst_block'] },
    message: { item: 'oak_sign' },
    jail: { item: 'iron_bars' },
    freeze: { cube: ['packed_ice', 'packed_ice'] },
    fill_layer: { cube: ['scaffolding_top', 'scaffolding_side'] },
    fill_clear: { item: 'barrier' },
    // 避雷針は細い棒にしか見えないので、雷を呼ぶ（召雷）トライデント
    lightning: { item: 'trident' },
    levitate: { item: 'shulker_shell' },
    night: { item: 'clock_32' },
    fill_raise: { item: 'ladder' },
    quartz_block: { cube: ['quartz_block_top', 'quartz_block_side'] },
    // 採掘チャレンジ: 支援はツルハシ、古代の残骸はブロック、ほかの資源はアイテムの絵
    mining_bonus_drop: { item: 'diamond_pickaxe' },
    mining: { item: 'iron_pickaxe' },
    ancient_debris: { cube: ['ancient_debris_top', 'ancient_debris_side'] },
  };
  for (const name of ['coal', 'raw_iron', 'raw_copper', 'raw_gold', 'diamond', 'emerald', 'lapis_lazuli', 'redstone', 'quartz', 'amethyst_shard', 'flint']) {
    MC_ICONS[name] = { item: name };
  }
  for (const name of ['amethyst_block', 'diamond_block', 'emerald_block', 'gold_block', 'iron_block', 'lapis_block', 'redstone_block',
    'glass', 'white_stained_glass', 'light_blue_stained_glass', 'bedrock']) {
    MC_ICONS[name] = { cube: [name, name] };
  }

  /** マイクラのアイコンの要素を作る。size は px。わからない名前なら空の要素 */
  function mcIcon(name, size) {
    const box = document.createElement('span');
    box.className = 'mc';
    if (size) box.style.setProperty('--s', size + 'px');
    const def = MC_ICONS[name];
    if (!def) return box;
    const url = (texture) => '/icons/mc/' + texture + '.png';
    if (def.face) {
      const [texture, w, h, x, y, fw, fh, overlays = []] = def.face;
      // 顔の縦横の比のまま、箱いっぱいに出す
      const face = document.createElement('span');
      face.className = 'face';
      face.style.width = (fw >= fh ? 90 : 90 * fw / fh) + '%';
      face.style.height = (fh >= fw ? 90 : 90 * fh / fw) + '%';
      const layer = (lx, ly, lw, lh, left, top) => {
        const i = document.createElement('i');
        i.style.backgroundImage = 'url(' + url(texture) + ')';
        i.style.left = left / fw * 100 + '%';
        i.style.top = top / fh * 100 + '%';
        i.style.width = lw / fw * 100 + '%';
        i.style.height = lh / fh * 100 + '%';
        i.style.backgroundSize = w / lw * 100 + '% ' + h / lh * 100 + '%';
        i.style.backgroundPosition = lx / (w - lw) * 100 + '% ' + ly / (h - lh) * 100 + '%';
        face.append(i);
      };
      layer(x, y, fw, fh, 0, 0);
      for (const o of overlays) layer(...o);
      box.append(face);
      return box;
    }
    if (def.item) {
      const img = Object.assign(document.createElement('img'), { src: url(def.item), alt: '' });
      box.append(img);
      return box;
    }
    const cube = document.createElement('span');
    cube.className = 'cube';
    const [top, side] = def.cube;
    for (const [face, texture] of [['top', top], ['front', side], ['left', side]]) {
      const i = document.createElement('i');
      i.className = face;
      i.style.backgroundImage = 'url(' + url(texture) + ')';
      cube.append(i);
    }
    box.append(cube);
    return box;
  }
`;

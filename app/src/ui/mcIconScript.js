// マイクラのアイコンを、ゲームの持ち物欄と同じ見た目で描く（操作画面とオーバーレイで共通）。
// 絵はマイクラ本体の公式テクスチャ（/icons/mc/<名前>.png。mcIcons.js がマイクラ本体から読む）。
// ブロックは上面と側面のテクスチャで立方体に組み、アイテム（スポーンエッグ・看板）は平らな絵のまま出す。

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
`;

export const MC_ICON_JS = `
  // アイコンの名前 → 描き方（cube: [上面, 側面] / item: 平らな絵）
  const MC_ICONS = {
    tnt: { cube: ['tnt_top', 'tnt_side'] },
    zombie: { item: 'zombie_spawn_egg' },
    skeleton: { item: 'skeleton_spawn_egg' },
    creeper: { item: 'creeper_spawn_egg' },
    spider: { item: 'spider_spawn_egg' },
    witch: { item: 'witch_spawn_egg' },
    silverfish: { item: 'silverfish_spawn_egg' },
    pig: { item: 'pig_spawn_egg' },
    spawn_egg: { item: 'zombie_spawn_egg' },
    fill_expand: { cube: ['glass', 'glass'] },
    fill_shrink: { cube: ['glass', 'glass'] },
    fill_help: { cube: ['amethyst_block', 'amethyst_block'] },
    fill_set: { cube: ['amethyst_block', 'amethyst_block'] },
    message: { item: 'oak_sign' },
    quartz_block: { cube: ['quartz_block_top', 'quartz_block_side'] },
  };
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

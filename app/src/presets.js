// 定番企画のプリセット。ギフト名は配信の言語で変わるので、1個あたりのダイヤ数で分ける。
// rules は上から順に見るので、ダイヤ数の大きいものを先に書く。

const thanks = [
  { event: 'follow', action: 'message', label: 'フォローありがとう！', cooldownSec: 5 },
  { event: 'share', action: 'message', label: 'シェアありがとう！', cooldownSec: 10 },
];

export const PRESETS = [
  {
    id: 'balance',
    name: 'バランス（おすすめ）',
    description: '小さいギフトはTNT、大きいほど派手に。フォローで全回復して長く遊べる',
    rules: [
      { minDiamonds: 1000, action: 'tnt', count: 20, label: '大爆発！' },
      { minDiamonds: 100, action: 'lightning', count: 3 },
      { minDiamonds: 30, action: 'mob', mob: 'creeper', count: 2 },
      { minDiamonds: 5, action: 'mob', mob: 'zombie', count: 1 },
      { minDiamonds: 1, action: 'tnt', count: 1 },
      { event: 'follow', action: 'heal', label: 'フォローで全回復！', cooldownSec: 30 },
      { event: 'share', action: 'message', label: 'シェアありがとう！', cooldownSec: 10 },
    ],
  },
  {
    id: 'bury',
    name: '埋め立て企画',
    description: 'ギフトが来るたびに砂が降ってくる。大きいギフトほど一気に埋まる',
    rules: [
      { minDiamonds: 100, action: 'bury', count: 5, label: '大量埋め立て！' },
      { minDiamonds: 30, action: 'bury', count: 3 },
      { minDiamonds: 5, action: 'bury', count: 2 },
      { minDiamonds: 1, action: 'bury', count: 1 },
      ...thanks,
    ],
  },
  {
    id: 'tnt',
    name: 'TNT祭り',
    description: 'すべてのギフトがTNTに。大きいギフトは一度に大量に降ってくる',
    rules: [
      { minDiamonds: 100, action: 'tnt', count: 20, label: 'TNTの雨！' },
      { minDiamonds: 30, action: 'tnt', count: 10 },
      { minDiamonds: 5, action: 'tnt', count: 5 },
      { minDiamonds: 1, action: 'tnt', count: 1 },
      ...thanks,
    ],
  },
  {
    id: 'mobs',
    name: 'モブ地獄',
    description: 'ギフトの大きさで強いモブが出てくる。シェアでシルバーフィッシュが湧く',
    rules: [
      { minDiamonds: 100, action: 'mob', mob: 'witch', count: 3 },
      { minDiamonds: 30, action: 'mob', mob: 'creeper', count: 2 },
      { minDiamonds: 5, action: 'mob', mob: 'skeleton', count: 2 },
      { minDiamonds: 1, action: 'mob', mob: 'zombie', count: 1 },
      { event: 'follow', action: 'message', label: 'フォローありがとう！', cooldownSec: 5 },
      { event: 'share', action: 'mob', mob: 'silverfish', count: 3, cooldownSec: 30 },
    ],
  },
  {
    id: 'chaos',
    name: '天変地異',
    description: '雷と打ち上げで空と地上を行ったり来たり。フォローで全回復',
    rules: [
      { minDiamonds: 100, action: 'launch', label: '空の彼方へ！' },
      { minDiamonds: 30, action: 'lightning', count: 3 },
      { minDiamonds: 1, action: 'lightning', count: 1 },
      { event: 'follow', action: 'heal', label: 'フォローで全回復！', cooldownSec: 60 },
      { event: 'share', action: 'message', label: 'シェアありがとう！', cooldownSec: 10 },
    ],
  },
];

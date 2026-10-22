// 妨害の設定のプリセット（まとめて切り替えるルールの組）。
// 入っているもの（定番・やさしめ・激辛）と、配信者が自分で保存したもの（config.json の presets）がある。
// 入っているものは、初めての人がすぐ使えるように（2026-10-22 ユーザーの判断で戻した）。
// どれも無料版のルールの上限（12件）に収める。埋め立て向け（採掘チャレンジでは、枠を使う妨害は出ない）。
import example from '../config.example.json' with { type: 'json' };

const THANKS = [
  { gift: 'ハートミー', action: 'message', label: 'チーム参加ありがとう！', cooldownSec: 10 },
  { event: 'follow', action: 'message', label: 'フォローありがとう！', cooldownSec: 10 },
  { event: 'share', action: 'message', label: 'シェアありがとう！', cooldownSec: 10 },
];

export const BUILTIN_PRESETS = [
  {
    id: 'standard',
    name: '定番',
    description: 'モブと TNT が中心。最初はこれ',
    rules: example.rules,
  },
  {
    id: 'easy',
    name: 'やさしめ',
    description: 'お助けが多く、クリアしやすい',
    rules: [
      { gift: 'バラ', action: 'fill_help', count: 5 },
      { gift: 'GG', action: 'fill_help', count: 10 },
      { gift: '香水', action: 'fill_layer', count: 1 },
      { gift: 'ドーナッツ', action: 'fill_help', count: 20 },
      { gift: 'クラッカー', action: 'mob', mob: 'zombie', count: 5 },
      { minDiamonds: 1000, action: 'tnt', count: 10 },
      { minDiamonds: 100, action: 'mob', mob: 'creeper', count: 1 },
      { minDiamonds: 1, action: 'mob', mob: 'zombie', count: 1 },
      { likes: 100, action: 'fill_help', count: 5 },
      ...THANKS,
    ],
  },
  {
    id: 'hard',
    name: '激辛',
    description: '逮捕・全消しなど、きつい妨害が多い',
    rules: [
      { gift: 'バラ', action: 'mob', mob: 'zombie', count: 1 },
      { gift: 'GG', action: 'lightning', count: 1 },
      { gift: '香水', action: 'freeze', count: 5 },
      { gift: 'ドーナッツ', action: 'jail', count: 10 },
      { gift: 'クラッカー', action: 'fill_raise', count: 1 },
      { minDiamonds: 1000, action: 'fill_clear' },
      { minDiamonds: 100, action: 'tnt', count: 10 },
      { minDiamonds: 1, action: 'tnt', count: 1 },
      { likes: 100, action: 'levitate', count: 3 },
      ...THANKS,
    ],
  },
];

/** プリセットの名前の長さの上限（保存できる数はプランで決まる。plan.js） */
export const MAX_PRESET_NAME = 20;

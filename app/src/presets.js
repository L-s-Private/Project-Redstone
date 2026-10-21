// 妨害の設定のプリセット（まとめて切り替えるルールの組）。
// 入っているプリセット（定番・やさしめ・激辛）は、いったん外した（2026-10-21 ユーザーの判断）。
// 初めて起動したときのルールは、これまでどおり config.example.json のもの。
// 今は配信者が自分で保存したもの（config.json の presets）だけ。

export const BUILTIN_PRESETS = [];

/** プリセットの名前の長さの上限（保存できる数はプランで決まる。plan.js） */
export const MAX_PRESET_NAME = 20;

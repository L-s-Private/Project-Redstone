// 無料版・有料版の上限を決める場所（仕様書「無料版・有料版 必須機能仕様」10番の2）。
// 上限の数はここにだけ書き、ほかのファイルはここから読む。
// 一時停止・全妨害ストップ・テスト・妨害ごとの上限などの安全のしくみは、プランで変えない。
// 上限を超えた設定は消さない。新しく足すことだけを断る（仕様書 10番の5）。

export const PLANS = {
  free: { id: 'free', name: '無料版', userPresets: 1, rulesPerPreset: 12 },
  plus: { id: 'plus', name: 'Creator Plus', userPresets: 20, rulesPerPreset: 50 },
};

/**
 * 今のプラン。有料版の販売が始まるまでは無料ベータとして、全員が有料版と同じ上限で使える。
 * （購入の確認ができたら、ここをライセンスの状態から決めるようにする）
 */
export const CURRENT_PLAN = 'plus';

/** 設定ファイルに入れておける数の上限（どのプランでも、これより多くは読み込まない） */
export const MAX_USER_PRESETS = Math.max(...Object.values(PLANS).map((p) => p.userPresets));
export const MAX_RULES = Math.max(...Object.values(PLANS).map((p) => p.rulesPerPreset));

export function planOf(id) {
  return PLANS[id] ?? PLANS.free;
}

/**
 * 自分のプリセットを保存してよいか。同じ名前の上書きは、上限を超えていてもできる。
 * @returns {string | null} 断るときの理由
 */
export function checkPresetSave(planId, presets, name) {
  const plan = planOf(planId);
  if (presets.some((p) => p.name === name)) return null;
  if (presets.length < plan.userPresets) return null;
  return `${plan.name}で保存できる自分のプリセットは${plan.userPresets}個までです。どれかを削除するか、同じ名前で上書きしてください`;
}

/**
 * ルールを保存してよいか。上限を超えたまま減らす・変えるのはよいが、増やすことはできない。
 * @param {number} previousCount 今保存されているルールの数
 * @returns {string | null} 断るときの理由
 */
export function checkRules(planId, rules, previousCount) {
  const plan = planOf(planId);
  if (rules.length <= plan.rulesPerPreset || rules.length <= previousCount) return null;
  return `${plan.name}で使えるルールは${plan.rulesPerPreset}件までです（今は${rules.length}件）。ルールを減らしてから保存してください`;
}

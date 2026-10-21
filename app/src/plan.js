// 無料版・有料版の上限を決める場所（仕様書「無料版・有料版 必須機能仕様」10番の2）。
// 上限の数はここにだけ書き、ほかのファイルはここから読む。
// 一時停止・全妨害ストップ・テスト・妨害ごとの上限などの安全のしくみは、プランで変えない。
// 上限を超えた設定は消さない。新しく足すことだけを断る（仕様書 10番の5）。

export const PLANS = {
  // importExport: 設定をファイルに書き出す・読み込む / overlayStyle: 配信画面の部品の見た目を変える
  // advancedRules: ランダムの出やすさ・同じものを続けない・何ラウンド目から（ランダムと「いつ出すか」は無料版でも使える）
  // analytics: 30日分の配信の一覧と、配信ごとのくわしい分析（無料版は直近の配信のまとめだけ）
  free: { id: 'free', name: '無料版', userPresets: 1, rulesPerPreset: 12, importExport: false, overlayStyle: false, advancedRules: false, analytics: false },
  plus: { id: 'plus', name: 'Creator Plus', userPresets: 20, rulesPerPreset: 50, importExport: true, overlayStyle: true, advancedRules: true, analytics: true },
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

/** 有料版だけの機能を使えるか。使えなければ理由を返す */
export function checkFeature(planId, feature, label) {
  const plan = planOf(planId);
  return plan[feature] ? null : `${label}は ${PLANS.plus.name} の機能です`;
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

/** 有料版の細かい設定（advancedRules）を使っているルールか */
export function usesAdvancedRule(rule) {
  return rule.minRound !== undefined || rule.noRepeat === true || (rule.choices ?? []).some((c) => (c.weight ?? 1) !== 1);
}

/**
 * 有料版の細かい設定を使ったルールを保存してよいか。今あるものは残せるが、増やすことはできない。
 * @param {object[]} previousRules 今保存されているルール
 * @returns {string | null} 断るときの理由
 */
export function checkAdvancedRules(planId, rules, previousRules) {
  if (planOf(planId).advancedRules) return null;
  const count = (list) => list.filter(usesAdvancedRule).length;
  if (count(rules) <= count(previousRules)) return null;
  return `ランダムの出やすさ・同じものを続けない・何ラウンド目から は ${PLANS.plus.name} の機能です`;
}

// 採掘・収集チャレンジ（ゲームモードの2つ目）の設定と、妨害がどのゲームモードで使えるか。
// 時間と進み具合は MOD が決める（ping の mining）。アプリは設定と、始める・止めるの操作だけを持つ。

/** ゲームモード。fill = 埋め立て、mining_challenge = 採掘・収集チャレンジ */
export const GAME_MODES = ['fill', 'mining_challenge'];
export const DEFAULT_GAME_MODE = 'fill';

/** 集められる資源（MOD の MiningChallenge.TARGETS と同じ）。note は選んだときに出す短い説明 */
export const MINING_TARGETS = [
  { id: 'minecraft:coal', name: '石炭', icon: 'coal', note: '石炭鉱石から。浅い所に多い。幸運で増えます' },
  { id: 'minecraft:raw_iron', name: '鉄の原石', icon: 'raw_iron', note: '鉄鉱石から。シルクタッチだと鉱石のまま落ちて数えません' },
  { id: 'minecraft:raw_copper', name: '銅の原石', icon: 'raw_copper', note: '銅鉱石から。1個の鉱石から何個か落ちます' },
  { id: 'minecraft:raw_gold', name: '金の原石', icon: 'raw_gold', note: '金鉱石から。深い所・荒野（メサ）に多い。鉄のツルハシ以上で掘る' },
  { id: 'minecraft:diamond', name: 'ダイヤモンド', icon: 'diamond', note: 'ダイヤモンド鉱石から。とても深い所。鉄のツルハシ以上で掘る' },
  { id: 'minecraft:emerald', name: 'エメラルド', icon: 'emerald', note: 'エメラルド鉱石から。山の中だけにあり、とても少ない' },
  { id: 'minecraft:lapis_lazuli', name: 'ラピスラズリ', icon: 'lapis_lazuli', note: 'ラピスラズリ鉱石から。1個の鉱石から何個も落ちます' },
  { id: 'minecraft:redstone', name: 'レッドストーンダスト', icon: 'redstone', note: 'レッドストーン鉱石から。深い所。何個も落ちます' },
  { id: 'minecraft:quartz', name: 'ネザークォーツ', icon: 'quartz', note: 'ネザーのネザークォーツ鉱石から' },
  { id: 'minecraft:ancient_debris', name: '古代の残骸', icon: 'ancient_debris', note: 'ネザーの深い所に少しだけ。ダイヤのツルハシ以上で掘る' },
  { id: 'minecraft:amethyst_shard', name: 'アメジストの欠片', icon: 'amethyst_shard', note: 'ジオード（アメジストの洞窟）の育ちきったアメジストの塊から' },
  { id: 'minecraft:flint', name: '火打石', icon: 'flint', note: '砂利を掘ると、ときどき落ちます' },
];

export const MINING_LIMITS = { minCount: 1, maxCount: 512, minSeconds: 30, maxSeconds: 1800 };

/** 難易度のプリセット（選んでも、あとから変えられる。変えたら「カスタム」） */
export const MINING_PRESETS = [
  { id: 'trial', name: 'おためし', item: 'minecraft:coal', targetCount: 16, seconds: 180, description: 'ルールの確認に。資源のある所で始めます' },
  { id: 'normal', name: 'ノーマル', item: 'minecraft:raw_iron', targetCount: 16, seconds: 180, description: '基本のチャレンジ' },
  { id: 'hard', name: 'ハード', item: 'minecraft:diamond', targetCount: 3, seconds: 300, description: '難しい。ダイヤのある深さで始めるのがおすすめ' },
];

export const DEFAULT_MINING = { preset: 'normal', item: 'minecraft:raw_iron', targetCount: 16, seconds: 180 };

/** 採掘チャレンジの設定を読む。おかしな値は既定値にする（設定ファイルが壊れても起動できるように） */
export function parseMining(raw = {}) {
  const mining = raw && typeof raw === 'object' ? raw : {};
  const int = (value, fallback, min, max) => {
    const n = Number(value);
    return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
  };
  const item = MINING_TARGETS.some((t) => t.id === mining.item) ? mining.item : DEFAULT_MINING.item;
  const targetCount = int(mining.targetCount, DEFAULT_MINING.targetCount, MINING_LIMITS.minCount, MINING_LIMITS.maxCount);
  const seconds = int(mining.seconds, DEFAULT_MINING.seconds, MINING_LIMITS.minSeconds, MINING_LIMITS.maxSeconds);
  return { preset: presetOf({ item, targetCount, seconds }), item, targetCount, seconds };
}

/** 資源・目標数・制限時間がどのプリセットと同じか（どれとも違えば custom） */
export function presetOf({ item, targetCount, seconds }) {
  return MINING_PRESETS.find((p) => p.item === item && p.targetCount === targetCount && p.seconds === seconds)?.id ?? 'custom';
}

/**
 * 画面から届いた設定を確かめる。範囲の外は丸めずに断る
 * @returns {string | null} おかしいときの理由
 */
export function checkMining({ item, targetCount, seconds }) {
  if (!MINING_TARGETS.some((t) => t.id === item)) return '選択中の対象アイテムは使えません。別の対象を選んでください';
  if (!(Number.isInteger(targetCount) && targetCount >= MINING_LIMITS.minCount && targetCount <= MINING_LIMITS.maxCount)) {
    return `目標数は${MINING_LIMITS.minCount}〜${MINING_LIMITS.maxCount}の整数にしてください`;
  }
  if (!(Number.isInteger(seconds) && seconds >= MINING_LIMITS.minSeconds && seconds <= MINING_LIMITS.maxSeconds)) {
    return `制限時間は${MINING_LIMITS.minSeconds}〜${MINING_LIMITS.maxSeconds}秒にしてください`;
  }
  return null;
}

export function targetName(id) {
  return MINING_TARGETS.find((t) => t.id === id)?.name ?? id;
}

/** MOD の挑戦の状態のうち、まだ終わっていないもの */
export const ACTIVE_MINING_STATES = ['countdown', 'running', 'paused'];

export function miningActive(mining) {
  return ACTIVE_MINING_STATES.includes(mining?.state);
}

/** 03:00 の形 */
export function clock(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** 終わった理由（MOD の failureReason）を短い日本語に */
export const MINING_REASONS = {
  timeout: '時間切れ',
  player_died: 'プレイヤーが倒れた',
  user_abort: '配信者が中止した',
  countdown_cancelled: '開始を取り消した',
  world_closed: 'ワールドを閉じた',
  player_left: 'プレイヤーがいなくなった',
  error: 'マイクラの中でエラーが起きた',
  app_restart: 'マイクラかアプリが起動し直した',
};

// ---- 妨害とゲームモード ----

/** 埋め立ての枠を使う妨害（採掘チャレンジでは出さない） */
export const FILL_ONLY_ACTIONS = ['fill_expand', 'fill_shrink', 'fill_help', 'jail', 'fill_layer', 'fill_clear', 'fill_raise'];
/** 採掘チャレンジ中だけ出せる妨害（支援） */
export const MINING_ONLY_ACTIONS = ['mining_bonus_drop'];
/** 採掘チャレンジでは地形を壊さない形で出す */
export const TERRAIN_SAFE_ACTIONS = ['tnt', 'mob'];

/**
 * 今のゲームモード。動いているゲームがあればそれ、なければ選んでいるモード
 * @param {{fill?: object | null, mining?: object | null}} status MOD の ping
 * @param {string} selected 選んでいるモード
 * @returns {{mode: string, running: boolean, paused: boolean}}
 */
export function currentMode(status, selected) {
  if (status?.fill) return { mode: 'fill', running: true, paused: false };
  if (miningActive(status?.mining)) {
    return { mode: 'mining_challenge', running: status.mining.state === 'running', paused: status.mining.state === 'paused' };
  }
  return { mode: GAME_MODES.includes(selected) ? selected : DEFAULT_GAME_MODE, running: false, paused: false };
}

/**
 * この妨害を、今のモードで出してよいか
 * @returns {'mode_incompatible' | 'no_active_mode' | null} 出さないときの理由（dispatcher の status）
 */
export function modeProblem(type, current) {
  if (current.mode === 'mining_challenge' && FILL_ONLY_ACTIONS.includes(type)) return 'mode_incompatible';
  if (MINING_ONLY_ACTIONS.includes(type)) {
    if (current.mode !== 'mining_challenge') return 'mode_incompatible';
    if (!current.running) return 'no_active_mode';
  }
  return null;
}

/** ルールの画面に出す、モードの注意（出さないものだけ） */
export function modeNote(type, mode) {
  if (mode === 'mining_challenge' && FILL_ONLY_ACTIONS.includes(type)) return '採掘チャレンジでは出ません（埋め立て専用）';
  if (mode !== 'mining_challenge' && MINING_ONLY_ACTIONS.includes(type)) return '埋め立てでは出ません（採掘チャレンジ専用）';
  return '';
}

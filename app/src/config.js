import { readFile } from 'node:fs/promises';
import { ACTION_TYPES, SOCIAL_EVENTS } from './rules.js';
import { MAX_PRESET_NAME } from './presets.js';
import { MAX_RULES, MAX_USER_PRESETS } from './plan.js';

export const DEFAULT_MOD_PORT = 25599;

const TRIGGER_KEYS = ['gift', 'giftId', 'minDiamonds', 'likes', 'event'];
// MOD が出せるもの（docs/protocol.md）
export const MOBS = ['zombie', 'skeleton', 'creeper', 'spider', 'witch', 'silverfish', 'pig'];
const RULE_KEYS = [...TRIGGER_KEYS, 'action', 'count', 'maxCount', 'mob', 'label', 'cooldownSec'];
const MAX_LABEL_LENGTH = 100;

// 埋め立ての設定（MOD の docs/protocol.md と同じ値）
export const FILL_WALLS = ['glass', 'white_stained_glass', 'light_blue_stained_glass', 'bedrock'];
export const FILL_BLOCKS = ['amethyst_block', 'diamond_block', 'emerald_block', 'gold_block', 'iron_block', 'lapis_block', 'redstone_block', 'quartz_block'];
/** ブロックを置く速さ（右クリック押しっぱなし）。normal はバニラと同じ */
export const FILL_PLACE_SPEEDS = ['normal', 'fast', 'fastest'];
/** 手でブロックを壊す速さ（左クリック押しっぱなし）。normal はバニラと同じ。fast・fastest は置く速さと同じ */
export const FILL_BREAK_SPEEDS = ['normal', 'fast', 'fastest'];
export const DEFAULT_FILL = {
  width: 11, height: 9, countdown: 10, rounds: 10, wall: 'glass', block: 'amethyst_block', handBlock: 'amethyst_block', skyY: 150, reach: 8,
  placeSpeed: 'fast', breakSpeed: 'fast', mobsAttack: true, mobLifetime: 30,
};

/** ワールドの設定。time: normal（進む）/ day・night（その時間で止める）、weather: normal（変わる）/ clear・rain（止める） */
export const WORLD_TIMES = ['normal', 'day', 'night'];
export const WORLD_WEATHERS = ['normal', 'clear', 'rain'];
export const DEFAULT_WORLD = { time: 'normal', weather: 'normal', mobSpawning: true, keepInventory: false };

/** ワールドの設定を読む。おかしな値は既定値（バニラと同じ）にする */
export function parseWorld(raw = {}) {
  const world = raw && typeof raw === 'object' ? raw : {};
  const bool = (value, fallback) => (typeof value === 'boolean' ? value : fallback);
  return {
    time: WORLD_TIMES.includes(world.time) ? world.time : DEFAULT_WORLD.time,
    weather: WORLD_WEATHERS.includes(world.weather) ? world.weather : DEFAULT_WORLD.weather,
    mobSpawning: bool(world.mobSpawning, DEFAULT_WORLD.mobSpawning),
    keepInventory: bool(world.keepInventory, DEFAULT_WORLD.keepInventory),
  };
}

/** 配信画面の部品の文字の形（Windows に入っているもの） */
export const OVERLAY_FONTS = {
  gothic: '"Yu Gothic UI", "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif',
  meiryo: 'Meiryo, "Yu Gothic UI", system-ui, sans-serif',
  ud: '"BIZ UDPGothic", "Yu Gothic UI", system-ui, sans-serif',
  mincho: '"Yu Mincho", "Hiragino Mincho ProN", serif',
};
/** 配信画面の部品の見た目（有料版で変えられる）。既定は操作画面と同じグレー */
export const DEFAULT_OVERLAY_STYLE = {
  textColor: '#ededed', accentColor: '#6fbf8e', panelColor: '#141416', panelOpacity: 88, font: 'gothic', alertSeconds: 5.5, alertMax: 3,
};

/** 配信画面の部品の見た目を読む。おかしな値は既定値にする */
export function parseOverlayStyle(raw = {}) {
  const style = raw && typeof raw === 'object' ? raw : {};
  const color = (value, fallback) => (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : fallback);
  const num = (value, fallback, min, max, step) => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n / step) * step)) : fallback;
  };
  const d = DEFAULT_OVERLAY_STYLE;
  return {
    textColor: color(style.textColor, d.textColor),
    accentColor: color(style.accentColor, d.accentColor),
    panelColor: color(style.panelColor, d.panelColor),
    panelOpacity: num(style.panelOpacity, d.panelOpacity, 0, 100, 1),
    font: Object.hasOwn(OVERLAY_FONTS, style.font) ? style.font : d.font,
    alertSeconds: num(style.alertSeconds, d.alertSeconds, 2, 15, 0.5),
    alertMax: num(style.alertMax, d.alertMax, 1, 5, 1),
  };
}

/** 埋め立ての設定を読む。おかしな値は既定値にする（設定ファイルが壊れても起動できるように） */
export function parseFill(raw = {}) {
  const int = (value, fallback, min, max) => {
    const n = Math.floor(Number(value));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  };
  const fill = raw && typeof raw === 'object' ? raw : {};
  const block = FILL_BLOCKS.includes(fill.block) ? fill.block : DEFAULT_FILL.block;
  return {
    width: int(fill.width, DEFAULT_FILL.width, 3, 41),
    height: int(fill.height, DEFAULT_FILL.height, 1, 30),
    countdown: int(fill.countdown, DEFAULT_FILL.countdown, 0, 600),
    rounds: int(fill.rounds, DEFAULT_FILL.rounds, 1, 99),
    wall: FILL_WALLS.includes(fill.wall) ? fill.wall : DEFAULT_FILL.wall,
    // block は枠の中に置かれるブロック、handBlock は手に持つブロック（置くと block に変わる）。前の版の設定は同じものにする
    block,
    handBlock: FILL_BLOCKS.includes(fill.handBlock) ? fill.handBlock : block,
    skyY: int(fill.skyY, DEFAULT_FILL.skyY, -60, 300),
    reach: int(fill.reach, DEFAULT_FILL.reach, 1, 64),
    placeSpeed: FILL_PLACE_SPEEDS.includes(fill.placeSpeed) ? fill.placeSpeed : DEFAULT_FILL.placeSpeed,
    breakSpeed: FILL_BREAK_SPEEDS.includes(fill.breakSpeed) ? fill.breakSpeed : DEFAULT_FILL.breakSpeed,
    // 枠に出したモブが消えるまでの秒数（0 なら消えない）
    mobLifetime: int(fill.mobLifetime, DEFAULT_FILL.mobLifetime, 0, 600),
    // モブに攻撃される（クリエイティブでも埋め立て中だけサバイバル・飛べる）
    mobsAttack: typeof fill.mobsAttack === 'boolean' ? fill.mobsAttack : DEFAULT_FILL.mobsAttack,
  };
}

export class ConfigError extends Error {}

export async function loadConfig(path) {
  let text;
  try {
    text = await readFile(path, 'utf8');
  } catch {
    throw new ConfigError(`設定ファイルが見つかりません: ${path}`);
  }
  let raw;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    throw new ConfigError(`設定ファイルの書き方が正しくありません（${path}）: ${e.message}`);
  }
  return parseConfig(raw);
}

export function parseConfig(raw) {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new ConfigError('設定ファイルの中身は { ... } の形にしてください');
  }
  const tiktokUsername = String(raw.tiktokUsername ?? '').trim().replace(/^@/, '');

  const mod = raw.mod ?? {};
  const port = mod.port ?? DEFAULT_MOD_PORT;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new ConfigError('mod.port は 1〜65535 の整数にしてください');
  }

  if (!Array.isArray(raw.rules) || raw.rules.length === 0) {
    throw new ConfigError('rules に妨害のルールを1つ以上書いてください');
  }
  if (raw.rules.length > MAX_RULES) {
    throw new ConfigError(`ルールは${MAX_RULES}件までにしてください`);
  }
  const rules = raw.rules.map((rule, i) => validateRule(rule, i + 1));

  return { tiktokUsername, mod: { host: mod.host ?? '127.0.0.1', port }, rules, fill: parseFill(raw.fill), world: parseWorld(raw.world),
    presets: parsePresets(raw.presets), overlay: parseOverlayStyle(raw.overlay) };
}

/** 自分で保存したプリセット（[{name, rules}]）。壊れているものは捨てる */
export function parsePresets(raw) {
  if (!Array.isArray(raw)) return [];
  const presets = [];
  for (const preset of raw) {
    try {
      presets.push(parsePreset(preset));
    } catch {
      // 読めないプリセットは捨てる
    }
    if (presets.length >= MAX_USER_PRESETS) break;
  }
  return presets;
}

export function parsePreset(preset) {
  const name = String(preset?.name ?? '').trim();
  if (!name || name.length > MAX_PRESET_NAME) {
    throw new ConfigError(`プリセットの名前は1〜${MAX_PRESET_NAME}文字にしてください`);
  }
  return { name, rules: parseConfig({ rules: preset.rules }).rules };
}

function validateRule(rule, number) {
  const where = `${number}番目のルール`;
  if (typeof rule !== 'object' || rule === null) {
    throw new ConfigError(`${where}が { ... } の形になっていません`);
  }
  const triggers = TRIGGER_KEYS.filter((key) => rule[key] !== undefined);
  if (triggers.length !== 1) {
    throw new ConfigError(`${where}: gift / giftId / minDiamonds / likes / event のどれか1つだけを書いてください`);
  }
  if (rule.gift !== undefined && !(typeof rule.gift === 'string' && rule.gift.trim())) {
    throw new ConfigError(`${where}: ギフト名を入れてください`);
  }
  if (rule.label !== undefined && !(typeof rule.label === 'string' && rule.label.length <= MAX_LABEL_LENGTH)) {
    throw new ConfigError(`${where}: 表示する文は${MAX_LABEL_LENGTH}文字までにしてください`);
  }
  if (rule.event !== undefined && !SOCIAL_EVENTS.includes(rule.event)) {
    throw new ConfigError(`${where}: event は ${SOCIAL_EVENTS.join(' / ')} のどれかにしてください`);
  }
  if (rule.likes !== undefined && !(Number.isInteger(rule.likes) && rule.likes >= 1)) {
    throw new ConfigError(`${where}: いいねの回数は1以上の整数にしてください`);
  }
  if (rule.minDiamonds !== undefined && !(Number.isFinite(rule.minDiamonds) && rule.minDiamonds >= 0)) {
    throw new ConfigError(`${where}: minDiamonds は0以上の数にしてください`);
  }
  if (!ACTION_TYPES.includes(rule.action)) {
    throw new ConfigError(`${where}: action は ${ACTION_TYPES.join(' / ')} のどれかにしてください`);
  }
  if (rule.action === 'message' && !rule.label) {
    throw new ConfigError(`${where}: action が message のときは label に表示する文を書いてください`);
  }
  if (rule.mob !== undefined && !MOBS.includes(rule.mob)) {
    throw new ConfigError(`${where}: mob は ${MOBS.join(' / ')} のどれかにしてください`);
  }
  for (const key of ['count', 'maxCount']) {
    if (rule[key] !== undefined && !(Number.isInteger(rule[key]) && rule[key] >= 1)) {
      throw new ConfigError(`${where}: ${key} は1以上の整数にしてください`);
    }
  }
  if (rule.cooldownSec !== undefined && !(Number.isFinite(rule.cooldownSec) && rule.cooldownSec >= 0)) {
    throw new ConfigError(`${where}: cooldownSec は0以上の数にしてください`);
  }
  // 知らない項目は捨てる
  return Object.fromEntries(RULE_KEYS.filter((key) => rule[key] !== undefined).map((key) => [key, key === 'gift' ? rule.gift.trim() : rule[key]]));
}

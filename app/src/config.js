import { readFile } from 'node:fs/promises';
import { ACTION_TYPES, SOCIAL_EVENTS } from './rules.js';

export const DEFAULT_MOD_PORT = 25599;

const TRIGGER_KEYS = ['gift', 'giftId', 'minDiamonds', 'likes', 'event'];
// MOD が出せるもの（docs/protocol.md）
export const MOBS = ['zombie', 'skeleton', 'creeper', 'spider', 'witch', 'silverfish', 'pig'];
const RULE_KEYS = [...TRIGGER_KEYS, 'action', 'count', 'maxCount', 'mob', 'label', 'cooldownSec'];
const MAX_RULES = 50;
const MAX_LABEL_LENGTH = 100;

// 埋め立ての設定（MOD の docs/protocol.md と同じ値）
export const FILL_WALLS = ['glass', 'white_stained_glass', 'light_blue_stained_glass', 'bedrock'];
export const FILL_BLOCKS = ['amethyst_block', 'diamond_block', 'emerald_block', 'gold_block', 'iron_block', 'lapis_block', 'redstone_block', 'quartz_block'];
/** ブロックを置く速さ（右クリック押しっぱなし）。normal はバニラと同じ */
export const FILL_PLACE_SPEEDS = ['normal', 'fast', 'fastest'];
/** 手でブロックを壊す速さ（左クリック押しっぱなし）。normal はバニラと同じ。fast・fastest は置く速さと同じ */
export const FILL_BREAK_SPEEDS = ['normal', 'fast', 'fastest'];
export const DEFAULT_FILL = {
  width: 11, height: 9, countdown: 10, rounds: 10, wall: 'glass', block: 'amethyst_block', skyY: 150, reach: 8, placeSpeed: 'fast', breakSpeed: 'fast',
};

/** 埋め立ての設定を読む。おかしな値は既定値にする（設定ファイルが壊れても起動できるように） */
export function parseFill(raw = {}) {
  const int = (value, fallback, min, max) => {
    const n = Math.floor(Number(value));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  };
  const fill = raw && typeof raw === 'object' ? raw : {};
  return {
    width: int(fill.width, DEFAULT_FILL.width, 3, 41),
    height: int(fill.height, DEFAULT_FILL.height, 1, 30),
    countdown: int(fill.countdown, DEFAULT_FILL.countdown, 0, 600),
    rounds: int(fill.rounds, DEFAULT_FILL.rounds, 1, 99),
    wall: FILL_WALLS.includes(fill.wall) ? fill.wall : DEFAULT_FILL.wall,
    block: FILL_BLOCKS.includes(fill.block) ? fill.block : DEFAULT_FILL.block,
    skyY: int(fill.skyY, DEFAULT_FILL.skyY, -60, 300),
    reach: int(fill.reach, DEFAULT_FILL.reach, 1, 64),
    placeSpeed: FILL_PLACE_SPEEDS.includes(fill.placeSpeed) ? fill.placeSpeed : DEFAULT_FILL.placeSpeed,
    breakSpeed: FILL_BREAK_SPEEDS.includes(fill.breakSpeed) ? fill.breakSpeed : DEFAULT_FILL.breakSpeed,
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

  return { tiktokUsername, mod: { host: mod.host ?? '127.0.0.1', port }, rules, fill: parseFill(raw.fill) };
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

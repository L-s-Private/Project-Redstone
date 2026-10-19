import { readFile } from 'node:fs/promises';
import { ACTION_TYPES, SOCIAL_EVENTS } from './rules.js';

export const DEFAULT_MOD_PORT = 25599;

const TRIGGER_KEYS = ['gift', 'giftId', 'minDiamonds', 'event'];
// MOD が出せるもの（docs/protocol.md）
const MOBS = ['zombie', 'skeleton', 'creeper', 'spider', 'witch', 'silverfish'];
const BURY_BLOCKS = ['sand', 'gravel'];

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
  const rules = raw.rules.map((rule, i) => validateRule(rule, i + 1));

  return { tiktokUsername, mod: { host: mod.host ?? '127.0.0.1', port }, rules };
}

function validateRule(rule, number) {
  const where = `rules の${number}番目`;
  if (typeof rule !== 'object' || rule === null) {
    throw new ConfigError(`${where}が { ... } の形になっていません`);
  }
  const triggers = TRIGGER_KEYS.filter((key) => rule[key] !== undefined);
  if (triggers.length !== 1) {
    throw new ConfigError(`${where}: gift / giftId / minDiamonds / event のどれか1つだけを書いてください`);
  }
  if (rule.event !== undefined && !SOCIAL_EVENTS.includes(rule.event)) {
    throw new ConfigError(`${where}: event は ${SOCIAL_EVENTS.join(' / ')} のどれかにしてください`);
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
  if (rule.block !== undefined && !BURY_BLOCKS.includes(rule.block)) {
    throw new ConfigError(`${where}: block は ${BURY_BLOCKS.join(' / ')} のどれかにしてください`);
  }
  for (const key of ['count', 'maxCount']) {
    if (rule[key] !== undefined && !(Number.isInteger(rule[key]) && rule[key] >= 1)) {
      throw new ConfigError(`${where}: ${key} は1以上の整数にしてください`);
    }
  }
  if (rule.cooldownSec !== undefined && !(Number.isFinite(rule.cooldownSec) && rule.cooldownSec >= 0)) {
    throw new ConfigError(`${where}: cooldownSec は0以上の数にしてください`);
  }
  return rule;
}

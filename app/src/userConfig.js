// 画面版の設定ファイル。exe の横ではなく、ユーザーごとのフォルダ（Windows なら %APPDATA%\StaticArc）に置く。
import { existsSync, mkdirSync, renameSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import example from '../config.example.json' with { type: 'json' };
import { ConfigError, parseConfig } from './config.js';
import { writeFileSafely } from './files.js';

export function configDir(env = process.env, home = homedir()) {
  return env.APPDATA ? join(env.APPDATA, 'StaticArc') : join(home, '.config', 'static-arc');
}

/** 画面（Electron）の一時ファイル・ウィンドウの位置などを置く場所。設定と同じフォルダの中にまとめる（消すときに1つで済むように） */
export function browserDir(env = process.env, home = homedir()) {
  return join(configDir(env, home), 'browser');
}

/**
 * 0.45 までのフォルダ（開発中の名前）を、今の名前に移す。中身はそのまま。
 * 新しい方がもうあるとき・移せないとき（ほかのソフトが開いているなど）は何もしない
 */
export function moveOldFolders(env = process.env, home = homedir()) {
  const moves = [[env.APPDATA ? join(env.APPDATA, 'ProjectRedstone') : join(home, '.config', 'project-redstone'), configDir(env, home)]];
  if (env.APPDATA) moves.push([join(env.APPDATA, 'Project Redstone'), browserDir(env, home)]);
  for (const [from, to] of moves) {
    if (!existsSync(from) || existsSync(to)) continue;
    try {
      mkdirSync(dirname(to), { recursive: true });
      renameSync(from, to);
    } catch {}
  }
}

/** 設定を読む。初めてなら設定例を元に作る（TikTok ID は空）。 */
export async function loadUserConfig(dir = configDir()) {
  const path = join(dir, 'config.json');
  let text;
  try {
    text = await readFile(path, 'utf8');
  } catch {
    const config = parseConfig({ ...example, tiktokUsername: '' });
    await saveUserConfig(path, config);
    return { config, path, created: true };
  }
  let raw;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    throw new ConfigError(`設定ファイルの書き方が正しくありません（${path}）: ${e.message}`);
  }
  const removed = dropRemovedRules(raw);
  const config = parseConfig(raw);
  if (removed > 0) await saveUserConfig(path, config);
  return { config, path, created: false, removed };
}

// v0.4 まであった妨害。根拠がなかったため v0.5 で削除した
// （lightning は v0.12 で、埋め立て用の雷として入れ直した）。time_add・time_sub は制限時間と一緒に v0.17 で削除した
const REMOVED_ACTIONS = new Set(['bury', 'launch', 'heal', 'time_add', 'time_sub']);

/** 削除した妨害のルールを取り除く。全部なくなったら設定例のルールに戻す。@returns 取り除いた数 */
function dropRemovedRules(raw) {
  if (!Array.isArray(raw?.rules)) return 0;
  const kept = raw.rules
    .filter((rule) => !REMOVED_ACTIONS.has(rule?.action))
    .map((rule) => (rule && typeof rule === 'object' ? (({ block, ...rest }) => rest)(rule) : rule));
  const removed = raw.rules.length - kept.length;
  raw.rules = kept.length > 0 ? kept : example.rules;
  // 自分で保存したプリセットからも取り除く
  if (Array.isArray(raw.presets)) {
    for (const preset of raw.presets) {
      if (Array.isArray(preset?.rules)) preset.rules = preset.rules.filter((rule) => !REMOVED_ACTIONS.has(rule?.action));
    }
  }
  return removed;
}

/** 保存の途中でアプリが落ちても、設定ファイルが壊れないように書く */
export async function saveUserConfig(path, config) {
  const { tiktokUsername, mod, rules, fill, world, presets, overlay, gameMode, mining } = config;
  await writeFileSafely(path, `${JSON.stringify({ tiktokUsername, mod, gameMode, fill, mining, world, rules, presets, overlay }, null, 2)}\n`);
}

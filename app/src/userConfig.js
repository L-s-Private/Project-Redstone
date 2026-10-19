// 画面版の設定ファイル。exe の横ではなく、ユーザーごとのフォルダ（Windows なら %APPDATA%\ProjectRedstone）に置く。
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import example from '../config.example.json' with { type: 'json' };
import { ConfigError, parseConfig } from './config.js';

export function configDir(env = process.env, home = homedir()) {
  return env.APPDATA ? join(env.APPDATA, 'ProjectRedstone') : join(home, '.config', 'project-redstone');
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
  return { config: parseConfig(raw), path, created: false };
}

export async function saveUserConfig(path, config) {
  await mkdir(join(path, '..'), { recursive: true });
  const { tiktokUsername, mod, rules } = config;
  await writeFile(path, `${JSON.stringify({ tiktokUsername, mod, rules }, null, 2)}\n`, 'utf8');
}

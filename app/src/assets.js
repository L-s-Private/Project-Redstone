// アプリに入れる外部のグラフィック（キーアートなど）。ファイルは app/assets/ に置き、/assets/<場所> で画面から読む。
// 原本（大きいままの絵）は リポジトリ直下の design/ に置き、ここには画面用に軽くしたものだけを入れる（design/README.md）。
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ASSETS_DIR = fileURLToPath(new URL('../assets/', import.meta.url));

/** 配れる種類（拡張子 → Content-Type） */
export const ASSET_TYPES = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
};

/**
 * ゲームモードのキーアート（ゲームモードの画面の上に出す）。
 * position: 枠に合わせて切るときに残す所（CSS の object-position）。人物や見せ場が切れないように合わせる
 */
export const KEY_ART = {
  fill: { src: '/assets/art/fill.jpg', position: '50% 42%' },
  mining_challenge: { src: '/assets/art/mining_challenge.jpg', position: '58% 40%' },
};

/**
 * 操作のしかたを見せるスクショ（app/assets/guide/）。
 * liveStudio: 配信画面の部品を LIVE Studio に貼る手順（順番どおり）/ tiktokId: はじめの準備の TikTok ID / minecraft: はじめの準備の最後（ランチャーで選ぶもの）
 */
export const GUIDE = {
  liveStudio: [
    { src: '/assets/guide/live-studio-1.webp', alt: '「ソースを追加」をクリック' },
    { src: '/assets/guide/live-studio-2.webp', alt: '「リンク」を選んで「追加」をクリック' },
    { src: '/assets/guide/live-studio-3.webp', alt: 'リンクを入れて「ソースを追加」をクリック' },
  ],
  tiktokId: { src: '/assets/guide/tiktok-id.webp', alt: 'TikTok のプロフィールの URL の @ のあとが ID' },
  minecraft: { src: '/assets/guide/minecraft-ready.webp', alt: 'ランチャーで fabric-loader を選ぶ' },
};

/**
 * ロゴ（app/assets/brand/）。色は文字の色（currentColor）なので、置く場所の CSS の color で白にも黒にもなる。
 * 画面に直接埋め込む（読み込みを待たずに出るように）
 */
export const BRAND = {
  mark: readFileSync(new URL('../assets/brand/mark.svg', import.meta.url), 'utf8').trim(),
  logotype: readFileSync(new URL('../assets/brand/logotype.svg', import.meta.url), 'utf8').trim(),
};

/** /assets/ のあとの場所が、配ってよい形か（英小文字・数字・_ - / と拡張子だけ。.. や隠しファイルは不可） */
export function assetPath(path) {
  if (!/^[a-z0-9_-]+(\/[a-z0-9_-]+)*\.[a-z0-9]+$/.test(path)) return null;
  return Object.hasOwn(ASSET_TYPES, extname(path)) ? path : null;
}

/** @returns {Promise<{type: string, body: Buffer} | null>} */
export async function readAsset(path, dir = ASSETS_DIR) {
  const safe = assetPath(path);
  if (!safe) return null;
  try {
    return { type: ASSET_TYPES[extname(safe)], body: await readFile(dir + safe) };
  } catch {
    return null;
  }
}

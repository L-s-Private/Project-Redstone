// ルールの演出（配信画面のギフト通知で鳴らす音・出す画像や動画）のファイル。
// 配信者が選んだファイルを、設定と同じフォルダの media/ に写して使う（元のファイルを動かしたり消したりしても困らないように）。
// 名前は中身から決める（同じファイルを何度選んでも1つ）。ルールには名前だけを書く。
import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/** 使えるファイルの種類（拡張子 → 種類） */
export const MEDIA_TYPES = {
  mp3: { kind: 'sound', mime: 'audio/mpeg' },
  wav: { kind: 'sound', mime: 'audio/wav' },
  ogg: { kind: 'sound', mime: 'audio/ogg' },
  m4a: { kind: 'sound', mime: 'audio/mp4' },
  png: { kind: 'visual', mime: 'image/png' },
  jpg: { kind: 'visual', mime: 'image/jpeg' },
  jpeg: { kind: 'visual', mime: 'image/jpeg' },
  gif: { kind: 'visual', mime: 'image/gif' },
  webp: { kind: 'visual', mime: 'image/webp' },
  mp4: { kind: 'visual', mime: 'video/mp4' },
  webm: { kind: 'visual', mime: 'video/webm' },
};
/** 1つのファイルの大きさの上限（短い動画が入るくらい） */
export const MAX_MEDIA_BYTES = 30 * 1024 * 1024;
const NAME = /^[0-9a-f]{16}\.([a-z0-9]{2,4})$/;

/** ルールに書く名前として正しいか。kind を渡すと、その種類（sound / visual）かも確かめる */
export function isMediaName(name, kind) {
  const match = typeof name === 'string' ? name.match(NAME) : null;
  const type = match && Object.hasOwn(MEDIA_TYPES, match[1]) ? MEDIA_TYPES[match[1]] : null;
  return !!type && (!kind || type.kind === kind);
}

/** 拡張子から種類。使えないものは null */
export function mediaType(ext) {
  const key = String(ext ?? '').toLowerCase().replace(/^\./, '');
  return Object.hasOwn(MEDIA_TYPES, key) ? { ext: key === 'jpeg' ? 'jpg' : key, ...MEDIA_TYPES[key] } : null;
}

/** 動画か（配信画面で video として出す） */
export const isVideo = (name) => /\.(mp4|webm)$/.test(name);

export function createMediaStore(dir) {
  return {
    dir,
    /**
     * ファイルを写す。@returns {Promise<{name: string, kind: string}>}
     * @throws 種類が使えない・大きすぎる・空のとき
     */
    async save(body, ext) {
      const type = mediaType(ext);
      if (!type) throw new Error('この種類のファイルは使えません（音は mp3・wav・ogg・m4a、画像・動画は png・jpg・gif・webp・mp4・webm）');
      if (!body?.length) throw new Error('ファイルが空です');
      if (body.length > MAX_MEDIA_BYTES) throw new Error(`ファイルが大きすぎます（${MAX_MEDIA_BYTES / 1024 / 1024}MB まで）`);
      const name = `${createHash('sha256').update(body).digest('hex').slice(0, 16)}.${type.ext}`;
      await mkdir(dir, { recursive: true });
      const exists = await stat(join(dir, name)).then(() => true, () => false);
      if (!exists) await writeFile(join(dir, name), body);
      return { name, kind: type.kind };
    },
    /** @returns {Promise<{body: Buffer, mime: string} | null>} 名前がおかしい・無いときは null */
    async read(name) {
      if (!isMediaName(name)) return null;
      try {
        return { body: await readFile(join(dir, name)), mime: MEDIA_TYPES[name.split('.').pop()].mime };
      } catch {
        return null;
      }
    },
  };
}

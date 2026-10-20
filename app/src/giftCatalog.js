// TikTok のギフト一覧（日本語名・英語名・ダイヤ数・公式の絵）。設定画面でギフトを絵で選べるようにする。
// 一覧は TikTok の公開の窓口（LIVE のギフト欄が使うもの）から取り、取れないとき（オフラインなど）に備えてファイルにも残す。
// 配信中のギフトは英語名で届くことがあるので、ギフトの ID で日本語名と結び付ける。
import { readFile } from 'node:fs/promises';
import { writeFileSafely } from './files.js';

const GIFT_LIST_URL = 'https://webcast.tiktok.com/webcast/gift/list/?aid=1988&app_name=tiktok_web&device_platform=web_pc';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';
/** 1日たったら取り直す */
const REFRESH_MS = 24 * 60 * 60 * 1000;

/** gift/list の応答を {id, name, diamonds, image} の配列にする（名前と絵のないものは捨てる） */
export function parseGiftList(json) {
  const gifts = [];
  for (const gift of json?.data?.gifts ?? []) {
    const name = typeof gift?.name === 'string' ? gift.name.trim() : '';
    const image = gift?.image?.url_list?.[0];
    if (!name || gift.id === undefined || typeof image !== 'string' || !image.startsWith('https://')) continue;
    gifts.push({ id: String(gift.id), name, diamonds: Math.max(0, Number(gift.diamond_count) || 0), image });
  }
  return gifts;
}

/** 英語の一覧と日本語の一覧を ID で合わせる。安い順 */
export function mergeGiftLists(english, japanese) {
  const ja = new Map(japanese.map((g) => [g.id, g.name]));
  return english
    .map((g) => ({ ...g, nameJa: ja.get(g.id) ?? g.name }))
    .sort((a, b) => a.diamonds - b.diamonds || a.nameJa.localeCompare(b.nameJa, 'ja'));
}

export class GiftCatalog {
  /**
   * @param {object} options
   * @param {string} options.path 残しておくファイル
   * @param {typeof fetch} [options.fetch]
   */
  constructor({ path, fetch: fetchImpl = globalThis.fetch, now = Date.now }) {
    this.path = path;
    this.fetch = fetchImpl;
    this.now = now;
    /** @type {{id: string, name: string, nameJa: string, diamonds: number, image: string}[]} */
    this.gifts = [];
    this.fetchedAt = 0;
    /** 中身が変わるたびに増やす（画面が取り直すかどうかの目印） */
    this.version = 0;
  }

  /** ファイルから読み、古ければ TikTok から取り直す */
  async load() {
    try {
      const saved = JSON.parse(await readFile(this.path, 'utf8'));
      // 日本語名のない前の版のファイルは使わない
      if (Array.isArray(saved.gifts) && saved.gifts.every((g) => typeof g?.nameJa === 'string')) {
        this.gifts = saved.gifts;
        this.fetchedAt = Number(saved.fetchedAt) || 0;
        this.version++;
      }
    } catch {
      // まだない・壊れている
    }
    if (this.now() - this.fetchedAt > REFRESH_MS) await this.refresh();
  }

  async refresh() {
    const [english, japanese] = await Promise.all([this.fetchList('en'), this.fetchList('ja-JP')]);
    const gifts = mergeGiftLists(english, japanese);
    if (gifts.length === 0) throw new Error('ギフト一覧が空でした');
    this.gifts = gifts;
    this.fetchedAt = this.now();
    this.version++;
    await this.save();
  }

  async fetchList(language) {
    const res = await this.fetch(`${GIFT_LIST_URL}&webcast_language=${language}&language=${language}`, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`ギフト一覧を取れませんでした（${res.status}）`);
    return parseGiftList(await res.json());
  }

  /** ID → 名前（英語・日本語のどちらでも）の順で探す。ギフトが届くたびに呼ぶので、一覧から作った索引で引く */
  find({ giftId, giftName } = {}) {
    const index = this.index();
    if (giftId) {
      const byId = index.byId.get(String(giftId));
      if (byId) return byId;
    }
    if (!giftName) return null;
    const name = String(giftName).toLowerCase();
    return index.byNameJa.get(name) ?? index.byName.get(name) ?? null;
  }

  /** 一覧が入れ替わったら作り直す（同じ名前なら一覧で先のもの） */
  index() {
    if (this.indexed?.gifts !== this.gifts) {
      const byId = new Map();
      const byNameJa = new Map();
      const byName = new Map();
      for (const gift of this.gifts) {
        if (!byId.has(gift.id)) byId.set(gift.id, gift);
        const ja = gift.nameJa.toLowerCase();
        if (!byNameJa.has(ja)) byNameJa.set(ja, gift);
        const en = gift.name.toLowerCase();
        if (!byName.has(en)) byName.set(en, gift);
      }
      this.indexed = { gifts: this.gifts, byId, byNameJa, byName };
    }
    return this.indexed;
  }

  async save() {
    await writeFileSafely(this.path, `${JSON.stringify({ fetchedAt: this.fetchedAt, gifts: this.gifts })}\n`);
  }
}

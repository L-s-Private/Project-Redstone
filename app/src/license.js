// 有料版（Creator Plus）のライセンスキー。Polar のライセンスキーを、この PC で有効化して確かめる。
// 決まりごと（仕様書の 12.2 と、ユーザーとの決定）:
//   - 使える PC の数は Polar の商品の設定（有効化の上限 2）で決める
//   - 起動したときと、1日に1回確かめる
//   - ネットにつながらず確かめられないときは、最後に確かめてから 7日間は有料版のまま
//   - 1つのキーで使える TikTok アカウントは1つ。有効化したときの TikTok ID でしか確かめが通らない
//     （Polar の conditions を使う。別の PC で別のアカウントを有効化することまでは防げない。厳しく守るにはサーバーが要る）
//   - 期限切れ・解約になったら無料版に戻すだけで、設定は消さない
// Polar の組織 ID が決まるまで（販売を始めるまで）は使わない。そのあいだは全員が有料版と同じ上限（plan.js）。
import { EventEmitter } from 'node:events';
import { readFile, rm } from 'node:fs/promises';
import { hostname } from 'node:os';
import { writeFileSafely } from './files.js';

export const POLAR_API = 'https://api.polar.sh';
export const POLAR_SANDBOX_API = 'https://sandbox-api.polar.sh';
/** 販売を始めたら、Polar の組織 ID をここに入れる（空のあいだはライセンスを使わない） */
export const POLAR_ORGANIZATION_ID = '';

export const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
export const OFFLINE_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

/** 開発中に Polar のテスト環境（sandbox）で試すときは、環境変数で組織 ID を渡す */
export function licenseConfig(env = process.env) {
  if (env.REDSTONE_POLAR_ORG) {
    return { organizationId: env.REDSTONE_POLAR_ORG, api: env.REDSTONE_POLAR_SANDBOX === '0' ? POLAR_API : POLAR_SANDBOX_API };
  }
  return { organizationId: POLAR_ORGANIZATION_ID, api: POLAR_API };
}

/**
 * イベント: 'change'  status() が変わったとき
 */
export class License extends EventEmitter {
  /**
   * @param {object} options
   * @param {string} options.path 保存するファイル（license.json）
   * @param {string} options.organizationId 空ならライセンスを使わない
   * @param {string} [options.api]
   * @param {typeof fetch} [options.fetch]
   * @param {() => number} [options.now]
   * @param {string} [options.label] Polar の管理画面に出る、この PC の名前
   */
  constructor({ path, organizationId, api = POLAR_API, fetch = globalThis.fetch, now = Date.now, label = hostname() }) {
    super();
    Object.assign(this, { path, organizationId, api, fetchImpl: fetch, now, label });
    // {key, displayKey, activationId, tiktok, lastValidatedAt, expiresAt, revoked}
    this.saved = null;
    this.timer = null;
  }

  get enabled() {
    return Boolean(this.organizationId);
  }

  async load() {
    if (!this.enabled) return;
    this.saved = await readFile(this.path, 'utf8').then(JSON.parse).catch(() => null);
  }

  /** 起動したら確かめ、そのあと1日に1回確かめる */
  start() {
    if (!this.enabled) return;
    this.check().catch(() => {});
    this.timer = setInterval(() => this.check().catch(() => {}), CHECK_INTERVAL_MS);
    this.timer.unref?.();
  }

  stop() {
    clearInterval(this.timer);
  }

  /**
   * 今の状態（画面に出す）。
   * state: disabled（販売前）/ none（キーなし）/ active / offline（確かめられないが猶予中）/ expired（期限切れ・解約・猶予切れ）
   */
  status() {
    if (!this.enabled) return { enabled: false, state: 'disabled' };
    const s = this.saved;
    if (!s) return { enabled: true, state: 'none' };
    const base = { enabled: true, displayKey: s.displayKey, tiktok: s.tiktok, lastValidatedAt: s.lastValidatedAt };
    if (s.revoked || (s.expiresAt && Date.parse(s.expiresAt) <= this.now())) return { ...base, state: 'expired' };
    const graceUntil = s.lastValidatedAt + OFFLINE_GRACE_MS;
    if (s.offline) return this.now() < graceUntil ? { ...base, state: 'offline', graceUntil } : { ...base, state: 'expired', offline: true };
    return { ...base, state: 'active' };
  }

  /**
   * 使えるプラン（plan.js の id）。販売前は全員 plus。
   * TikTok ID がキーを有効化したときと違えば、無料版として扱う。
   */
  plan(tiktokUsername) {
    if (!this.enabled) return 'plus';
    const status = this.status();
    if (status.state !== 'active' && status.state !== 'offline') return 'free';
    return sameAccount(status.tiktok, tiktokUsername) ? 'plus' : 'free';
  }

  /** キーをこの PC で有効にする。TikTok ID を先に設定しておく必要がある */
  async activate(key, tiktokUsername) {
    if (!this.enabled) throw new Error('有料版はまだ販売していません');
    key = String(key ?? '').trim();
    const tiktok = normalize(tiktokUsername);
    if (!key) throw new Error('ライセンスキーを入れてください');
    if (!tiktok) throw new Error('先に TikTok ID を保存してください（キーはその TikTok アカウント用になります）');
    const res = await this.post('/v1/customer-portal/license-keys/activate', {
      key, organization_id: this.organizationId, label: this.label, conditions: { tiktok },
    });
    if (res.status === 404) throw new Error('このライセンスキーは見つかりません。入力に間違いがないか確かめてください');
    if (res.status === 403) {
      throw new Error(`このキーは使えません（期限切れ・解約済み、または使える PC の数を超えています）。ほかの PC で解除してから試してください: ${res.body?.detail ?? ''}`.trim());
    }
    if (!res.ok) throw new Error(`有効にできませんでした（${res.status}）`);
    const lk = res.body.license_key ?? {};
    this.saved = {
      key, displayKey: lk.display_key ?? '', activationId: res.body.id, tiktok,
      lastValidatedAt: this.now(), expiresAt: lk.expires_at ?? null, revoked: false, offline: false,
    };
    await this.save();
  }

  /** 今のキーがまだ使えるか、Polar に確かめる */
  async check() {
    if (!this.enabled || !this.saved) return this.status();
    const s = this.saved;
    let res;
    try {
      res = await this.post('/v1/customer-portal/license-keys/validate', {
        key: s.key, organization_id: this.organizationId, activation_id: s.activationId, conditions: { tiktok: s.tiktok },
      });
    } catch {
      res = null;
    }
    if (res?.ok) {
      Object.assign(s, { lastValidatedAt: this.now(), expiresAt: res.body.expires_at ?? null, revoked: false, offline: false });
    } else if (res?.status === 404) {
      // 期限切れ・解約・無効にされた（Polar は 404 で返す）
      Object.assign(s, { revoked: true, offline: false });
    } else {
      // つながらない・Polar の障害（5xx・429 など）。猶予の 7日間は今のまま
      s.offline = true;
    }
    await this.save();
    return this.status();
  }

  /** この PC での有効化を解除する（別の PC で使うため）。Polar に届かなくても、この PC の記録は消す */
  async deactivate() {
    const s = this.saved;
    if (!s) return;
    await this.post('/v1/customer-portal/license-keys/deactivate', {
      key: s.key, organization_id: this.organizationId, activation_id: s.activationId,
    }).catch(() => null);
    this.saved = null;
    await rm(this.path, { force: true });
    this.emit('change', this.status());
  }

  async save() {
    await writeFileSafely(this.path, `${JSON.stringify(this.saved, null, 2)}\n`);
    this.emit('change', this.status());
  }

  async post(path, body) {
    const res = await this.fetchImpl(`${this.api}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text();
    let parsed = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      // 本文が JSON でなくても、status で判断する
    }
    return { ok: res.ok, status: res.status, body: parsed };
  }
}

function normalize(username) {
  return String(username ?? '').trim().replace(/^@/, '').toLowerCase();
}

function sameAccount(a, b) {
  return normalize(a) !== '' && normalize(a) === normalize(b);
}

// 妨害の設定（ルール）の変更の履歴（仕様書 4.2「設定履歴」）。保存するたびに、そのときのルールを残す。
// 一覧では、1つ前と比べて何が増えた・消えた・変わったかを出し、前の設定に戻せる（戻すのは画面で読み込むだけで、保存は配信者が押す）。
// history.json に、新しいものから MAX_ENTRIES 件残す。
import { conditionText } from './overlayData.js';

export const MAX_ENTRIES = 30;
/** 保存したきっかけ */
export const HISTORY_REASONS = { first: 'はじめの設定', edit: '保存', preset: 'プリセットを読み込んで保存', restore: '履歴から戻して保存', import: '読み込んで保存' };

export class RulesHistory {
  /**
   * @param {{entries?: object[]}} [saved] toJSON の形
   * @param {() => number} [now]
   */
  constructor(saved = {}, now = Date.now) {
    this.now = now;
    this.entries = (Array.isArray(saved?.entries) ? saved.entries : [])
      .filter((e) => e && typeof e.id === 'string' && Number.isFinite(e.time) && Array.isArray(e.rules))
      .slice(-MAX_ENTRIES);
  }

  /**
   * 保存したルールを残す。前と同じなら残さない。
   * @returns {boolean} 残したら true
   */
  record(rules, reason = 'edit') {
    const last = this.entries.at(-1);
    if (last && JSON.stringify(last.rules) === JSON.stringify(rules)) return false;
    const time = this.now();
    this.entries.push({ id: `${time.toString(36)}-${this.entries.length}`, time, reason: reason in HISTORY_REASONS ? reason : 'edit', rules });
    this.entries = this.entries.slice(-MAX_ENTRIES);
    return true;
  }

  /**
   * 新しい順。1つ前と比べた違いつき（ルールそのものは get で読む）
   * @param {(rule: object) => string} [describe] 出す妨害の文
   */
  list(describe = actionText) {
    return this.entries.map((entry, i) => ({
      id: entry.id,
      time: entry.time,
      reason: entry.reason,
      reasonText: HISTORY_REASONS[entry.reason] ?? HISTORY_REASONS.edit,
      count: entry.rules.length,
      diff: i === 0 ? null : diffRules(this.entries[i - 1].rules, entry.rules, describe),
    })).reverse();
  }

  get(id) {
    return this.entries.find((e) => e.id === id) ?? null;
  }

  toJSON() {
    return { version: 1, entries: this.entries };
  }
}

/** ルールの「きっかけ」（何が起きたら・いつ）。同じきっかけのルールどうしを比べる */
export function triggerText(rule) {
  let text;
  if (rule.gift !== undefined) text = rule.gift;
  else if (rule.giftId !== undefined) text = `ギフトID ${rule.giftId}`;
  else if (rule.minDiamonds !== undefined) text = `${rule.minDiamonds}コイン以上`;
  else if (rule.likes !== undefined) text = `いいね${rule.likes}回ごと`;
  else text = rule.event === 'follow' ? 'フォロー' : 'シェア';
  const when = conditionText(rule);
  return when ? `${text}（${when}）` : text;
}

/**
 * 2つのルールの組の違い。きっかけが同じルールは「変わった」、片方にしかないものは「増えた」「消えた」。
 * @param {(rule: object) => string} [describe] 出す妨害の文（変わったとき・増えたときに出す）
 * @returns {{added: string[], removed: string[], changed: string[]}}
 */
export function diffRules(before, after, describe = actionText) {
  const group = (rules) => {
    const map = new Map();
    for (const rule of rules) {
      const key = triggerText(rule);
      map.set(key, [...(map.get(key) ?? []), rule]);
    }
    return map;
  };
  const a = group(before);
  const b = group(after);
  const added = [];
  const removed = [];
  const changed = [];
  for (const key of new Set([...a.keys(), ...b.keys()])) {
    const olds = a.get(key) ?? [];
    const news = b.get(key) ?? [];
    // 同じきっかけのものは、並びの順に組にする。そっくり同じものは先に外す
    const restOld = olds.filter((r) => !news.some((n) => same(n, r)));
    const restNew = news.filter((r) => !olds.some((o) => same(o, r)));
    const pairs = Math.min(restOld.length, restNew.length);
    for (let i = 0; i < pairs; i++) changed.push(`${key}: ${describe(restOld[i])} → ${describe(restNew[i])}`);
    for (const r of restNew.slice(pairs)) added.push(`${key} → ${describe(r)}`);
    for (const r of restOld.slice(pairs)) removed.push(`${key} → ${describe(r)}`);
  }
  return { added, removed, changed };
}

const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);

/**
 * 出す妨害を短い文に。待ち時間・出す文・ランダムの細かい設定も入れる（そこだけ変えたときもわかるように）
 * @param {(action: {type: string, count: number, mob?: string}) => string} [name] 1つの妨害の名前と数（engine の describeAction）
 */
export function actionText(rule, name = (a) => `${a.type === 'mob' ? a.mob : a.type} ×${a.count}`) {
  const one = (r) => (r.action === 'message' ? 'メッセージ' : name({ type: r.action, count: r.count ?? 1, ...(r.action === 'mob' ? { mob: r.mob ?? 'zombie' } : {}) }))
    + (r.weight && r.weight !== 1 ? `（出やすさ${r.weight}）` : '');
  const parts = [rule.action === 'random' ? `ランダム（${rule.choices.map(one).join('・')}）` : one(rule)];
  if (rule.noRepeat) parts.push('続けて出さない');
  if (rule.cooldownSec) parts.push(`待ち${rule.cooldownSec}秒`);
  if (rule.label) parts.push(`「${rule.label}」`);
  return parts.join('・');
}

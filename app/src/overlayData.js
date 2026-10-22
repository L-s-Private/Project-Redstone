// 配信画面（オーバーレイ）に出すデータ。ギフト表（どのギフトで何が起きるか）と、ギフトランキング。
import { MAX_COUNT_BY_TYPE, RANDOM_ACTION } from './rules.js';

/** ギフト表に出す数 */
const MAX_TABLE_ROWS = 96;
/** ランキングに出す人数 */
export const RANKING_SIZE = 5;

const TRIGGER_ORDER = { gift: 0, coins: 1, likes: 2, follow: 3, share: 4 };

/**
 * ルールから、配信画面のギフト表を作る。メッセージだけのルール（感謝など）は妨害ではないので出さない。
 * 並びは、名前のギフト（安い順）→ コイン数（少ない順）→ いいね → フォロー → シェア
 * @param {object[]} rules
 * @param {(name: string) => ({nameJa: string, diamonds: number, image: string} | null)} findGift
 * @param {(action: object) => string} describe 妨害の名前と数（engine の describeAction）
 */
export function giftTable(rules, findGift, describe) {
  const rows = [];
  for (const rule of rules) {
    if (rule.action === 'message') continue;
    const choices = rule.action === RANDOM_ACTION ? rule.choices : [rule];
    const names = choices.map((choice) => {
      const action = { type: choice.action, count: Math.min(choice.count ?? 1, MAX_COUNT_BY_TYPE[choice.action] ?? Infinity) };
      if (choice.mob !== undefined) action.mob = choice.mob;
      return describe(action);
    });
    const first = choices[0];
    const random = rule.action === RANDOM_ACTION;
    // ランダムはカードに収まるよう、数を外して名前だけ並べる。条件（何ラウンド目から など）は小さすぎて読めないので出さない
    const row = {
      action: random ? names.map((name) => name.replace(/ ×?\d.*$/, '')).join('・') : names[0],
      icon: first.action === 'mob' ? (first.mob ?? 'zombie') : first.action,
    };
    if (rule.gift !== undefined) {
      const gift = findGift(rule.gift);
      Object.assign(row, { trigger: 'gift', label: gift?.nameJa ?? rule.gift, coins: gift?.diamonds ?? null, image: gift?.image ?? '' });
    } else if (rule.minDiamonds !== undefined) {
      Object.assign(row, { trigger: 'coins', label: `${rule.minDiamonds}以上`, sub: 'コイン', coins: rule.minDiamonds });
    } else if (rule.likes !== undefined) {
      Object.assign(row, { trigger: 'likes', label: `${rule.likes}回`, sub: 'いいね', count: rule.likes });
    } else if (rule.event !== undefined) {
      Object.assign(row, { trigger: rule.event, label: rule.event === 'follow' ? 'フォロー' : 'シェア' });
    } else {
      continue; // ギフトID だけのルールは名前がわからないので出さない
    }
    rows.push(row);
  }
  const value = (row) => row.coins ?? row.count ?? Infinity;
  return rows
    .map((row, i) => ({ row, i }))
    .sort((a, b) => TRIGGER_ORDER[a.row.trigger] - TRIGGER_ORDER[b.row.trigger] || value(a.row) - value(b.row) || a.i - b.i)
    .map(({ row }) => row)
    .slice(0, MAX_TABLE_ROWS);
}

/** 目標のバーに出す数（近いものから） */
export const MAX_GOALS = 3;

/**
 * いいねのルールの目標（「あと何回で何が出るか」）。配信画面の「いいねの目標」に出す。あと少しのものから
 * @param {Map<number, number>} progress ルールの番号 → たまっている回数（dispatcher の likeProgress）
 * @returns {Array<{likes: number, current: number, action: string, icon: string, condition: string}>}
 */
export function likeGoals(rules, progress, describe) {
  const goals = [];
  rules.forEach((rule, i) => {
    if (rule.likes === undefined) return;
    const choices = rule.action === RANDOM_ACTION ? rule.choices : [rule];
    const names = choices.map((choice) => {
      const action = { type: choice.action, count: Math.min(choice.count ?? 1, MAX_COUNT_BY_TYPE[choice.action] ?? Infinity) };
      if (choice.mob !== undefined) action.mob = choice.mob;
      return describe(action);
    });
    const first = choices[0];
    goals.push({
      likes: rule.likes,
      current: Math.min(rule.likes, progress.get(i) ?? 0),
      // メッセージだけのルールは、出す文を見せる
      action: rule.action === 'message' ? rule.label ?? '' : rule.action === RANDOM_ACTION ? 'ランダム（' + names.map((n) => n.replace(/ ×?\d.*$/, '')).join('・') + '）' : names[0],
      icon: rule.action === 'message' ? 'message' : first.action === 'mob' ? (first.mob ?? 'zombie') : first.action,
      condition: conditionText(rule),
    });
  });
  return goals.sort((a, b) => (a.likes - a.current) - (b.likes - b.current) || a.likes - b.likes).slice(0, MAX_GOALS);
}

/** ルールの条件を短い文にする（条件がなければ空） */
export function conditionText(rule) {
  const parts = [];
  if (rule.minRound !== undefined) parts.push(`${rule.minRound}ラウンド目から`);
  if (rule.when === 'filling') parts.push('埋め立て中');
  if (rule.when === 'countdown') parts.push('カウントダウン中');
  return parts.join('・');
}

/**
 * ギフトを送った人ごとのコインの合計。配信ごとに数える（新しい配信が始まったら0から）。
 * 配信の途中でアプリを起動し直しても続きから数えられるよう、toJSON の形で保存して戻せる
 */
export class Ranking {
  /** @param {{roomId?: string, coins?: Array<[string, number]>}} [saved] */
  constructor(saved = {}) {
    /** 数えている配信（TikTok の roomId）。わからないときは '' */
    this.roomId = typeof saved.roomId === 'string' ? saved.roomId : '';
    /** @type {Map<string, number>} */
    this.coins = new Map(
      (Array.isArray(saved.coins) ? saved.coins : []).filter(([name, coins]) => typeof name === 'string' && name && Number.isFinite(coins) && coins > 0),
    );
  }

  /** 配信につながったとき。前と違う配信なら0から数え直す。@returns 数え直したら true */
  startStream(roomId) {
    if (!roomId || roomId === this.roomId) return false;
    this.roomId = roomId;
    this.coins.clear();
    return true;
  }

  toJSON() {
    return { roomId: this.roomId, coins: [...this.coins] };
  }

  /** ギフト1回分を足す。@returns 足したら true */
  add(name, coins) {
    if (!name || !(coins > 0)) return false;
    this.coins.set(name, (this.coins.get(name) ?? 0) + coins);
    return true;
  }

  reset() {
    this.coins.clear();
  }

  /** 上位（コインの多い順。同じなら先に送った人） */
  top(size = RANKING_SIZE) {
    return [...this.coins].map(([name, coins]) => ({ name, coins })).sort((a, b) => b.coins - a.coins).slice(0, size);
  }
}

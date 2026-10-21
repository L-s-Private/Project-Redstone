import { buildAction, findRuleIndex } from './rules.js';

/**
 * イベントを受けて、ルール判定・クールダウン・一時停止を通ったものだけ MOD に送る。
 * 送り先（client）は send(action) が Promise を返すものなら何でもよい。
 */
export class Dispatcher {
  constructor({ rules, client, now = Date.now }) {
    this.rules = rules;
    this.client = client;
    this.now = now;
    this.paused = false;
    this.lastFiredAt = new Map();
    // いいねのルールごとの、たまっている回数
    this.likeProgress = new Map();
    this.stats = { received: 0, sent: 0, skipped: 0, failed: 0 };
  }

  /** ルールを入れ替える。クールダウンといいねのたまり具合も戻す。 */
  setRules(rules) {
    this.rules = rules;
    this.lastFiredAt.clear();
    this.likeProgress.clear();
  }

  /**
   * いいねを足し、回数に届いたルールの妨害を出す。
   * @returns {Promise<Array<{status: string, likes: number, action?: object, error?: string}>>} 届いたルールの分だけ
   */
  async handleLikes(event) {
    const results = [];
    // テスト送信のいいねは、本物のいいねのたまり具合に足さない
    const progress = event.test ? new Map() : this.likeProgress;
    for (const [index, rule] of this.rules.entries()) {
      if (rule.likes === undefined) continue;
      const total = (progress.get(index) ?? 0) + event.count;
      const times = Math.floor(total / rule.likes);
      progress.set(index, total % rule.likes);
      if (times === 0) continue;
      this.stats.received++;
      const likes = times * rule.likes;
      results.push({ likes, ...(await this.fire(index, { kind: 'like', count: times, likes, from: event.from })) });
    }
    return results;
  }

  /**
   * @returns {Promise<{status: 'sent' | 'no_rule' | 'paused' | 'cooldown' | 'failed', action?: object, error?: string}>}
   */
  async handle(event) {
    this.stats.received++;
    const index = findRuleIndex(this.rules, event);
    if (index === -1) {
      return this.skip('no_rule');
    }
    return this.fire(index, event);
  }

  /**
   * rules[index] の妨害を出す。action を渡したときはルールを使わずそれを送る（画面のボタンから）。
   * 一時停止中はどちらも出さない。
   */
  async fire(index, event, action) {
    if (this.paused) {
      return this.skip('paused');
    }
    if (!action) {
      const rule = this.rules[index];
      const cooldownMs = (rule.cooldownSec ?? 0) * 1000;
      const last = this.lastFiredAt.get(index);
      if (cooldownMs > 0 && last !== undefined && this.now() - last < cooldownMs) {
        return this.skip('cooldown');
      }
      this.lastFiredAt.set(index, this.now());
      action = buildAction(rule, event);
    }

    try {
      const response = await this.client.send(action);
      if (response.ok) {
        this.stats.sent++;
        return { status: 'sent', action };
      }
      this.stats.failed++;
      return { status: 'failed', action, error: response.error };
    } catch (e) {
      this.stats.failed++;
      return { status: 'failed', action, error: e.message };
    }
  }

  skip(status) {
    this.stats.skipped++;
    return { status };
  }
}

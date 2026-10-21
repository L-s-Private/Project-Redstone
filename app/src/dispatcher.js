import { buildAction, conditionHolds, findRuleIndex, pickChoice, RANDOM_ACTION } from './rules.js';

/**
 * イベントを受けて、ルール判定・クールダウン・一時停止を通ったものだけ MOD に送る。
 * 送り先（client）は send(action) が Promise を返すものなら何でもよい。
 */
export class Dispatcher {
  /**
   * game: 今の埋め立ての状況（MOD の ping の fill。始まっていなければ null）。条件のあるルールに使う
   * random: 抽選に使う（0以上1未満）
   */
  constructor({ rules, client, now = Date.now, game = () => null, random = Math.random }) {
    this.rules = rules;
    this.client = client;
    this.now = now;
    this.game = game;
    this.random = random;
    // 抽選するルールごとの、前に出した候補（同じものを続けないため）
    this.lastChoice = new Map();
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
    this.lastChoice.clear();
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
      // 条件に合わないときにたまった分は、出さずに捨てる（条件に合ったときにまとめて出ないように）
      if (times === 0 || !conditionHolds(rule, this.game())) continue;
      this.stats.received++;
      const likes = times * rule.likes;
      results.push({ likes, ...(await this.fire(index, { kind: 'like', count: times, likes, from: event.from, test: event.test })) });
    }
    return results;
  }

  /**
   * @returns {Promise<{status: 'sent' | 'no_rule' | 'paused' | 'cooldown' | 'failed', action?: object, error?: string}>}
   */
  async handle(event) {
    this.stats.received++;
    const index = findRuleIndex(this.rules, event, this.game());
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
    let random = false;
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
      if (rule.action === RANDOM_ACTION) {
        const choice = pickChoice(rule, this.lastChoice.get(index), this.random);
        if (!event.test) this.lastChoice.set(index, choice);
        action = buildAction(rule, event, rule.choices[choice]);
        random = true;
      } else {
        action = buildAction(rule, event);
      }
    }

    try {
      const response = await this.client.send(action);
      if (response.ok) {
        this.stats.sent++;
        return { status: 'sent', action, ...(random && { random }) };
      }
      this.stats.failed++;
      return { status: 'failed', action, ...(random && { random }), error: response.error };
    } catch (e) {
      this.stats.failed++;
      return { status: 'failed', action, ...(random && { random }), error: e.message };
    }
  }

  skip(status) {
    this.stats.skipped++;
    return { status };
  }
}

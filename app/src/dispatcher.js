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
    this.stats = { received: 0, sent: 0, skipped: 0, failed: 0 };
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
    if (this.paused) {
      return this.skip('paused');
    }
    const rule = this.rules[index];
    const cooldownMs = (rule.cooldownSec ?? 0) * 1000;
    const last = this.lastFiredAt.get(index);
    if (cooldownMs > 0 && last !== undefined && this.now() - last < cooldownMs) {
      return this.skip('cooldown');
    }
    this.lastFiredAt.set(index, this.now());

    const action = buildAction(rule, event);
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

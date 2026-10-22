import { buildAction, COMMENT_VIEWER_COOLDOWN_SEC, conditionHolds, findRuleIndex, pickChoice, RANDOM_ACTION } from './rules.js';
import { modeProblem, TERRAIN_SAFE_ACTIONS } from './mining.js';

/**
 * イベントを受けて、ルール判定・クールダウン・一時停止を通ったものだけ MOD に送る。
 * 送り先（client）は send(action) が Promise を返すものなら何でもよい。
 */
export class Dispatcher {
  /**
   * game: 今の埋め立ての状況（MOD の ping の fill。始まっていなければ null）。条件のあるルールに使う
   * random: 抽選に使う（0以上1未満）
   * mode: 今のゲームモード（mining.js の currentMode）。そのモードで出せない妨害は出さない
   */
  constructor({ rules, client, now = Date.now, game = () => null, random = Math.random, mode = () => ({ mode: 'fill', running: false, paused: false }) }) {
    this.rules = rules;
    this.client = client;
    this.now = now;
    this.game = game;
    this.mode = mode;
    this.random = random;
    // 抽選するルールごとの、前に出した候補（同じものを続けないため）
    this.lastChoice = new Map();
    this.paused = false;
    this.lastFiredAt = new Map();
    // いいねのルールごとの、たまっている回数
    this.likeProgress = new Map();
    // コメントのルールを、同じ人が最後に出した時刻（「ルールの番号:人」→ 時刻）
    this.commentLast = new Map();
    this.stats = { received: 0, sent: 0, skipped: 0, failed: 0 };
  }

  /** ルールを入れ替える。クールダウンといいねのたまり具合も戻す。 */
  setRules(rules) {
    this.rules = rules;
    this.lastFiredAt.clear();
    this.likeProgress.clear();
    this.lastChoice.clear();
    this.commentLast.clear();
  }

  /**
   * コメントを妨害につなげるか。言葉が合うルールがなく、同じ人が少し前に同じルールを出していれば false（ログにも出さない）。
   * コメントはとても多いので、関係ないものは数えもしない。テスト送信は待たせない
   */
  takeComment(event) {
    const index = findRuleIndex(this.rules, event, this.game());
    if (index === -1) return false;
    if (event.test) return true;
    const key = index + ':' + (event.user || event.from);
    const now = this.now();
    const last = this.commentLast.get(key);
    if (last !== undefined && now - last < COMMENT_VIEWER_COOLDOWN_SEC * 1000) return false;
    this.commentLast.set(key, now);
    // 長い配信でたまりすぎないよう、古いものを捨てる
    if (this.commentLast.size > 5000) {
      for (const [k, t] of this.commentLast) if (now - t >= COMMENT_VIEWER_COOLDOWN_SEC * 1000) this.commentLast.delete(k);
    }
    return true;
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
   * @returns {Promise<{status: 'sent' | 'no_rule' | 'paused' | 'cooldown' | 'challenge_paused' | 'mode_incompatible' | 'no_active_mode' | 'failed', action?: object, error?: string}>}
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
   * 一時停止中はどちらも出さない。採掘チャレンジの一時停止中は、ルールの妨害を出さない（あとからまとめても出さない）。
   * 今のゲームモードで出せない妨害（埋め立て専用など）は、どちらも出さない。
   */
  async fire(index, event, action) {
    let random = false;
    if (this.paused) {
      return this.skip('paused');
    }
    const mode = this.mode();
    if (!action) {
      if (mode.paused) {
        return this.skip('challenge_paused');
      }
      const rule = this.rules[index];
      const cooldownMs = (rule.cooldownSec ?? 0) * 1000;
      const last = this.lastFiredAt.get(index);
      if (cooldownMs > 0 && last !== undefined && this.now() - last < cooldownMs) {
        return this.skip('cooldown');
      }
      let choice;
      if (rule.action === RANDOM_ACTION) {
        choice = pickChoice(rule, this.lastChoice.get(index), this.random);
        action = buildAction(rule, event, rule.choices[choice]);
        random = true;
      } else {
        action = buildAction(rule, event);
      }
      // 出せないものは、クールダウンも始めない（次に届いたときに出せるように）
      const problem = modeProblem(action.type, mode);
      if (problem) return { ...this.skip(problem), action, ...(random && { random }) };
      this.lastFiredAt.set(index, this.now());
      if (random && !event.test) this.lastChoice.set(index, choice);
    } else {
      const problem = modeProblem(action.type, mode);
      if (problem) return { ...this.skip(problem), action };
    }
    // 採掘チャレンジでは、TNT とクリーパーの爆発で地形を壊さない
    if (mode.mode === 'mining_challenge' && TERRAIN_SAFE_ACTIONS.includes(action.type)) {
      action = { ...action, terrain: false };
    }

    try {
      const response = await this.client.send(action);
      if (response.ok) {
        this.stats.sent++;
        // rule: どのルールで出したか（画面のボタンなら無し）。配信画面の演出に使う
        return { status: 'sent', action, ...(random && { random }), ...(index >= 0 && { rule: index }) };
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

import { EventEmitter } from 'node:events';
import { Dispatcher } from './dispatcher.js';
import { ModClient } from './modClient.js';
import { describeEvent } from './rules.js';
import { TikTokSource } from './tiktok.js';

const MAX_LOGS = 200;

const SKIP_MESSAGES = {
  no_rule: '対応する妨害がないので無視しました',
  paused: '一時停止中なので出しませんでした',
  cooldown: 'クールダウン中なので出しませんでした',
};

const ACTION_NAMES = {
  tnt: 'TNT',
  message: 'メッセージ',
  fill_expand: '枠を広げる',
  fill_shrink: '枠を縮める',
  fill_help: 'お助けブロック',
};

// 回数を見せない妨害
const SINGLE_ACTIONS = new Set(['message']);
const MAX_RECENT_GIFTS = 20;

/** ルールから、テスト送信のボタンを作る */
export function testButtons(rules) {
  const buttons = new Map();
  for (const rule of rules) {
    if (rule.gift !== undefined) {
      buttons.set(String(rule.gift), { kind: 'gift', giftName: String(rule.gift), count: 1 });
    } else if (rule.likes !== undefined) {
      buttons.set(`いいね${rule.likes}`, { kind: 'like', count: rule.likes });
    } else if (rule.minDiamonds !== undefined) {
      buttons.set(`💎${rule.minDiamonds}`, { kind: 'gift', giftName: `${rule.minDiamonds}ダイヤのギフト`, diamonds: rule.minDiamonds, count: 1 });
    } else if (rule.event !== undefined) {
      buttons.set(rule.event === 'follow' ? 'フォロー' : 'シェア', { kind: rule.event });
    }
  }
  return [...buttons].map(([label, body]) => ({ label, body }));
}

const MOB_NAMES = {
  zombie: 'ゾンビ',
  skeleton: 'スケルトン',
  creeper: 'クリーパー',
  spider: 'クモ',
  witch: 'ウィッチ',
  silverfish: 'シルバーフィッシュ',
  pig: 'ブタ',
};

export function describeAction(action) {
  const name = action.type === 'mob' ? MOB_NAMES[action.mob ?? 'zombie'] : ACTION_NAMES[action.type];
  return SINGLE_ACTIONS.has(action.type) ? name : `${name} ×${action.count}`;
}

/**
 * アプリの中核。TikTok・MOD・ルール判定をつなぎ、状態とログを外（CLI や画面）に知らせる。
 *
 * イベント:
 *   'log'   {time, level, text}   level = info | ok | warn | error | gift
 *   'state' Engine#state と同じ形
 *   'alert' {who, action}  妨害を出したとき（オーバーレイ用）
 */
export class Engine extends EventEmitter {
  constructor({ config, client, tiktok, now = Date.now }) {
    super();
    this.config = config;
    this.now = now;
    this.client = client ?? new ModClient(config.mod);
    this.tiktok = tiktok ?? new TikTokSource();
    this.dispatcher = new Dispatcher({ rules: config.rules, client: this.client, now });
    this.logs = [];
    this.mock = false;
    // 実際に届いたギフト（設定画面で「最近届いたギフト」として出す）
    this.recentGifts = [];

    // 埋め立ての進み具合でも status は届くので、接続の変化だけログに出す
    let previous = { connected: false, players: null };
    this.client.on('status', ({ connected, players }) => {
      if (connected !== previous.connected || players !== previous.players) {
        if (!connected) {
          this.log('warn', 'マイクラ（MOD）との接続が切れました。つなぎ直します…');
        } else if (players === 0) {
          this.log('warn', 'マイクラにつながりましたが、ワールドに入っていません');
        } else if (players !== null) {
          this.log('ok', 'マイクラ（MOD）につながりました。妨害を受け付けています');
        }
        previous = { connected, players };
      }
      this.emitState();
    });
    this.tiktok.on('status', () => this.emitState());
    this.tiktok.on('log', ({ level, text }) => this.log(level, text));
    this.tiktok.on('event', (event) => {
      if (event.kind === 'gift') this.rememberGift(event);
      this.handleEvent(event);
    });
  }

  get state() {
    return {
      mock: this.mock,
      paused: this.dispatcher.paused,
      tiktok: this.tiktok.status,
      tiktokUsername: this.config.tiktokUsername,
      mod: this.client.status,
      fill: this.client.status.fill ?? null,
      stats: { ...this.dispatcher.stats },
      rules: this.config.rules,
      testButtons: testButtons(this.config.rules),
      recentGifts: this.recentGifts,
    };
  }

  /** ルールを入れ替える（設定画面から）。クールダウンもリセットする。 */
  setRules(rules) {
    this.config.rules = rules;
    this.dispatcher.setRules(rules);
    this.log('ok', `妨害の設定を保存しました（ルール ${rules.length}件）`);
    this.emitState();
  }

  rememberGift({ giftName, diamonds }) {
    if (!giftName) return;
    this.recentGifts = [{ giftName, diamonds }, ...this.recentGifts.filter((g) => g.giftName !== giftName)].slice(0, MAX_RECENT_GIFTS);
  }

  start({ mock = false } = {}) {
    this.mock = mock;
    this.log('info', `マイクラ（MOD）を待っています: ${this.config.mod.host}:${this.config.mod.port}（ワールドを開くとつながります）`);
    this.client.start();
    if (mock) {
      this.log('info', 'モックモードです。TikTokにはつながず、テスト送信でギフトを試せます');
    } else if (this.config.tiktokUsername) {
      this.connectTikTok();
    } else {
      this.log('warn', 'TikTok ID が設定されていません');
    }
    this.emitState();
  }

  async setTikTokUsername(username) {
    this.config.tiktokUsername = String(username ?? '').trim().replace(/^@/, '');
    this.emitState();
    if (this.mock) return;
    if (this.config.tiktokUsername) {
      await this.connectTikTok();
    } else {
      await this.tiktok.stop();
    }
  }

  async connectTikTok() {
    try {
      await this.tiktok.start(this.config.tiktokUsername);
    } catch (e) {
      this.log('error', `TikTokへの接続を始められませんでした: ${e.message}`);
    }
  }

  /** 埋め立てを始める。枠はマイクラのプレイヤーの足元に作られる */
  async startFill({ width, height, countdown }) {
    const response = await this.client.send({ type: 'fill_start', width, height, countdown });
    if (!response.ok) throw new Error(response.error);
    this.log('ok', `埋め立てを始めました（幅${width}・高さ${height}・完成後${countdown}秒でクリア）`);
  }

  /** 配信者が画面のボタンで出す妨害（埋め立ての操作など）。ルールを通さない */
  async manualAction(action) {
    const result = await this.dispatcher.fire(-1, { kind: 'manual', from: '' }, action);
    this.logResult({ kind: 'manual', from: '' }, result);
    this.emitState();
    return result;
  }

  async stopFill() {
    const response = await this.client.send({ type: 'fill_stop' });
    if (!response.ok) throw new Error(response.error);
    this.log('info', '埋め立てを終えました');
  }

  async handleEvent(event) {
    if (event.kind === 'like') return this.handleLikes(event);
    this.log('gift', describeEvent(event));
    const result = await this.dispatcher.handle(event);
    this.logResult(event, result);
    this.emitState();
    return result;
  }

  logResult(event, result) {
    if (result.status === 'sent') {
      this.log('ok', `  → ${describeAction(result.action)} を出しました`);
      // オーバーレイに出す「誰が」
      const who = event.kind === 'like' ? `いいね${result.likes}回` : event.kind === 'manual' ? '配信者' : `${event.from || '誰か'}さん`;
      this.emit('alert', { who, action: describeAction(result.action) });
    } else if (result.status === 'failed') {
      this.log('error', `  → 出せませんでした: ${result.error}`);
    } else {
      this.log('info', `  → ${SKIP_MESSAGES[result.status]}`);
    }
  }

  /** いいねは数が多いので、回数に届いたときだけログに出す */
  async handleLikes(event) {
    const results = await this.dispatcher.handleLikes(event);
    for (const result of results) {
      this.log('gift', `いいね ${result.likes}回`);
      this.logResult(event, result);
    }
    if (results.length) this.emitState();
    return results;
  }

  pause() {
    this.dispatcher.paused = true;
    this.log('warn', '一時停止しました');
    this.emitState();
  }

  resume() {
    this.dispatcher.paused = false;
    this.log('ok', '再開しました');
    this.emitState();
  }

  /** 全妨害ストップ: 待ち行列の妨害を取り消して一時停止する。 */
  stopAll() {
    this.dispatcher.paused = true;
    const cleared = this.client.clear();
    this.log('warn', `全妨害ストップ: 待ち行列の ${cleared}件を取り消し、一時停止しました`);
    this.emitState();
    return cleared;
  }

  async shutdown() {
    this.client.stop();
    await this.tiktok.stop();
  }

  log(level, text) {
    const entry = { time: this.now(), level, text };
    this.logs.push(entry);
    if (this.logs.length > MAX_LOGS) this.logs.shift();
    this.emit('log', entry);
  }

  emitState() {
    this.emit('state', this.state);
  }
}

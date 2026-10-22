import { EventEmitter } from 'node:events';
import { normalizeComment, normalizeGift, normalizeLike, normalizeSocial } from './gifts.js';

const RETRY_OFFLINE_MS = 30000;
const RETRY_DISCONNECTED_MS = 5000;

async function defaultCreateConnection(username) {
  // モックモードではネットにつながなくて済むよう、使うときに初めて読み込む
  const lib = await import('tiktok-live-connector');
  return { lib, connection: new lib.TikTokLiveConnection(username, {}) };
}

/**
 * TikTok LIVE への接続。配信前なら始まるまで待ち、切れたらつなぎ直す。
 * start() を呼び直すと、前の接続を切ってから新しいIDでつなぐ。
 *
 * イベント:
 *   'event'  ギフト・フォロー・シェア（gifts.js の形）
 *   'status' {state, username}  state = idle | connecting | waiting | connected | retrying
 *   'log'    {level, text}
 */
export class TikTokSource extends EventEmitter {
  constructor({ createConnection = defaultCreateConnection, retryOfflineMs = RETRY_OFFLINE_MS, retryDisconnectedMs = RETRY_DISCONNECTED_MS } = {}) {
    super();
    this.createConnection = createConnection;
    this.retryOfflineMs = retryOfflineMs;
    this.retryDisconnectedMs = retryDisconnectedMs;
    this.status = { state: 'idle', username: '' };
    this.generation = 0;
    this.connection = null;
    this.retryTimer = null;
  }

  async start(username) {
    await this.stop();
    const generation = ++this.generation;
    const isCurrent = () => generation === this.generation;
    this.setStatus('connecting', username);

    const { lib, connection } = await this.createConnection(username);
    if (!isCurrent()) {
      connection.disconnect?.().catch(() => {});
      return;
    }
    this.connection = connection;
    const { WebcastEvent, ControlEvent, UserOfflineError } = lib;

    connection.on(WebcastEvent.GIFT, (msg) => {
      const event = normalizeGift(msg);
      if (event && isCurrent()) this.emit('event', event);
    });
    connection.on(WebcastEvent.FOLLOW, (msg) => isCurrent() && this.emit('event', normalizeSocial('follow', msg)));
    connection.on(WebcastEvent.SHARE, (msg) => isCurrent() && this.emit('event', normalizeSocial('share', msg)));
    connection.on(WebcastEvent.LIKE, (msg) => isCurrent() && this.emit('event', normalizeLike(msg)));
    connection.on(WebcastEvent.CHAT, (msg) => isCurrent() && this.emit('event', normalizeComment(msg)));
    connection.on(WebcastEvent.STREAM_END, () => isCurrent() && this.log('info', '配信が終了しました'));
    connection.on(ControlEvent.DISCONNECTED, () => {
      if (!isCurrent() || this.status.state !== 'connected') return;
      this.setStatus('retrying', username);
      this.log('warn', 'TikTokとの接続が切れました。つなぎ直します…');
      this.retry(this.retryDisconnectedMs, connect);
    });

    const connect = async () => {
      if (!isCurrent()) return;
      // 配信待ちの間の再確認では表示を変えない（30秒ごとに点滅させない）
      const wasWaiting = this.status.state === 'waiting';
      if (!wasWaiting) this.setStatus('connecting', username);
      try {
        const state = await connection.connect();
        if (!isCurrent()) return;
        this.setStatus('connected', username);
        // どの配信か（配信ごとに変わる番号）。ランキングを配信ごとに数えるのに使う
        const roomId = String(state?.roomId ?? connection.roomId ?? '');
        if (roomId) this.emit('live', { roomId });
        this.log('ok', `TikTok LIVE（@${username}）につながりました`);
      } catch (e) {
        if (!isCurrent()) return;
        if (e instanceof UserOfflineError) {
          if (wasWaiting) {
            this.retry(this.retryOfflineMs, connect);
            return;
          }
          this.setStatus('waiting', username);
          this.log('info', `@${username} はまだ配信していません。${this.retryOfflineMs / 1000}秒ごとに確認します`);
          this.retry(this.retryOfflineMs, connect);
        } else {
          this.setStatus('retrying', username);
          this.log('warn', `TikTokにつながりませんでした: ${e.message}。${this.retryDisconnectedMs / 1000}秒後にやり直します`);
          this.retry(this.retryDisconnectedMs, connect);
        }
      }
    };

    await connect();
  }

  async stop() {
    this.generation++;
    clearTimeout(this.retryTimer);
    const connection = this.connection;
    this.connection = null;
    if (this.status.state !== 'idle') this.setStatus('idle', this.status.username);
    try {
      await connection?.disconnect();
    } catch {
      // 止めるときなので無視する
    }
  }

  retry(delayMs, fn) {
    clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(fn, delayMs);
  }

  setStatus(state, username) {
    if (this.status.state === state && this.status.username === username) return;
    this.status = { state, username };
    this.emit('status', this.status);
  }

  log(level, text) {
    this.emit('log', { level, text });
  }
}

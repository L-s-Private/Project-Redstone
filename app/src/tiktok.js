import { normalizeGift, normalizeSocial } from './gifts.js';

const RETRY_OFFLINE_MS = 30000;
const RETRY_DISCONNECTED_MS = 5000;

/**
 * TikTok LIVE に接続し、ギフト・フォロー・シェアを onEvent に渡す。
 * 配信前なら始まるまで待ち、切れたらつなぎ直す。
 */
export async function startTikTok({ username, onEvent, log }) {
  // モックモードではネットにつながなくて済むよう、ここで初めて読み込む
  const { TikTokLiveConnection, WebcastEvent, ControlEvent, UserOfflineError } = await import('tiktok-live-connector');
  const connection = new TikTokLiveConnection(username, {});
  let stopped = false;
  let retryTimer;

  connection.on(WebcastEvent.GIFT, (msg) => {
    const event = normalizeGift(msg);
    if (event) onEvent(event);
  });
  connection.on(WebcastEvent.FOLLOW, (msg) => onEvent(normalizeSocial('follow', msg)));
  connection.on(WebcastEvent.SHARE, (msg) => onEvent(normalizeSocial('share', msg)));
  connection.on(ControlEvent.DISCONNECTED, () => {
    if (stopped) return;
    log.warn('TikTokとの接続が切れました。つなぎ直します…');
    scheduleConnect(RETRY_DISCONNECTED_MS);
  });
  connection.on(WebcastEvent.STREAM_END, () => {
    log.info('配信が終了しました');
  });

  function scheduleConnect(delayMs) {
    clearTimeout(retryTimer);
    retryTimer = setTimeout(connect, delayMs);
  }

  async function connect() {
    if (stopped) return;
    try {
      const state = await connection.connect();
      log.ok(`TikTok LIVE（@${username}）につながりました${state?.roomId ? `（ルーム ${state.roomId}）` : ''}`);
    } catch (e) {
      if (e instanceof UserOfflineError) {
        log.info(`@${username} はまだ配信していません。${RETRY_OFFLINE_MS / 1000}秒後にもう一度確認します`);
        scheduleConnect(RETRY_OFFLINE_MS);
      } else {
        log.warn(`TikTokにつながりませんでした: ${e.message}。${RETRY_DISCONNECTED_MS / 1000}秒後にやり直します`);
        scheduleConnect(RETRY_DISCONNECTED_MS);
      }
    }
  }

  await connect();

  return {
    async stop() {
      stopped = true;
      clearTimeout(retryTimer);
      try {
        await connection.disconnect();
      } catch {
        // 終了時なので無視する
      }
    },
  };
}

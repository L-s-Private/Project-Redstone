// 配信ごとの分析（仕様書 4.2「運用分析」）。届いたギフト・いいね・フォロー・シェア、出した妨害と失敗の理由、
// 分ごとの流れ（コイン・いいね・妨害・埋め立ての進み具合）を数える。
// 本物のイベントだけを数える（テスト送信は数えない）。直近30日分を analytics.json に残す。
// 配信の区切りは TikTok の roomId（ランキングと同じ）。roomId がわからないときは、30分あいたら別の配信にする。

export const KEEP_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
export const BUCKET_MS = 60 * 1000;
/** 1つの配信で数える時間の上限（分）。これより長い分は最後の分に足す */
const MAX_BUCKETS = 12 * 60;
/** roomId がわからないとき、これだけあいたら別の配信にする */
const UNKNOWN_ROOM_GAP_MS = 30 * 60 * 1000;
/** 埋め立ての進み具合は、配信中（最後のイベントからこれ以内）だけ記録する */
const ACTIVE_MS = 10 * 60 * 1000;
/** ファイルが大きくなりすぎないよう、残す数の上限 */
const MAX_STREAMS = 200;
const MAX_SUPPORTERS = 100;
const MAX_GIFT_KINDS = 100;
const MAX_FAILURE_KINDS = 20;

const emptyActions = () => ({ sent: 0, failed: 0, cooldown: 0, paused: 0, no_rule: 0, challenge_paused: 0, mode_incompatible: 0, no_active_mode: 0 });
/** 出さなかった理由（前の版で保存した記録には無い理由もあるので、無ければ0から数える） */
const SKIP_STATUSES = Object.keys(emptyActions()).filter((key) => key !== 'sent' && key !== 'failed');

export class Analytics {
  /**
   * @param {{streams?: object[]}} [saved] toJSON の形
   * @param {() => number} [now]
   */
  constructor(saved = {}, now = Date.now) {
    this.now = now;
    this.streams = (Array.isArray(saved?.streams) ? saved.streams : []).filter(isStream);
    this.prune();
  }

  get current() {
    return this.streams.at(-1) ?? null;
  }

  /** TikTok の配信につながったとき。前と違う配信なら新しく数え始める。@returns 新しく始めたら true */
  startStream(roomId) {
    const current = this.current;
    if (current && current.roomId === roomId) return false;
    // roomId がわかる前に数えた分（同じ配信のはず）は、その配信のものにする
    if (current && current.roomId === '' && this.now() - current.endedAt < UNKNOWN_ROOM_GAP_MS) {
      current.roomId = roomId;
      return false;
    }
    this.streams.push(newStream(roomId, this.now()));
    this.prune();
    return true;
  }

  /** イベントを数える配信。なければ（roomId がわからないまま届いたら）作る */
  streamForEvent() {
    const current = this.current;
    const time = this.now();
    if (current && (current.roomId !== '' || time - current.endedAt < UNKNOWN_ROOM_GAP_MS)) return current;
    this.streams.push(newStream('', time));
    this.prune();
    return this.current;
  }

  /** 届いた本物のイベント（gift / like / follow / share） */
  recordEvent(event) {
    if (event.test) return false;
    const stream = this.streamForEvent();
    const bucket = this.bucket(stream);
    if (event.kind === 'gift') {
      const count = event.count ?? 1;
      const coins = (event.diamonds ?? 0) * count;
      stream.gifts += count;
      stream.coins += coins;
      bucket.coins += coins;
      const name = event.giftNameJa || event.giftName || `#${event.giftId}`;
      const gift = stream.giftsByName[name] ?? { count: 0, coins: 0, image: event.image ?? '' };
      gift.count += count;
      gift.coins += coins;
      stream.giftsByName[name] = gift;
      stream.giftsByName = keepTop(stream.giftsByName, MAX_GIFT_KINDS, (g) => g.coins);
      if (event.from && coins > 0) {
        stream.supporters[event.from] = (stream.supporters[event.from] ?? 0) + coins;
        stream.supporters = keepTop(stream.supporters, MAX_SUPPORTERS, (c) => c);
      }
    } else if (event.kind === 'like') {
      stream.likes += event.count ?? 1;
      bucket.likes += event.count ?? 1;
    } else if (event.kind === 'follow') {
      stream.follows++;
    } else if (event.kind === 'share') {
      stream.shares++;
    } else {
      return false;
    }
    stream.endedAt = this.now();
    return true;
  }

  /**
   * 本物のイベントで妨害を出した結果（dispatcher の result）
   * @param {{status: string, action?: {type: string, mob?: string}, error?: string}} result
   */
  recordResult(event, result) {
    if (event.test || !result || this.current === null) return false;
    const stream = this.current;
    if (result.status === 'sent') {
      stream.actions.sent++;
      this.bucket(stream).actions++;
      const key = result.action.type === 'mob' ? `mob:${result.action.mob ?? 'zombie'}` : result.action.type;
      stream.byAction[key] = (stream.byAction[key] ?? 0) + 1;
    } else if (result.status === 'failed') {
      stream.actions.failed++;
      const reason = String(result.error ?? '').slice(0, 120) || '理由不明';
      stream.failures[reason] = (stream.failures[reason] ?? 0) + 1;
      stream.failures = keepTop(stream.failures, MAX_FAILURE_KINDS, (n) => n);
    } else if (SKIP_STATUSES.includes(result.status)) {
      stream.actions[result.status] = (stream.actions[result.status] ?? 0) + 1;
    } else {
      return false;
    }
    stream.endedAt = this.now();
    return true;
  }

  /** 埋め立ての進み具合（MOD の ping の fill）。配信中だけ記録する */
  recordGame(fill) {
    const stream = this.current;
    if (!fill || !stream || this.now() - stream.endedAt > ACTIVE_MS) return false;
    const bucket = this.bucket(stream);
    const before = JSON.stringify([bucket.fill, bucket.round, stream.rounds]);
    if (Number.isFinite(fill.percent)) bucket.fill = fill.percent;
    if (Number.isFinite(fill.round)) {
      bucket.round = fill.round;
      stream.rounds = Math.max(stream.rounds, fill.round);
    }
    return JSON.stringify([bucket.fill, bucket.round, stream.rounds]) !== before;
  }

  /** 今の分の記録（なければ作る） */
  bucket(stream) {
    const minute = Math.min(MAX_BUCKETS - 1, Math.max(0, Math.floor((this.now() - stream.startedAt) / BUCKET_MS)));
    let bucket = stream.timeline.at(-1);
    if (!bucket || bucket.m !== minute) {
      bucket = { m: minute, coins: 0, likes: 0, actions: 0 };
      stream.timeline.push(bucket);
    }
    return bucket;
  }

  /** 30日より前の配信を消す */
  prune() {
    const limit = this.now() - KEEP_DAYS * DAY_MS;
    this.streams = this.streams.filter((s) => s.endedAt >= limit).slice(-MAX_STREAMS);
  }

  /** 配信の一覧（新しい順・まとめの数だけ） */
  list() {
    this.prune();
    return this.streams.map(summary).reverse();
  }

  /** 1つの配信のくわしい中身 */
  get(id) {
    const stream = this.streams.find((s) => s.id === id);
    if (!stream) return null;
    const top = (obj, n, value) => Object.entries(obj).sort((a, b) => value(b[1]) - value(a[1])).slice(0, n);
    return {
      ...summary(stream),
      timeline: stream.timeline,
      topGifts: top(stream.giftsByName, 10, (g) => g.coins).map(([name, g]) => ({ name, ...g })),
      supporters: top(stream.supporters, 10, (c) => c).map(([name, coins]) => ({ name, coins })),
      byAction: top(stream.byAction, 20, (n) => n).map(([key, count]) => ({ key, count })),
      failures: top(stream.failures, 10, (n) => n).map(([reason, count]) => ({ reason, count })),
    };
  }

  toJSON() {
    return { version: 1, streams: this.streams };
  }
}

function newStream(roomId, time) {
  return {
    id: `${time.toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    roomId, startedAt: time, endedAt: time,
    gifts: 0, coins: 0, likes: 0, follows: 0, shares: 0, rounds: 0,
    actions: emptyActions(), byAction: {}, failures: {}, giftsByName: {}, supporters: {}, timeline: [],
  };
}

function summary(stream) {
  const { id, startedAt, endedAt, gifts, coins, likes, follows, shares, rounds, actions } = stream;
  const tried = actions.sent + actions.failed;
  return {
    id, startedAt, endedAt, gifts, coins, likes, follows, shares, rounds,
    actions: { ...actions },
    supporterCount: Object.keys(stream.supporters).length,
    // 出そうとした妨害のうち、失敗した割合（%）
    failureRate: tried > 0 ? Math.round((actions.failed / tried) * 1000) / 10 : 0,
  };
}

/** 値の大きいものだけ max 個残す */
function keepTop(obj, max, value) {
  const entries = Object.entries(obj);
  if (entries.length <= max) return obj;
  return Object.fromEntries(entries.sort((a, b) => value(b[1]) - value(a[1])).slice(0, max));
}

function isStream(s) {
  return s && typeof s.id === 'string' && Number.isFinite(s.startedAt) && Number.isFinite(s.endedAt) && Array.isArray(s.timeline)
    && s.actions && typeof s.giftsByName === 'object' && typeof s.supporters === 'object';
}

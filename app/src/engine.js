import { EventEmitter } from 'node:events';
import { Dispatcher } from './dispatcher.js';
import { ModClient } from './modClient.js';
import { DEFAULT_OVERLAY_STYLE, parseFill, parseOverlayStyle, parseWorld, parsePreset } from './config.js';
import { BUILTIN_PRESETS, MAX_PRESET_NAME } from './presets.js';
import { checkFeature, checkPresetSave, checkAdvancedRules, checkRules, CURRENT_PLAN, planOf } from './plan.js';
import { describeEvent } from './rules.js';
import { giftTable, Ranking } from './overlayData.js';
import { Analytics } from './analytics.js';
import { actionText, RulesHistory } from './history.js';
import { TikTokSource } from './tiktok.js';

const MAX_LOGS = 200;
/** ランキングは、変わってからこれだけ待ってまとめて保存する（ギフトが続いても書きすぎないように） */
const RANKING_SAVE_DELAY_MS = 1000;
/** 分析は数が多いので、まとめて保存する */
const ANALYTICS_SAVE_DELAY_MS = 5000;
/** 無料版で見られる、妨害の設定の履歴の数 */
const FREE_HISTORY_ENTRIES = 3;

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
  fill_set: 'テスト: 一気に埋める',
  jail: '逮捕',
  freeze: '操作禁止',
  fill_layer: '一段埋め',
  fill_clear: '全消し',
  lightning: '雷',
  levitate: '浮遊',
  night: '夜にする',
  fill_raise: '枠を高くする',
};

// 回数を見せない妨害
const SINGLE_ACTIONS = new Set(['message', 'fill_clear']);
// 数が秒の妨害
const SECONDS_ACTIONS = new Set(['jail', 'freeze', 'levitate', 'night']);
const MAX_RECENT_GIFTS = 20;
const PLACE_SPEED_NAMES = { normal: 'ふつう', fast: '速い', fastest: 'とても速い' };
const BREAK_SPEED_NAMES = { normal: 'ふつう', fast: '速い', fastest: 'とても速い' };

/** ルールから、テスト送信のボタンを作る */
export function testButtons(rules) {
  const buttons = new Map();
  for (const rule of rules) {
    if (rule.gift !== undefined) {
      buttons.set(String(rule.gift), { kind: 'gift', giftName: String(rule.gift), count: 1 });
    } else if (rule.likes !== undefined) {
      buttons.set(`いいね${rule.likes}`, { kind: 'like', count: rule.likes });
    } else if (rule.minDiamonds !== undefined) {
      buttons.set(`🪙${rule.minDiamonds}`, { kind: 'gift', giftName: `${rule.minDiamonds}コインのギフト`, diamonds: rule.minDiamonds, count: 1 });
    } else if (rule.event !== undefined) {
      buttons.set(rule.event === 'follow' ? 'フォロー' : 'シェア', { kind: rule.event });
    }
  }
  return [...buttons].map(([label, body]) => ({ label, body }));
}

/** 設定ファイル（書き出し・読み込み）の形。中身を変えたら SETTINGS_VERSION を上げる */
export const SETTINGS_FORMAT = 'project-redstone-settings';
export const SETTINGS_VERSION = 1;

/** 同じ名前があれば「名前 (2)」のようにする（名前の長さの上限に収める） */
function uniqueName(name, taken) {
  if (!taken.includes(name)) return name;
  for (let n = 2; ; n++) {
    const suffix = ` (${n})`;
    const candidate = name.slice(0, MAX_PRESET_NAME - suffix.length) + suffix;
    if (!taken.includes(candidate)) return candidate;
  }
}

/** テスト送信のログには印を付けて、本物の視聴者からのものと見分けられるようにする */
function testMark(event) {
  return event.test ? '（テスト）' : '';
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
  if (action.type === 'fill_set') return action.percent === 0 ? 'テスト: 枠の中を空にする' : `テスト: ${action.percent}% まで埋める`;
  const name = action.type === 'mob' ? MOB_NAMES[action.mob ?? 'zombie'] : ACTION_NAMES[action.type];
  if (SINGLE_ACTIONS.has(action.type)) return name;
  if (SECONDS_ACTIONS.has(action.type)) return `${name} ${action.count}秒`;
  if (action.type === 'fill_layer' || action.type === 'fill_raise') return `${name} ×${action.count}段`;
  return `${name} ×${action.count}`;
}

/**
 * アプリの中核。TikTok・MOD・ルール判定をつなぎ、状態とログを外（CLI や画面）に知らせる。
 *
 * イベント:
 *   'log'   {time, level, text}   level = info | ok | warn | error | gift
 *   'state' Engine#state と同じ形
 *   'alert' {who, action, icon, giftImage, giftName, count}  妨害を出したとき（オーバーレイ用）。icon はマイクラのアイコン名（mcIcons.js）
 */
export class Engine extends EventEmitter {
  /**
   * ranking: 保存しておいたランキング（同じ配信の途中で起動し直したとき続きから数える）
   * saveRanking: ランキングが変わったときに保存する
   * modVersion: アプリに入っている MOD の版。マイクラに入っている MOD と違えば知らせる（わからなければ空）
   * plan: 無料版か有料版か（plan.js）。license があれば、そちらで決まる
   * license: 有料版のライセンスキー（license.js）
   * analytics / saveAnalytics: 保存しておいた配信ごとの分析（analytics.js）と、変わったときに保存する
   * history / saveHistory: 保存しておいた妨害の設定の履歴（history.js）と、変わったときに保存する
   */
  constructor({ config, client, tiktok, giftCatalog = null, now = Date.now, version = '', modVersion = '', ranking = {}, saveRanking = async () => {}, plan = CURRENT_PLAN, license = null, analytics = {}, saveAnalytics = async () => {}, history = {}, saveHistory = async () => {} }) {
    super();
    this.config = config;
    this.fixedPlan = plan;
    this.license = license;
    this.license?.on('change', () => this.emitState());
    this.version = version;
    this.modVersion = modVersion;
    this.giftCatalog = giftCatalog;
    this.now = now;
    this.client = client ?? new ModClient(config.mod);
    this.tiktok = tiktok ?? new TikTokSource();
    this.dispatcher = new Dispatcher({ rules: config.rules, client: this.client, now, game: () => this.client.status?.fill ?? null });
    this.logs = [];
    this.mock = false;
    // 実際に届いたギフト（設定画面で「最近届いたギフト」として出す）
    this.recentGifts = [];
    // ギフトランキング（配信画面に出す）。配信ごとに数える
    this.ranking = new Ranking(ranking);
    this.writeRanking = saveRanking;
    this.rankingTimer = null;
    this.rankingWrite = Promise.resolve();
    // 配信ごとの分析。本物のイベントだけ数える
    this.analytics = new Analytics(analytics, now);
    this.writeAnalytics = saveAnalytics;
    this.analyticsTimer = null;
    this.analyticsWrite = Promise.resolve();
    // 妨害の設定の履歴。はじめて使うときは、今のルールを「はじめの設定」として残す
    this.history = new RulesHistory(history, now);
    this.writeHistory = saveHistory;
    this.historyWrite = Promise.resolve();
    if (this.history.entries.length === 0 && this.history.record(config.rules, 'first')) this.saveHistory();
    // 画面用に作ったもの（ルールやギフト一覧が変わったときだけ作り直す）
    this.cache = {};
    this.statePending = false;

    // 埋め立ての進み具合でも status は届くので、接続の変化だけログに出す
    let previous = { connected: false, players: null };
    let warnedVersion;
    this.client.on('status', ({ connected, players, version, fill }) => {
      if (this.analytics.recordGame(fill)) this.saveAnalytics();
      if (!connected) warnedVersion = undefined;
      // 古い MOD は版を知らせない（version が null）。その場合も「合わない」とする
      if (connected && players !== null && this.modVersion && version !== this.modVersion && warnedVersion !== version) {
        warnedVersion = version;
        this.log('error', `マイクラに入っている MOD（${version ? `v${version}` : '古い版'}）が、このアプリ用の MOD（v${this.modVersion}）と違います。マイクラを閉じてアプリを起動し直すと入れ替わります`);
      }
      if (connected !== previous.connected || players !== previous.players) {
        if (!connected) {
          this.log('warn', 'マイクラ（MOD）との接続が切れました。つなぎ直します…');
        } else if (players === 0) {
          this.log('warn', 'マイクラにつながりましたが、ワールドに入っていません');
        } else if (players !== null) {
          this.log('ok', 'マイクラ（MOD）につながりました。妨害を受け付けています');
          // 昼に固定などのワールドの設定は、ワールドに入るたびに入れ直す
          this.sendWorld();
        }
        previous = { connected, players };
      }
      this.emitState();
    });
    this.tiktok.on('status', () => this.emitState());
    this.tiktok.on('log', ({ level, text }) => this.log(level, text));
    this.tiktok.on('live', ({ roomId }) => {
      if (this.analytics.startStream(roomId)) this.saveAnalytics();
      if (!this.ranking.startStream(roomId)) return;
      this.log('info', '新しい配信です。ギフトランキングを0から数えます');
      this.saveRanking();
      this.emitState();
    });
    this.tiktok.on('event', (raw) => {
      const event = this.withGiftInfo(raw);
      if (event.kind === 'gift') {
        this.rememberGift(event);
        // ランキングは本物のギフトだけ（テスト送信は数えない）
        if (this.ranking.add(event.from, (event.diamonds ?? 0) * (event.count ?? 1))) this.saveRanking();
      }
      if (this.analytics.recordEvent(event)) this.saveAnalytics();
      this.handleEvent(event).then((result) => {
        // いいねは、回数に届いたルールの分だけ結果が返る
        for (const r of Array.isArray(result) ? result : [result]) this.analytics.recordResult(event, r);
        this.saveAnalytics();
      });
    });
  }

  /** 履歴を保存する（保存の順番が入れ替わらないよう、つなげて書く） */
  saveHistory() {
    const data = this.history.toJSON();
    this.historyWrite = this.historyWrite.then(() => this.writeHistory(data)).catch(() => {});
    return this.historyWrite;
  }

  /** 履歴の一覧（新しい順）。無料版は新しい3件まで（有料版は30件） */
  historyList() {
    const entries = this.history.list((rule) => actionText(rule, describeAction));
    const full = planOf(this.plan).history;
    return { full, total: entries.length, entries: full ? entries : entries.slice(0, FREE_HISTORY_ENTRIES) };
  }

  /** 履歴の1つのルール（画面で読み込んで、配信者が保存する） */
  historyRules(id) {
    const visible = this.historyList().entries.some((e) => e.id === id);
    const entry = visible ? this.history.get(id) : null;
    if (!entry) throw new Error('その履歴は見つかりません');
    return { id: entry.id, time: entry.time, rules: entry.rules };
  }

  /** 分析を少し後でまとめて保存する */
  saveAnalytics() {
    if (this.analyticsTimer) return;
    this.analyticsTimer = setTimeout(() => this.flushAnalytics(), ANALYTICS_SAVE_DELAY_MS);
    this.analyticsTimer.unref?.();
  }

  flushAnalytics() {
    if (!this.analyticsTimer) return this.analyticsWrite;
    clearTimeout(this.analyticsTimer);
    this.analyticsTimer = null;
    const data = this.analytics.toJSON();
    this.analyticsWrite = this.analyticsWrite.then(() => this.writeAnalytics(data)).catch(() => {});
    return this.analyticsWrite;
  }

  /**
   * 配信の一覧。無料版は直近の配信のまとめだけ（記録は無料版でも続けるので、有料版にすると前の分も見られる）
   */
  analyticsList() {
    const streams = this.analytics.list();
    const full = planOf(this.plan).analytics;
    return { full, total: streams.length, streams: full ? streams : streams.slice(0, 1) };
  }

  /** 1つの配信のくわしい中身（有料版の機能） */
  analyticsDetail(id) {
    const problem = checkFeature(this.plan, 'analytics', '配信のくわしい分析');
    if (problem) throw new Error(problem);
    const detail = this.analytics.get(id);
    if (!detail) throw new Error('その配信の記録は見つかりません（30日より前のものは消えます）');
    return detail;
  }

  /** ランキングを少し後でまとめて保存する */
  saveRanking() {
    if (this.rankingTimer) return;
    this.rankingTimer = setTimeout(() => this.flushRanking(), RANKING_SAVE_DELAY_MS);
    this.rankingTimer.unref?.();
  }

  /** 保存を待たずに、今のランキングを保存する（終了するとき） */
  flushRanking() {
    if (!this.rankingTimer) return this.rankingWrite;
    clearTimeout(this.rankingTimer);
    this.rankingTimer = null;
    const data = this.ranking.toJSON();
    this.rankingWrite = this.rankingWrite.then(() => this.writeRanking(data)).catch(() => {});
    return this.rankingWrite;
  }

  /** ルールやギフト一覧が変わったときだけ作り直す */
  cached(key, deps, make) {
    const entry = this.cache[key];
    if (entry && entry.deps.length === deps.length && entry.deps.every((d, i) => d === deps[i])) return entry.value;
    const value = make();
    this.cache[key] = { deps, value };
    return value;
  }

  get state() {
    return {
      version: this.version,
      mock: this.mock,
      paused: this.dispatcher.paused,
      tiktok: this.tiktok.status,
      tiktokUsername: this.config.tiktokUsername,
      mod: this.client.status,
      fill: this.client.status.fill ?? null,
      fillSettings: this.config.fill ?? parseFill(),
      worldSettings: this.config.world ?? parseWorld(),
      stats: { ...this.dispatcher.stats },
      rules: this.config.rules,
      presets: { builtin: BUILTIN_PRESETS, mine: this.config.presets ?? [] },
      plan: planOf(this.plan),
      license: this.license?.status() ?? { enabled: false, state: 'disabled' },
      // 配信画面の部品の見た目。無料版では、保存してあっても既定の見た目で出す（設定は消さない）
      overlayStyle: planOf(this.plan).overlayStyle ? this.config.overlay ?? DEFAULT_OVERLAY_STYLE : DEFAULT_OVERLAY_STYLE,
      savedOverlayStyle: this.config.overlay ?? DEFAULT_OVERLAY_STYLE,
      testButtons: this.cached('testButtons', [this.config.rules], () => testButtons(this.config.rules)),
      recentGifts: this.recentGifts,
      // 配信画面（オーバーレイ）用
      giftTable: this.cached('giftTable', [this.config.rules, this.giftCatalog?.version], () =>
        giftTable(this.config.rules, (name) => this.giftCatalog?.find({ giftName: name }) ?? null, describeAction)),
      ranking: this.ranking.top(),
      giftCatalogVersion: this.giftCatalog?.version ?? 0,
    };
  }

  /** ギフトの絵の URL（わからなければ空） */
  /** ギフトに、ギフト一覧の日本語名（giftNameJa）と公式の絵（image）を足す。一覧にないギフトはそのまま */
  withGiftInfo(event) {
    if (event.kind !== 'gift') return event;
    const gift = this.giftCatalog?.find(event);
    if (!gift) return event;
    return { ...event, giftId: event.giftId || gift.id, giftNameJa: gift.nameJa, image: event.image || gift.image };
  }

  /** 今のルールを、自分のプリセットとして保存する（同じ名前なら上書き） */
  savePreset(name) {
    const preset = parsePreset({ name, rules: this.config.rules });
    const problem = checkPresetSave(this.plan, this.config.presets ?? [], preset.name);
    if (problem) throw new Error(problem);
    const mine = (this.config.presets ?? []).filter((p) => p.name !== preset.name);
    this.config.presets = [...mine, preset];
    this.log('info', `今の妨害の設定を、プリセット「${preset.name}」として保存しました`);
    this.emitState();
  }

  /** 今のプラン（plan.js の id）。ライセンスがあれば、キーの状態と TikTok ID で決まる */
  get plan() {
    return this.license ? this.license.plan(this.config.tiktokUsername) : this.fixedPlan;
  }

  /** ライセンスキーをこの PC で有効にする（画面から） */
  async activateLicense(key) {
    if (!this.license) throw new Error('有料版はまだ販売していません');
    await this.license.activate(key, this.config.tiktokUsername);
    this.log('ok', `有料版（${planOf('plus').name}）を有効にしました（@${this.license.status().tiktok} 用）`);
    this.emitState();
  }

  /** この PC でのライセンスの有効化を解除する。設定はそのまま */
  async deactivateLicense() {
    await this.license?.deactivate();
    this.log('info', 'この PC での有料版の有効化を解除しました。設定はそのまま残っています');
    this.emitState();
  }

  /** 配信画面の部品の見た目を変える（有料版の機能）。渡した項目だけ変わる。reset なら既定に戻す */
  setOverlayStyle(style, { reset = false } = {}) {
    const problem = checkFeature(this.plan, 'overlayStyle', '配信画面の見た目の変更');
    if (problem) throw new Error(problem);
    this.config.overlay = reset ? { ...DEFAULT_OVERLAY_STYLE } : parseOverlayStyle({ ...this.config.overlay, ...style });
    this.emitState();
  }

  /** 設定ファイル（書き出し）の中身。今のルールと自分のプリセット */
  exportSettings() {
    const problem = checkFeature(this.plan, 'importExport', '設定の書き出し');
    if (problem) throw new Error(problem);
    return {
      format: SETTINGS_FORMAT, version: SETTINGS_VERSION, app: this.version, exportedAt: new Date(this.now()).toISOString(),
      rules: this.config.rules, presets: this.config.presets ?? [],
    };
  }

  /**
   * 書き出した設定ファイルを読み込む。今のルールは変えず、すべて自分のプリセットとして足す
   * （ファイルの「今のルール」は「読み込んだルール」という名前になる）。同じ名前があれば (2) などを付ける。
   * 1つでも読めないもの・入りきらないときは、何も足さずに断る。
   * @returns {string[]} 足したプリセットの名前
   */
  importSettings(data) {
    const problem = checkFeature(this.plan, 'importExport', '設定の読み込み');
    if (problem) throw new Error(problem);
    if (data?.format !== SETTINGS_FORMAT || !Number.isInteger(data.version)) {
      throw new Error('Project Redstone の設定ファイルではありません');
    }
    if (data.version > SETTINGS_VERSION) {
      throw new Error('新しい版のアプリで書き出したファイルです。アプリを新しくしてから読み込んでください');
    }
    const incoming = [];
    if (Array.isArray(data.rules) && data.rules.length > 0) incoming.push({ name: '読み込んだルール', rules: data.rules });
    if (data.presets !== undefined && !Array.isArray(data.presets)) throw new Error('ファイルの中のプリセットが読めません');
    incoming.push(...(data.presets ?? []));
    if (incoming.length === 0) throw new Error('ファイルにルールもプリセットも入っていません');

    const mine = [...(this.config.presets ?? [])];
    const limit = planOf(this.plan).userPresets;
    if (mine.length + incoming.length > limit) {
      throw new Error(`プリセットは${limit}個まで保存できます。いま${mine.length}個あり、ファイルには${incoming.length}個入っているので入りきりません。いくつか削除してから読み込んでください`);
    }
    const added = [];
    for (const [i, raw] of incoming.entries()) {
      let preset;
      try {
        preset = parsePreset(raw);
        const problem = checkRules(this.plan, preset.rules, 0);
        if (problem) throw new Error(problem);
      } catch (e) {
        throw new Error(`ファイルの${i + 1}番目のプリセット「${String(raw?.name ?? '')}」が読めません: ${e.message}`);
      }
      preset.name = uniqueName(preset.name, [...mine, ...added].map((p) => p.name));
      added.push(preset);
    }
    this.config.presets = [...mine, ...added];
    this.log('ok', `設定ファイルから、プリセットを${added.length}個読み込みました（${added.map((p) => p.name).join('・')}）`);
    this.emitState();
    return added.map((p) => p.name);
  }

  deletePreset(name) {
    this.config.presets = (this.config.presets ?? []).filter((p) => p.name !== name);
    this.emitState();
  }

  /**
   * ルールを入れ替える（設定画面から）。クールダウンもリセットする。プランの上限で断るときは Error を投げる
   * @param {string} [reason] 履歴に残すきっかけ（history.js の HISTORY_REASONS）
   */
  setRules(rules, reason = 'edit') {
    const problem = checkRules(this.plan, rules, this.config.rules.length) ?? checkAdvancedRules(this.plan, rules, this.config.rules);
    if (problem) throw new Error(problem);
    this.config.rules = rules;
    this.dispatcher.setRules(rules);
    if (this.history.record(rules, reason)) this.saveHistory();
    this.log('ok', `妨害の設定を保存しました（ルール ${rules.length}件）`);
    this.emitState();
  }

  rememberGift(event) {
    if (!event.giftName) return;
    // 画面ではルールと同じく日本語名を使う
    const giftName = event.giftNameJa || event.giftName;
    const gift = { giftName, diamonds: event.diamonds, image: event.image ?? '' };
    this.recentGifts = [gift, ...this.recentGifts.filter((g) => g.giftName !== giftName)].slice(0, MAX_RECENT_GIFTS);
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

  /** 埋め立てを始める。枠はマイクラのプレイヤーの真上の空中に作られる。使った設定は覚えておく */
  async startFill(options) {
    this.requireMod();
    const fill = parseFill({ ...this.config.fill, ...options });
    const response = await this.client.send({ type: 'fill_start', ...fill });
    if (!response.ok) throw new Error(response.error);
    this.config.fill = fill;
    this.log('ok', `埋め立てを始めました（${fill.rounds}ラウンド・幅${fill.width}・高さ${fill.height}・Y=${fill.skyY}・届く距離${fill.reach}・置く速さ${PLACE_SPEED_NAMES[fill.placeSpeed]}・壊す速さ${BREAK_SPEED_NAMES[fill.breakSpeed]}・モブに${fill.mobsAttack ? '攻撃される' : '攻撃されない'}・モブは${fill.mobLifetime ? `${fill.mobLifetime}秒で消える` : '消えない'}）`);
    this.emitState();
  }

  /**
   * ワールドの設定（昼に固定・天気など）を変える。マイクラにつながっていれば、すぐ入れる。
   * @returns {Promise<boolean>} マイクラに入れられたか（つながっていなければ、つながったときに入れる）
   */
  async setWorld(settings) {
    this.config.world = parseWorld({ ...this.config.world, ...settings });
    this.emitState();
    return this.sendWorld();
  }

  async sendWorld() {
    if (!this.client.status.connected || !this.client.status.players) return false;
    const world = this.config.world ?? parseWorld();
    try {
      const response = await this.client.send({ type: 'world', ...world });
      if (!response.ok) throw new Error(response.error);
      const times = { normal: '進む', day: '昼で止める', night: '夜で止める' };
      const weathers = { normal: '変わる', clear: '晴れで止める', rain: '雨で止める' };
      this.log('info', `ワールドの設定: 時間は${times[world.time]}・天気は${weathers[world.weather]}・モブが自然に${world.mobSpawning ? '湧く' : '湧かない'}・やられたら持ち物が${world.keepInventory ? '残る' : '落ちる'}`);
      return true;
    } catch (e) {
      this.log('error', `ワールドの設定を入れられませんでした: ${e.message}`);
      return false;
    }
  }

  async stopFill() {
    this.requireMod();
    const response = await this.client.send({ type: 'fill_stop' });
    if (!response.ok) throw new Error(response.error);
    this.log('info', '埋め立てを終えました');
  }

  /**
   * 画面のボタンからの操作は、マイクラにつながっていなければすぐ断る。
   * （ギフトは少しの切断なら待ち行列で待つが、ボタンは待たせると、あとで急に出て驚くため）
   */
  requireMod() {
    if (!this.client.status.connected) throw new Error('マイクラ（MOD）につながっていません。ワールドを開いてから押してください');
  }

  /** 配信者が画面のボタンで出す妨害（埋め立ての操作など）。ルールを通さない */
  async manualAction(action) {
    if (!this.client.status.connected) {
      return { status: 'failed', error: 'マイクラ（MOD）につながっていません。ワールドを開いてから押してください' };
    }
    const result = await this.dispatcher.fire(-1, { kind: 'manual', from: '' }, action);
    this.logResult({ kind: 'manual', from: '' }, result);
    this.emitState();
    return result;
  }

  async handleEvent(raw) {
    try {
      if (raw.kind === 'like') return await this.handleLikes(raw);
      // テスト送信のギフトにも日本語名と絵を足す
      const event = this.withGiftInfo(raw);
      this.log('gift', testMark(event) + describeEvent(event), event.image ? { giftImage: event.image } : {});
      const result = await this.dispatcher.handle(event);
      this.logResult(event, result);
      this.emitState();
      return result;
    } catch (e) {
      // 1つのギフトの失敗で、ほかのギフトを止めない
      this.log('error', `ギフトを処理できませんでした: ${e.message}`);
      return { status: 'failed', error: e.message };
    }
  }

  logResult(event, result) {
    if (result.status === 'sent') {
      const icon = result.action.type === 'mob' ? (result.action.mob ?? 'zombie') : result.action.type;
      this.log('ok', `  → ${result.random ? 'ランダムで ' : ''}${describeAction(result.action)} を出しました`, { icon });
      // オーバーレイに出す「誰が」
      const who = event.kind === 'like' ? `いいね${result.likes}回` : event.kind === 'manual' ? '配信者' : `${event.from || '誰か'}さん`;
      const giftImage = event.kind === 'gift' ? event.image ?? '' : '';
      const giftName = event.kind === 'gift' ? event.giftNameJa || event.giftName || '' : '';
      this.emit('alert', { who, action: describeAction(result.action), icon, giftImage, giftName, count: event.kind === 'gift' ? event.count : 1 });
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
      this.log('gift', `${testMark(event)}いいね ${result.likes}回`);
      this.logResult(event, result);
    }
    if (results.length) this.emitState();
    return results;
  }

  /** ギフトランキングを0に戻す */
  resetRanking() {
    this.ranking.reset();
    this.saveRanking();
    this.log('info', 'ギフトランキングをリセットしました');
    this.emitState();
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

  /**
   * 全妨害ストップ: 待ち行列の妨害を取り消して一時停止し、マイクラの中で起きている妨害も止める
   * （TNT とモブを消し、逮捕・操作禁止・浮遊を解き、夜を元に戻す。埋め立ては続ける）
   * @returns {Promise<number>} 取り消した待ち行列の数
   */
  async stopAll() {
    this.dispatcher.paused = true;
    const cleared = this.client.clear();
    this.log('warn', `全妨害ストップ: 待ち行列の ${cleared}件を取り消し、一時停止しました`);
    this.emitState();
    if (!this.client.status.connected || !this.client.status.players) return cleared;
    try {
      const response = await this.client.send({ type: 'stop_all' });
      if (!response.ok) throw new Error(response.error);
      this.log('warn', 'マイクラの中の妨害も止めました（TNT・モブを消し、逮捕・操作禁止・浮遊・夜を解除）');
    } catch (e) {
      this.log('error', `マイクラの中の妨害を止められませんでした: ${e.message}`);
    }
    return cleared;
  }

  async shutdown() {
    this.client.stop();
    await Promise.all([this.tiktok.stop(), this.flushRanking(), this.flushAnalytics(), this.historyWrite]);
  }

  /** extra は画面で絵を出すための giftName・icon */
  log(level, text, extra = {}) {
    const entry = { time: this.now(), level, text, ...extra };
    this.logs.push(entry);
    if (this.logs.length > MAX_LOGS) this.logs.shift();
    this.emit('log', entry);
  }

  /**
   * 状態が変わったことを知らせる。いいねや進み具合で何度も続けて呼ばれるので、
   * 同じ処理の中で何回呼ばれても、知らせるのは最後に1回だけにする（画面とオーバーレイに送りすぎない）
   */
  emitState() {
    if (this.statePending) return;
    this.statePending = true;
    queueMicrotask(() => {
      this.statePending = false;
      this.emit('state', this.state);
    });
  }
}

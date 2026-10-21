import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { test } from 'node:test';
import { describeAction, Engine, testButtons } from '../src/engine.js';

class FakeClient extends EventEmitter {
  constructor() {
    super();
    this.sent = [];
    this.status = { connected: true, players: 1 };
  }
  start() {}
  stop() {}
  clear() {
    return 2;
  }
  async send(action) {
    this.sent.push(action);
    return { ok: true };
  }
}

class FakeTikTok extends EventEmitter {
  constructor() {
    super();
    this.status = { state: 'idle', username: '' };
    this.started = [];
  }
  async start(username) {
    this.started.push(username);
  }
  async stop() {
    this.stopped = true;
  }
}

function setup(configOverrides = {}, engineOptions = {}) {
  const config = { tiktokUsername: 'taro', mod: { host: '127.0.0.1', port: 1 }, rules: [{ gift: 'Rose', action: 'tnt', count: 2 }], ...configOverrides };
  const client = new FakeClient();
  const tiktok = new FakeTikTok();
  const engine = new Engine({ config, client, tiktok, ...engineOptions });
  const alerts = [];
  const logs = [];
  engine.on('alert', (a) => alerts.push(a));
  engine.on('log', (l) => logs.push(l));
  return { engine, client, tiktok, alerts, logs };
}

const rose = { kind: 'gift', giftId: '1', giftName: 'Rose', diamonds: 1, count: 3, from: 'たろう' };

test('TikTokのギフトを妨害にして、オーバーレイ用の通知を出す', async () => {
  const { engine, client, tiktok, alerts } = setup();
  tiktok.emit('event', rose);
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(client.sent, [{ type: 'tnt', count: 6, from: 'たろう' }]);
  assert.deepEqual(alerts, [{ who: 'たろうさん', action: 'TNT ×6', icon: 'tnt', giftImage: '', giftName: 'Rose', count: 3 }]);
  assert.deepEqual(engine.state.ranking, [{ name: 'たろう', coins: 3 }], 'ギフトランキングに足す');
  assert.equal(engine.state.stats.sent, 1);
});

test('英語名で届いたギフトも、日本語名のルールに合わせ、日本語名と公式の絵で表示する', async () => {
  const { engine, client, tiktok, alerts, logs } = setup({ rules: [{ gift: 'バラ', action: 'tnt', count: 2 }] });
  const image = 'https://p16-webcast.tiktokcdn.com/rose.webp';
  engine.giftCatalog = { version: 1, find: ({ giftId }) => (giftId === '5655' ? { id: '5655', name: 'Rose', nameJa: 'バラ', image } : null) };
  tiktok.emit('event', { ...rose, giftId: '5655' });
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(client.sent, [{ type: 'tnt', count: 6, from: 'たろう' }]);
  assert.equal(alerts[0].giftImage, image);
  assert.equal(logs[0].text, 'たろうさんから バラ ×3');
  assert.equal(logs[0].giftImage, image);
  assert.deepEqual(engine.state.recentGifts, [{ giftName: 'バラ', diamonds: 1, image }]);
});

test('起動時にIDがあればTikTokにつなぎ、モックではつながない', () => {
  const live = setup();
  live.engine.start();
  assert.deepEqual(live.tiktok.started, ['taro']);

  const mock = setup();
  mock.engine.start({ mock: true });
  assert.deepEqual(mock.tiktok.started, []);
  assert.equal(mock.engine.state.mock, true);
});

test('IDを変えるとつなぎ直し、空にすると止める', async () => {
  const { engine, tiktok } = setup({ tiktokUsername: '' });
  await engine.setTikTokUsername(' @hanako ');
  assert.equal(engine.config.tiktokUsername, 'hanako');
  assert.deepEqual(tiktok.started, ['hanako']);
  await engine.setTikTokUsername('');
  assert.equal(tiktok.stopped, true);
});

test('一時停止・全妨害ストップ', async () => {
  const { engine, client, alerts } = setup();
  engine.pause();
  await engine.handleEvent(rose);
  assert.equal(client.sent.length, 0);
  assert.equal(alerts.length, 0);
  engine.resume();
  assert.equal(await engine.stopAll(), 2);
  assert.equal(engine.state.paused, true);
  assert.deepEqual(client.sent, [{ type: 'stop_all' }], '一時停止中でも、マイクラの中の妨害を止める命令は送る');
});

test('全妨害ストップは、マイクラにつながっていなければ待ち行列を消すだけ', async () => {
  const { engine, client } = setup();
  client.status = { connected: false, players: null };
  assert.equal(await engine.stopAll(), 2);
  assert.equal(client.sent.length, 0);
  assert.equal(engine.state.paused, true);
});

test('ログは新しい200件だけ残す', () => {
  const { engine } = setup();
  for (let i = 0; i < 250; i++) engine.log('info', `${i}`);
  assert.equal(engine.logs.length, 200);
  assert.equal(engine.logs[0].text, '50');
});

test('テスト送信のボタンをルールから作る', () => {
  assert.deepEqual(testButtons([
    { gift: 'Rose', action: 'tnt' },
    { minDiamonds: 100, action: 'tnt' },
    { likes: 1000, action: 'fill_help' },
    { event: 'follow', action: 'message', label: 'ありがとう' },
    { gift: 'Rose', action: 'mob' },
    { giftId: '5655', action: 'tnt' },
  ]), [
    { label: 'Rose', body: { kind: 'gift', giftName: 'Rose', count: 1 } },
    { label: '🪙100', body: { kind: 'gift', giftName: '100コインのギフト', diamonds: 100, count: 1 } },
    { label: 'いいね1000', body: { kind: 'like', count: 1000 } },
    { label: 'フォロー', body: { kind: 'follow' } },
  ]);
});

test('ルールを入れ替えると、新しいルールで判定してクールダウンも戻る', async () => {
  const { engine, client } = setup({ rules: [{ gift: 'Rose', action: 'tnt', cooldownSec: 60 }] });
  await engine.handleEvent(rose);
  assert.equal((await engine.handleEvent(rose)).status, 'cooldown');
  engine.setRules([{ minDiamonds: 1, action: 'fill_expand', count: 2 }]);
  assert.equal((await engine.handleEvent(rose)).status, 'sent');
  assert.deepEqual(client.sent.at(-1), { type: 'fill_expand', count: 5, from: 'たろう' }); // 2 × 3連打 = 6 → 枠の上限5
  assert.deepEqual(engine.state.rules, [{ minDiamonds: 1, action: 'fill_expand', count: 2 }]);
});

test('TikTokから実際に届いたギフトを、新しい順に重複なしで覚える', () => {
  const { engine, tiktok } = setup();
  tiktok.emit('event', { ...rose, giftName: 'Rose', diamonds: 1 });
  tiktok.emit('event', { ...rose, giftName: 'Galaxy', diamonds: 1000 });
  tiktok.emit('event', { ...rose, giftName: 'Rose', diamonds: 1 });
  tiktok.emit('event', { kind: 'follow', from: 'x' });
  assert.deepEqual(engine.state.recentGifts, [{ giftName: 'Rose', diamonds: 1, image: '' }, { giftName: 'Galaxy', diamonds: 1000, image: '' }]);
});

test('妨害の表示名', () => {
  assert.equal(describeAction({ type: 'mob', mob: 'creeper', count: 2 }), 'クリーパー ×2');
  assert.equal(describeAction({ type: 'message', count: 1 }), 'メッセージ');
  assert.equal(describeAction({ type: 'mob', mob: 'pig', count: 5 }), 'ブタ ×5');
  assert.equal(describeAction({ type: 'fill_expand', count: 2 }), '枠を広げる ×2');
  assert.equal(describeAction({ type: 'fill_help', count: 10 }), 'お助けブロック ×10');
});

test('いいねは回数がたまるたびに出し、端数は次に持ち越す。ログは届いたときだけ', async () => {
  const { engine, client, alerts, logs } = setup({ rules: [{ likes: 1000, action: 'fill_help', count: 10 }, { likes: 10000, action: 'tnt', count: 5 }] });
  await engine.handleEvent({ kind: 'like', count: 600, from: 'a' });
  assert.equal(client.sent.length, 0);
  assert.equal(logs.length, 0);
  await engine.handleEvent({ kind: 'like', count: 1500, from: 'b' }); // 合計2100 → 2回分、100 持ち越し
  assert.deepEqual(client.sent, [{ type: 'fill_help', count: 20, from: 'b' }]);
  assert.deepEqual(alerts, [{ who: 'いいね2000回', action: 'お助けブロック ×20', icon: 'fill_help', giftImage: '', giftName: '', count: 1 }]);
  await engine.handleEvent({ kind: 'like', count: 900, from: 'c' }); // 100 + 900 = 1000 → 1回
  assert.equal(client.sent.at(-1).count, 10);
  await engine.handleEvent({ kind: 'like', count: 7000, from: 'd' }); // 合計1万に届く
  assert.deepEqual(client.sent.at(-1), { type: 'tnt', count: 5, from: 'd' });
});

test('画面のボタンからの操作は、マイクラにつながっていなければ待たずにすぐ断る', async () => {
  const { engine, client } = setup();
  client.status = { connected: false, players: null };
  const result = await engine.manualAction({ type: 'tnt', count: 1, from: '' });
  assert.equal(result.status, 'failed');
  assert.match(result.error, /ワールドを開いて/);
  await assert.rejects(engine.startFill({}), /つながっていません/);
  await assert.rejects(engine.stopFill(), /つながっていません/);
  assert.deepEqual(client.sent, [], '何も送らない（あとで急に出ない）');
});

test('埋め立ての開始・終了を MOD に送り、断られたら理由を返す', async () => {
  const { engine, client } = setup();
  await engine.startFill({ width: 15, height: 5, countdown: 30, block: 'diamond_block' });
  const sent = {
    width: 15, height: 5, countdown: 30, rounds: 10, wall: 'glass', block: 'diamond_block', handBlock: 'diamond_block', skyY: 150, reach: 8,
    placeSpeed: 'fast', breakSpeed: 'fast', mobsAttack: true, mobLifetime: 30,
  };
  assert.deepEqual(client.sent.at(-1), { type: 'fill_start', ...sent });
  assert.deepEqual(engine.config.fill, sent, '使った設定を覚える');
  assert.deepEqual(engine.state.fillSettings, sent);
  // おかしな値は既定値・上限に直して送る
  await engine.startFill({ wall: 'obsidian', reach: 999, width: 'x' });
  assert.deepEqual(client.sent.at(-1), { type: 'fill_start', ...sent, wall: 'glass', reach: 64, width: 11 });
  client.send = async () => ({ ok: false, error: '埋め立てが始まっていません' });
  await assert.rejects(engine.stopFill(), /始まっていません/);
});

test('ワールドの設定（昼に固定など）は、マイクラにつながっていればすぐ送り、つながっていなければ覚えておく', async () => {
  const { engine, client, logs } = setup();
  assert.equal(await engine.setWorld({ time: 'day', weather: 'clear', mobSpawning: false, keepInventory: true, junk: 1 }), true);
  assert.deepEqual(client.sent.at(-1), { type: 'world', time: 'day', weather: 'clear', mobSpawning: false, keepInventory: true });
  assert.match(logs.at(-1).text, /昼で止める/);
  assert.deepEqual(engine.state.worldSettings, { time: 'day', weather: 'clear', mobSpawning: false, keepInventory: true });

  client.status = { connected: false, players: null };
  assert.equal(await engine.setWorld({ time: 'night' }), false);
  assert.equal(client.sent.length, 1, 'つながっていなければ送らない');
  assert.equal(engine.config.world.time, 'night', '設定は覚える');
  assert.equal(engine.config.world.weather, 'clear', 'ほかの項目はそのまま');
});

test('ワールドに入ってマイクラにつながったら、ワールドの設定を入れ直す', async () => {
  const { engine, client } = setup({ world: { time: 'day', weather: 'normal', mobSpawning: true, keepInventory: false } });
  client.status = { connected: true, players: 1 };
  client.emit('status', { connected: true, players: 1 });
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(client.sent, [{ type: 'world', time: 'day', weather: 'normal', mobSpawning: true, keepInventory: false }]);
});

test('MOD から届いた埋め立ての状況を state に出す', () => {
  const { engine, client } = setup();
  client.status = { connected: true, players: 1, fill: { phase: 'filling', percent: 40 } };
  assert.deepEqual(engine.state.fill, { phase: 'filling', percent: 40 });
});

test('新しい妨害の説明文（秒・段・数なし）', async () => {
  const { describeAction } = await import('../src/engine.js');
  assert.equal(describeAction({ type: 'jail', count: 10 }), '逮捕 10秒');
  assert.equal(describeAction({ type: 'fill_layer', count: 2 }), '一段埋め ×2段');
  assert.equal(describeAction({ type: 'fill_clear', count: 1 }), '全消し');
  assert.equal(describeAction({ type: 'lightning', count: 3 }), '雷 ×3');
});

test('今のルールを自分のプリセットとして保存し、同じ名前なら上書きする', () => {
  const { engine } = setup();
  engine.savePreset('いつもの');
  engine.config.rules = [{ gift: 'バラ', action: 'jail', count: 10 }];
  engine.savePreset(' いつもの ');
  assert.deepEqual(engine.state.presets.mine, [{ name: 'いつもの', rules: [{ gift: 'バラ', action: 'jail', count: 10 }] }]);
  assert.deepEqual(engine.state.presets.builtin, []);
  assert.throws(() => engine.savePreset(''), /名前/);
  engine.deletePreset('いつもの');
  assert.deepEqual(engine.state.presets.mine, []);
});

test('ギフトランキング: 本物のギフトだけ数え、新しい配信で0に戻し、少し後にまとめて保存する', async () => {
  const saved = [];
  const { engine, tiktok } = setup({}, { saveRanking: async (data) => saved.push(data), ranking: { roomId: 'room1', coins: [['じろう', 50]] } });
  tiktok.emit('live', { roomId: 'room1' });
  assert.deepEqual(engine.state.ranking, [{ name: 'じろう', coins: 50 }], '同じ配信なら続きから');
  await engine.handleEvent({ kind: 'gift', giftName: 'Rose', diamonds: 1, count: 1, from: 'テスト' });
  assert.deepEqual(engine.state.ranking, [{ name: 'じろう', coins: 50 }], 'テスト送信は数えない');
  tiktok.emit('live', { roomId: 'room2' });
  assert.deepEqual(engine.state.ranking, []);
  tiktok.emit('event', rose);
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(engine.state.ranking, [{ name: 'たろう', coins: 3 }]);
  assert.equal(saved.length, 0, 'すぐには書かない');
  await engine.flushRanking();
  assert.deepEqual(saved, [{ roomId: 'room2', coins: [['たろう', 3]] }], '続けて変わっても1回にまとめる');
});

test('状態の知らせは、続けて変わっても1回にまとめる', async () => {
  const { engine } = setup();
  const states = [];
  engine.on('state', (s) => states.push(s));
  engine.pause();
  engine.resume();
  engine.pause();
  assert.equal(states.length, 0);
  await Promise.resolve();
  assert.equal(states.length, 1);
  assert.equal(states[0].paused, true, '最後の状態');
});

test('ギフトの処理で思わぬエラーが起きても、止まらずにログに出す', async () => {
  const { engine, logs } = setup();
  engine.dispatcher.handle = async () => {
    throw new Error('こわれた');
  };
  const result = await engine.handleEvent({ kind: 'gift', giftName: 'Rose', diamonds: 1, count: 1, from: 'a' });
  assert.equal(result.status, 'failed');
  assert.ok(logs.some((l) => l.level === 'error' && l.text.includes('こわれた')));
});

test('テスト送信はログに印を付け、本物のいいねのたまり具合に足さない', async () => {
  const { engine, client, logs } = setup({ rules: [{ likes: 100, action: 'fill_help', count: 1 }] });
  await engine.handleEvent({ kind: 'gift', giftName: 'Rose', diamonds: 1, count: 1, from: 'テスト', test: true });
  assert.ok(logs.some((l) => l.text.startsWith('（テスト）') && l.text.includes('Rose')));
  await engine.handleEvent({ kind: 'like', count: 150, from: 'テスト', test: true });
  assert.ok(logs.some((l) => l.text === '（テスト）いいね 100回'));
  client.sent.length = 0;
  // テストの残り50回は持ち越さないので、本物の60回ではまだ出ない
  await engine.handleEvent({ kind: 'like', count: 60, from: 'たろう' });
  assert.equal(client.sent.length, 0);
});

test('マイクラに入っている MOD の版がアプリ用と違えば知らせる（1回だけ）', () => {
  const { engine, client, logs } = setup({}, { modVersion: '0.16.1' });
  client.emit('status', { connected: true, players: 1, version: '0.16.1' });
  assert.equal(logs.filter((l) => l.level === 'error').length, 0);
  client.emit('status', { connected: false, players: null, version: null });
  client.emit('status', { connected: true, players: 1, version: null });
  client.emit('status', { connected: true, players: 1, version: null });
  const errors = logs.filter((l) => l.level === 'error');
  assert.equal(errors.length, 1);
  assert.match(errors[0].text, /古い版.*v0\.16\.1/);
});

test('無料版の上限: プリセットとルールを増やすときだけ断り、今ある設定は消さない', () => {
  const { engine } = setup({ presets: [{ name: 'A', rules: [{ gift: 'Rose', action: 'tnt' }] }] }, { plan: 'free' });
  assert.throws(() => engine.savePreset('B'), /1個まで/);
  engine.savePreset('A');
  assert.equal(engine.config.presets.length, 1);
  const many = Array.from({ length: 13 }, () => ({ minDiamonds: 1, action: 'tnt' }));
  assert.throws(() => engine.setRules(many), /12件まで/);
  assert.equal(engine.config.rules.length, 1, '断ったときは前のルールのまま');
  assert.equal(engine.state.plan.id, 'free');
});

test('設定ファイル: 書き出したものを読み込むと、すべて自分のプリセットとして足される（同じ名前には (2)）', () => {
  const a = setup({ presets: [{ name: 'お祭り', rules: [{ gift: 'GG', action: 'tnt' }] }] });
  const file = JSON.parse(JSON.stringify(a.engine.exportSettings()));
  assert.equal(file.format, 'project-redstone-settings');
  assert.equal(file.version, 1);

  const b = setup({ presets: [{ name: 'お祭り', rules: [{ gift: 'Rose', action: 'mob' }] }] });
  const names = b.engine.importSettings(file);
  assert.deepEqual(names, ['読み込んだルール', 'お祭り (2)']);
  assert.equal(b.engine.config.presets.length, 3);
  assert.equal(b.engine.config.rules[0].gift, 'Rose', '今のルールは変えない');
});

test('設定ファイル: 違うファイル・壊れたプリセット・入りきらないときは、何も足さずに断る', () => {
  const { engine } = setup();
  assert.throws(() => engine.importSettings({ hello: 1 }), /設定ファイルではありません/);
  assert.throws(() => engine.importSettings({ format: 'project-redstone-settings', version: 99, presets: [] }), /新しい版/);
  assert.throws(
    () => engine.importSettings({ format: 'project-redstone-settings', version: 1, presets: [{ name: 'よい', rules: [{ gift: 'GG', action: 'tnt' }] }, { name: 'こわれ', rules: [{ gift: 'GG', action: 'explode' }] }] }),
    /2番目のプリセット「こわれ」/,
  );
  assert.equal((engine.config.presets ?? []).length, 0);
  const many = Array.from({ length: 21 }, (_, i) => ({ name: `p${i}`, rules: [{ gift: 'GG', action: 'tnt' }] }));
  assert.throws(() => engine.importSettings({ format: 'project-redstone-settings', version: 1, presets: many }), /入りきりません/);
});

test('設定ファイルは有料版の機能（無料版では断る）', () => {
  const { engine } = setup({}, { plan: 'free' });
  assert.throws(() => engine.exportSettings(), /Creator Plus の機能/);
  assert.equal(engine.state.plan.importExport, false);
});

test('ライセンスがあれば、プランはライセンスと TikTok ID で決まる', () => {
  const license = Object.assign(new EventEmitter(), {
    plan: (tiktok) => (tiktok === 'taro' ? 'plus' : 'free'),
    status: () => ({ enabled: true, state: 'active', tiktok: 'taro' }),
  });
  const { engine } = setup({}, { license });
  assert.equal(engine.state.plan.id, 'plus');
  assert.equal(engine.state.license.state, 'active');
  engine.config.tiktokUsername = 'hanako';
  assert.equal(engine.state.plan.id, 'free');
});

test('配信画面の見た目: 有料版では変えた見た目、無料版では保存してあっても既定の見た目で出す', async () => {
  const { DEFAULT_OVERLAY_STYLE } = await import('../src/config.js');
  const plus = setup();
  plus.engine.setOverlayStyle({ textColor: '#FF0000', alertSeconds: 99, font: 'unknown' });
  assert.equal(plus.engine.state.overlayStyle.textColor, '#ff0000');
  assert.equal(plus.engine.state.overlayStyle.alertSeconds, 15, '上限で丸める');
  assert.equal(plus.engine.state.overlayStyle.font, 'gothic', '知らない文字の形は既定');
  plus.engine.setOverlayStyle({}, { reset: true });
  assert.deepEqual(plus.engine.state.overlayStyle, DEFAULT_OVERLAY_STYLE);

  const free = setup({ overlay: { ...DEFAULT_OVERLAY_STYLE, textColor: '#00ff00' } }, { plan: 'free' });
  assert.deepEqual(free.engine.state.overlayStyle, DEFAULT_OVERLAY_STYLE);
  assert.equal(free.engine.state.savedOverlayStyle.textColor, '#00ff00', '設定は消さない');
  assert.throws(() => free.engine.setOverlayStyle({ textColor: '#000000' }), /Creator Plus の機能/);
});

// 画面版の Web サーバー。操作画面（/）と LIVE Studio 用オーバーレイ（/overlay）を出す。
// 同じPCからしか開けないよう 127.0.0.1 にだけ待ち受け、ほかのサイトからの操作（CSRF・DNSリバインディング）も断る。
import http from 'node:http';
import { readAsset } from './assets.js';
import { ConfigError, MOBS, parseConfig } from './config.js';
import { MAX_COUNT_BY_TYPE } from './rules.js';
import { OVERLAY_HTML } from './ui/overlay.js';
import { OVERLAY_PAGES } from './ui/overlays.js';
import { PANEL_HTML } from './ui/panel.js';

export const DEFAULT_UI_PORT = 25600;

// 設定ファイルの読み込み（プリセット20個×ルール50件）が入る大きさ
const MAX_BODY_BYTES = 512 * 1024;

/**
 * @param {object} options
 * @param {import('./engine.js').Engine} options.engine
 * @param {(config: object) => Promise<void>} [options.saveConfig] TikTok ID を変えたときに保存する
 * @param {{status: () => Promise<object>, install: () => Promise<object>}} [options.setup] マイクラ側の準備（setup.js）
 * @param {{get: (name: string) => Promise<Buffer | null>}} [options.icons] マイクラのアイコン（mcIcons.js）
 */
export function createUiServer({ engine, saveConfig = async () => {}, setup, icons, port = DEFAULT_UI_PORT }) {
  const clients = new Set();
  const allowedHosts = () => {
    const actual = server.address()?.port ?? port;
    return new Set([`127.0.0.1:${actual}`, `localhost:${actual}`]);
  };

  const broadcast = (type, data) => {
    const message = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of clients) res.write(message);
  };
  const onLog = (entry) => broadcast('log', entry);
  const onState = (state) => broadcast('state', state);
  const onAlert = (alert) => broadcast('alert', alert);
  const onActivity = (entry) => broadcast('activity', entry);
  engine.on('log', onLog);
  engine.on('activity', onActivity);
  engine.on('state', onState);
  engine.on('alert', onAlert);

  const actions = {
    'POST /api/pause': () => engine.pause(),
    'POST /api/resume': () => engine.resume(),
    'POST /api/stop': () => engine.stopAll(),
    'POST /api/test': (body) => {
      const event = testEvent(body);
      if (!event) return { status: 400, error: 'テスト内容が正しくありません' };
      engine.handleEvent(event);
    },
    'POST /api/rules': async (body) => {
      let rules;
      try {
        ({ rules } = parseConfig({ rules: body.rules }));
      } catch (e) {
        if (e instanceof ConfigError) return { status: 400, error: e.message };
        throw e;
      }
      try {
        engine.setRules(rules, typeof body.reason === 'string' ? body.reason : 'edit');
      } catch (e) {
        return { status: 400, error: e.message };
      }
      await saveConfig(engine.config);
    },
    'POST /api/ranking/reset': () => engine.resetRanking(),
    'POST /api/presets/save': async (body) => {
      try {
        engine.savePreset(body.name);
      } catch (e) {
        return { status: 400, error: e.message };
      }
      await saveConfig(engine.config);
    },
    'POST /api/overlay/style': async (body) => {
      try {
        engine.setOverlayStyle(body.style ?? {}, { reset: body.reset === true });
      } catch (e) {
        return { status: 400, error: e.message };
      }
      await saveConfig(engine.config);
    },
    'POST /api/license/activate': async (body) => {
      try {
        await engine.activateLicense(body.key);
      } catch (e) {
        return { status: 400, error: e.message };
      }
    },
    'POST /api/license/deactivate': () => engine.deactivateLicense(),
    'POST /api/settings/import': async (body) => {
      let names;
      try {
        names = engine.importSettings(body.data);
      } catch (e) {
        return { status: 400, error: e.message };
      }
      await saveConfig(engine.config);
      return { imported: names };
    },
    'POST /api/presets/delete': async (body) => {
      engine.deletePreset(String(body.name ?? ''));
      await saveConfig(engine.config);
    },
    'POST /api/fill/start': async (body) => {
      const { width, height, countdown, rounds, wall, block, handBlock, skyY, reach, placeSpeed, breakSpeed, mobsAttack, mobLifetime } = body;
      try {
        await engine.startFill({ width, height, countdown, rounds, wall, block, handBlock, skyY, reach, placeSpeed, breakSpeed, mobsAttack, mobLifetime });
      } catch (e) {
        return { status: 400, error: e.message };
      }
      await saveConfig(engine.config);
    },
    'POST /api/world': async (body) => {
      const applied = await engine.setWorld(body);
      await saveConfig(engine.config);
      return { applied };
    },
    'POST /api/action': async (body) => {
      // 画面のボタン（配信タブ・テストタブ）から出せるもの
      const counts = Object.fromEntries(Object.entries(MAX_COUNT_BY_TYPE).filter(([type]) => type !== 'message').map(([type, max]) => [type, [1, max]]));
      let action;
      if (body.type === 'fill_set') {
        // テスト用: 枠の中を指定の割合まで一気に埋める（0 なら空にする）
        const percent = Math.min(100, Math.max(0, Math.floor(Number(body.percent))));
        if (!Number.isFinite(percent)) return { status: 400, error: '割合が正しくありません' };
        action = { type: 'fill_set', percent, from: '' };
      } else {
        const range = counts[body.type];
        if (!range) return { status: 400, error: 'この操作はできません' };
        const count = Math.min(range[1], Math.max(range[0], Math.floor(Number(body.count)) || 1));
        action = { type: body.type, count, from: '' };
        if (body.type === 'mob') {
          if (!MOBS.includes(body.mob)) return { status: 400, error: 'このモブは出せません' };
          action.mob = body.mob;
        }
      }
      const result = await engine.manualAction(action);
      if (result.status === 'failed') return { status: 400, error: result.error };
      if (result.status === 'paused') return { status: 400, error: '一時停止中です' };
    },
    'POST /api/mode': async (body) => {
      try {
        engine.setGameMode(String(body.mode ?? ''));
      } catch (e) {
        return { status: 400, error: e.message };
      }
      await saveConfig(engine.config);
    },
    // 採掘チャレンジの設定（資源・目標数・制限時間）。範囲の外は丸めずに断る
    'POST /api/mining': async (body) => {
      try {
        engine.setMining({ item: body.item, targetCount: body.targetCount, seconds: body.seconds });
      } catch (e) {
        return { status: 400, error: e.message };
      }
      await saveConfig(engine.config);
    },
    'POST /api/mining/start': async () => {
      try {
        await engine.startMining();
      } catch (e) {
        return { status: 400, error: e.message };
      }
    },
    'POST /api/mining/control': async (body) => {
      if (!['pause', 'resume', 'abort'].includes(body.op)) return { status: 400, error: 'この操作はできません' };
      try {
        await engine.controlMining(body.op);
      } catch (e) {
        return { status: 400, error: e.message };
      }
    },
    'POST /api/mining/test': async (body) => {
      if (!['drop', 'progress', 'time'].includes(body.op)) return { status: 400, error: 'この操作はできません' };
      const percent = Math.min(100, Math.max(0, Math.floor(Number(body.percent ?? 100)) || 0));
      try {
        await engine.testMining(body.op, percent);
      } catch (e) {
        return { status: 400, error: e.message };
      }
    },
    'POST /api/fill/stop': async () => {
      try {
        await engine.stopFill();
      } catch (e) {
        return { status: 400, error: e.message };
      }
    },
    'POST /api/setup/install': async () => {
      if (!setup) return { status: 404, error: '見つかりません' };
      try {
        return { setup: await setup.install() };
      } catch (e) {
        return { status: 400, error: e.message };
      }
    },
    'POST /api/tiktok': async (body) => {
      const username = String(body.username ?? '').trim().replace(/^@/, '');
      if (username.length > 64 || /[\s/]/.test(username)) {
        return { status: 400, error: 'TikTok ID の形が正しくありません' };
      }
      // つなぎに行く処理は時間がかかるので待たない。結果は state とログで知らせる
      engine.setTikTokUsername(username);
      await saveConfig(engine.config);
    },
  };

  const server = http.createServer(async (req, res) => {
    if (!allowedHosts().has(req.headers.host)) {
      return send(res, 403, { error: 'このアドレスからは開けません' });
    }
    const url = new URL(req.url, 'http://localhost');
    const route = `${req.method} ${url.pathname}`;

    if (route === 'GET /') return sendHtml(res, PANEL_HTML);
    // 配信画面の部品（ギフト通知・ギフト表・ラウンド・ランキング）。
    // LIVE Studio のリンク欄は「.html のような、点＋英字」がない URL をはねる（127.0.0.1 だけだと通らない）ので、末尾 .html でも開ける。
    // また LIVE Studio は貼られた URL を一度読んで確かめるので、表示用のこのページだけはほかのアプリからも読めるようにする
    if (route === 'GET /overlay' || route === 'GET /overlay.html') return sendHtml(res, OVERLAY_HTML, { readable: true });
    const widget = route.match(/^GET \/overlay\/([a-z]+)(?:\.html)?$/);
    if (widget && Object.hasOwn(OVERLAY_PAGES, widget[1])) return sendHtml(res, OVERLAY_PAGES[widget[1]], { frameable: true, readable: true });
    if (route === 'GET /favicon.ico') {
      res.writeHead(204);
      return res.end();
    }
    // 外部のグラフィック（app/assets/。キーアートなど）
    const asset = route.match(/^GET \/assets\/(.+)$/);
    if (asset) {
      const file = await readAsset(asset[1]);
      if (!file) return send(res, 404, { error: '見つかりません' });
      res.writeHead(200, { 'Content-Type': file.type, 'Cache-Control': 'max-age=86400' });
      return res.end(file.body);
    }
    const icon = route.match(/^GET \/icons\/mc\/([a-z0-9_]+)\.png$/);
    if (icon) {
      const png = await icons?.get(icon[1]).catch(() => null);
      if (!png) return send(res, 404, { error: '見つかりません' });
      res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'max-age=86400' });
      return res.end(png);
    }
    if (route === 'GET /api/settings/export') {
      let data;
      try {
        data = engine.exportSettings();
      } catch (e) {
        return send(res, 400, { error: e.message });
      }
      const day = data.exportedAt.slice(0, 10);
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="project-redstone-${day}.json"`,
        'Cache-Control': 'no-store',
      });
      return res.end(`${JSON.stringify(data, null, 2)}
`);
    }
    // 配信ごとの分析（一覧と、1つの配信のくわしい中身）
    if (route === 'GET /api/analytics') {
      return send(res, 200, engine.analyticsList());
    }
    const stream = route.match(/^GET \/api\/analytics\/([a-z0-9-]+)$/);
    if (stream) {
      try {
        return send(res, 200, engine.analyticsDetail(stream[1]));
      } catch (e) {
        return send(res, 400, { error: e.message });
      }
    }
    // 妨害の設定の履歴（一覧と、1つの履歴のルール）
    if (route === 'GET /api/history') {
      return send(res, 200, engine.historyList());
    }
    const entry = route.match(/^GET \/api\/history\/([a-z0-9-]+)$/);
    if (entry) {
      try {
        return send(res, 200, engine.historyRules(entry[1]));
      } catch (e) {
        return send(res, 404, { error: e.message });
      }
    }
    if (route === 'GET /api/gifts') {
      return send(res, 200, { gifts: engine.giftCatalog?.gifts ?? [] });
    }
    if (route === 'GET /api/setup') {
      if (!setup) return send(res, 404, { error: '見つかりません' });
      return send(res, 200, { setup: await setup.status() });
    }
    if (route === 'GET /events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
      res.write(`event: snapshot\ndata: ${JSON.stringify({ state: engine.state, logs: engine.logs, activity: engine.activity })}\n\n`);
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }

    const action = actions[route];
    if (!action) return send(res, 404, { error: '見つかりません' });

    // ほかのサイトからの書き込みを断る。JSON 以外は受けないので、ブラウザは事前確認を挟み、それをここで通さない
    const origin = req.headers.origin;
    if (origin !== undefined && !allowedHosts().has(origin.replace(/^http:\/\//, ''))) {
      return send(res, 403, { error: 'ほかのサイトからは操作できません' });
    }
    if (!String(req.headers['content-type'] ?? '').startsWith('application/json')) {
      return send(res, 415, { error: 'JSON で送ってください' });
    }

    let body;
    try {
      body = await readJson(req);
    } catch (e) {
      return send(res, 400, { error: e.message });
    }
    try {
      const result = await action(body);
      if (result?.error) return send(res, result.status, { error: result.error });
      return send(res, 200, { ok: true, state: engine.state, ...(result?.setup ? { setup: result.setup } : {}), ...(result?.applied !== undefined ? { applied: result.applied } : {}), ...(result?.imported ? { imported: result.imported } : {}) });
    } catch (e) {
      return send(res, 500, { error: e.message });
    }
  });

  server.on('close', () => {
    engine.off('log', onLog);
    engine.off('state', onState);
    engine.off('alert', onAlert);
    engine.off('activity', onActivity);
  });

  return {
    server,
    listen: () =>
      new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, '127.0.0.1', () => {
          server.off('error', reject);
          resolve(server.address().port);
        });
      }),
    close: () => {
      for (const res of clients) res.end();
      return new Promise((resolve) => server.close(resolve));
    },
  };
}

/** テスト送信の中身。test: true を付け、本物のイベントと見分ける（ログの印・いいねのたまり具合） */
function testEvent(body) {
  const from = 'テスト';
  if (body.kind === 'follow' || body.kind === 'share') return { kind: body.kind, from, test: true };
  if (body.kind === 'like') return { kind: 'like', count: Math.min(100000, Math.max(1, Math.floor(Number(body.count)) || 1)), from, test: true };
  if (body.kind !== 'gift') return null;
  const giftName = String(body.giftName ?? '').trim().slice(0, 64);
  const count = Math.min(100, Math.max(1, Math.floor(Number(body.count)) || 1));
  const diamonds = Math.min(100000, Math.max(0, Math.floor(Number(body.diamonds)) || 0));
  if (!giftName) return null;
  return { kind: 'gift', giftId: '', giftName, diamonds, count, from, test: true };
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('送られた内容が大きすぎます'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8');
      try {
        const value = text ? JSON.parse(text) : {};
        if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error();
        resolve(value);
      } catch {
        reject(new Error('JSON として読めません'));
      }
    });
    req.on('error', reject);
  });
}

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

/**
 * frameable: 操作画面の「配信画面」でプレビューするため、同じアプリの中でだけ枠に入れてよい（配信画面の部品だけ）
 * readable: ほかのアプリ（LIVE Studio）が中身を読んでよい（表示だけのページ）
 */
function sendHtml(res, html, { frameable = false, readable = false } = {}) {
  res.writeHead(200, {
    ...(readable ? { 'Access-Control-Allow-Origin': '*' } : {}),
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    // ギフトの絵は TikTok の画像サーバーから直接読む
    'Content-Security-Policy': `default-src 'self'; img-src 'self' data: https://*.tiktokcdn.com https://*.tiktokcdn-us.com https://*.tiktokcdn-eu.com; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; frame-ancestors ${frameable ? "'self'" : "'none'"}`,
  });
  res.end(html);
}

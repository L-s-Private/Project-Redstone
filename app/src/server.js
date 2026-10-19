// 画面版の Web サーバー。操作画面（/）と LIVE Studio 用オーバーレイ（/overlay）を出す。
// 同じPCからしか開けないよう 127.0.0.1 にだけ待ち受け、ほかのサイトからの操作（CSRF・DNSリバインディング）も断る。
import http from 'node:http';
import { OVERLAY_HTML } from './ui/overlay.js';
import { PANEL_HTML } from './ui/panel.js';

export const DEFAULT_UI_PORT = 25600;

const MAX_BODY_BYTES = 4096;

/**
 * @param {object} options
 * @param {import('./engine.js').Engine} options.engine
 * @param {(config: object) => Promise<void>} [options.saveConfig] TikTok ID を変えたときに保存する
 */
export function createUiServer({ engine, saveConfig = async () => {}, port = DEFAULT_UI_PORT }) {
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
  engine.on('log', onLog);
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
    if (route === 'GET /overlay') return sendHtml(res, OVERLAY_HTML);
    if (route === 'GET /events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
      res.write(`event: snapshot\ndata: ${JSON.stringify({ state: engine.state, logs: engine.logs })}\n\n`);
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
      return send(res, 200, { ok: true, state: engine.state });
    } catch (e) {
      return send(res, 500, { error: e.message });
    }
  });

  server.on('close', () => {
    engine.off('log', onLog);
    engine.off('state', onState);
    engine.off('alert', onAlert);
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

function testEvent(body) {
  const from = 'テスト';
  if (body.kind === 'follow' || body.kind === 'share') return { kind: body.kind, from };
  if (body.kind !== 'gift') return null;
  const giftName = String(body.giftName ?? '').trim().slice(0, 64);
  const count = Math.min(100, Math.max(1, Math.floor(Number(body.count)) || 1));
  if (!giftName) return null;
  return { kind: 'gift', giftId: '', giftName, diamonds: 0, count, from };
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

function sendHtml(res, html) {
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; frame-ancestors 'none'",
  });
  res.end(html);
}

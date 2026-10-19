import { EventEmitter } from 'node:events';
import net from 'node:net';

/**
 * MOD への TCP 接続（docs/protocol.md）。切れたら自動でつなぎ直す。
 * つながっていない間に届いた妨害は待ち行列にためて、つながったら送る。古すぎるものは捨てる。
 *
 * イベント: 'status' ({connected, players})
 */
export class ModClient extends EventEmitter {
  constructor({
    host = '127.0.0.1',
    port,
    requestTimeoutMs = 15000,
    maxQueue = 50,
    reconnectMinMs = 1000,
    reconnectMaxMs = 10000,
    pingIntervalMs = 1000,
  }) {
    super();
    Object.assign(this, { host, port, requestTimeoutMs, maxQueue, reconnectMinMs, reconnectMaxMs, pingIntervalMs });
    this.socket = null;
    this.connected = false;
    this.players = null;
    this.fill = null;
    this.nextId = 1;
    this.queue = [];
    this.inFlight = new Map();
    this.buffer = '';
    this.reconnectDelay = reconnectMinMs;
    this.stopped = false;
  }

  start() {
    this.stopped = false;
    this.connect();
  }

  stop() {
    this.stopped = true;
    clearTimeout(this.reconnectTimer);
    clearInterval(this.pingTimer);
    this.socket?.destroy();
    this.rejectAll(new Error('アプリを終了しました'));
  }

  get status() {
    return { connected: this.connected, players: this.players, fill: this.fill };
  }

  /** @returns {Promise<{ok: boolean, error?: string}>} */
  send(action) {
    return new Promise((resolve, reject) => {
      if (!this.connected && this.queue.length >= this.maxQueue) {
        reject(new Error('MODにつながっておらず、待ち行列がいっぱいです'));
        return;
      }
      const request = { id: String(this.nextId++), ...action };
      const entry = { request, resolve, reject };
      entry.timer = setTimeout(() => {
        this.forget(entry);
        reject(new Error(this.connected ? 'MODから応答がありません' : 'MODにつながらないまま時間切れになりました'));
      }, this.requestTimeoutMs);

      if (this.connected) {
        this.write(entry);
      } else {
        this.queue.push(entry);
      }
    });
  }

  /** 待ち行列の妨害をすべて取り消す（全妨害ストップ）。送信済みのものは止められない。 */
  clear() {
    const cleared = this.queue.splice(0);
    for (const entry of cleared) {
      clearTimeout(entry.timer);
      entry.reject(new Error('取り消しました'));
    }
    return cleared.length;
  }

  connect() {
    const socket = net.createConnection({ host: this.host, port: this.port });
    this.socket = socket;
    socket.setEncoding('utf8');
    socket.setNoDelay(true);

    socket.on('connect', () => {
      this.connected = true;
      this.reconnectDelay = this.reconnectMinMs;
      this.buffer = '';
      for (const entry of this.queue.splice(0)) {
        this.write(entry);
      }
      this.ping();
      this.pingTimer = setInterval(() => this.ping(), this.pingIntervalMs);
      this.emitStatus();
    });

    socket.on('data', (chunk) => this.onData(chunk));

    // 'error' の後には必ず 'close' が来るので、つなぎ直しは 'close' で行う
    socket.on('error', () => {});

    socket.on('close', () => {
      clearInterval(this.pingTimer);
      const wasConnected = this.connected;
      this.connected = false;
      this.players = null;
      this.fill = null;
      for (const entry of this.inFlight.values()) {
        clearTimeout(entry.timer);
        entry.reject(new Error('MODとの接続が切れました'));
      }
      this.inFlight.clear();
      if (wasConnected) {
        this.emitStatus();
      }
      if (!this.stopped) {
        this.reconnectTimer = setTimeout(() => this.connect(), this.reconnectDelay);
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.reconnectMaxMs);
      }
    });
  }

  write(entry) {
    this.inFlight.set(entry.request.id, entry);
    this.socket.write(`${JSON.stringify(entry.request)}\n`);
  }

  onData(chunk) {
    this.buffer += chunk;
    let newline;
    while ((newline = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, newline).trim();
      this.buffer = this.buffer.slice(newline + 1);
      if (!line) continue;
      let response;
      try {
        response = JSON.parse(line);
      } catch {
        continue;
      }
      const entry = this.inFlight.get(response.id);
      if (!entry) continue;
      this.inFlight.delete(response.id);
      clearTimeout(entry.timer);
      entry.resolve(response);
    }
  }

  async ping() {
    try {
      const response = await this.send({ type: 'ping' });
      const fill = response.fill ?? null;
      if (response.ok && (this.players !== response.players || JSON.stringify(this.fill) !== JSON.stringify(fill))) {
        this.players = response.players;
        this.fill = fill;
        this.emitStatus();
      }
    } catch {
      // 切断は 'close' で扱う
    }
  }

  forget(entry) {
    this.inFlight.delete(entry.request.id);
    const index = this.queue.indexOf(entry);
    if (index !== -1) this.queue.splice(index, 1);
  }

  rejectAll(error) {
    for (const entry of [...this.queue.splice(0), ...this.inFlight.values()]) {
      clearTimeout(entry.timer);
      entry.reject(error);
    }
    this.inFlight.clear();
  }

  emitStatus() {
    this.emit('status', this.status);
  }
}

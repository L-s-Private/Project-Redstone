import assert from 'node:assert/strict';
import { once } from 'node:events';
import net from 'node:net';
import { test } from 'node:test';
import { ModClient } from '../src/modClient.js';

/** MOD の代わりに、届いた要求を記録して ok を返すサーバー */
async function fakeMod(port = 0) {
  const received = [];
  const sockets = new Set();
  const server = net.createServer((socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    let buffer = '';
    socket.setEncoding('utf8');
    socket.on('data', (chunk) => {
      buffer += chunk;
      let i;
      while ((i = buffer.indexOf('\n')) !== -1) {
        const request = JSON.parse(buffer.slice(0, i));
        buffer = buffer.slice(i + 1);
        if (request.type !== 'ping') received.push(request);
        const response = request.type === 'ping' ? { id: request.id, ok: true, players: 1 } : { id: request.id, ok: true };
        socket.write(`${JSON.stringify(response)}\n`);
      }
    });
  });
  server.listen(port, '127.0.0.1');
  await once(server, 'listening');
  return {
    port: server.address().port,
    received,
    async close() {
      for (const socket of sockets) socket.destroy();
      server.close();
      await once(server, 'close');
    },
  };
}

async function freePort() {
  const probe = await fakeMod();
  const { port } = probe;
  await probe.close();
  return port;
}

const fast = { reconnectMinMs: 20, reconnectMaxMs: 50, requestTimeoutMs: 2000 };

test('つながる前に来た妨害は、つながってから送る', async () => {
  const port = await freePort();
  const client = new ModClient({ port, ...fast });
  client.start();
  const pending = client.send({ type: 'tnt', count: 2 });
  await new Promise((r) => setTimeout(r, 60));

  const mod = await fakeMod(port);
  try {
    assert.equal((await pending).ok, true);
    assert.equal(mod.received[0].type, 'tnt');
    assert.equal(mod.received[0].count, 2);
    while (client.status.players !== 1) await once(client, 'status');
  } finally {
    client.stop();
    await mod.close();
  }
});

test('MODが落ちても、立ち上がり直せばつなぎ直す', async () => {
  let mod = await fakeMod();
  const { port } = mod;
  const client = new ModClient({ port, ...fast });
  client.start();
  try {
    assert.equal((await client.send({ type: 'tnt' })).ok, true);
    await mod.close();
    while (client.status.connected) await once(client, 'status');

    mod = await fakeMod(port);
    assert.equal((await client.send({ type: 'mob', mob: 'zombie' })).ok, true);
    assert.equal(mod.received[0].mob, 'zombie');
  } finally {
    client.stop();
    await mod.close();
  }
});

test('stop 相当の clear で待ち行列を取り消す', async () => {
  const client = new ModClient({ port: await freePort(), ...fast });
  client.start();
  const pending = [client.send({ type: 'tnt' }), client.send({ type: 'tnt' })];
  assert.equal(client.clear(), 2);
  for (const p of pending) await assert.rejects(p, /取り消しました/);
  client.stop();
});

test('つながらないまま時間が過ぎた妨害は捨てる', async () => {
  const client = new ModClient({ port: await freePort(), ...fast, requestTimeoutMs: 50 });
  client.start();
  await assert.rejects(client.send({ type: 'tnt' }), /時間切れ/);
  assert.equal(client.queue.length, 0);
  client.stop();
});

test('待ち行列があふれたら新しい妨害を断る', async () => {
  const client = new ModClient({ port: await freePort(), ...fast, maxQueue: 1 });
  client.start();
  const first = client.send({ type: 'tnt' });
  await assert.rejects(client.send({ type: 'tnt' }), /いっぱい/);
  client.stop();
  await assert.rejects(first, /終了/);
});

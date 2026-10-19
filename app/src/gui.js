// 開発用: 操作画面を既定のブラウザで開く版。配布するのはデスクトップ版（electron/main.js）。
import { spawn } from 'node:child_process';
import { parseArgs } from 'node:util';
import { startApp } from './app.js';
import { ConfigError } from './config.js';
import { log } from './log.js';
import { DEFAULT_UI_PORT } from './server.js';

function openBrowser(url) {
  const [command, args] =
    process.platform === 'win32' ? ['cmd', ['/c', 'start', '""', url]]
    : process.platform === 'darwin' ? ['open', [url]]
    : ['xdg-open', [url]];
  try {
    spawn(command, args, { detached: true, stdio: 'ignore', windowsVerbatimArguments: true }).on('error', () => {}).unref();
  } catch {
    // 開けなくても、URL はログに出しているので困らない
  }
}

const { values } = parseArgs({
  options: {
    mock: { type: 'boolean', default: false },
    'no-open': { type: 'boolean', default: false },
    port: { type: 'string' },
  },
});

try {
  const app = await startApp({
    mock: values.mock,
    port: values.port ? Number(values.port) : DEFAULT_UI_PORT,
    onLog: ({ level, text }) => log[level](text),
  });
  log.ok(`操作画面: ${app.url}`);
  if (!values['no-open']) openBrowser(app.url);
  const shutdown = async () => {
    await app.shutdown();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch (e) {
  log.error(e instanceof ConfigError ? e.message : e.code === 'EADDRINUSE' ? 'ポートが使用中です。すでに起動していませんか？' : `起動できませんでした: ${e.stack ?? e}`);
  process.exit(1);
}

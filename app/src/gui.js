// 画面版（exe の入口）。操作画面をブラウザで開き、このウィンドウにはログを出す。
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { ConfigError } from './config.js';
import { Engine } from './engine.js';
import { log } from './log.js';
import { loadBundledMod } from './bundledMod.js';
import { createUiServer, DEFAULT_UI_PORT } from './server.js';
import { getSetupStatus, installAll, minecraftDir } from './setup.js';
import { loadUserConfig, saveUserConfig } from './userConfig.js';

function openBrowser(url) {
  const [command, args] =
    process.platform === 'win32' ? ['cmd', ['/c', 'start', '""', url]]
    : process.platform === 'darwin' ? ['open', [url]]
    : ['xdg-open', [url]];
  try {
    spawn(command, args, { detached: true, stdio: 'ignore', windowsVerbatimArguments: true }).on('error', () => {}).unref();
  } catch {
    // 開けなくても、URL はウィンドウに出しているので困らない
  }
}

/** エラーで閉じる前に、ウィンドウがすぐ消えないよう Enter を待つ */
function waitForEnter() {
  if (!process.stdin.isTTY) return Promise.resolve();
  console.log('Enter キーを押すと閉じます');
  const rl = createInterface({ input: process.stdin });
  return new Promise((resolve) => rl.once('line', () => resolve(rl.close())));
}

async function main() {
  const { values } = parseArgs({
    options: {
      mock: { type: 'boolean', default: false },
      'no-open': { type: 'boolean', default: false },
      port: { type: 'string' },
    },
  });
  const port = values.port ? Number(values.port) : DEFAULT_UI_PORT;
  const url = `http://127.0.0.1:${port}/`;

  const { config, path, created } = await loadUserConfig();
  log.info(`設定ファイル: ${path}${created ? '（新しく作りました）' : ''}`);

  const engine = new Engine({ config });
  engine.on('log', ({ level, text }) => log[level](text));

  const bundledMod = await loadBundledMod();
  const dir = process.env.REDSTONE_MINECRAFT_DIR ?? minecraftDir();
  let installing = null;
  const setup = {
    status: () => getSetupStatus({ dir, bundledMod }),
    install: () => {
      // 2回押されても同時には走らせない
      installing ??= installAll({ dir, bundledMod, log: (level, text) => engine.log(level, text) }).finally(() => (installing = null));
      return installing;
    },
  };

  const ui = createUiServer({ engine, port, setup, saveConfig: (c) => saveUserConfig(path, c) });
  try {
    await ui.listen();
  } catch (e) {
    if (e.code === 'EADDRINUSE') {
      log.warn(`ポート ${port} は使用中です。すでに起動しているかもしれないので、その画面を開きます`);
      if (!values['no-open']) openBrowser(url);
      return;
    }
    throw e;
  }

  engine.start({ mock: values.mock });
  log.ok(`操作画面: ${url}`);
  log.info('このウィンドウを閉じるとアプリが終了します');
  if (!values['no-open']) openBrowser(url);

  const shutdown = async () => {
    await engine.shutdown();
    await ui.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(async (e) => {
  log.error(e instanceof ConfigError ? e.message : `起動できませんでした: ${e.stack ?? e}`);
  await waitForEnter();
  process.exit(1);
});

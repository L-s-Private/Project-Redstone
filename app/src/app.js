// アプリ本体の起動（設定の読み込み・中核・操作画面のサーバー）。
// デスクトップ版（electron/main.js）と、開発用のブラウザ版（gui.js）の両方から使う。
import { appendFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { loadBundledMod } from './bundledMod.js';
import { Engine } from './engine.js';
import { createUiServer, DEFAULT_UI_PORT } from './server.js';
import { getSetupStatus, installAll, minecraftDir, updateModIfOutdated } from './setup.js';
import pkg from '../package.json' with { type: 'json' };
import { loadUserConfig, saveUserConfig } from './userConfig.js';

/**
 * @param {object} [options]
 * @param {boolean} [options.mock] TikTok につながない
 * @param {number} [options.port]
 * @param {(entry: {time: number, level: string, text: string}) => void} [options.onLog]
 * @returns {Promise<{url: string, engine: Engine, configPath: string, shutdown: () => Promise<void>}>}
 *   ポートが使えないときは code = 'EADDRINUSE' の Error を投げる
 */
export async function startApp({ mock = false, port = DEFAULT_UI_PORT, onLog = () => {} } = {}) {
  const { config, path: configPath, created, removed } = await loadUserConfig();
  const logFile = join(dirname(configPath), 'app.log');

  const engine = new Engine({ config, version: pkg.version });
  engine.on('log', (entry) => {
    onLog(entry);
    // 困ったときに送ってもらえるよう、ファイルにも残す
    const time = new Date(entry.time).toLocaleString('ja-JP', { hour12: false });
    appendFile(logFile, `${time} [${entry.level}] ${entry.text}\n`).catch(() => {});
  });

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

  const ui = createUiServer({ engine, port, setup, saveConfig: (c) => saveUserConfig(configPath, c) });
  await ui.listen();

  engine.log('info', `Project Redstone v${pkg.version} / 設定ファイル: ${configPath}${created ? '（新しく作りました）' : ''}`);
  await updateModIfOutdated({ dir, bundledMod, log: (level, text) => engine.log(level, text) }).catch((e) => {
    engine.log('warn', `MOD の更新を確かめられませんでした: ${e.message}`);
  });
  if (removed) engine.log('warn', `前の版の妨害（砂・雷・打ち上げ・回復）のルールを ${removed}件 取り除きました`);
  engine.start({ mock });

  return {
    url: `http://127.0.0.1:${port}/`,
    engine,
    configPath,
    shutdown: async () => {
      await engine.shutdown();
      await ui.close();
    },
  };
}

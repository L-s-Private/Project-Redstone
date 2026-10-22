// アプリ本体の起動（設定の読み込み・中核・操作画面のサーバー）。
// デスクトップ版（electron/main.js）と、開発用のブラウザ版（gui.js）の両方から使う。
import { appendFile, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { loadBundledMod } from './bundledMod.js';
import { Engine } from './engine.js';
import { writeFileSafely } from './files.js';
import { GiftCatalog } from './giftCatalog.js';
import { License, licenseConfig } from './license.js';
import { createIconSource } from './mcIcons.js';
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

  const giftCatalog = new GiftCatalog({ path: join(dirname(configPath), 'gifts.json') });
  // ギフトランキングは配信ごと。配信の途中で起動し直しても続きから数えるよう、ファイルに残す
  const rankingFile = join(dirname(configPath), 'ranking.json');
  const ranking = await readFile(rankingFile, 'utf8').then(JSON.parse).catch(() => ({}));
  // 配信ごとの分析（直近30日分）
  const analyticsFile = join(dirname(configPath), 'analytics.json');
  const analytics = await readFile(analyticsFile, 'utf8').then(JSON.parse).catch(() => ({}));
  // 妨害の設定の履歴（保存するたび）
  const historyFile = join(dirname(configPath), 'history.json');
  const history = await readFile(historyFile, 'utf8').then(JSON.parse).catch(() => ({}));
  const bundledMod = await loadBundledMod();
  // 有料版のライセンス。販売前（Polar の組織 ID が空）は使わない
  const { organizationId, api, checkoutUrl, portalUrl } = licenseConfig();
  const license = organizationId ? new License({ path: join(dirname(configPath), 'license.json'), organizationId, api, checkoutUrl, portalUrl }) : null;
  await license?.load();
  const engine = new Engine({
    license,
    config, version: pkg.version, giftCatalog, ranking,
    modVersion: bundledMod?.fileName.match(/^project-redstone-(.+)\.jar$/)?.[1] ?? '',
    saveRanking: (data) => writeFileSafely(rankingFile, `${JSON.stringify(data)}\n`),
    analytics,
    saveAnalytics: (data) => writeFileSafely(analyticsFile, `${JSON.stringify(data)}\n`),
    history,
    saveHistory: (data) => writeFileSafely(historyFile, `${JSON.stringify(data)}\n`),
  });
  // 思わぬエラーで、配信中にアプリごと止まらないようにする（ログに残して続ける）
  const onUnexpected = (e) => engine.log('error', `思わぬエラーが起きました（続けて動きます）: ${e?.stack ?? e}`);
  process.on('uncaughtException', onUnexpected);
  process.on('unhandledRejection', onUnexpected);
  engine.on('log', (entry) => {
    onLog(entry);
    // 困ったときに送ってもらえるよう、ファイルにも残す
    const time = new Date(entry.time).toLocaleString('ja-JP', { hour12: false });
    appendFile(logFile, `${time} [${entry.level}] ${entry.text}\n`).catch(() => {});
  });

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

  const icons = createIconSource({ dir });
  // マイクラ本体から先に読んでおく（最初に開いた画面で絵が遅れないように）
  icons.get('tnt_side').catch(() => {});
  const ui = createUiServer({ engine, port, setup, icons, saveConfig: (c) => saveUserConfig(configPath, c) });
  await ui.listen();

  engine.log('info', `STATIC ARC v${pkg.version} / 設定ファイル: ${configPath}${created ? '（新しく作りました）' : ''}`);
  await updateModIfOutdated({ dir, bundledMod, log: (level, text) => engine.log(level, text) }).catch((e) => {
    engine.log('warn', `MOD の更新を確かめられませんでした: ${e.message}`);
  });
  if (removed) engine.log('warn', `前の版の妨害（砂・雷・打ち上げ・回復）のルールを ${removed}件 取り除きました`);
  engine.start({ mock });
  license?.start();
  // ギフトの絵の一覧。取れなくても動くので待たない
  giftCatalog.load().then(
    () => engine.emitState(),
    (e) => {
      engine.log('warn', `ギフトの絵の一覧を取れませんでした（前に取った分を使います）: ${e.message}`);
      engine.emitState();
    },
  );

  return {
    url: `http://127.0.0.1:${port}/`,
    engine,
    configPath,
    shutdown: async () => {
      process.off('uncaughtException', onUnexpected);
      process.off('unhandledRejection', onUnexpected);
      license?.stop();
      await engine.shutdown();
      await ui.close();
    },
  };
}

#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { HELP, parseCommand } from './commands.js';
import { ConfigError, loadConfig } from './config.js';
import { Dispatcher } from './dispatcher.js';
import { log } from './log.js';
import { ModClient } from './modClient.js';
import { describeEvent } from './rules.js';
import { startTikTok } from './tiktok.js';

const SKIP_MESSAGES = {
  no_rule: '対応する妨害がないので無視しました',
  paused: '一時停止中なので出しませんでした',
  cooldown: 'クールダウン中なので出しませんでした',
};

async function main() {
  const { values } = parseArgs({
    options: {
      config: { type: 'string', short: 'c' },
      mock: { type: 'boolean', default: false },
    },
  });

  const configPath = values.config ?? (existsSync('config.json') ? 'config.json' : 'config.example.json');
  const config = await loadConfig(configPath);
  log.info(`設定ファイル: ${configPath}（ルール ${config.rules.length}件）`);

  if (!values.mock && !config.tiktokUsername) {
    throw new ConfigError('config.json の tiktokUsername に自分のTikTok IDを書いてください（試すだけなら --mock）');
  }

  const client = new ModClient(config.mod);
  const dispatcher = new Dispatcher({ rules: config.rules, client });

  client.on('status', ({ connected, players }) => {
    if (!connected) {
      log.warn('マイクラ（MOD）との接続が切れました。つなぎ直します…');
    } else if (players === 0) {
      log.warn('マイクラにつながりましたが、ワールドに入っていません');
    } else if (players !== null) {
      log.ok('マイクラ（MOD）につながりました。妨害を受け付けています');
    }
  });
  log.info(`マイクラ（MOD）を待っています: ${config.mod.host}:${config.mod.port}（ワールドを開くとつながります）`);
  client.start();

  const onEvent = async (event) => {
    log.gift(describeEvent(event));
    const result = await dispatcher.handle(event);
    if (result.status === 'sent') {
      log.ok(`  → ${result.action.type} ×${result.action.count} を出しました`);
    } else if (result.status === 'failed') {
      log.error(`  → 出せませんでした: ${result.error}`);
    } else {
      log.info(`  → ${SKIP_MESSAGES[result.status]}`);
    }
  };

  let tiktok = null;
  if (values.mock) {
    log.info('モックモードです。TikTokにはつながず、下のコマンドでギフトを試せます');
  } else {
    tiktok = await startTikTok({ username: config.tiktokUsername, onEvent, log });
  }
  console.log(HELP);

  const shutdown = async () => {
    client.stop();
    await tiktok?.stop();
    process.exit(0);
  };

  const rl = createInterface({ input: process.stdin });
  rl.on('line', (input) => {
    const parsed = parseCommand(input);
    switch (parsed.command) {
      case 'none':
        break;
      case 'event':
        onEvent(parsed.event);
        break;
      case 'pause':
        dispatcher.paused = true;
        log.warn('一時停止しました（resume で再開）');
        break;
      case 'resume':
        dispatcher.paused = false;
        log.ok('再開しました');
        break;
      case 'stop': {
        dispatcher.paused = true;
        const cleared = client.clear();
        log.warn(`全妨害ストップ: 待ち行列の ${cleared}件を取り消し、一時停止しました（resume で再開）`);
        break;
      }
      case 'status': {
        const { connected, players } = client.status;
        const { received, sent, skipped, failed } = dispatcher.stats;
        log.info(`MOD: ${connected ? `接続中（プレイヤー ${players ?? '?'}人）` : '未接続'} / ${dispatcher.paused ? '一時停止中' : '受付中'}`);
        log.info(`受信 ${received}件 / 妨害 ${sent}件 / 見送り ${skipped}件 / 失敗 ${failed}件`);
        break;
      }
      case 'help':
        console.log(HELP);
        break;
      case 'quit':
        shutdown();
        break;
      default:
        log.warn(`わからないコマンドです: ${parsed.input}（help で一覧）`);
    }
  });
  rl.on('close', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((e) => {
  log.error(e instanceof ConfigError ? e.message : `起動できませんでした: ${e.stack ?? e}`);
  process.exit(1);
});

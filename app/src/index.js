#!/usr/bin/env node
// ターミナル版。画面版は gui.js。
import { existsSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { HELP, parseCommand } from './commands.js';
import { ConfigError, loadConfig } from './config.js';
import { Engine } from './engine.js';
import { log } from './log.js';

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

  const engine = new Engine({ config });
  engine.on('log', ({ level, text }) => log[level](text));
  engine.start({ mock: values.mock });
  console.log(HELP);

  const shutdown = async () => {
    await engine.shutdown();
    process.exit(0);
  };

  const rl = createInterface({ input: process.stdin });
  rl.on('line', (input) => {
    const parsed = parseCommand(input);
    switch (parsed.command) {
      case 'none':
        break;
      case 'event':
        engine.handleEvent(parsed.event);
        break;
      case 'pause':
        engine.pause();
        break;
      case 'resume':
        engine.resume();
        break;
      case 'stop':
        engine.stopAll();
        break;
      case 'fill_start':
        engine.startFill({ width: 11, height: 9, countdown: 10 }).catch((e) => log.error(e.message));
        break;
      case 'fill_stop':
        engine.stopFill().catch((e) => log.error(e.message));
        break;
      case 'status': {
        const { mod, paused, stats } = engine.state;
        log.info(`MOD: ${mod.connected ? `接続中（プレイヤー ${mod.players ?? '?'}人）` : '未接続'} / ${paused ? '一時停止中' : '受付中'}`);
        log.info(`受信 ${stats.received}件 / 妨害 ${stats.sent}件 / 見送り ${stats.skipped}件 / 失敗 ${stats.failed}件`);
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

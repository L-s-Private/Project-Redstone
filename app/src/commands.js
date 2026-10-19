// 配信中にターミナルから打てるコマンド。モックモードではギフトの代わりにもなる。

export const HELP = [
  'コマンド:',
  '  gift <ギフト名> [個数]  テスト用にギフトを送ったことにする（例: gift Rose 5）',
  '  follow / share          テスト用にフォロー・シェアが来たことにする',
  '  like <回数>             テスト用にいいねが来たことにする（例: like 1000）',
  '  fill start / fill stop  埋め立てを始める（幅11・高さ9）/ 終える',
  '  pause / resume          妨害を一時停止 / 再開',
  '  stop                    待ち行列の妨害をすべて取り消し、一時停止する',
  '  status                  接続状態と集計を表示',
  '  help                    この説明',
  '  quit                    終了',
].join('\n');

/**
 * 1行のコマンドを解釈する。
 * @returns {{command: string, event?: object} | {command: 'unknown', input: string}}
 */
export function parseCommand(input) {
  const [name, ...args] = input.trim().split(/\s+/);
  switch (name?.toLowerCase()) {
    case '':
    case undefined:
      return { command: 'none' };
    case 'gift': {
      // 個数は最後の引数が数字のときだけ。ギフト名に空白が入っていてもよい
      const last = args.at(-1);
      const hasCount = args.length > 1 && /^\d+$/.test(last);
      const giftName = (hasCount ? args.slice(0, -1) : args).join(' ');
      if (!giftName) return { command: 'unknown', input };
      const count = hasCount ? Math.max(1, Number(last)) : 1;
      return { command: 'event', event: { kind: 'gift', giftId: '', giftName, diamonds: 0, count, from: 'テスト' } };
    }
    case 'like': {
      const count = Number(args[0]);
      if (!Number.isInteger(count) || count < 1) return { command: 'unknown', input };
      return { command: 'event', event: { kind: 'like', count, from: 'テスト' } };
    }
    case 'fill':
      if (args[0] === 'start' || args[0] === 'stop') return { command: `fill_${args[0]}` };
      return { command: 'unknown', input };
    case 'follow':
    case 'share':
      return { command: 'event', event: { kind: name.toLowerCase(), from: 'テスト' } };
    case 'pause':
    case 'resume':
    case 'stop':
    case 'status':
    case 'help':
    case 'quit':
    case 'exit':
      return { command: name.toLowerCase() === 'exit' ? 'quit' : name.toLowerCase() };
    default:
      return { command: 'unknown', input };
  }
}

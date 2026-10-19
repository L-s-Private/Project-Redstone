const useColor = process.stdout.isTTY && !process.env.NO_COLOR;

function paint(code, text) {
  return useColor ? `\x1b[${code}m${text}\x1b[0m` : text;
}

function time() {
  return new Date().toLocaleTimeString('ja-JP', { hour12: false });
}

function line(mark, text) {
  console.log(`${paint('2', time())} ${mark} ${text}`);
}

export const log = {
  info: (text) => line(paint('36', '●'), text),
  ok: (text) => line(paint('32', '✔'), text),
  warn: (text) => line(paint('33', '▲'), text),
  error: (text) => line(paint('31', '✖'), text),
  gift: (text) => line(paint('35', '🎁'), text),
};

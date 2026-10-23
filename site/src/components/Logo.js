import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ロゴは文字の色（currentColor）で塗る SVG。ページに直接埋め込む（ビルドのときに読む）
const svg = (name) => readFileSync(join(process.cwd(), 'public', 'brand', `${name}.svg`), 'utf8').trim();

// label を空にすると、読み上げでは飛ばす（リンクの側に名前があるとき）
export function Logo({ kind = 'logotype', className, label = 'STATIC ARC' }) {
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };
  return <span className={className} {...a11y} dangerouslySetInnerHTML={{ __html: svg(kind) }} />;
}

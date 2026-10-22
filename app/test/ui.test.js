import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PANEL_HTML } from '../src/ui/panel.js';
import { OVERLAY_HTML } from '../src/ui/overlay.js';
import { OVERLAY_PAGES } from '../src/ui/overlays.js';

/** ページの中の <script> を取り出す */
function scripts(html) {
  return [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
}

// 画面のプログラムは文字列としてページに埋め込むので、書き間違いがあってもほかのテストでは気づけない。
// ここで読めるか（文法が正しいか）だけを確かめる（動かしはしない）
test('操作画面のプログラムに書き間違いがない', () => {
  const list = scripts(PANEL_HTML);
  assert.ok(list.length > 0);
  for (const code of list) assert.doesNotThrow(() => new Function(code));
});

test('配信画面の部品のプログラムに書き間違いがない', () => {
  for (const [name, html] of Object.entries({ ...OVERLAY_PAGES, all: OVERLAY_HTML })) {
    const list = scripts(html);
    assert.ok(list.length > 0, name);
    for (const code of list) assert.doesNotThrow(() => new Function(code), name);
  }
});

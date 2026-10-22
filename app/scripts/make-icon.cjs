// アプリのアイコン（assets/brand/icon.svg）を PNG にする。ロゴを変えたら1回動かす:
//   npx electron scripts/make-icon.cjs
// できるもの: assets/brand/icon.png（512×512。exe・タスクバー・ウィンドウのアイコン）
const { app, BrowserWindow } = require('electron');
const { readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const SIZE = 512;
const dir = join(__dirname, '..', 'assets', 'brand');

app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const svg = readFileSync(join(dir, 'icon.svg'), 'utf8');
  const win = new BrowserWindow({
    width: SIZE, height: SIZE, show: false, frame: false, transparent: true, useContentSize: true,
    webPreferences: { offscreen: true, zoomFactor: 1 },
  });
  const html = `<html><body style="margin:0;background:transparent"><img style="display:block;width:${SIZE}px;height:${SIZE}px" src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}"></body></html>`;
  await win.loadURL('data:text/html;base64,' + Buffer.from(html).toString('base64'));
  await new Promise((r) => setTimeout(r, 500));
  const image = await win.webContents.capturePage({ x: 0, y: 0, width: SIZE, height: SIZE });
  writeFileSync(join(dir, 'icon.png'), image.resize({ width: SIZE, height: SIZE }).toPNG());
  console.log('icon.png', image.getSize());
  app.quit();
});

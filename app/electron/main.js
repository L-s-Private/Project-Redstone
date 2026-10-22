// デスクトップ版の入口。アプリ本体を起動して、操作画面を専用のウィンドウで開く。
// オーバーレイ（LIVE Studio に貼る URL）は同じサーバーから出す。
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { app, BrowserWindow, dialog, screen, shell } from 'electron';
import { startApp } from '../src/app.js';
import { ConfigError } from '../src/config.js';

// 製品名を STATIC ARC に変えても、画面の覚えている内容（最後に開いたタブなど）を引き継ぐため、前と同じ場所を使う
app.setPath('userData', join(app.getPath('appData'), 'Project Redstone'));

// 2つ目を起動したら、1つ目のウィンドウを前に出すだけにする
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  let window = null;
  let running = null;

  app.on('second-instance', () => {
    if (!window) return;
    if (window.isMinimized()) window.restore();
    window.focus();
  });

  app.whenReady().then(async () => {
    if (app.isPackaged) {
      // 配布版では MOD の jar を resources/mod に同梱している
      process.env.REDSTONE_MOD_DIR ??= join(process.resourcesPath, 'mod');
    }
    try {
      running = await startApp({ mock: process.argv.includes('--mock'), onLog: ({ level, text }) => console.log(`[${level}] ${text}`) });
    } catch (e) {
      const message = e instanceof ConfigError ? e.message
        : e.code === 'EADDRINUSE' ? 'ポート 25600 がほかのソフトに使われています。そのソフトを閉じてから起動してください。'
        : String(e.stack ?? e);
      dialog.showErrorBox('STATIC ARC を起動できませんでした', message);
      app.quit();
      return;
    }

    // いちばん多い画面（1920×1080。ノートの拡大125%なら 1536×864 相当）に合わせて、1280×800 で開く。
    // 小さい画面では、はみ出さないように縮める。いちばん小さくて 960×600（1920 の画面の半分に置ける大きさ）
    const area = screen.getPrimaryDisplay().workAreaSize;
    const fit = (size, room) => Math.min(size, Math.round(room * 0.92));
    window = new BrowserWindow({
      width: fit(1280, area.width),
      height: fit(800, area.height),
      minWidth: fit(960, area.width),
      minHeight: fit(600, area.height),
      useContentSize: true,
      center: true,
      title: 'STATIC ARC',
      backgroundColor: '#14161a',
      autoHideMenuBar: true,
      webPreferences: { contextIsolation: true, sandbox: true },
    });
    window.removeMenu();
    // 画面内のリンクはいつものブラウザで開く
    window.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });
    window.webContents.on('will-navigate', (event, url) => {
      if (!url.startsWith(running.url)) {
        event.preventDefault();
        shell.openExternal(url);
      }
    });
    await window.loadURL(running.url);

    // CI での動作確認用: 画面の中身を書き出し、撮れれば画面も撮って終わる
    const smoke = process.env.REDSTONE_SMOKE_RESULT;
    if (smoke) {
      setTimeout(async () => {
        const result = await window.webContents.executeJavaScript(
          `({ title: document.title, hasControls: !!document.getElementById('toggle'), mod: document.getElementById('modText')?.textContent })`,
        ).catch((e) => ({ error: String(e) }));
        await writeFile(`${smoke}.json`, JSON.stringify(result));
        try {
          await writeFile(`${smoke}.png`, (await window.webContents.capturePage()).toPNG());
        } catch {
          // 仮想画面では撮れないことがある。中身は JSON で確かめる
        }
        app.exit(result.hasControls ? 0 : 1);
      }, 3000);
    }
  });

  app.on('window-all-closed', () => app.quit());

  // 終了前に、TikTok と MOD との接続をきちんと閉じる
  let quitting = false;
  app.on('before-quit', (event) => {
    if (quitting || !running) return;
    event.preventDefault();
    quitting = true;
    running.shutdown().finally(() => app.quit());
  });
}

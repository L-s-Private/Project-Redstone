// デスクトップ版の入口。アプリ本体を起動して、操作画面を専用のウィンドウで開く。
// オーバーレイ（LIVE Studio に貼る URL）は同じサーバーから出す。
import { readFileSync, writeFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { app, BrowserWindow, dialog, screen, shell } from 'electron';
import { startApp } from '../src/app.js';
import { ConfigError } from '../src/config.js';
import { ASSETS_DIR } from '../src/assets.js';
import { restoreBounds } from '../src/windowBounds.js';
import { browserDir, moveOldFolders } from '../src/userConfig.js';

// 画面の一時ファイルは設定と同じフォルダの中に置く。0.45 までのフォルダ（開発中の名前）があれば、先に移して中身を引き継ぐ
moveOldFolders();
app.setPath('userData', browserDir());

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
      // テストの画面は開発のときだけ（exe では隠す）
      running = await startApp({ mock: process.argv.includes('--mock'), debug: !app.isPackaged, onLog: ({ level, text }) => console.log(`[${level}] ${text}`) });
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
    // 前に閉じたときの大きさ・位置があれば、そこで開く（モニターを外したなどで見えない位置なら使わない）
    const area = screen.getPrimaryDisplay().workAreaSize;
    const fit = (size, room) => Math.min(size, Math.round(room * 0.92));
    const min = { minWidth: fit(960, area.width), minHeight: fit(600, area.height) };
    const boundsFile = join(app.getPath('userData'), 'window.json');
    let saved = null;
    try {
      saved = restoreBounds(JSON.parse(readFileSync(boundsFile, 'utf8')), screen.getAllDisplays().map((d) => d.workArea), min);
    } catch {
      // 初めて開いたとき・壊れていたときは、ふつうの大きさで開く
    }
    window = new BrowserWindow({
      ...(saved ? { x: saved.x, y: saved.y, width: saved.width, height: saved.height } : { width: fit(1280, area.width), height: fit(800, area.height), useContentSize: true, center: true }),
      ...min,
      title: 'STATIC ARC',
      // タスクバーとウィンドウのアイコン（ロゴのマーク。exe のアイコンは package.json の build.win.icon）
      icon: join(ASSETS_DIR, 'brand', 'icon.png'),
      // 開いた瞬間に色がちらつかないよう、操作画面の背景と同じ色
      backgroundColor: '#0a0a0a',
      autoHideMenuBar: true,
      webPreferences: { contextIsolation: true, sandbox: true },
    });
    window.removeMenu();
    if (saved?.maximized) window.maximize();
    // 閉じるときに、最大化する前の大きさ・位置と、最大化していたかを覚える
    window.on('close', () => {
      try {
        writeFileSync(boundsFile, JSON.stringify({ ...window.getNormalBounds(), maximized: window.isMaximized() }));
      } catch {
        // 覚えられなくても、閉じるのは止めない
      }
    });
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

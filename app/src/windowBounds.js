// 操作画面のウィンドウの大きさと位置を覚えておき、次に開くときに戻す。
// Electron に依存しない部分（覚えた値が使えるかの判定）だけをここに置き、テストする。

/** 見出しの部分がこれだけ画面に入っていれば、つかんで動かせる */
const GRAB_W = 120;
const GRAB_H = 40;

/**
 * 覚えていた大きさ・位置を、いまの画面で使える形にして返す。使えなければ null（ふつうの大きさで開く）。
 * - モニターを外した・解像度を下げたなどで見出しが画面の外に出るときは使わない
 * - 小さすぎる値は最小の大きさに、大きすぎる値は画面に収まる大きさに直す
 * @param {unknown} saved 覚えていた値 {x, y, width, height, maximized}
 * @param {Array<{x: number, y: number, width: number, height: number}>} workAreas 各モニターの使える範囲
 * @param {{minWidth: number, minHeight: number}} min
 */
export function restoreBounds(saved, workAreas, min) {
  if (!saved || typeof saved !== 'object') return null;
  const { x, y, width, height } = /** @type {Record<string, unknown>} */ (saved);
  if (![x, y, width, height].every((v) => Number.isFinite(v))) return null;
  const area = workAreas.find((a) => overlap(a, { x, y, width, height: GRAB_H }) >= GRAB_W * GRAB_H / 2);
  if (!area) return null;
  return {
    x: Math.round(/** @type {number} */ (x)),
    y: Math.round(/** @type {number} */ (y)),
    width: Math.round(Math.min(Math.max(/** @type {number} */ (width), min.minWidth), area.width)),
    height: Math.round(Math.min(Math.max(/** @type {number} */ (height), min.minHeight), area.height)),
    maximized: /** @type {Record<string, unknown>} */ (saved).maximized === true,
  };
}

/** 2つの四角が重なる面積 */
function overlap(a, b) {
  const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

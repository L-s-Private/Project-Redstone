import assert from 'node:assert/strict';
import { test } from 'node:test';
import { restoreBounds } from '../src/windowBounds.js';

const MAIN = { x: 0, y: 0, width: 1920, height: 1040 };
const RIGHT = { x: 1920, y: 0, width: 2560, height: 1400 };
const MIN = { minWidth: 960, minHeight: 600 };

test('ウィンドウ: 前の大きさ・位置で開く', () => {
  assert.deepEqual(restoreBounds({ x: 100, y: 50, width: 1300, height: 820, maximized: false }, [MAIN], MIN), { x: 100, y: 50, width: 1300, height: 820, maximized: false });
  assert.equal(restoreBounds({ x: 100, y: 50, width: 1300, height: 820, maximized: true }, [MAIN], MIN).maximized, true);
  // 2つ目のモニター
  assert.equal(restoreBounds({ x: 2000, y: 100, width: 1300, height: 820 }, [MAIN, RIGHT], MIN).x, 2000);
});

test('ウィンドウ: 見えない位置・壊れた値なら使わない', () => {
  // 2つ目のモニターを外した
  assert.equal(restoreBounds({ x: 2000, y: 100, width: 1300, height: 820 }, [MAIN], MIN), null);
  // 見出しが画面の上にはみ出している
  assert.equal(restoreBounds({ x: 100, y: -500, width: 1300, height: 820 }, [MAIN], MIN), null);
  for (const bad of [null, 'x', {}, { x: 'a', y: 0, width: 1, height: 1 }, { x: NaN, y: 0, width: 1000, height: 700 }]) {
    assert.equal(restoreBounds(bad, [MAIN], MIN), null);
  }
});

test('ウィンドウ: 小さすぎ・大きすぎは直す', () => {
  assert.deepEqual(restoreBounds({ x: 0, y: 0, width: 100, height: 100 }, [MAIN], MIN), { x: 0, y: 0, width: 960, height: 600, maximized: false });
  assert.deepEqual(restoreBounds({ x: 0, y: 0, width: 5000, height: 3000 }, [MAIN], MIN), { x: 0, y: 0, width: 1920, height: 1040, maximized: false });
});

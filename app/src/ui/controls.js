// 操作画面の入力部品。ブラウザの標準の見た目（プルダウン・数の上下ボタン・色の窓・チェック・スライダー・候補の一覧・
// マウスを置いたときの説明・右クリックのメニュー）を使わず、画面のデザインに合わせて作り直す。
// 値はもとの <select> / <input> に持たせたまま（ほかのプログラムはこれまでどおり .value を読み書きし、input / change を受け取る）。
// 後から足された部品も、自動で作り直す（enhanceControls と MutationObserver）。

export const CONTROLS_CSS = String.raw`
  /* ---- 浮かぶ面（プルダウンの一覧・色・右クリックのメニュー・説明）に共通 ---- */
  .pop {
    position: fixed; z-index: 1000; background: var(--raised); border: 1px solid var(--line); border-radius: var(--radius-sm);
    box-shadow: 0 12px 32px rgba(0, 0, 0, .55), 0 2px 6px rgba(0, 0, 0, .4); color: var(--text);
    animation: pop-in .12s ease-out;
  }
  @keyframes pop-in { from { opacity: 0; transform: translateY(-3px); } to { opacity: 1; transform: none; } }
  .pop.up { animation-name: pop-in-up; }
  @keyframes pop-in-up { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: none; } }

  /* ---- プルダウン ---- */
  .dd { position: relative; display: inline-flex; min-width: 0; max-width: 100%; }
  .setting-control .dd, label > .dd { width: 100%; }
  .dd > select { display: none; }
  .dd-trigger {
    width: 100%; height: 32px; justify-content: space-between; gap: 10px; padding: 0 10px 0 12px; text-align: left;
    background: var(--bg); border-color: var(--line); font-weight: 400;
  }
  .dd-trigger:hover { background: var(--bg); border-color: #3a3a3a; }
  .dd-trigger[aria-expanded="true"], .dd-trigger:focus-visible { border-color: var(--text); outline: none; }
  .dd-value { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .dd-trigger svg, .combo-caret { width: 12px; height: 12px; flex: none; color: var(--muted); transition: transform .15s; }
  .dd-trigger[aria-expanded="true"] svg { transform: rotate(180deg); }
  .dd-menu { padding: 4px; overflow-y: auto; overscroll-behavior: contain; }
  .dd-option {
    display: flex; align-items: center; gap: 8px; padding: 7px 10px 7px 8px; border-radius: 4px; cursor: pointer;
    font-size: 13px; line-height: 1.4; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .dd-option .tick { width: 14px; height: 14px; flex: none; opacity: 0; color: var(--text); }
  .dd-option[aria-selected="true"] { color: var(--text); font-weight: 700; }
  .dd-option[aria-selected="true"] .tick { opacity: 1; }
  .dd-option.active { background: var(--hover); color: var(--text); }
  .dd-option[aria-disabled="true"] { opacity: .4; cursor: default; }
  .dd-empty { padding: 8px 10px; font-size: 13px; color: var(--faint); }
  /* 候補の一覧は、選んだ印の代わりに絵 */
  .combo-menu .dd-option .tick { display: none; }
  .combo-menu .dd-option img { width: 22px; height: 22px; object-fit: contain; flex: none; }
  input::placeholder { color: var(--faint); }
  /* 前に打った内容の自動入力で、欄の色が変わらないように */
  input:-webkit-autofill { -webkit-text-fill-color: var(--text); box-shadow: 0 0 0 40px var(--bg) inset; caret-color: var(--text); }

  /* ---- 数の入力（− と ＋。押しっぱなしで続けて変わる） ---- */
  .stepper {
    display: inline-flex; align-items: center; height: 32px; overflow: hidden; flex: none; vertical-align: middle;
    border: 1px solid var(--line); border-radius: var(--radius-sm); background: var(--bg);
  }
  .stepper:hover { border-color: #3a3a3a; }
  .stepper:focus-within { border-color: var(--text); }
  .stepper:has(input:user-invalid) { border-color: var(--warn); }
  .stepper:has(input:disabled) { opacity: .45; }
  .stepper button { width: 30px; height: 100%; padding: 0; border: 0; border-radius: 0; background: transparent; color: var(--muted); font-size: 15px; flex: none; }
  .stepper button:hover:not(:disabled) { background: var(--raised); color: var(--text); }
  .stepper button:disabled { opacity: .3; }
  .stepper input { width: 64px; height: 100%; padding: 0 4px; border: 0; border-radius: 0; background: transparent; text-align: right; }
  .stepper input:focus { border: 0; }
  .stepper .unit { padding: 0 6px 0 3px; color: var(--muted); font-size: 13px; white-space: nowrap; }
  .stepper .unit:empty { display: none; }
  /* 設定の行では、単位の幅をそろえて縦に並べる */
  .setting .stepper .unit { display: inline-block; min-width: 2.6em; }
  input[type="number"] { -moz-appearance: textfield; }
  input[type="number"]::-webkit-inner-spin-button, input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  input:user-invalid { border-color: var(--warn); }

  /* ---- チェック ---- */
  input[type="checkbox"] {
    appearance: none; width: 18px; height: 18px; margin: 0; padding: 0; flex: none; cursor: pointer; vertical-align: middle;
    border: 1px solid var(--line); border-radius: 4px; background: var(--bg) center / 12px no-repeat;
    transition: background-color .12s, border-color .12s;
  }
  input[type="checkbox"]:hover { border-color: #4a4a4a; }
  input[type="checkbox"]:checked {
    background-color: var(--invert-bg); border-color: var(--invert-bg);
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='%230a0a0a' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3.5 8.5l3 3 6-7'/%3E%3C/svg%3E");
  }
  input[type="checkbox"]:disabled { opacity: .4; cursor: default; }
  input[type="checkbox"]:focus-visible { outline: 2px solid var(--text); outline-offset: 2px; }

  /* ---- スライダー（--p は左から塗る割合） ---- */
  input[type="range"] {
    appearance: none; height: 20px; padding: 0; border: 0; background: transparent; cursor: pointer; --p: 50%;
  }
  input[type="range"]::-webkit-slider-runnable-track {
    height: 4px; border-radius: 2px; background: linear-gradient(90deg, var(--text) var(--p), var(--line) var(--p));
  }
  input[type="range"]::-webkit-slider-thumb {
    appearance: none; width: 16px; height: 16px; margin-top: -6px; border-radius: 50%;
    background: var(--invert-bg); border: 3px solid var(--bg); box-shadow: 0 0 0 1px var(--line);
  }
  input[type="range"]:hover::-webkit-slider-thumb, input[type="range"]:focus-visible::-webkit-slider-thumb { box-shadow: 0 0 0 1px var(--text), 0 0 0 5px rgba(237, 237, 237, .12); }
  input[type="range"]:focus-visible { outline: none; }

  /* ---- 色 ---- */
  .color-trigger { width: 34px; height: 32px; padding: 3px; background: var(--bg); flex: none; }
  .color-trigger span { display: block; width: 100%; height: 100%; border-radius: 3px; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .14); }
  .color-trigger[aria-expanded="true"] { border-color: var(--text); }
  .color-pop { width: 236px; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
  .color-sv { position: relative; height: 140px; border-radius: 4px; cursor: crosshair; touch-action: none;
    background-image: linear-gradient(0deg, #000, transparent), linear-gradient(90deg, #fff, transparent); }
  .color-hue { position: relative; height: 12px; border-radius: 6px; cursor: pointer; touch-action: none;
    background: linear-gradient(90deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00); }
  .color-knob { position: absolute; width: 14px; height: 14px; margin: -7px 0 0 -7px; border-radius: 50%; border: 2px solid #fff;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, .5), 0 1px 4px rgba(0, 0, 0, .5); pointer-events: none; }
  .color-hue .color-knob { top: 50%; }
  .color-presets { display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px; }
  .color-presets button { aspect-ratio: 1; height: auto; padding: 0; border-radius: 4px; border: 1px solid rgba(255, 255, 255, .14); }
  .color-presets button:hover { transform: scale(1.12); }
  .color-presets button.on { box-shadow: 0 0 0 2px var(--raised), 0 0 0 3px var(--text); }
  .color-hex { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--muted); }
  .color-hex input { font-variant-numeric: tabular-nums; text-transform: uppercase; }

  /* ---- 開け閉めする説明（▸） ---- */
  summary { list-style: none; display: flex; align-items: center; gap: 6px; cursor: pointer; user-select: none; }
  summary::-webkit-details-marker { display: none; }
  summary::before {
    content: ""; width: 10px; height: 10px; flex: none; opacity: .7; transition: transform .15s;
    background: currentColor;
    -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'%3E%3Cpath d='M3 1.5 6.5 5 3 8.5' fill='none' stroke='%23000' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center / contain no-repeat;
  }
  details[open] > summary::before { transform: rotate(90deg); }

  /* ---- マウスを置いたときの説明 ---- */
  .tip {
    position: fixed; z-index: 1001; max-width: 320px; padding: 6px 10px; pointer-events: none;
    background: var(--invert-bg); color: var(--invert-text); border-radius: 5px; font-size: 12px; font-weight: 600; line-height: 1.5;
    box-shadow: 0 6px 18px rgba(0, 0, 0, .45); animation: pop-in .1s ease-out;
  }

  /* ---- 右クリックのメニュー ---- */
  .ctx-menu { min-width: 168px; padding: 4px; }
  .ctx-menu button {
    width: 100%; justify-content: space-between; gap: 24px; padding: 6px 10px; border: 0; border-radius: 4px;
    background: transparent; color: var(--text); font-size: 13px; font-weight: 400;
  }
  .ctx-menu button:hover:not(:disabled), .ctx-menu button.active { background: var(--hover); }
  .ctx-menu kbd { font: inherit; font-size: 12px; color: var(--faint); }
  .ctx-menu hr { border: 0; border-top: 1px solid var(--line); margin: 4px 2px; }
`;

export const CONTROLS_JS = String.raw`
  // ---- 浮かぶ面の置き場所 ----
  // モーダルの窓（dialog）の中の部品は、窓の上に出るように窓の中に置く（body に置くと窓の下に隠れる）
  function popHost(anchor) {
    return anchor.closest('dialog[open]') ?? document.body;
  }
  /** 部品の下（入らなければ上）に出す。幅は部品に合わせる（minWidth 以上） */
  function placePop(pop, anchor, { minWidth = 0, matchWidth = true, gap = 4, maxHeight = 320 } = {}) {
    const r = anchor.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    if (matchWidth) pop.style.minWidth = Math.max(minWidth, r.width) + 'px';
    pop.style.maxHeight = '';
    const below = vh - r.bottom - gap - 8;
    const above = r.top - gap - 8;
    const natural = pop.offsetHeight;
    const up = natural > below && above > below;
    const room = Math.min(maxHeight, Math.max(120, up ? above : below));
    if (natural > room) pop.style.maxHeight = room + 'px';
    const height = Math.min(natural, room);
    pop.style.top = (up ? r.top - gap - height : r.bottom + gap) + 'px';
    pop.style.left = Math.max(8, Math.min(r.left, vw - pop.offsetWidth - 8)) + 'px';
    pop.classList.toggle('up', up);
  }
  // 開いている浮かぶ面は1つだけ。外を押す・画面が動く・窓の大きさが変わると閉じる
  let openPop = null;
  function closePop() {
    const current = openPop;
    openPop = null;
    current?.close();
  }
  function showPop(handle) {
    if (openPop && openPop !== handle) closePop();
    openPop = handle;
  }
  document.addEventListener('pointerdown', (e) => {
    if (openPop && !openPop.contains(e.target)) closePop();
  }, true);
  // 画面が動いたら、部品についていく（部品が見えなくなったら閉じる）
  addEventListener('scroll', (e) => {
    if (!openPop || (e.target instanceof Node && openPop.pop?.contains(e.target))) return;
    const anchor = openPop.anchor;
    const r = anchor?.getBoundingClientRect();
    if (!anchor || !openPop.pop || r.bottom < 0 || r.top > document.documentElement.clientHeight || !anchor.isConnected) return closePop();
    placePop(openPop.pop, anchor, openPop.place);
  }, true);
  addEventListener('resize', closePop);
  addEventListener('blur', closePop);

  const CARET_SVG = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4.5 6 7.5 9 4.5"/></svg>';
  const TICK_SVG = '<svg class="tick" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.5l3 3 6-7"/></svg>';
  let popSeq = 0;

  /** プログラムが .value などを書き換えたときにも、見た目を合わせる */
  function watchValue(node, props, onSet) {
    for (const prop of props) {
      let proto = Object.getPrototypeOf(node);
      let desc;
      while (proto && !(desc = Object.getOwnPropertyDescriptor(proto, prop))) proto = Object.getPrototypeOf(proto);
      if (!desc?.set) continue;
      Object.defineProperty(node, prop, {
        configurable: true,
        get() { return desc.get.call(this); },
        set(v) { desc.set.call(this, v); onSet(); },
      });
    }
  }
  /** 値を変えて、input と change を出す（ほかのプログラムが受け取る） */
  function commit(node, value) {
    node.value = value;
    node.dispatchEvent(new Event('input', { bubbles: true }));
    node.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // ---- 一覧（プルダウンと候補で共通）----
  /**
   * items: [{ value, text, disabled }]、selected: 選ばれている value、onPick(value)
   * @returns {{ el, move(dir), pick(), activeValue() }}
   */
  function listbox(items, selected, onPick, id, decorate = null) {
    const box = document.createElement('div');
    box.className = 'pop dd-menu';
    box.setAttribute('role', 'listbox');
    box.id = id;
    let active = Math.max(0, items.findIndex((it) => it.value === selected));
    const nodes = items.map((it, i) => {
      const node = document.createElement('div');
      node.className = 'dd-option';
      node.id = id + '-' + i;
      node.setAttribute('role', 'option');
      node.setAttribute('aria-selected', String(it.value === selected));
      if (it.disabled) node.setAttribute('aria-disabled', 'true');
      node.innerHTML = TICK_SVG;
      // 候補に絵を付ける（ギフトの絵など）
      const icon = decorate?.(it.value);
      if (icon?.nodeType === 1) node.append(icon);
      node.append(it.text);
      node.addEventListener('pointerdown', (e) => e.preventDefault());
      node.addEventListener('pointermove', () => setActive(i, false));
      node.addEventListener('click', () => !it.disabled && onPick(it.value));
      return node;
    });
    if (items.length === 0) box.append(Object.assign(document.createElement('div'), { className: 'dd-empty', textContent: '見つかりません' }));
    box.append(...nodes);
    function setActive(i, scroll = true) {
      if (!nodes.length) return;
      active = (i + nodes.length) % nodes.length;
      nodes.forEach((n, j) => n.classList.toggle('active', j === active));
      if (scroll) nodes[active].scrollIntoView({ block: 'nearest' });
      box.dispatchEvent(new CustomEvent('activechange', { detail: nodes[active].id }));
    }
    return {
      el: box,
      setActive,
      move(dir) {
        if (!nodes.length) return;
        // 何も選んでいないときは、下なら先頭・上なら最後から
        let i = active < 0 ? (dir > 0 ? -1 : nodes.length) : active;
        for (let next = i + dir; next >= 0 && next < nodes.length; next += dir) {
          if (!items[next].disabled) {
            i = next;
            break;
          }
        }
        if (i >= 0 && i < nodes.length) setActive(i);
      },
      pick() {
        if (nodes.length && !items[active].disabled) onPick(items[active].value);
      },
      get active() { return active; },
      clearActive() {
        active = -1;
        nodes.forEach((n) => n.classList.remove('active'));
      },
    };
  }

  // ---- プルダウン ----
  function enhanceSelect(sel) {
    if (sel.dataset.enhanced || sel.hasAttribute('data-tiles') || sel.hidden || sel.multiple) return;
    sel.dataset.enhanced = '1';
    const wrap = document.createElement('span');
    wrap.className = 'dd';
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'dd-trigger';
    trigger.setAttribute('role', 'combobox');
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    const valueText = document.createElement('span');
    valueText.className = 'dd-value';
    trigger.append(valueText);
    trigger.insertAdjacentHTML('beforeend', CARET_SVG);
    sel.before(wrap);
    wrap.append(sel, trigger);
    sel.tabIndex = -1;
    const name = sel.getAttribute('aria-label') || (sel.id && document.querySelector('label[for="' + sel.id + '"]')?.textContent) || '';
    if (name) trigger.setAttribute('aria-label', name.trim());

    const sync = () => {
      valueText.textContent = sel.selectedOptions[0]?.textContent ?? '';
      trigger.disabled = sel.disabled;
    };
    watchValue(sel, ['value', 'selectedIndex'], sync);
    new MutationObserver(sync).observe(sel, { attributes: true, attributeFilter: ['disabled'], childList: true, subtree: true });
    sync();

    let list = null;
    const handle = {
      pop: null,
      anchor: trigger,
      place: { minWidth: 160 },
      contains: (node) => wrap.contains(node) || !!list?.el.contains(node),
      close() {
        list?.el.remove();
        list = null;
        handle.pop = null;
        trigger.setAttribute('aria-expanded', 'false');
        trigger.removeAttribute('aria-activedescendant');
      },
    };
    function open() {
      if (sel.disabled) return;
      showPop(handle);
      const items = [...sel.options].map((o) => ({ value: o.value, text: o.textContent, disabled: o.disabled }));
      list = listbox(items, sel.value, (value) => {
        closePop();
        trigger.focus();
        if (value !== sel.value) commit(sel, value);
      }, 'dd' + (++popSeq));
      handle.pop = list.el;
      list.el.addEventListener('activechange', (e) => trigger.setAttribute('aria-activedescendant', e.detail));
      trigger.setAttribute('aria-controls', list.el.id);
      popHost(trigger).append(list.el);
      placePop(list.el, trigger, { minWidth: 160 });
      list.setActive(list.active);
      trigger.setAttribute('aria-expanded', 'true');
    }
    trigger.addEventListener('click', () => (list ? closePop() : open()));
    trigger.addEventListener('keydown', (e) => {
      if (!list) {
        if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
          e.preventDefault();
          open();
        }
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        list.move(e.key === 'ArrowDown' ? 1 : -1);
      } else if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        list.setActive(e.key === 'Home' ? 0 : sel.options.length - 1);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        list.pick();
      } else if (e.key === 'Escape') {
        // 窓（dialog）ごと閉じないように
        e.preventDefault();
        e.stopPropagation();
        closePop();
      } else if (e.key === 'Tab') {
        closePop();
      }
    });
  }
  // ラベルを押したら、隠したもとの部品ではなく、作り直した部品へ
  document.addEventListener('click', (e) => {
    const label = e.target.closest?.('label[for]');
    if (!label) return;
    const target = document.getElementById(label.htmlFor);
    if (target?.dataset.enhanced && target.tagName === 'SELECT') {
      e.preventDefault();
      target.parentElement.querySelector('.dd-trigger')?.focus();
    }
    if (target?.dataset.enhanced && target.type === 'color') {
      e.preventDefault();
      target.parentElement.querySelector('.color-trigger')?.focus();
    }
  });

  // ---- 数の入力 ----
  const decimals = (n) => (String(n).split('.')[1] ?? '').length;
  /** 範囲に収め、刻みに合わせる（data-strict のものは打った値をそのまま残す。空は空のまま） */
  function normalizeNumber(input) {
    if (input.dataset.strict !== undefined || input.value === '') return;
    let v = Number(input.value);
    if (!Number.isFinite(v)) {
      input.value = '';
      return;
    }
    const min = input.min === '' ? null : Number(input.min);
    const max = input.max === '' ? null : Number(input.max);
    const step = input.step === 'any' ? null : Number(input.step || 1);
    if (step) {
      const base = min ?? 0;
      v = base + Math.round((v - base) / step) * step;
      v = Number(v.toFixed(decimals(step)));
    }
    if (min !== null && v < min) v = min;
    if (max !== null && v > max) {
      v = max;
      if (step) v = (min ?? 0) + Math.floor((max - (min ?? 0)) / step) * step;
    }
    if (String(v) !== input.value) {
      input.value = String(v);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
  function enhanceNumber(input) {
    if (input.dataset.enhanced) return;
    input.dataset.enhanced = '1';
    input.inputMode = Number(input.step) % 1 ? 'decimal' : 'numeric';
    const box = document.createElement('span');
    box.className = 'stepper';
    const minus = Object.assign(document.createElement('button'), { type: 'button', textContent: '−', tabIndex: -1 });
    const plus = Object.assign(document.createElement('button'), { type: 'button', textContent: '＋', tabIndex: -1 });
    minus.setAttribute('aria-label', '減らす');
    plus.setAttribute('aria-label', '増やす');
    const unit = Object.assign(document.createElement('span'), { className: 'unit', textContent: input.dataset.unit ?? '' });
    input.before(box);
    box.append(minus, input, unit, plus);
    const limits = () => {
      const v = Number(input.value);
      const filled = input.value !== '' && Number.isFinite(v);
      minus.disabled = input.disabled || (filled && input.min !== '' && v <= Number(input.min));
      plus.disabled = input.disabled || (filled && input.max !== '' && v >= Number(input.max));
    };
    const step = (dir) => {
      if (input.disabled) return;
      const inc = Number(input.dataset.step || input.step) || 1;
      const min = input.min === '' ? null : Number(input.min);
      const max = input.max === '' ? null : Number(input.max);
      let v = Number(input.value);
      if (input.value === '' || !Number.isFinite(v)) v = min ?? 0;
      else v = Number((v + dir * inc).toFixed(Math.max(decimals(inc), decimals(v))));
      if (min !== null && v < min) v = min;
      if (max !== null && v > max) v = max;
      input.value = String(v);
      normalizeNumber(input);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    };
    // 押しっぱなしで続けて変える（0.4秒待ってから、だんだん速く）
    for (const [button, dir] of [[minus, -1], [plus, 1]]) {
      let timer = null;
      const stop = () => clearTimeout(timer);
      button.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || button.disabled) return;
        e.preventDefault();
        step(dir);
        let delay = 400;
        const repeat = () => {
          timer = setTimeout(() => {
            if (button.disabled) return;
            step(dir);
            delay = Math.max(40, delay * 0.8);
            repeat();
          }, delay);
        };
        repeat();
      });
      for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) button.addEventListener(ev, stop);
      // キーボードの Enter など（pointerdown を通らない押し方）
      button.addEventListener('click', (e) => e.detail === 0 && step(dir));
    }
    input.addEventListener('keydown', (e) => {
      // 数の欄に入らない文字（e は 10の何乗、+ は符号）は打てなくする
      const negative = input.min === '' || Number(input.min) < 0;
      const fraction = Number(input.step) % 1 !== 0;
      if (e.key === 'e' || e.key === 'E' || e.key === '+' || (e.key === '-' && !negative) || ((e.key === '.' || e.key === ',') && !fraction)) {
        e.preventDefault();
      }
    });
    // 日本語入力のまま打った全角の数字（１２）は、半角にして入れる（そのままだと欄が空になる）
    let beforeComposition = '';
    input.addEventListener('compositionstart', () => (beforeComposition = input.value));
    input.addEventListener('compositionend', (e) => {
      const typed = (e.data ?? '').normalize('NFKC').replace(/[ー－−]/g, '-').replace(/[^0-9.\-]/g, '');
      const next = beforeComposition + typed;
      input.value = Number.isFinite(Number(next)) && next !== '' ? next : beforeComposition;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    // 選んだままホイールを回すと、気づかずに数が変わるので、そのときは選ぶのをやめてページを動かす
    input.addEventListener('wheel', () => {
      if (document.activeElement === input) input.blur();
    }, { passive: true });
    input.addEventListener('change', () => {
      normalizeNumber(input);
      limits();
    }, true);
    input.addEventListener('input', limits);
    watchValue(input, ['value'], limits);
    new MutationObserver(limits).observe(input, { attributes: true, attributeFilter: ['disabled', 'min', 'max'] });
    limits();
  }

  // ---- スライダー ----
  function enhanceRange(input) {
    if (input.dataset.enhanced) return;
    input.dataset.enhanced = '1';
    const paint = () => {
      const min = Number(input.min || 0), max = Number(input.max || 100);
      input.style.setProperty('--p', ((Number(input.value) - min) / (max - min || 1)) * 100 + '%');
    };
    input.addEventListener('input', paint);
    watchValue(input, ['value'], paint);
    paint();
  }

  // ---- 色 ----
  const COLOR_PRESETS = ['#ffffff', '#ededed', '#a6a6a6', '#5c5c5c', '#1b1b1d', '#000000', '#ff5a5a', '#ff8a3d',
    '#ffc93d', '#8be04e', '#3ddc97', '#3dc8ff', '#4d7cff', '#8f6bff', '#e05bff', '#ff5fa2'];
  const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const rgbToHex = (rgb) => '#' + rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('');
  function rgbToHsv([r, g, b]) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), d = max - Math.min(r, g, b);
    let h = 0;
    if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [(h * 60 + 360) % 360, max ? d / max : 0, max];
  }
  function hsvToRgb([h, s, v]) {
    const f = (n) => {
      const k = (n + h / 60) % 6;
      return (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255;
    };
    return [f(5), f(3), f(1)];
  }
  function enhanceColor(input) {
    if (input.dataset.enhanced) return;
    input.dataset.enhanced = '1';
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'color-trigger';
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-expanded', 'false');
    const name = input.id && document.querySelector('label[for="' + input.id + '"]')?.textContent;
    if (name) trigger.setAttribute('aria-label', name.trim() + '（色を選ぶ）');
    const chip = document.createElement('span');
    trigger.append(chip);
    input.hidden = true;
    input.after(trigger);
    // 色の横の文字（#FFFFFF）も押せるようにする
    const code = input.parentElement.querySelector('code');
    const sync = () => {
      chip.style.background = input.value;
      if (code) code.textContent = input.value.toUpperCase();
    };
    watchValue(input, ['value'], sync);
    sync();

    let pop = null;
    const handle = {
      pop: null,
      anchor: trigger,
      place: { matchWidth: false },
      contains: (node) => trigger.contains(node) || !!pop?.contains(node),
      close() {
        // 動かしている途中で閉じたら、そこまでの色で決める
        if (pop && pop.dataset.dirty) input.dispatchEvent(new Event('change', { bubbles: true }));
        pop?.remove();
        pop = null;
        handle.pop = null;
        trigger.setAttribute('aria-expanded', 'false');
      },
    };
    function open() {
      showPop(handle);
      let hsv = rgbToHsv(hexToRgb(input.value || '#ffffff'));
      pop = document.createElement('div');
      pop.className = 'pop color-pop';
      pop.setAttribute('role', 'dialog');
      pop.setAttribute('aria-label', trigger.getAttribute('aria-label') || '色を選ぶ');
      pop.innerHTML = '<div class="color-sv"><span class="color-knob"></span></div><div class="color-hue"><span class="color-knob"></span></div>'
        + '<div class="color-presets"></div><label class="color-hex">カラーコード<input maxlength="7" spellcheck="false" autocomplete="off"></label>';
      const sv = pop.querySelector('.color-sv'), hue = pop.querySelector('.color-hue'), hex = pop.querySelector('.color-hex input');
      const presets = pop.querySelector('.color-presets');
      for (const color of COLOR_PRESETS) {
        const b = Object.assign(document.createElement('button'), { type: 'button' });
        b.style.background = color;
        b.dataset.color = color;
        b.setAttribute('aria-label', color);
        b.addEventListener('click', () => {
          hsv = rgbToHsv(hexToRgb(color));
          apply(true);
        });
        presets.append(b);
      }
      function apply(final) {
        const value = rgbToHex(hsvToRgb(hsv));
        sv.style.backgroundColor = rgbToHex(hsvToRgb([hsv[0], 1, 1]));
        const [svKnob, hueKnob] = pop.querySelectorAll('.color-knob');
        svKnob.style.left = hsv[1] * 100 + '%';
        svKnob.style.top = (1 - hsv[2]) * 100 + '%';
        hueKnob.style.left = (hsv[0] / 360) * 100 + '%';
        if (document.activeElement !== hex) hex.value = value.toUpperCase();
        presets.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.color === value));
        if (value !== input.value) {
          input.value = value;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          pop.dataset.dirty = '1';
        }
        if (final && pop.dataset.dirty) {
          delete pop.dataset.dirty;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      // 引っぱって選ぶ（離したときに決める）
      const drag = (area, onMove) => {
        area.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          area.setPointerCapture(e.pointerId);
          const move = (ev) => {
            const r = area.getBoundingClientRect();
            onMove(Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height)));
            apply(false);
          };
          move(e);
          area.addEventListener('pointermove', move);
          area.addEventListener('pointerup', () => {
            area.removeEventListener('pointermove', move);
            apply(true);
          }, { once: true });
        });
      };
      drag(sv, (x, y) => (hsv = [hsv[0], x, 1 - y]));
      drag(hue, (x) => (hsv = [Math.min(359.9, x * 360), hsv[1], hsv[2]]));
      hex.addEventListener('input', () => {
        const v = hex.value.trim().replace(/^#?/, '#');
        if (/^#[0-9a-fA-F]{6}$/.test(v)) {
          hsv = rgbToHsv(hexToRgb(v.toLowerCase()));
          apply(false);
        }
      });
      hex.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.isComposing) {
          e.preventDefault();
          apply(true);
          closePop();
          trigger.focus();
        }
      });
      pop.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          closePop();
          trigger.focus();
        }
      });
      handle.pop = pop;
      popHost(trigger).append(pop);
      placePop(pop, trigger, { matchWidth: false });
      apply(false);
      delete pop.dataset.dirty;
      trigger.setAttribute('aria-expanded', 'true');
    }
    trigger.addEventListener('click', () => (pop ? closePop() : open()));
  }

  // ---- 候補つきの文字の入力（ブラウザの datalist の代わり） ----
  function enhanceCombo(input) {
    if (input.dataset.enhanced || !input.getAttribute('list')) return;
    input.dataset.enhanced = '1';
    const source = input.getAttribute('list');
    input.removeAttribute('list');
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    const MAX = 60;
    let list = null;
    const handle = {
      pop: null,
      anchor: input,
      place: { minWidth: 200 },
      contains: (node) => input.contains(node) || !!list?.el.contains(node),
      close() {
        list?.el.remove();
        list = null;
        handle.pop = null;
        input.setAttribute('aria-expanded', 'false');
        input.removeAttribute('aria-activedescendant');
      },
    };
    function open() {
      const query = input.value.trim().toLowerCase();
      const all = [...(document.getElementById(source)?.options ?? [])].map((o) => o.value);
      // 打った文字で始まるものを先に、そのあとに途中に含むもの
      const starts = all.filter((v) => v.toLowerCase().startsWith(query));
      const contains = all.filter((v) => !v.toLowerCase().startsWith(query) && v.toLowerCase().includes(query));
      const items = [...starts, ...contains].slice(0, MAX).map((v) => ({ value: v, text: v }));
      if (!items.length && !query) return closePop();
      if (list) handle.close();
      showPop(handle);
      list = listbox(items, input.value, (value) => {
        closePop();
        commit(input, value);
        input.focus();
      }, 'combo' + (++popSeq), (value) => window.comboIcon?.(source, value));
      list.el.classList.add('combo-menu');
      list.clearActive();
      handle.pop = list.el;
      list.el.addEventListener('activechange', (e) => input.setAttribute('aria-activedescendant', e.detail));
      input.setAttribute('aria-controls', list.el.id);
      popHost(input).append(list.el);
      placePop(list.el, input, { minWidth: 200 });
      input.setAttribute('aria-expanded', 'true');
    }
    input.addEventListener('input', (e) => {
      if (e.isTrusted) open();
    });
    input.addEventListener('keydown', (e) => {
      if (e.isComposing) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!list) open();
        else list.move(e.key === 'ArrowDown' ? 1 : -1);
      } else if (e.key === 'Enter' && list && list.active >= 0) {
        // 候補を選んでいるときの Enter は、送らずに候補を入れるだけ
        e.preventDefault();
        list.pick();
      } else if (e.key === 'Escape' && list) {
        e.preventDefault();
        e.stopPropagation();
        closePop();
      } else if (e.key === 'Tab') {
        closePop();
      }
    });
  }

  // ---- マウスを置いたときの説明（title の代わり） ----
  {
    let tip = null, timer = null, owner = null;
    const hide = () => {
      clearTimeout(timer);
      tip?.remove();
      tip = null;
      // しまっておいた title を戻す（そのあいだにプログラムが新しい title を付けていたら、そちらを使う）
      if (owner && !owner.hasAttribute('title') && owner.dataset.tip !== undefined) owner.setAttribute('title', owner.dataset.tip);
      if (owner) delete owner.dataset.tip;
      owner = null;
    };
    document.addEventListener('pointerover', (e) => {
      if (owner?.contains(e.target)) return;
      const target = e.target.closest?.('[title]');
      hide();
      if (!target || !target.getAttribute('title')) return;
      owner = target;
      owner.dataset.tip = owner.getAttribute('title');
      owner.removeAttribute('title');
      timer = setTimeout(() => {
        if (!owner?.isConnected) return;
        tip = document.createElement('div');
        tip.className = 'tip';
        tip.setAttribute('role', 'tooltip');
        tip.textContent = owner.dataset.tip;
        popHost(owner).append(tip);
        const r = owner.getBoundingClientRect();
        const vw = document.documentElement.clientWidth;
        const below = r.bottom + 8 + tip.offsetHeight < document.documentElement.clientHeight;
        tip.style.top = (below ? r.bottom + 8 : r.top - 8 - tip.offsetHeight) + 'px';
        tip.style.left = Math.max(8, Math.min(r.left + r.width / 2 - tip.offsetWidth / 2, vw - tip.offsetWidth - 8)) + 'px';
      }, 450);
    });
    document.addEventListener('pointerout', (e) => {
      if (owner && !owner.contains(e.relatedTarget)) hide();
    });
    for (const ev of ['pointerdown', 'keydown', 'wheel']) document.addEventListener(ev, hide, true);
    addEventListener('blur', hide);
  }

  // ---- 右クリックのメニュー（切り取り・コピー・貼り付け・すべて選択） ----
  {
    let menu = null;
    const handle = { pop: null, contains: (node) => !!menu?.contains(node), close() { menu?.remove(); menu = null; handle.pop = null; } };
    const editable = (node) => node instanceof HTMLInputElement && !['checkbox', 'range', 'color', 'file', 'button', 'submit'].includes(node.type)
      || node instanceof HTMLTextAreaElement;
    async function paste(field) {
      let text = '';
      try {
        text = await navigator.clipboard.readText();
      } catch {
        field.focus();
        document.execCommand('paste');
        return;
      }
      field.focus();
      // 1行の欄には改行を入れない
      if (field instanceof HTMLInputElement) text = text.replace(/\r?\n/g, ' ');
      if (!document.execCommand('insertText', false, text)) {
        field.setRangeText(text, field.selectionStart ?? field.value.length, field.selectionEnd ?? field.value.length, 'end');
        field.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    document.addEventListener('contextmenu', (e) => {
      const field = editable(e.target) ? e.target : null;
      const selected = String(getSelection());
      if (!field && !selected) return;
      e.preventDefault();
      showPop(handle);
      const hasSelection = field ? field.selectionStart !== field.selectionEnd && field.type !== 'number' : !!selected;
      const writable = field && !field.readOnly && !field.disabled;
      const selectedText = field ? field.value.slice(field.selectionStart ?? 0, field.selectionEnd ?? 0) : selected;
      const items = [
        ['切り取り', 'Ctrl+X', writable && hasSelection, () => {
          navigator.clipboard.writeText(selectedText).catch(() => {});
          field.focus();
          document.execCommand('delete');
        }],
        ['コピー', 'Ctrl+C', hasSelection, () => navigator.clipboard.writeText(selectedText).catch(() => document.execCommand('copy'))],
        ['貼り付け', 'Ctrl+V', writable, () => paste(field)],
        null,
        ['すべて選択', 'Ctrl+A', !!field, () => {
          field.focus();
          field.select();
        }],
      ].filter((item) => item !== null || field);
      menu = document.createElement('div');
      menu.className = 'pop ctx-menu';
      menu.setAttribute('role', 'menu');
      for (const item of items) {
        if (!item) {
          menu.append(document.createElement('hr'));
          continue;
        }
        const [text, key, enabled, run] = item;
        const b = Object.assign(document.createElement('button'), { type: 'button', disabled: !enabled });
        b.setAttribute('role', 'menuitem');
        b.append(text, Object.assign(document.createElement('kbd'), { textContent: key }));
        b.addEventListener('pointerdown', (ev) => ev.preventDefault());
        b.addEventListener('click', () => {
          closePop();
          run();
        });
        menu.append(b);
      }
      menu.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') {
          ev.preventDefault();
          ev.stopPropagation();
          closePop();
          field?.focus();
        }
      });
      handle.pop = menu;
      popHost(e.target).append(menu);
      const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
      menu.style.left = Math.min(e.clientX, vw - menu.offsetWidth - 8) + 'px';
      menu.style.top = Math.min(e.clientY, vh - menu.offsetHeight - 8) + 'px';
    });
  }

  /** root の中の部品を作り直す（すでに作り直したものはそのまま） */
  function enhanceControls(root) {
    if (!(root instanceof Element)) return;
    const all = (selector) => [...(root.matches(selector) ? [root] : []), ...root.querySelectorAll(selector)];
    all('select').forEach(enhanceSelect);
    all('input[type=number]').forEach(enhanceNumber);
    all('input[type=range]').forEach(enhanceRange);
    all('input[type=color]').forEach(enhanceColor);
    all('input[list]').forEach(enhanceCombo);
    // 名前や ID の欄に、つづりの赤い線を出さない
    all('input:not([type]), input[type=text], input[type=search]').forEach((node) => node.hasAttribute('spellcheck') || (node.spellcheck = false));
  }
  function watchControls() {
    enhanceControls(document.body);
    new MutationObserver((records) => {
      for (const record of records) record.addedNodes.forEach((node) => enhanceControls(node));
    }).observe(document.body, { childList: true, subtree: true });
  }
`;

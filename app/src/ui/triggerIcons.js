// きっかけ（ギフト・コイン数・いいね・コメント・フォロー・シェア）のアイコン。配信画面の部品と操作画面で共通。
// 絵文字や記号だと PC によって見た目が変わるので、線と面だけの絵（SVG）で描く。色は種類ごとの丸い札で付ける

const svg = (inner, box = 24) => `<svg viewBox="0 0 ${box} ${box}" aria-hidden="true" fill="currentColor">${inner}</svg>`;

export const TRIGGER_ICONS = {
  // 箱とリボン
  gift: svg('<path d="M3 8.5h8v3.5H3zM13 8.5h8v3.5h-8zM4.5 13.5H11V21H4.5zM13 13.5h6.5V21H13z"/>'
    + '<path d="M12 8.3C10.6 5 7 4 6.4 5.9 5.8 7.8 9.3 8.4 12 8.3c2.7.1 6.2-.5 5.6-2.4C17 4 13.4 5 12 8.3z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>'),
  // TikTok のコイン（TikTok のコインの購入ページの絵と同じ）。札なしで、コインそのものを出す
  coins: svg('<path d="M48 24a24 24 0 1 1-48 0 24 24 0 0 1 48 0Z" fill="#FFB84D"/><path d="M47 24a23 23 0 1 1-46 0 23 23 0 0 1 46 0Z" fill="#FFDE55"/><path d="M42 24a18 18 0 1 1-36 0 18 18 0 0 1 36 0Z" fill="#F7A80F"/><path d="M41.94 25.5a18 18 0 1 0-35.88 0 18 18 0 0 1 35.88 0Z" fill="#F09207"/><path d="M34.74 17.77v5.86c-2.06 0-4.05-.44-5.81-1.55v7.2a7.79 7.79 0 0 1-7.84 7.75  7.79 7.79 0 0 1-7.8-8.35 7.79 7.79 0 0 1 9.19-8.24v6c-.47-.13-.9-.26-1.39-.26a3.14 3.14 0 0 0-3.09 2.5 3.14 3.14 0 0 0 3.1 2.5c1.74 0 3.14-1.4 3.14-3.11V12.03h4.69a5.6 5.6 0 0 0 5.81 5.74Z" fill="#F09207"/><path d="M34.34 18.18a5.78 5.78 0 0 1-5.82-5.74h-3.87v15.63c0 1.94-1.6 3.5-3.56 3.5a3.53 3.53 0 0 1-3.55-3.5 3.53 3.53 0 0 1 4.52-3.38v-3.9a7.38 7.38 0 0 0-8.4 7.28 7.38 7.38 0 0 0 7.43 7.34c4.1 0 7.43-3.29 7.43-7.34v-7.98a9.73 9.73 0 0 0 5.82 1.92v-3.83Z" fill="#fff"/>', 48),
  // ハート
  likes: svg('<path d="M12 21l-1.5-1.3C5.3 15.1 2 12.1 2 8.4 2 5.4 4.4 3 7.4 3c1.8 0 3.5.8 4.6 2.2C13.1 3.8 14.8 3 16.6 3 19.6 3 22 5.4 22 8.4c0 3.7-3.3 6.7-8.5 11.3z"/>'),
  // ふきだし
  comment: svg('<path d="M4.5 3.5h15a2.5 2.5 0 0 1 2.5 2.5v9a2.5 2.5 0 0 1-2.5 2.5H10l-4.8 3.6c-.5.4-1.2 0-1.2-.6v-3A2.5 2.5 0 0 1 2 15V6a2.5 2.5 0 0 1 2.5-2.5z"/>'
    + '<circle cx="8" cy="10.5" r="1.4" fill="rgba(0,0,0,.3)"/><circle cx="12" cy="10.5" r="1.4" fill="rgba(0,0,0,.3)"/><circle cx="16" cy="10.5" r="1.4" fill="rgba(0,0,0,.3)"/>'),
  // 人と「＋」
  follow: svg('<circle cx="9.5" cy="7.5" r="4"/><path d="M2 20.5c0-4.1 3.4-7 7.5-7s7.5 2.9 7.5 7z"/>'
    + '<path d="M19.5 6.5v7M16 10h7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>'),
  // 右へ送る矢印
  share: svg('<path d="M13.5 3.5l8.5 7.5-8.5 7.5v-4.3c-5.1 0-8.6 1.6-11.5 5.3 1-5.4 4.2-10.3 11.5-11.3z"/>'),
};

/** 種類ごとの札の色（白い絵がよく見える色） */
export const TRIGGER_ICON_CSS = `
  .ic { color: #fff; display: inline-flex; align-items: center; justify-content: center; flex: none; border-radius: 22%; }
  .ic svg { width: 62%; height: 62%; display: block; filter: drop-shadow(0 1px 1px rgba(0, 0, 0, .35)); }
  .ic-gift { background: linear-gradient(160deg, #ff8fb3, #e0457a) !important; }
  .ic-coins { background: none !important; box-shadow: none !important; border-radius: 50%; }
  .ic-coins svg { width: 100%; height: 100%; filter: none; }
  .ic-likes { background: linear-gradient(160deg, #ff8a8a, #e8384f) !important; }
  .ic-comment { background: linear-gradient(160deg, #7cc8ff, #2f7fe0) !important; }
  .ic-follow { background: linear-gradient(160deg, #7be0a8, #23a35f) !important; }
  .ic-share { background: linear-gradient(160deg, #ffb36b, #ef7a1c) !important; }
`;

/** ページの中で使う: triIcon('follow') で札を作る（cls は札に足すクラス。配信画面の部品は badge） */
export const TRIGGER_ICON_JS = `
  const TRI_SVG = ${JSON.stringify(TRIGGER_ICONS)};
  function triIcon(name, cls = 'badge') {
    const key = Object.hasOwn(TRI_SVG, name) ? name : 'gift';
    const span = document.createElement('span');
    span.className = (cls ? cls + ' ' : '') + 'ic ic-' + key;
    span.innerHTML = TRI_SVG[key];
    return span;
  }
`;

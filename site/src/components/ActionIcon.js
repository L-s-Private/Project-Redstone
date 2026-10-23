import { ICONS } from '../media.js';
import { hasPublicFile } from '../publicFile.js';

// 積み木の形（上・左・右の3面）
function Cube({ top, left, right, children }) {
  return (
    <>
      <polygon points="20,0 40,11 20,22 0,11" fill={top} />
      <polygon points="0,11 20,22 20,46 0,35" fill={left} />
      <polygon points="20,22 40,11 40,35 20,46" fill={right} />
      {children}
    </>
  );
}

const RED = ['#F27466', '#E04A3A', '#B8352A'];
const PURPLE = ['#B3A6EC', '#8C7BD1', '#6C5BB0'];
const ICE = ['#D6EEFB', '#A9D8F5', '#7FBFE8'];
const GOLD = ['#FFE08A', '#FFC93C', '#E0A800'];
const GLASS = ['#EEF8FF', '#CFE9FA', '#A8D3EE'];
const ARROW = '#1F5FB8';
const INK = '#1A1C22';

// 仮の絵。public/icons/<名前>.svg を置くまで出す
const STAND_INS = {
  // 爆弾の箱（導火線と火花）。マイクラの TNT ブロックの見た目（赤に白い帯）には似せない
  tnt: <Cube top={RED[0]} left={RED[1]} right={RED[2]}><path d="M20 11c0-5 4-7 7-9" fill="none" stroke={INK} strokeWidth="2" /><path d="M28 0l1.6 3.2L33 4l-3.4.8L28 8l-1.6-3.2L23 4l3.4-.8z" fill="#FFC93C" /></Cube>,
  mob: <Cube top={PURPLE[0]} left={PURPLE[1]} right={PURPLE[2]}><circle cx="7" cy="24" r="2.6" fill="#FFFFFF" /><circle cx="14" cy="27.5" r="2.6" fill="#FFFFFF" /><circle cx="7.4" cy="24.4" r="1.2" fill={INK} /><circle cx="14.4" cy="27.9" r="1.2" fill={INK} /></Cube>,
  lightning: <path d="M24 2L8 26h10l-4 18 18-26H22z" fill="#FFC93C" stroke={INK} strokeWidth="2" />,
  jail: <><rect x="4" y="6" width="32" height="36" fill="#E3E3E3" stroke={INK} strokeWidth="2" /><path d="M12 6v36M20 6v36M28 6v36" stroke={INK} strokeWidth="3" /></>,
  freeze: <Cube top={ICE[0]} left={ICE[1]} right={ICE[2]} />,
  levitate: <><rect x="8" y="16" width="24" height="24" fill="#FFFFFF" stroke={INK} strokeWidth="2" /><path d="M14 12l6-8 6 8z" fill={ARROW} /></>,
  night: <path d="M28 6h-12v4h-4v4h-4v16h4v4h4v4h16v-4h4v-4h-12v-4h-4v-12h4v-4h4z" fill="#FFD25A" stroke={INK} strokeWidth="1.5" />,
  fill_expand: <><rect x="10" y="14" width="20" height="20" fill="none" stroke={INK} strokeWidth="2" strokeDasharray="4 3" /><path d="M2 24l6-5v10zM38 24l-6-5v10zM20 4l-5 6h10zM20 44l-5-6h10z" fill={ARROW} /></>,
  fill_raise: <><rect x="10" y="18" width="20" height="24" fill="none" stroke={INK} strokeWidth="2" strokeDasharray="4 3" /><path d="M20 2l-7 9h14z" fill={ARROW} /></>,
  fill_clear: <><rect x="6" y="12" width="28" height="28" fill="none" stroke={INK} strokeWidth="2" strokeDasharray="4 3" /><path d="M12 18l16 16M28 18L12 34" stroke="#E04A3A" strokeWidth="3.5" /></>,
  fill_help: <Cube top={GOLD[0]} left={GOLD[1]} right={GOLD[2]} />,
  fill_layer: <><Cube top={GOLD[0]} left={GOLD[1]} right={GOLD[2]} /><path d="M0 35l20 11 20-11" fill="none" stroke={INK} strokeWidth="2" /></>,
  fill_shrink: <><rect x="6" y="10" width="28" height="28" fill="none" stroke={INK} strokeWidth="2" strokeDasharray="4 3" /><path d="M14 24l-6-5v10zM26 24l6-5v10z" fill={ARROW} transform="rotate(180 20 24)" /></>,
  message: <><path d="M4 8h32v22H18l-8 8v-8H4z" fill="#FFFFFF" stroke={INK} strokeWidth="2" strokeLinejoin="round" /><path d="M11 16h18M11 22h12" stroke={INK} strokeWidth="2" /></>,
  mining_bonus_drop: <Cube top={GLASS[0]} left={GLASS[1]} right={GLASS[2]}><polygon points="20,8 26,12 20,16 14,12" fill="#3CC6D9" /></Cube>,
};

export function ActionIcon({ name, size = 40 }) {
  const file = `/icons/${name}.svg`;
  if (hasPublicFile(file)) return <img src={file} alt="" width={size} height={size} className="action-icon" />;
  return (
    <svg viewBox="0 0 40 46" width={size} height={Math.round(size * 1.15)} className="action-icon" aria-hidden="true">
      {STAND_INS[name] ?? <Cube top="#D9D9D9" left="#B5B5B5" right="#909090" />}
    </svg>
  );
}

export const iconLabel = (name) => ICONS[name] ?? name;

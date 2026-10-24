import { ActionIcon } from './ActionIcon.js';
import { Icon } from './Icon.js';
import { MotionToggle } from './MotionToggle.js';

// 横に流れ続ける帯。「何をきっかけに、何が起きるか」の組み合わせの例を流す（どれも設定で自由に決められる）
const ITEMS = [
  ['Gift', '100コイン以上のギフト', 'tnt', 'TNT ×3'],
  ['Heart', 'いいね 100回', 'mob', 'モブ'],
  ['MessageSquare', 'コメント「雷」', 'lightning', '雷'],
  ['UserPlus', 'フォロー', 'fill_help', 'お助けブロック'],
  ['Gift', '大きいギフト', 'jail', '逮捕 30秒'],
  ['Share2', 'シェア', 'night', '夜にする'],
  ['Coins', '1コインのギフト', 'levitate', '浮遊'],
  ['MessageSquare', 'コメント「止まれ」', 'freeze', '操作禁止'],
];

function Row() {
  return ITEMS.map(([trigger, label, action, result], i) => (
    <li key={i}>
      <Icon name={trigger} size={18} />
      <span>{label}</span>
      <Icon name="ArrowRight" size={16} className="ticker-arrow" />
      <ActionIcon name={action} size={26} />
      <b>{result}</b>
    </li>
  ));
}

export function Ticker() {
  return (
    <section className="ticker" aria-label="きっかけと妨害の組み合わせの例">
      <div className="ticker-track" aria-hidden="true">
        <ul><Row /></ul>
        <ul><Row /></ul>
      </div>
      {/* 読み上げでは、流れる帯の代わりにこの一文を読む */}
      <p className="sr-only">たとえば「100コイン以上のギフトで TNT」「いいね100回でモブ」のように、きっかけと妨害を自由に組み合わせられます。</p>
      <MotionToggle className="ticker-toggle" />
    </section>
  );
}

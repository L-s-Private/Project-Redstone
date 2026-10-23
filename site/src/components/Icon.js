import * as Lucide from 'lucide-react';

// 線のアイコン（lucide-react）。角を四角くして、ブロックらしい線にそろえる。name は lucide の名前（Gift・Lock など）
export function Icon({ name, size = 20, className }) {
  const Svg = Lucide[name];
  return <Svg size={size} strokeWidth={2.25} strokeLinecap="square" strokeLinejoin="miter" className={className} aria-hidden="true" focusable="false" />;
}

// 色の付いた角欠きの札にのせたアイコン。節の見出し・カードの頭に使う
export function IconBadge({ name, tone = 'sky', size = 22 }) {
  return <span className={`icon-badge icon-badge-${tone}`}><Icon name={name} size={size} /></span>;
}

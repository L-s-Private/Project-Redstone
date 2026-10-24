import { Icon } from './Icon.js';

// ほかのサイトへのリンク。新しいタブで開くことを、目印のアイコンと読み上げの文で伝える
export function ExternalLink({ href, className, icon = true, children }) {
  return (
    <a href={href} className={className} target="_blank" rel="noopener noreferrer">
      {children}
      {icon && <Icon name="ExternalLink" size={14} className="external-icon" />}
      <span className="sr-only">（新しいタブで開きます）</span>
    </a>
  );
}

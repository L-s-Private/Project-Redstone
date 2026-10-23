import { IconBadge } from './Icon.js';

// 節の見出し。左にアイコンの札、右に見出しと説明
export function SectionHead({ icon, tone, title, children }) {
  return (
    <div className="band-head">
      <div className="band-title">
        <IconBadge name={icon} tone={tone} size={24} />
        <h2>{title}</h2>
      </div>
      {children && <p>{children}</p>}
    </div>
  );
}

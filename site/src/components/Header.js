import Link from 'next/link';
import { Icon } from './Icon.js';
import { Logo } from './Logo.js';
import { NavLinks } from './NavLinks.js';

// 上のメニュー。ダウンロードのボタンは、どこまでスクロールしても押せるように出しっぱなしにする（スマホでは下の帯に出す）
export function Header() {
  return (
    <>
      <a href="#main" className="skip-link">本文へ移動</a>
      <header className="site-header">
        <div className="container header-inner">
          <Link href="/" className="header-logo" aria-label="STATIC ARC トップ"><Logo label="" /></Link>
          <nav className="header-nav" aria-label="メインメニュー">
            <NavLinks />
            <Link href="/#download" className="button button-small header-download"><Icon name="Download" size={16} />ダウンロード（無料）</Link>
          </nav>
        </div>
      </header>
      <div className="mobile-bar">
        <Link href="/#download" className="button"><Icon name="Download" size={18} />無料でダウンロード（PC 用）</Link>
      </div>
    </>
  );
}

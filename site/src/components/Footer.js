import Link from 'next/link';
import { FOOTER_NAV, SITE } from '../site.js';
import { Contact } from './Contact.js';
import { Discord } from './Discord.js';

// Minecraft のガイドラインで、載せることが決まっている注意書き（英語の1文はそのまま）
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <nav className="footer-nav" aria-label="サイト内のページ一覧">
          {FOOTER_NAV.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
        </nav>
        <p>お問い合わせ：{SITE.contactEmail && <><Contact /> ／ </>}<Discord>Discord</Discord></p>
        <p className="disclaimer">
          NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.
          <br />
          STATIC ARC は Minecraft の公式製品ではなく、Mojang・Microsoft が認めたり関わったりしているものではありません。TikTok（ByteDance）の公式ツールでもなく、TikTok とは関係ありません。「Minecraft」は Mojang AB の、「TikTok」は ByteDance Ltd. の商標です。
        </p>
        <p className="provider">提供：{SITE.provider}</p>
      </div>
    </footer>
  );
}

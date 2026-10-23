import { Dela_Gothic_One, DotGothic16, Zen_Kaku_Gothic_New } from 'next/font/google';
import './globals.css';
import { Footer } from '../components/Footer.js';
import { Header } from '../components/Header.js';
import { openGraph, twitter } from '../seo.js';
import { SITE } from '../site.js';

// 字はビルドのときにサイトの中へ取り込む（見る人の PC から Google に取りに行かない）。日本語の字は大きいので先読みしない
const display = Dela_Gothic_One({ weight: '400', preload: false, variable: '--font-display' });
const dot = DotGothic16({ weight: '400', preload: false, variable: '--font-dot' });
const body = Zen_Kaku_Gothic_New({ weight: ['400', '700', '900'], preload: false, variable: '--font-body' });

const DESCRIPTION = 'STATIC ARC は、TikTok LIVE のギフト・いいね・コメントで、配信中の Minecraft Java版に TNT やモブなどの妨害を出せる無料の配信ツールです。MOD の導入もボタン一つ、TikTok のパスワードは不要です。';

export const metadata = {
  metadataBase: new URL(SITE.siteUrl),
  title: { default: 'STATIC ARC｜TikTok LIVE のギフトでマイクラに妨害を出す無料ツール', template: '%s｜STATIC ARC' },
  description: DESCRIPTION,
  applicationName: 'STATIC ARC',
  alternates: { canonical: '/' },
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: openGraph({ title: 'STATIC ARC｜TikTok LIVE のギフトでマイクラに妨害を出す無料ツール', description: DESCRIPTION, path: '/' }),
  twitter,
};

export const viewport = { themeColor: '#d3ecff' };

export default function RootLayout({ children }) {
  return (
    <html lang="ja" className={`${display.variable} ${dot.variable} ${body.variable}`}>
      <body>
        <Header />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

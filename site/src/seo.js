import { hasPublicFile } from './publicFile.js';
import { SITE } from './site.js';

// リンクを貼ったときに出る絵（1200×630）。public/og.png を置くまでは出さない
const OG_IMAGES = hasPublicFile('/og.png') ? [{ url: '/og.png', width: 1200, height: 630, alt: 'STATIC ARC' }] : undefined;

// openGraph はページごとに丸ごと置き換わるので、共通の項目は毎回入れる
export function openGraph({ title, description, path }) {
  return { type: 'website', siteName: 'STATIC ARC', locale: 'ja_JP', title, description, url: path, images: OG_IMAGES };
}
export const twitter = { card: OG_IMAGES ? 'summary_large_image' : 'summary' };

// ページごとの、検索結果とリンクを貼ったときに出る文。path は「/guide/」の形
export function pageMeta({ title, description, path }) {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: openGraph({ title: `${title}｜STATIC ARC`, description, path }),
    twitter,
  };
}

// パンくず（検索結果に「STATIC ARC › 使い方ガイド」のように出る）
export function breadcrumbLd(label, path) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'トップ', item: `${SITE.siteUrl}/` },
      { '@type': 'ListItem', position: 2, name: label, item: `${SITE.siteUrl}${path}` },
    ],
  };
}

import { SITE } from '../site.js';

export const dynamic = 'force-static';

// 検索エンジン向けのページの一覧（ビルドすると sitemap.xml になる）。更新日はビルドした日
const PAGES = [
  ['/', 1.0],
  ['/features/', 0.8],
  ['/guide/', 0.8],
  ['/news/', 0.6],
  ['/contact/', 0.4],
  ['/terms/', 0.2],
  ['/privacy/', 0.2],
];

export default function sitemap() {
  const lastModified = new Date();
  return PAGES.map(([path, priority]) => ({ url: `${SITE.siteUrl}${path}`, lastModified, priority }));
}

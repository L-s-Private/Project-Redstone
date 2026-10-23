import { SITE } from '../site.js';

export const dynamic = 'force-static';

export default function robots() {
  return { rules: { userAgent: '*', allow: '/' }, sitemap: `${SITE.siteUrl}/sitemap.xml` };
}

import { SITE } from '../site.js';

export function DownloadButton({ large = false, children = '無料でダウンロード' }) {
  const className = large ? 'button button-large' : 'button';
  if (!SITE.downloadUrl) {
    return <span className={`${className} button-disabled`} aria-disabled="true">Windows 版は準備中です</span>;
  }
  return <a className={className} href={SITE.downloadUrl}>{children}</a>;
}

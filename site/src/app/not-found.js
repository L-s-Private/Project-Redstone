import Link from 'next/link';
import { Icon } from '../components/Icon.js';

export const metadata = { title: 'ページが見つかりません', robots: { index: false } };

// 住所が違うときのページ。行き止まりにせず、よく使うページへ案内する
export default function NotFound() {
  return (
    <div className="page-head not-found">
      <div className="container">
        <p className="depth-note">深さ ？ ／ 掘りすぎたようです</p>
        <h1>ページが見つかりません</h1>
        <p className="lead">ページが移動したか、削除された可能性があります。次のページから探してください。</p>
        <div className="hero-actions">
          <Link href="/" className="button"><Icon name="House" size={18} />トップへ</Link>
          <Link href="/guide/" className="text-link">使い方ガイド</Link>
          <Link href="/features/" className="text-link">できること</Link>
        </div>
      </div>
    </div>
  );
}

import Link from 'next/link';
import { breadcrumbLd } from '../seo.js';
import { CtaBand } from './CtaBand.js';
import { JsonLd } from './JsonLd.js';
import { TocNav } from './TocNav.js';

// 文章のページ（ガイド・規約など）の上の帯。パンくず（トップ › このページ）と見出し
export function PageHead({ title, lead, path }) {
  return (
    <div className="page-head">
      <JsonLd data={breadcrumbLd(title, path)} />
      <div className="container">
        <nav aria-label="現在地" className="crumbs">
          <ol>
            <li><Link href="/">トップ</Link></li>
            <li aria-current="page">{title}</li>
          </ol>
        </nav>
        <h1>{title}</h1>
        {lead}
      </div>
    </div>
  );
}

// 上に見出しの帯、その下の左に目次、右に本文。目次から各節へ飛べるので、長くてもスクロールで探さなくて済む。
// cta を付けると、いちばん下にダウンロードへの案内を出す
export function DocPage({ title, lead, path, toc, cta = false, children }) {
  return (
    <>
      <PageHead title={title} lead={lead} path={path} />
      <div className="doc">
        <div className="container doc-layout">
          <TocNav toc={toc} />
          <article className="doc-body">{children}</article>
        </div>
      </div>
      {cta && <CtaBand />}
    </>
  );
}

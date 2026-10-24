import { PageHead } from '../../components/DocPage.js';
import { DownloadButton } from '../../components/DownloadButton.js';
import { Icon } from '../../components/Icon.js';
import { Todo } from '../../components/Todo.js';
import { NEWS } from '../../news.js';
import { pageMeta } from '../../seo.js';

export const metadata = pageMeta({ title: 'お知らせ・更新履歴', description: 'STATIC ARC の新しい版の公開と、TikTok との接続などについてのお知らせです。', path: '/news/' });

// お知らせと、アプリの新しい版を1つのページに新しい順で並べる（中身は src/news.js）
export default function News() {
  return (
    <>
      <PageHead
        title="お知らせ・更新履歴"
        path="/news/"
        lead={<p className="lead">新しい版は自動では入れ替わらないので、お知らせが出たらこのページからダウンロードしてください。設定はそのまま引き継がれ、マイクラの MOD も自動で入れ替わります。</p>}
      />
      <div className="doc">
        <div className="container stack">
          <div><DownloadButton>最新版をダウンロード（Windows）</DownloadButton></div>
          <div className="news-list">
            {NEWS.map((entry) => (
              <section className="card card-pad news-item" key={`${entry.date}${entry.title}`}>
                <p className="news-meta">
                  <time>{entry.date || <Todo>日付</Todo>}</time>
                  <span className={entry.version ? 'tag' : 'tag tag-notice'}>
                    <Icon name={entry.version ? 'RefreshCw' : 'Megaphone'} size={13} />
                    {entry.version ? `更新 v${entry.version}` : 'お知らせ'}
                  </span>
                </p>
                <h2>{entry.title}</h2>
                {entry.items?.length > 0 && <ul>{entry.items.map((item) => <li key={item}>{item}</li>)}</ul>}
              </section>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

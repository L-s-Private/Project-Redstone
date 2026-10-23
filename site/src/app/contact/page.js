import Link from 'next/link';
import { Contact } from '../../components/Contact.js';
import { Discord } from '../../components/Discord.js';
import { PageHead } from '../../components/DocPage.js';
import { Icon, IconBadge } from '../../components/Icon.js';
import { pageMeta } from '../../seo.js';

export const metadata = pageMeta({ title: 'お問い合わせ', description: 'STATIC ARC へのお問い合わせ（Discord・メール）と、不具合を報告するときに付けてほしいものの案内です。', path: '/contact/' });

export default function ContactPage() {
  return (
    <>
      <PageHead
        title="お問い合わせ"
        path="/contact/"
        lead={<p className="lead">困ったときは、先に <Link href="/guide/#trouble">よくある困りごと</Link> と <Link href="/news/">お知らせ</Link> をご覧ください。TikTok 側の変更でつながらないときは、お知らせに出します。</p>}
      />
      <div className="doc">
        <div className="container stack">
          <div className="grid-2">
            <div className="card card-pad">
              <IconBadge name="MessagesSquare" tone="discord" />
              <b className="card-title">Discord で相談する</b>
              <span className="muted">使い方の相談や、ほかの配信者との情報交換に。</span>
              <div><Discord button><Icon name="MessagesSquare" size={18} />Discord に参加する</Discord></div>
            </div>
            <div className="card card-pad">
              <IconBadge name="Mail" />
              <b className="card-title">メールで問い合わせる</b>
              <span className="muted">不具合の報告や、Discord を使っていない方はこちらへ。</span>
              <span><Contact /></span>
            </div>
          </div>

          <article className="doc-body">
            <h2>不具合のときに付けてほしいもの</h2>
            <p>次の3つを付けていただくと、早く調べられます。</p>
            <ol>
              <li><strong>STATIC ARC の版</strong>：アプリの左下に出ている番号（例：v0.46.1）</li>
              <li><strong>何をしたら、どうなったか</strong>（画面のスクショがあると助かります）</li>
              <li>
                <strong>ログ（記録のファイル）</strong>
                <ul>
                  <li>アプリ：<code>%APPDATA%\StaticArc\app.log</code></li>
                  <li>マイクラ：<code>%APPDATA%\.minecraft\logs\latest.log</code></li>
                </ul>
              </li>
            </ol>
            <p>ログには、視聴者の名前や届いたギフトが入っています。Discord のように人から見える場所には貼らず、メールで送ってください。送っていただいたログは、不具合の調査にだけ使い、終わったら消します（<Link href="/privacy/">プライバシーポリシー</Link>）。</p>
          </article>
        </div>
      </div>
    </>
  );
}

import { ExternalLink } from '../../components/ExternalLink.js';
import { Contact } from '../../components/Contact.js';
import { DocPage } from '../../components/DocPage.js';
import { Todo } from '../../components/Todo.js';
import { SITE } from '../../site.js';
import { pageMeta } from '../../seo.js';

export const metadata = pageMeta({ title: 'プライバシーポリシー', description: 'STATIC ARC が PC に保存する情報と、外部に送る情報（TikTok ID など）についての説明です。', path: '/privacy/' });

const TOC = [
  ['stored', '1. PC の中に保存するもの'],
  ['sent', '2. 外に送るもの・外から取るもの'],
  ['not-sent', '3. 提供者に送らないこと'],
  ['viewers', '4. 視聴者の情報について'],
  ['delete', '5. 消し方'],
  ['changes', '6. 変更と問い合わせ'],
];

const STORED = [
  ['設定', 'TikTok ID、妨害の設定、プリセット、配信画面の見た目', '消すまで'],
  ['妨害の設定の変更の履歴', '前の設定', '新しいものから30件'],
  ['ギフトの一覧', 'TikTok のギフトの名前・絵・コイン数', '消すまで（ときどき取り直します）'],
  ['ギフトランキング', 'ギフトを送った視聴者の名前とコイン数', '次の配信が始まるまで'],
  ['配信ごとの分析', '届いたギフト・出した妨害の数、視聴者の名前とコイン数', '直近30日分'],
  ['ログ', 'アプリの動きの記録（視聴者の名前と届いたギフトを含みます）', '消すまで'],
  ['演出のファイル', 'ルールに選んだ音・画像・動画の写し', '消すまで'],
  ['ウィンドウなど', 'ウィンドウの位置、画面の表示用の一時ファイル', '消すまで'],
];

export default function Privacy() {
  return (
    <DocPage
      title="プライバシーポリシー"
      path="/privacy/"
      toc={TOC}
      lead={<p className="lead">STATIC ARC は、設定や記録を<strong>利用者の PC の中だけ</strong>に保存し、提供者には送りません。外に出るのは、TikTok LIVE につなぐための TikTok ID と、準備に必要なファイルを取りに行くときの通信だけです。</p>}
    >
      <h2 id="stored">1. PC の中に保存するもの</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th scope="col">保存するもの</th><th scope="col">中身</th><th scope="col">保存する期間</th></tr></thead>
          <tbody>
            {STORED.map(([name, what, period]) => <tr key={name}><th scope="row">{name}</th><td>{what}</td><td>{period}</td></tr>)}
          </tbody>
        </table>
      </div>
      <p>TikTok のパスワードやログインの情報は、使いませんし、保存もしません。</p>

      <h2 id="sent">2. 外に送るもの・外から取るもの</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th scope="col">相手</th><th scope="col">いつ</th><th scope="col">送るもの・取るもの</th></tr></thead>
          <tbody>
            <tr><th scope="row"><ExternalLink href="https://www.eulerstream.com/">Euler Stream</ExternalLink></th><td>TikTok LIVE につなぐとき</td><td>利用者の TikTok ID を送ります（つなぐための署名をもらうため）</td></tr>
            <tr><th scope="row">TikTok</th><td>配信中</td><td>LIVE のギフト・いいね・コメント・フォローなどと、ギフトの一覧を受け取ります</td></tr>
            <tr><th scope="row"><ExternalLink href="https://fabricmc.net/">Fabric</ExternalLink>・<ExternalLink href="https://modrinth.com/">Modrinth</ExternalLink></th><td>「まとめて導入する」を押したとき</td><td>Minecraft の準備に使うファイルを取得します</td></tr>
          </tbody>
        </table>
      </div>
      <ul>
        <li>これらの通信では、一般的な通信と同じく、相手に IP アドレスなどが伝わります。</li>
        <li>それぞれの相手の情報の扱いは、相手のプライバシーポリシーに従います。</li>
      </ul>

      <h2 id="not-sent">3. 提供者に送らないこと</h2>
      <ul>
        <li>1の情報を、提供者に送ることはありません。</li>
        <li>使われ方の統計を集めるしくみや、広告は入っていません。</li>
        <li>このため、提供者が、利用者や視聴者の情報を第三者に渡すことはありません。</li>
        <li>利用者が問い合わせのときに自分でログを送った場合は、不具合の調査にだけ使い、終わったら消します。</li>
      </ul>

      <h2 id="viewers">4. 視聴者の情報について（配信者の方へ）</h2>
      <ul>
        <li>ランキング・分析・ログには、視聴者の TikTok 上の名前が入ります。配信画面の部品（ギフト通知・ランキングなど）を使うと、その名前が配信に映ります。</li>
        <li>これらの情報は、配信者の PC の中にあり、配信者が管理します。配信のため以外に使わないようにしてください。</li>
      </ul>

      <h2 id="delete">5. 消し方</h2>
      <p>アプリを閉じてから、フォルダ<code>%APPDATA%\StaticArc</code>（設定・ログ・ランキング・分析・演出のファイル・ウィンドウの位置など）を消すと、1の情報はすべて消えます。</p>
      <p>Euler Stream など外部のサービスに渡った情報については、それぞれのサービスに問い合わせてください。</p>

      <h2 id="changes">6. 変更と問い合わせ</h2>
      <ul>
        <li>このポリシーを変えるときは、このページでお知らせします。将来、有料版で支払いやライセンスの確認を始めるときは、取り扱う情報が増えるため、先に書き直します。</li>
        <li>問い合わせ：{SITE.provider}　<Contact /></li>
      </ul>
      <p className="updated">施行日：{SITE.effectiveDate || <Todo>日付</Todo>}</p>
    </DocPage>
  );
}

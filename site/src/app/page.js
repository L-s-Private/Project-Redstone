import Link from 'next/link';
import { ActionIcon } from '../components/ActionIcon.js';
import { Discord } from '../components/Discord.js';
import { DownloadButton } from '../components/DownloadButton.js';
import { Icon, IconBadge } from '../components/Icon.js';
import { JsonLd } from '../components/JsonLd.js';
import { Media } from '../components/Media.js';
import { SectionHead } from '../components/SectionHead.js';
import { Strata } from '../components/Strata.js';
import { Todo } from '../components/Todo.js';
import { NEWS } from '../news.js';
import { MINECRAFT_VERSION, SITE } from '../site.js';

// トップは、見に来た配信者の疑問に上から順に答える（何？ → どんなこと？ → むずかしい？ → 危なくない？ → 動く？ → ダウンロード）

const HOW = [
  ['how1', 'Gift', '視聴者がギフトを送る', 'いいね・コメント・フォローでも OK'],
  ['how2', 'Monitor', 'あなたの PC が受け取る', 'LIVE を始めると自動でつながる'],
  ['how3', 'Zap', 'マイクラで妨害が起きる', '配信画面にはギフト通知も出る'],
];

// マス目に並べる妨害（全部は「できること」のページ）
const SLOTS = ['tnt', 'mob', 'lightning', 'jail', 'freeze', 'levitate', 'night', 'fill_help'];
const SLOT_LABELS = { tnt: 'TNT', mob: 'モブ', lightning: '雷', jail: '逮捕', freeze: '操作禁止', levitate: '浮遊', night: '夜にする', fill_help: 'お助け' };

const TRIGGERS = [
  ['Gift', 'ギフトの種類'],
  ['Coins', 'コイン数'],
  ['Heart', 'いいねの回数'],
  ['MessageSquare', 'コメントの言葉'],
  ['UserPlus', 'フォロー・シェア'],
];

const MODES = [
  ['modeFill', '埋め立て', '空中のガラスの枠を、ブロックで埋めきればクリア。ギフトで枠が広がったり、TNT で崩されたりします。'],
  ['modeMining', '採掘・収集チャレンジ', '制限時間のうちに、決めた資源を決めた数だけ集めればクリア。じゃまも応援も飛んできます。'],
];

const STEPS = [
  ['step1', '開いて「まとめて導入する」', 'インストールはありません。MOD を動かす土台（Fabric）も MOD も、アプリが入れます。'],
  ['step2', 'TikTok ID を入れる', '入れるのは ID（@のあと）だけ。パスワードは使いません。'],
  ['step3', 'マイクラを起動して、LIVE を始める', `ランチャーで「fabric-loader-${MINECRAFT_VERSION}」を選んで起動。TikTok へは自動でつながります。`],
];

const SAFE = [
  ['Lock', 'パスワードは使いません', '入れるのは TikTok ID だけ。TikTok にログインもしません。'],
  ['HardDrive', '記録は PC の中だけ', '設定や配信の記録を、提供者に送ることはありません。広告も入っていません。'],
  ['MessagesSquare', '更新と相談の窓口', '新しい版はお知らせで公開。困ったら Discord で相談できます。'],
];

const FAQ = [
  ['本当に無料ですか？', '今はすべての機能を無料で使えます。将来、有料の機能を足すことがありますが、そのときは前もってお知らせします。'],
  ['統合版（スマホ・Switch など）のマイクラで使えますか？', `使えません。Java版 ${MINECRAFT_VERSION} だけです。`],
  ['今のワールドが壊れませんか？', 'TNT などで地形が変わることがあります。配信用のワールドを分けるのがおすすめです。'],
  ['マルチプレイのサーバーで使えますか？', '使えません。シングルプレイのワールドで使います。'],
];

const REQUIREMENTS = [
  ['Laptop', <>Windows 11 の PC（Windows 10 は <Todo>動くか確かめる</Todo>）</>],
  ['Gamepad2', `Minecraft Java版 ${MINECRAFT_VERSION}（シングルプレイ）`],
  ['Radio', 'TikTok LIVE を配信できるアカウント'],
];

// 検索エンジン向けの説明（アプリであること・無料・Windows・版）と、よくある質問
function structuredData(version) {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'STATIC ARC',
      applicationCategory: 'GameApplication',
      operatingSystem: 'Windows 11',
      ...(version && { softwareVersion: version }),
      description: 'TikTok LIVE のギフト・いいね・コメントで、配信中の Minecraft Java版に妨害を出せる配信ツール。',
      url: `${SITE.siteUrl}/`,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'JPY' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    },
  ];
}

export default function Home() {
  const latest = NEWS.find((entry) => entry.version);
  return (
    <>
      <JsonLd data={structuredData(latest?.version)} />
      <section className="hero">
        <div className="hero-clouds" aria-hidden="true"><span /><span /></div>
        <div className="container hero-inner">
          <div className="hero-text">
            <p className="hero-tag"><Icon name="Radio" size={14} />TikTok LIVE で マイクラを配信している人へ</p>
            <h1>ギフトが届くと、<br />マイクラに TNT が<br />落ちてくる。</h1>
            <p className="hero-lead">STATIC ARC は、視聴者のギフト・いいね・コメントで、配信中のマイクラに妨害を出せる無料ツールです。何が届いたら何が起きるかは、あなたが決められます。</p>
            <div className="hero-actions">
              <Link href="#download" className="button button-large"><Icon name="Download" size={20} />無料でダウンロード</Link>
              <Link href="#how" className="text-link">まず、しくみを見る<Icon name="ChevronDown" size={16} /></Link>
            </div>
            <ul className="facts">
              <li><Icon name="BadgeCheck" size={18} />無料</li>
              <li><Icon name="Lock" size={18} />TikTok のパスワード不要</li>
              <li><Icon name="Laptop" size={18} />Windows 11 ／ Java版 {MINECRAFT_VERSION}</li>
            </ul>
          </div>
          <div className="hero-media">
            <div className="falling" aria-hidden="true">
              <ActionIcon name="tnt" size={42} />
              <ActionIcon name="fill_help" size={42} />
            </div>
            <Media id="hero" className="framed" />
          </div>
        </div>
      </section>

      <Strata layer="grass" above="sky" depth={1} label="しくみ" />
      <section className="band band-white" id="how">
        <div className="container stack">
          <SectionHead icon="Workflow" title="どんなツール？">視聴者のアクションが、あなたのマイクラに届くまでの流れです。</SectionHead>
          <ol className="flow">
            {HOW.map(([id, icon, title, text]) => (
              <li key={id} className="card">
                <Media id={id} />
                <div className="card-body">
                  <b className="with-icon"><Icon name={icon} size={18} />{title}</b>
                  <span>{text}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <Strata layer="dirt" above="white" depth={2} label="できること" />
      <section className="band band-paper" id="features">
        <div className="container stack">
          <SectionHead icon="Sparkles" tone="gold" title="どんなことが起きるの？">妨害もお助けも、数（TNT の個数・逮捕の秒数など）まで決められます。</SectionHead>
          <div className="inventory-row">
            <ul className="inventory" aria-label="出せる妨害の例">
              {SLOTS.map((name) => (
                <li key={name} className={name === 'tnt' ? 'slot slot-selected' : 'slot'}>
                  <ActionIcon name={name} size={38} />
                  <span>{SLOT_LABELS[name]}</span>
                </li>
              ))}
            </ul>
            <div className="stack-sm inventory-side">
              <div className="card card-pad">
                <b className="card-title">TNT</b>
                <span>枠の中に TNT が落ちて、埋めたブロックを壊します。</span>
                <span className="example"><Icon name="Gift" size={16} />100コイン以上のギフト<Icon name="ArrowRight" size={16} />TNT ×3</span>
              </div>
              <div className="stack-xs">
                <b>きっかけに使えるもの</b>
                <ul className="chips">{TRIGGERS.map(([icon, label]) => <li key={label}><Icon name={icon} size={16} />{label}</li>)}</ul>
              </div>
              <Link href="/features/" className="text-link">妨害の一覧をすべて見る<Icon name="ArrowRight" size={16} /></Link>
            </div>
          </div>
          <div className="grid-2">
            {MODES.map(([id, title, text]) => (
              <article key={id} className="card">
                <Media id={id} />
                <div className="card-body">
                  <span className="kicker"><Icon name="Gamepad2" size={14} />ゲームモード</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <div className="nudge">
        <div className="container nudge-inner">
          <p><Icon name="Settings2" size={20} />設定はあとから何度でも変えられます。まずは入れて、試してみてください。</p>
          <Link href="#download" className="button"><Icon name="Download" size={18} />無料でダウンロード</Link>
        </div>
      </div>

      <Strata layer="stone" above="ink" depth={3} label="はじめ方" />
      <section className="band band-white" id="start">
        <div className="container stack">
          <SectionHead icon="Wrench" tone="stone" title="準備はむずかしい？">MOD やファイルを自分で探して入れる必要はありません。3ステップで始められます。</SectionHead>
          <ol className="grid-3">
            {STEPS.map(([id, title, text], i) => (
              <li key={id} className="card">
                <Media id={id} />
                <div className="card-body"><b><span className="step-no">{i + 1}</span>{title}</b><span>{text}</span></div>
              </li>
            ))}
          </ol>
          <Link href="/guide/" className="text-link"><Icon name="BookOpen" size={18} />くわしい手順は使い方ガイドへ</Link>
        </div>
      </section>

      <Strata layer="deep" above="white" depth={4} label="安心して使うために" />
      <section className="band band-paper" id="safety">
        <div className="container stack">
          <SectionHead icon="ShieldCheck" tone="grass" title="危なくない？" />
          <div className="grid-3">
            {SAFE.map(([icon, title, text]) => (
              <div key={title} className="card card-pad">
                <IconBadge name={icon} tone="grass" />
                <b className="card-title">{title}</b>
                <span className="muted">{text}</span>
              </div>
            ))}
          </div>
          <div className="card card-pad card-notice" id="before">
            <b className="card-title with-icon"><Icon name="TriangleAlert" size={20} />先にお伝えしておくこと</b>
            <ul>
              <li>STATIC ARC は TikTok・Minecraft の公式ツールではありません。TikTok LIVE のギフトなどは、非公式のしくみで受け取っています。</li>
              <li>TikTok の規約では、こうしたツールの使用が認められていない可能性があり、<strong>TikTok のアカウントや LIVE の機能が制限される可能性はゼロではありません</strong>。ご理解のうえで、ご自身の判断でお使いください。</li>
              <li>「機械的に何度もギフトをねだる」「ギフトと引きかえに○○すると約束する」ような配信は、TikTok でギフトを受け取れなくなることがあります。視聴者といっしょに遊ぶ使い方をおすすめします。</li>
              <li>TikTok LIVE につなぐとき、TikTok ID が外部のサービス「Euler Stream」に送られます。くわしくは <Link href="/privacy/">プライバシーポリシー</Link> へ。</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="band band-white" id="faq">
        <div className="container stack">
          <SectionHead icon="CircleHelp" title="よくある質問" />
          <div className="grid-2">
            {FAQ.map(([q, a]) => (
              <div key={q} className="card card-pad faq-item"><b><span className="q-mark">Q</span>{q}</b><p className="muted">{a}</p></div>
            ))}
            <div className="card card-pad faq-item">
              <b><span className="q-mark">Q</span>スマホからの配信でも使えますか？</b>
              <p className="muted"><Todo>確かめてから書く</Todo> マイクラと STATIC ARC は PC で動かします。配信画面の部品は、同じ PC の TikTok LIVE Studio で使います。</p>
            </div>
            <div className="card card-pad faq-item">
              <b><span className="q-mark">Q</span>やめたいときは？</b>
              <p className="muted">使い方ガイドの <Link href="/guide/#uninstall">やめ方</Link> の手順で、入れる前の状態に戻せます。</p>
            </div>
          </div>
          <p className="muted">ほかに困ったときは、<Link href="/guide/#trouble">使い方ガイドの「よくある困りごと」</Link> か <Link href="/contact/">お問い合わせ</Link> へ。</p>
        </div>
      </section>

      <Strata layer="bedrock" above="white" />
      <section className="band band-bedrock" id="download">
        <div className="container stack">
          <span className="depth-note">深さ 5 ／ いちばん下まで来ました</span>
          <div className="download-row">
            <div className="stack-sm download-main">
              <div className="band-title">
                <IconBadge name="Download" tone="grass" size={24} />
                <h2>ダウンロード</h2>
              </div>
              <div className="card card-pad">
                <b className="card-title">使えるか、ここで確認</b>
                <ul className="req-list">
                  {REQUIREMENTS.map(([icon, text], i) => <li key={i}><Icon name={icon} size={20} /><span>{text}</span></li>)}
                </ul>
              </div>
              <div className="download-actions">
                <DownloadButton large><Icon name="Download" size={20} />無料でダウンロード（Windows）</DownloadButton>
                {latest && <span>最新版 v{latest.version} ／ <Link href="/news/">更新履歴</Link></span>}
              </div>
              <p className="small">ダウンロードの前に、<Link href="/terms/">利用規約</Link> と <Link href="/privacy/">プライバシーポリシー</Link> をお読みください。</p>
            </div>
            <div className="after-download">
              <b className="card-title with-icon"><Icon name="ListChecks" size={20} />ダウンロードしたあとは</b>
              <ol>
                <li>ファイルを開きます。初めてのときは青い「Windows によって PC が保護されました」が出ます。電子署名がないためで、「詳細情報」→「実行」で開けます。</li>
                <li>「はじめの準備」が始まるので、画面のとおりに進めます。</li>
                <li>わからないときは、<Link href="/guide/">使い方ガイド</Link> か Discord へ。</li>
              </ol>
              <Discord button><Icon name="MessagesSquare" size={18} />Discord に参加する</Discord>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

import Link from 'next/link';
import { ActionIcon } from '../components/ActionIcon.js';
import { PcHandoff } from '../components/PcHandoff.js';
import { HeroFx } from '../components/HeroFx.js';
import { MotionToggle } from '../components/MotionToggle.js';
import { Ticker } from '../components/Ticker.js';
import { Discord } from '../components/Discord.js';
import { DownloadButton } from '../components/DownloadButton.js';
import { Icon, IconBadge } from '../components/Icon.js';
import { JsonLd } from '../components/JsonLd.js';
import { Media } from '../components/Media.js';
import { SectionHead } from '../components/SectionHead.js';
import { Strata } from '../components/Strata.js';
import { NEWS } from '../news.js';
import { MINECRAFT_VERSION, SITE } from '../site.js';

// トップは、見に来た配信者の疑問に上から順に答える（何？ → どんなこと？ → むずかしい？ → 危なくない？ → 動く？ → ダウンロード）

const HOW = [
  ['how1', 'Gift', '視聴者がギフトを送る', 'いいね・コメント・フォローでも起こせます'],
  ['how2', 'Monitor', 'あなたの PC が受け取る', 'LIVE を始めると、自動でつながります'],
  ['how3', 'Zap', 'マイクラで妨害が起きる', '配信画面にはギフト通知も出ます'],
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
  ['modeMining', '採掘・収集チャレンジ', '制限時間のうちに、決めた資源を決めた数だけ集めればクリア。視聴者から、じゃまも応援も飛んできます。'],
];

const STEPS = [
  ['step1', 'アプリを開いて「まとめて導入する」を押す', 'インストール作業は不要です。MOD を動かす土台（Fabric）も MOD も、アプリが入れます。'],
  ['step2', 'TikTok ID を入れる', '入れるのは ID（@ のあとの部分）だけです。パスワードは使いません。'],
  ['step3', 'マイクラを起動して、LIVE を始める', `ランチャーで「fabric-loader-${MINECRAFT_VERSION}」を選んで起動します。TikTok へは自動でつながります。`],
];

const SAFE = [
  ['Lock', 'パスワードは使いません', '入れるのは TikTok ID だけです。TikTok へのログインもしません。'],
  ['HardDrive', '記録は PC の中だけ', '設定や配信の記録が、開発者に送られることはありません。広告もありません。'],
  ['MessagesSquare', '更新と相談の窓口', '新しい版はお知らせでお伝えします。困ったときは Discord で相談できます。'],
];

// 配信者がダウンロードの前に気にすること（お金・アカウント・安全・自分の環境で動くか・試せるか・視聴者の手間・ワールド）。
// 答えは、構造化データ（検索結果のよくある質問）にもそのまま使う
const FAQ = [
  ['本当に無料ですか？', '今はすべての機能を無料でお使いいただけます。ギフトの売上から手数料をいただくこともありません。将来、有料の機能を加える場合は、前もってお知らせします。'],
  ['TikTok のアカウントが止められたりしませんか？', 'STATIC ARC は TikTok 公式のツールではないため、絶対に大丈夫とはお約束できません。ギフトを機械的にねだるような配信は、TikTok の決まりで収益化の対象外になることがあります。視聴者といっしょに楽しむ使い方をおすすめしています。'],
  ['開くと青い警告が出ました。ウイルスではありませんか？', 'STATIC ARC には電子署名（作った人を証明するしくみ）がないため、Windows が念のため警告を出しています。「詳細情報」→「実行」で開けます。TikTok のパスワードは使わず、設定や配信の記録が開発者に送られることもありません。'],
  ['Mac や統合版（スマホ・Switch）でも使えますか？', `申し訳ありませんが、今は Windows の PC と、Minecraft Java版 ${MINECRAFT_VERSION} だけに対応しています。`],
  ['配信していなくても試せますか？', 'はい。アプリの「▶ 試す」を押すと、ギフトが届いたことにしてマイクラで妨害を試せます。LIVE の前に、どんな動きになるか確かめておくと安心です。'],
  ['視聴者は何か準備が必要ですか？', 'いいえ、必要ありません。視聴者はいつもどおりギフト・いいね・コメントを送るだけで、配信中のマイクラに妨害が届きます。'],
  ['今のワールドが壊れませんか？', 'TNT などで地形が変わることがあります。配信用に別のワールドを用意しておくと安心です。'],
  ['友だちとのマルチプレイでも使えますか？', '今はシングルプレイのワールドでお使いいただく形です。マルチプレイのサーバーには対応していません。'],
];

const REQUIREMENTS = [
  ['Laptop', 'Windows 11 の PC（Windows 10 は動作未確認です）'],
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
        <div className="hero-clouds" aria-hidden="true"><span /><span /><span /><span /></div>
        <MotionToggle className="hero-toggle" />
        <div className="container hero-inner">
          <div className="hero-text">
            <p className="hero-tag"><Icon name="Radio" size={14} />TikTok LIVE でマイクラを配信している人へ</p>
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
            {/* 見出しのとおりに1回だけ動く：ギフトの通知が出る → TNT が3つ落ちてきて積み上がる（動きを減らす設定では最後の形だけ） */}
            <HeroFx>
              <div className="gift-toast">
                <span className="gift-toast-icon"><Icon name="Gift" size={18} /></span>
                <span><b>ギフトが届きました</b><small>100コイン → TNT ×3</small></span>
              </div>
              <div className="tnt-pile">
                <ActionIcon name="tnt" size={44} />
                <ActionIcon name="tnt" size={44} />
                <ActionIcon name="tnt" size={44} />
              </div>
            </HeroFx>
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
              <li key={id} className="card card-row-sm">
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
      <Ticker />
      <section className="band band-paper" id="features">
        <div className="container stack">
          <SectionHead icon="Sparkles" tone="gold" title="どんなことが起きるの？">妨害もお助けも、TNT の個数や逮捕の秒数まで細かく決められます。</SectionHead>
          <div className="inventory-row">
            <ul className="inventory">
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
              <li key={id} className="card card-row-sm">
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
              <li>TikTok LIVE につなぐとき、TikTok ID が外部のサービス「Euler Stream」に送られます。くわしくは<Link href="/privacy/">プライバシーポリシー</Link>へ。</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="band band-white" id="faq">
        <div className="container stack">
          <SectionHead icon="CircleHelp" title="よくある質問" />
          <div className="grid-2">
            {FAQ.map(([q, a]) => (
              <div key={q} className="card card-pad faq-item"><h3><span className="q-mark" aria-hidden="true">Q</span>{q}</h3><p className="muted">{a}</p></div>
            ))}
            <div className="card card-pad faq-item">
              <h3><span className="q-mark" aria-hidden="true">Q</span>やめたいときは？</h3>
              <p className="muted">使い方ガイドの<Link href="/guide/#uninstall">やめ方</Link>の手順で、入れる前の状態に戻せます。</p>
            </div>
          </div>
          <p className="muted">ほかに困ったときは、<Link href="/guide/#trouble">使い方ガイドの「よくある困りごと」</Link>か<Link href="/contact/">お問い合わせ</Link>へ。</p>
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
              <PcHandoff />
              <div className="download-actions">
                <DownloadButton large><Icon name="Download" size={20} />無料でダウンロード（Windows）</DownloadButton>
                {latest && <span>最新版 v{latest.version} ／ <Link href="/news/" className="tap">更新履歴</Link></span>}
              </div>
              <p className="small">ダウンロードの前に、<Link href="/terms/">利用規約</Link>と<Link href="/privacy/">プライバシーポリシー</Link>をお読みください。</p>
            </div>
            <div className="after-download">
              <b className="card-title with-icon"><Icon name="ListChecks" size={20} />ダウンロードしたあとは</b>
              <ol>
                <li>ファイルを開きます。初めてのときは、青い画面で「Windows によって PC が保護されました」と出ます。電子署名がないためで、「詳細情報」→「実行」で開けます。</li>
                <li>「はじめの準備」が始まるので、画面のとおりに進めます。</li>
                <li>わからないときは、<Link href="/guide/">使い方ガイド</Link>か Discord へ。</li>
              </ol>
              <Discord button><Icon name="MessagesSquare" size={18} />Discord に参加する</Discord>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

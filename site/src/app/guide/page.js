import Link from 'next/link';
import { Contact } from '../../components/Contact.js';
import { DocPage } from '../../components/DocPage.js';
import { Todo } from '../../components/Todo.js';
import { MINECRAFT_VERSION } from '../../site.js';
import { pageMeta } from '../../seo.js';

export const metadata = pageMeta({ title: '使い方ガイド', description: 'STATIC ARC の導入から、TikTok LIVE とマイクラのつなぎ方、配信画面の部品の貼り方、妨害の設定、困ったときの直し方までをまとめた使い方ガイドです。', path: '/guide/' });

const PROFILE = `fabric-loader-${MINECRAFT_VERSION}`;

const TOC = [
  ['about', 'できること・必要なもの'],
  ['setup', 'はじめの準備'],
  ['overlay', '配信画面に部品を出す'],
  ['rules', '妨害の設定とゲームモード'],
  ['live', '配信中の操作'],
  ['version', 'マイクラの版について'],
  ['trouble', 'よくある困りごと'],
  ['uninstall', 'やめ方'],
  ['contact', '問い合わせ'],
];

const OVERLAYS = [
  ['ギフト通知', 'ギフトの絵・送った人・出た妨害', '1080×560'],
  ['ギフト表', 'どのギフトで何が起きるかの一覧', '1080×608'],
  ['ゲーム状況', 'ラウンド・集めた数・残り時間、クリアの演出（ゲーム中だけ）', '1080×360'],
  ['いいねの目標', '次の妨害までのいいねの残り', '1080×420'],
  ['ギフトランキング', 'ギフトを多く送った上位5人', '540×600'],
];

const TROUBLES = [
  ['「マイクラのワールドに入っていません」と出る', `「${PROFILE}」以外で起動している、またはワールドに入っていない`, `ランチャーで「${PROFILE}」を選んで起動し、ワールドに入る`],
  ['「マイクラの MOD が古い版です」と出る', 'アプリを新しくしたが、MOD が前のまま', 'マイクラを閉じて、アプリを起動し直す（自動で入れ替わります）'],
  ['「TikTok LIVE はまだ始まっていません」のまま', 'LIVE を始めていない、または TikTok ID が違う', 'LIVE を始める。「接続と準備」で ID（@なし・表示名ではない）を確かめる'],
  ['「TikTok LIVE との接続が切れています」と出る', '通信が一時的に切れた', '自動でつなぎ直します。しばらく待つ'],
  ['ギフトが届いているのに妨害が出ない', '下の「出さなかった理由」のどれか', '「配信」タブの一覧に、理由が出ています'],
  ['変えたルールが使われない', '「保存する」を押していない', '「妨害の設定」の右上の「保存する」を押す'],
  ['配信画面に部品が映らない', 'STATIC ARC を閉じている、別の PC で配信している、URL が途中で切れている', 'STATIC ARC を開いておく。同じ PC の LIVE Studio で使う。「コピー」で貼り直す'],
  ['「まとめて導入する」でランチャーが見つからない', 'ランチャーを一度も起動していない', 'ランチャーを一度起動して閉じてから、もう一度押す'],
];

const SKIPS = [
  ['ルールがないので出さず', 'そのギフトのルールがない。「妨害の設定」で足す'],
  ['一時停止中なので出さず', '一時停止中。「再開」を押す'],
  ['待ち時間中なので出さず', 'ルールの「待ち時間」のあいだ'],
  ['今のゲームモードでは出せないので出さず', '「枠を広げる」など、そのゲームモードでは使えない妨害'],
  ['チャレンジが始まっていないので出さず・チャレンジの一時停止中なので出さず', '採掘チャレンジ専用の妨害で、今は出せない'],
  ['出せませんでした', 'マイクラに届かなかった。マイクラのワールドに入っているか確かめる'],
];

export default function Guide() {
  return (
    <DocPage title="使い方ガイド" path="/guide/" cta toc={TOC} lead={<p className="lead">はじめの準備から、配信中の操作、困ったときの直し方までをまとめています。</p>}>
      <h2 id="about">できること・必要なもの</h2>
      <p>TikTok LIVE で視聴者が送ったギフト・いいね・コメントで、配信中の Minecraft に妨害を出せるツールです。使うのは無料です。</p>
      <ul>
        <li><strong>妨害</strong>：TNT、ゾンビ・クリーパーなどのモブ、雷、逮捕、操作禁止、浮遊、夜にする など</li>
        <li><strong>きっかけ</strong>：ギフト（種類ごと・コイン数で）、いいねの数、コメントの言葉、フォロー、シェア</li>
        <li><strong>ゲームモード</strong>：空中の枠をブロックで埋める「埋め立て」と、時間内に資源を集める「採掘・収集チャレンジ」</li>
        <li><strong>配信画面の部品</strong>：ギフト通知、ギフト表、ゲーム状況、いいねの目標、ギフトランキングを、TikTok LIVE Studio に貼って映せます</li>
      </ul>
      <div className="table-wrap">
        <table>
          <thead><tr><th>必要なもの</th><th>内容</th></tr></thead>
          <tbody>
            <tr><th scope="row">PC</th><td>Windows 11（Windows 10 は <Todo>動くか確かめる</Todo>）</td></tr>
            <tr><th scope="row">Minecraft</th><td><strong>Java版 {MINECRAFT_VERSION}</strong>（統合版は使えません）。シングルプレイのワールドで使います</td></tr>
            <tr><th scope="row">TikTok</th><td>LIVE 配信ができるアカウント（18歳以上）</td></tr>
            <tr><th scope="row">TikTok LIVE Studio</th><td>配信画面の部品を使うときだけ。STATIC ARC と同じ PC で使います</td></tr>
          </tbody>
        </table>
      </div>
      <p>Fabric（MOD を動かす土台）は、アプリが自動で入れるので、自分で用意する必要はありません。</p>

      <h2 id="setup">はじめの準備</h2>
      <p>最初の1回だけです。</p>
      <ol>
        <li><strong>マイクラのランチャーを一度起動して、閉じます。</strong>ランチャーを使ったことがあれば、飛ばして大丈夫です。</li>
        <li><Link href="/">トップページ</Link> から <code>StaticArc-（版の番号）.exe</code> をダウンロードして、ダブルクリックします。インストールはありません。このファイル1つで動きます。</li>
        <li>青い画面で「Windows によって PC が保護されました」と出たら、<strong>「詳細情報」→「実行」</strong>を押します。STATIC ARC には電子署名がないため、初めて開くときにこの警告が出ます。</li>
        <li>
          アプリが開くと、「はじめの準備」が始まります。
          <ol>
            <li><strong>マイクラの準備</strong>：マイクラを閉じた状態で「まとめて導入する」を押します。Fabric、Fabric API、STATIC ARC の MOD が入ります。</li>
            <li><strong>TikTok ID</strong>：配信するアカウントの ID を、「@」を付けずに入れます。プロフィールの URL <code>tiktok.com/@○○</code> の○○の部分です（表示名ではありません）。</li>
          </ol>
        </li>
        <li>マイクラのランチャーで、起動する構成を <strong>「{PROFILE}」</strong> に切り替えて「プレイ」を押します。</li>
        <li>配信に使うワールドに入ります。アプリの左下の「マイクラ」が緑になれば、つながっています。</li>
      </ol>
      <figure>
        <img src="/screens/tiktok-id.webp" alt="TikTok のプロフィールの URL の @ のあとが ID" width="1000" height="320" loading="lazy" />
        <figcaption>TikTok ID は、プロフィールの URL の「@」のあとの部分です</figcaption>
      </figure>
      <figure>
        <img src="/screens/minecraft-ready.webp" alt={`ランチャーで ${PROFILE} を選ぶ`} width="1000" height="320" loading="lazy" />
        <figcaption>ランチャーで「{PROFILE}」を選んでから「プレイ」</figcaption>
      </figure>
      <p>TikTok へは、LIVE を始めると自動でつながります。パスワードやログインは要りません。</p>

      <h2 id="overlay">配信画面に部品を出す</h2>
      <p>部品は、TikTok LIVE Studio の「リンク」に URL を貼るだけで出せます。使わない部品は貼らなくて大丈夫です。</p>
      <ol>
        <li>STATIC ARC の「配信画面」タブで、使いたい部品の「コピー」を押します。</li>
        <li>LIVE Studio で「ソースを追加」を押します。</li>
        <li>「リンク」を選んで「追加」を押します。</li>
        <li>リンクの欄に貼り付けて、「ソースを追加」を押します。</li>
        <li>配信画面に出た枠を、好きな位置・大きさに動かします。枠を大きくすると、文字や絵も大きくなります。</li>
      </ol>
      <div className="figure-row">
        <figure>
          <img src="/screens/live-studio-1.webp" alt="「ソースを追加」をクリック" width="1280" height="720" loading="lazy" />
          <figcaption>1.「ソースを追加」</figcaption>
        </figure>
        <figure>
          <img src="/screens/live-studio-2.webp" alt="「リンク」を選んで「追加」をクリック" width="1280" height="720" loading="lazy" />
          <figcaption>2.「リンク」→「追加」</figcaption>
        </figure>
        <figure>
          <img src="/screens/live-studio-3.webp" alt="リンクを入れて「ソースを追加」をクリック" width="1280" height="720" loading="lazy" />
          <figcaption>3. 貼って「ソースを追加」</figcaption>
        </figure>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>部品</th><th>出るもの</th><th>おすすめの大きさ（幅×高さ）</th></tr></thead>
          <tbody>
            {OVERLAYS.map(([name, what, size]) => <tr key={name}><th scope="row">{name}</th><td>{what}</td><td>{size}</td></tr>)}
          </tbody>
        </table>
      </div>
      <p>おすすめの大きさは、縦画面（1080×1920）のときのものです。色や文字の形は、「配信画面」タブの「見た目」で変えられます。</p>
      <ul>
        <li>部品の URL（<code>http://127.0.0.1:...</code>）は、<strong>STATIC ARC と同じ PC でだけ</strong>開けます。配信を別の PC でしているときは使えません。</li>
        <li>STATIC ARC を閉じていると、部品は何も出ません。配信中は開いたままにしてください。</li>
      </ul>

      <h2 id="rules">妨害の設定とゲームモード</h2>
      <h3>妨害の設定（ルール）</h3>
      <p>「どのきっかけで、どの妨害を出すか」を、ルールとして決めます。はじめからいくつか入っているので、そのままでも使えます。</p>
      <ol>
        <li>「妨害の設定」タブで「＋ ルールを追加」を押します。</li>
        <li><strong>きっかけ</strong>を選びます：ギフト（種類を選ぶ）・コイン数で・いいね（回数）・コメント（言葉）・フォロー・シェア。</li>
        <li><strong>出す妨害</strong>を選び、数を決めます。2つ以上選ぶと、その中からランダムで1つ出ます。</li>
        <li>必要なら <strong>出し方の条件</strong>（待ち時間・いつ出すか）や、ギフト通知で鳴らす音・画像などの <strong>演出</strong> を決めます。そのままでも使えます。</li>
        <li>画面右上の <strong>「保存する」</strong> を押します。押すまで、変えたルールは使われません。</li>
      </ol>
      <p>各ルールの <strong>「▶ 試す」</strong> を押すと、そのきっかけが届いたことにして、マイクラで試せます。配信前の確かめに使ってください。</p>
      <p>大事なルールの組み合わせは、「プリセット」に名前を付けて取っておけます。間違えて保存したときは、「変更の履歴」から前の設定に戻せます。</p>
      <h3>ゲームモード</h3>
      <p>「ゲームモード」タブで、遊び方を1つ選びます。ゲームを始めなくても、妨害は出ます。</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th></th><th>埋め立て</th><th>採掘・収集チャレンジ</th></tr></thead>
          <tbody>
            <tr><th scope="row">クリアの条件</th><td>空中のガラスの枠をブロックで埋めきり、決めた秒数崩されなければ 1ラウンドクリア</td><td>制限時間のうちに、決めた資源を決めた数だけ掘って拾えばクリア</td></tr>
            <tr><th scope="row">決めるもの</th><td>ラウンド数、クリアまでの秒数、枠の幅（3〜41 の奇数）・高さ、ブロックの見た目</td><td>対象のアイテム、目標数、制限時間</td></tr>
            <tr><th scope="row">始め方</th><td>枠を作りたい場所に立って「始める」。真上の空中に枠ができます</td><td>「始める」を押すと3秒のカウントダウンのあと始まります</td></tr>
            <tr><th scope="row">気をつけること</th><td>「枠を広げる」など枠を使う妨害は、埋め立て中だけ出ます</td><td>スーパーフラットのワールドには鉱石がありません。シルクタッチで掘った鉱石は数えません。TNT で地形は壊れません</td></tr>
          </tbody>
        </table>
      </div>
      <p>「ワールド」の欄では、時間・天気・モブが自然に湧くか・やられたときの持ち物を、コマンドを使わずに変えられます。この設定はワールドに残ります。</p>

      <h2 id="live">配信中の操作</h2>
      <p>配信中は「配信」タブを開いておきます。届いたギフトと、それで出した妨害が、新しい順に並びます。</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>ボタン</th><th>いつ使うか</th><th>どうなるか</th></tr></thead>
          <tbody>
            <tr><th scope="row">配信前のチェック</th><td>LIVE を始める前</td><td>マイクラ・TikTok・妨害のルール・配信画面の部品などをまとめて確かめます。全部 ✓ なら準備できています</td></tr>
            <tr><th scope="row">一時停止</th><td>少し休みたいとき</td><td>ギフトが来ても妨害を出しません。「再開」で元に戻ります</td></tr>
            <tr><th scope="row">全妨害ストップ</th><td>妨害がたまりすぎた、緊急のとき</td><td>まだ出ていない妨害をすべて取り消して、一時停止にします</td></tr>
          </tbody>
        </table>
      </div>
      <h3>ギフトの「あおり」にならない使い方</h3>
      <p>
        TikTok LIVE では、次のような配信は、ギフトを受け取れなくなる（収益化の対象外になる）ことがあります（
        <a href="https://www.tiktok.com/live/creators/en-US/rules_and_guidance/live_monetization_guidelines" target="_blank" rel="noreferrer">TikTok LIVE Monetization Guidelines</a>）。
      </p>
      <ul>
        <li>機械的に何度もギフトをねだる</li>
        <li>「ギフトをくれたら○○する」と、見返りでギフトを集める</li>
        <li>配信者がほとんど関わらず、ツールに任せきりで進める</li>
      </ul>
      <p>STATIC ARC は、視聴者といっしょに遊ぶためのツールです。ちゃんとプレイして、コメントや妨害へのリアクションを楽しむ使い方をおすすめします。</p>

      <h2 id="version">マイクラの版について</h2>
      <p>STATIC ARC が使えるのは <strong>Minecraft Java版 {MINECRAFT_VERSION}</strong> だけです。</p>
      <ul>
        <li><strong>起動のしかた</strong>：ランチャーで、起動する構成を「{PROFILE}」に切り替えてから「プレイ」を押します。「最新リリース」などで起動すると、妨害は出ません（アプリに「マイクラにつながっていません」と出ます）。</li>
        <li><strong>配信用のワールド（大事）</strong>：{MINECRAFT_VERSION} より新しい版で開かないでください。一度でも新しい版で開くと、{MINECRAFT_VERSION} で開き直せなくなったり、ワールドが壊れたりすることがあります。普段遊ぶワールドとは分けておくのがおすすめです。</li>
        <li><strong>マイクラが新しい版になったら</strong>：マイクラは数か月ごとに新しい版が出ますが、STATIC ARC はすぐには対応しません。「{PROFILE}」で起動すれば、今までどおり使えます。</li>
      </ul>

      <h2 id="trouble">よくある困りごと</h2>
      <p>まず「配信」タブの <strong>「配信前のチェック」</strong> を押してください。うまくいっていないところと、直し方が出ます。</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>困りごと</th><th>よくある原因</th><th>直し方</th></tr></thead>
          <tbody>
            {TROUBLES.map(([problem, cause, fix]) => <tr key={problem}><td>{problem}</td><td>{cause}</td><td>{fix}</td></tr>)}
          </tbody>
        </table>
      </div>
      <h3>出さなかった理由（「配信」タブの一覧に出るもの）</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>表示</th><th>意味</th></tr></thead>
          <tbody>
            {SKIPS.map(([label, meaning]) => <tr key={label}><td>{label}</td><td>{meaning}</td></tr>)}
          </tbody>
        </table>
      </div>
      <p>それでも直らないときは、下の <a href="#contact">問い合わせ</a> を見てください。</p>

      <h2 id="uninstall">やめ方</h2>
      <p>次の順に進めると、STATIC ARC を入れる前の状態に戻ります。</p>
      <p className="callout"><strong>1を飛ばさないでください。</strong>MOD を外したあとでは、ワールドの設定をアプリから元に戻せません。</p>
      <ol>
        <li>
          <strong>マイクラを元に戻す（MOD を外す前に）</strong>
          <ol>
            <li>アプリとマイクラを起動して、配信に使ったワールドに入ります。</li>
            <li>埋め立て・採掘チャレンジが始まっていたら、終えます。</li>
            <li>「ゲームモード」→「ワールド」を、全部「ふつう」に戻します（時間・天気・モブが自然に湧く・やられたときの持ち物）。</li>
            <li>マイクラとアプリを閉じます。</li>
          </ol>
        </li>
        <li><strong>アプリを消す</strong>：ダウンロードした <code>StaticArc-（版の番号）.exe</code> を消します。インストールしていないので、Windows の「アプリと機能」には出てきません。</li>
        <li><strong>設定と記録を消す</strong>（残しておきたければ不要）：エクスプローラーのアドレス欄に <code>%APPDATA%</code> と入れて開き、<code>StaticArc</code> フォルダを消します。</li>
        <li>
          <strong>マイクラから MOD を外す</strong>：アドレス欄に <code>%APPDATA%\.minecraft</code> と入れて開きます。
          <ul>
            <li><code>mods</code> フォルダの <code>static-arc-○○.jar</code> を消します。</li>
            <li>ほかの MOD を使っていなければ、<code>fabric-api-○○.jar</code> も消します。</li>
            <li>ほかの MOD で使っていなければ、ランチャーの <Todo>画面での呼び方を確かめる（起動構成／インストール構成）</Todo> から「{PROFILE}」を消します。</li>
          </ul>
        </li>
      </ol>
      <p>空中に作った枠や、置いたブロックは、ワールドにそのまま残ります。</p>

      <h2 id="contact">問い合わせ</h2>
      <p>困ったときは <Contact /> までご連絡ください。送っていただきたいもの（版・起きたこと・ログ）は <Link href="/contact/">お問い合わせ</Link> のページにまとめています。</p>
      <p className="note">使う前に <Link href="/terms/">利用規約</Link> と <Link href="/privacy/">プライバシーポリシー</Link> をお読みください。</p>
    </DocPage>
  );
}

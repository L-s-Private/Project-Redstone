import Link from 'next/link';
import { ActionIcon } from '../../components/ActionIcon.js';
import { DocPage } from '../../components/DocPage.js';
import { Media } from '../../components/Media.js';
import { shotItem } from '../../media.js';
import { pageMeta } from '../../seo.js';

export const metadata = pageMeta({ title: 'できること', description: 'STATIC ARC で出せる妨害（TNT・モブ・雷・逮捕・操作禁止など）と、ギフト・いいね・コメントなどのきっかけ、ゲームモード、配信画面の部品の一覧です。', path: '/features/' });

const TOC = [
  ['modes', 'ゲームモード'],
  ['triggers', '妨害を出すきっかけ'],
  ['actions', '出せる妨害'],
  ['presets', 'プリセット'],
  ['overlays', '配信画面の部品'],
  ['safety', '配信中の安心機能'],
];

// アプリの「妨害の設定」と同じ並び・説明（app/src/ui/panel.js の ACTION_GROUPS）。アプリで妨害を足したら、ここにも足す。
// 先頭はアイコンと写真の名前（components/ActionIcon.js・src/media.js の ICONS・shotItem）
const ACTION_GROUPS = [
  ['敵・爆発', [
    ['tnt', 'TNT', '枠の中に TNT が落ちて、埋めたブロックを壊します（採掘チャレンジでは地形を壊しません）'],
    ['mob', 'モブ', 'ゾンビ・スケルトン・クリーパー・クモ・ウィッチ・シルバーフィッシュ・ブタが出てきます'],
    ['lightning', '雷', '枠の中に雷が落ちて、まわりのブロックを少し壊します（火事にはなりません）'],
  ]],
  ['動きをじゃまする', [
    ['jail', '逮捕', '枠の横の牢屋に入れられ、決めた秒数のあいだ埋められません。時間が来ると枠に戻ります'],
    ['freeze', '操作禁止', 'その場から動けなくなり、ブロックも置けません'],
    ['levitate', '浮遊', '体がふわふわと浮き上がります'],
    ['night', '夜にする', '決めた秒数のあいだ夜になります。時間が来ると元の時刻に戻ります'],
  ]],
  ['埋め立てをじゃまする', [
    ['fill_expand', '枠を広げる', '枠が広がり、埋める所が増えます'],
    ['fill_raise', '枠を高くする', '枠が高くなり、埋める段が増えます（次のラウンドで元に戻ります）'],
    ['fill_clear', '全消し', '埋めたブロックが全部消えます'],
  ]],
  ['お助け', [
    ['fill_help', 'お助けブロック', '空いている所が下から埋まります'],
    ['fill_layer', '一段埋め', 'いちばん下の空いている段が、まるごと埋まります'],
    ['fill_shrink', '枠を縮める', '枠が小さくなり、埋める所が減ります'],
    ['message', 'メッセージだけ', '配信画面とマイクラにメッセージを出すだけの妨害です。お礼などに使えます'],
  ]],
  ['採掘チャレンジのお助け', [
    ['mining_bonus_drop', '収集支援', '集めるアイテムがプレイヤーの近くに落ちます。拾うと数に入ります（1回の挑戦で目標数の4分の1まで）'],
  ]],
];

const TRIGGERS = [
  ['ギフト', 'ギフトの種類ごとに決めます'],
  ['コイン数', '種類で決めていないギフトは、コイン数で決めます（「100コイン以上なら TNT」など）'],
  ['いいね', 'いいねが決めた回数たまるたび'],
  ['コメント', '決めた言葉がコメントされたとき（同じ人が続けて出すには、少し間をあける必要があります）'],
  ['フォロー・シェア', '配信がフォロー・シェアされたとき'],
];

const PRESETS = [
  ['定番', 'モブと TNT が中心。はじめての方におすすめ'],
  ['やさしめ', 'お助けが多く、クリアしやすい'],
  ['激辛', '逮捕・全消しなど、きつい妨害が多い'],
];

const OVERLAYS = [
  ['ギフト通知', 'ギフトの絵・送った人・出た妨害'],
  ['ギフト表', 'どのギフトで何が起きるかの一覧'],
  ['ゲーム状況', 'ラウンド・集めた数・残り時間、クリアの演出（ゲーム中だけ）'],
  ['いいねの目標', '次の妨害までのいいねの残り'],
  ['ギフトランキング', 'ギフトを多く送った上位5人'],
];

// 妨害ごとのカード。上にゲーム画面の写真（起きた瞬間）、下にアイコン・名前・説明
function ActionCards({ actions }) {
  return (
    <ul className="shot-grid">
      {actions.map(([key, name, text]) => (
        <li key={key} className="card">
          <Media item={shotItem(key)} alt={`${name}が起きた瞬間のゲーム画面`} />
          <div className="card-body">
            <b className="with-icon"><ActionIcon name={key} size={24} />{name}</b>
            <span>{text}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Table({ head, rows }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>{head.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
        <tbody>
          {rows.map(([name, text]) => <tr key={name}><th scope="row">{name}</th><td>{text}</td></tr>)}
        </tbody>
      </table>
    </div>
  );
}

export default function Features() {
  return (
    <DocPage
      title="できること"
      path="/features/" cta
      toc={TOC}
      lead={<p className="lead">STATIC ARC で出せる妨害と、使える機能の一覧です。どれも無料で使えます。設定のしかたは<Link href="/guide/">使い方ガイド</Link>にあります。</p>}
    >
      <h2 id="modes">ゲームモード</h2>
      <p>遊び方を1つ選びます。ゲームを始めなくても、妨害は出せます。</p>
      <div className="grid-2">
        <article className="card">
          <Media id="modeFill" />
          <div className="card-body">
            <h3>埋め立て</h3>
            <p>空中のガラスの枠を、ブロックで埋めきればクリア。枠の幅・高さ・ラウンド数を決められます。視聴者のギフトで、枠が広がったり TNT で崩されたりします。</p>
          </div>
        </article>
        <article className="card">
          <Media id="modeMining" />
          <div className="card-body">
            <h3>採掘・収集チャレンジ</h3>
            <p>制限時間のうちに、決めた資源を決めた数だけ掘って拾えばクリア。ギフトでじゃまも、応援も飛んできます。</p>
          </div>
        </article>
      </div>

      <h2 id="triggers">妨害を出すきっかけ</h2>
      <p>「どのきっかけで、どの妨害を出すか」を、自由に組み合わせられます。</p>
      <Table head={['きっかけ', '出るとき']} rows={TRIGGERS} />

      <h2 id="actions">出せる妨害</h2>
      <p>数（TNT の個数・逮捕の秒数など）も決められます。2つ以上選ぶと、その中からランダムで1つ出ます。</p>
      {ACTION_GROUPS.map(([group, actions]) => (
        <section key={group}>
          <h3>{group}</h3>
          <ActionCards actions={actions} />
        </section>
      ))}
      <p>ギフトごとに、配信画面で鳴らす音や、出す画像・動画も付けられます。</p>

      <h2 id="presets">プリセット</h2>
      <p>はじめから、ルールの組み合わせが3つ入っています。選ぶだけで使えます。自分で作った組み合わせも、名前を付けて保存できます。</p>
      <Table head={['プリセット', '中身']} rows={PRESETS} />

      <h2 id="overlays">配信画面の部品</h2>
      <p>TikTok LIVE Studio に URL を貼るだけで、縦画面の配信に重ねられます。</p>
      <Table head={['部品', '出るもの']} rows={OVERLAYS} />

      <h2 id="safety">配信中の安心機能</h2>
      <ul>
        <li><strong>配信前のチェック</strong>：マイクラ・TikTok・配信画面の部品・妨害の設定の準備ができているかを、まとめて確かめられます。</li>
        <li><strong>全妨害ストップ</strong>：妨害がたまりすぎたときに、待っている妨害を取り消し、マイクラの中の妨害もすぐに止めます。</li>
        <li><strong>一時停止</strong>：休憩中などは、妨害を出さないようにできます。</li>
        <li><strong>試す</strong>：ルールごとに、ギフトが届いたことにしてマイクラで試せます。</li>
        <li><strong>変更の履歴</strong>：間違えて保存しても、前の設定に戻せます。</li>
      </ul>
    </DocPage>
  );
}

import Link from 'next/link';
import { Discord } from './Discord.js';
import { Icon } from './Icon.js';

// ページのいちばん下の「次にすること」。読み終わった人を、ダウンロードか相談へ案内する
export function CtaBand() {
  return (
    <section className="cta-band" aria-label="ダウンロード">
      <div className="container cta-band-inner">
        <div className="stack-xs">
          <p className="cta-band-title">準備ができたら、さっそく試してみましょう</p>
          <p className="cta-band-text">無料です。わからないことは Discord で相談できます。</p>
        </div>
        <div className="cta-band-actions">
          <Link href="/#download" className="button"><Icon name="Download" size={18} />無料でダウンロード</Link>
          <Discord button><Icon name="MessagesSquare" size={18} />Discord に参加する</Discord>
        </div>
      </div>
    </section>
  );
}

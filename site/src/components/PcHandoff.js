'use client';
import { useEffect, useState } from 'react';
import { SITE } from '../site.js';
import { Icon, IconBadge } from './Icon.js';

// スマホで見に来た人向け。アプリは Windows の PC で使うので、このページを PC へ送る手段を出す。
// 出すかどうかは CSS で決める（指で操作する小さい画面だけ。globals.css の .pc-handoff）
export function PcHandoff() {
  const [canShare, setCanShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = `${SITE.siteUrl}/#download`;
  useEffect(() => setCanShare(typeof navigator.share === 'function'), []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  const share = () => navigator.share({ title: 'STATIC ARC のダウンロード', url }).catch(() => {});
  return (
    <div className="pc-handoff card card-pad">
      <IconBadge name="Laptop" />
      <b className="card-title">スマホで見ている方へ</b>
      <span className="muted">STATIC ARC は Windows の PC で使うアプリです。このページを PC で開いて、ダウンロードしてください。</span>
      <div className="pc-handoff-actions">
        {canShare && <button type="button" className="button" onClick={share}><Icon name="Share2" size={18} />PC に送る（共有）</button>}
        <button type="button" className={canShare ? 'button button-ghost' : 'button'} onClick={copy}>
          <Icon name={copied ? 'Check' : 'Link'} size={18} />{copied ? 'コピーしました' : 'リンクをコピー'}
        </button>
      </div>
      <span className="sr-only" aria-live="polite">{copied ? 'リンクをコピーしました' : ''}</span>
    </div>
  );
}

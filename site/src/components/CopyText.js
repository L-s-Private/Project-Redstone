'use client';
import { useRef, useState } from 'react';
import { Icon } from './Icon.js';

const MESSAGES = { copied: 'コピーしました', selected: '選びました。Ctrl＋C でコピーできます' };

// フォルダの場所など、そのまま貼り付けて使う文字。横の「コピー」で写せるので、打ち間違えなくて済む。
// ブラウザがコピーを許さないときは、文字を選んだ状態にして Ctrl＋C を案内する
export function CopyText({ text }) {
  const [state, setState] = useState('');
  const codeRef = useRef(null);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
    } catch {
      const range = document.createRange();
      range.selectNodeContents(codeRef.current);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
      setState('selected');
    }
    setTimeout(() => setState(''), 4000);
  };
  return (
    <span className="copy-text">
      <code ref={codeRef}>{text}</code>
      <button type="button" className="copy-button" onClick={copy} aria-label={`${text} をコピー`}>
        <Icon name={state === 'copied' ? 'Check' : 'Copy'} size={14} />
        <span aria-hidden="true">{MESSAGES[state] ?? 'コピー'}</span>
      </button>
      <span className="sr-only" aria-live="polite">{MESSAGES[state] ?? ''}</span>
    </span>
  );
}

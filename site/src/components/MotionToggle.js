'use client';
import { useEffect, useState } from 'react';
import { Icon } from './Icon.js';

// ずっと動き続けるもの（雲・横に流れる帯）を止める／動かすボタン。
// どこで押してもページ全体に効く（<html data-motion="off">）。次に開いたときも覚えておく
const KEY = 'static-arc-motion';
const EVENT = 'static-arc-motion';

function readOff() {
  return document.documentElement.dataset.motion === 'off';
}

export function MotionToggle({ className = '' }) {
  const [off, setOff] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === 'off') document.documentElement.dataset.motion = 'off';
    } catch {}
    setOff(readOff());
    const sync = () => setOff(readOff());
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);
  const toggle = () => {
    const next = !readOff();
    if (next) document.documentElement.dataset.motion = 'off';
    else delete document.documentElement.dataset.motion;
    try {
      localStorage.setItem(KEY, next ? 'off' : 'on');
    } catch {}
    window.dispatchEvent(new Event(EVENT));
  };
  return (
    <button type="button" className={`motion-toggle ${className}`} onClick={toggle} aria-pressed={off}>
      <Icon name={off ? 'Play' : 'Pause'} size={14} />
      <span className="motion-toggle-label">{off ? '動かす' : '動きを止める'}</span>
    </button>
  );
}

'use client';
import { useEffect, useRef, useState } from 'react';

// いちばん上の「ギフトの通知 → TNT が落ちる」の動き。画面に入ってから1回だけ動かす
// （スマホでは枠が文章の下にあるので、開いた瞬間に動かすと見る前に終わってしまう）
export function HeroFx({ children }) {
  const ref = useRef(null);
  const [waiting, setWaiting] = useState(false);
  useEffect(() => {
    const el = ref.current;
    const rect = el.getBoundingClientRect();
    if (rect.top + rect.height / 2 < window.innerHeight) return;
    setWaiting(true);
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setWaiting(false);
      observer.disconnect();
    }, { threshold: 0.5 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className={waiting ? 'hero-fx is-waiting' : 'hero-fx'} aria-hidden="true">{children}</div>;
}

'use client';
import { useEffect, useRef, useState } from 'react';

// 目次。今読んでいる節に印を付ける（スマホでは横に流れる帯なので、その項目が見える所まで帯を動かす）
export function TocNav({ toc }) {
  const [active, setActive] = useState(toc[0]?.[0]);
  const navRef = useRef(null);
  useEffect(() => {
    const headings = toc.map(([id]) => document.getElementById(id)).filter(Boolean);
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActive(visible[0].target.id);
    }, { rootMargin: '-80px 0px -65% 0px' });
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [toc]);
  useEffect(() => {
    const nav = navRef.current;
    const link = nav?.querySelector('[aria-current]');
    if (!nav || !link || nav.scrollWidth <= nav.clientWidth) return;
    nav.scrollTo({ left: link.offsetLeft - 16, behavior: 'smooth' });
  }, [active]);
  return (
    <nav className="toc" aria-label="目次" ref={navRef}>
      <p>目次</p>
      {toc.map(([id, label]) => <a key={id} href={`#${id}`} aria-current={id === active ? 'true' : undefined}>{label}</a>)}
    </nav>
  );
}

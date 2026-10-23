'use client';
import { useEffect, useRef } from 'react';

// 音なしでくり返す短い録画。動きを減らす設定の PC では、最初の1コマで止めておく
export function LoopVideo(props) {
  const ref = useRef(null);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) ref.current?.pause();
  }, []);
  return <video ref={ref} autoPlay muted loop playsInline {...props} />;
}

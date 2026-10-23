'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV } from '../site.js';

// 上のメニュー。今いるページに印を付ける
export function NavLinks() {
  const pathname = usePathname();
  return NAV.map((item) => {
    const current = !item.href.includes('#') && pathname === item.href;
    return <Link key={item.href} href={item.href} aria-current={current ? 'page' : undefined}>{item.label}</Link>;
  });
}

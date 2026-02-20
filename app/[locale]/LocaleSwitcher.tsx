'use client';

import Link from 'next/link';
import {usePathname, useSearchParams} from 'next/navigation';

const LOCALES = ['ja', 'en', 'km'] as const;

function replaceLocale(pathname: string, nextLocale: string) {
  // pathname: "/ja/profile" の想定。もし "/" などでも壊れないようにする
  const match = pathname.match(/^\/(ja|en|km)(\/.*)?$/);
  const rest = match ? (match[2] ?? '') : pathname; // "/profile" など
  // rest が "/" のみなら空に寄せる（/en/ にならないように）
  const normalized = rest === '/' ? '' : rest;
  return `/${nextLocale}${normalized}`;
}

export default function LocaleSwitcher() {
  const pathname = usePathname() ?? '/';
  const searchParams = useSearchParams();
  const qs = searchParams.toString();

  const makeHref = (l: string) => {
    const p = replaceLocale(pathname, l);
    return qs ? `${p}?${qs}` : p;
  };

  return (
    <div className="nav-links">
      {LOCALES.map((l) => (
        <Link key={l} href={makeHref(l)}>
          {l.toUpperCase()}
        </Link>
      ))}
    </div>
  );
}

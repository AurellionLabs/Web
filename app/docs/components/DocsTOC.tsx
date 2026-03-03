'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface Heading {
  level: number;
  text: string;
  id: string;
}

export function DocsTOC({ headings }: { headings: Heading[] }) {
  const [active, setActive] = useState('');

  useEffect(() => {
    const els = headings
      .map((h) => document.getElementById(h.id))
      .filter(Boolean) as HTMLElement[];
    if (!els.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        }
      },
      { rootMargin: '-20% 0% -70% 0%', threshold: 0 },
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <aside
      className="hidden xl:block w-56 shrink-0 sticky top-[89px] h-[calc(100vh-89px)] overflow-y-auto py-6 px-3"
      style={{ scrollbarWidth: 'thin' }}
    >
      <div className="font-mono text-[9px] tracking-[0.25em] uppercase text-white/60 mb-4 flex items-center gap-2">
        <div className="w-3 h-[1px] bg-gold/30" />
        ON THIS PAGE
      </div>

      <nav className="space-y-0.5">
        {headings.map((h) => (
          <a
            key={h.id}
            href={`#${h.id}`}
            className={cn(
              'block text-[11px] font-mono leading-snug py-1 transition-all duration-200 border-l-2',
              h.level === 2 ? 'pl-3' : h.level === 3 ? 'pl-5' : 'pl-7',
              active === h.id
                ? 'text-gold border-gold'
                : 'text-white/60 border-transparent hover:text-white/80 hover:border-foreground/20',
            )}
          >
            {h.text}
          </a>
        ))}
      </nav>

      {/* Decorative lines */}
      <div className="mt-6 space-y-1 opacity-15">
        {[80, 60, 40, 20].map((w, i) => (
          <div key={i} className="h-[1px] bg-gold" style={{ width: `${w}%` }} />
        ))}
      </div>
    </aside>
  );
}

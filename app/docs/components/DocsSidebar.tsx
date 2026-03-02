'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { NAV_STRUCTURE, type NavItem } from '@/lib/docs-nav';
import { cn } from '@/lib/utils';

function slugToHref(slug: string[]): string {
  return '/docs/' + slug.join('/');
}

function NavSection({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState<boolean>(() => {
    function hasActive(nav: NavItem): boolean {
      if (nav.slug && pathname === slugToHref(nav.slug)) return true;
      return (nav.children ?? []).some(hasActive);
    }
    return hasActive(item);
  });

  const isLeaf = !item.children;
  const isActive =
    isLeaf && item.slug ? pathname === slugToHref(item.slug) : false;

  if (isLeaf && item.slug) {
    return (
      <Link
        href={slugToHref(item.slug)}
        className={cn(
          'relative flex items-center gap-2 py-1.5 pr-3 text-sm transition-all duration-200',
          depth === 0 ? 'pl-3' : depth === 1 ? 'pl-6' : 'pl-9',
          isActive
            ? 'text-gold'
            : 'text-foreground/40 hover:text-foreground/80',
        )}
      >
        {isActive && (
          <>
            <div className="absolute left-0 inset-y-0 w-[2px] bg-gold" />
            <div className="absolute left-0 inset-y-0 right-0 bg-gold/[0.04]" />
            <div className="absolute top-0 left-0 w-3 h-[1px] bg-crimson/60" />
          </>
        )}
        <span
          className={cn(
            'relative font-mono text-[11px] tracking-[0.06em] leading-snug',
            depth >= 2 && 'text-[10px]',
          )}
        >
          {item.title}
        </span>
      </Link>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center justify-between w-full py-2 pr-3 text-left transition-all duration-200 hover:text-foreground/80',
          depth === 0 ? 'pl-3' : 'pl-6',
        )}
      >
        <div className="flex items-center gap-2">
          {depth === 0 && item.icon && (
            <span className="text-gold/40 text-[11px] font-mono">
              {item.icon}
            </span>
          )}
          <span
            className={cn(
              'font-mono tracking-[0.1em] uppercase',
              depth === 0
                ? 'text-[10px] text-foreground/60 font-bold'
                : 'text-[10px] text-foreground/40',
            )}
          >
            {item.title}
          </span>
        </div>
        <span className="text-foreground/25">
          {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        </span>
      </button>
      {open && (
        <div
          className="border-l ml-3"
          style={{ borderColor: 'hsl(43 18% 16%)' }}
        >
          {(item.children ?? []).map((child: NavItem) => (
            <NavSection key={child.title} item={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function DocsSidebar() {
  return (
    <aside
      className="hidden md:flex flex-col w-64 shrink-0 border-r sticky top-[83px] h-[calc(100vh-83px)] overflow-y-auto"
      style={{
        borderColor: 'hsl(43 18% 14%)',
        background: 'hsl(0 0% 6%)',
        scrollbarWidth: 'thin',
      }}
    >
      <div className="px-3 pt-4 pb-2">
        <div
          className="flex items-center gap-2 px-2 py-1.5 border"
          style={{ borderColor: 'hsl(43 18% 18%)' }}
        >
          <div className="w-1.5 h-1.5 bg-gold/60 animate-eva-pulse" />
          <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-foreground/30">
            PROTOCOL DOCS v1.0
          </span>
        </div>
      </div>

      <nav className="flex-1 py-2">
        {NAV_STRUCTURE.map((section: NavItem) => (
          <div key={section.title} className="mb-1">
            <NavSection item={section} depth={0} />
          </div>
        ))}
      </nav>

      <div
        className="p-3 border-t mt-auto"
        style={{ borderColor: 'hsl(43 18% 14%)' }}
      >
        <div className="font-mono text-[9px] tracking-[0.15em] uppercase text-foreground/20 text-center leading-relaxed">
          BASE SEPOLIA · CHAIN ID 84532
          <br />
          DIAMOND 0x8ed9…66A7
        </div>
      </div>
    </aside>
  );
}

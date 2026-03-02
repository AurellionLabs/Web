import { notFound } from 'next/navigation';
import { getDocBySlug, getAllSlugs } from '@/lib/docs';
import { NAV_STRUCTURE, type NavItem } from '@/lib/docs-nav';
import { DocsTOC } from '../components/DocsTOC';
import {
  GreekKeyStrip,
  EvaSystemReadout,
  EvaSectionMarker,
} from '@/app/components/eva/eva-components';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Tag, ChevronRight } from 'lucide-react';

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const doc = getDocBySlug(slug);
  if (!doc) return {};
  return {
    title: `${doc.title} — Aurellion Docs`,
    description: doc.description,
  };
}

function flattenNav(items: NavItem[]): { title: string; slug: string[] }[] {
  const out: { title: string; slug: string[] }[] = [];
  for (const item of items) {
    if (item.slug) out.push({ title: item.title, slug: item.slug });
    if (item.children) out.push(...flattenNav(item.children));
  }
  return out;
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const doc = getDocBySlug(slug);
  if (!doc) notFound();

  const flat = flattenNav(NAV_STRUCTURE);
  const idx = flat.findIndex((f) => f.slug.join('/') === slug.join('/'));
  const prev = idx > 0 ? flat[idx - 1] : null;
  const next = idx < flat.length - 1 ? flat[idx + 1] : null;

  // Breadcrumb
  const breadcrumbs = [
    { label: 'Docs', href: '/docs' },
    ...slug.slice(0, -1).map((part, i) => ({
      label: part
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' '),
      href: '/docs/' + slug.slice(0, i + 1).join('/'),
    })),
  ];

  // Section number from flat index for EvaSectionMarker
  const sectionNum = String(idx + 1).padStart(2, '0');

  return (
    <div className="flex">
      {/* ── CONTENT COLUMN ── */}
      <article className="relative flex-1 min-w-0 px-6 md:px-10 xl:px-12 py-8 max-w-4xl">
        {/* Ambient system readout — top right, same pattern as rest of site */}
        <EvaSystemReadout
          lines={[`DOC:${sectionNum}`, `SLUG:OK`, `HASH::VALID`]}
          position="right"
        />

        {/* ── BREADCRUMB ── */}
        <nav className="flex items-center gap-1.5 mb-5 flex-wrap">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.href} className="flex items-center gap-1.5">
              {i > 0 && (
                <ChevronRight size={10} className="text-foreground/20" />
              )}
              <Link
                href={crumb.href}
                className="font-mono text-[10px] tracking-[0.12em] uppercase text-foreground/35 hover:text-foreground/70 transition-colors"
              >
                {crumb.label}
              </Link>
            </span>
          ))}
          <ChevronRight size={10} className="text-foreground/20" />
          <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-gold/60">
            {doc.title}
          </span>
        </nav>

        {/* ── SECTION MARKER ── */}
        <EvaSectionMarker
          section={sectionNum}
          label={doc.title}
          variant={idx % 2 === 0 ? 'gold' : 'crimson'}
        />

        {/* Tags */}
        {doc.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <Tag size={10} className="text-foreground/20" />
            {doc.tags.map((tag) => (
              <span
                key={tag}
                className="font-mono text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 border text-foreground/30"
                style={{ borderColor: 'hsl(43 18% 18%)' }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* ── MARKDOWN BODY ── */}
        <div
          className="doc-content"
          dangerouslySetInnerHTML={{ __html: doc.html }}
        />

        {/* ── PREV / NEXT ── */}
        <div
          className="grid grid-cols-2 gap-3 mt-16 pt-6 border-t"
          style={{ borderColor: 'hsl(43 18% 14%)' }}
        >
          {prev ? (
            <Link
              href={'/docs/' + prev.slug.join('/')}
              className="group flex flex-col gap-1 p-4 border transition-all duration-200 hover:border-gold/25"
              style={{
                borderColor: 'hsl(43 18% 16%)',
                background: 'hsl(0 0% 6%)',
                clipPath:
                  'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
              }}
            >
              <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-foreground/25 flex items-center gap-1">
                <ArrowLeft size={9} /> Previous
              </span>
              <span className="font-mono text-xs text-foreground/60 group-hover:text-foreground/90 transition-colors mt-0.5">
                {prev.title}
              </span>
            </Link>
          ) : (
            <div />
          )}

          {next ? (
            <Link
              href={'/docs/' + next.slug.join('/')}
              className="group flex flex-col gap-1 p-4 border transition-all duration-200 hover:border-gold/25 text-right"
              style={{
                borderColor: 'hsl(43 18% 16%)',
                background: 'hsl(0 0% 6%)',
                clipPath:
                  'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
              }}
            >
              <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-foreground/25 flex items-center gap-1 justify-end">
                Next <ArrowRight size={9} />
              </span>
              <span className="font-mono text-xs text-foreground/60 group-hover:text-foreground/90 transition-colors mt-0.5">
                {next.title}
              </span>
            </Link>
          ) : (
            <div />
          )}
        </div>

        <div className="mt-10">
          <GreekKeyStrip color="gold" />
        </div>
      </article>

      {/* ── TOC COLUMN ── */}
      <DocsTOC headings={doc.headings} />
    </div>
  );
}

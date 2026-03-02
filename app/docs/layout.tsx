import type { Metadata } from 'next';
import Script from 'next/script';
import { DocsSidebar } from './components/DocsSidebar';

export const metadata: Metadata = {
  title: 'Aurellion Protocol — Documentation',
  description:
    'Complete technical reference for the Aurellion protocol: smart contracts, architecture, indexer, and developer guides.',
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Load mermaid from CDN — keeps it out of the webpack bundle entirely */}
      <Script
        src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"
        strategy="lazyOnload"
      />
      <div className="flex min-h-[calc(100vh-83px)]">
        <DocsSidebar />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </>
  );
}

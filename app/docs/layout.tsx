import type { Metadata } from 'next';
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
  // NOTE: Background, EVA grid, scanlines and ClientHeader all come from
  // the root ClientLayout — we only add the sidebar + content area here.
  return (
    <div className="flex min-h-[calc(100vh-83px)]">
      <DocsSidebar />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}

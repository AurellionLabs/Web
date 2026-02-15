'use client';

import { useEffect, useState } from 'react';
import { ClientHeader } from './client-header';
import {
  DataScatter,
  GreekKeyStrip,
} from '@/app/components/eva/eva-components';

/**
 * ClientLayout — NERV × Greek Philosophy page wrapper
 *
 * Obsidian base with:
 * - Gradient mesh with crimson/gold accents
 * - Eva grid overlay
 * - Scan-line overlay
 * - Floating DataScatter readouts
 * - GreekKeyStrip at the footer
 */
export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Background gradient mesh */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(at 40% 20%, rgba(139, 26, 26, 0.08) 0px, transparent 50%),
            radial-gradient(at 80% 0%, rgba(197, 165, 90, 0.06) 0px, transparent 50%),
            radial-gradient(at 0% 50%, rgba(139, 26, 26, 0.04) 0px, transparent 50%),
            radial-gradient(at 80% 50%, rgba(197, 165, 90, 0.05) 0px, transparent 50%),
            radial-gradient(at 0% 100%, rgba(197, 165, 90, 0.06) 0px, transparent 50%),
            hsl(0 0% 5%)
          `,
        }}
      />

      {/* Eva grid overlay */}
      <div className="fixed inset-0 pointer-events-none eva-grid opacity-40" />

      {/* Scan-line overlay */}
      <div className="fixed inset-0 pointer-events-none eva-scanlines" />

      {/* Floating system readouts */}
      <DataScatter className="fixed inset-0" />

      {/* Content */}
      <div className="relative z-10">
        {mounted && <ClientHeader />}
        {children}
        {/* Footer Greek Key strip */}
        <div className="mt-auto pt-8">
          <GreekKeyStrip color="gold" />
        </div>
      </div>
    </div>
  );
}

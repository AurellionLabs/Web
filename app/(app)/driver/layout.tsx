'use client';

import { GreekKeyStrip } from '@/app/components/eva/eva-components';

/**
 * Driver layout — shared chrome for all driver routes.
 * Adds a subtle top status indicator and footer strip.
 */
export default function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      {/* Driver role indicator */}
      <div className="bg-card/30 border-b border-border/20 px-6 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-[3px] h-3 bg-gold/60" />
          <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-gold/60 font-bold">
            Driver Mode
          </span>
        </div>
        <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-foreground/20">
          Delivery Network Active
        </span>
      </div>
      {children}
      <div className="mt-auto pt-4 px-6">
        <GreekKeyStrip color="gold" />
      </div>
    </div>
  );
}

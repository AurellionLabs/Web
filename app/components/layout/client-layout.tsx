'use client';

import { useEffect, useState } from 'react';
import { ClientHeader } from './client-header';

/**
 * ClientLayout - Main layout wrapper for the application
 *
 * Aurellion red/gold theme with:
 * - Deep black base background (#050505)
 * - Subtle gradient mesh with red/gold accents
 * - Optional grid pattern overlay
 */
export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Background gradient mesh with red/gold accents */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(at 40% 20%, rgba(239, 68, 68, 0.08) 0px, transparent 50%),
            radial-gradient(at 80% 0%, rgba(245, 158, 11, 0.06) 0px, transparent 50%),
            radial-gradient(at 0% 50%, rgba(239, 68, 68, 0.04) 0px, transparent 50%),
            radial-gradient(at 80% 50%, rgba(245, 158, 11, 0.05) 0px, transparent 50%),
            radial-gradient(at 0% 100%, rgba(245, 158, 11, 0.06) 0px, transparent 50%),
            #050505
          `,
        }}
      />

      {/* Subtle grid pattern overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(245, 158, 11, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(245, 158, 11, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {mounted && <ClientHeader />}
        {children}
      </div>
    </div>
  );
}

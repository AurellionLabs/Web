'use client';

import { useEffect, useState } from 'react';
import { colors } from '@/lib/constants/colors';
import { ClientHeader } from './client-header';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      className={`bg-[${colors.background.primary}] text-white min-h-screen`}
    >
      {mounted && <ClientHeader />}
      {children}
    </div>
  );
}

'use client';

import { useMainProvider } from '@/app/providers/main.provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function TradingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUserRole } = useMainProvider();
  const router = useRouter();

  useEffect(() => {
    if (currentUserRole !== 'customer') {
      router.push('/');
    }
  }, [currentUserRole, router]);

  if (currentUserRole !== 'customer') return null;

  return <>{children}</>;
}

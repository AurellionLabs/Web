'use client';

import { useMainProvider } from '@/app/providers/main.provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function NodePage() {
  const { currentUserRole } = useMainProvider();
  const router = useRouter();

  useEffect(() => {
    if (currentUserRole !== 'node') {
      router.push('/');
    }
  }, [currentUserRole, router]);

  if (currentUserRole !== 'node') return null;

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-4xl font-bold mb-8">Node Dashboard</h1>
      <p className="text-lg text-muted-foreground">
        Node functionality coming soon...
      </p>
    </div>
  );
}

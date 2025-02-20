'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useMainProvider } from '../providers/main.provider';

export default function DriverPage() {
  const { currentUserRole } = useMainProvider();
  const router = useRouter();

  useEffect(() => {
    if (currentUserRole !== 'driver') {
      router.push('/');
    }
  }, [currentUserRole, router]);

  if (currentUserRole !== 'driver') return null;

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-4xl font-bold mb-8">Driver Dashboard</h1>
      <p className="text-lg text-muted-foreground">
        Driver functionality coming soon...
      </p>
    </div>
  );
}

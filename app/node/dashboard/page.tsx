'use client';

import { useMainProvider } from '@/app/providers/main.provider';
import { useEffect } from 'react';

export default function NodeDashboardPage() {
  const { setCurrentUserRole } = useMainProvider();

  useEffect(() => {
    setCurrentUserRole('node');
  }, [setCurrentUserRole]);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-4xl font-bold mb-8">Node Dashboard</h1>
      <p className="text-lg text-muted-foreground">
        Node dashboard coming soon...
      </p>
    </div>
  );
}

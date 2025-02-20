'use client';

import { useEffect } from 'react';
import { useMainProvider } from '../providers/main.provider';

export default function DriverPage() {
  const { setCurrentUserRole } = useMainProvider();

  useEffect(() => {
    setCurrentUserRole('driver');
  }, [setCurrentUserRole]);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-4xl font-bold mb-8">Driver Dashboard</h1>
      <p className="text-lg text-muted-foreground">
        Driver functionality coming soon...
      </p>
    </div>
  );
}

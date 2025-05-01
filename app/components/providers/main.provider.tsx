'use client';

import { useState, useEffect } from 'react';

export function MainProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  if (!isReady) {
    return null; // or loading state
  }

  return <>{children}</>;
}

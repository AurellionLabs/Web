'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserAssets } from '@/hooks/useUserAssets';

interface PageProps {
  params: { id: string };
}

export default function TradingRedirectPage({ params }: PageProps) {
  const router = useRouter();
  const { sellableAssets, isLoading } = useUserAssets();

  useEffect(() => {
    if (isLoading) return;

    const asset = sellableAssets.find(
      (a: { id: string; class?: string; tokenId?: string }) =>
        a.id === params.id || a.tokenId === params.id,
    );

    if (asset?.class) {
      router.replace(
        `/customer/trading/class/${encodeURIComponent(asset.class)}`,
      );
    } else {
      router.replace('/customer/trading');
    }
  }, [sellableAssets, isLoading, params.id, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="font-mono text-xs tracking-widest uppercase text-muted-foreground animate-pulse">
        Redirecting...
      </p>
    </div>
  );
}

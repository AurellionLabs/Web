'use client';

import { TradeProvider } from '@/app/providers/trade.provider';

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TradeProvider>{children}</TradeProvider>;
}

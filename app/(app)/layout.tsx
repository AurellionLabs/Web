'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { RepositoryProvider } from '@/app/providers/RepositoryProvider';
import { PlatformProvider } from '@/app/providers/platform.provider';
import { NodesProvider } from '@/app/providers/nodes.provider';
import { SelectedNodeProvider } from '@/app/providers/selected-node.provider';
import { CustomerProvider } from '@/app/providers/customer.provider';
import { DriverProvider } from '@/app/providers/driver.provider';
import { TradeProvider } from '@/app/providers/trade.provider';
import { SettlementGate } from '@/app/components/settlement/SettlementGate';
import { useWallet } from '@/hooks/useWallet';

/**
 * (app) route group layout.
 *
 * Most routes use the full authenticated provider stack, but the
 * public node explorer and view-only node dashboard intentionally
 * bypass wallet-gated providers so they are accessible anonymously.
 * The landing page (app/page.tsx) sits outside this group
 * and renders without requiring authentication.
 *
 * SettlementGate checks for pending token destinations on every page load
 * and surfaces the SettlementDestinationModal — this handles the case where
 * an order settles while the buyer is offline (driver signs last).
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isConnected } = useWallet();

  const isPublicNodeExplorer = pathname === '/node/explorer';
  const isPublicNodeDashboard =
    pathname === '/node/dashboard' &&
    (searchParams.get('view') === 'public' || !isConnected);

  if (isPublicNodeExplorer || isPublicNodeDashboard) {
    return (
      <PlatformProvider>
        <NodesProvider>
          <SelectedNodeProvider>{children}</SelectedNodeProvider>
        </NodesProvider>
      </PlatformProvider>
    );
  }

  return (
    <RepositoryProvider>
      <PlatformProvider>
        <NodesProvider>
          <SelectedNodeProvider>
            <CustomerProvider>
              <DriverProvider>
                <TradeProvider>
                  {children}
                  <SettlementGate />
                </TradeProvider>
              </DriverProvider>
            </CustomerProvider>
          </SelectedNodeProvider>
        </NodesProvider>
      </PlatformProvider>
    </RepositoryProvider>
  );
}

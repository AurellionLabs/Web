'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { PlatformProvider } from '@/app/providers/platform.provider';
import { NodesProvider } from '@/app/providers/nodes.provider';
import { SelectedNodeProvider } from '@/app/providers/selected-node.provider';
import { CustomerProvider } from '@/app/providers/customer.provider';
import { DriverProvider } from '@/app/providers/driver.provider';
import { TradeProvider } from '@/app/providers/trade.provider';
import { DiamondProvider } from '@/app/providers/diamond.provider';
import { SettlementGate } from '@/app/components/settlement/SettlementGate';

/**
 * Most routes use the full authenticated provider stack, but the
 * public node explorer and view-only node dashboard intentionally
 * bypass wallet-gated providers so they are accessible anonymously.
 */
export function AppLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isPublicNodeExplorer = pathname === '/node/explorer';
  const isPublicNodeDashboard =
    pathname === '/node/dashboard' && searchParams.get('view') === 'public';

  return (
    <DiamondProvider>
      {isPublicNodeExplorer || isPublicNodeDashboard ? (
        <PlatformProvider>
          <NodesProvider>
            <SelectedNodeProvider>{children}</SelectedNodeProvider>
          </NodesProvider>
        </PlatformProvider>
      ) : (
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
      )}
    </DiamondProvider>
  );
}

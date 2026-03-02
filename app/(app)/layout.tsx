'use client';

import { RepositoryProvider } from '@/app/providers/RepositoryProvider';
import { PlatformProvider } from '@/app/providers/platform.provider';
import { NodesProvider } from '@/app/providers/nodes.provider';
import { SelectedNodeProvider } from '@/app/providers/selected-node.provider';
import { CustomerProvider } from '@/app/providers/customer.provider';
import { DriverProvider } from '@/app/providers/driver.provider';
import { TradeProvider } from '@/app/providers/trade.provider';
import { SettlementGate } from '@/app/components/settlement/SettlementGate';

/**
 * (app) route group layout — authenticated routes only.
 *
 * This layout wraps customer/, node/, and driver/ routes with
 * the full provider stack that requires wallet connection.
 * The landing page (app/page.tsx) sits outside this group
 * and renders without requiring authentication.
 *
 * SettlementGate checks for pending token destinations on every page load
 * and surfaces the SettlementDestinationModal — this handles the case where
 * an order settles while the buyer is offline (driver signs last).
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
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

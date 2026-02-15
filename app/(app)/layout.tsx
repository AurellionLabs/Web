'use client';

import { RepositoryProvider } from '@/app/providers/RepositoryProvider';
import { PlatformProvider } from '@/app/providers/platform.provider';
import { NodesProvider } from '@/app/providers/nodes.provider';
import { SelectedNodeProvider } from '@/app/providers/selected-node.provider';
import { CustomerProvider } from '@/app/providers/customer.provider';
import { DriverProvider } from '@/app/providers/driver.provider';
import { TradeProvider } from '@/app/providers/trade.provider';

/**
 * (app) route group layout — authenticated routes only.
 *
 * This layout wraps customer/, node/, and driver/ routes with
 * the full provider stack that requires wallet connection.
 * The landing page (app/page.tsx) sits outside this group
 * and renders without requiring authentication.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RepositoryProvider>
      <PlatformProvider>
        <NodesProvider>
          <SelectedNodeProvider>
            <CustomerProvider>
              <DriverProvider>
                <TradeProvider>{children}</TradeProvider>
              </DriverProvider>
            </CustomerProvider>
          </SelectedNodeProvider>
        </NodesProvider>
      </PlatformProvider>
    </RepositoryProvider>
  );
}

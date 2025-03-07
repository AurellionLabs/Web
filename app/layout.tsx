import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { MainProvider } from './providers/main.provider';
import { NodeProvider } from './providers/node.provider';
import { ClientLayout } from '@/components/layout/client-layout';
import { TradeProvider } from './providers/trade.provider';
import { CustomerProvider } from './providers/customer.provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Aurellion Labs',
  description: 'Staking platform for Aurellion tokenized real-world assets',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <MainProvider>
          <NodeProvider>
            <CustomerProvider>
              <TradeProvider>
                <ClientLayout>{children}</ClientLayout>
              </TradeProvider>
            </CustomerProvider>
          </NodeProvider>
        </MainProvider>
      </body>
    </html>
  );
}

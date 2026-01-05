import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { MainProvider } from './providers/main.provider';
import { NodesProvider } from './providers/nodes.provider';
import { SelectedNodeProvider } from './providers/selected-node.provider';
import { ClientLayout } from '@/app/components/layout/client-layout';
import { TradeProvider } from './providers/trade.provider';
import { CustomerProvider } from './providers/customer.provider';
import { DriverProvider } from './providers/driver.provider';
import { PlatformProvider } from './providers/platform.provider';
import { RepositoryProvider } from './providers/RepositoryProvider';
import { DiamondProvider } from './providers/diamond.provider';
import { PrivyProviderWrapper } from './providers/privy.provider';
import { Toaster } from './components/ui/toaster';

/**
 * Primary font for the entire application
 * Plus Jakarta Sans - Clean, modern, geometric with rounded terminals
 * Matches the Altura.trade aesthetic
 */
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800'],
});

/**
 * Monospace font for trading data, numbers, and code
 * JetBrains Mono - Excellent for tabular data
 */
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Aurellion Labs',
  description: 'Staking platform for Aurellion tokenized real-world assets',
  keywords: ['blockchain', 'tokenization', 'RWA', 'staking', 'DeFi'],
  authors: [{ name: 'Aurellion Labs' }],
  openGraph: {
    title: 'Aurellion Labs',
    description: 'Staking platform for Aurellion tokenized real-world assets',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${plusJakartaSans.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className={`${plusJakartaSans.className} antialiased`}>
        <PrivyProviderWrapper>
          <MainProvider>
            <DiamondProvider>
              <RepositoryProvider>
                <PlatformProvider>
                  <NodesProvider>
                    <SelectedNodeProvider>
                      <CustomerProvider>
                        <DriverProvider>
                          <TradeProvider>
                            <ClientLayout>{children}</ClientLayout>
                            <Toaster />
                          </TradeProvider>
                        </DriverProvider>
                      </CustomerProvider>
                    </SelectedNodeProvider>
                  </NodesProvider>
                </PlatformProvider>
              </RepositoryProvider>
            </DiamondProvider>
          </MainProvider>
        </PrivyProviderWrapper>
      </body>
    </html>
  );
}

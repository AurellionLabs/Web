import type { Metadata } from 'next';
import {
  Plus_Jakarta_Sans,
  Space_Mono,
  Playfair_Display,
} from 'next/font/google';
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
 * Body / fallback sans-serif
 * Inter via Plus Jakarta Sans lineage — clean, neutral, disappears into UI
 */
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800'],
});

/**
 * Monospace for EVA technical readouts, data, system IDs
 * Space Mono — angular, aggressive, fits the NERV aesthetic
 */
const spaceMono = Space_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '700'],
});

/**
 * Serif for headlines, philosophy quotes, section titles
 * Playfair Display — the Greek philosophy voice
 */
const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900'],
  style: ['normal', 'italic'],
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
      className={`dark ${plusJakartaSans.variable} ${spaceMono.variable} ${playfairDisplay.variable}`}
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

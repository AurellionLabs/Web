import type { Metadata } from 'next';
import {
  Plus_Jakarta_Sans,
  Space_Mono,
  Playfair_Display,
} from 'next/font/google';
import './globals.css';
import { MainProvider } from './providers/main.provider';
import { ClientLayout } from '@/app/components/layout/client-layout';
import { PrivyProviderWrapper } from './providers/privy.provider';
import { Toaster } from './components/ui/toaster';
import { getMetadataBase, getSiteUrl } from '@/lib/site-url';

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

const siteUrl = getSiteUrl();
const metadataBase = getMetadataBase();
const brandDescription =
  'Aurellion Labs builds Aurellion, a platform for tokenized real-world assets, on-chain trading, staking, and compliant DeFi infrastructure.';

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: 'Aurellion Labs | Aurellion Real-World Asset Platform',
    template: '%s | Aurellion Labs',
  },
  description: brandDescription,
  applicationName: 'Aurellion',
  keywords: [
    'Aurellion Labs',
    'Aurellion',
    'real-world assets',
    'RWA tokenization',
    'tokenized assets',
    'DeFi',
    'staking',
    'on-chain trading',
    'Base Sepolia',
  ],
  authors: [{ name: 'Aurellion Labs' }],
  creator: 'Aurellion Labs',
  publisher: 'Aurellion Labs',
  alternates: {
    canonical: '/',
  },
  category: 'finance',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
    shortcut: '/logo.png',
  },
  openGraph: {
    title: 'Aurellion Labs | Aurellion Real-World Asset Platform',
    description: brandDescription,
    type: 'website',
    url: siteUrl,
    siteName: 'Aurellion Labs',
    locale: 'en_GB',
    images: [
      {
        url: '/logo.png',
        width: 1200,
        height: 1200,
        alt: 'Aurellion Labs',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Aurellion Labs | Aurellion Real-World Asset Platform',
    description: brandDescription,
    images: ['/logo.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        name: 'Aurellion Labs',
        alternateName: 'Aurellion',
        url: siteUrl,
        logo: `${siteUrl}/logo.png`,
        sameAs: [],
      },
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        url: siteUrl,
        name: 'Aurellion Labs',
        description: brandDescription,
        publisher: {
          '@id': `${siteUrl}/#organization`,
        },
      },
    ],
  };

  return (
    <html
      lang="en"
      className={`dark ${plusJakartaSans.variable} ${spaceMono.variable} ${playfairDisplay.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
      </head>
      <body className={`${plusJakartaSans.className} antialiased`}>
        <PrivyProviderWrapper>
          <MainProvider>
            <ClientLayout>{children}</ClientLayout>
            <Toaster />
          </MainProvider>
        </PrivyProviderWrapper>
      </body>
    </html>
  );
}

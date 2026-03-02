import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display, Space_Mono } from 'next/font/google';

import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
});
const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-space-mono',
});

export const metadata: Metadata = {
  title: 'Aurellion - Real World Asset Tokenization',
  description:
    'Where ancient wisdom meets modern finance. Tokenize real-world assets with the precision of philosophy and the power of blockchain.',
};

export const viewport: Viewport = {
  themeColor: '#0A0A0A',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} ${spaceMono.variable}`}
    >
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}

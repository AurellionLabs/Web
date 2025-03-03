import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { MainProvider } from './providers/main.provider';
import { NodeProvider } from './providers/node.provider';
import { ClientLayout } from '@/components/layout/client-layout';

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
            <ClientLayout>{children}</ClientLayout>
          </NodeProvider>
        </MainProvider>
      </body>
    </html>
  );
}

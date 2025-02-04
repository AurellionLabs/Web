import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { colors } from '@/lib/constants/colors';
import { setWalletProvider } from '@/dapp-connectors/staking-controller';
import ConnectButton from '@/components/ConnectButtont';
import MainProvider from '@/app/providers/main.provider';
import Image from 'next/image';



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
        <MainProvider>
            <html lang="en" className="dark">
                <body
                    className={`${inter.className} bg-[${colors.background.primary}] text-white min-h-screen`}
                >
                    <header className="border-b border-[${colors.neutral[800]}]">
                        <div className="max-w-7xl mx-auto px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-8">
                                    <Link href="/" className="flex items-center gap-2">
                                        <div
                                            className={`w-8 h-8 bg-[${colors.primary[500]}] rounded-full`}
                                        />
                                        <Image
                                            src="logo.png"     // Path should be relative to the public directory
                                            alt="Aurellion Labs Logo"  // Always include alt text for accessibility
                                            width={64}                 // Specify the desired width
                                            height={64}               // Specify the desired height
                                            priority                  // Add if this is above the fold
                                            className="object-contain p-2" // Maintain aspect ratio
                                        />
                                        <span className="font-semibold">Aurellion Labs</span>
                                    </Link>
                                    <nav className="flex gap-6">
                                        <Link
                                            href="/pools"
                                            className="text-gray-400 hover:text-white"
                                        >
                                            Pools
                                        </Link>
                                    </nav>
                                </div>
                                <div className="flex items-center gap-4">
                                    <ConnectButton />
                                </div>
                            </div>
                        </div>
                    </header>
                    {children}
                </body>
            </html>
        </MainProvider>
    );
}

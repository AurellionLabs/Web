import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { colors } from '@/lib/constants/colors'
import { setWalletProvider } from '@/dapp-connectors/staking-controller'
import ConnectButton from '@/components/ConnectButtont'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'AuStake',
    description: 'Staking platform for Aurellion tokenized real-world assets',
}
const handleConnect = async () => {
    const response = await setWalletProvider()
    if (response.success) {
        console.log("Connected with address:", response.address);
        // You can store the address in state or context if needed
    } else {
        console.error("Connection failed:", response.error);
    }
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" className="dark">
            <body className={`${inter.className} bg-[${colors.background.primary}] text-white min-h-screen`}>
                <header className="border-b border-[${colors.neutral[800]}]">
                    <div className="max-w-7xl mx-auto px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-8">
                                <Link href="/" className="flex items-center gap-2">
                                    <div className={`w-8 h-8 bg-[${colors.primary[500]}] rounded-full`} />
                                    <span className="font-semibold">AuStake</span>
                                </Link>
                                <nav className="flex gap-6">
                                    <Link href="/trade" className="text-gray-400 hover:text-white">Trade</Link>
                                    <Link href="/explore" className="text-gray-400 hover:text-white">Explore</Link>
                                    <Link href="/pools" className="text-gray-400 hover:text-white">Pool</Link>
                                </nav>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search tokens"
                                        className="bg-gray-900 border border-gray-800 rounded-2xl py-2 pl-10 pr-4 text-sm w-64 focus:outline-none focus:border-gray-700"
                                    />
                                </div>
                                <ConnectButton/>
                            </div>
                        </div>
                    </div>
                </header>
                {children}
            </body>
        </html>
    )
}


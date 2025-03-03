'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { colors } from '@/lib/constants/colors';
import { RoleSelector } from '@/components/ui/role-selector';
import { WalletConnection } from '@/components/ui/wallet-connection';
import ConnectButton from '@/components/ConnectButtont';
import { useMainProvider } from '@/app/providers/main.provider';
import { useNode } from '@/app/providers/node.provider';

export function ClientHeader() {
  const [mounted, setMounted] = useState(false);
  const { currentUserRole } = useMainProvider();
  const { selectedNode } = useNode();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  <header className="border-b border-[${colors.neutral[800]}]">
    <div className="max-w-7xl mx-auto px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <div
              className={`w-8 h-8 bg-[${colors.primary[500]}] rounded-full`}
            />
            <Image
              src="logo.png"
              alt="Aurellion Labs Logo"
              width={64}
              height={64}
              priority
              className="object-contain p-2"
            />
            <span className="font-semibold">Aurellion Labs</span>
          </Link>
          <nav className="flex gap-6">
            <Link
              href="/customer/pools"
              className="text-gray-400 hover:text-white"
            >
              Pools
            </Link>
            {currentUserRole === 'customer' && (
              <Link
                href="/customer/trading"
                className="text-gray-400 hover:text-white"
              >
                Trading
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <RoleSelector />
          <ConnectButton />
        </div>
      </div>
    </div>
  </header>;

  return (
    <header className="border-b border-[${colors.neutral[800]}]">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div
                className={`w-8 h-8 bg-[${colors.primary[500]}] rounded-full`}
              />
              <Image
                src="/logo.png"
                alt="Aurellion Labs Logo"
                width={64}
                height={64}
                priority
                className="object-contain p-2"
              />
              <span className="font-semibold">Aurellion Labs</span>
            </Link>
            <nav className="flex gap-6">
              <Link
                href="/customer/pools"
                className="text-gray-400 hover:text-white"
              >
                Pools
              </Link>
              {currentUserRole === 'customer' && (
                <Link
                  href="/customer/trading"
                  className="text-gray-400 hover:text-white"
                >
                  Trading
                </Link>
              )}
              {currentUserRole === 'node' && (
                <>
                  <Link
                    href="/node/overview"
                    className="text-gray-400 hover:text-white"
                  >
                    Overview
                  </Link>
                  {selectedNode && (
                    <Link
                      href="/node/dashboard"
                      className="text-gray-400 hover:text-white"
                    >
                      Dashboard
                    </Link>
                  )}
                </>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <RoleSelector />
            <ConnectButton />
            <WalletConnection />
          </div>
        </div>
      </div>
    </header>
  );
}

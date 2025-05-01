'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { colors } from '@/lib/constants/colors';
import { RoleSelector } from '@/app/components/ui/role-selector';
import { WalletConnection } from '@/app/components/ui/wallet-connection';
import { useMainProvider } from '@/app/providers/main.provider';
import { useNode } from '@/app/providers/node.provider';
import { cn } from '@/lib/utils';
import ConnectButton from '../ConnectButtont';

export function ClientHeader() {
  const [mounted, setMounted] = useState(false);
  const { currentUserRole } = useMainProvider();
  const { selectedNode } = useNode();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

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
              {currentUserRole === 'customer' && (
                <>
                  <Link
                    href="/customer/dashboard"
                    className={cn(
                      'text-gray-400 hover:text-white',
                      pathname === '/customer/dashboard' && 'text-white',
                    )}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/customer/pools"
                    className={cn(
                      'text-gray-400 hover:text-white',
                      pathname === '/customer/pools' && 'text-white',
                    )}
                  >
                    Pools
                  </Link>
                  <Link
                    href="/customer/trading"
                    className={cn(
                      'text-gray-400 hover:text-white',
                      pathname === '/customer/trading' && 'text-white',
                    )}
                  >
                    Trading
                  </Link>
                </>
              )}
              {currentUserRole === 'node' && (
                <>
                  <Link
                    href="/node/overview"
                    className={cn(
                      'text-gray-400 hover:text-white',
                      pathname === '/node/overview' && 'text-white',
                    )}
                  >
                    Overview
                  </Link>
                  {selectedNode && (
                    <Link
                      href="/node/dashboard"
                      className={cn(
                        'text-gray-400 hover:text-white',
                        pathname === '/node/dashboard' && 'text-white',
                      )}
                    >
                      Dashboard
                    </Link>
                  )}
                </>
              )}
              {currentUserRole === 'driver' && (
                <Link
                  href="/driver/dashboard"
                  className={cn(
                    'text-gray-400 hover:text-white',
                    pathname === '/driver/dashboard' && 'text-white',
                  )}
                >
                  Dashboard
                </Link>
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

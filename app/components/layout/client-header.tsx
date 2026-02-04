'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { RoleSelector } from '@/app/components/ui/role-selector';
import { WalletConnection } from '@/app/components/ui/wallet-connection';
import { useMainProvider } from '@/app/providers/main.provider';
import { cn } from '@/lib/utils';
import ConnectButton from '../ConnectButtont';
import { StatusBadge } from '../ui/status-badge';
import { Menu, X } from 'lucide-react';

/**
 * Navigation link component with animated underline - Gold accent
 */
interface NavLinkProps {
  href: string;
  isActive: boolean;
  children: React.ReactNode;
}

const NavLink: React.FC<NavLinkProps> = ({ href, isActive, children }) => (
  <Link
    href={href}
    className={cn(
      'relative py-2 text-sm font-medium transition-colors duration-200',
      isActive ? 'text-amber-400' : 'text-neutral-400 hover:text-amber-300',
    )}
  >
    {children}
    {/* Animated underline - Gold */}
    <span
      className={cn(
        'absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-red-500 to-amber-500 transition-all duration-300',
        isActive ? 'w-full' : 'w-0 group-hover:w-full',
      )}
    />
  </Link>
);

/**
 * Customer navigation links
 */
const CustomerNav: React.FC<{ pathname: string }> = ({ pathname }) => (
  <>
    <NavLink
      href="/customer/dashboard"
      isActive={pathname === '/customer/dashboard'}
    >
      Dashboard
    </NavLink>
    <NavLink
      href="/customer/pools"
      isActive={pathname.startsWith('/customer/pools')}
    >
      Yield
    </NavLink>
    <NavLink
      href="/customer/trading"
      isActive={pathname.startsWith('/customer/trading')}
    >
      Trading
    </NavLink>
    <NavLink href="/customer/faucet" isActive={pathname === '/customer/faucet'}>
      Faucet
    </NavLink>
  </>
);

/**
 * Node navigation links
 */
const NodeNav: React.FC<{ pathname: string }> = ({ pathname }) => (
  <>
    <NavLink href="/node/overview" isActive={pathname === '/node/overview'}>
      Overview
    </NavLink>
    <NavLink href="/node/explorer" isActive={pathname === '/node/explorer'}>
      Explorer
    </NavLink>
  </>
);

/**
 * Driver navigation links
 */
const DriverNav: React.FC<{ pathname: string }> = ({ pathname }) => (
  <NavLink href="/driver/dashboard" isActive={pathname === '/driver/dashboard'}>
    Dashboard
  </NavLink>
);

/**
 * ClientHeader - Aurellion protocol-style navigation header with red/gold theme
 */
export function ClientHeader() {
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currentUserRole } = useMainProvider();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (!mounted) return null;

  const isLandingPage = pathname === '/';

  return (
    <header
      className={cn(
        'sticky top-0 z-50 backdrop-blur-md border-b transition-all duration-300',
        isLandingPage
          ? 'bg-transparent border-transparent'
          : 'bg-[#050505]/90 border-neutral-800/50',
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo section */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3 group">
              {/* Logo container with gold glow */}
              <div className="relative w-9 h-9 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:border-amber-500/60 group-hover:shadow-glow-sm">
                <Image
                  src="/logo.png"
                  alt="Aurellion Labs Logo"
                  width={24}
                  height={24}
                  priority
                  className="object-contain"
                />
              </div>
              {/* Logo text with gradient */}
              <span
                className="font-bold text-lg hidden sm:block"
                style={{
                  background:
                    'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Aurellion
              </span>
            </Link>

            {/* Desktop navigation */}
            <nav className="hidden md:flex items-center gap-6">
              {currentUserRole === 'customer' && (
                <CustomerNav pathname={pathname} />
              )}
              {currentUserRole === 'node' && <NodeNav pathname={pathname} />}
              {currentUserRole === 'driver' && (
                <DriverNav pathname={pathname} />
              )}
            </nav>
          </div>

          {/* Right section */}
          <div className="flex items-center gap-3">
            {/* Status badge - hidden on mobile */}
            <div className="hidden lg:block">
              <StatusBadge status="live" label="Mainnet" pulse size="sm" />
            </div>

            {/* Role selector */}
            <div className="hidden sm:block">
              <RoleSelector />
            </div>

            {/* Connect button */}
            <ConnectButton />

            {/* Wallet connection */}
            <div className="hidden sm:block">
              <WalletConnection />
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg bg-neutral-900/50 border border-neutral-700/50 text-neutral-300 hover:text-amber-400 hover:border-amber-500/30 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-neutral-800/50 bg-[#050505]/95 backdrop-blur-md">
          <div className="px-4 py-4 space-y-4">
            {/* Mobile navigation */}
            <nav className="flex flex-col gap-2">
              {currentUserRole === 'customer' && (
                <>
                  <Link
                    href="/customer/dashboard"
                    className={cn(
                      'px-4 py-2 rounded-lg transition-colors',
                      pathname === '/customer/dashboard'
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'text-neutral-400 hover:text-amber-300 hover:bg-neutral-800/50',
                    )}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/customer/pools"
                    className={cn(
                      'px-4 py-2 rounded-lg transition-colors',
                      pathname.startsWith('/customer/pools')
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'text-neutral-400 hover:text-amber-300 hover:bg-neutral-800/50',
                    )}
                  >
                    Yield
                  </Link>
                  <Link
                    href="/customer/trading"
                    className={cn(
                      'px-4 py-2 rounded-lg transition-colors',
                      pathname.startsWith('/customer/trading')
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'text-neutral-400 hover:text-amber-300 hover:bg-neutral-800/50',
                    )}
                  >
                    Trading
                  </Link>
                  <Link
                    href="/customer/faucet"
                    className={cn(
                      'px-4 py-2 rounded-lg transition-colors',
                      pathname === '/customer/faucet'
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'text-neutral-400 hover:text-amber-300 hover:bg-neutral-800/50',
                    )}
                  >
                    Faucet
                  </Link>
                </>
              )}
              {currentUserRole === 'node' && (
                <>
                  <Link
                    href="/node/overview"
                    className={cn(
                      'px-4 py-2 rounded-lg transition-colors',
                      pathname === '/node/overview'
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'text-neutral-400 hover:text-amber-300 hover:bg-neutral-800/50',
                    )}
                  >
                    Overview
                  </Link>
                  <Link
                    href="/node/explorer"
                    className={cn(
                      'px-4 py-2 rounded-lg transition-colors',
                      pathname === '/node/explorer'
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'text-neutral-400 hover:text-amber-300 hover:bg-neutral-800/50',
                    )}
                  >
                    Explorer
                  </Link>
                </>
              )}
              {currentUserRole === 'driver' && (
                <Link
                  href="/driver/dashboard"
                  className={cn(
                    'px-4 py-2 rounded-lg transition-colors',
                    pathname === '/driver/dashboard'
                      ? 'bg-amber-500/10 text-amber-400'
                      : 'text-neutral-400 hover:text-amber-300 hover:bg-neutral-800/50',
                  )}
                >
                  Dashboard
                </Link>
              )}
            </nav>

            {/* Mobile role selector */}
            <div className="pt-2 border-t border-neutral-800/50">
              <RoleSelector />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

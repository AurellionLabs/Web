'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { RoleSelector } from '@/app/components/ui/role-selector';
import { WalletConnection } from '@/app/components/ui/wallet-connection';
import { useMainProvider } from '@/app/providers/main.provider';
import { cn } from '@/lib/utils';
import ConnectButton from '../ConnectButtont';
import { Menu, X } from 'lucide-react';

/* ─────────────────────────────────────────
   NERV × AURELLION — HEADER & NAV
   Evangelion command bar + Greek philosophy
   ───────────────────────────────────────── */

interface NavLinkProps {
  href: string;
  isActive: boolean;
  children: React.ReactNode;
}

const NavLink: React.FC<NavLinkProps> = ({ href, isActive, children }) => (
  <Link
    href={href}
    className={cn(
      'relative px-4 py-2.5 font-mono text-sm tracking-[0.12em] uppercase transition-all duration-300 font-bold',
      isActive ? 'text-gold' : 'text-foreground/40 hover:text-foreground/75',
    )}
  >
    {isActive && (
      <>
        <div className="absolute inset-0 border border-gold/30 bg-gold/[0.04]" />
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gold/70" />
        <div className="absolute top-0 left-0 w-2 h-[2px] bg-crimson" />
        <div className="absolute top-0 left-0 w-[2px] h-2 bg-crimson" />
        <div className="absolute top-0 right-0 w-2 h-[2px] bg-crimson" />
      </>
    )}
    <span className="relative z-10">{children}</span>
  </Link>
);

/** Customer navigation */
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
    <NavLink
      href="/customer/p2p"
      isActive={pathname.startsWith('/customer/p2p')}
    >
      P2P
    </NavLink>
    <NavLink href="/customer/faucet" isActive={pathname === '/customer/faucet'}>
      Faucet
    </NavLink>
  </>
);

/** Node navigation */
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

/** Driver navigation */
const DriverNav: React.FC<{ pathname: string }> = ({ pathname }) => (
  <NavLink href="/driver/dashboard" isActive={pathname === '/driver/dashboard'}>
    Dashboard
  </NavLink>
);

/**
 * ClientHeader — NERV command bar with system ticker,
 * clipped logo, trapezoid nav items, and system clock
 */
export function ClientHeader() {
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [time, setTime] = useState('');
  const { currentUserRole } = useMainProvider();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // System clock
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!mounted) return null;

  return (
    <header className="sticky top-0 z-50">
      {/* ── System Ticker Bar ── */}
      <div className="h-7 bg-background border-b border-border/25 overflow-hidden flex items-center relative">
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-crimson/10" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-crimson/10" />
        <div className="flex items-center animate-ticker-fast whitespace-nowrap">
          {Array.from({ length: 4 }).map((_, i) => (
            <span
              key={i}
              className="font-mono text-[11px] tracking-[0.15em] uppercase text-foreground/25 mx-8"
            >
              AURELLION PROTOCOL v2.1 &middot; TESTNET &middot; BLOCK 19,847,293
              &middot; GAS 12 GWEI &middot; ETH $3,842.17 &middot; TVL $2.4B
              &middot; 847 ASSETS TOKENIZED &middot;&nbsp;
            </span>
          ))}
        </div>
      </div>

      {/* ── Main Navigation Bar ── */}
      <nav className="relative flex items-center justify-between px-4 md:px-8 py-3 bg-background/95 backdrop-blur-sm border-b border-border/35">
        {/* Left vertical accent bar */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gold/25" />

        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          {/* Square logo with corner brackets */}
          <div className="relative w-10 h-10 bg-card/80 border border-gold/40 group-hover:border-gold/70 transition-colors duration-300 overflow-hidden">
            {/* Corner brackets — crimson */}
            <div className="absolute top-0 left-0 w-2.5 h-[2px] bg-crimson" />
            <div className="absolute top-0 left-0 w-[2px] h-2.5 bg-crimson" />
            <div className="absolute bottom-0 right-0 w-2.5 h-[2px] bg-crimson/50" />
            <div className="absolute bottom-0 right-0 w-[2px] h-2.5 bg-crimson/50" />
            {/* Hex background */}
            <div className="absolute inset-0 eva-hex-pattern opacity-30" />
            <span className="absolute inset-0 flex items-center justify-center font-serif text-base text-gold font-bold">
              A
            </span>
          </div>
          <div className="hidden md:block">
            <span className="font-serif text-lg tracking-wide text-foreground block leading-none">
              Aurellion
            </span>
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-crimson/70 font-bold">
              Protocol v2.1
            </span>
          </div>
        </Link>

        {/* Desktop navigation */}
        <div className="hidden md:flex items-center gap-[2px]">
          {currentUserRole === 'customer' && (
            <CustomerNav pathname={pathname} />
          )}
          {currentUserRole === 'node' && <NodeNav pathname={pathname} />}
          {currentUserRole === 'driver' && <DriverNav pathname={pathname} />}
        </div>

        {/* Right section */}
        <div className="flex items-center gap-3">
          {/* System time */}
          <div className="hidden lg:flex items-center gap-2.5 px-3 py-2 bg-card/50 border border-border/30">
            <div className="flex gap-[2px]">
              <div className="w-1 h-3 bg-crimson/40" />
              <div className="w-0.5 h-3 bg-crimson/20" />
            </div>
            <span className="font-mono text-[11px] tracking-[0.08em] text-crimson/60 uppercase font-bold">
              SYS
            </span>
            <span className="font-mono text-sm tabular-nums text-foreground/50 font-bold">
              {time}
            </span>
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
            className="md:hidden p-2 bg-card/50 border border-border/50 text-foreground/50 hover:text-gold hover:border-gold/30 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </nav>

      {/* Bottom accent — Eva hazard style */}
      <div className="flex h-[3px]">
        <div className="w-12 bg-crimson/50" />
        <div className="flex-1 eva-hazard" />
        <div className="w-32 bg-crimson/25" />
        <div className="flex-1 eva-hazard" />
        <div className="w-12 bg-crimson/50" />
      </div>

      {/* ── Mobile Menu ── */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/25 bg-background/95 backdrop-blur-md">
          <div className="px-4 py-4 space-y-4">
            <nav className="flex flex-col gap-1">
              {currentUserRole === 'customer' && (
                <>
                  <MobileNavLink
                    href="/customer/dashboard"
                    active={pathname === '/customer/dashboard'}
                  >
                    Dashboard
                  </MobileNavLink>
                  <MobileNavLink
                    href="/customer/pools"
                    active={pathname.startsWith('/customer/pools')}
                  >
                    Yield
                  </MobileNavLink>
                  <MobileNavLink
                    href="/customer/trading"
                    active={pathname.startsWith('/customer/trading')}
                  >
                    Trading
                  </MobileNavLink>
                  <MobileNavLink
                    href="/customer/p2p"
                    active={pathname.startsWith('/customer/p2p')}
                  >
                    P2P
                  </MobileNavLink>
                  <MobileNavLink
                    href="/customer/faucet"
                    active={pathname === '/customer/faucet'}
                  >
                    Faucet
                  </MobileNavLink>
                </>
              )}
              {currentUserRole === 'node' && (
                <>
                  <MobileNavLink
                    href="/node/overview"
                    active={pathname === '/node/overview'}
                  >
                    Overview
                  </MobileNavLink>
                  <MobileNavLink
                    href="/node/explorer"
                    active={pathname === '/node/explorer'}
                  >
                    Explorer
                  </MobileNavLink>
                </>
              )}
              {currentUserRole === 'driver' && (
                <MobileNavLink
                  href="/driver/dashboard"
                  active={pathname === '/driver/dashboard'}
                >
                  Dashboard
                </MobileNavLink>
              )}
            </nav>
            <div className="pt-2 border-t border-border/25">
              <RoleSelector />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

/** Mobile nav link with EVA styling */
function MobileNavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'px-4 py-2.5 font-mono text-sm tracking-[0.1em] uppercase font-bold transition-colors',
        active
          ? 'bg-gold/[0.06] text-gold border-l-2 border-gold/50'
          : 'text-foreground/40 hover:text-gold/70 hover:bg-gold/[0.03]',
      )}
    >
      {children}
    </Link>
  );
}

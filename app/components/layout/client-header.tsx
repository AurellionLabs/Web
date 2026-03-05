'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { RoleSelector } from '@/app/components/ui/role-selector';
import { WalletConnection } from '@/app/components/ui/wallet-connection';
import { useMainProvider } from '@/app/providers/main.provider';
import { useWallet } from '@/hooks/useWallet';
import { cn } from '@/lib/utils';
import ConnectButton from '../ConnectButtont';
import { TrapButton } from '@/app/components/eva/eva-components';
import { Menu, X, BookOpen } from 'lucide-react';

/* ─────────────────────────────────────────
   NERV × AURELLION — HEADER & NAV
   Evangelion command bar + Greek philosophy
   ───────────────────────────────────────── */

// Supported chains
const MAINNET_CHAIN_ID = 42161; // Arbitrum
const TESTNET_CHAIN_ID = 84532; // Base Sepolia

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

/** Docs nav link — always visible, slightly different styling */
const DocsNavLink: React.FC<{ pathname: string }> = ({ pathname }) => {
  const isActive = pathname.startsWith('/docs');
  return (
    <Link
      href="/docs"
      className={cn(
        'relative flex items-center gap-1.5 px-4 py-2.5 font-mono text-sm tracking-[0.12em] uppercase transition-all duration-300 font-bold',
        isActive ? 'text-gold' : 'text-foreground/30 hover:text-foreground/60',
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
      <BookOpen size={11} className="relative z-10 opacity-70" />
      <span className="relative z-10">Docs</span>
    </Link>
  );
};

/** Customer navigation */
const CustomerNav: React.FC<{ pathname: string; chainId: number | null }> = ({
  pathname,
  chainId,
}) => {
  const isMainnet = chainId === MAINNET_CHAIN_ID;

  return (
    <>
      <NavLink
        href="/customer/dashboard"
        isActive={pathname === '/customer/dashboard'}
      >
        Dashboard
      </NavLink>
      {!isMainnet && (
        <NavLink
          href="/customer/pools"
          isActive={pathname.startsWith('/customer/pools')}
        >
          Yield
        </NavLink>
      )}
      {!isMainnet && (
        <NavLink
          href="/customer/trading"
          isActive={pathname.startsWith('/customer/trading')}
        >
          Trading
        </NavLink>
      )}
      <NavLink
        href="/customer/p2p"
        isActive={pathname.startsWith('/customer/p2p')}
      >
        P2P
      </NavLink>
      {!isMainnet && (
        <NavLink
          href="/customer/faucet"
          isActive={pathname === '/customer/faucet'}
        >
          Faucet
        </NavLink>
      )}
    </>
  );
};

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

export function ClientHeader() {
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [time, setTime] = useState('');
  const { currentUserRole } = useMainProvider();
  const { chainId } = useWallet();
  const pathname = usePathname();
  const isMainnet = chainId === MAINNET_CHAIN_ID;

  // Show prompt to switch chain if on unsupported non-testnet chain
  const needsSwitch =
    chainId !== null &&
    chainId !== MAINNET_CHAIN_ID &&
    chainId !== TESTNET_CHAIN_ID;

  const switchToMainnet = async () => {
    try {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        await (window as any).ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xa4b1' }], // 42161 in hex
        });
      }
    } catch (e) {
      console.error('Error switching chain:', e);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const update = () => {
      if (document.visibilityState !== 'visible') return;
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
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        update();
      }
    };
    const interval = setInterval(update, 1000);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  if (!mounted) return null;

  const isLandingPage = pathname === '/';

  /* ── TICKER BAR (shared) ── */
  const tickerText =
    'AURELLION PROTOCOL V2.1 · TESTNET · BLOCK 19,847,293 · GAS 12 GWEI · ETH $3,842.17 · TVL $2.4B · 847 ASSETS TOKENIZED · ';
  const TickerBar = () => (
    <div
      className="h-7 bg-background border-b border-border/25 overflow-hidden relative isolate"
      style={{ contain: 'layout style paint' }}
    >
      <div
        className="absolute top-0 bottom-0 flex items-center whitespace-nowrap pointer-events-none"
        style={{
          animation: 'ticker-fast 40s linear infinite',
          willChange: 'transform',
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        <span className="font-mono text-[11px] tracking-[0.15em] uppercase text-foreground/25 px-4">
          {tickerText.repeat(6)}
        </span>
        <span className="font-mono text-[11px] tracking-[0.15em] uppercase text-foreground/25 px-4">
          {tickerText.repeat(6)}
        </span>
      </div>
    </div>
  );

  /* ── LOGO (shared) ── */
  const Logo = () => (
    <Link href="/" className="flex items-center gap-3 group">
      <div className="relative w-10 h-10 bg-card/80 border border-gold/40 group-hover:border-gold/70 transition-colors duration-300 overflow-hidden">
        <div className="absolute top-0 left-0 w-2.5 h-[2px] bg-crimson" />
        <div className="absolute top-0 left-0 w-[2px] h-2.5 bg-crimson" />
        <div className="absolute bottom-0 right-0 w-2.5 h-[2px] bg-crimson/50" />
        <div className="absolute bottom-0 right-0 w-[2px] h-2.5 bg-crimson/50" />
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
  );

  /* ── BOTTOM ACCENT (shared) ── */
  const BottomAccent = () => (
    <div className="flex h-[3px]">
      <div className="w-12 bg-crimson/50" />
      <div className="flex-1 eva-hazard" />
      <div className="w-32 bg-crimson/25" />
      <div className="flex-1 eva-hazard" />
      <div className="w-12 bg-crimson/50" />
    </div>
  );

  /* ── SYSTEM CLOCK (shared) ── */
  const SysClock = () => (
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
  );

  /* ────── LANDING PAGE HEADER ────── */
  if (isLandingPage) {
    return (
      <header className="sticky top-0 z-50">
        <TickerBar />
        <nav className="relative flex items-center justify-between px-4 md:px-8 py-3 bg-background/95 backdrop-blur-sm border-b border-border/35">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gold/25" />
          <Logo />
          <div className="flex items-center gap-3">
            {/* Docs link visible on landing too */}
            <DocsNavLink pathname={pathname} />
            <SysClock />
            <Link href="/customer/dashboard">
              <TrapButton variant="gold" size="sm">
                Launch App
              </TrapButton>
            </Link>
          </div>
        </nav>
        <BottomAccent />
      </header>
    );
  }

  /* ────── APP HEADER ────── */
  return (
    <header className="sticky top-0 z-50">
      <TickerBar />
      <nav className="relative flex items-center justify-between px-4 md:px-8 py-3 bg-background/95 backdrop-blur-sm border-b border-border/35">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gold/25" />
        <Logo />

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-[2px]">
          {currentUserRole === 'customer' && (
            <CustomerNav pathname={pathname} chainId={chainId} />
          )}
          {currentUserRole === 'node' && <NodeNav pathname={pathname} />}
          {currentUserRole === 'driver' && <DriverNav pathname={pathname} />}
          {/* Docs always visible, separated slightly */}
          <div className="w-px h-6 bg-border/30 mx-1" />
          <DocsNavLink pathname={pathname} />
        </div>

        {/* Right section */}
        <div className="flex items-center gap-3">
          <SysClock />
          {/* Chain indicator / switch prompt */}
          {needsSwitch ? (
            <button
              onClick={switchToMainnet}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 text-xs font-mono uppercase tracking-wider border border-amber-500/50 bg-amber-500/[0.1] text-amber-400 hover:bg-amber-500/[0.2] transition-colors"
            >
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Switch to Mainnet
            </button>
          ) : (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 text-xs font-mono uppercase tracking-wider border border-emerald-500/25 bg-emerald-500/[0.04] text-emerald-400">
              <div className="relative">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-500 animate-ping opacity-30" />
              </div>
              {isMainnet ? 'Mainnet' : 'Testnet'}
            </div>
          )}
          <div className="hidden sm:block">
            <RoleSelector />
          </div>
          <div className="hidden sm:block">
            <WalletConnection />
          </div>
          <div className="sm:hidden">
            <ConnectButton />
          </div>
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
      <BottomAccent />

      {/* Mobile menu */}
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
                  {!isMainnet && (
                    <MobileNavLink
                      href="/customer/pools"
                      active={pathname.startsWith('/customer/pools')}
                    >
                      Yield
                    </MobileNavLink>
                  )}
                  {!isMainnet && (
                    <MobileNavLink
                      href="/customer/trading"
                      active={pathname.startsWith('/customer/trading')}
                    >
                      Trading
                    </MobileNavLink>
                  )}
                  <MobileNavLink
                    href="/customer/p2p"
                    active={pathname.startsWith('/customer/p2p')}
                  >
                    P2P
                  </MobileNavLink>
                  {!isMainnet && (
                    <MobileNavLink
                      href="/customer/faucet"
                      active={pathname === '/customer/faucet'}
                    >
                      Faucet
                    </MobileNavLink>
                  )}
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
              <div className="h-px bg-border/20 my-1" />
              <MobileNavLink href="/docs" active={pathname.startsWith('/docs')}>
                📖 Docs
              </MobileNavLink>
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

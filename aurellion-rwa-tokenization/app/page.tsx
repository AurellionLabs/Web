'use client';

import { useState, useCallback } from 'react';
import AurellionNav from '@/components/aurellion/nav';
import PageLanding from '@/components/aurellion/page-landing';
import PageDashboard from '@/components/aurellion/page-dashboard';
import PageTrading from '@/components/aurellion/page-trading';
import PageNode from '@/components/aurellion/page-node';
import PageComponents from '@/components/aurellion/page-components';

const appPages = [
  'dashboard',
  'trading',
  'node',
  'yield',
  'p2p',
  'faucet',
  'components',
];

export default function Page() {
  const [activePage, setActivePage] = useState('landing');
  const [isTransitioning, setIsTransitioning] = useState(false);

  const navigate = useCallback(
    (page: string) => {
      if (page === activePage || isTransitioning) return;
      setIsTransitioning(true);
      setTimeout(() => {
        setActivePage(page);
        window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
        setTimeout(() => setIsTransitioning(false), 50);
      }, 200);
    },
    [activePage, isTransitioning],
  );

  const isAppPage = appPages.includes(activePage);

  return (
    <div className="min-h-screen bg-background">
      {/* Show nav on app pages */}
      {isAppPage && (
        <AurellionNav activePage={activePage} onNavigate={navigate} />
      )}

      {/* Page content */}
      <main
        className="transition-opacity duration-200"
        style={{ opacity: isTransitioning ? 0 : 1 }}
      >
        {activePage === 'landing' && <PageLanding onNavigate={navigate} />}
        {activePage === 'dashboard' && <PageDashboard />}
        {activePage === 'trading' && <PageTrading />}
        {activePage === 'node' && <PageNode />}
        {activePage === 'components' && <PageComponents />}
        {['yield', 'p2p', 'faucet'].includes(activePage) && (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="relative w-14 h-14 border border-border/40 mx-auto mb-6 flex items-center justify-center">
                <div className="absolute top-0 left-0 w-2.5 h-[1px] bg-crimson/30" />
                <div className="absolute top-0 left-0 w-[1px] h-2.5 bg-crimson/30" />
                <div className="absolute bottom-0 right-0 w-2.5 h-[1px] bg-gold/20" />
                <div className="absolute bottom-0 right-0 w-[1px] h-2.5 bg-gold/20" />
                <div className="w-4 h-4 border border-gold/20 rotate-45" />
              </div>
              <h2 className="font-serif text-3xl text-gold mb-2 capitalize">
                {activePage === 'p2p'
                  ? 'P2P Trading'
                  : activePage === 'faucet'
                    ? 'Token Faucet'
                    : 'Yield Protocol'}
              </h2>
              <p className="font-mono text-xs tracking-[0.2em] uppercase text-foreground/40 mb-6">
                Coming Soon
              </p>
              <div className="flex items-center justify-center gap-3">
                <div className="w-8 h-[1px] bg-crimson/25" />
                <span className="font-mono text-[11px] tracking-[0.2em] text-foreground/25 uppercase">
                  Module Under Development
                </span>
                <div className="w-8 h-[1px] bg-crimson/25" />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Landing page nav overlay — shown only on landing */}
      {activePage === 'landing' && (
        <header className="fixed top-0 left-0 right-0 z-50">
          <div className="h-[1px] bg-gold/20" />
          <nav className="flex items-center justify-between px-4 md:px-8 py-3 bg-background/80 backdrop-blur-md">
            <button
              onClick={() => navigate('landing')}
              className="flex items-center gap-3 group"
            >
              <div className="relative w-9 h-9 border border-gold/40 group-hover:border-gold/80 transition-colors duration-300">
                <div className="absolute top-0 left-0 w-2 h-[1px] bg-crimson" />
                <div className="absolute top-0 left-0 w-[1px] h-2 bg-crimson" />
                <div className="absolute bottom-0 right-0 w-2 h-[1px] bg-crimson" />
                <div className="absolute bottom-0 right-0 w-[1px] h-2 bg-crimson" />
                <span className="absolute inset-0 flex items-center justify-center font-serif text-sm text-gold">
                  A
                </span>
              </div>
              <span className="font-serif text-lg tracking-wide text-foreground">
                Aurellion
              </span>
            </button>

            <div className="hidden md:flex items-center gap-10">
              {['Protocol', 'Assets', 'Governance', 'Research'].map((item) => (
                <span
                  key={item}
                  className="font-mono text-xs tracking-[0.15em] uppercase text-foreground/40 hover:text-gold transition-colors duration-300 cursor-pointer"
                >
                  {item}
                </span>
              ))}
            </div>

            <button
              onClick={() => navigate('dashboard')}
              className="relative border border-gold/30 hover:border-gold/60 px-5 py-2 transition-colors duration-300 group"
            >
              <div className="absolute top-0 left-0 w-1.5 h-[1px] bg-crimson" />
              <div className="absolute bottom-0 right-0 w-1.5 h-[1px] bg-crimson" />
              <span className="font-mono text-xs tracking-[0.12em] uppercase text-gold/80 group-hover:text-gold transition-colors">
                Launch App
              </span>
            </button>
          </nav>
          <div className="h-[1px] bg-gold/10" />
        </header>
      )}
    </div>
  );
}

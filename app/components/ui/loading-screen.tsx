'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

const loadingMessages = [
  'Verifying asset provenance...',
  'Anchoring legal documents...',
  'Tokenising real-world value...',
  'Syncing with global registries...',
  'Auditing collateral reserves...',
  'Calibrating compliance engines...',
  'Securing custodial vaults...',
  'Fractionalising liquidity pools...',
  'Bridging fiat and crypto rails...',
  'Finalising on-chain settlement...',
];

export function LoadingScreen() {
  const [currentMessage, setCurrentMessage] = useState(loadingMessages[0]);

  useEffect(() => {
    let currentIndex = 0;
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % loadingMessages.length;
      setCurrentMessage(loadingMessages[currentIndex]);
    }, 2000); // Change message every 2 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center min-h-screen">
      <div className="text-center space-y-8">
        <div className="relative w-48 h-48 mx-auto">
          {/* Spinning border */}
          <div className="absolute inset-0 border-8 border-white border-t-transparent rounded-full animate-spin"></div>
          {/* Centered logo */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="Aurum Logo"
              width={96}
              height={96}
              className="rounded-full"
              priority
            />
          </div>
        </div>
        <p className="text-2xl font-medium text-white animate-pulse mt-8">
          {currentMessage}
        </p>
      </div>
    </div>
  );
}

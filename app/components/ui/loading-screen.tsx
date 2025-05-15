'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

const loadingMessages = [
  'Tending to goats...',
  'Trimming the hedges...',
  'Tokenising the world...',
  'Herding the sheep...',
  'Feeding the chickens...',
  'Planting digital seeds...',
  'Cultivating blockchain gardens...',
  'Milking the opportunities...',
  'Building sustainable futures...',
  'Growing decentralized dreams...',
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
          <div className="absolute inset-0 border-8 border-primary border-t-transparent rounded-full animate-spin"></div>
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
        <p className="text-2xl font-medium text-primary animate-pulse mt-8">
          {currentMessage}
        </p>
      </div>
    </div>
  );
}

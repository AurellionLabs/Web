import React from 'react';
import { motion } from 'framer-motion';

const HeroSection = () => {
  return (
    <section className="relative flex items-center justify-center h-screen overflow-hidden bg-black">
      {/* Replace inner overlay gradient with a solid or no background if needed */}
      {/* Option 1: Remove overlay entirely if not needed for visual effect */}
      {/* Option 2: Use a very subtle solid dark overlay */}
      {/* <div className="absolute inset-0 bg-black/30 z-0"></div> */}
      {/* Removing the gradient div for now */}
      {/* <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-red-950/50 to-black opacity-90 z-0"></div> */}

      {/* Placeholder for CINEMATIC background video/animation */}
      {/* Suggestion: Looping abstract animation of data/network flowing - Should complement the Red/Gold theme */}
      {/* <video autoPlay loop muted playsInline className="absolute inset-0 object-cover w-full h-full z-0 opacity-10 mix-blend-screen">
        <source src="/videos/aurellion-hero-loop-dark-redgold.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video> */}

      {/* Subtle animated pattern overlay (optional) - Consider a geometric gold pattern */}
      {/* <div className="absolute inset-0 bg-[url('/patterns/geometric-gold.svg')] bg-repeat opacity-[0.02] z-5 animate-pulse-slow"></div> */}

      <div className="container relative z-10 mx-auto px-4 text-center text-white space-y-6 md:space-y-8">
        {/* Test Basic Animation (No Scroll Trigger) */}
        <motion.h1
          initial={{ opacity: 0, y: 50 }} // Start further down
          animate={{ opacity: 1, y: 0 }} // Animate on load
          transition={{ duration: 1.0, ease: 'easeOut' }} // Slightly longer duration
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight 
                     tracking-tight 
                     bg-gradient-to-r from-amber-300 via-gold-400 to-red-400 
                     inline-block text-transparent bg-clip-text 
                     [text-shadow:0_0_15px_rgba(255,190,0,0.3)]"
        >
          Real-World Assets, Digitally Reimagined.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.0, delay: 0.5, ease: 'easeOut' }} // Animate on load with delay
          className="text-lg md:text-xl lg:text-2xl text-gray-300 max-w-3xl mx-auto font-light"
        >
          Aurellion seamlessly integrates blockchain-verified assets,
          transparent logistics, and RWA-backed staking into one powerful
          ecosystem.
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.0, delay: 1.0, ease: 'easeOut' }} // Animate on load with longer delay
          className="pt-6 md:pt-8"
        >
          <button
            className="bg-gradient-to-r from-red-600 to-amber-500 
                       hover:from-red-700 hover:to-amber-600 
                       text-white font-semibold py-3 px-10 rounded-md text-lg 
                       shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 
                       transition duration-300 ease-in-out 
                       transform hover:scale-105 active:scale-95 
                       focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-black"
          >
            Explore the Ecosystem
          </button>
        </motion.div>
      </div>

      {/* Optional: Subtle hint for scroll down? */}
      {/* <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-20">
        <motion.svg 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
          className="w-6 h-6 text-gray-500 hover:text-amber-400 transition-colors" 
          fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
        </motion.svg>
      </div> */}
    </section>
  );
};

export default HeroSection;

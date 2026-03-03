'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Zap } from 'lucide-react';
import { GlowButton } from '../ui/glow-button';
import { StatusBadge } from '../ui/status-badge';
import Link from 'next/link';

/**
 * Floating particles background component - Gold/Red particles
 */
const FloatingParticles: React.FC = () => {
  const particles = Array.from({ length: 25 }, (_, i) => ({
    id: i,
    size: Math.random() * 4 + 2,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 20 + 10,
    delay: Math.random() * 5,
    color: i % 3 === 0 ? 'bg-red-500/30' : 'bg-amber-500/20',
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className={`absolute rounded-full ${particle.color}`}
          style={{
            width: particle.size,
            height: particle.size,
            left: `${particle.x}%`,
            top: `${particle.y}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
};

/**
 * Animated grid lines background with red/gold accent
 */
const GridBackground: React.FC = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* Grid pattern */}
    <div
      className="absolute inset-0 opacity-[0.03]"
      style={{
        backgroundImage: `
          linear-gradient(rgba(245, 158, 11, 0.3) 1px, transparent 1px),
          linear-gradient(90deg, rgba(245, 158, 11, 0.3) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }}
    />

    {/* Radial gradient overlays - Red and Gold */}
    <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-red-500/5 rounded-full blur-3xl" />
    <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-amber-500/8 rounded-full blur-3xl" />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-amber-900/5 rounded-full blur-3xl" />

    {/* Edge fades */}
    <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-[#050505] to-transparent" />
    <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-[#050505] to-transparent" />
  </div>
);

/**
 * HeroSection - Full viewport hero with Aurellion red/gold theme
 */
const HeroSection: React.FC = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#050505]">
      {/* Background layers */}
      <GridBackground />
      <FloatingParticles />

      {/* Content */}
      <div className="container relative z-10 mx-auto px-6 text-center py-20">
        {/* Status badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex justify-center mb-8"
        >
          <StatusBadge status="live" label="Status: Live" pulse />
        </motion.div>

        {/* Main headline with red-gold gradient - Fixed clipping */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold leading-tight tracking-tight mb-8"
        >
          <span className="block text-white mb-2">Real-World Assets,</span>
          <span
            className="block pb-2"
            style={{
              background:
                'linear-gradient(135deg, #fbbf24 0%, #ef4444 50%, #f59e0b 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              lineHeight: '1.2',
            }}
          >
            Digitally Reimagined.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-base md:text-lg lg:text-xl text-white/80 max-w-2xl mx-auto mb-12 leading-relaxed"
        >
          Aurellion orchestrates asset onboarding, compliance, and liquidity so
          that commodities, real estate, and private credit can become tradable,
          regulated tokens.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link href="/tokenization">
            <GlowButton
              variant="primary"
              size="lg"
              glow
              rightIcon={<ArrowRight className="h-5 w-5" />}
            >
              Launch Tokenization
            </GlowButton>
          </Link>
          <Link href="/assets">
            <GlowButton
              variant="outline"
              size="lg"
              leftIcon={<Zap className="h-5 w-5" />}
            >
              Explore Asset Universe
            </GlowButton>
          </Link>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
        >
          {[
            { label: 'Assets Tokenized', value: '3,200+' },
            { label: 'Partner Issuers', value: '120+' },
            { label: 'Global Registries', value: '18' },
            { label: 'Compliance Pass Rate', value: '99.8%' },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.1 + index * 0.1 }}
              className="text-center group"
            >
              <div
                className="text-2xl md:text-3xl font-semibold mb-1 transition-all duration-300 group-hover:text-amber-400"
                style={{
                  background:
                    'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {stat.value}
              </div>
              <div className="text-sm text-white/70">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          className="w-6 h-10 rounded-full border-2 border-neutral-600/50 flex justify-center pt-2"
        >
          <div className="w-1.5 h-3 bg-amber-500 rounded-full" />
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;

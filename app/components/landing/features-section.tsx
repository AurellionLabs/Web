'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Repeat, Coins, BarChart3 } from 'lucide-react';
import { GlassCard } from '../ui/glass-card';

/**
 * Feature data for the architecture section
 */
const features = [
  {
    title: 'Arbitrage & Trading',
    description:
      'Market inefficiency capture through hedged perp/spot positions and automated trading strategies.',
    icon: Repeat,
    allocation: '50%',
    color: 'accent',
  },
  {
    title: 'Staking & Restaking',
    description:
      'Yield from protocol revenue: USDe staking, sDAI, restaked LSTs and other yield-generating assets.',
    icon: Coins,
    allocation: '30%',
    color: 'green',
  },
  {
    title: 'Liquidity Provision',
    description:
      'Fee generation from market-making, AMM pools, and structured liquidity strategies.',
    icon: BarChart3,
    allocation: '20%',
    color: 'purple',
  },
];

/**
 * FeatureCard - Individual feature card component
 */
interface FeatureCardProps {
  feature: (typeof features)[0];
  index: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ feature, index }) => {
  const Icon = feature.icon;

  const colorClasses = {
    accent: {
      bg: 'bg-accent/10',
      border: 'border-accent/30',
      text: 'text-accent',
      glow: 'group-hover:shadow-glow-sm',
    },
    green: {
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
      text: 'text-green-400',
      glow: 'group-hover:shadow-glow-buy',
    },
    purple: {
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/30',
      text: 'text-purple-400',
      glow: 'group-hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]',
    },
  };

  const colors = colorClasses[feature.color as keyof typeof colorClasses];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group"
    >
      <GlassCard
        hover
        className={`h-full transition-all duration-300 ${colors.glow}`}
      >
        {/* Allocation badge */}
        <div
          className={`inline-flex items-center px-3 py-1 rounded-full ${colors.bg} ${colors.text} text-sm font-mono font-bold mb-4`}
        >
          ~{feature.allocation}
        </div>

        {/* Icon */}
        <div
          className={`w-14 h-14 rounded-xl ${colors.bg} ${colors.border} border flex items-center justify-center mb-4`}
        >
          <Icon className={`w-7 h-7 ${colors.text}`} />
        </div>

        {/* Content */}
        <h3 className="text-xl font-semibold text-foreground mb-3">
          {feature.title}
        </h3>
        <p className="text-muted-foreground leading-relaxed">
          {feature.description}
        </p>
      </GlassCard>
    </motion.div>
  );
};

/**
 * FeaturesSection - Three-column feature grid (Architecture)
 *
 * Features:
 * - Glass-morphism cards
 * - Hover effects with glow
 * - Percentage allocations
 * - Clean iconography
 */
const FeaturesSection: React.FC = () => {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute top-1/3 right-0 w-1/3 h-64 bg-purple-500/5 blur-3xl" />
      <div className="absolute bottom-1/3 left-0 w-1/3 h-64 bg-accent/5 blur-3xl" />

      <div className="container mx-auto px-4 max-w-6xl relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            Architecture
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-foreground mb-4">
            Institutional-Grade Yield Sources
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Yield generated from three independent sources, designed to compound
            regardless of market conditions.
          </p>
        </motion.div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;

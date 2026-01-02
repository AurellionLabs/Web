'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Database,
  ShoppingCart,
  Truck,
  FileCheck,
  TrendingUp,
} from 'lucide-react';
import { GlassCard } from '../ui/glass-card';

/**
 * Step data for the how it works section
 */
const steps = [
  {
    number: '01',
    title: 'Deposit Assets',
    description:
      'Tokenize real-world assets, creating verifiable digital twins (ERC1155) on the blockchain.',
    icon: Database,
  },
  {
    number: '02',
    title: 'Receive Vault Shares',
    description:
      'You receive vault shares that represent your exact ownership percentage of the pool.',
    icon: ShoppingCart,
  },
  {
    number: '03',
    title: 'Strategies Deploy',
    description:
      'Aurellion automatically runs arbitrage, yield farming, and liquidity provision strategies.',
    icon: Truck,
  },
  {
    number: '04',
    title: 'Value Grows',
    description:
      'As yield is generated, the Price Per Share rises and your position grows automatically.',
    icon: FileCheck,
  },
  {
    number: '05',
    title: 'Withdraw Anytime',
    description:
      'You can withdraw anytime, with a short waiting period before funds can be claimed.',
    icon: TrendingUp,
  },
];

/**
 * StepCard - Individual step card component
 */
interface StepCardProps {
  step: (typeof steps)[0];
  index: number;
  isLast: boolean;
}

const StepCard: React.FC<StepCardProps> = ({ step, index, isLast }) => {
  const Icon = step.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="relative"
    >
      {/* Connector line */}
      {!isLast && (
        <div className="hidden md:block absolute top-1/2 left-full w-full h-px bg-gradient-to-r from-accent/30 to-transparent -translate-y-1/2 z-0" />
      )}

      <GlassCard hover className="relative z-10 h-full">
        {/* Step number */}
        <div className="absolute -top-3 -right-3 w-12 h-12 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center">
          <span className="text-sm font-mono font-bold text-accent">
            {step.number}
          </span>
        </div>

        {/* Icon */}
        <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
          <Icon className="w-6 h-6 text-accent" />
        </div>

        {/* Content */}
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {step.title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {step.description}
        </p>
      </GlassCard>
    </motion.div>
  );
};

/**
 * HowItWorksSection - Step-by-step flow explanation
 *
 * Features:
 * - Numbered step cards
 * - Animated connector lines
 * - Scroll-triggered animations
 * - Clean iconography
 */
const HowItWorksSection: React.FC = () => {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute top-1/2 left-0 w-1/2 h-64 bg-accent/5 blur-3xl -translate-y-1/2" />

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
            How it works
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-foreground mb-4">
            Inside The Vault
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Deposit assets, receive vault shares, and earn yield as the protocol
            executes strategies automatically.
          </p>
        </motion.div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {steps.map((step, index) => (
            <StepCard
              key={step.number}
              step={step}
              index={index}
              isLast={index === steps.length - 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;

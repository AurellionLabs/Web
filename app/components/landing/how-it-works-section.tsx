'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FileCheck, Shield, Building, Globe, Sparkles } from 'lucide-react';
import { GlassCard } from '../ui/glass-card';

/**
 * Step data for the how it works section
 */
const steps = [
  {
    number: '01',
    title: 'Asset Intake',
    description:
      'Gather audited documentation, valuations, and legal wrappers so every asset enters our system with a verified provenance trail.',
    icon: FileCheck,
  },
  {
    number: '02',
    title: 'Compliance Tokenization',
    description:
      'We mint regulated security tokens with embedded AML/KYC rules, investor caps, and custody controls.',
    icon: Shield,
  },
  {
    number: '03',
    title: 'Fractional Pooling',
    description:
      'Assets are sliced into fractional ownership units that aggregate into diversified pools for broader access.',
    icon: Building,
  },
  {
    number: '04',
    title: 'Global Market Access',
    description:
      'Tokens list on compliant liquidity venues with settlement rails that bridge fiat and crypto.',
    icon: Globe,
  },
  {
    number: '05',
    title: 'Long-Term Stewardship',
    description:
      'Continuous reporting, insurance, and governance ensure the underlying asset performs and retains value.',
    icon: Sparkles,
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
        <p className="text-sm text-foreground/90 leading-relaxed">
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
            Tokenization Workflow
          </h2>
          <p className="text-lg text-foreground/90 max-w-2xl mx-auto">
            Every asset is vetted, tokenized with legal guardrails, and routed
            to liquidity so issuers and investors collaborate with confidence.
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

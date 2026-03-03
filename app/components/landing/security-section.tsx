'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Eye, Lock, Timer } from 'lucide-react';
import { GlassCard } from '../ui/glass-card';

/**
 * Security feature data
 */
const securityFeatures = [
  {
    title: 'Document Provenance',
    description:
      'Immutable hashes of legal documents and valuations anchor every token to a verifiable asset record.',
    icon: Eye,
  },
  {
    title: 'Custodial Governance',
    description:
      'Multi-sig vaults, registered custodians, and surveillance monitor collateral at all times.',
    icon: Shield,
  },
  {
    title: 'Compliance Monitoring',
    description:
      'Automated rule engines flag investor eligibility, trading caps, and regional restrictions before execution.',
    icon: Lock,
  },
  {
    title: 'Insurance & Timelocks',
    description:
      'Mandatory notice periods plus insured settlement pools give institutional counterparties peace of mind.',
    icon: Timer,
  },
];

/**
 * SecuritySection - Layered security visualization
 *
 * Features:
 * - Security feature cards
 * - Animated diagram
 * - Trust badges
 */
const SecuritySection: React.FC = () => {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/5 to-transparent" />

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
            Tokenization Trust
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-foreground mb-4">
            Custody and Compliance Guardrails
          </h2>
          <p className="text-lg text-foreground/90 max-w-2xl mx-auto">
            Every asset touches compliance checkpoints, insured custody, and
            programmable controls before it becomes tradable.
          </p>
        </motion.div>

        {/* Security architecture visualization */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Diagram */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            {/* Layered architecture diagram */}
            <div className="relative space-y-4">
              {/* Layer 1 - Outer */}
              <GlassCard className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-accent/5 to-transparent" />
                <div className="relative flex items-center gap-4 p-4">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">
                      Regulatory Gateways
                    </h4>
                    <p className="text-sm text-foreground/90">
                      Legal partners, registrars, and compliance monitors.
                    </p>
                  </div>
                </div>
              </GlassCard>

              {/* Layer 2 */}
              <div className="ml-8">
                <GlassCard className="relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-transparent" />
                  <div className="relative flex items-center gap-4 p-4">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <Lock className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">
                        Compliance Smart Contracts
                      </h4>
                      <p className="text-sm text-foreground/90">
                        KYC gates, investor caps, and enforcement rules.
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </div>

              {/* Layer 3 - Core */}
              <div className="ml-16">
                <GlassCard
                  className="relative overflow-hidden border-accent/30"
                  glow
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-accent/10 to-transparent" />
                  <div className="relative flex items-center gap-4 p-4">
                    <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                      <Eye className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">
                        Token Vault
                      </h4>
                      <p className="text-sm text-foreground/90">
                        Insured multi-sig custody for every issuance.
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </div>
            </div>
          </motion.div>

          {/* Right side - Feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {securityFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <GlassCard hover padding="md" className="h-full">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-3">
                      <Icon className="w-5 h-5 text-accent" />
                    </div>
                    <h4 className="font-semibold text-foreground mb-1">
                      {feature.title}
                    </h4>
                    <p className="text-sm text-foreground/90">
                      {feature.description}
                    </p>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SecuritySection;

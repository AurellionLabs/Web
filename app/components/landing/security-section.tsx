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
    title: 'Oracle Safety',
    description:
      'Oracle data is protected by safeguards to prevent manipulation and ensure accurate pricing.',
    icon: Eye,
  },
  {
    title: 'Vault Protections',
    description:
      'Vault operations are secured through audits, access controls, and on-chain safeguards.',
    icon: Shield,
  },
  {
    title: 'Role Restrictions',
    description:
      'Critical functions are gated by role restrictions and enforced timelocks.',
    icon: Lock,
  },
  {
    title: 'Timelocks',
    description:
      'All administrative actions are subject to mandatory time delays for security.',
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
            Layered Security
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-foreground mb-4">
            Your Capital Stays Untouchable
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Aurellion incorporates strict oracle controls, audit-driven
            improvements, time-locked governance and withdrawal safeguards.
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
                      External Layer
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Rate limiting, DDoS protection
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
                        Smart Contract Layer
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Audited, verified contracts
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
                        Core Vault
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Multi-sig protected treasury
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
                    <p className="text-sm text-muted-foreground">
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

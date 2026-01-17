import React from 'react';
import {
  ShieldOff,
  Network,
  Ban,
  CheckCircle,
  Zap,
  BarChart,
} from 'lucide-react';
import { motion } from 'framer-motion'; // Import motion

const ProblemSolutionSection = () => {
  // Animation variants for staggered children
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.3 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  };

  return (
    <section className="py-16 md:py-24 bg-black text-white">
      <div className="container mx-auto px-4 max-w-6xl">
        <motion.div
          className="grid md:grid-cols-2 gap-12 items-start" // Use items-start for potentially different content heights
          variants={containerVariants}
          initial="hidden"
          whileInView="visible" // Trigger animation when section scrolls into view
          viewport={{ once: true, amount: 0.3 }} // Adjust viewport settings as needed
        >
          {/* Problem Side */}
          <motion.div className="space-y-6" variants={itemVariants}>
            <h2 className="text-3xl md:text-4xl font-bold text-red-500">
              The Old Way: Opaque & Inefficient
            </h2>
            <p className="text-lg text-gray-300">
              Traditional real-world asset markets suffer from a lack of
              transparency, complex logistics, and limited access, creating
              friction and lost value.
            </p>
            <ul className="space-y-4">
              <li className="flex items-start">
                <Ban className="h-6 w-6 mr-3 text-red-600 flex-shrink-0 mt-1" />
                <span className="text-gray-200">
                  Lack of verifiable provenance and ownership tracking.
                </span>
              </li>
              <li className="flex items-start">
                <ShieldOff className="h-6 w-6 mr-3 text-red-600 flex-shrink-0 mt-1" />
                <span className="text-gray-200">
                  Inefficient, paper-based logistics prone to delays and
                  disputes.
                </span>
              </li>
              <li className="flex items-start">
                <Network className="h-6 w-6 mr-3 text-red-600 flex-shrink-0 mt-1" />
                <span className="text-gray-200">
                  Fragmented systems and numerous intermediaries increasing
                  costs.
                </span>
              </li>
            </ul>
          </motion.div>

          {/* Solution Side - Add a prominent background glow */}
          <motion.div
            className="space-y-6 p-8 bg-gradient-to-br from-gray-800 via-gray-800/70 to-amber-900/20 rounded-lg 
                       shadow-2xl shadow-amber-500/30  // Enhanced shadow for glow effect
                       border border-amber-600/30 backdrop-blur-sm"
            variants={itemVariants}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-amber-400">
              The Aurellion Way: Transparent & Automated
            </h2>
            <p className="text-lg text-gray-200">
              Aurellion leverages blockchain to bring trust, efficiency, and new
              opportunities to RWA management and logistics.
            </p>
            <ul className="space-y-4">
              <li className="flex items-start">
                <CheckCircle className="h-6 w-6 mr-3 text-amber-500 flex-shrink-0 mt-1" />
                <span className="text-gray-100">
                  Immutable on-chain records for asset verification and
                  ownership.
                </span>
              </li>
              <li className="flex items-start">
                <Zap className="h-6 w-6 mr-3 text-amber-500 flex-shrink-0 mt-1" />
                <span className="text-gray-100">
                  Automated, transparent logistics tracking and smart
                  contract-driven payments.
                </span>
              </li>
              <li className="flex items-start">
                <BarChart className="h-6 w-6 mr-3 text-amber-500 flex-shrink-0 mt-1" />
                <span className="text-gray-100">
                  Direct access, reduced friction, and innovative RWA-backed
                  financial opportunities.
                </span>
              </li>
            </ul>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default ProblemSolutionSection;

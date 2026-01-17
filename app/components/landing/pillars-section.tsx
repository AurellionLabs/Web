import React from 'react';
import { DatabaseZap, Waypoints, Server, Gem } from 'lucide-react'; // Example icons
import { motion } from 'framer-motion'; // Import motion

// Use Gold/Amber for icons as primary accent
const pillars = [
  {
    title: 'Verified Assets (Aurum/AuraGoat)',
    description:
      'Immutable ownership, transparent provenance, and standardized grading for tokenized livestock (ERC1155).',
    icon: DatabaseZap,
    color: 'text-amber-400',
  },
  {
    title: 'Decentralized Logistics (AuSys)',
    description:
      'Real-time, on-chain tracking of deliveries, automated bounty payouts, and secure multi-party confirmations.',
    icon: Waypoints,
    color: 'text-amber-400',
  },
  {
    title: 'Node Network',
    description:
      'A growing network of registered Nodes providing secure physical asset management and market access.',
    icon: Server,
    color: 'text-amber-400',
  },
  {
    title: 'RWA-Backed Staking (AuStake)',
    description:
      'Earn sustainable yield by providing liquidity and funding verified real-world asset operations.',
    icon: Gem,
    color: 'text-amber-400',
  },
];

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5 },
  },
};

const PillarsSection = () => {
  return (
    <section className="py-16 md:py-24 bg-black text-white">
      <div className="container mx-auto px-4 max-w-7xl">
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6 }}
          className="text-3xl md:text-4xl font-bold text-center mb-12 md:mb-16"
        >
          Core Pillars of Aurellion
        </motion.h2>
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }} // Trigger when 20% of the grid is visible
        >
          {pillars.map((pillar, index) => {
            const Icon = pillar.icon;
            return (
              <motion.div
                key={index}
                className="group bg-gradient-to-b from-gray-800 to-gray-800/80 p-6 rounded-lg shadow-lg 
                           flex flex-col items-center text-center 
                           border border-gray-700 
                           hover:border-amber-500/50 
                           hover:shadow-2xl hover:shadow-amber-500/40 
                           transition-all duration-300 ease-in-out 
                           hover:scale-[1.03] hover:-translate-y-1"
                variants={itemVariants}
              >
                <Icon
                  className={`h-12 w-12 mb-4 ${pillar.color} group-hover:scale-110 transition-transform duration-300`}
                />
                <h3 className="text-xl font-semibold mb-3 text-gray-100">
                  {pillar.title}
                </h3>
                <p className="text-gray-400 flex-grow text-sm">
                  {pillar.description}
                </p>
                {/* Optional Learn More Link */}
                {/* <a href="#" className={`mt-4 text-amber-400 hover:text-amber-300 hover:underline text-sm`}>Learn More</a> */}
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};

export default PillarsSection;

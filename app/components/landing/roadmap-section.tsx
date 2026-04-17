import React from 'react';
import { motion } from 'framer-motion'; // Import motion

// Placeholder data
const roadmapItems = [
  {
    status: 'Completed',
    title: 'Q2 2024: Core Contract Development',
    description:
      'Development and testing of Diamond facets for nodes, logistics, assets, and staking.',
  },
  {
    status: 'Completed',
    title: 'Q3 2024: Platform Infrastructure & Testnet',
    description:
      'Build application layer, repositories, frontend providers, and deploy to test network.',
  },
  {
    status: 'Current',
    title: 'Q4 2024: Mainnet Launch & Initial Nodes',
    description:
      'Deploy contracts to mainnet, onboard initial Node Operators, launch core platform features.',
  },
  {
    status: 'Upcoming',
    title: 'Q1 2025: Staking V2 & Driver App',
    description:
      'Enhance RWY staking features, launch dedicated mobile application for drivers.',
  },
  {
    status: 'Upcoming',
    title: 'Q2 2025: Expanded Asset Classes',
    description:
      'Research and integration of additional RWA types beyond livestock.',
  },
  {
    status: 'Future',
    title: 'Q4 2025: Decentralized Governance',
    description:
      'Implement community governance mechanisms for platform evolution.',
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
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5 },
  },
};

const RoadmapSection = () => {
  // Updated status colors for Red/Gold theme
  const getStatusClasses = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-600/80 border-green-500 text-green-100'; // Muted green ok
      case 'Current':
        return 'bg-amber-600/80 border-amber-500 text-amber-100'; // Gold/Amber
      case 'Upcoming':
        return 'bg-yellow-600/80 border-yellow-500 text-yellow-100'; // Lighter gold/yellow
      case 'Future':
        return 'bg-gray-600/80 border-gray-500 text-white';
      default:
        return 'bg-gray-600/80 border-gray-500 text-white';
    }
  };

  const getDotColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-500 border-green-400';
      case 'Current':
        return 'bg-amber-500 border-amber-400';
      case 'Upcoming':
        return 'bg-yellow-500 border-yellow-400';
      case 'Future':
        return 'bg-gray-500 border-gray-400';
      default:
        return 'bg-gray-500 border-gray-400';
    }
  };

  return (
    <section className="py-16 md:py-24 bg-black text-white overflow-x-hidden">
      <div className="container mx-auto px-4 max-w-4xl">
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6 }}
          className="text-3xl md:text-4xl font-bold text-center mb-12 md:mb-16"
        >
          Roadmap & Vision
        </motion.h2>

        {/* Themed timeline line */}
        <motion.div
          className="relative border-l-2 border-amber-700/50 ml-3 pl-8 space-y-10"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {roadmapItems.map((item, index) => {
            const statusClasses = getStatusClasses(item.status);
            const dotColor = getDotColor(item.status);

            return (
              <motion.div
                key={index}
                className="relative group"
                variants={itemVariants}
              >
                {/* Dot on the timeline - Themed */}
                <div
                  className={`absolute -left-[2.45rem] top-1 w-4 h-4 rounded-full ${dotColor} ring-4 ring-gray-900 group-hover:scale-125 transition-transform duration-300`}
                ></div>

                {/* Themed Roadmap Item Card */}
                <div
                  className={`text-left bg-gray-800/70 p-6 rounded-lg shadow-md border border-gray-700 backdrop-blur-sm 
                               group-hover:bg-gray-700/80 group-hover:border-amber-600/50 
                               transition-all duration-300`}
                >
                  <span
                    className={`inline-block px-3 py-1 text-xs font-semibold rounded-full mb-3 border ${statusClasses}`}
                  >
                    {item.status}
                  </span>
                  <h3 className="text-xl font-semibold mb-2 text-amber-300">
                    {item.title}
                  </h3>
                  <p className="text-white/80 text-sm">{item.description}</p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};

export default RoadmapSection;

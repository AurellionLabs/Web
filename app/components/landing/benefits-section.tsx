import React from 'react';
import { Activity, Tractor, PackageSearch, Wallet } from 'lucide-react';
import { motion } from 'framer-motion'; // Import motion

const benefits = [
  {
    role: 'For Node Operators',
    description:
      'Unlock new revenue streams, gain broader market access, and efficiently manage your physical & digital inventory on a global platform.',
    icon: Tractor,
    cta: 'Become a Node',
    color: 'border-amber-500', // Use theme color for distinction
  },
  {
    role: 'For Customers',
    description:
      'Purchase assets with verified provenance, enjoy transparent delivery tracking, and experience a simplified, secure buying process.',
    icon: PackageSearch,
    cta: 'Browse Assets',
    color: 'border-red-500', // Can use secondary theme color if needed
  },
  {
    role: 'For Drivers',
    description:
      'Access a steady stream of delivery jobs, receive fair, automated bounty payments via smart contract, and operate within a transparent system.',
    icon: Activity, // Placeholder, maybe Truck?
    cta: 'Drive with Us',
    color: 'border-amber-500', // Use theme color
  },
  {
    role: 'For Stakers',
    description:
      'Earn attractive, sustainable yields backed by tangible real-world assets. Participate in the growth of a new RWA ecosystem.',
    icon: Wallet,
    cta: 'Stake Now',
    color: 'border-red-500', // Can use secondary theme color
  },
];

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.25,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

const BenefitsSection = () => {
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
          Who is Aurellion For?
        </motion.h2>
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-10"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <motion.div
                key={index}
                className={`bg-gray-800/60 p-8 rounded-lg shadow-xl border-l-4 ${benefit.color} backdrop-blur-sm 
                           hover:bg-gray-700/70 transition-all duration-300 
                           hover:shadow-2xl hover:-translate-y-1`}
                variants={itemVariants}
              >
                <Icon className="h-10 w-10 mb-4 text-amber-400" />
                <h3 className="text-2xl font-semibold mb-3 text-gray-100">
                  {benefit.role}
                </h3>
                <p className="text-gray-400 mb-6 text-lg">
                  {benefit.description}
                </p>
                {/* Enhance button shadow for a subtle glow */}
                <button
                  className="bg-gradient-to-r from-amber-500 to-red-600 
                             hover:from-amber-600 hover:to-red-700 
                             text-white font-semibold py-2 px-6 rounded-md text-base 
                             shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 
                             transition-all duration-300 ease-in-out 
                             transform hover:scale-105 active:scale-95 
                             focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-gray-800"
                >
                  {benefit.cta}
                </button>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};

export default BenefitsSection;

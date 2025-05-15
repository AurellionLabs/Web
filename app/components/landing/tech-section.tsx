import React from 'react';
import { motion } from 'framer-motion'; // Import motion
// Assuming you might have SVG icons for technologies
// import SolidityIcon from './icons/solidity.svg';
// import Erc1155Icon from './icons/erc1155.svg';
// import Erc20Icon from './icons/erc20.svg';

const TechSection = () => {
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <section className="py-16 md:py-24 bg-black text-white">
      <div className="container mx-auto px-4 max-w-6xl text-center">
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6 }}
          className="text-3xl md:text-4xl font-bold mb-4"
        >
          Powered by Robust Technology
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg text-gray-300 mb-12 max-w-3xl mx-auto"
        >
          Aurellion leverages proven blockchain technologies to ensure security,
          transparency, and efficiency across the platform.
        </motion.p>
        <motion.div
          className="flex flex-wrap justify-center items-center gap-8 md:gap-12"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {/* Placeholder Tech Items - Refined Hover */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col items-center space-y-2 text-gray-300 group cursor-default"
          >
            {/* <SolidityIcon className="h-12 w-12" /> */}
            <span className="text-4xl group-hover:text-amber-400 group-hover:scale-110 transition-all duration-300">
              🧱
            </span>{' '}
            {/* Added scale */}
            <span className="font-medium">Solidity Smart Contracts</span>
          </motion.div>
          <motion.div
            variants={itemVariants}
            className="flex flex-col items-center space-y-2 text-gray-300 group cursor-default"
          >
            {/* <Erc1155Icon className="h-12 w-12" /> */}
            <span className="text-4xl group-hover:text-amber-400 group-hover:scale-110 transition-all duration-300">
              🖼️
            </span>{' '}
            {/* Added scale */}
            <span className="font-medium">ERC-1155 NFTs (Assets)</span>
          </motion.div>
          <motion.div
            variants={itemVariants}
            className="flex flex-col items-center space-y-2 text-gray-300 group cursor-default"
          >
            {/* <Erc20Icon className="h-12 w-12" /> */}
            <span className="text-4xl group-hover:text-amber-400 group-hover:scale-110 transition-all duration-300">
              💰
            </span>{' '}
            {/* Added scale */}
            <span className="font-medium">ERC-20 Token (Aura)</span>
          </motion.div>
          <motion.div
            variants={itemVariants}
            className="flex flex-col items-center space-y-2 text-gray-300 group cursor-default"
          >
            {/* Placeholder for Blockchain Logo (e.g., Ethereum, Arbitrum) */}
            <span className="text-4xl group-hover:text-amber-400 group-hover:scale-110 transition-all duration-300">
              🔗
            </span>{' '}
            {/* Added scale */}
            <span className="font-medium">Secure Blockchain Layer</span>
          </motion.div>
          {/* Add more technologies if applicable (e.g., Oracles, IPFS) */}
        </motion.div>
        {/* Placeholder for link to technical docs/GitHub */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-16"
        >
          <a
            href="#"
            className="text-amber-400 hover:text-amber-300 hover:underline decoration-amber-400/50 underline-offset-4 transition-all duration-300"
          >
            Explore Technical Documentation &rarr;
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default TechSection;

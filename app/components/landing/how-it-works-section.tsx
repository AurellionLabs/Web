'use client'; // Required for hooks like useRef and useScroll

import React, { useRef } from 'react'; // Import useRef
import { Box, Truck, FileCheck, TrendingUp, Database } from 'lucide-react'; // Removed MapPin for now
import { motion, useScroll, useTransform } from 'framer-motion'; // Import hooks

const HowItWorksSection = () => {
  // Placeholder data for steps
  const steps = [
    {
      title: '1. Tokenize Assets',
      description:
        'Nodes tokenize real-world assets, creating verifiable digital twins (ERC1155) on the blockchain.',
      icon: Database,
    },
    {
      title: '2. Order via Marketplace',
      description:
        'Customers browse and order verified assets directly through the platform.',
      icon: Box,
    },
    {
      title: '3. Track Logistics (AuSys)',
      description:
        'AuSys manages transparent, on-chain logistics, tracking Journeys from sender to receiver.',
      icon: Truck,
    },
    {
      title: '4. Confirm Delivery',
      description:
        'Secure handoffs and confirmations trigger automated driver payments (Aura token).',
      icon: FileCheck,
    },
    {
      title: '5. Stake & Earn (AuStake)',
      description:
        'AuStake allows users to earn returns by staking and funding real-world asset operations.',
      icon: TrendingUp,
    },
  ];

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3, // Stagger the animation of children
      },
    },
  };

  const itemVariants = (isEven: boolean) => ({
    hidden: { opacity: 0, x: isEven ? 50 : -50 }, // Slide in from sides
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.6, ease: 'easeOut' },
    },
  });

  // Ref for the section to track scroll progress
  const sectionRef = useRef<HTMLElement>(null);
  // useScroll hook to get scrollYProgress within the referenced section
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start center', 'end center'], // Animate between center entering/leaving viewport
  });

  // Transform scrollYProgress (0 to 1) to pathLength (0 to 1)
  // We can add easing here if desired, e.g., using value => easeInOut(value)
  const pathLengthProgress = useTransform(scrollYProgress, (value) => value);

  return (
    <section
      ref={sectionRef}
      className="py-16 md:py-24 bg-black text-white overflow-x-hidden"
    >
      <div className="container mx-auto px-4 max-w-6xl text-center">
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6 }}
          className="text-3xl md:text-4xl font-bold mb-4"
        >
          How Aurellion Works
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg text-gray-300 mb-12 md:mb-20 max-w-3xl mx-auto"
        >
          Follow the seamless flow of assets and value through the Aurellion
          ecosystem, from physical tokenization to final delivery and financial
          opportunities.
        </motion.p>

        <div className="relative md:mt-24">
          {' '}
          {/* Added margin top for spacing */}
          {/* SVG Container for the line - positioned absolutely to span the height of the step container */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px hidden md:flex justify-center h-[calc(100%+4rem)] -translate-y-8">
            {' '}
            {/* Extend slightly above/below */}
            <svg
              width="2"
              height="100%"
              viewBox="0 0 2 100"
              preserveAspectRatio="none"
              className="overflow-visible"
            >
              {/* Static background line (optional, if needed) */}
              <path
                d="M 1 0 V 100" // Vertical path from top to bottom
                stroke="rgba(245, 158, 11, 0.15)" // Faint Amber background
                strokeWidth="2"
                fill="none"
              />
              {/* Animated foreground line */}
              <motion.path
                d="M 1 0 V 100" // Vertical path from top to bottom
                stroke="#F59E0B" // Amber 500 color
                strokeWidth="2"
                fill="none"
                style={{ pathLength: pathLengthProgress }} // Animate pathLength
              />
            </svg>
          </div>
          {/* Container for steps with staggered animation */}
          <motion.div
            className="space-y-12 md:space-y-0 md:grid md:grid-cols-1 md:gap-y-20" // Increased gap
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
          >
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isEven = index % 2 === 0;
              // Adjust positioning slightly for better visual alignment with the line center
              const alignmentClass = isEven
                ? 'md:text-right md:pr-12'
                : 'md:text-left md:pl-12';
              const dotPositionClass = isEven
                ? 'md:right-[-0.8rem]'
                : 'md:left-[-0.8rem]';
              const cardAlignment = isEven ? 'md:ml-auto' : 'md:mr-auto';

              return (
                <motion.div
                  key={index}
                  className={`relative md:w-1/2 ${cardAlignment}`}
                  custom={isEven}
                  variants={itemVariants(isEven)}
                >
                  {/* Add persistent glow to the dot using shadow */}
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-800 border-2 border-amber-500 
                                 shadow-lg shadow-amber-500/50 hidden md:block ${dotPositionClass}`}
                  ></div>

                  {/* Styled Step Card */}
                  <div
                    className={`p-6 bg-gray-800/80 rounded-lg shadow-lg backdrop-blur-sm border border-gray-700 ${alignmentClass}`}
                  >
                    <Icon
                      className={`h-10 w-10 mb-3 ${isEven ? 'md:ml-auto' : 'md:mr-0'} text-amber-400`}
                    />
                    <h3 className="text-xl font-semibold mb-2 text-gray-100">
                      {step.title}
                    </h3>
                    <p className="text-gray-400 text-sm">{step.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* <p className="mt-16 text-gray-500 text-sm">
          * Visual representation simplified. Actual implementation involves complex smart contract interactions.
        </p> */}
      </div>
    </section>
  );
};

export default HowItWorksSection;

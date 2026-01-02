'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * FAQ data
 */
const faqs = [
  {
    question: 'What is Aurellion?',
    answer:
      'Aurellion is a multi-strategy yield protocol for tokenized real-world assets. Users can trade, stake, and earn returns through our diversified, hedged, on-chain strategies designed to generate sustainable returns.',
  },
  {
    question: 'What assets can I trade?',
    answer:
      'You can trade a variety of tokenized real-world assets including commodities, collectibles, and other verified assets. Each asset class has different attributes and characteristics.',
  },
  {
    question: 'How does Aurellion generate yield?',
    answer:
      'Aurellion generates yield through a combination of arbitrage, funding rate capture, staking, restaking, and structured liquidity provision strategies across multiple protocols.',
  },
  {
    question: 'How are yields reflected in my balance?',
    answer:
      'Yield is reflected through an increasing Price Per Share (PPS). Your share balance stays constant while its value grows automatically as strategies generate returns.',
  },
  {
    question: 'How do withdrawals work?',
    answer:
      'Withdrawals are requested on-chain and processed via a withdrawal queue, with a short waiting period before funds can be claimed. This ensures orderly liquidity management.',
  },
  {
    question: 'What risks should users be aware of?',
    answer:
      'Risks include smart contract risk, oracle risk, liquidity constraints, and broader market risks. Aurellion mitigates these through layered security and conservative strategy design.',
  },
  {
    question: 'Does Aurellion rely on emissions or inflationary APY?',
    answer:
      "No. Aurellion's yield is generated from real market activity and protocol revenue, not token emissions. This ensures sustainable returns over time.",
  },
];

/**
 * FAQItem - Individual accordion item
 */
interface FAQItemProps {
  faq: (typeof faqs)[0];
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}

const FAQItem: React.FC<FAQItemProps> = ({ faq, isOpen, onToggle, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="border-b border-glass-border last:border-b-0"
    >
      <button
        onClick={onToggle}
        className="w-full py-6 flex items-center justify-between text-left group"
        aria-expanded={isOpen}
      >
        <span
          className={cn(
            'text-lg font-medium transition-colors duration-200',
            isOpen
              ? 'text-foreground'
              : 'text-muted-foreground group-hover:text-foreground',
          )}
        >
          {faq.question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'flex-shrink-0 ml-4 p-1 rounded-full transition-colors duration-200',
            isOpen ? 'bg-accent/10 text-accent' : 'text-muted-foreground',
          )}
        >
          <ChevronDown className="w-5 h-5" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <p className="pb-6 text-muted-foreground leading-relaxed pr-12">
              {faq.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/**
 * FAQSection - Accordion-style FAQ
 *
 * Features:
 * - Expandable accordion items
 * - Smooth animations
 * - Clean, minimal design
 */
const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      <div className="container mx-auto px-4 max-w-3xl relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            FAQ
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-foreground mb-4">
            Learn More
          </h2>
          <p className="text-lg text-muted-foreground">
            Common questions about the Aurellion protocol.
          </p>
        </motion.div>

        {/* FAQ list */}
        <div className="glass rounded-2xl p-2">
          <div className="bg-surface-elevated/50 rounded-xl px-6">
            {faqs.map((faq, index) => (
              <FAQItem
                key={index}
                faq={faq}
                index={index}
                isOpen={openIndex === index}
                onToggle={() =>
                  setOpenIndex(openIndex === index ? null : index)
                }
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;

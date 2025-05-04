import React from 'react';
// Placeholder icons for social media
import { Linkedin, Twitter, Send } from 'lucide-react'; // Example: Using Send for Telegram/Discord
import { motion } from 'framer-motion'; // Import motion

const FinalCTASection = () => {
  return (
    <section className="py-16 md:py-24 bg-black text-white overflow-hidden">
      <div className="container mx-auto px-4 max-w-4xl text-center">
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6 }}
          className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6"
        >
          Join the Future of Asset Management
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl mx-auto"
        >
          Get started with Aurellion today or stay connected for the latest
          updates and developments.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-col sm:flex-row justify-center items-center gap-6 mb-12"
        >
          {/* Themed Primary CTA */}
          <button
            className="bg-gradient-to-r from-red-600 to-amber-500 
                        hover:from-red-700 hover:to-amber-600 
                        text-white font-semibold py-3 px-10 rounded-md text-lg 
                        shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 
                        transition duration-300 ease-in-out 
                        transform hover:scale-105 active:scale-95 
                        focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-black 
                        w-full sm:w-auto"
          >
            Explore the Ecosystem
          </button>

          {/* Placeholder Newsletter Signup */}
          <form className="flex w-full sm:w-auto max-w-sm">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-grow px-4 py-3 rounded-l-md border-0 bg-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
            />
            <button
              type="submit"
              className="bg-gray-600 hover:bg-red-700 hover:scale-105 active:scale-95 text-white font-semibold px-4 py-3 rounded-r-md transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Stay Updated
            </button>
          </form>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex justify-center items-center space-x-6"
        >
          <p className="text-gray-500">Connect with us:</p>
          {/* Themed Social Links */}
          <a
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-amber-400 hover:scale-110 transition-all duration-300"
          >
            <Twitter className="h-6 w-6" />
          </a>
          <a
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-amber-400 hover:scale-110 transition-all duration-300"
          >
            <Linkedin className="h-6 w-6" />
          </a>
          <a
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-amber-400 hover:scale-110 transition-all duration-300"
          >
            <Send className="h-6 w-6" /> {/* Representing Telegram/Discord */}
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTASection;

'use client';

import React from 'react';
import HeroSection from './components/landing/hero-section';
import HowItWorksSection from './components/landing/how-it-works-section';
import FeaturesSection from './components/landing/features-section';
import SecuritySection from './components/landing/security-section';
import FAQSection from './components/landing/faq-section';
import Footer from './components/landing/footer';

/**
 * LandingPage - Main homepage for Aurellion Labs
 *
 * A futuristic, protocol-focused landing page inspired by Altura.trade:
 * - Hero with animated gradient mesh background
 * - How it works step-by-step flow
 * - Features/Architecture section
 * - Security visualization
 * - FAQ accordion
 * - Minimal footer
 */
export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-grow">
        <HeroSection />
        <HowItWorksSection />
        <FeaturesSection />
        <SecuritySection />
        <FAQSection />
      </main>
      <Footer />
    </div>
  );
}

'use client';

import React from 'react';
import HeroSection from './components/landing/hero-section';
import ProblemSolutionSection from './components/landing/problem-solution-section';
import HowItWorksSection from './components/landing/how-it-works-section';
import PillarsSection from './components/landing/pillars-section';
import BenefitsSection from './components/landing/benefits-section';
import TechSection from './components/landing/tech-section';
import RoadmapSection from './components/landing/roadmap-section';
import FinalCTASection from './components/landing/final-cta-section';
import Footer from './components/landing/footer';

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col text-white bg-black">
      <main className="flex-grow">
        <HeroSection />
        <ProblemSolutionSection />
        <HowItWorksSection />
        <PillarsSection />
        <BenefitsSection />
        <TechSection />
        <RoadmapSection />
        <FinalCTASection />
      </main>
      <Footer />
    </div>
  );
}

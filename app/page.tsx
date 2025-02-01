'use client';

import Link from 'next/link';
import {
  ArrowRightIcon,
  BarChart3Icon,
  CoinsIcon,
  ShieldCheckIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <section className="px-4 py-20 md:py-32">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-6">
            <h1 className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
              Participate in Real World Asset Pools
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Provide liquidity to real-world transactions and earn yields
              through our decentralized platform.
            </p>
            <div className="flex gap-4 justify-center pt-6">
              <Link href="/create-pool">
                <Button size="lg" className="text-lg">
                  Create Pool <ArrowRightIcon className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/pools">
                <Button size="lg" variant="outline" className="text-lg">
                  Explore Pools
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-20 bg-white/50 dark:bg-gray-800/50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">
            Why Choose Our Platform?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <CoinsIcon className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle>Earn Real Yields</CardTitle>
                <CardDescription>
                  Generate returns by providing liquidity to real-world
                  transactions and assets
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <ShieldCheckIcon className="h-12 w-12 text-purple-600 mb-4" />
                <CardTitle>Secure & Transparent</CardTitle>
                <CardDescription>
                  Smart contract-powered pools with automated risk management
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <BarChart3Icon className="h-12 w-12 text-green-600 mb-4" />
                <CardTitle>Analytics & Insights</CardTitle>
                <CardDescription>
                  Track your performance with detailed analytics and portfolio
                  management tools
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-20">
        <div className="container mx-auto max-w-4xl text-center">
          <Card className="bg-gradient-to-r from-blue-600 to-purple-600">
            <CardContent className="py-12">
              <h3 className="text-3xl font-bold text-white mb-6">
                Ready to Start Earning?
              </h3>
              <p className="text-white/90 mb-8 text-lg">
                Join our growing community of liquidity providers and start
                earning yields today.
              </p>
              <Link href="/create-pool">
                <Button size="lg" variant="secondary" className="text-lg">
                  Get Started Now
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

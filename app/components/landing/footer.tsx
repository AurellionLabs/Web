'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { StatusBadge } from '../ui/status-badge';
import { Twitter, MessageCircle, FileText, Github } from 'lucide-react';

/**
 * Social links data
 */
const socialLinks = [
  { name: 'Twitter', href: '#', icon: Twitter },
  { name: 'Discord', href: '#', icon: MessageCircle },
  { name: 'Docs', href: '#', icon: FileText },
  { name: 'GitHub', href: '#', icon: Github },
];

/**
 * Footer links data
 */
const footerLinks = [
  { name: 'Privacy Policy', href: '#' },
  { name: 'Terms of Service', href: '#' },
  { name: 'Contact', href: '#' },
];

/**
 * Footer - Minimal footer with status indicator
 *
 * Features:
 * - Status indicator badge
 * - Social media links
 * - Legal links
 * - Copyright notice
 */
const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative border-t border-glass-border">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-surface-base to-transparent opacity-50" />

      <div className="container mx-auto px-4 max-w-6xl relative z-10">
        <div className="py-12 md:py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            {/* Logo and status */}
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center">
                  <Image
                    src="/logo.png"
                    alt="Aurellion Labs"
                    width={24}
                    height={24}
                    className="object-contain"
                  />
                </div>
                <span className="font-display font-bold text-foreground">
                  Aurellion
                </span>
              </Link>
              <StatusBadge status="live" label="Live" pulse size="sm" />
            </div>

            {/* Social links */}
            <div className="flex items-center justify-center gap-4">
              {socialLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <a
                    key={link.name}
                    href={link.href}
                    className="w-10 h-10 rounded-lg bg-glass-bg border border-glass-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-accent/30 transition-all duration-200"
                    aria-label={link.name}
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                );
              })}
            </div>

            {/* Legal links */}
            <div className="flex items-center justify-end gap-6">
              {footerLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-sm text-muted-foreground hover:text-accent transition-colors duration-200"
                >
                  {link.name}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="py-6 border-t border-glass-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} Aurellion Labs. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">Built on Ethereum</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

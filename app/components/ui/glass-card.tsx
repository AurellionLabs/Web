'use client';

import { cn } from '@/lib/utils';
import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'glow';
  hover?: boolean;
  glow?: boolean;
  padding?: boolean | string;
}

export function GlassCard({
  children,
  className,
  variant = 'default',
  hover = false,
  glow = false,
  padding = true,
  ...props
}: GlassCardProps) {
  const paddingClass =
    padding === false
      ? 'p-0'
      : padding === true
        ? 'p-6'
        : typeof padding === 'string'
          ? padding
          : 'p-6';

  return (
    <div
      className={cn(
        'glass rounded-xl',
        paddingClass,
        variant === 'default' && 'border border-neutral-800/50',
        variant === 'elevated' &&
          'surface-elevated border border-neutral-800/50',
        (variant === 'glow' || glow) &&
          'border border-amber-500/20 hover:border-amber-500/40 hover:shadow-glow-sm transition-all duration-300',
        hover &&
          'hover:border-amber-500/30 hover:bg-white/[0.04] transition-all duration-300',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Sub-components for structured card layouts
interface GlassCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function GlassCardHeader({
  children,
  className,
  ...props
}: GlassCardHeaderProps) {
  return (
    <div className={cn('flex flex-col space-y-1.5 mb-6', className)} {...props}>
      {children}
    </div>
  );
}

interface GlassCardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
  className?: string;
}

export function GlassCardTitle({
  children,
  className,
  ...props
}: GlassCardTitleProps) {
  return (
    <h3
      className={cn(
        'text-lg font-semibold leading-none tracking-tight text-white',
        className,
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

interface GlassCardDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
  className?: string;
}

export function GlassCardDescription({
  children,
  className,
  ...props
}: GlassCardDescriptionProps) {
  return (
    <p className={cn('text-sm text-white/80', className)} {...props}>
      {children}
    </p>
  );
}

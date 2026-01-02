'use client';

import { cn } from '@/lib/utils';
import React from 'react';
import { Button, ButtonProps } from './button';
import { Loader2 } from 'lucide-react';

interface GlowButtonProps extends Omit<ButtonProps, 'variant'> {
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  glow?: boolean;
  glowColor?: 'gold' | 'red' | 'green';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
}

export function GlowButton({
  children,
  className,
  variant = 'primary',
  glow = false,
  glowColor = 'gold',
  leftIcon,
  rightIcon,
  loading = false,
  disabled,
  ...props
}: GlowButtonProps) {
  const baseStyles =
    'relative overflow-hidden font-medium transition-all duration-300';

  const variantStyles = {
    primary: cn(
      'bg-gradient-to-r from-red-600 via-amber-500 to-amber-400',
      'hover:from-red-500 hover:via-amber-400 hover:to-amber-300',
      'text-white border-0',
      glow && 'shadow-glow hover:shadow-glow-lg',
    ),
    secondary: cn(
      'bg-gradient-to-r from-amber-600 to-amber-500',
      'hover:from-amber-500 hover:to-amber-400',
      'text-white border-0',
      glow && 'shadow-glow-sm hover:shadow-glow',
    ),
    outline: cn(
      'bg-transparent border border-amber-500/50',
      'hover:border-amber-400 hover:bg-amber-500/10',
      'text-amber-400 hover:text-amber-300',
    ),
    ghost: cn(
      'bg-transparent border-0',
      'hover:bg-amber-500/10',
      'text-amber-400 hover:text-amber-300',
    ),
    destructive: cn(
      'bg-gradient-to-r from-red-600 to-red-500',
      'hover:from-red-500 hover:to-red-400',
      'text-white border-0',
      glow && 'shadow-glow-red-sm hover:shadow-glow-red',
    ),
  };

  return (
    <Button
      className={cn(
        baseStyles,
        variantStyles[variant],
        'focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:ring-offset-2 focus:ring-offset-black',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : leftIcon}
        {children}
        {!loading && rightIcon}
      </span>
    </Button>
  );
}

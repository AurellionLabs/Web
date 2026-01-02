/**
 * Aurellion Protocol Design System - Color Palette
 *
 * Red and Gold theme matching Aurellion branding:
 * - Gold/Amber primary accent colors
 * - Red secondary accent for emphasis
 * - Dark surface colors for depth
 * - Glass morphism support
 *
 * @remarks
 * Colors are organized by purpose and include both hex values
 * and HSL values for flexibility in different contexts.
 */

export const colors = {
  // ============================================
  // PRIMARY ACCENT - Gold/Amber
  // ============================================
  accent: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b', // Primary gold
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03',
    glow: 'rgba(245, 158, 11, 0.5)',
    glowStrong: 'rgba(245, 158, 11, 0.7)',
  },

  // ============================================
  // SECONDARY ACCENT - Red
  // ============================================
  red: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444', // Primary red - rgb(239, 68, 68)
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a',
    glow: 'rgba(239, 68, 68, 0.4)',
    glowStrong: 'rgba(239, 68, 68, 0.6)',
  },

  // ============================================
  // TRADING COLORS
  // ============================================
  trading: {
    buy: '#22c55e',
    buyLight: '#4ade80',
    buyDark: '#16a34a',
    buyGlow: 'rgba(34, 197, 94, 0.3)',
    buyMuted: 'rgba(34, 197, 94, 0.15)',
    sell: '#ef4444',
    sellLight: '#f87171',
    sellDark: '#dc2626',
    sellGlow: 'rgba(239, 68, 68, 0.3)',
    sellMuted: 'rgba(239, 68, 68, 0.15)',
  },

  // ============================================
  // SURFACE COLORS (Background Layers)
  // ============================================
  surface: {
    base: '#050505', // Deepest background
    elevated: '#0d0d0d', // Cards, panels
    overlay: '#141414', // Modals, dropdowns
    hover: '#1a1a1a', // Hover states
  },

  // ============================================
  // GLASS MORPHISM
  // ============================================
  glass: {
    background: 'rgba(255, 255, 255, 0.03)',
    backgroundHover: 'rgba(255, 255, 255, 0.06)',
    border: 'rgba(255, 255, 255, 0.08)',
    borderHover: 'rgba(255, 255, 255, 0.12)',
  },

  // ============================================
  // NEUTRAL COLORS
  // ============================================
  neutral: {
    50: '#fafafa',
    100: '#f4f4f5',
    200: '#e4e4e7',
    300: '#d4d4d8',
    400: '#a1a1aa',
    500: '#71717a',
    600: '#52525b',
    700: '#3f3f46',
    800: '#27272a',
    900: '#18181b',
    950: '#09090b',
  },

  // ============================================
  // TEXT COLORS
  // ============================================
  text: {
    primary: '#ffffff',
    secondary: '#a1a1aa',
    tertiary: '#71717a',
    muted: '#52525b',
    accent: '#f59e0b',
    red: '#ef4444',
    buy: '#22c55e',
    sell: '#ef4444',
  },

  // ============================================
  // BACKGROUND COLORS (Legacy compatibility)
  // ============================================
  background: {
    primary: '#050505',
    secondary: '#0d0d0d',
    tertiary: '#141414',
  },

  // ============================================
  // STATUS COLORS
  // ============================================
  status: {
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },

  // ============================================
  // CHART COLORS
  // ============================================
  chart: {
    primary: '#f59e0b',
    secondary: '#22c55e',
    tertiary: '#ef4444',
    quaternary: '#a855f7',
    quinary: '#3b82f6',
    grid: 'rgba(255, 255, 255, 0.05)',
    axis: 'rgba(255, 255, 255, 0.1)',
  },

  // ============================================
  // LEGACY PRIMARY COLORS (Gold - backward compatibility)
  // ============================================
  primary: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },

  // ============================================
  // LEGACY SECONDARY COLORS (Blue - kept for compatibility)
  // ============================================
  secondary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },

  // ============================================
  // LEGACY TERTIARY COLORS (Green - kept for compatibility)
  // ============================================
  tertiary: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
  },
} as const;

/**
 * Type for the colors object
 */
export type Colors = typeof colors;

/**
 * Helper function to get CSS variable reference
 */
export const cssVar = (name: string): string => `var(--${name})`;

/**
 * Helper function to get HSL color with opacity
 */
export const withOpacity = (color: string, opacity: number): string => {
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  return color;
};

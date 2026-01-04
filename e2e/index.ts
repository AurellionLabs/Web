/**
 * E2E Testing Framework
 *
 * Comprehensive end-to-end testing for the Aurellion platform.
 * Provides local chain management, UI flow simulation, and interface coverage tracking.
 */

// Chain Management
export * from './chain';

// Coverage System
export * from './coverage';

// Flow Simulation
export * from './flows';

// Utilities
export * from './utils';

// Re-export setup utilities for tests
export { getContext, getChain } from './setup/test-setup';

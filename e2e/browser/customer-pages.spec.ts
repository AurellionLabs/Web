/**
 * Customer Pages Smoke Tests
 *
 * Verifies that each customer-facing page loads and renders
 * key structural elements (headings, layout). These tests assert
 * page structure, not blockchain data — they should pass in CI
 * without a live node.
 */

import { test, expect } from '@playwright/test';
import { injectWalletMock, BASE_SEPOLIA_CONFIG } from './wallet-injector';

test.describe('Customer Pages', () => {
  test.beforeEach(async ({ page }) => {
    await injectWalletMock(page, { wallet: BASE_SEPOLIA_CONFIG });
  });

  // ===========================================================================
  // DASHBOARD
  // ===========================================================================

  test.describe('Dashboard', () => {
    test('should load the dashboard page', async ({ page }) => {
      await page.goto('/customer/dashboard');

      await expect(page).toHaveURL(/\/customer\/dashboard/);
      await expect(page).toHaveTitle(/Aurellion/i);
    });

    test('should render a dashboard heading', async ({ page }) => {
      await page.goto('/customer/dashboard');

      const heading = page.locator('h1, h2').first();
      await expect(heading).toBeVisible({ timeout: 10000 });
    });
  });

  // ===========================================================================
  // TRADING
  // ===========================================================================

  test.describe('Trading', () => {
    test('should load the trading page', async ({ page }) => {
      await page.goto('/customer/trading');

      await expect(page).toHaveURL(/\/customer\/trading/);
      await expect(page).toHaveTitle(/Aurellion/i);
    });

    test('should render trading-related content', async ({ page }) => {
      await page.goto('/customer/trading');

      // The trading page should contain trading-related text
      const tradingText = page.locator(
        'text=/trading|trade|asset|market/i',
      );
      const count = await tradingText.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // POOLS
  // ===========================================================================

  test.describe('Pools', () => {
    test('should load the pools page', async ({ page }) => {
      await page.goto('/customer/pools');

      await expect(page).toHaveURL(/\/customer\/pools/);
      await expect(page).toHaveTitle(/Aurellion/i);
    });

    test('should render yield-related content', async ({ page }) => {
      await page.goto('/customer/pools');

      // Pools page should mention yield, pool, liquidity, or similar
      const yieldText = page.locator(
        'text=/pool|yield|liquidity|stake|earn/i',
      );
      const count = await yieldText.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // P2P
  // ===========================================================================

  test.describe('P2P', () => {
    test('should load the P2P page', async ({ page }) => {
      await page.goto('/customer/p2p');

      await expect(page).toHaveURL(/\/customer\/p2p/);
      await expect(page).toHaveTitle(/Aurellion/i);
    });

    test('should render P2P-related content', async ({ page }) => {
      await page.goto('/customer/p2p');

      // P2P page should mention peer-to-peer, P2P, OTC, or similar
      const p2pText = page.locator(
        'text=/p2p|peer|otc|transfer|send/i',
      );
      const count = await p2pText.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // FAUCET
  // ===========================================================================

  test.describe('Faucet', () => {
    test('should load the faucet page', async ({ page }) => {
      await page.goto('/customer/faucet');

      await expect(page).toHaveURL(/\/customer\/faucet/);
      await expect(page).toHaveTitle(/Aurellion/i);
    });

    test('should render faucet-related content', async ({ page }) => {
      await page.goto('/customer/faucet');

      // Faucet page should mention faucet, AURA, tokens, or similar
      const faucetText = page.locator(
        'text=/faucet|aura|token|mint|claim/i',
      );
      const count = await faucetText.count();
      expect(count).toBeGreaterThan(0);
    });
  });
});

// File: test/repositories/PrivyWalletRepository.test.ts
// Unit tests for PrivyWalletRepository — handles wallet connection and blockchain queries via Privy

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ethers } from 'ethers';

// -------------------------------------------------------------------
// Mocks
// -------------------------------------------------------------------

vi.mock('@/utils/error-handler', () => ({
  handleContractError: vi.fn(),
}));

// We need to mock the entire ethers module to avoid BrowserProvider in Node.js
const mockBrowserProviderInstance = {
  getSigner: vi.fn().mockResolvedValue({
    getAddress: vi.fn().mockResolvedValue('0xUserAddress'),
  }),
  getBalance: vi.fn(),
};

vi.mock('ethers', () => ({
  ethers: {
    BrowserProvider: vi
      .fn()
      .mockImplementation(() => mockBrowserProviderInstance),
    Contract: vi.fn(),
  },
  // Also export as default
  default: {
    BrowserProvider: vi
      .fn()
      .mockImplementation(() => mockBrowserProviderInstance),
    Contract: vi.fn(),
  },
}));

// Mock Privy
const mockConnectedWallet = {
  address: '0x1234567890abcdef1234567890abcdef12345678',
  chainId: '0x1',
  getEthereumProvider: vi.fn().mockResolvedValue({}),
};

const mockPrivyWallets = {
  wallets: [mockConnectedWallet],
};

const mockLogin = vi.fn();
const mockLogout = vi.fn();

vi.mock('@privy-io/react-auth', () => ({
  useWallets: () => mockPrivyWallets,
  usePrivy: () => ({
    ready: true,
    authenticated: true,
    login: mockLogin,
    logout: mockLogout,
  }),
}));

// -------------------------------------------------------------------
// Test Suite
// -------------------------------------------------------------------

describe('PrivyWalletRepository', () => {
  let repository: any;
  let PrivyWalletRepository: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Import after setting up mocks
    const mod = await import(
      '@/infrastructure/repositories/privy-wallet-repository'
    );
    PrivyWalletRepository = mod.PrivyWalletRepository;

    // Create repository instance
    repository = new PrivyWalletRepository(mockPrivyWallets, {
      ready: true,
      authenticated: true,
      login: mockLogin,
      logout: mockLogout,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with privy wallets and auth', () => {
      expect(repository.privyWallets).toBe(mockPrivyWallets);
      expect(repository.privyAuth).toBeDefined();
    });

    it('should create a new Wallet instance', () => {
      expect(repository.wallet).toBeDefined();
    });
  });

  describe('normalizeChainId', () => {
    it('should convert decimal number to hex', () => {
      const result = repository.normalizeChainId(1);
      expect(result).toBe('0x1');
    });

    it('should convert large decimal to hex', () => {
      const result = repository.normalizeChainId(8453);
      expect(result).toBe('0x2105');
    });

    it('should pass through hex string unchanged', () => {
      const result = repository.normalizeChainId('0x1');
      expect(result).toBe('0x1');
    });

    it('should prepend 0x to decimal string', () => {
      const result = repository.normalizeChainId('1');
      expect(result).toBe('0x1');
    });
  });

  describe('getPrivyWallets', () => {
    it('should return the privy wallets object', () => {
      expect(repository.getPrivyWallets()).toBe(mockPrivyWallets);
    });
  });

  describe('getState', () => {
    it('should return connected state when authenticated with wallet', () => {
      const state = repository.getState();

      expect(state.isConnected).toBe(true);
      expect(state.address).toBe(mockConnectedWallet.address);
      expect(state.chainId).toBe('0x1');
    });

    it('should return disconnected state when not authenticated', () => {
      // Create a repo with unauthenticated state
      const unauthRepo = new PrivyWalletRepository(
        { wallets: [] },
        {
          ready: true,
          authenticated: false,
          login: mockLogin,
          logout: mockLogout,
        },
      );

      const state = unauthRepo.getState();

      expect(state.isConnected).toBe(false);
    });

    it('should prefer the active wallet resolver over the first privy wallet', () => {
      const secondaryWallet = {
        address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        chainId: '0x2105',
        getEthereumProvider: vi.fn().mockResolvedValue({}),
      };

      const multiWalletRepo = new PrivyWalletRepository(
        { wallets: [mockConnectedWallet, secondaryWallet] },
        {
          ready: true,
          authenticated: true,
          login: mockLogin,
          logout: mockLogout,
        },
        () => secondaryWallet,
      );

      const state = multiWalletRepo.getState();

      expect(state.address).toBe(secondaryWallet.address);
      expect(state.chainId).toBe('0x2105');
    });
  });

  describe('getWallet', () => {
    it('should return the wallet instance', () => {
      expect(repository.getWallet()).toBe(repository.wallet);
    });
  });

  describe('connect', () => {
    it('should throw when privy not ready', async () => {
      const notReadyRepo = new PrivyWalletRepository(mockPrivyWallets, {
        ready: false,
        authenticated: true,
        login: mockLogin,
        logout: mockLogout,
      });

      await expect(notReadyRepo.connect()).rejects.toThrow(
        'Privy is not ready',
      );
    });

    it('should throw if no wallet after login', async () => {
      const noWalletRepo = new PrivyWalletRepository(
        { wallets: [] },
        {
          ready: true,
          authenticated: false,
          login: mockLogin,
          logout: mockLogout,
        },
      );

      await expect(noWalletRepo.connect()).rejects.toThrow(
        'No connected wallet found after login attempt',
      );
    });
  });

  describe('disconnect', () => {
    it('should logout on disconnect', async () => {
      await repository.disconnect();

      expect(mockLogout).toHaveBeenCalled();
    });
  });
});

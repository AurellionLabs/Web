// @ts-nocheck - Test file with vitest
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Wallet, WalletState } from '@/domain/models/wallet';
import { IWalletRepository } from '@/domain/wallet';
import { ethers } from 'ethers';

describe('Wallet Domain', () => {
  describe('WalletState Type', () => {
    it('should have correct structure for connected state', () => {
      const state: WalletState = {
        address: '0x1234567890123456789012345678901234567890',
        isConnected: true,
        chainId: '0x1', // Mainnet
      };

      expect(state).toHaveProperty('address');
      expect(state).toHaveProperty('isConnected');
      expect(state).toHaveProperty('chainId');
      expect(typeof state.address).toBe('string');
      expect(typeof state.isConnected).toBe('boolean');
      expect(typeof state.chainId).toBe('string');
    });

    it('should have correct structure for disconnected state', () => {
      const state: WalletState = {
        address: null,
        isConnected: false,
        chainId: null,
      };

      expect(state.address).toBeNull();
      expect(state.isConnected).toBe(false);
      expect(state.chainId).toBeNull();
    });

    it('should allow various chain IDs', () => {
      const mainnetState: WalletState = {
        address: '0x1234',
        isConnected: true,
        chainId: '0x1',
      };
      const sepoliaState: WalletState = {
        address: '0x1234',
        isConnected: true,
        chainId: '0xaa36a7',
      };
      const baseSepoliaState: WalletState = {
        address: '0x1234',
        isConnected: true,
        chainId: '0x14a34',
      };

      expect(mainnetState.chainId).toBe('0x1');
      expect(sepoliaState.chainId).toBe('0xaa36a7');
      expect(baseSepoliaState.chainId).toBe('0x14a34');
    });
  });

  describe('Wallet Class', () => {
    let wallet: Wallet;

    beforeEach(() => {
      wallet = new Wallet();
    });

    describe('constructor', () => {
      it('should initialize with disconnected state', () => {
        const state = wallet.getState();

        expect(state.address).toBeNull();
        expect(state.isConnected).toBe(false);
        expect(state.chainId).toBeNull();
      });

      it('should initialize with null provider', () => {
        const provider = wallet.getProvider();

        expect(provider).toBeNull();
      });
    });

    describe('getState', () => {
      it('should return a copy of the state', () => {
        const state1 = wallet.getState();
        const state2 = wallet.getState();

        expect(state1).toEqual(state2);
        expect(state1).not.toBe(state2); // Should be different object references
      });
    });

    describe('connect', () => {
      it('should update state when connected', async () => {
        // Create mock provider
        const mockAddress = '0x1234567890123456789012345678901234567890';
        const mockChainId = 1n;

        const mockSigner = {
          getAddress: vi.fn().mockResolvedValue(mockAddress),
        };

        const mockNetwork = {
          chainId: mockChainId,
        };

        const mockProvider = {
          getSigner: vi.fn().mockResolvedValue(mockSigner),
          getNetwork: vi.fn().mockResolvedValue(mockNetwork),
        } as unknown as ethers.BrowserProvider;

        await wallet.connect(mockProvider);

        const state = wallet.getState();
        expect(state.address).toBe(mockAddress);
        expect(state.isConnected).toBe(true);
        expect(state.chainId).toBe('0x1');
      });

      it('should store the provider', async () => {
        const mockSigner = { getAddress: vi.fn().mockResolvedValue('0x1234') };
        const mockNetwork = { chainId: 1n };
        const mockProvider = {
          getSigner: vi.fn().mockResolvedValue(mockSigner),
          getNetwork: vi.fn().mockResolvedValue(mockNetwork),
        } as unknown as ethers.BrowserProvider;

        await wallet.connect(mockProvider);

        expect(wallet.getProvider()).toBe(mockProvider);
      });

      it('should handle different chain IDs', async () => {
        const mockSigner = { getAddress: vi.fn().mockResolvedValue('0x1234') };
        const mockNetwork = { chainId: 84532n }; // Base Sepolia
        const mockProvider = {
          getSigner: vi.fn().mockResolvedValue(mockSigner),
          getNetwork: vi.fn().mockResolvedValue(mockNetwork),
        } as unknown as ethers.BrowserProvider;

        await wallet.connect(mockProvider);

        const state = wallet.getState();
        expect(state.chainId).toBe('0x14a34'); // 84532 in hex
      });
    });

    describe('disconnect', () => {
      it('should reset state when disconnected', async () => {
        // First connect
        const mockSigner = { getAddress: vi.fn().mockResolvedValue('0x1234') };
        const mockNetwork = { chainId: 1n };
        const mockProvider = {
          getSigner: vi.fn().mockResolvedValue(mockSigner),
          getNetwork: vi.fn().mockResolvedValue(mockNetwork),
        } as unknown as ethers.BrowserProvider;

        await wallet.connect(mockProvider);

        // Then disconnect
        wallet.disconnect();

        const state = wallet.getState();
        expect(state.address).toBeNull();
        expect(state.isConnected).toBe(false);
        expect(state.chainId).toBeNull();
      });

      it('should clear the provider', async () => {
        const mockSigner = { getAddress: vi.fn().mockResolvedValue('0x1234') };
        const mockNetwork = { chainId: 1n };
        const mockProvider = {
          getSigner: vi.fn().mockResolvedValue(mockSigner),
          getNetwork: vi.fn().mockResolvedValue(mockNetwork),
        } as unknown as ethers.BrowserProvider;

        await wallet.connect(mockProvider);
        wallet.disconnect();

        expect(wallet.getProvider()).toBeNull();
      });
    });

    describe('updateState', () => {
      it('should update the wallet state', () => {
        const newState: WalletState = {
          address: '0x5678',
          isConnected: true,
          chainId: '0x5',
        };

        wallet.updateState(newState);

        const state = wallet.getState();
        expect(state.address).toBe('0x5678');
        expect(state.isConnected).toBe(true);
        expect(state.chainId).toBe('0x5');
      });
    });

    describe('isConnected', () => {
      it('should return false when disconnected', () => {
        expect(wallet.isConnected()).toBe(false);
      });

      it('should return true when connected', async () => {
        const mockSigner = { getAddress: vi.fn().mockResolvedValue('0x1234') };
        const mockNetwork = { chainId: 1n };
        const mockProvider = {
          getSigner: vi.fn().mockResolvedValue(mockSigner),
          getNetwork: vi.fn().mockResolvedValue(mockNetwork),
        } as unknown as ethers.BrowserProvider;

        await wallet.connect(mockProvider);

        expect(wallet.isConnected()).toBe(true);
      });
    });

    describe('getAddress', () => {
      it('should return null when disconnected', () => {
        expect(wallet.getAddress()).toBeNull();
      });

      it('should return address when connected', async () => {
        const expectedAddress = '0x1234567890123456789012345678901234567890';
        const mockSigner = {
          getAddress: vi.fn().mockResolvedValue(expectedAddress),
        };
        const mockNetwork = { chainId: 1n };
        const mockProvider = {
          getSigner: vi.fn().mockResolvedValue(mockSigner),
          getNetwork: vi.fn().mockResolvedValue(mockNetwork),
        } as unknown as ethers.BrowserProvider;

        await wallet.connect(mockProvider);

        expect(wallet.getAddress()).toBe(expectedAddress);
      });
    });

    describe('getChainId', () => {
      it('should return null when disconnected', () => {
        expect(wallet.getChainId()).toBeNull();
      });

      it('should return chain ID when connected', async () => {
        const mockSigner = { getAddress: vi.fn().mockResolvedValue('0x1234') };
        const mockNetwork = { chainId: 1n };
        const mockProvider = {
          getSigner: vi.fn().mockResolvedValue(mockSigner),
          getNetwork: vi.fn().mockResolvedValue(mockNetwork),
        } as unknown as ethers.BrowserProvider;

        await wallet.connect(mockProvider);

        expect(wallet.getChainId()).toBe('0x1');
      });
    });
  });

  describe('IWalletRepository Interface', () => {
    let mockRepository: IWalletRepository;
    let mockWallet: Wallet;

    beforeEach(() => {
      mockWallet = new Wallet();
      mockRepository = {
        connect: vi.fn(),
        disconnect: vi.fn(),
        getState: vi.fn(),
        getProvider: vi.fn(),
        getWallet: vi.fn(),
      };
    });

    describe('connect', () => {
      it('should connect the wallet', async () => {
        vi.mocked(mockRepository.connect).mockResolvedValue(undefined);

        await mockRepository.connect();

        expect(mockRepository.connect).toHaveBeenCalled();
      });

      it('should throw on connection failure', async () => {
        vi.mocked(mockRepository.connect).mockRejectedValue(
          new Error('User rejected connection'),
        );

        await expect(mockRepository.connect()).rejects.toThrow(
          'User rejected connection',
        );
      });
    });

    describe('disconnect', () => {
      it('should disconnect the wallet', async () => {
        vi.mocked(mockRepository.disconnect).mockResolvedValue(undefined);

        await mockRepository.disconnect();

        expect(mockRepository.disconnect).toHaveBeenCalled();
      });
    });

    describe('getState', () => {
      it('should return current wallet state', () => {
        const expectedState: WalletState = {
          address: '0x1234567890123456789012345678901234567890',
          isConnected: true,
          chainId: '0x1',
        };

        vi.mocked(mockRepository.getState).mockReturnValue(expectedState);

        const result = mockRepository.getState();

        expect(result).toEqual(expectedState);
      });

      it('should return disconnected state', () => {
        const expectedState: WalletState = {
          address: null,
          isConnected: false,
          chainId: null,
        };

        vi.mocked(mockRepository.getState).mockReturnValue(expectedState);

        const result = mockRepository.getState();

        expect(result.isConnected).toBe(false);
      });
    });

    describe('getProvider', () => {
      it('should return provider when connected', () => {
        const mockProvider = {} as ethers.BrowserProvider;
        vi.mocked(mockRepository.getProvider).mockReturnValue(mockProvider);

        const result = mockRepository.getProvider();

        expect(result).toBe(mockProvider);
      });

      it('should return null when disconnected', () => {
        vi.mocked(mockRepository.getProvider).mockReturnValue(null);

        const result = mockRepository.getProvider();

        expect(result).toBeNull();
      });
    });

    describe('getWallet', () => {
      it('should return wallet instance', () => {
        vi.mocked(mockRepository.getWallet).mockReturnValue(mockWallet);

        const result = mockRepository.getWallet();

        expect(result).toBe(mockWallet);
      });
    });
  });
});

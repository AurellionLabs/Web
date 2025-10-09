'use client';

import { useEffect, useState } from 'react';
import { Button } from './button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { useToast } from '@/hooks/use-toast';
import { formatAddress } from '@/lib/utils';
import { ethers } from 'ethers';
import { SUPPORTED_CHAINS, NETWORK_CONFIGS } from '@/config/network';
import { useMainProvider } from '@/app/providers/main.provider';
import { useWallet } from '@/hooks/useWallet';
import {
  usePrivy,
  useWallets,
  useFundWallet,
  FundWalletConfig,
  MoonpayConfig,
  MoonpayCurrencyCode,
} from '@privy-io/react-auth';

// Copied from FundWalletButton.tsx
const erc20Abi = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

// Use viem/chains for IDs
import {
  base,
  mainnet as ethMainnet,
  arbitrum as arbMainnet,
  baseSepolia as bSepolia,
} from 'viem/chains';

const usdcContractAddresses: Record<number, string | undefined> = {
  [ethMainnet.id]: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  [base.id]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  [arbMainnet.id]: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  [bSepolia.id]: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
};

export function WalletConnection() {
  const { setIsWalletConnected } = useMainProvider();
  const { ready, authenticated } = usePrivy();
  const { fundWallet } = useFundWallet();
  const { wallets, ready: walletsReady } = useWallets();
  const { connect, disconnect, address, error, repository, isInitialized } =
    useWallet();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [currentChainId, setCurrentChainId] = useState<number>();
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Keep for general loading
  const [lastTx, setLastTx] = useState<string | null>(null);

  // State for new balances
  const [ethBalance, setEthBalance] = useState<string | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);
  const [isFetchingBalances, setIsFetchingBalances] = useState(false);

  // Initial setup and synchronization effect
  useEffect(() => {
    if (ready) {
      setIsWalletConnected(authenticated);
      if (authenticated && !address && isInitialized) {
        connect();
      }
    }
    if (authenticated && wallets?.length > 0) {
      checkConnection();
    }
  }, [
    ready,
    authenticated,
    address,
    isInitialized,
    connect,
    setIsWalletConnected,
    wallets,
  ]);

  const checkConnection = async () => {
    if (!ready || !authenticated) return;
    const wallet = wallets?.[0];
    if (!wallet) return;

    const numericChainId = parseInt(wallet.chainId.split(':')[1]);
    setCurrentChainId(numericChainId);
    setIsCorrectNetwork(SUPPORTED_CHAINS.includes(numericChainId));
  };

  useEffect(() => {
    if (authenticated && wallets?.length > 0) {
      checkConnection();
    }
  }, [authenticated, wallets]);

  // Combined useEffect for fetching balances when modal opens or dependencies change
  useEffect(() => {
    const fetchAllBalances = async () => {
      if (!isOpen || !address || !walletsReady || !wallets[0]) {
        setEthBalance(null);
        setUsdcBalance(null);
        return;
      }

      setIsFetchingBalances(true);
      try {
        const privyWallet = wallets[0];
        if (!privyWallet.getEthereumProvider) {
          console.warn(
            'getEthereumProvider is not available on the wallet object.',
          );
          setEthBalance(null);
          setUsdcBalance(null);
          return;
        }

        const eip1193Provider = await privyWallet.getEthereumProvider();
        const provider = new ethers.BrowserProvider(eip1193Provider);

        // Use currentChainId from state, which should be set by checkConnection
        const numericChainId = currentChainId;
        if (numericChainId === undefined) {
          console.warn('Chain ID not available for fetching balances.');
          setEthBalance(null);
          setUsdcBalance(null);
          return;
        }

        // Fetch ETH balance
        const rawEthBalance = await provider.getBalance(address);
        setEthBalance(ethers.formatEther(rawEthBalance));

        // Fetch USDC balance
        const usdcAddress = usdcContractAddresses[numericChainId];
        if (usdcAddress) {
          const usdcContract = new ethers.Contract(
            usdcAddress,
            erc20Abi,
            provider,
          );
          const rawUsdcBalance = await usdcContract.balanceOf(address);
          const usdcDecimals = await usdcContract.decimals();
          setUsdcBalance(ethers.formatUnits(rawUsdcBalance, usdcDecimals));
        } else {
          setUsdcBalance(null);
        }
      } catch (error) {
        console.error('Error fetching balances:', error);
        setEthBalance(null);
        setUsdcBalance(null);
      } finally {
        setIsFetchingBalances(false);
      }
    };

    if (isOpen) {
      // Only fetch when modal is open
      fetchAllBalances();
    }
  }, [isOpen, address, walletsReady, wallets, currentChainId]); // Added currentChainId

  // Removed old fetchWalletInfo as its logic is now in fetchAllBalances or separate

  const handleAccountsChanged = async () => {
    // ... (existing logic)
    if (!repository) return;
    const provider = repository.getProvider();
    if (!provider) return;

    try {
      const accounts = await provider.listAccounts();
      if (accounts.length === 0) {
        toast({
          title: 'Error',
          description: 'Wallet disconnected',
          variant: 'destructive',
        });
      } else {
        const newAddress = await accounts[0].getAddress();
        toast({
          title: 'Success',
          description: `Switched to account ${formatAddress(newAddress)}`,
        });
        // Potentially re-fetch balances or rely on address change to trigger useEffect
      }
    } catch (error) {
      console.error('Error handling account change:', error);
    }
  };

  const handleChainChanged = async () => {
    // ... (existing logic)
    if (!repository) return; // Keep this if repository is still used for other things
    // For chain changes detected via Privy's wallet object, checkConnection will handle it.
    // This handler might be for provider-emitted events if using ethers directly for listeners.
    // Let's assume checkConnection via wallets dependency is the primary way.
    checkConnection();
    // toast.success('Network switched successfully'); // This might be optimistic, checkConnection sets state
  };

  const connectWallet = async () => {
    // ... (existing logic)
    try {
      await connect();
      setIsWalletConnected(true);
      setIsOpen(true); // Open modal on successful connection
    } catch (error: any) {
      console.error('Wallet connection error:', error);
      if (error.code === 4001) {
        toast({
          title: 'Error',
          description: 'Please connect to MetaMask',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Error connecting wallet',
          variant: 'destructive',
        });
      }
      setIsWalletConnected(false);
    }
  };

  const switchNetwork = async () => {
    // ... (existing logic, ensure it uses the correct chain ID format for Privy if applicable)
    const wallet = wallets?.[0];
    if (!wallet) {
      toast({
        title: 'Error',
        description: 'No wallet connected to switch network.',
        variant: 'destructive',
      });
      return;
    }
    try {
      // Switch to the first supported chain as an example
      const targetChainId = SUPPORTED_CHAINS[0];
      const chainIdHex = `0x${targetChainId.toString(16)}` as `0x${string}`;
      await wallet.switchChain(chainIdHex);
      // checkConnection will be called due to wallets dependency update
    } catch (error: any) {
      // ... (error handling)
      toast({
        title: 'Error',
        description: 'Error switching network',
        variant: 'destructive',
      });
    }
  };

  const addNetwork = async (chainIdToAdd: number) => {
    // Renamed param to avoid conflict
    // ... (existing logic)
    const wallet = wallets?.[0];
    if (!wallet) {
      toast({
        title: 'Error',
        description: 'No wallet connected to add network.',
        variant: 'destructive',
      });
      return;
    }
    try {
      const config = NETWORK_CONFIGS[chainIdToAdd];
      if (!config) {
        throw new Error(
          `No network configuration found for chain ID ${chainIdToAdd}`,
        );
      }
      const chainIdHex = `0x${chainIdToAdd.toString(16)}` as `0x${string}`;
      await wallet.switchChain(chainIdHex); // switchChain can also add the chain if not present
      toast({ title: 'Success', description: 'Network action completed.' }); // More generic message
      // checkConnection will update network status
    } catch (error) {
      console.error('Error adding/switching network:', error);
      toast({
        title: 'Error',
        description: 'Failed to add/switch network',
        variant: 'destructive',
      });
    }
  };

  const handleButtonClick = async () => {
    if (address && wallets[0]) {
      // Check for privy wallet presence too
      setIsOpen(true);
    } else {
      await connectWallet(); // This will set isOpen(true) on success
    }
  };

  const getExplorerUrl = (chainIdParam: number | undefined, path: string) => {
    // Renamed param
    if (!chainIdParam || !NETWORK_CONFIGS[chainIdParam]) {
      return '#';
    }
    return `${NETWORK_CONFIGS[chainIdParam].blockExplorer}/${path}`;
  };

  // Copied and adapted from FundWalletButton.tsx
  const handleFundAsset = async (assetType: 'native-currency' | 'USDC') => {
    if (!address) {
      // address from useWallet()
      console.warn('Cannot fund wallet: No address available.');
      return;
    }

    let fundingChainIdForMoonpay: number;
    const connectedWallet = wallets?.[0];

    if (connectedWallet && connectedWallet.chainId) {
      const chainIdParts = connectedWallet.chainId.split(':'); // e.g., "eip155:42161"
      const parsedChainId = parseInt(chainIdParts[1]);

      // Check if parsedChainId is one of the chains we have specific MoonPay currency codes for
      if (
        parsedChainId &&
        (parsedChainId === base.id || // Base Mainnet
          parsedChainId === bSepolia.id || // Base Sepolia
          parsedChainId === ethMainnet.id || // Ethereum Mainnet
          parsedChainId === arbMainnet.id) // Arbitrum Mainnet
        // Add any other chains here for which you have explicit Moonpay currency codes
      ) {
        fundingChainIdForMoonpay = parsedChainId;
      } else {
        // If connected to a chain not explicitly handled by Moonpay config,
        // default the MoonPay configuration logic to Arbitrum.
        fundingChainIdForMoonpay = arbMainnet.id;
        if (parsedChainId) {
          console.warn(
            `[WalletConnection] Wallet connected to unhandled chain ${parsedChainId} for MoonPay. Defaulting MoonPay config to Arbitrum.`,
          );
        } else {
          console.warn(
            `[WalletConnection] Wallet chainId could not be parsed. Defaulting MoonPay config to Arbitrum.`,
          );
        }
      }
    } else {
      // No wallet connected, or chainId is not present, default MoonPay configuration logic to Arbitrum.
      fundingChainIdForMoonpay = arbMainnet.id;
      console.log(
        '[WalletConnection] No connected wallet or chainId for MoonPay. Defaulting MoonPay config to Arbitrum.',
      );
    }

    let currencyCode: MoonpayCurrencyCode | undefined = undefined;

    switch (assetType) {
      case 'native-currency':
        if (fundingChainIdForMoonpay === base.id) currencyCode = 'ETH_BASE';
        else if (fundingChainIdForMoonpay === bSepolia.id)
          currencyCode = 'ETH_ARBITRUM';
        else if (fundingChainIdForMoonpay === ethMainnet.id)
          currencyCode = 'ETH_ETHEREUM';
        else if (fundingChainIdForMoonpay === arbMainnet.id)
          currencyCode = 'ETH_ARBITRUM';
        break;
      case 'USDC':
        if (fundingChainIdForMoonpay === base.id) currencyCode = 'USDC_BASE';
        else if (fundingChainIdForMoonpay === bSepolia.id)
          currencyCode = 'USDC_ARBITRUM';
        else if (fundingChainIdForMoonpay === ethMainnet.id)
          currencyCode = 'USDC_ETHEREUM';
        else if (fundingChainIdForMoonpay === arbMainnet.id)
          currencyCode = 'USDC_ARBITRUM';
        break;
    }

    if (!currencyCode) {
      console.error(
        `Moonpay funding not configured for ${assetType} on chain ID ${fundingChainIdForMoonpay}.`,
      );
      toast({
        title: 'Error',
        description: `Funding not available for ${assetType} on this network.`,
        variant: 'destructive',
      });
      return;
    }

    const moonpayConfigDetails: MoonpayConfig = {
      currencyCode,
      quoteCurrencyAmount: 10,
    };
    const config: FundWalletConfig = {
      provider: 'moonpay',
      config: moonpayConfigDetails,
    };

    try {
      await fundWallet(address, config); // fundWallet from usePrivy
    } catch (e) {
      console.error(
        `Error initiating MoonPay for ${currencyCode} to ${address}:`,
        e,
      );
      toast({
        title: 'Error',
        description: 'Could not start funding process.',
        variant: 'destructive',
      });
    }
  };

  const renderBalanceRow = (
    assetName: string,
    balance: string | null,
    assetType: 'native-currency' | 'USDC',
    isFundable: boolean,
    isLoading: boolean,
  ) => (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm text-gray-400">{assetName}</p>
        <p className="text-lg font-semibold">
          {isLoading
            ? 'Loading...'
            : balance !== null
              ? parseFloat(balance).toFixed(4)
              : 'Error'}
        </p>
      </div>
      {isFundable && (
        <button
          onClick={() => handleFundAsset(assetType)}
          className="text-sm font-medium text-yellow-500 hover:text-yellow-400 disabled:text-gray-500 disabled:cursor-not-allowed"
          disabled={isLoading || balance === null || !walletsReady || !address}
        >
          Fund
        </button>
      )}
    </div>
  );

  return (
    <div className="relative">
      <Button
        onClick={handleButtonClick}
        variant={!isCorrectNetwork && address ? 'destructive' : 'default'}
      >
        {
          !authenticated
            ? 'Connect Wallet'
            : !isCorrectNetwork
              ? 'Wrong Network'
              : address
                ? formatAddress(address)
                : 'Connect Wallet' // Fallback if address is somehow null despite auth
        }
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Wallet Details</DialogTitle>
          </DialogHeader>
          {(isLoading || isFetchingBalances) && !address ? ( // Show main loading if no address and fetching
            <p className="text-center py-4">Loading wallet details...</p>
          ) : address ? (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground text-center pb-2">
                {/* Simplified ENS display - just show formatted address for now */}
                {formatAddress(address)}
              </div>

              {renderBalanceRow(
                'Ethereum',
                ethBalance,
                'native-currency',
                true,
                isFetchingBalances,
              )}
              {renderBalanceRow(
                'USDC',
                usdcBalance,
                'USDC',
                !!usdcContractAddresses[currentChainId || 0],
                isFetchingBalances,
              )}

              {currentChainId !== undefined &&
                !usdcContractAddresses[currentChainId] && (
                  <p className="text-xs text-center text-yellow-500 pt-1">
                    USDC is not available on the current network.
                  </p>
                )}

              <div className="pt-3 space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(address);
                    toast({
                      title: 'Success',
                      description: 'Address copied to clipboard',
                    });
                  }}
                  className="w-full"
                >
                  Copy Address
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    window.open(
                      getExplorerUrl(currentChainId, `address/${address}`),
                      '_blank',
                    )
                  }
                  className="w-full"
                  disabled={!currentChainId || !NETWORK_CONFIGS[currentChainId]}
                >
                  View on Explorer
                </Button>
              </div>

              {!isCorrectNetwork && currentChainId && (
                <Button onClick={switchNetwork} className="w-full mt-2">
                  Switch to a Supported Network
                </Button>
              )}

              <Button
                variant="destructive"
                onClick={async () => {
                  await disconnect();
                  setIsOpen(false);
                  setIsWalletConnected(false); // Explicitly set connection state
                }}
                className="w-full mt-2"
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <p className="text-center py-4">Please connect your wallet.</p> // Fallback if no address
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

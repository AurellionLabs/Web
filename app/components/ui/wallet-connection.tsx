'use client';

import { useEffect, useState } from 'react';
import { Button } from './button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { useToast } from '@/hooks/use-toast';
import { formatAddress } from '@/lib/formatters';
import { formatWeiToEther, formatErc20Balance } from '@/lib/utils';
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
import { useE2EAuth } from '@/app/providers/e2e-auth.provider';

import {
  base,
  mainnet as ethMainnet,
  arbitrum as arbMainnet,
  baseSepolia as bSepolia,
} from 'viem/chains';

const IS_E2E_TEST_MODE = process.env.NEXT_PUBLIC_E2E_TEST_MODE === 'true';

const usdcContractAddresses: Record<number, string | undefined> = {
  [ethMainnet.id]: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  [base.id]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  [arbMainnet.id]: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  [bSepolia.id]: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
};

// ---------------------------------------------------------------------------
// E2E mode — lightweight wallet display using E2EAuth, no Privy hooks
// ---------------------------------------------------------------------------
function WalletConnectionE2E() {
  const { address, isReady } = useE2EAuth();
  const { setIsWalletConnected } = useMainProvider();

  useEffect(() => {
    setIsWalletConnected(isReady && !!address);
  }, [isReady, address, setIsWalletConnected]);

  if (!isReady || !address) return null;
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/5 border border-white/10 text-sm text-white/80 font-mono">
      <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
      <span>
        {address.slice(0, 6)}…{address.slice(-4)}
      </span>
      <span className="text-xs text-amber-400 font-sans font-medium uppercase tracking-wide">
        [TEST]
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public export — build-time constant selects the right implementation
// ---------------------------------------------------------------------------
export function WalletConnection() {
  if (IS_E2E_TEST_MODE) {
    return <WalletConnectionE2E />;
  }
  return <WalletConnectionPrivy />;
}

function WalletConnectionPrivy() {
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
  const [isLoading, setIsLoading] = useState(false);
  const [lastTx, setLastTx] = useState<string | null>(null);

  const [ethBalance, setEthBalance] = useState<string | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);
  const [isFetchingBalances, setIsFetchingBalances] = useState(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, wallets]);

  useEffect(() => {
    const fetchAllBalances = async () => {
      if (!isOpen || !address || !repository) {
        setEthBalance(null);
        setUsdcBalance(null);
        return;
      }

      setIsFetchingBalances(true);
      try {
        const numericChainId = currentChainId;
        if (numericChainId === undefined) {
          console.warn('Chain ID not available for fetching balances.');
          setEthBalance(null);
          setUsdcBalance(null);
          return;
        }

        // Use repository methods instead of creating direct ethers calls
        const rawEthBalance = await repository.getEthBalance(address);
        setEthBalance(formatWeiToEther(rawEthBalance));

        const usdcAddress = usdcContractAddresses[numericChainId];
        if (usdcAddress) {
          const { balance, decimals } = await repository.getErc20Balance(
            address,
            usdcAddress,
          );
          setUsdcBalance(formatErc20Balance(balance, decimals));
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
      fetchAllBalances();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, address, walletsReady, wallets, currentChainId]); // repository excluded: stable reference from context, would cause unnecessary re-runs

  const handleAccountsChanged = async () => {
    if (!repository) return;

    try {
      const provider = await repository.getProvider();
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
      }
    } catch (error) {
      console.error('Error handling account change:', error);
    }
  };

  const handleChainChanged = async () => {
    if (!repository) return;
    checkConnection();
  };

  const connectWallet = async () => {
    try {
      await connect();
      setIsWalletConnected(true);
      setIsOpen(true);
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
      const targetChainId = SUPPORTED_CHAINS[0];
      const chainIdHex = `0x${targetChainId.toString(16)}` as `0x${string}`;
      await wallet.switchChain(chainIdHex);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Error switching network',
        variant: 'destructive',
      });
    }
  };

  const addNetwork = async (chainIdToAdd: number) => {
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
      await wallet.switchChain(chainIdHex);
      toast({ title: 'Success', description: 'Network action completed.' });
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
      setIsOpen(true);
    } else {
      await connectWallet();
    }
  };

  const getExplorerUrl = (chainIdParam: number | undefined, path: string) => {
    if (!chainIdParam || !NETWORK_CONFIGS[chainIdParam]) {
      return '#';
    }
    return `${NETWORK_CONFIGS[chainIdParam].blockExplorer}/${path}`;
  };

  const handleFundAsset = async (assetType: 'native-currency' | 'USDC') => {
    if (!address) {
      console.warn('Cannot fund wallet: No address available.');
      return;
    }

    let fundingChainIdForMoonpay: number;
    const connectedWallet = wallets?.[0];

    if (connectedWallet && connectedWallet.chainId) {
      const chainIdParts = connectedWallet.chainId.split(':');
      const parsedChainId = parseInt(chainIdParts[1]);

      if (
        parsedChainId &&
        (parsedChainId === base.id ||
          parsedChainId === bSepolia.id ||
          parsedChainId === ethMainnet.id ||
          parsedChainId === arbMainnet.id)
      ) {
        fundingChainIdForMoonpay = parsedChainId;
      } else {
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
      fundingChainIdForMoonpay = arbMainnet.id;
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
      await fundWallet(address, config);
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
    <div className="flex items-center justify-between py-3 border-b border-neutral-800 last:border-b-0">
      <div>
        <p className="text-sm text-white/80">{assetName}</p>
        <p className="text-lg font-medium text-white">
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
          className="text-sm font-medium text-amber-400 hover:text-amber-300 disabled:text-white/70 disabled:cursor-not-allowed transition-colors"
          disabled={isLoading || balance === null || !walletsReady || !address}
        >
          Fund
        </button>
      )}
    </div>
  );

  // Don't show if not authenticated
  if (!authenticated || !address) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={handleButtonClick}
        className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all duration-200 ${
          !isCorrectNetwork
            ? 'border-red-500/50 bg-red-500/10 text-red-400 hover:bg-red-500/20'
            : 'border-amber-500/50 bg-transparent text-amber-400 hover:bg-amber-500/10 hover:border-amber-400 hover:text-amber-300'
        }`}
      >
        {!isCorrectNetwork ? 'Wrong Network' : formatAddress(address)}
      </button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[400px] bg-neutral-900 border-neutral-800">
          <DialogHeader>
            <DialogTitle className="text-white">Wallet Details</DialogTitle>
          </DialogHeader>
          {(isLoading || isFetchingBalances) && !address ? (
            <p className="text-center py-4 text-white/80">
              Loading wallet details...
            </p>
          ) : address ? (
            <div className="space-y-4">
              <div className="text-sm text-white/80 text-center py-2 px-4 bg-neutral-800/50 rounded-lg font-mono">
                {formatAddress(address)}
              </div>

              <div className="space-y-1">
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
              </div>

              {currentChainId !== undefined &&
                !usdcContractAddresses[currentChainId] && (
                  <p className="text-xs text-center text-amber-400 py-2">
                    USDC is not available on the current network.
                  </p>
                )}

              <div className="pt-2 space-y-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(address);
                    toast({
                      title: 'Success',
                      description: 'Address copied to clipboard',
                    });
                  }}
                  className="w-full px-4 py-2 text-sm font-medium rounded-lg border border-neutral-700 bg-transparent text-white hover:bg-neutral-800 hover:text-white transition-all"
                >
                  Copy Address
                </button>
                <button
                  onClick={() =>
                    window.open(
                      getExplorerUrl(currentChainId, `address/${address}`),
                      '_blank',
                    )
                  }
                  disabled={!currentChainId || !NETWORK_CONFIGS[currentChainId]}
                  className="w-full px-4 py-2 text-sm font-medium rounded-lg border border-neutral-700 bg-transparent text-white hover:bg-neutral-800 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  View on Explorer
                </button>
              </div>

              {!isCorrectNetwork && currentChainId && (
                <button
                  onClick={switchNetwork}
                  className="w-full px-4 py-2 text-sm font-medium rounded-lg border border-amber-500/50 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all"
                >
                  Switch to a Supported Network
                </button>
              )}

              <button
                onClick={async () => {
                  await disconnect();
                  setIsOpen(false);
                  setIsWalletConnected(false);
                }}
                className="w-full px-4 py-2 text-sm font-medium rounded-lg border border-red-500/50 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <p className="text-center py-4 text-white/80">
              Please connect your wallet.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

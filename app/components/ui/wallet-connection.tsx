'use client';

import { useEffect, useState } from 'react';
import { Button } from './button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { toast } from 'sonner';
import { formatAddress } from '@/lib/utils';
import { ethers } from 'ethers';
import { SUPPORTED_CHAINS, NETWORK_CONFIGS } from '@/config/network';
import { useMainProvider } from '@/app/providers/main.provider';
import { useWallet } from '@/hooks/useWallet';
import { usePrivy, useWallets } from '@privy-io/react-auth';

interface WalletInfo {
  balance: string;
  ens: string | null;
}

export function WalletConnection() {
  const { setIsWalletConnected } = useMainProvider();
  const { ready, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const { connect, disconnect, address, error, repository, isInitialized } =
    useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [chainId, setChainId] = useState<number>();
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [walletInfo, setWalletInfo] = useState<WalletInfo>({
    balance: '0',
    ens: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [lastTx, setLastTx] = useState<string | null>(null);

  // Initial setup and synchronization effect
  useEffect(() => {
    // Update global wallet connection state based on Privy
    if (ready) {
      setIsWalletConnected(authenticated);

      // If authenticated via Privy, but useWallet hasn't provided an address yet,
      // and the hook is initialized, try connecting the wallet explicitly.
      // This handles cases where the user is already logged in via Privy on page load.
      if (authenticated && !address && isInitialized) {
        connect();
      }
    }
    // Check network connection status if authenticated and wallets are available
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
  ]); // Added wallets dependency

  const checkConnection = async () => {
    if (!ready || !authenticated) return;

    const wallet = wallets?.[0];
    if (!wallet) return;

    // Extract numeric chain ID from eip155:chainId format
    const numericChainId = parseInt(wallet.chainId.split(':')[1]);
    setChainId(numericChainId);

    setIsCorrectNetwork(SUPPORTED_CHAINS.includes(numericChainId));
  };

  // Check network when wallets change
  useEffect(() => {
    if (authenticated && wallets?.length > 0) {
      checkConnection();
    }
  }, [authenticated, wallets]);

  // Check network when authenticated changes
  useEffect(() => {
    if (authenticated && wallets?.length > 0) {
      checkConnection();
    }
  }, [authenticated, wallets]);

  useEffect(() => {
    if (!isOpen || !address || !repository) return;
    const provider = repository.getProvider();
    if (!provider) return;

    fetchWalletInfo(address);
  }, [isOpen, address, repository]);

  const handleAccountsChanged = async () => {
    if (!repository) return;
    const provider = repository.getProvider();
    if (!provider) return;

    try {
      const accounts = await provider.listAccounts();
      if (accounts.length === 0) {
        // User disconnected
        toast.error('Wallet disconnected');
      } else {
        // Account changed
        const address = await accounts[0].getAddress();
        toast.success(`Switched to account ${formatAddress(address)}`);
      }
    } catch (error) {
      console.error('Error handling account change:', error);
    }
  };

  const handleChainChanged = async () => {
    if (!repository) return;
    const provider = repository.getProvider();
    if (!provider) return;

    try {
      const network = await provider.getNetwork();
      const numericChainId = Number(network.chainId);
      setChainId(numericChainId);
      setIsCorrectNetwork(SUPPORTED_CHAINS.includes(numericChainId));

      if (!SUPPORTED_CHAINS.includes(numericChainId)) {
        toast.error('Please switch to a supported network');
      } else {
        toast.success('Network switched successfully');
      }
    } catch (error) {
      console.error('Error handling chain change:', error);
    }
  };

  const connectWallet = async () => {
    try {
      await connect();
      setIsWalletConnected(true);
      setIsOpen(true);
    } catch (error: any) {
      console.error('Wallet connection error:', error);
      if (error.code === 4001) {
        toast.error('Please connect to MetaMask');
      } else {
        toast.error('Error connecting wallet');
      }
      setIsWalletConnected(false);
    }
  };

  const switchNetwork = async () => {
    if (!repository) return;
    const provider = repository.getProvider();
    if (!provider) return;

    try {
      await provider.send('wallet_switchEthereumChain', [
        { chainId: `0x${SUPPORTED_CHAINS[0].toString(16)}` },
      ]);
    } catch (error: any) {
      if (error.code === 4902) {
        // Chain not added, prompt to add it
        toast.error('Please add the network to your wallet');
      } else {
        toast.error('Error switching network');
      }
    }
  };

  const fetchWalletInfo = async (address: string) => {
    if (!repository) return;
    const provider = repository.getProvider();
    if (!provider) return;

    setIsLoading(true);
    try {
      const balance = await provider.getBalance(address);
      const formattedBalance = ethers.formatEther(balance);

      // Try to get ENS name if on mainnet
      let ens = null;
      if (chainId === 1) {
        ens = await provider.lookupAddress(address);
      }

      setWalletInfo({ balance: formattedBalance, ens });
    } catch (error) {
      console.error('Error fetching wallet info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addNetwork = async (chainId: number) => {
    try {
      const config = NETWORK_CONFIGS[chainId];
      if (!config) {
        throw new Error(
          `No network configuration found for chain ID ${chainId}`,
        );
      }

      const wallet = wallets?.[0];
      if (!wallet) {
        throw new Error('No wallet available');
      }

      // Convert to hex string for Privy's switchChain
      const chainIdHex = `0x${chainId.toString(16)}` as `0x${string}`;
      await wallet.switchChain(chainIdHex);
      toast.success('Network switched successfully');
      checkConnection();
    } catch (error) {
      console.error('Error switching network:', error);
      toast.error('Failed to switch network');
    }
  };

  const handleButtonClick = async () => {
    if (address) {
      setIsOpen(true);
    } else {
      await connectWallet();
    }
  };

  // Update getExplorerUrl to work with numeric chainId
  const getExplorerUrl = (chainId: number | undefined, path: string) => {
    if (!chainId || !NETWORK_CONFIGS[chainId]) {
      return '#'; // Return fallback URL if chain not supported
    }
    return `${NETWORK_CONFIGS[chainId].blockExplorer}/${path}`;
  };

  return (
    <div className="relative">
      <Button
        onClick={handleButtonClick}
        variant={!isCorrectNetwork && address ? 'destructive' : 'default'}
      >
        {!authenticated
          ? 'Connect Wallet'
          : !isCorrectNetwork
            ? 'Wrong Network'
            : address
              ? formatAddress(address)
              : 'Connect Wallet'}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Wallet Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Account</span>
              <div className="text-right">
                {address && (
                  <>
                    <span className="font-mono">{formatAddress(address)}</span>
                    {walletInfo.ens && (
                      <div className="text-sm text-gray-500">
                        {walletInfo.ens}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span>Balance</span>
              <span>
                {isLoading
                  ? 'Loading...'
                  : `${Number(walletInfo.balance).toFixed(4)} ETH`}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span>Network</span>
              <div className="flex items-center gap-2">
                <span
                  className={
                    !isCorrectNetwork ? 'text-red-500' : 'text-green-500'
                  }
                >
                  {chainId
                    ? NETWORK_CONFIGS[chainId]?.name || chainId
                    : 'Not Connected'}
                </span>
                {!isCorrectNetwork && chainId && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addNetwork(chainId)}
                  >
                    Add Network
                  </Button>
                )}
              </div>
            </div>

            {lastTx && (
              <div className="pt-4 border-t">
                <div className="text-sm text-gray-500">Last Transaction</div>
                <a
                  href={getExplorerUrl(chainId, `tx/${lastTx}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline text-sm"
                >
                  View on Explorer
                </a>
              </div>
            )}

            <div className="flex gap-2">
              {address && (
                <>
                  <Button
                    onClick={() => navigator.clipboard.writeText(address)}
                    variant="outline"
                    className="flex-1"
                  >
                    Copy Address
                  </Button>
                  <Button
                    onClick={() =>
                      window.open(getExplorerUrl(chainId, `address/${address}`))
                    }
                    variant="outline"
                    className="flex-1"
                  >
                    View on Explorer
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

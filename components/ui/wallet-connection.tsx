'use client';

import { useEffect, useState } from 'react';
import { Button } from './button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatAddress } from '@/lib/utils';
import { ethers } from 'ethers';
import { SUPPORTED_CHAINS, NETWORK_CONFIGS } from '@/config/network';
import { useMainProvider } from '@/app/providers/main.provider';
import { initializeProvider } from '@/dapp-connectors/base-controller';
import { usePrivy } from '@privy-io/react-auth';

interface WalletInfo {
  balance: string;
  ens: string | null;
}

export function WalletConnection() {
  const { isWalletConnected, setIsWalletConnected } = useMainProvider();
  const { authenticated, user, logout } = usePrivy();
  const [isOpen, setIsOpen] = useState(false);
  const [account, setAccount] = useState<string>('');
  const [chainId, setChainId] = useState<number>();
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [walletInfo, setWalletInfo] = useState<WalletInfo>({
    balance: '0',
    ens: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [lastTx, setLastTx] = useState<string | null>(null);

  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          // Get current chain
          const chainIdHex = await window.ethereum.request({
            method: 'eth_chainId',
          });
          const currentChainId = parseInt(chainIdHex, 16);
          setChainId(currentChainId);
          setIsCorrectNetwork(SUPPORTED_CHAINS.includes(currentChainId));

          // Get current account
          const accounts = await window.ethereum.request({
            method: 'eth_accounts',
          });
          if (accounts.length > 0) {
            setAccount(accounts[0]);
          }
        } catch (error) {
          console.error('Error checking connection:', error);
        }
      }
    };

    checkConnection();

    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener(
          'accountsChanged',
          handleAccountsChanged,
        );
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

  useEffect(() => {
    if (isOpen && account) {
      fetchWalletInfo(account);
    }
  }, [isOpen, account]);

  useEffect(() => {
    if (authenticated && user?.wallet?.address) {
      setAccount(user.wallet.address);
      fetchWalletInfo(user.wallet.address);
    }
  }, [authenticated, user]);

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      // User disconnected
      setAccount('');
      toast.error('Wallet disconnected');
    } else {
      // Account changed
      setAccount(accounts[0]);
      toast.success(`Switched to account ${formatAddress(accounts[0])}`);
    }
  };

  const handleChainChanged = (chainIdHex: string) => {
    const newChainId = parseInt(chainIdHex, 16);
    setChainId(newChainId);
    setIsCorrectNetwork(SUPPORTED_CHAINS.includes(newChainId));

    if (!SUPPORTED_CHAINS.includes(newChainId)) {
      toast.error('Please switch to a supported network');
    } else {
      toast.success('Network switched successfully');
    }

    // Reload the page to refresh providers
    window.location.reload();
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      toast.error('Please install MetaMask');
      return;
    }

    try {
      const { provider, signer } = await initializeProvider();
      if (!signer) throw new Error('Failed to get signer');

      const address = await signer.getAddress();
      setAccount(address);
      setIsWalletConnected(true);

      // Fetch initial chain info
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);
      setChainId(chainId);
      setIsCorrectNetwork(SUPPORTED_CHAINS.includes(chainId));

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

  const disconnectWallet = async () => {
    try {
      if (authenticated) {
        await logout();
      }
      setAccount('');
      setIsWalletConnected(false);
      setIsOpen(false);
      toast.success('Wallet disconnected');
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      toast.error('Error disconnecting wallet');
    }
  };

  const switchNetwork = async () => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${SUPPORTED_CHAINS[0].toString(16)}` }],
      });
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
    if (!window.ethereum) return;

    setIsLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
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
    if (!window?.ethereum) {
      toast.error('Please install MetaMask');
      return;
    }

    const config = NETWORK_CONFIGS[chainId];
    if (!config) return;

    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: `0x${chainId.toString(16)}`,
            chainName: config.name,
            nativeCurrency: config.currency,
            rpcUrls: [config.rpcUrl],
            blockExplorerUrls: [config.blockExplorer],
          },
        ],
      });
    } catch (error: any) {
      toast.error('Failed to add network');
    }
  };

  const handleButtonClick = async () => {
    console.log('Button clicked, account:', account);
    if (account || (authenticated && user?.wallet?.address)) {
      console.log('Opening modal');
      setIsOpen(true);
    } else {
      console.log('Connecting wallet');
      await connectWallet();
    }
  };

  useEffect(() => {
    console.log('Modal open state:', isOpen);
  }, [isOpen]);

  // Add null check and default values for the explorer URLs
  const getExplorerUrl = (chainId: number | undefined, path: string) => {
    if (!chainId || !NETWORK_CONFIGS[chainId]) {
      return '#'; // Return fallback URL if chain not supported
    }
    return `${NETWORK_CONFIGS[chainId].blockExplorer}/${path}`;
  };

  // Get wallet type (Privy or Web3)
  const getWalletType = () => {
    if (authenticated && user?.wallet) {
      return user.wallet.walletClientType || 'Privy';
    }
    return 'Web3';
  };

  // Get a shortened version of the wallet address
  const getDisplayAddress = () => {
    if (authenticated && user?.wallet?.address) {
      return formatAddress(user.wallet.address);
    }
    if (account) {
      return formatAddress(account);
    }
    return 'Connect Wallet';
  };

  return (
    <div className="relative">
      <Button
        onClick={handleButtonClick}
        variant={!isCorrectNetwork && account ? 'destructive' : 'default'}
      >
        {!account && !authenticated
          ? 'Connect Wallet'
          : !isCorrectNetwork
            ? 'Wrong Network'
            : getDisplayAddress()}
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
                <span className="font-mono">{getDisplayAddress()}</span>
                {walletInfo.ens && (
                  <div className="text-sm text-gray-500">{walletInfo.ens}</div>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span>Wallet Type</span>
              <span>{getWalletType()}</span>
            </div>

            <div className="flex justify-between items-center">
              <span>Balance</span>
              <span>
                {isLoading
                  ? 'Loading...'
                  : `${parseFloat(walletInfo.balance).toFixed(4)} ETH`}
              </span>
            </div>

            {chainId && (
              <div className="flex justify-between items-center">
                <span>Network</span>
                <span
                  className={
                    isCorrectNetwork ? 'text-green-500' : 'text-red-500'
                  }
                >
                  {NETWORK_CONFIGS[chainId]?.name || `Unknown (${chainId})`}
                </span>
              </div>
            )}

            {!isCorrectNetwork && (
              <Button
                variant="outline"
                className="w-full"
                onClick={switchNetwork}
              >
                Switch to Supported Network
              </Button>
            )}

            {lastTx && (
              <div className="pt-2 border-t border-gray-700">
                <div className="text-sm text-gray-400 mb-1">
                  Last Transaction
                </div>
                <a
                  href={getExplorerUrl(chainId, `tx/${lastTx}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-sm break-all"
                >
                  {lastTx}
                </a>
              </div>
            )}

            <div className="pt-4 flex justify-end">
              <Button variant="destructive" onClick={disconnectWallet}>
                Disconnect Wallet
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

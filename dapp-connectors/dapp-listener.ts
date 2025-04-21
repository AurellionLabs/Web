import { BrowserProvider, Contract } from 'ethers';
import { NEXT_PUBLIC_AUSYS_ADDRESS } from '@/chain-constants';
import { AUSYS_ABI } from '@/lib/constants/contracts';
import { getWalletAddress } from './base-controller';

export type SignatureListenerOptions = {
  timeout?: number;
  onSignature?: (user: string, id: string) => void;
  onTimeout?: () => void;
  onError?: (error: Error) => void;
};

export async function setupSignatureListener(
  options: SignatureListenerOptions = {},
) {
  const {
    timeout = 5 * 60 * 1000, // 5 minutes default
    onSignature,
    onTimeout,
    onError,
  } = options;

  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('Ethereum provider not found');
  }

  try {
    const provider = new BrowserProvider(window.ethereum as any);
    const contract = new Contract(
      NEXT_PUBLIC_AUSYS_ADDRESS,
      AUSYS_ABI,
      provider,
    );
    const filter = contract.filters.emitSig();

    const handleSignatureEvent = async (user: string, id: string) => {
      const customerAddress = getWalletAddress();
      if (user.toLowerCase() !== customerAddress.toLowerCase()) {
        onSignature?.(user, id);
      }
    };

    contract.on(filter, handleSignatureEvent);

    // Set up timeout
    const timeoutId = setTimeout(() => {
      contract.off(filter, handleSignatureEvent);
      onTimeout?.();
    }, timeout);

    // Return cleanup function
    return () => {
      contract.off(filter, handleSignatureEvent);
      clearTimeout(timeoutId);
    };
  } catch (error) {
    console.error('Error setting up event listener:', error);
    onError?.(error instanceof Error ? error : new Error('Unknown error'));
    throw error;
  }
}

// Legacy function for backward compatibility
export async function listenForSignature(jobID: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    let cleanup: (() => void) | undefined;

    setupSignatureListener({
      onSignature: (user, id) => {
        if (id === jobID) {
          cleanup?.();
          resolve(true);
        }
      },
      onTimeout: () => {
        reject(
          new Error(
            'Timeout: No signature detected within the specified time.',
          ),
        );
      },
      onError: (error) => {
        reject(error);
      },
    })
      .then((cleanupFn) => {
        cleanup = cleanupFn;
      })
      .catch(reject);
  });
}

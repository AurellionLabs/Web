import { useState, useEffect } from 'react';
import { ethers, BrowserProvider } from 'ethers';
import { useWallet } from '@/hooks/useWallet';
import { handleContractError } from '@/utils/error-handler';
import {
  AurumNodeManager__factory,
  AuraGoatRed__factory,
  type AurumNodeManager,
  type AuraGoatRed,
} from '@/lib/contracts';
import {
  NEXT_PUBLIC_AURUM_NODE_MANAGER_ADDRESS,
  NEXT_PUBLIC_AURA_GOAT_ADDRESS,
} from '@/chain-constants';

/**
 * Contract context for managing blockchain contract instances
 */
export class ContractContext {
  private static instance: ContractContext;
  private provider: BrowserProvider | null = null;
  private signer: ethers.VoidSigner | null = null;
  private aurumNodeManager: AurumNodeManager | null = null;
  private auraGoat: AuraGoatRed | null = null;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): ContractContext {
    if (!ContractContext.instance) {
      ContractContext.instance = new ContractContext();
    }
    return ContractContext.instance;
  }

  public initialize(provider: BrowserProvider) {
    this.provider = provider;
    this.signer = new ethers.VoidSigner(ethers.ZeroAddress, provider);

    // Connect using imported constants
    this.aurumNodeManager = AurumNodeManager__factory.connect(
      NEXT_PUBLIC_AURUM_NODE_MANAGER_ADDRESS,
      this.signer,
    );
    this.auraGoat = AuraGoatRed__factory.connect(
      NEXT_PUBLIC_AURA_GOAT_ADDRESS,
      this.signer,
    );
    // Add connection logic for AURUM_NODE if needed

    this.isInitialized = true;
  }

  public getAurumNodeManagerContract(): AurumNodeManager | null {
    return this.aurumNodeManager;
  }

  public getAuraGoatContract(): AuraGoatRed | null {
    return this.auraGoat;
  }
}

export function useContractContext() {
  const wallet = useWallet();
  const [contractContext] = useState(() => ContractContext.getInstance());

  useEffect(() => {
    // Provider comes from wallet context if available
    const provider = (wallet as any)?.provider;
    if (provider) {
      contractContext.initialize(provider);
    }
  }, [wallet, contractContext]);

  return contractContext;
}

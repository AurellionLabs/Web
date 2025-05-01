import { ethers, BrowserProvider } from 'ethers';
import { useWallet } from '@/hooks/useWallet';
import { handleContractError } from '@/utils/error-handler';
import {
  AurumNodeManager__factory,
  AurumNodeManager,
  AuraGoat__factory,
  AuraGoat,
} from '@/typechain-types';
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
  private auraGoat: AuraGoat | null = null;
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
    this.auraGoat = AuraGoat__factory.connect(
      NEXT_PUBLIC_AURA_GOAT_ADDRESS,
      this.signer,
    );
    // Add connection logic for AURUM_NODE if needed

    this.isInitialized = true;
  }

  public getAurumNodeManagerContract(): AurumNodeManager | null {
    return this.aurumNodeManager;
  }

  public getAuraGoatContract(): AuraGoat | null {
    return this.auraGoat;
  }
}

export function useContractContext() {
  const { provider } = useWallet();
  const [contractContext] = useState(() => ContractContext.getInstance());

  useEffect(() => {
    if (provider) {
      contractContext.initialize(provider);
    }
  }, [provider]);

  return contractContext;
}

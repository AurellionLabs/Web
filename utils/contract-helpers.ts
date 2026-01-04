import {
  AurumNodeManager__factory,
  type AurumNodeManager,
} from '@/lib/contracts';
import { NEXT_PUBLIC_AURUM_NODE_MANAGER_ADDRESS } from '@/chain-constants';
import { ethers } from 'ethers';

export async function getAurumContract(
  provider: any,
): Promise<AurumNodeManager> {
  if (!NEXT_PUBLIC_AURUM_NODE_MANAGER_ADDRESS) {
    throw new Error('AURUM_NODE_MANAGER_ADDRESS is not defined');
  }

  // Create a Web3Provider from the provider
  const web3Provider = new ethers.BrowserProvider(provider);

  // Get the signer
  const signer = await web3Provider.getSigner();

  // Connect to the contract
  const contract = AurumNodeManager__factory.connect(
    NEXT_PUBLIC_AURUM_NODE_MANAGER_ADDRESS,
    signer,
  );

  return contract;
}

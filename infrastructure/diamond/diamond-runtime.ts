import { Contract, Provider, Signer } from 'ethers';

import { getDiamondContext } from './diamond-context';

export function getDiamondContract(): Contract {
  return getDiamondContext().getDiamond();
}

export function getDiamondSigner(): Signer {
  return getDiamondContext().getSigner();
}

export function getDiamondProvider(): Provider {
  return getDiamondContext().getProvider();
}

export async function getDiamondSignerAddress(): Promise<string> {
  return getDiamondContext().getSignerAddress();
}

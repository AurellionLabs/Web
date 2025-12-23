import { ethers } from 'hardhat';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import * as dotenv from 'dotenv';

// Import the constants directly
import {
  NEXT_PUBLIC_AUSYS_ADDRESS,
  NEXT_PUBLIC_AURUM_NODE_MANAGER_ADDRESS,
} from '../chain-constants';

dotenv.config();

async function main() {
  try {
    // Get signers
    const [deployer]: HardhatEthersSigner[] = await ethers.getSigners();
    console.log('Setting NodeManager with account:', deployer.address);

    // Get AuSys contract instance
    console.log(
      `Connecting to AuSys contract at ${NEXT_PUBLIC_AUSYS_ADDRESS}...`,
    );
    const auSys = await ethers.getContractAt(
      'locationContract',
      NEXT_PUBLIC_AUSYS_ADDRESS,
    );

    // Set NodeManager in AuSys contract
    console.log(
      `Setting NodeManager (${NEXT_PUBLIC_AURUM_NODE_MANAGER_ADDRESS}) in AuSys contract...`,
    );
    const tx = await auSys.setNodeManager(
      NEXT_PUBLIC_AURUM_NODE_MANAGER_ADDRESS,
    );

    // Wait for transaction to be mined
    console.log(`Transaction sent: ${tx.hash}`);
    await tx.wait();
    console.log('NodeManager set successfully in AuSys contract');
  } catch (error) {
    console.error('Error setting NodeManager:', error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

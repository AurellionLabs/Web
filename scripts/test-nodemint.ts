import { ethers } from 'hardhat';
import {
  NEXT_PUBLIC_AURA_ASSET_ADDRESS,
  NEXT_PUBLIC_DIAMOND_ADDRESS,
} from '../chain-constants';

async function main() {
  console.log('Testing nodeMint call...\n');

  const [signer] = await ethers.getSigners();
  console.log('Signer:', signer.address);

  const auraAsset = await ethers.getContractAt(
    'AuraAsset',
    NEXT_PUBLIC_AURA_ASSET_ADDRESS,
  );
  console.log('AuraAsset address:', await auraAsset.getAddress());

  // Check NodeManager configuration
  console.log('\n=== Checking NodeManager Configuration ===');
  try {
    const nodeManagerAddr = await auraAsset.NodeManager();
    console.log('NodeManager address:', nodeManagerAddr);
    console.log('Diamond address:', NEXT_PUBLIC_DIAMOND_ADDRESS);
    console.log(
      'NodeManager === Diamond:',
      nodeManagerAddr.toLowerCase() ===
        NEXT_PUBLIC_DIAMOND_ADDRESS.toLowerCase(),
    );

    // Check if Diamond returns valid node status for itself
    const diamond = await ethers.getContractAt(
      ['function getNodeStatus(address) external view returns (bytes1)'],
      NEXT_PUBLIC_DIAMOND_ADDRESS,
    );
    const nodeStatus = await diamond.getNodeStatus(NEXT_PUBLIC_DIAMOND_ADDRESS);
    console.log('Diamond getNodeStatus(Diamond):', nodeStatus);
    console.log('Is valid node (0x01):', nodeStatus === '0x01');
  } catch (e: any) {
    console.error('Error checking NodeManager:', e.message);
  }

  // Check if GOAT class is active
  console.log('\n=== Checking Class Status ===');
  try {
    const classKey = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(['string'], ['GOAT']),
    );
    const isActive = await auraAsset.isClassActive(classKey);
    console.log('GOAT class hash:', classKey);
    console.log('GOAT class active:', isActive);
  } catch (e: any) {
    console.error('Error checking class:', e.message);
  }

  const contractAsset = {
    name: 'AUGOAT',
    assetClass: 'GOAT',
    attributes: [
      { name: 'Weight', values: ['M'], description: '' },
      { name: 'Sex', values: ['M'], description: '' },
    ],
  };

  console.log('\n=== Calling nodeMint ===');
  console.log('  account (Diamond):', NEXT_PUBLIC_DIAMOND_ADDRESS);
  console.log('  asset:', JSON.stringify(contractAsset, null, 2));
  console.log('  amount:', 1);
  console.log('  className:', 'GOAT');
  console.log('  data:', '0x');

  try {
    // First try to estimate gas
    console.log('\nEstimating gas...');
    const gasEstimate = await auraAsset.nodeMint.estimateGas(
      NEXT_PUBLIC_DIAMOND_ADDRESS,
      contractAsset,
      1,
      'GOAT',
      '0x',
    );
    console.log('Gas estimate:', gasEstimate.toString());

    // Then try to call
    console.log('\nSending transaction...');
    const tx = await auraAsset.nodeMint(
      NEXT_PUBLIC_DIAMOND_ADDRESS,
      contractAsset,
      1,
      'GOAT',
      '0x',
    );
    console.log('Transaction hash:', tx.hash);
    const receipt = await tx.wait();
    console.log('Transaction confirmed in block:', receipt?.blockNumber);
  } catch (e: any) {
    console.error('\nError:', e.message);
    if (e.data) {
      console.error('Error data:', e.data);
    }
    if (e.reason) {
      console.error('Reason:', e.reason);
    }
    // Try to decode the error
    if (e.transaction) {
      console.error('Transaction to:', e.transaction.to);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

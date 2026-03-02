import { ethers } from 'hardhat';
import { NEXT_PUBLIC_DIAMOND_ADDRESS } from '../chain-constants';

async function main() {
  console.log('Testing getNodeStatus directly...\n');

  const [signer] = await ethers.getSigners();
  console.log('Signer:', signer.address);
  console.log('Diamond address:', NEXT_PUBLIC_DIAMOND_ADDRESS);

  // Create a contract instance with just getNodeStatus
  const diamond = new ethers.Contract(
    NEXT_PUBLIC_DIAMOND_ADDRESS,
    ['function getNodeStatus(address) external view returns (bytes1)'],
    signer,
  );

  try {
    console.log('\n=== Calling getNodeStatus(Diamond) ===');
    const status = await diamond.getNodeStatus(NEXT_PUBLIC_DIAMOND_ADDRESS);
    console.log('Result:', status);
    console.log('Is valid (0x01):', status === '0x01');
  } catch (e: any) {
    console.log('Error calling getNodeStatus:', e.message);
    if (e.data) {
      console.log('Error data:', e.data);
    }
  }

  // Now let's check what AuraAsset's NodeManager is set to
  console.log('\n=== Checking AuraAsset.NodeManager ===');
  const auraAsset = await ethers.getContractAt(
    'AuraAsset',
    '0x1235E39477752713902bCE541Fc02ADeb6FF465b',
  );

  try {
    // AuraAsset has NodeManager as a public variable
    const nodeManager = await auraAsset.NodeManager();
    console.log('AuraAsset.NodeManager:', nodeManager);
    console.log(
      'Matches Diamond:',
      nodeManager.toLowerCase() === NEXT_PUBLIC_DIAMOND_ADDRESS.toLowerCase(),
    );
  } catch (e: any) {
    console.log('Error getting NodeManager:', e.message);
  }

  // Let's also check if there's a different function being called
  // by looking at the AuraAsset interface
  console.log('\n=== AuraAsset Interface Check ===');
  const auraAssetArtifact = await ethers.getContractFactory('AuraAsset');
  const iface = auraAssetArtifact.interface;

  // Check the validNode modifier - it calls NodeManager.getNodeStatus
  console.log('AuraAsset functions:');
  for (const frag of iface.fragments) {
    if (frag.type === 'function') {
      console.log(`  ${frag.name}`);
    }
  }

  // Let's trace what happens when nodeMint is called
  console.log('\n=== Simulating nodeMint call trace ===');

  // The validNode modifier in AuraAsset calls:
  // require(bytes1(NodeManager.getNodeStatus(node)) == bytes1(uint8(1)));

  // Let's manually encode what AuraAsset would call
  const nodeManagerInterface = new ethers.Interface([
    'function getNodeStatus(address) external view returns (bytes1)',
  ]);

  const calldata = nodeManagerInterface.encodeFunctionData('getNodeStatus', [
    NEXT_PUBLIC_DIAMOND_ADDRESS,
  ]);
  console.log('getNodeStatus calldata:', calldata);
  console.log('Selector:', calldata.slice(0, 10));

  // Try a raw call
  console.log('\n=== Raw eth_call to Diamond ===');
  try {
    const result = await signer.call({
      to: NEXT_PUBLIC_DIAMOND_ADDRESS,
      data: calldata,
    });
    console.log('Raw call result:', result);
  } catch (e: any) {
    console.log('Raw call error:', e.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

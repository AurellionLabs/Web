import { ethers } from 'hardhat';
import { NEXT_PUBLIC_DIAMOND_ADDRESS } from '../chain-constants';

async function main() {
  console.log('Testing mint to node owner wallet...\n');

  const [signer] = await ethers.getSigners();
  console.log('Signer (node owner):', signer.address);
  console.log('Diamond address:', NEXT_PUBLIC_DIAMOND_ADDRESS);

  // Get AuraAsset address
  const auraAssetAddress = '0x1235E39477752713902bCE541Fc02ADeb6FF465b';
  const auraAsset = await ethers.getContractAt('AuraAsset', auraAssetAddress);

  // Get Diamond contract
  const diamond = new ethers.Contract(
    NEXT_PUBLIC_DIAMOND_ADDRESS,
    [
      'function getNodeStatus(address) external view returns (bytes1)',
      'function getOwnerNodes(address) external view returns (bytes32[])',
      'function getNode(bytes32) external view returns (address owner, string nodeType, uint256 capacity, uint256 createdAt, bool active, bool validNode, bytes32 assetHash, string addressName, string lat, string lng)',
    ],
    signer,
  );

  // Step 1: Check if signer is a valid node owner
  console.log('\n=== Step 1: Verify Node Owner Status ===');
  const nodeStatus = await diamond.getNodeStatus(signer.address);
  console.log(`getNodeStatus(${signer.address}): ${nodeStatus}`);

  if (nodeStatus !== '0x01') {
    console.log(
      '❌ Signer is not a valid node owner. Cannot proceed with mint.',
    );
    console.log('Please register a node first.');
    return;
  }
  console.log('✓ Signer is a valid node owner');

  // Get signer's nodes
  const ownerNodes = await diamond.getOwnerNodes(signer.address);
  console.log(`Owner has ${ownerNodes.length} nodes:`, ownerNodes);

  // Step 2: Check GOAT class is active
  console.log('\n=== Step 2: Verify GOAT Class ===');
  const classHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(['string'], ['GOAT']),
  );
  const isActive = await auraAsset.isClassActive(classHash);
  console.log(`GOAT class active: ${isActive}`);

  if (!isActive) {
    console.log('❌ GOAT class is not active. Cannot mint.');
    return;
  }

  // Step 3: Check signer's current balance
  console.log('\n=== Step 3: Check Current Balance ===');
  const asset = {
    name: 'AUGOAT-OWNER-TEST',
    assetClass: 'GOAT',
    attributes: [
      { name: 'Weight', values: ['M'], description: '' },
      { name: 'Sex', values: ['M'], description: '' },
    ],
  };

  // Compute tokenId
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const encodedAsset = abiCoder.encode(
    [
      'tuple(string name,string assetClass,tuple(string name,string[] values,string description)[] attributes)',
    ],
    [asset],
  );
  const tokenId = BigInt(ethers.keccak256(encodedAsset));
  console.log('TokenId:', tokenId.toString());

  const balanceBefore = await auraAsset.balanceOf(signer.address, tokenId);
  console.log(`Balance before mint: ${balanceBefore}`);

  // Step 4: Mint tokens to signer's wallet
  console.log('\n=== Step 4: Mint to Node Owner Wallet ===');
  console.log('Calling nodeMint with:');
  console.log('  account:', signer.address);
  console.log('  asset:', JSON.stringify(asset, null, 2));
  console.log('  amount: 5');
  console.log('  className: GOAT');

  try {
    const gasEstimate = await auraAsset.nodeMint.estimateGas(
      signer.address,
      asset,
      5,
      'GOAT',
      '0x',
    );
    console.log('Gas estimate:', gasEstimate.toString());

    const tx = await auraAsset.nodeMint(signer.address, asset, 5, 'GOAT', '0x');
    console.log('Transaction hash:', tx.hash);

    const receipt = await tx.wait();
    console.log('Transaction confirmed in block:', receipt?.blockNumber);

    // Step 5: Verify balance
    console.log('\n=== Step 5: Verify Balance ===');
    const balanceAfter = await auraAsset.balanceOf(signer.address, tokenId);
    console.log(`Balance after mint: ${balanceAfter}`);
    console.log(
      `Tokens minted: ${BigInt(balanceAfter) - BigInt(balanceBefore)}`,
    );

    if (BigInt(balanceAfter) > BigInt(balanceBefore)) {
      console.log('\n✅ SUCCESS! Tokens minted directly to node owner wallet!');
    } else {
      console.log('\n❌ Balance did not increase');
    }

    // Step 6: Check custody info
    console.log('\n=== Step 6: Check Custody Info ===');
    const custodyAmount = await auraAsset.getCustodyInfo(
      tokenId,
      signer.address,
    );
    console.log('Custody amount for signer:', custodyAmount.toString());
    const totalCustody = await auraAsset.getTotalCustodyAmount(tokenId);
    console.log('Total custody amount:', totalCustody.toString());
  } catch (e: any) {
    console.log('❌ Mint failed:', e.message);
    if (e.data) {
      console.log('Error data:', e.data);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

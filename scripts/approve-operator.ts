/**
 * Script to approve an operator for RWY pool creation
 *
 * Usage: npx hardhat run scripts/approve-operator.ts --network baseSepolia
 */

import { ethers } from 'hardhat';
import { NEXT_PUBLIC_DIAMOND_ADDRESS } from '../chain-constants';

const OPERATOR_FACET_ABI = [
  'function approveOperator(address operator) external',
  'function isApprovedOperator(address operator) view returns (bool)',
  'function getOperatorStats(address operator) view returns (bool approved, uint256 reputation, uint256 successfulOps, uint256 totalValueProcessed)',
];

async function main() {
  const [signer] = await ethers.getSigners();
  const signerAddress = await signer.getAddress();

  console.log('🔧 Approve Operator Script\n');
  console.log(`Diamond Address: ${NEXT_PUBLIC_DIAMOND_ADDRESS}`);
  console.log(`Signer (deployer): ${signerAddress}`);
  console.log(`Operator to approve: ${signerAddress}`);
  console.log('');

  // Connect to the Diamond with OperatorFacet ABI
  const operatorFacet = new ethers.Contract(
    NEXT_PUBLIC_DIAMOND_ADDRESS,
    OPERATOR_FACET_ABI,
    signer,
  );

  // Check current approval status
  console.log('📋 Checking current operator status...');
  try {
    const isApproved = await operatorFacet.isApprovedOperator(signerAddress);
    console.log(`   Currently approved: ${isApproved}`);

    if (isApproved) {
      console.log('\n✅ Operator is already approved! No action needed.');

      // Get full stats
      const stats = await operatorFacet.getOperatorStats(signerAddress);
      console.log('\n📊 Operator Stats:');
      console.log(`   Approved: ${stats.approved}`);
      console.log(`   Reputation: ${stats.reputation}`);
      console.log(`   Successful Ops: ${stats.successfulOps}`);
      console.log(`   Total Value Processed: ${stats.totalValueProcessed}`);
      return;
    }
  } catch (error: any) {
    console.log(`   Error checking status: ${error.message}`);
  }

  // Approve the operator
  console.log('\n⚙️  Approving operator...');
  try {
    const tx = await operatorFacet.approveOperator(signerAddress);
    console.log(`   Transaction hash: ${tx.hash}`);
    console.log('   Waiting for confirmation...');

    const receipt = await tx.wait();
    console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`);

    // Verify approval
    console.log('\n🔍 Verifying approval...');
    const isApprovedNow = await operatorFacet.isApprovedOperator(signerAddress);
    console.log(`   Is approved: ${isApprovedNow}`);

    if (isApprovedNow) {
      console.log('\n🎉 Success! Operator is now approved to create pools.');
    } else {
      console.log(
        '\n❌ Warning: Approval transaction succeeded but operator is not showing as approved.',
      );
    }
  } catch (error: any) {
    console.error('\n❌ Failed to approve operator:', error.message);

    if (error.message.includes('NotContractOwner')) {
      console.log('\n⚠️  Note: Only the contract owner can approve operators.');
      console.log('   Make sure you are using the deployer wallet.');
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

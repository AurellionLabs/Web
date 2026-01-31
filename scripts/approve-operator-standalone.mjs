/**
 * Standalone script to approve an operator for RWY pool creation
 * Uses ethers.js directly without hardhat
 * 
 * Usage: node scripts/approve-operator-standalone.mjs
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// Constants from chain-constants.ts
const DIAMOND_ADDRESS = '0xc52Fc65C8F6435c1Ef885e091EBE72AF09D29f58';
const RPC_URL = 'https://base-sepolia.infura.io/v3/30d0943a6329474e8b08a1ce7ab66892';

const OPERATOR_FACET_ABI = [
  'function approveOperator(address operator) external',
  'function isApprovedOperator(address operator) view returns (bool)',
  'function getOperatorStats(address operator) view returns (bool approved, uint256 reputation, uint256 successfulOps, uint256 totalValueProcessed)',
];

async function main() {
  // Get private key from environment (check multiple possible names)
  const privateKey = process.env.SEP_PRIVATE_KEY || process.env.PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
  
  if (!privateKey) {
    console.error('❌ Error: SEP_PRIVATE_KEY, PRIVATE_KEY, or DEPLOYER_PRIVATE_KEY not found in .env file');
    process.exit(1);
  }

  console.log('🔧 Approve Operator Script (Standalone)\n');
  console.log(`Diamond Address: ${DIAMOND_ADDRESS}`);
  console.log(`RPC URL: ${RPC_URL}`);
  console.log('');

  // Create provider and signer
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(privateKey, provider);
  const signerAddress = await signer.getAddress();
  
  console.log(`Signer (deployer): ${signerAddress}`);
  console.log(`Operator to approve: ${signerAddress}`);
  console.log('');

  // Connect to the Diamond with OperatorFacet ABI
  const operatorFacet = new ethers.Contract(
    DIAMOND_ADDRESS,
    OPERATOR_FACET_ABI,
    signer
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
  } catch (error) {
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
      console.log('\n❌ Warning: Approval transaction succeeded but operator is not showing as approved.');
    }
  } catch (error) {
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

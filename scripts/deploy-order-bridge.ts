// scripts/deploy-order-bridge.ts
import { ethers } from 'hardhat';
import { OrderBridge__factory } from '../typechain-types';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('==========================================');
  console.log('Deploying OrderBridge to Base Sepolia...');
  console.log('==========================================\n');

  // Get deployer
  const [deployer] = await ethers.getSigners();
  const provider = deployer.provider || ethers.getDefaultProvider();
  console.log(`Deployer address: ${deployer.address}`);
  console.log(
    `Deployer balance: ${ethers.formatEther(await provider.getBalance(deployer.address))} ETH\n`,
  );

  // Contract addresses from existing deployment
  const CLOB_ADDRESS = '0x2b9D42594Bb18FAFaA64FFEC4f5e69C8ac328aAc';
  const AUSYS_ADDRESS = '0x84dC0BB1098aE6F4777C33F1C6221f11725EEfde';

  // Quote token - Using deployer address as placeholder (needs to be updated with actual USDT/USDC address)
  const QUOTE_TOKEN_ADDRESS = ethers.getAddress(
    '0x0000000000000000000000000000000000000000',
  ); // Placeholder

  // Fee recipient
  const FEE_RECIPIENT = deployer.address; // Use deployer as initial fee recipient

  console.log('Contract dependencies:');
  console.log(`  CLOB: ${CLOB_ADDRESS}`);
  console.log(`  Ausys: ${AUSYS_ADDRESS}`);
  console.log(`  Quote Token: ${QUOTE_TOKEN_ADDRESS}`);
  console.log(`  Fee Recipient: ${FEE_RECIPIENT}\n`);

  // Deploy OrderBridge
  const OrderBridgeFactory = await ethers.getContractFactory('OrderBridge');
  const orderBridge = await OrderBridgeFactory.deploy(
    CLOB_ADDRESS,
    AUSYS_ADDRESS,
    QUOTE_TOKEN_ADDRESS,
    FEE_RECIPIENT,
  );

  await orderBridge.waitForDeployment();

  const orderBridgeAddress = await orderBridge.getAddress();
  const deploymentTx = orderBridge.deploymentTransaction();

  console.log('==========================================');
  console.log('OrderBridge deployed successfully!');
  console.log('==========================================');
  console.log(`Address: ${orderBridgeAddress}`);
  console.log(`Transaction Hash: ${deploymentTx?.hash}`);
  console.log(`Block Number: ${deploymentTx?.blockNumber}`);
  console.log('==========================================\n');

  // Verify ownership transfer
  console.log('Transferring ownership to Gnosis Safe...');
  const GNOSIS_SAFE = '0x...'; // TODO: Set your Gnosis Safe address
  if (GNOSIS_SAFE !== '0x...') {
    const tx = await orderBridge.transferOwnership(GNOSIS_SAFE);
    await tx.wait();
    console.log(`Ownership transferred to: ${GNOSIS_SAFE}`);
  } else {
    console.log(
      'Ownership remains with deployer (update GNOSIS_SAFE constant to transfer)',
    );
  }

  // Update configuration files
  console.log('\nUpdating configuration files...');

  // Update chain-constants.ts
  updateChainConstants(orderBridgeAddress);

  // Update ponder.config.ts
  const deploymentBlock = deploymentTx?.blockNumber || 0;
  updatePonderConfig(orderBridgeAddress, deploymentBlock);

  // Update deployments JSON
  updateDeploymentsJson(orderBridgeAddress, deploymentBlock);

  console.log('\nDeployment complete!');
  console.log(`\nNext steps:`);
  console.log(`1. Verify contract on Block Explorer:`);
  console.log(
    `   npx hardhat verify --network baseSepolia ${orderBridgeAddress} ${CLOB_ADDRESS} ${AUSYS_ADDRESS} ${QUOTE_TOKEN_ADDRESS} ${FEE_RECIPIENT}`,
  );
  console.log(`\n2. Update indexer environment variables if needed`);
  console.log(
    `3. Test the OrderBridge with: npx hardhat test test/OrderBridge.t.sol`,
  );
}

function updateChainConstants(orderBridgeAddress: string) {
  const filePath = path.join(__dirname, '..', 'chain-constants.ts');
  let content = fs.readFileSync(filePath, 'utf-8');

  // Update OrderBridge address
  content = content.replace(
    /export const NEXT_PUBLIC_ORDER_BRIDGE_ADDRESS =\s*\n\s*'0x0000000000000000000000000000000000000000'.*/,
    `export const NEXT_PUBLIC_ORDER_BRIDGE_ADDRESS =\n  '${orderBridgeAddress}';`,
  );

  // Update deployment timestamp
  content = content.replace(
    /\/\/ Deployed: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
    `// Deployed: ${new Date().toISOString()}`,
  );

  fs.writeFileSync(filePath, content);
  console.log(`✓ Updated chain-constants.ts`);
}

function updatePonderConfig(
  orderBridgeAddress: string,
  deploymentBlock: number,
) {
  const filePath = path.join(__dirname, '..', 'indexer', 'ponder.config.ts');
  let content = fs.readFileSync(filePath, 'utf-8');

  // Update OrderBridge address
  content = content.replace(
    /orderBridge: '0x0000000000000000000000000000000000000000' as `0x\$`/,
    `orderBridge: '${orderBridgeAddress}' as \`0x\${string}\``,
  );

  // Update start block
  content = content.replace(
    /orderBridge: \d+,.*\/\/ TODO: Update with actual deployment block/,
    `orderBridge: ${deploymentBlock},`,
  );

  fs.writeFileSync(filePath, content);
  console.log(`✓ Updated indexer/ponder.config.ts`);
}

function updateDeploymentsJson(
  orderBridgeAddress: string,
  deploymentBlock: number,
) {
  const filePath = path.join(
    __dirname,
    '..',
    'deployments',
    'baseSepolia-latest.json',
  );
  const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  content.contracts.orderBridge = orderBridgeAddress;
  content.startBlocks.orderBridge = deploymentBlock;
  content.timestamp = new Date().toISOString();

  fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
  console.log(`✓ Updated deployments/baseSepolia-latest.json`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

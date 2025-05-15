import { ethers } from 'hardhat';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { AurumNodeManager, AuraGoat } from '../typechain-types';

dotenv.config();

async function waitForConfirmations(tx: any, confirmations: number) {
  try {
    console.log(`Waiting for ${confirmations} confirmations...`);
    await tx.wait(confirmations);
    console.log('Confirmations received');
  } catch (error) {
    console.warn(
      'Warning: Could not wait for all confirmations, continuing...',
    );
  }
}

async function main() {
  try {
    // Get signers and provider setup
    const [deployer]: HardhatEthersSigner[] = await ethers.getSigners();
    console.log('Deploying contracts with account:', deployer.address);
    console.log(
      'Account balance:',
      (await deployer.provider.getBalance(deployer.address)).toString(),
    );

    const USDC = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
    const initialOwner = deployer.address;
    const projectWallet = deployer.address;

    // Deploy contracts with sequential confirmations
    console.log('\nDeploying AuSys contract...');
    const AuSys = await ethers.getContractFactory('locationContract');
    const auSys = await AuSys.deploy(initialOwner);
    const auSysAddress = await auSys.getAddress();
    await waitForConfirmations(auSys.deploymentTransaction(), 2);
    console.log('AuSys contract deployed to:', auSysAddress);

    console.log('\nDeploying AurumNodeManager contract...');
    const AurumNodeManager =
      await ethers.getContractFactory('AurumNodeManager');
    const aurumNodeManager = await AurumNodeManager.deploy(
      auSysAddress,
      initialOwner,
    );
    const aurumNodeManagerAddress = await aurumNodeManager.getAddress();
    await waitForConfirmations(aurumNodeManager.deploymentTransaction(), 2);
    console.log(
      'AurumNodeManager contract deployed to:',
      aurumNodeManagerAddress,
    );

    console.log('\nDeploying AuStake contract...');
    const AuStake = await ethers.getContractFactory('AuStake');
    const auStake = await AuStake.deploy(projectWallet, initialOwner);
    const auStakeAddress = await auStake.getAddress();
    await waitForConfirmations(auStake.deploymentTransaction(), 2);
    console.log('AuStake contract deployed to:', auStakeAddress);

    // Deploy AuraGoat with required parameters
    const AuraGoat = await ethers.getContractFactory('AuraGoat');
    const auraGoat = await AuraGoat.deploy(
      deployer.address, // initialOwner
      'https://your-metadata-uri.com/', // _uri for NFT metadata
      await aurumNodeManager.getAddress(), // _NodeManager address
    );
    await auraGoat.waitForDeployment();
    console.log('AuraGoat deployed to:', await auraGoat.getAddress());

    // Optional: Set AuraGoat address in AurumNodeManager if needed
    await aurumNodeManager.addToken(await auraGoat.getAddress());
    console.log('AuraGoat token added to AurumNodeManager');

    // Set NodeManager in AuSys contract
    await auSys.setNodeManager(aurumNodeManagerAddress);
    console.log('NodeManager set in AuSys contract');

    // Write deployment addresses to file
    console.log(
      '\nWriting constants to:',
      process.cwd() + '/chain-constants.ts',
    );
    const constants = `export const NEXT_PUBLIC_AUSTAKE_ADDRESS = "${auStakeAddress}";
export const NEXT_PUBLIC_AURA_TOKEN_ADDRESS = "${USDC}";
export const NEXT_PUBLIC_AURUM_NODE_MANAGER_ADDRESS = "${aurumNodeManagerAddress}";
export const NEXT_PUBLIC_AUSYS_ADDRESS = "${auSysAddress}";
export const NEXT_PUBLIC_AURA_GOAT_ADDRESS = "${await auraGoat.getAddress()}";
`;

    await fs.promises.writeFile('chain-constants.ts', constants);

    // Print deployment summary
    console.log('\nDeployment Summary');
    console.log('==================');
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Aura Token: ${USDC}`);
    console.log(`AuSys Contract: ${auSysAddress}`);
    console.log(`AurumNodeManager Contract: ${aurumNodeManagerAddress}`);
    console.log(`AuStake Contract: ${auStakeAddress}`);
    console.log(`AuraGoat Contract: ${await auraGoat.getAddress()}`);
    console.log(`Project Wallet: ${projectWallet}`);
    console.log(`Initial Owner: ${initialOwner}`);
  } catch (error) {
    console.error('Error during deployment:', error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

import { ethers } from 'hardhat';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  try {
    // Get the signers
    const [deployer]: HardhatEthersSigner[] = await ethers.getSigners();
    console.log('Deploying contracts with account:', deployer.address);
    console.log(
      'Account balance:',
      (await deployer.provider.getBalance(deployer.address)).toString(),
    );

    // Deploy AuraGoat token first
    console.log('\nDeploying AuraGoat token...');
    const AuraGoat = await ethers.getContractFactory('AuraGoat');
    const auraGoat = await AuraGoat.deploy();
    await auraGoat.waitForDeployment();
    const auraGoatAddress = await auraGoat.getAddress();
    console.log('AuraGoat token deployed to:', auraGoatAddress);

    // Deploy AuStake contract
    console.log('\nDeploying AuStake contract...');
    const AuStake = await ethers.getContractFactory('AuStake');

    // Contract constructor parameters
    const projectWallet = deployer.address;
    const initialOwner = deployer.address;

    const auStake = await AuStake.deploy(projectWallet, initialOwner);
    await auStake.waitForDeployment();
    const auStakeAddress = await auStake.getAddress();
    console.log('AuStake contract deployed to:', auStakeAddress);

    // Wait for additional block confirmations
    console.log('\nWaiting for block confirmations...');
    await auStake.deploymentTransaction()?.wait(5);

    // Print deployment summary
    console.log('\nDeployment Summary');
    console.log('==================');
    console.log(`Deployer: ${deployer.address}`);
    console.log(`AuraGoat Token: ${auraGoatAddress}`);
    console.log(`AuStake Contract: ${auStakeAddress}`);
    console.log(`Project Wallet: ${projectWallet}`);
    console.log(`Initial Owner: ${initialOwner}`);
    console.log(`Generated .env`);
    console.log(`NEXT_PUBLIC_AUSTAKE_ADDRESS=${auStakeAddress}`);
    console.log(`NEXT_PUBLIC_AURA_ADDRESS=${auraGoatAddress}`);
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

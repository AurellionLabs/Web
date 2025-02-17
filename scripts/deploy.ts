import { ethers } from 'hardhat';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

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

    // Deploy AuStake contract
    console.log('\nDeploying AuStake contract...');
    const AuStake = await ethers.getContractFactory('AuStake');
    const projectWallet = deployer.address;
    const initialOwner = deployer.address;
    const auStake = await AuStake.deploy(projectWallet, initialOwner);
    await auStake.waitForDeployment();
    const auStakeAddress = await auStake.getAddress();
    console.log('AuStake contract deployed to:', auStakeAddress);

    // Wait for additional confirmations
    console.log('\nWaiting for block confirmations...');
    await auStake.deploymentTransaction()?.wait(5);

    // Write deployment addresses to file
    console.log(
      '\nWriting constants to:',
      process.cwd() + '/chain-constants.ts',
    );
    const constants = `export const NEXT_PUBLIC_AUSTAKE_ADDRESS = "${auStakeAddress}";
export const NEXT_PUBLIC_AURA_ADDRESS = "${USDC}";
`;

    await fs.promises.writeFile('chain-constants.ts', constants);

    // Print deployment summary
    console.log('\nDeployment Summary');
    console.log('==================');
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Aura Token: ${USDC}`);
    console.log(`AuStake Contract: ${auStakeAddress}`);
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

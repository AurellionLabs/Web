import { ethers } from "hardhat";
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
            (await deployer.provider.getBalance(deployer.address)).toString()
        );

        // Deploy Aura contract
        console.log('\nDeploying Aura contract...');
        const Aura = await ethers.getContractFactory("Aura");
        const aura = await Aura.deploy();
        await aura.waitForDeployment();
        const auraAddress = await aura.getAddress();
        console.log("Aura deployed to:", auraAddress);

        // Mint tokens to treasury
        const mintAmount = ethers.parseUnits("1000000", 18);
        const mintTx = await aura.mintTokenToTreasury(mintAmount);
        await mintTx.wait();
        console.log(`Minted ${mintAmount.toString()} tokens to treasury`);

        // Deploy locationContract
        console.log('\nDeploying locationContract...');
        const LocationContract = await ethers.getContractFactory("locationContract");
        const ausys = await LocationContract.deploy(auraAddress);
        await ausys.waitForDeployment();
        const ausysAddress = await ausys.getAddress();
        console.log("locationContract deployed to:", ausysAddress);

        // Approve aura spending
        const auraTotalSupply = await aura.totalSupply();
        const approveTx = await aura.approve(ausysAddress, auraTotalSupply);
        await approveTx.wait();
        console.log(`Approved ${auraTotalSupply.toString()} for spending by locationContract`);

        // Deploy AurumNodeManager
        console.log('\nDeploying AurumNodeManager...');
        const AurumNodeManager = await ethers.getContractFactory("AurumNodeManager");
        const aurumNodeManager = await AurumNodeManager.deploy(
            ausysAddress,
            "0x9d4CCf6c3d6a1d5583c2918028c86Cc8267a0BE6"
        );
        await aurumNodeManager.waitForDeployment();
        const aurumNodeManagerAddress = await aurumNodeManager.getAddress();
        console.log("AurumNodeManager deployed to:", aurumNodeManagerAddress);

        // Deploy AuraGoat
        console.log('\nDeploying AuraGoat...');
        const AuraGoat = await ethers.getContractFactory("AuraGoat");
        const auraGoat = await AuraGoat.deploy(
            "0x9d4CCf6c3d6a1d5583c2918028c86Cc8267a0BE6",
            "",
            aurumNodeManagerAddress
        );
        await auraGoat.waitForDeployment();
        const auraGoatAddress = await auraGoat.getAddress();
        console.log("AuraGoat deployed to:", auraGoatAddress);

        // Add token to AurumNodeManager
        const addTokenTx = await aurumNodeManager.addToken(auraGoatAddress);
        await addTokenTx.wait();
        console.log(`Added AuraGoat token to AurumNodeManager`);

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
        console.log('\nWriting constants to:', process.cwd() + '/chain-constants.ts');
        const constants = `export const NEXT_PUBLIC_AUSTAKE_ADDRESS = "${auStakeAddress}";
export const NEXT_PUBLIC_AURA_ADDRESS = "${auraGoatAddress}";
export const NEXT_PUBLIC_AURA_TOKEN_ADDRESS = "${auraAddress}";
export const NEXT_PUBLIC_LOCATION_CONTRACT_ADDRESS = "${ausysAddress}";
export const NEXT_PUBLIC_AURUM_NODE_MANAGER_ADDRESS = "${aurumNodeManagerAddress}";
`;

        await fs.promises.writeFile('chain-constants.ts', constants);

        // Print deployment summary
        console.log('\nDeployment Summary');
        console.log('==================');
        console.log(`Deployer: ${deployer.address}`);
        console.log(`Aura Token: ${auraAddress}`);
        console.log(`Location Contract: ${ausysAddress}`);
        console.log(`AurumNodeManager: ${aurumNodeManagerAddress}`);
        console.log(`AuraGoat Token: ${auraGoatAddress}`);
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

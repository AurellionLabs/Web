import { ethers } from 'hardhat';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import {
  AurumNodeManager,
  AuraAsset,
  LocationContract,
} from '../typechain-types';
import { PinataSDK } from 'pinata';

dotenv.config();

function run(cmd: string, cwd: string) {
  execSync(cmd, { cwd, stdio: 'inherit', env: { ...process.env } });
}

function runCapture(cmd: string, cwd: string): string {
  const out = execSync(cmd, { cwd, stdio: 'pipe', env: { ...process.env } });
  const stdout = out?.toString?.() ?? '';
  process.stdout.write(stdout);
  return stdout;
}

function parseGraphDeployQueryEndpoint(output: string): string | null {
  const match = output.match(/Queries \(HTTP\):\s*(\S+)/);
  return match?.[1] ?? null;
}

async function getDeploymentBlock(tx: any, provider: any) {
  try {
    const receipt = await tx.wait(1);
    return receipt.blockNumber;
  } catch (e) {
    return await provider.getBlockNumber();
  }
}

function updateJson(filePath: string, update: (data: any) => void) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const json = JSON.parse(raw);
  update(json);
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2));
}

function updateSubgraphYaml(filePath: string, address: string, startBlock: number) {
  let yml = fs.readFileSync(filePath, 'utf8');
  yml = yml.replace(/address:\s*["'][0xA-Fa-f0-9]+["']/, `address: "${address}"`);
  yml = yml.replace(/startBlock:\s*\d+/, `startBlock: ${startBlock}`);
  fs.writeFileSync(filePath, yml);
}

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
    const auSys = (await AuSys.deploy(
      initialOwner,
    )) as unknown as LocationContract;
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

    // Deploy AuraAsset (formerly AuraGoat) with required parameters
    const AuraAssetFactory = await ethers.getContractFactory('AuraAsset');
    const auraAsset = (await AuraAssetFactory.deploy(
      deployer.address, // initialOwner (owner is deployer via Ownable)
      'https://your-metadata-uri.com/', // _uri for NFT metadata
      await aurumNodeManager.getAddress(), // _NodeManager address
    )) as unknown as AuraAsset;
    await auraAsset.waitForDeployment();
    console.log('AuraAsset deployed to:', await auraAsset.getAddress());

    // Optional: Set AuraGoat address in AurumNodeManager if needed
    await aurumNodeManager.addToken(await auraAsset.getAddress());
    console.log('AuraAsset token added to AurumNodeManager');

    // Add default classes for testing
    const defaultClasses = ['GOAT', 'SHEEP', 'COW', 'CHICKEN', 'DUCK'];
    for (const className of defaultClasses) {
      const tx = await auraAsset.addSupportedClass(className);
      await waitForConfirmations(tx, 1);
      console.log(`Added default class: ${className}`);
    }

    // Add default AUGOAT asset with attributes: weight (S,M,L) and sex (M,F)
    const defaultAsset = {
      name: 'AUGOAT',
      class: 'GOAT',
      attributes: [
        {
          name: 'weight',
          values: ['S', 'M', 'L'],
          description: 'A goats weight either S = 20 KG , M = 30 KG, L = 40KG',
        },
        { name: 'sex', values: ['M', 'F'], description: '' },
      ],
    };
    const addAssetTx = await auraAsset.addSupportedAsset(defaultAsset as any);
    await waitForConfirmations(addAssetTx, 1);
    console.log('Added default asset: AUGOAT');
    const hash = await auraAsset.ipfsID(0);
    console.log('IPFSID if it had one but it doesnt', hash);

    console.log('pinata JWT', process.env.PINATA_JWT!);
    const pinata = new PinataSDK({
      pinataJwt: process.env.PINATA_JWT!,
      pinataGateway: 'orange-electronic-flyingfish-697.mypinata.cloud',
    });
    const metadataJson = {
      tokenId: hash.toString(),
      hash: hash,
      asset: defaultAsset,
      className: defaultAsset.class,
    };
    const metadataBase64 = Buffer.from(JSON.stringify(metadataJson)).toString(
      'base64',
    );
    const upload = await pinata.upload.public
      .base64(metadataBase64)
      .name(`${hash}.json`)
      .keyvalues({ tokenId: hash.toString(), className: defaultAsset.class });

    console.log('uploaded default goat', upload);

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
export const NEXT_PUBLIC_AURA_GOAT_ADDRESS = "${await auraAsset.getAddress()}";
`;

    await fs.promises.writeFile('chain-constants.ts', constants);

    // Subgraph auto-redeploy: update configs and deploy both subgraphs
    const auraAssetAddress = await auraAsset.getAddress();
    const auraAssetDeployBlock = await getDeploymentBlock(
      auraAsset.deploymentTransaction(),
      deployer.provider,
    );
    const auStakeDeployBlock = await getDeploymentBlock(
      auStake.deploymentTransaction(),
      deployer.provider,
    );

    const auraAssetSubgraphDir = path.resolve('/home/aurellius/Documents/Web/aura-asset-subgraph');
    const aurellionSubgraphDir = path.resolve('/home/aurellius/Documents/Web/aurellion');

    // Update networks.json entries
    updateJson(path.join(auraAssetSubgraphDir, 'networks.json'), (j) => {
      j['base-sepolia'] ??= {};
      j['base-sepolia'].AuraAsset = {
        address: auraAssetAddress,
        startBlock: auraAssetDeployBlock,
      };
    });

    updateJson(path.join(aurellionSubgraphDir, 'networks.json'), (j) => {
      j['base-sepolia'] ??= {};
      j['base-sepolia'].AuStake = {
        address: auStakeAddress,
        startBlock: auStakeDeployBlock,
      };
    });

    // Keep subgraph.yaml in sync (since they contain hardcoded values)
    updateSubgraphYaml(
      path.join(auraAssetSubgraphDir, 'subgraph.yaml'),
      auraAssetAddress,
      auraAssetDeployBlock,
    );
    updateSubgraphYaml(
      path.join(aurellionSubgraphDir, 'subgraph.yaml'),
      auStakeAddress,
      auStakeDeployBlock,
    );

    // Redeploy subgraphs (GRAPH_ACCESS_TOKEN must be set)
    console.log('\nRedeploying subgraph: aura-asset');
    run('npm run codegen', auraAssetSubgraphDir);
    run('npm run build', auraAssetSubgraphDir);
    const auraAssetVersion = `v${Date.now()}`;
    const auraAssetDeployOut = runCapture(
      `npx graph deploy --node https://api.studio.thegraph.com/deploy/ aura-asset --version-label ${auraAssetVersion}`,
      auraAssetSubgraphDir,
    );
    const auraAssetQueryUrl =
      parseGraphDeployQueryEndpoint(auraAssetDeployOut) || '';

    console.log('\nRedeploying subgraph: aurellion');
    run('npm run codegen', aurellionSubgraphDir);
    run('npm run build', aurellionSubgraphDir);
    const aurellionVersion = `v${Date.now()}`;
    const aurellionDeployOut = runCapture(
      `npx graph deploy --node https://api.studio.thegraph.com/deploy/ aurellion --version-label ${aurellionVersion}`,
      aurellionSubgraphDir,
    );
    const aurellionQueryUrl =
      parseGraphDeployQueryEndpoint(aurellionDeployOut) || '';

    // Update chain constants with subgraph endpoints so the app always uses latest
    const constantsWithSubgraphs = `export const NEXT_PUBLIC_AUSTAKE_ADDRESS = "${auStakeAddress}";
export const NEXT_PUBLIC_AURA_TOKEN_ADDRESS = "${USDC}";
export const NEXT_PUBLIC_AURUM_NODE_MANAGER_ADDRESS = "${aurumNodeManagerAddress}";
export const NEXT_PUBLIC_AUSYS_ADDRESS = "${auSysAddress}";
export const NEXT_PUBLIC_AURA_GOAT_ADDRESS = "${await auraAsset.getAddress()}";
`;
    await fs.promises.writeFile('chain-constants.ts', constantsWithSubgraphs);

    // Print deployment summary
    console.log('\nDeployment Summary');
    console.log('==================');
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Aura Token: ${USDC}`);
    console.log(`AuSys Contract: ${auSysAddress}`);
    console.log(`AurumNodeManager Contract: ${aurumNodeManagerAddress}`);
    console.log(`AuStake Contract: ${auStakeAddress}`);
    console.log(`AuraAsset Contract: ${await auraAsset.getAddress()}`);
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

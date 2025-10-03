import { ethers } from 'hardhat';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as readline from 'readline';
import { AurumNodeManager, AuraAsset } from '../typechain-types';
import { PinataSDK } from 'pinata';

dotenv.config();

function generateSemver(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 0-based, so add 1
  const day = now.getDate();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const second = now.getSeconds();

  // Traditional semver format: 1.MINOR.PATCH
  // MINOR: YYYYMMDD (e.g., 20250114 for Jan 14, 2025)
  // PATCH: HHMMSS (e.g., 143045 for 14:30:45)
  const major = 1; // Start with version 1.x.x
  const minor = year * 10000 + month * 100 + day; // e.g., 20250114
  const patch = hour * 10000 + minute * 100 + second; // e.g., 143045

  return `${major}.${minor}.${patch}`;
}

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

async function waitForUserToPublish(
  subgraphName: string,
  subgraphDir: string,
  version: string,
): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log(`\n🚀 ${subgraphName} is ready for manual publishing!`);
  console.log(`==========================================`);
  console.log(`📁 Directory: ${subgraphDir}`);
  console.log(`📝 Version: ${version}`);
  console.log(`\n📋 Next Steps:`);
  console.log(`1. Visit: https://thegraph.com/studio/`);
  console.log(`2. Create a new subgraph named: ${subgraphName}`);
  console.log(`3. Navigate to: ${subgraphDir}`);
  console.log(`4. Follow the CLI commands shown in The Graph Studio:`);
  console.log(`   - graph auth --studio <DEPLOY_KEY>`);
  console.log(`   - graph deploy --studio ${subgraphName}`);
  console.log(`\n⏸️  PAUSED: Please complete the publishing steps above.`);

  return new Promise((resolve) => {
    rl.question(
      '\n✅ Press ENTER after you have successfully published this subgraph to continue...',
      () => {
        console.log(`\n✨ Great! Continuing with the next subgraph...\n`);
        rl.close();
        resolve();
      },
    );
  });
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
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const json = JSON.parse(raw);
    update(json);
    fs.writeFileSync(filePath, JSON.stringify(json, null, 2));
  } catch (error) {
    console.error(`Error updating JSON file: ${filePath}`);
    console.error('File contents:', fs.readFileSync(filePath, 'utf8'));
    throw error;
  }
}

function updateSubgraphYaml(
  filePath: string,
  address: string,
  startBlock: number,
) {
  let yml = fs.readFileSync(filePath, 'utf8');
  yml = yml.replace(
    /address:\s*["'][0xA-Fa-f0-9]+["']/,
    `address: "${address}"`,
  );
  yml = yml.replace(/startBlock:\s*\d+/, `startBlock: ${startBlock}`);
  fs.writeFileSync(filePath, yml);
}

function fixClassKeywordInGeneratedCode(subgraphDir: string) {
  const generatedFile = path.join(
    subgraphDir,
    'generated/AuraAsset/AuraAsset.ts',
  );
  if (fs.existsSync(generatedFile)) {
    console.log('Fixing class keyword issues in generated TypeScript...');
    let content = fs.readFileSync(generatedFile, 'utf8');
    // Replace all instances of "get class():" with "get assetClass():"
    content = content.replace(/get class\(\):/g, 'get assetClass():');
    fs.writeFileSync(generatedFile, content);
    console.log('Fixed class keyword issues');
  }
}

function fixMappingFile(subgraphDir: string) {
  const mappingFile = path.join(subgraphDir, 'src/aura-asset.ts');
  if (fs.existsSync(mappingFile)) {
    console.log('Updating mapping file to use assetClass...');
    let content = fs.readFileSync(mappingFile, 'utf8');
    // Replace event.params.asset.class_ with event.params.asset.assetClass
    content = content.replace(
      /event\.params\.asset\.class_/g,
      'event.params.asset.assetClass',
    );
    // Also fix the entity field assignment to match the schema
    content = content.replace(/entity\.asset_class_/g, 'entity.asset_class');
    fs.writeFileSync(mappingFile, content);
    console.log('Updated mapping file');
  }
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
    const deploymentVersion = generateSemver();
    console.log(`🚀 Starting deployment with version: ${deploymentVersion}`);

    // Get signers and provider setup
    const [deployer]: HardhatEthersSigner[] = await ethers.getSigners();
    console.log('Deploying contracts with account:', deployer.address);
    console.log(
      'Account balance:',
      (await deployer.provider.getBalance(deployer.address)).toString(),
    );

    // Get current gas price and add buffer for faster confirmation
    const feeData = await deployer.provider.getFeeData();
    const gasPrice = feeData.gasPrice
      ? (feeData.gasPrice * 120n) / 100n
      : undefined; // 20% buffer
    console.log('Using gas price:', gasPrice?.toString());

    // Get current nonce to avoid conflicts
    let nonce = await deployer.provider.getTransactionCount(
      deployer.address,
      'pending',
    );
    console.log('Starting nonce:', nonce);

    const getTxOptions = () => {
      const options: any = {};
      if (gasPrice) options.gasPrice = gasPrice;
      options.nonce = nonce++;
      return options;
    };

    const initialOwner = deployer.address;
    const projectWallet = deployer.address;

    // Deploy Aura token for Base Sepolia testnet
    console.log('\nDeploying Aura Token contract...');
    const AuraFactory = await ethers.getContractFactory('Aura');
    const auraToken = await AuraFactory.deploy();
    const auraTokenAddress = await auraToken.getAddress();
    await waitForConfirmations(auraToken.deploymentTransaction(), 2);
    console.log('Aura Token deployed to:', auraTokenAddress);

    // Mint some initial tokens for testing
    console.log('Minting initial Aura tokens for deployer...');
    const mintTx = await auraToken.mintTokenToTreasury(1000000); // 1M tokens
    await mintTx.wait();
    console.log('Minted 1,000,000 AURA tokens to deployer');

    // Deploy contracts with sequential confirmations
    console.log('\nDeploying AuSys contract...');
    const AuSys = await ethers.getContractFactory('Ausys');
    const auSys = await AuSys.deploy(
      auraTokenAddress, // payToken - Using Aura token instead of USDC for testnet
    );
    const auSysAddress = await auSys.getAddress();
    await waitForConfirmations(auSys.deploymentTransaction(), 2);
    console.log('AuSys contract deployed to:', auSysAddress);

    console.log('\nDeploying AurumNodeManager contract...');
    const AurumNodeManager =
      await ethers.getContractFactory('AurumNodeManager');
    const aurumNodeManager = await AurumNodeManager.deploy(
      auSysAddress, // Only takes Ausys address now
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

    // Deploy NEXT_PUBLIC_AUSYS_SUBGRAPH_URLAuraAsset (formerly AuraGoat) with required parameters
    const AuraAssetFactory = await ethers.getContractFactory('AuraAsset');
    const auraAsset = (await AuraAssetFactory.deploy(
      deployer.address, // initialOwner (owner is deployer via Ownable)
      'https://your-metadata-uri.com/', // _uri for NFT metadata
      await aurumNodeManager.getAddress(), // _NodeManager address
    )) as unknown as AuraAsset;
    await auraAsset.waitForDeployment();
    console.log('AuraAsset deployed to:', await auraAsset.getAddress());

    // Reset nonce after all deployments to get current state
    nonce = await deployer.provider.getTransactionCount(
      deployer.address,
      'pending',
    );
    console.log('Updated nonce after deployments:', nonce);

    // Optional: Set AuraGoat address in AurumNodeManager if needed
    await aurumNodeManager.addToken(
      await auraAsset.getAddress(),
      getTxOptions(),
    );
    console.log('AuraAsset token added to AurumNodeManager');

    // Add default classes for testing
    const defaultClasses = ['GOAT', 'SHEEP', 'COW', 'CHICKEN', 'DUCK'];
    for (const className of defaultClasses) {
      const tx = await auraAsset.addSupportedClass(className, getTxOptions());
      await waitForConfirmations(tx, 1);
      console.log(`Added default class: ${className}`);
    }

    // Add default AUGOAT asset with attributes: weight (S,M,L) and sex (M,F)
    const defaultAsset = {
      name: 'AUGOAT',
      assetClass: 'GOAT',
      attributes: [
        {
          name: 'weight',
          values: ['S', 'M', 'L'],
          description: 'A goats weight either S = 20 KG , M = 30 KG, L = 40KG',
        },
        { name: 'sex', values: ['M', 'F'], description: '' },
      ],
    };
    const addAssetTx = await auraAsset.addSupportedAsset(
      defaultAsset as any,
      getTxOptions(),
    );
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
      className: defaultAsset.assetClass,
    };
    const metadataBase64 = Buffer.from(JSON.stringify(metadataJson)).toString(
      'base64',
    );
    const upload = await pinata.upload.public
      .base64(metadataBase64)
      .name(`${hash}.json`)
      .keyvalues({
        tokenId: hash.toString(),
        className: defaultAsset.assetClass,
      });

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
export const NEXT_PUBLIC_AURA_TOKEN_ADDRESS = "${auraTokenAddress}";
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

    const auraAssetSubgraphDir = path.resolve('./aura-asset-base-sepolia');
    const auStakeSubgraphDir = path.resolve('./austake-base-sepolia');
    const aurumSubgraphDir = path.resolve('./aurum-base-sepolia');
    const ausysSubgraphDir = path.resolve('./ausys-base-sepolia');

    // Get deployment blocks for new contracts
    const aurumDeployBlock = await getDeploymentBlock(
      aurumNodeManager.deploymentTransaction(),
      deployer.provider,
    );
    const ausysDeployBlock = await getDeploymentBlock(
      auSys.deploymentTransaction(),
      deployer.provider,
    );

    // Update networks.json entries
    updateJson(path.join(auraAssetSubgraphDir, 'networks.json'), (j) => {
      j['base-sepolia'] ??= {};
      j['base-sepolia'].AuraAsset = {
        address: auraAssetAddress,
        startBlock: auraAssetDeployBlock,
      };
    });

    updateJson(path.join(auStakeSubgraphDir, 'networks.json'), (j) => {
      j['base-sepolia'] ??= {};
      j['base-sepolia'].AuStake = {
        address: auStakeAddress,
        startBlock: auStakeDeployBlock,
      };
    });

    // Create networks.json for new subgraphs
    fs.writeFileSync(
      path.join(aurumSubgraphDir, 'networks.json'),
      JSON.stringify(
        {
          'base-sepolia': {
            AurumNodeManager: {
              address: aurumNodeManagerAddress,
              startBlock: aurumDeployBlock,
            },
          },
        },
        null,
        2,
      ),
    );

    fs.writeFileSync(
      path.join(ausysSubgraphDir, 'networks.json'),
      JSON.stringify(
        {
          'base-sepolia': {
            Ausys: {
              address: auSysAddress,
              startBlock: ausysDeployBlock,
            },
          },
        },
        null,
        2,
      ),
    );

    // Keep subgraph.yaml in sync (since they contain hardcoded values)
    updateSubgraphYaml(
      path.join(auraAssetSubgraphDir, 'subgraph.yaml'),
      auraAssetAddress,
      auraAssetDeployBlock,
    );
    updateSubgraphYaml(
      path.join(auStakeSubgraphDir, 'subgraph.yaml'),
      auStakeAddress,
      auStakeDeployBlock,
    );
    updateSubgraphYaml(
      path.join(aurumSubgraphDir, 'subgraph.yaml'),
      aurumNodeManagerAddress,
      aurumDeployBlock,
    );
    updateSubgraphYaml(
      path.join(ausysSubgraphDir, 'subgraph.yaml'),
      auSysAddress,
      ausysDeployBlock,
    );

    console.log('\nRedeploying subgraph: aura-asset-base-sepolia');
    run('graph codegen', auraAssetSubgraphDir);
    fixClassKeywordInGeneratedCode(auraAssetSubgraphDir);
    fixMappingFile(auraAssetSubgraphDir);
    run('graph build', auraAssetSubgraphDir);
    const auraAssetVersion = deploymentVersion;
    const auraAssetDeployOut = runCapture(
      `graph deploy aura-asset-base-sepolia --version-label ${auraAssetVersion}`,
      auraAssetSubgraphDir,
    );
    const auraAssetQueryUrl =
      parseGraphDeployQueryEndpoint(auraAssetDeployOut) || '';

    // Wait for user to manually publish
    await waitForUserToPublish(
      'aura-asset-base-sepolia',
      auraAssetSubgraphDir,
      auraAssetVersion,
    );

    console.log('\nRedeploying subgraph: austake-base-sepolia');
    run('graph codegen', auStakeSubgraphDir);
    run('graph build', auStakeSubgraphDir);
    const auStakeVersion = deploymentVersion;
    const auStakeDeployOut = runCapture(
      `graph deploy austake-base-sepolia --version-label ${auStakeVersion}`,
      auStakeSubgraphDir,
    );
    const auStakeQueryUrl =
      parseGraphDeployQueryEndpoint(auStakeDeployOut) || '';

    // Wait for user to manually publish
    await waitForUserToPublish(
      'austake-base-sepolia',
      auStakeSubgraphDir,
      auStakeVersion,
    );

    console.log('\nDeploying subgraph: aurum-base-sepolia');
    // Sync latest ABI from Hardhat artifacts to subgraph abis to avoid stale signatures
    const artifactAbiPath = path.resolve(
      './artifacts/contracts/Aurum.sol/AurumNodeManager.json',
    );
    const subgraphAbiDir = path.join(aurumSubgraphDir, 'abis');
    const subgraphAbiPath = path.join(subgraphAbiDir, 'AurumNodeManager.json');
    if (fs.existsSync(artifactAbiPath)) {
      if (!fs.existsSync(subgraphAbiDir))
        fs.mkdirSync(subgraphAbiDir, { recursive: true });
      fs.copyFileSync(artifactAbiPath, subgraphAbiPath);
      console.log('✔ Synced ABI to subgraph:', subgraphAbiPath);
    } else {
      console.warn('⚠ Could not find artifact ABI at', artifactAbiPath);
    }
    run('npm install', aurumSubgraphDir);
    run('graph codegen', aurumSubgraphDir);
    run('graph build', aurumSubgraphDir);
    const aurumVersion = deploymentVersion;
    const aurumDeployOut = runCapture(
      `graph deploy aurum-base-sepolia --version-label ${aurumVersion}`,
      aurumSubgraphDir,
    );
    const aurumQueryUrl = parseGraphDeployQueryEndpoint(aurumDeployOut) || '';

    // Wait for user to manually publish
    await waitForUserToPublish(
      'aurum-base-sepolia',
      aurumSubgraphDir,
      aurumVersion,
    );

    console.log('\nDeploying subgraph: ausys-base-sepolia');
    run('npm install', ausysSubgraphDir);
    run('graph codegen', ausysSubgraphDir);
    run('graph build', ausysSubgraphDir);
    const ausysVersion = deploymentVersion;
    const ausysDeployOut = runCapture(
      `graph deploy ausys-base-sepolia --version-label ${ausysVersion}`,
      ausysSubgraphDir,
    );
    const ausysQueryUrl = parseGraphDeployQueryEndpoint(ausysDeployOut) || '';

    // Wait for user to manually publish
    await waitForUserToPublish(
      'ausys-base-sepolia',
      ausysSubgraphDir,
      ausysVersion,
    );

    // Update chain constants with subgraph endpoints so the app always uses latest
    const constantsWithSubgraphs = `export const NEXT_PUBLIC_AUSTAKE_ADDRESS = "${auStakeAddress}";
export const NEXT_PUBLIC_AURA_TOKEN_ADDRESS = "${auraTokenAddress}";
export const NEXT_PUBLIC_AURUM_NODE_MANAGER_ADDRESS = "${aurumNodeManagerAddress}";
export const NEXT_PUBLIC_AUSYS_ADDRESS = "${auSysAddress}";
export const NEXT_PUBLIC_AURA_GOAT_ADDRESS = "${await auraAsset.getAddress()}";
export const NEXT_PUBLIC_AURA_ASSET_SUBGRAPH_URL = "https://api.studio.thegraph.com/query/112596/aura-asset-base-sepolia/version/latest";
export const NEXT_PUBLIC_AUSTAKE_SUBGRAPH_URL = "https://api.studio.thegraph.com/query/112596/austake-base-sepolia/version/latest";
export const NEXT_PUBLIC_AURUM_SUBGRAPH_URL = "https://api.studio.thegraph.com/query/112596/aurum-base-sepolia/version/latest";
export const NEXT_PUBLIC_AUSYS_SUBGRAPH_URL = "https://api.studio.thegraph.com/query/112596/ausys-base-sepolia/version/latest";
`;
    await fs.promises.writeFile('chain-constants.ts', constantsWithSubgraphs);

    // Print deployment summary
    console.log('\nDeployment Summary');
    console.log('==================');
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Aura Token: ${auraTokenAddress}`);
    console.log(`AuSys Contract: ${auSysAddress}`);
    console.log(`AurumNodeManager Contract: ${aurumNodeManagerAddress}`);
    console.log(`AuStake Contract: ${auStakeAddress}`);
    console.log(`AuraAsset Contract: ${await auraAsset.getAddress()}`);
    console.log(`Project Wallet: ${projectWallet}`);
    console.log(`Initial Owner: ${initialOwner}`);
    console.log('\n🎉 Deployment Complete!');
    console.log('========================');
    console.log('✅ All contracts deployed successfully');
    console.log('✅ All subgraphs built and published interactively');
    console.log('✅ Chain constants updated with latest addresses');
    console.log('\n📊 Summary:');
    console.log('- Contracts deployed on: Base Sepolia');
    console.log('- Subgraphs published to: The Graph Studio');
    console.log('- Query endpoints updated in chain-constants.ts');
    console.log('\n🚀 Your deployment is now complete and ready to use!');
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

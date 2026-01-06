import { ethers } from 'hardhat';
import { NEXT_PUBLIC_AURA_ASSET_ADDRESS } from '../chain-constants';

async function main() {
  const auraAsset = await ethers.getContractAt(
    'AuraAsset',
    NEXT_PUBLIC_AURA_ASSET_ADDRESS,
  );
  const owner = await auraAsset.owner();
  console.log('AuraAsset owner:', owner);

  const [signer] = await ethers.getSigners();
  const signerAddress = await signer.getAddress();
  console.log('Current signer (from SEP_PRIVATE_KEY):', signerAddress);
  console.log(
    'Match:',
    owner.toLowerCase() === signerAddress.toLowerCase() ? 'YES ✓' : 'NO ✗',
  );

  if (owner.toLowerCase() !== signerAddress.toLowerCase()) {
    console.log(
      '\n⚠️  To fix: Replace SEP_PRIVATE_KEY in .env with the private key of:',
      owner,
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

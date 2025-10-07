import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import { NEXT_PUBLIC_AUSYS_ADDRESS } from '../chain-constants';
dotenv.config();

// Replace with your driver's wallet address
const DRIVER_ADDRESS = process.env.DRIVER_ADDRESS || 'YOUR_DRIVER_ADDRESS_HERE';

async function main() {
  if (DRIVER_ADDRESS === 'YOUR_DRIVER_ADDRESS_HERE') {
    console.error(
      '❌ Please set DRIVER_ADDRESS environment variable or edit the script',
    );
    process.exit(1);
  }

  if (!process.env.ADMIN_PRIVATE_KEY) {
    console.error('❌ Please set ADMIN_PRIVATE_KEY environment variable');
    process.exit(1);
  }

  // Connect to Base Sepolia
  const provider = new ethers.JsonRpcProvider(
    process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
  );

  // Use your admin/deployer private key
  const wallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);

  console.log('Admin wallet:', wallet.address);
  console.log('Granting DRIVER_ROLE to:', DRIVER_ADDRESS);

  const ausysAbi = [
    'function setDriver(address driver, bool enable) external',
    'function hasRole(bytes32 role, address account) view returns (bool)',
    'function DRIVER_ROLE() view returns (bytes32)',
  ];

  const ausys = new ethers.Contract(
    NEXT_PUBLIC_AUSYS_ADDRESS,
    ausysAbi,
    wallet,
  );

  // Check current role
  const DRIVER_ROLE = await ausys.DRIVER_ROLE();
  const hasRole = await ausys.hasRole(DRIVER_ROLE, DRIVER_ADDRESS);

  if (hasRole) {
    console.log('✅ Address already has DRIVER_ROLE');
    return;
  }

  // Grant role
  console.log('Sending transaction to grant DRIVER_ROLE...');
  const tx = await ausys.setDriver(DRIVER_ADDRESS, true);
  console.log('Transaction hash:', tx.hash);

  console.log('Waiting for confirmation...');
  await tx.wait();

  console.log('✅ DRIVER_ROLE granted successfully!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

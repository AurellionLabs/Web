import { ethers } from 'hardhat';
import { NEXT_PUBLIC_DIAMOND_ADDRESS } from '../chain-constants';

async function main() {
  console.log('Checking ERC1155 receiver support...\n');

  const [signer] = await ethers.getSigners();
  console.log('Diamond address:', NEXT_PUBLIC_DIAMOND_ADDRESS);

  // Check if onERC1155Received selector is registered
  const diamondLoupe = await ethers.getContractAt(
    'IDiamondLoupe',
    NEXT_PUBLIC_DIAMOND_ADDRESS,
  );

  // onERC1155Received(address,address,uint256,uint256,bytes) selector
  // keccak256("onERC1155Received(address,address,uint256,uint256,bytes)") -> first 4 bytes
  const onERC1155ReceivedSelector = '0xf23a6e61';
  const onERC1155BatchReceivedSelector = '0xbc197c81';

  console.log('onERC1155Received selector:', onERC1155ReceivedSelector);
  console.log(
    'onERC1155BatchReceived selector:',
    onERC1155BatchReceivedSelector,
  );

  try {
    const facetAddress = await diamondLoupe.facetAddress(
      onERC1155ReceivedSelector,
    );
    console.log('\nonERC1155Received facet:', facetAddress);
    if (facetAddress === '0x0000000000000000000000000000000000000000') {
      console.log('⚠️  onERC1155Received is NOT registered in the Diamond!');
      console.log(
        'This is why nodeMint fails - when _mint is called, it tries to call',
      );
      console.log(
        'onERC1155Received on the Diamond, but that function is not registered.',
      );
    } else {
      console.log('✓ onERC1155Received is registered');
    }
  } catch (e: any) {
    console.log('Error checking onERC1155Received:', e.message);
  }

  try {
    const facetAddress = await diamondLoupe.facetAddress(
      onERC1155BatchReceivedSelector,
    );
    console.log('\nonERC1155BatchReceived facet:', facetAddress);
    if (facetAddress === '0x0000000000000000000000000000000000000000') {
      console.log(
        '⚠️  onERC1155BatchReceived is NOT registered in the Diamond!',
      );
    } else {
      console.log('✓ onERC1155BatchReceived is registered');
    }
  } catch (e: any) {
    console.log('Error checking onERC1155BatchReceived:', e.message);
  }

  // Also check supportsInterface for ERC1155Receiver
  console.log('\n=== Checking ERC165 Interface Support ===');
  const erc1155ReceiverInterfaceId = '0x4e2312e0'; // IERC1155Receiver

  try {
    const diamond = new ethers.Contract(
      NEXT_PUBLIC_DIAMOND_ADDRESS,
      ['function supportsInterface(bytes4) external view returns (bool)'],
      signer,
    );

    const supportsERC1155Receiver = await diamond.supportsInterface(
      erc1155ReceiverInterfaceId,
    );
    console.log(
      `supportsInterface(IERC1155Receiver): ${supportsERC1155Receiver}`,
    );

    if (!supportsERC1155Receiver) {
      console.log('⚠️  Diamond does not advertise IERC1155Receiver support');
    }
  } catch (e: any) {
    console.log('Error checking supportsInterface:', e.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

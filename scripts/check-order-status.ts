import { ethers } from 'ethers';
import { NEXT_PUBLIC_AUSYS_ADDRESS } from '../chain-constants';
import { AUSYS_ABI } from '../lib/constants/contracts';

async function checkOrderStatus() {
  const provider = new ethers.JsonRpcProvider(
    process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || 'https://sepolia.base.org',
  );

  const ausys = new ethers.Contract(
    NEXT_PUBLIC_AUSYS_ADDRESS,
    AUSYS_ABI,
    provider,
  );

  // Get the order ID from command line
  const orderId = process.argv[2];
  if (!orderId) {
    console.error('Please provide an order ID as argument');
    console.error('Usage: npx ts-node scripts/check-order-status.ts <orderId>');
    process.exit(1);
  }

  try {
    const order = await ausys.getOrder(orderId);
    console.log('\n=== Order Status Check ===');
    console.log('Order ID:', orderId);
    console.log('Current Status (numeric):', order.currentStatus.toString());
    console.log('Current Status (BigInt):', order.currentStatus);

    // Map to readable status
    const statusMap: Record<string, string> = {
      '0': 'Created',
      '1': 'Processing',
      '2': 'Settled',
      '3': 'Canceled',
    };
    console.log(
      'Status Label:',
      statusMap[order.currentStatus.toString()] || 'Unknown',
    );

    console.log('\n=== Full Order Data ===');
    console.log('Buyer:', order.buyer);
    console.log('Seller:', order.seller);
    console.log('Token:', order.token);
    console.log('Token ID:', order.tokenId.toString());
    console.log('Token Quantity:', order.tokenQuantity.toString());
    console.log('Price:', ethers.formatUnits(order.price, 18), 'AURA');
    console.log('Tx Fee:', ethers.formatUnits(order.txFee, 18), 'AURA');
    console.log('Journey IDs:', order.journeyIds);
    console.log('Nodes:', order.nodes);
  } catch (error) {
    console.error('Error fetching order:', error);
  }
}

checkOrderStatus();

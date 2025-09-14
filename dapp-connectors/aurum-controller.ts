import {
  AddressLike,
  BigNumberish,
  BytesLike,
  ContractTransactionReceipt,
} from 'ethers';
import {
  AurumNode,
  AurumNode__factory,
  AurumNodeManager,
  AurumNodeManager__factory,
} from '@/typechain-types';
import {
  ethersProvider,
  signer,
  getWalletAddress,
  handleContractError,
} from './base-controller';
import {
  NEXT_PUBLIC_AURA_GOAT_ADDRESS,
  NEXT_PUBLIC_AURUM_NODE_MANAGER_ADDRESS,
} from '@/chain-constants';
import { ethers } from 'ethers';
import { AuraAsset__factory } from '@/typechain-types';

export type ResourceData = {
  id: bigint;
  amount: bigint;
};

const getAurumContract = async (): Promise<AurumNodeManager> => {
  if (!ethersProvider || !signer) {
    throw new Error('Wallet not connected. Please connect your wallet.');
  }
  if (!NEXT_PUBLIC_AURUM_NODE_MANAGER_ADDRESS) {
    throw new Error('NEXT_PUBLIC_AURUM_NODE_MANAGER_ADDRESS is undefined');
  }
  try {
    const contract = AurumNodeManager__factory.connect(
      NEXT_PUBLIC_AURUM_NODE_MANAGER_ADDRESS,
      signer,
    );
    console.log('AurumNodeManager contract fetched successfully.');
    return contract;
  } catch (error) {
    console.error('Error fetching AurumNodeManager contract:', error);
    throw error;
  }
};

const getAurumNodeContract = async (address: string): Promise<AurumNode> => {
  if (!ethersProvider || !signer) {
    throw new Error('Wallet not connected. Please connect your wallet.');
  }
  try {
    const contract = AurumNode__factory.connect(address, signer);
    console.log('AurumNode contract fetched successfully.');
    return contract;
  } catch (error) {
    console.error('Error fetching AurumNode contract:', error);
    throw error;
  }
};

export const loadAvailableAssets = async (): Promise<ResourceData[]> => {
  const contract = await getAurumContract();
  let count = 0;
  const assetList: ResourceData[] = [];
  let id;
  let amount;
  try {
    while (true) {
      id = await contract.resourceList(count);
      amount = await contract.supplyPerResource(id);
      assetList.push({ id, amount });
      count++;
    }
  } catch (err: any) {
    if (err?.message?.includes('out of bounds')) {
      console.log('End of asset list reached.');
    } else {
      console.error('Error loading available assets:', err);
      throw err;
    }
  }
  return assetList;
};

export const getAllNodeAssets = async (): Promise<TokenizedAsset[]> => {
  const contract = await getAurumContract();
  let count = 0;
  const assetList: TokenizedAsset[] = [];

  try {
    // Try to get nodes one by one until we hit an error
    while (true) {
      try {
        console.log(`Fetching node at index ${count}`);
        const nodeAddress = await contract.nodeList(count);

        // Check if we got a valid address
        if (
          !nodeAddress ||
          nodeAddress === '0x0000000000000000000000000000000000000000'
        ) {
          console.log('Reached end of node list (empty address)');
          break;
        }

        // Use getNode to get node details
        const node: NodeStruct = await contract.getNode(nodeAddress);

        // Process node assets
        for (let i = 0; i < node.supportedAssets.length; i++) {
          const assetId = Number(node.supportedAssets[i]);
          const capacity = node.capacity[i].toString();
          const price = node.assetPrices[i]?.toString() || '0';

          // Get tokenized amount (minted amount) instead of capacity
          const tokenizedAmount = await getTokenizedAmount(
            nodeAddress,
            assetId,
          );

          assetList.push({
            id: assetId,
            amount: tokenizedAmount.toString(), // Use tokenized amount instead of capacity
            name: getAssetName(assetId),
            status: 'Active',
            nodeAddress: nodeAddress,
            nodeLocation: node.location,
            price: price,
            capacity: capacity, // Keep capacity as additional info if needed
          });
        }

        count++;
      } catch (nodeError) {
        // This is expected when we reach the end of the list
        console.log(`Reached end of node list at index ${count}`);
        break;
      }
    }

    console.log(`Total assets found: ${assetList.length}`);
    return assetList;
  } catch (err) {
    // This would be an unexpected error in the outer function
    console.error('Fatal error in getAllNodeAssets:', err);
    return [];
  }
};

export interface NodeLocationData {
  addressName: string;
  location: {
    lat: string;
    lng: string;
  };
}

export interface NodeStruct {
  location: NodeLocationData;
  validNode: string; // bytes1
  owner: string;
  supportedAssets: bigint[];
  status: string; // bytes1
  capacity: bigint[];
  assetPrices: bigint[];
}

export const registerNode = async (nodeData: AurumNodeManager.NodeStruct) => {
  console.log('Node Data:', nodeData);
  const contract = await getAurumContract();
  try {
    const formattedNodeData = {
      ...nodeData,
      validNode: '0x01', // Simple hex for bytes1
      status: '0x01', // Simple hex for bytes1
    };

    const tx = await contract.registerNode(formattedNodeData);
    const receipt = (await tx.wait()) as ContractTransactionReceipt;
    console.log(
      'Node registered successfully. Transaction hash:',
      receipt.hash,
    );
    return receipt;
  } catch (error) {
    console.error('Error registering node:', error);
    throw error;
  }
};

export const getOwnedNodeAddressList = async (): Promise<string[]> => {
  NEXT_PUBLIC_AURA_GOAT_ADDRESS;
  const contract = await getAurumContract();
  try {
    const nodeAddressList: string[] = [];
    let counter = 0;

    while (true) {
      try {
        const node = await contract.ownedNodes(getWalletAddress(), counter);
        nodeAddressList.push(node);
        counter++;
      } catch (e) {
        break;
      }
    }
    return nodeAddressList;
  } catch (error) {
    console.error(
      `Unable to get nodes addresses for owner address ${getWalletAddress()}`,
      error,
    );
    throw error;
  }
};

export const updateNodeStatus = async (node: string, status: BytesLike) => {
  const contract = await getAurumContract();
  try {
    const tx = await contract.updateStatus(status, node);
    const receipt = (await tx.wait()) as ContractTransactionReceipt;
    if (receipt) {
      console.log('Transaction completed', {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      });
    }
    return receipt;
  } catch (error) {
    console.error(`unable to updateStatus for node${node}`);
    throw error;
  }
};

export const nodeHandOff = async (
  node: string,
  driver: string,
  receiver: string,
  id: string,
  tokenIds: number[],
  token: string,
  quantities: number[],
  data: any,
) => {
  const contract = await getAurumNodeContract(node);
  try {
    const tx = await contract.nodeHandoff(
      node,
      driver,
      receiver,
      id,
      tokenIds,
      token,
      quantities,
      data,
    );
    const receipt = (await tx.wait()) as ContractTransactionReceipt;
    return receipt;
  } catch (error) {
    console.error(
      `unable nodeHandoff for node${node} driver: ${driver}, receiver: ${receiver}, id:${id}`,
      error,
    );
    throw error;
  }
};

export const nodeHandOn = async (
  node: string,
  driver: string,
  receiver: string,
  id: string,
) => {
  const contract = await getAurumNodeContract(node);
  try {
    const tx = await contract.nodeHandOn(driver, receiver, id);
    const receipt = (await tx.wait()) as ContractTransactionReceipt;
    return receipt;
  } catch (error) {
    console.error(
      `unable to updateStatus for node: ${driver} receiver: ${receiver} id: ${id}`,
      error,
    );
    throw error;
  }
};

export const getNode = async (nodeAddress: string): Promise<NodeStruct> => {
  const contract = await getAurumContract();
  try {
    const nodeData = await contract.getNode(nodeAddress);
    return {
      location: nodeData.location,
      validNode: nodeData.validNode,
      owner: nodeData.owner,
      supportedAssets: nodeData.supportedAssets,
      status: nodeData.status,
      capacity: nodeData.capacity,
      assetPrices: nodeData.assetPrices,
    };
  } catch (error) {
    console.error('Error getting node:', error);
    throw error;
  }
};

export const addToken = async (auraGoatAddress: string) => {
  const contract = await getAurumContract();
  try {
    const tx = await contract.addToken(auraGoatAddress);
    const receipt = (await tx.wait()) as ContractTransactionReceipt;
    return receipt;
  } catch (error) {
    handleContractError(error, 'add token');
  }
};

export const setAurumAdmin = async (admin: string) => {
  const contract = await getAurumContract();
  try {
    const tx = await contract.setAdmin(admin);
    const receipt = (await tx.wait()) as ContractTransactionReceipt;
    return receipt;
  } catch (error) {
    handleContractError(error, 'set aurum admin');
  }
};

export const expensiveFuzzyUpdateCapacity = async (
  node: string,
  quantities: number[],
  assets: number[],
) => {
  const contract = await getAurumContract();
  try {
    const tx = await contract.expensiveFuzzyUpdateCapacity(
      node,
      quantities,
      assets,
    );
    const receipt = (await tx.wait()) as ContractTransactionReceipt;
    return receipt;
  } catch (error) {
    handleContractError(error, 'update capacity');
  }
};

export const getNodeStatus = async (nodeAddress: string) => {
  const contract = await getAurumContract();
  const node = await contract.getNode(nodeAddress);
  return node.status;
};

export const getNodeOrders = async (nodeAddress: string) => {
  const contract = await getAurumContract();
  try {
    const orderIds = await contract.nodeToOrderIds(nodeAddress);
    const orders = await Promise.all(
      orderIds.map(async (orderId) => {
        const order = await contract.getOrder(orderId);
        return {
          id: orderId.toString(),
          customer: order.customer,
          asset: order.tokenId.toString(),
          quantity: Number(order.tokenQuantity),
          value: order.price.toString(),
          status: getOrderStatus(order.currentStatus),
          timestamp: Date.now(), // You might want to use a real timestamp if available
          deliveryLocation: order.locationData.endName,
        };
      }),
    );
    return orders;
  } catch (error) {
    console.error('Error getting node orders:', error);
    return [];
  }
};

// Helper function to convert contract status to string
function getOrderStatus(
  status: bigint,
): 'active' | 'pending' | 'completed' | 'cancelled' {
  switch (Number(status)) {
    case 0: // PENDING
      return 'pending';
    case 1: // ACCEPTED/ACTIVE
      return 'active';
    case 2: // IN_PROGRESS
      return 'active';
    case 3: // COMPLETED
      return 'completed';
    case 4: // CANCELED
      return 'cancelled';
    default:
      return 'pending';
  }
}

export interface TokenizedAsset {
  id: number;
  amount: string;
  name: string;
  status: string;
  nodeAddress: string;
  nodeLocation: NodeLocationData;
  price: string;
  capacity: string;
}

export const getNodeAssets = async (
  nodeAddress: string,
): Promise<TokenizedAsset[]> => {
  const contract = await getAurumContract();
  try {
    const node = await contract.getNode(nodeAddress);
    const assets = node.supportedAssets;
    const prices = node.assetPrices;
    const capacities = node.capacity;

    // Get actual tokenized amounts for each asset
    const assetsWithBalances = await Promise.all(
      assets.map(async (assetId, index) => {
        const tokenId = Number(assetId) * 10; // Convert to token ID format
        const auraGoat = await getAuraGoatContract(
          NEXT_PUBLIC_AURA_GOAT_ADDRESS,
        );
        const balance = await auraGoat.balanceOf(nodeAddress, tokenId);
        return {
          id: Number(assetId),
          amount: balance.toString(),
          name: getAssetName(Number(assetId)),
          status: node.status,
          price: prices[index]?.toString() || '0', // Add price information
          capacity: capacities[index]?.toString() || '0', // Add capacity
        };
      }),
    );

    return assetsWithBalances;
  } catch (error) {
    console.error('Error getting node assets:', error);
    throw error;
  }
};

// export function getAssetName(id: number): string {
//   const assetNames: { [key: number]: string } = {
//     1: 'Goat',
//     2: 'Sheep',
//     3: 'Cow',
//     4: 'Chicken',
//     5: 'Duck',
//   };
//   return assetNames[id] || `Asset ${id}`;
// }

export const checkIfNodeExists = async (
  ownerAddress: string,
): Promise<boolean> => {
  const contract = await getAurumContract();
  try {
    // Try to get the first node from ownedNodes array
    const firstNode = await contract.ownedNodes(ownerAddress, 0);
    // If we get here without error, node exists
    return true;
  } catch (error) {
    // If error, likely means no nodes exist
    return false;
  }
};

export const updateSupportedAssets = async (
  node: string,
  quantities: BigNumberish[],
  assets: BigNumberish[],
  prices: BigNumberish[],
) => {
  const contract = await getAurumContract();
  try {
    const tx = await contract.updateSupportedAssets(
      node,
      quantities,
      assets,
      prices,
    );
    const receipt = (await tx.wait()) as ContractTransactionReceipt;
    console.log('Assets updated successfully. Transaction hash:', receipt.hash);
    return receipt;
  } catch (error) {
    console.error('Error updating supported assets:', error);
    throw error;
  }
};

export const updateAssetCapacity = async (
  nodeAddress: string,
  assetId: number,
  newCapacity: number,
  supportedAssets: BigNumberish[],
  capacities: BigNumberish[],
  assetPrices: BigNumberish[],
) => {
  const contract = await getAurumContract();
  try {
    // Find index of asset to update
    const assetIndex = Array.from(supportedAssets).findIndex(
      (a) => Number(a) === assetId,
    );
    if (assetIndex === -1) throw new Error('Asset not found');

    // Create new capacities array with updated value
    const newCapacities = Array.from(capacities).map((cap, i) =>
      i === assetIndex ? newCapacity : Number(cap),
    );

    // Update using existing contract function
    const tx = await contract.updateSupportedAssets(
      nodeAddress,
      newCapacities,
      supportedAssets,
      assetPrices,
    );

    return tx;
  } catch (error) {
    console.error('Error updating asset capacity:', error);
    throw error;
  }
};

export const nodeMintAsset = async (
  nodeAddress: string,
  assetId: number,
  amount: number,
) => {
  const contract = await getAurumNodeContract(nodeAddress);
  try {
    const paddedId = ethers.zeroPadValue(ethers.toBeHex(assetId), 32);

    const tx = await contract.addItem(
      nodeAddress,
      paddedId,
      BigInt(assetId),
      BigInt(amount),
      NEXT_PUBLIC_AURA_GOAT_ADDRESS,
      '0x',
    );
    await tx.wait();

    // Check node's balance with correct tokenId
    const auraGoat = await getAuraGoatContract(NEXT_PUBLIC_AURA_GOAT_ADDRESS);
    const tokenId = assetId * 10; // Match the weight we used in addItem
    const balance = await auraGoat.balanceOf(nodeAddress, tokenId);
    console.log('Node balance after mint:', balance);
  } catch (error) {
    console.error('Error minting asset:', error);
    throw error;
  }
};

// Add this function to get AuraAsset contract
const getAuraGoatContract = async (address: string) => {
  if (!signer) throw new Error('Wallet not connected');
  return AuraAsset__factory.connect(address, signer);
};

export const getTokenizedAmount = async (
  nodeAddress: string,
  assetId: number,
): Promise<number> => {
  const contract = await getAuraGoatContract(NEXT_PUBLIC_AURA_GOAT_ADDRESS);
  try {
    const tokenId = assetId * 10; // Match the weight calculation
    const balance = await contract.balanceOf(nodeAddress, tokenId);
    return Number(balance);
  } catch (error) {
    console.error('Error getting tokenized amount:', error);
    throw error;
  }
};

export const updateAssetPrice = async (
  nodeAddress: string,
  assetId: number,
  newPrice: bigint,
  supportedAssets: bigint[],
  assetPrices: bigint[],
) => {
  const contract = await getAurumContract();
  try {
    // Find index of asset to update
    const assetIndex = Array.from(supportedAssets).findIndex(
      (a) => Number(a) === assetId,
    );
    if (assetIndex === -1) throw new Error('Asset not found');

    // Create new prices array with updated value
    const newPrices = Array.from(assetPrices).map((price, i) =>
      i === assetIndex ? newPrice : price,
    );

    // Update using existing contract function
    const tx = await contract.updateSupportedAssets(
      nodeAddress,
      Array.from(supportedAssets).map((a) => a), // Keep capacities the same
      Array.from(supportedAssets).map((a) => a), // Keep assets the same
      newPrices, // Update prices
    );

    const receipt = await tx.wait();
    return receipt;
  } catch (error) {
    console.error('Error updating asset price:', error);
    throw error;
  }
};

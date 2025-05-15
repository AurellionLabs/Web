import {
  AddressLike,
  BigNumberish,
  BytesLike,
  ContractTransactionReceipt,
  Signer,
  ethers,
  Overrides,
} from 'ethers';
import { LocationContract, LocationContract__factory } from '@/typechain-types';
import { NEXT_PUBLIC_AUSYS_ADDRESS } from '@/chain-constants';
import {
  ethersProvider,
  signer,
  getWalletAddress,
  handleContractError,
} from './base-controller';

export enum Status {
  PENDING = 0,
  IN_PROGRESS = 1,
  COMPLETED = 2,
  CANCELED = 3,
}

export const getAusysContract = async (): Promise<LocationContract> => {
  if (!NEXT_PUBLIC_AUSYS_ADDRESS) {
    throw new Error('NEXT_PUBLIC_AUSYS_ADDRESS is undefined');
  }

  // Check if provider and signer are available
  if (!ethersProvider || !signer) {
    console.warn('Wallet not connected. Attempting to initialize provider...');
    try {
      // Try to initialize the provider
      const { provider: newProvider, signer: newSigner } =
        await initializeProvider();
      if (!newProvider || !newSigner) {
        throw new Error('Failed to initialize wallet connection');
      }

      // Provider and signer initialized successfully
      console.log('Provider initialized successfully');
      const contract = LocationContract__factory.connect(
        NEXT_PUBLIC_AUSYS_ADDRESS,
        newSigner,
      );
      return contract;
    } catch (error) {
      console.error('Failed to initialize wallet for contract call:', error);
      throw new Error('Wallet not connected. Please connect your wallet.');
    }
  }

  // Provider and signer already available
  try {
    const contract = LocationContract__factory.connect(
      NEXT_PUBLIC_AUSYS_ADDRESS,
      signer,
    );
    console.log('LocationContract contract fetched successfully.');
    return contract;
  } catch (error) {
    console.error('Error fetching LocationContract contract:', error);
    throw error;
  }
};

export const jobCreation = async (
  senderAddress: string,
  recipientWalletAddress: string,
  locationData: LocationContract.ParcelDataStruct,
  bounty: BigNumberish,
  eta: BigNumberish,
  overrides?: Overrides,
) => {
  try {
    const contract = await getAusysContract();
    const tx = await contract.journeyCreation(
      senderAddress,
      recipientWalletAddress,
      locationData,
      bounty,
      eta,
      { ...overrides },
    );
    const receipt = (await tx.wait()) as ContractTransactionReceipt;
    console.log('Job Creation Transaction Hash:', receipt.hash);
    return receipt;
  } catch (error) {
    handleContractError(error, 'job creation');
  }
};

export const customerPackageSign = async (
  journeyId: string,
  overrides?: Overrides,
) => {
  try {
    const contract = await getAusysContract();
    const journey = await contract.journeyIdToJourney(journeyId);

    // Check if the current user is the receiver of the journey
    const currentUser = getWalletAddress();
    if (journey.receiver.toLowerCase() !== currentUser.toLowerCase()) {
      throw new Error(
        'Customer can only sign for the final leg of the journey',
      );
    }

    const tx = await contract.packageSign(
      journey.driver,
      currentUser,
      journeyId,
      { ...overrides },
    );
    const receipt = (await tx.wait()) as ContractTransactionReceipt;
    return receipt;
  } catch (error) {
    handleContractError(error, 'customer package sign');
  }
};

export const driverPackageSign = async (journeyId: string) => {
  try {
    const contract = await getAusysContract();
    const journey = await contract.journeyIdToJourney(journeyId);
    const tx = await contract.packageSign(
      getWalletAddress(),
      journey.sender,
      journeyId,
    );
    const receipt = (await tx.wait()) as ContractTransactionReceipt;
    return receipt;
  } catch (error) {
    handleContractError(error, 'driver package sign');
  }
};

export const fetchCustomerJobs = async () => {
  const contract = await getAusysContract();
  try {
    const jobNumber =
      await contract.numberOfJourneysCreatedForCustomer(getWalletAddress());
    const journeyIds = [];
    const journeys: LocationContract.JourneyStruct[] = [];

    for (let i = 0; i < jobNumber; i++) {
      try {
        const journeyId = await contract.customerToJourneyId(
          getWalletAddress(),
          i,
        );
        journeyIds.push(journeyId);
      } catch (err) {
        console.error(`Error fetching job with index ${i}:`, err);
      }
    }

    for (const journeyId of journeyIds) {
      try {
        const journey = await contract.journeyIdToJourney(journeyId);
        journeys.push(journey);
      } catch (err) {
        console.error(`Error fetching job object with ID ${journeyId}:`, err);
      }
    }
    return journeys;
  } catch (error) {
    console.error('General error in fetchCustomerJobs:', error);
    return [];
  }
};
export const fetchAllJourneys = async () => {
  try {
    const contract = await getAusysContract();
    const orders = await getOrders();
    console.log('Found orders:', orders);

    // Get unique journey IDs from orders
    const journeyIdsFromOrders = new Set<string>();
    for (const order of orders) {
      if (order.journeyIds && order.journeyIds.length > 0) {
        order.journeyIds.forEach((id) => journeyIdsFromOrders.add(id));
      }
    }

    console.log(
      'Unique journey IDs from orders:',
      Array.from(journeyIdsFromOrders),
    );

    // Get journey details
    const journeys = await Promise.all(
      Array.from(journeyIdsFromOrders).map(async (journeyId) => {
        try {
          const journey = await contract.journeyIdToJourney(journeyId);
          // Validate journey has required fields
          if (
            !journey ||
            !journey.journeyId ||
            journey.journeyId === ethers.ZeroAddress
          ) {
            console.log(`Invalid journey for ID ${journeyId}, skipping`);
            return null;
          }
          return journey;
        } catch (err) {
          console.error(`Error fetching journey ${journeyId}:`, err);
          return null;
        }
      }),
    );

    // Filter out null journeys and validate required fields
    const validJourneys = journeys.filter(
      (journey): journey is LocationContract.JourneyStructOutput => {
        if (!journey) return false;
        const hasRequiredFields =
          journey.journeyId &&
          journey.parcelData &&
          journey.parcelData.startLocation &&
          journey.parcelData.endLocation;
        if (!hasRequiredFields) {
          console.log(
            `Journey ${journey.journeyId} missing required fields, skipping`,
          );
          return false;
        }
        return true;
      },
    );

    console.log(`Found ${validJourneys.length} valid journeys`);
    return validJourneys;
  } catch (error) {
    console.error('Error in fetchAllJourneys:', error);
    return [];
  }
};

export const fetchJourney = async (journeyId: string) => {
  const contract = await getAusysContract();
  const journey = await contract.journeyIdToJourney(journeyId);
  return journey;
};

export const fetchOrderIdFromJourney = async (journeyId: string) => {
  const contract = await getAusysContract();
  const orderId = await contract.journeyToOrderId(journeyId);
  return orderId;
};

export const fetchReceiverJobs = async () => {
  const contract = await getAusysContract();
  try {
    const jobNumber =
      await contract.numberOfJourneysCreatedForReceiver(getWalletAddress());
    const jobs = [];
    const jobsObjList: LocationContract.JourneyStruct[] = [];

    for (let i = 0; i < jobNumber; i++) {
      try {
        const job = await contract.receiverToJourneyId(getWalletAddress(), i);
        jobs.push(job);
      } catch (err) {
        console.error(`Error fetching journeyId with index ${i}:`, err);
      }
    }

    for (const journeyId of jobs) {
      try {
        const jobsObj = await contract.journeyIdToJourney(journeyId);
        jobsObjList.push(jobsObj);
      } catch (err) {
        console.error(
          `Error fetching job object with journeyId ${journeyId}:`,
          err,
        );
      }
    }
    return jobsObjList;
  } catch (error) {
    console.error('General error in fetchReceiverJobs:', error);
    return [];
  }
};

export const fetchAllJourneyIds = async () => {
  const contract = await getAusysContract();
  const journeyIds: string[] = [];
  try {
    console.log('Fetching journey IDs from numberToJourneyID mapping...');

    let i = 0;
    const MAX_ATTEMPTS = 50; // Reasonable limit to prevent infinite loops

    while (i < MAX_ATTEMPTS) {
      try {
        console.log(`Trying to fetch journey ID at index ${i}...`);
        const journeyId = await contract.numberToJourneyID(i);

        // Check if we got a valid journey ID (not empty bytes32)
        if (
          journeyId &&
          journeyId !==
            '0x0000000000000000000000000000000000000000000000000000000000000000'
        ) {
          console.log(`Found valid journey ID at index ${i}: ${journeyId}`);
          journeyIds.push(journeyId);
        } else {
          console.log(`Empty or zero journey ID at index ${i}, skipping`);
        }

        i++;
      } catch (error: any) {
        // Break if we hit an error (likely reached end of list)
        console.log(
          `Error at index ${i}, likely reached end of list: ${error.message}`,
        );
        break;
      }
    }

    if (i >= MAX_ATTEMPTS) {
      console.warn(
        `Reached maximum attempts (${MAX_ATTEMPTS}) when fetching journey IDs`,
      );
    }

    console.log(
      `Found ${journeyIds.length} journey IDs via numberToJourneyID mapping`,
    );
  } catch (error) {
    console.error('Error in fetchAllJourneyIds:', error);
  }

  return journeyIds;
};

export const checkIfDriverAssignedToJobId = async (journeyId: string) => {
  const contract = await getAusysContract();
  try {
    const journey = await contract.journeyIdToJourney(journeyId);
    return journey.driver !== ethers.ZeroAddress;
  } catch (error) {
    handleContractError(error, 'check driver assignment');
  }
};

export const assignDriverToJobId = async (journeyId: string) => {
  const contract = await getAusysContract();
  try {
    const tx = await contract.assignDriverToJourneyId(
      getWalletAddress(),
      journeyId,
    );
    const receipt = (await tx.wait()) as ContractTransactionReceipt;
    return receipt;
  } catch (error) {
    handleContractError(error, 'assign driver to job');
  }
};

export const packageHandOn = async (
  customerAddress: string,
  driverAddress: string,
  journeyId: string,
) => {
  const contract = await getAusysContract();
  try {
    const tx = await contract.handOn(driverAddress, customerAddress, journeyId);
    const receipt = (await tx.wait()) as ContractTransactionReceipt;
    return receipt;
  } catch (error) {
    handleContractError(error, 'package hand on');
  }
};

export const packageHandOff = async (
  customerAddress: string,
  driverAddress: string,
  journeyId: BytesLike,
  token: AddressLike,
) => {
  const contract = await getAusysContract();
  try {
    const tx = await contract.handOff(
      driverAddress,
      customerAddress,
      journeyId,
      token,
    );
    const receipt = (await tx.wait()) as ContractTransactionReceipt;
    return receipt;
  } catch (error) {
    handleContractError(error, 'package hand off');
  }
};

export async function customerMakeOrder(
  orderData: LocationContract.OrderStruct,
) {
  try {
    const walletAddress = await getWalletAddress();
    console.log('got wallet address', walletAddress);
    if (!walletAddress) throw new Error('Wallet not connected');

    // Validate node address
    if (!orderData.nodes || orderData.nodes.length === 0) {
      throw new Error('No node address provided');
    }

    // Ensure node address is valid
    const nodeAddress = ethers.getAddress(String(orderData.nodes[0]));
    if (!nodeAddress) {
      throw new Error('Invalid node address');
    }

    // Make static call to orderCreation
    const contract = await getAusysContract();
    const result = await contract.orderCreation(orderData);
    console.log('Order creation result:', result);

    // Execute the transaction
    console.log('executing order journey creation');
    const tx = await contract.orderJourneyCreation(
      orderData.id,
      walletAddress,
      nodeAddress,
      orderData.locationData,
      orderData.price,
      orderData.txFee,
      orderData.tokenQuantity,
    );
    const receipt = await tx.wait();
    console.log('Order creation transaction:', receipt);

    return receipt;
  } catch (error) {
    console.error('Error in customerMakeOrder:', error);
    throw error;
  }
}

export const addReceiver = async (
  orderId: BytesLike,
  receiver: string,
  sender: string,
  overrides?: Overrides,
) => {
  const contract = await getAusysContract();
  try {
    const tx = await contract.addReceiver(orderId, receiver, sender, {
      ...overrides,
    });
    const receipt = (await tx.wait()) as ContractTransactionReceipt;
    return receipt;
  } catch (error) {
    handleContractError(error, 'add receiver');
  }
};

export const orderJourneyCreation = async (
  orderId: BytesLike,
  sender: string,
  receiver: string,
  parcelData: LocationContract.ParcelDataStruct,
  bounty: bigint,
  eta: bigint,
  tokenQuantity: bigint,
) => {
  const contract = await getAusysContract();
  try {
    const tx = await contract.orderJourneyCreation(
      orderId,
      sender,
      receiver,
      parcelData,
      bounty,
      eta,
      tokenQuantity,
    );
    const receipt = (await tx.wait()) as ContractTransactionReceipt;
    return receipt;
  } catch (error) {
    handleContractError(error, 'create order journey');
  }
};

export const getJourney = async (journeyId: BytesLike) => {
  const contract = await getAusysContract();
  try {
    const journey = await contract.getjourney(journeyId);
    return journey;
  } catch (error) {
    handleContractError(error, 'get journey');
  }
};

export const getOrders = async (): Promise<
  LocationContract.OrderStructOutput[]
> => {
  const contract = await getAusysContract();
  const walletAddress = await getWalletAddress();
  console.log('Fetching orders for wallet:', walletAddress);

  let indexing = true;
  let orderCount = 0;
  const orderList: LocationContract.OrderStructOutput[] = [];
  console.log('beginning of indexing');
  while (indexing) {
    try {
      const id = await contract.orderIds(orderCount);
      console.log('Found order ID:', id);
      const order = await contract.getOrder(id);
      console.log('Order details:', {
        id,
        customer: order.customer,
        currentWallet: walletAddress,
        matches: order.customer.toLowerCase() === walletAddress.toLowerCase(),
      });

      // Only include orders where the current wallet is the customer
      if (order.customer.toLowerCase() === walletAddress.toLowerCase()) {
        orderList.push(order);
      }
      orderCount++;
    } catch (e) {
      console.log('End of order list reached at count:', orderCount);
      indexing = false;
    }
  }

  console.log('Total orders found:', orderList.length);
  return orderList;
};

export const getOrder = async (orderId: BytesLike) => {
  const contract = await getAusysContract();
  try {
    const order = await contract.getOrder(orderId);
    return order;
  } catch (error) {
    handleContractError(error, 'failed to get order');
  }
};

// New function to specifically execute the orderCreation transaction
export const contractCreateOrderTransaction = async (
  orderData: LocationContract.OrderStruct,
  overrides?: Overrides,
): Promise<ContractTransactionReceipt | undefined> => {
  try {
    const contract = await getAusysContract();
    console.log('Executing orderCreation transaction...');
    const tx = await contract.orderCreation(orderData, { ...overrides });
    const receipt = await tx.wait(); // Initial wait
    // Add another wait just in case state propagation is slow (unlikely but worth trying)
    if (receipt) {
      await tx.wait(1); // Wait for 1 confirmation block
    }
    console.log('orderCreation transaction successful:', receipt?.hash);
    return receipt as ContractTransactionReceipt;
  } catch (error) {
    handleContractError(error, 'order creation transaction');
  }
};

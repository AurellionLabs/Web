import {
  AddressLike,
  BigNumberish,
  BytesLike,
  ContractTransactionReceipt,
  Signer,
  ethers,
} from 'ethers';
import { LocationContract, LocationContract__factory } from '@/typechain-types';
import { NEXT_PUBLIC_AUSYS_ADDRESS } from '@/chain-constants';
import {
  ethersProvider,
  signer,
  getWalletAddress,
  handleContractError,
  walletAddress,
} from './base-controller';

export enum Status {
  PENDING = 0,
  IN_PROGRESS = 1,
  COMPLETED = 2,
  CANCELED = 3,
}

const getAusysContract = async (): Promise<LocationContract> => {
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
  locationData: LocationContract.ParcelDataStruct,
  recipientWalletAddress: string,
) => {
  try {
    const contract = await getAusysContract();
    const tx = await contract.journeyCreation(
      getWalletAddress(),
      recipientWalletAddress,
      locationData,
      1,
      10,
    );
    const receipt = (await tx.wait()) as ContractTransactionReceipt;
    console.log('Job Creation Transaction Hash:', receipt.hash);
    return receipt;
  } catch (error) {
    handleContractError(error, 'job creation');
  }
};

export const customerPackageSign = async (journeyId: string) => {
  try {
    const contract = await getAusysContract();
    const journey = await contract.journeyIdToJourney(journeyId);
    const tx = await contract.packageSign(
      journey.driver,
      getWalletAddress(),
      journeyId,
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
      journey.receiver,
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

    // Try first using the fetchAllJourneyIds approach
    const journeyIds = await fetchAllJourneyIds();
    console.log('Found journey IDs:', journeyIds);

    if (journeyIds.length === 0) {
      console.log(
        'No journeys found via numberToJourneyID, trying to get from orders...',
      );

      // If no journeys found, try getting from orders
      const orders = await getOrders();
      console.log('Found orders:', orders);

      // Collect all journeyIds from orders
      const journeyIdsFromOrders: string[] = [];
      for (const order of orders) {
        if (order.journeyIds && order.journeyIds.length > 0) {
          journeyIdsFromOrders.push(...order.journeyIds);
        }
      }

      console.log('Journey IDs from orders:', journeyIdsFromOrders);

      // Get journey details
      const journeysFromOrders = await Promise.all(
        journeyIdsFromOrders.map(async (journeyId) => {
          try {
            return await contract.journeyIdToJourney(journeyId);
          } catch (err) {
            console.error(`Error fetching journey ${journeyId}:`, err);
            return null;
          }
        }),
      );

      // Filter out null journeys
      return journeysFromOrders.filter((journey) => journey !== null);
    }

    // Get journey details using original approach
    const journeys = await Promise.all(
      journeyIds.map(async (journeyId) => {
        try {
          const journey = await contract.journeyIdToJourney(journeyId);
          return journey;
        } catch (err) {
          console.error(`Error fetching journey ${journeyId}:`, err);
          return null;
        }
      }),
    );

    return journeys.filter((journey) => journey !== null);
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

export const customerMakeOrder = async (
  orderData: LocationContract.OrderStruct,
) => {
  const contract = await getAusysContract();
  try {
    // Get the wallet address first
    const currentWalletAddress = getWalletAddress();
    if (!currentWalletAddress) {
      throw new Error('Wallet not connected or address not available');
    }

    // Call orderCreation and get the transaction
    const txResponse = await contract.orderCreation.staticCall(orderData);
    console.log('Static call result (orderId):', txResponse);

    // Now execute the actual transaction
    const tx = await contract.orderCreation(orderData);
    await tx.wait();

    // Use the orderId we got from the static call
    const orderId = txResponse;

    console.log('creating first journey with orderId:', orderId);

    // Check if nodes array exists and has at least one element
    if (!orderData.nodes || orderData.nodes.length === 0) {
      throw new Error('Order data must include at least one node');
    }

    // Make sure all parameters are valid
    const nodeAddress = orderData.nodes[0];
    if (!nodeAddress || nodeAddress === ethers.ZeroAddress) {
      throw new Error('Invalid node address');
    }

    console.log('Node address:', nodeAddress);
    console.log('Wallet address:', currentWalletAddress);
    console.log('Location data:', orderData.locationData);
    console.log('Token quantity:', orderData.tokenQuantity);

    const tx2 = await contract.orderJourneyCreation(
      orderId,
      nodeAddress,
      currentWalletAddress,
      orderData.locationData,
      1n,
      10n,
      orderData.tokenQuantity,
    );
    const receipt2 = (await tx2.wait()) as ContractTransactionReceipt;
    console.log('executed second tx', receipt2);
    return receipt2;
  } catch (error) {
    console.error('Error details:', error);
    handleContractError(error, 'make customer order');
  }
};

export const addReceiver = async (
  orderId: BytesLike,
  receiver: string,
  sender: string,
) => {
  const contract = await getAusysContract();
  try {
    const tx = await contract.addReceiver(orderId, receiver, sender);
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
  let indexing = true;
  let orderCount = 0;
  const orderList: LocationContract.OrderStructOutput[] = [];

  while (indexing) {
    try {
      const id = await contract.orderIds(orderCount);
      const order = await contract.getOrder(id);
      orderList.push(order);
      orderCount++;
    } catch (e) {
      console.log('likely at end of list', e);
      indexing = false;
    }
  }
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

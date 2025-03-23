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
} from './base-controller';

export enum Status {
  PENDING = 0,
  IN_PROGRESS = 1,
  COMPLETED = 2,
  CANCELED = 3,
}

const getAusysContract = async (): Promise<LocationContract> => {
  if (!ethersProvider || !signer) {
    throw new Error('Wallet not connected. Please connect your wallet.');
  }
  if (!NEXT_PUBLIC_AUSYS_ADDRESS) {
    throw new Error('NEXT_PUBLIC_AUSYS_ADDRESS is undefined');
  }
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
  const contract = await getAusysContract();
  const journeyIds = await fetchAllJourneyIds();
  const journeys = await Promise.all(
    journeyIds.map(async (journeyId) => {
      const journey = await contract.journeyIdToJourney(journeyId);
      return journey;
    }),
  );
  return journeys;
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
    let i = 0;
    while (true) {
      const journey = await contract.numberToJourneyID(i);
      journeyIds.push(journey);
      i++;
    }
  } catch (error) {
    handleContractError(error, 'likely at end of list');
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
    const tx = await contract.orderCreation(orderData);
    const receipt = (await tx.wait()) as ContractTransactionReceipt;
    return receipt;
  } catch (error) {
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

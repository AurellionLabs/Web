import { AddressLike, BigNumberish, BytesLike, ContractTransactionReceipt, Signer, ethers } from "ethers";
import { LocationContract, LocationContract__factory } from "@/typechain-types";
import { NEXT_PUBLIC_LOCATION_CONTRACT_ADDRESS } from "@/chain-constants";
import { ethersProvider, signer, walletAddress, handleContractError } from "./base-controller";

export enum Status {
    PENDING = 0,
    IN_PROGRESS = 1,
    COMPLETED = 2,
    CANCELED = 3,
}

const getAusysContract = async (): Promise<LocationContract> => {
    if (!ethersProvider || !signer) {
        throw new Error("Wallet not connected. Please connect your wallet.");
    }
    if (!NEXT_PUBLIC_LOCATION_CONTRACT_ADDRESS) {
        throw new Error("NEXT_PUBLIC_LOCATION_CONTRACT_ADDRESS is undefined");
    }
    try {
        const contract = LocationContract__factory.connect(NEXT_PUBLIC_LOCATION_CONTRACT_ADDRESS, signer);
        console.log("LocationContract contract fetched successfully.");
        return contract;
    } catch (error) {
        console.error("Error fetching LocationContract contract:", error);
        throw error;
    }
};

export const jobCreation = async (
    locationData: LocationContract.ParcelDataStruct,
    recipientWalletAddress: string
) => {
    try {
        const contract = await getAusysContract();
        const tx = await contract.journeyCreation(
            walletAddress,
            recipientWalletAddress,
            locationData,
            1,
            10
        );
        const receipt = await tx.wait() as ContractTransactionReceipt;
        console.log("Job Creation Transaction Hash:", receipt.hash);
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
            walletAddress,
            journeyId
        );
        const receipt = await tx.wait() as ContractTransactionReceipt;
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
            walletAddress,
            journey.receiver,
            journeyId
        );
        const receipt = await tx.wait() as ContractTransactionReceipt;
        return receipt;
    } catch (error) {
        handleContractError(error, 'driver package sign');
    }
};

export const fetchCustomerJobs = async () => {
    const contract = await getAusysContract();
    try {
        const jobNumber = await contract.numberOfJourneysCreatedForCustomer(walletAddress);
        const journeyIds = [];
        const journeys: LocationContract.JourneyStruct[] = [];

        for (let i = 0; i < jobNumber; i++) {
            try {
                const journeyId = await contract.customerToJourneyId(walletAddress, i);
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
        console.error("General error in fetchCustomerJobs:", error);
        return [];
    }
};

export const fetchReceiverJobs = async () => {
    const contract = await getAusysContract();
    try {
        const jobNumber = await contract.numberOfJourneysCreatedForReceiver(walletAddress);
        const jobs = [];
        const jobsObjList: LocationContract.JourneyStruct[] = [];

        for (let i = 0; i < jobNumber; i++) {
            try {
                const job = await contract.receiverToJourneyId(walletAddress, i);
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
                console.error(`Error fetching job object with journeyId ${journeyId}:`, err);
            }
        }
        return jobsObjList;
    } catch (error) {
        console.error("General error in fetchReceiverJobs:", error);
        return [];
    }
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
        const tx = await contract.assignDriverToJourneyId(walletAddress, journeyId);
        const receipt = await tx.wait() as ContractTransactionReceipt;
        return receipt;
    } catch (error) {
        handleContractError(error, 'assign driver to job');
    }
};

export const packageHandOn = async (
    customerAddress: string,
    driverAddress: string,
    journeyId: string
) => {
    const contract = await getAusysContract();
    try {
        const tx = await contract.handOn(driverAddress, customerAddress, journeyId);
        const receipt = await tx.wait() as ContractTransactionReceipt;
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
        const tx = await contract.handOff(driverAddress, customerAddress, journeyId, token);
        const receipt = await tx.wait() as ContractTransactionReceipt;
        return receipt;
    } catch (error) {
        handleContractError(error, 'package hand off');
    }
};

export const customerMakeOrder = async (orderData: LocationContract.OrderStruct) => {
    const contract = await getAusysContract();
    try {
        const tx = await contract.orderCreation(orderData);
        const receipt = await tx.wait() as ContractTransactionReceipt;
        return receipt;
    } catch (error) {
        handleContractError(error, 'make customer order');
    }
};

export const addReceiver = async (
    orderId: BytesLike,
    receiver: string,
    sender: string
) => {
    const contract = await getAusysContract();
    try {
        const tx = await contract.addReceiver(orderId, receiver, sender);
        const receipt = await tx.wait() as ContractTransactionReceipt;
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
    tokenQuantity: bigint
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
            tokenQuantity
        );
        const receipt = await tx.wait() as ContractTransactionReceipt;
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
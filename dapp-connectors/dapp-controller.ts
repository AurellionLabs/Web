import { AddressLike, BigNumberish, BrowserProvider, BytesLike, Contract, Signer, ethers } from "ethers";
//import {  Journey, ResourceData, Order } from "@/constants/Types";

import { AurumNode, AurumNode__factory, AurumNodeManager, AurumNodeManager__factory, LocationContract, LocationContract__factory } from "@/typechain-types";
import { NEXT_PUBLIC_LOCATION_CONTRACT_ADDRESS } from "@/chain-constants";
import { AurumNodeInterface } from "@/typechain-types/contracts/Aurum.sol/AurumNode";
var ethersProvider: BrowserProvider | undefined;
const NODE_MANAGER_ADDRESS =
    process.env.EXPO_PUBLIC_NODE_MANAGER_CONTRACT_ADDRESS;
export const GOAT_CONTRACT_ADDRESS =
    process.env.EXPO_PUBLIC_GOAT_CONTRACT_ADDRESS;
export var walletAddress: string;
export type ResourceData = {
    id: bigint
    amount: bigint
}
export enum Status {
  PENDING = 0,
  IN_PROGRESS = 1,
  COMPLETED = 2,
  CANCELED = 3,
}

export const setWalletProvider = async (_ethersProvider: BrowserProvider) => {
    console.log("heeeeeeeeeeeeeeeere");
    var signer: Signer | undefined;
    console.log("ethers provider param", _ethersProvider);
    ethersProvider = _ethersProvider;
    // this will console log as empty {} but it actually does definitely exist
    console.log("here");
    console.log("ethers provider in dapp controller", ethersProvider);
    try {
        if (ethersProvider)
            try {
                signer = await ethersProvider.getSigner();
                walletAddress = await signer.getAddress();
                console.log("signer set");
            } catch (e) {
                throw new Error("getSigner failed with " + e);
            }
        else console.error("ethersProvider is underfined");
        if (!signer) throw new Error("Signer is undefined");
        walletAddress = await signer.getAddress();
    } catch (error) {
        console.error(
            `failed to set address:${walletAddress} \n error: ${error} \n provider: ${ethersProvider}`
        );
    }
};

const getAurumContract = async (): Promise<AurumNodeManager> =>
    new Promise(async (resolve, reject) => {
        console.log("here");
        var signer: Signer | undefined;

        try {
            if (ethersProvider)
                try {
                    signer = await ethersProvider.getSigner();
                } catch (e) {
                    throw new Error("getSigner failed with " + e);
                }
            else
                console.error(
                    "ethersProvider is underfined ethersProvider:",
                    ethersProvider
                );
            if (!signer) throw new Error("Signer is undefined");
            if (!NODE_MANAGER_ADDRESS)
                throw new Error("NODE_MANAGER_ADDRESS is undefined");
            const contract = AurumNodeManager__factory.connect(NODE_MANAGER_ADDRESS, signer)
            console.log("Manager Address", NODE_MANAGER_ADDRESS);
            const walletAddress = await signer.getAddress();
            console.log(walletAddress);
            console.log("calling function");
            resolve(contract);
        } catch (error) {
            console.error("Error fetching contract:", error);
            reject(error);
        }
    });

const getAurumNodeContract = async (address: string): Promise<AurumNode> =>
    new Promise(async (resolve, reject) => {
        console.log("here");
        var signer: Signer | undefined;

        try {
            if (ethersProvider)
                try {
                    signer = await ethersProvider.getSigner();
                } catch (e) {
                    throw new Error("getSigner failed with " + e);
                }
            else
                console.error(
                    "ethersProvider is underfined ethersProvider:",
                    ethersProvider
                );
            if (!signer) throw new Error("Signer is undefined");
            if (!NODE_MANAGER_ADDRESS)
                throw new Error("NODE_MANAGER_ADDRESS is undefined");
            const contract = AurumNode__factory.connect(address, signer);
            console.log("Manager Address", NODE_MANAGER_ADDRESS);
            const walletAddress = await signer.getAddress();
            console.log(walletAddress);
            console.log("calling function");
            resolve(contract);
        } catch (error) {
            console.error("Error fetching contract:", error);
            reject(error);
        }
    });
const getAusysContract = async (): Promise<LocationContract> =>
    new Promise(async (resolve, reject) => {
        console.log("here");
        var signer: Signer | undefined;
        try {
            if (ethersProvider)
                try {
                    signer = await ethersProvider.getSigner();
                } catch (e) {
                    throw new Error("getSigner failed with " + e);
                }
            else throw new Error("ethersProvider is underfined");
            if (!signer) throw new Error("Signer is undefined");
            if (!NEXT_PUBLIC_LOCATION_CONTRACT_ADDRESS) throw new Error("NEXT_PUBLIC_LOCATION_CONTRACT_ADDRESS is undefined");
            const contract = LocationContract__factory.connect(NEXT_PUBLIC_LOCATION_CONTRACT_ADDRESS, signer);
            resolve(contract);
            console.log("Ausys Address", NEXT_PUBLIC_LOCATION_CONTRACT_ADDRESS);
        } catch (error) {
            console.error(
                "Error when tring to initialise Ausys contract object:",
                error
            );
            reject(error);
        }
    });
export const loadAvailableAssets = async () => {
    console.log("here");
    const contract = await getAurumContract();
    try {
        console.log("Manager Address", NODE_MANAGER_ADDRESS);
        console.log(walletAddress);
        console.log("calling function");
        var x;
        var count = 0;
        var assetList: ResourceData[] = []
        while (x == true) {
            count++;
            try {
                var id = await contract.resourceList(count)
                var amount = await contract.supplyPerResource(id)
                var asset: ResourceData = { id, amount }
                assetList.push(asset)
            } catch (e) {
                console.error("probably end of list", e)
                x = false
            }
        }
        return assetList;
    } catch (error) {
        console.error("Error in asset search:", error);
        throw error;
    }
};
// Node Functions:
export const registerNode = async (nodeData: AurumNodeManager.NodeStruct) => {
    const contract = await getAurumContract();
    try {
        await contract.registerNode(nodeData);
    } catch (error) {
        console.error("Error when registering node:", error);
        throw error;
    }
};

export const addItem = async (
    node: string,
    itemOwner: AddressLike,
    id: BytesLike,
    weight: BigNumberish,
    item: AddressLike,
    amount: number,
    data: any
) => {
    const contract = await getAurumNodeContract(node);
    try {
        await contract.addItem(itemOwner, id, weight, amount, item, data);
    } catch (error) {
        console.error("Error when registering node:", error);
    }
};

export const updateOwner = async (node: string) => {
    const contract = await getAurumContract();
    try {
        await contract.updateOwner(walletAddress, node);
    } catch (error) {
        console.error(
            `unable to updateOwner for wallet address ${walletAddress} and node: ${node}`
        );
    }
};

export const updateSupportedAssets = async (
    supportedAssetsList: number[],
    capacity: number[],
    nodeAddress: string
) => {
    const contract = await getAurumContract();
    try {
        await contract.updateSupportedAssets(
            nodeAddress,
            supportedAssetsList,
            capacity
        );
    } catch (error) {
        console.error(
            `unable to updateSupportedAssets for node address: ${walletAddress} and capacity: ${capacity} nodeAddress: ${nodeAddress}`
        );
    }
};

export const updateLocation = async (location: AurumNodeManager.NodeLocationDataStruct, node: string) => {
    const contract = await getAurumContract();
    try {
        await contract.updateLocation(location, node);
    } catch (error) {
        console.error(
            `unable to updateLocation for location: ${location} and node: ${node}`
        );
    }
};

export const getNode = async (nodeAddress: string): Promise<AurumNodeManager.NodeStruct> => {
    const contract = await getAurumContract();
    try {
        const nodeData = await contract.getNode(nodeAddress);
        return {
            location: nodeData.location,
            validNode: nodeData.validNode,
            owner: nodeData.owner,
            supportedAssets: nodeData.supportedAssets.map((assetId: bigint) =>
                Number(assetId)
            ),
            status: nodeData.status,
            capacity: nodeData.capacity.map((cap: bigint) => Number(cap)),
        };
    } catch (error) {
        console.error(`Unable to get node with address ${nodeAddress}:`, error);
        throw error;
    }
};

// As of current implmenetation, one wallet address will own one node
// Therefore length of nodeAddressList is 1
export const getOwnedNodeAddressList = async (): Promise<string[]> => {
    const contract = await getAurumContract();
    try {
        var x = true;
        var counter = 0;
        const nodeAddressList: string[] = []
        try {
            while (x == true) {
                nodeAddressList.push(await contract.ownedNodes(walletAddress, counter))
                counter++;
            }
        } catch (e) {
            console.error("probably end of list", e)
            return nodeAddressList
        }
        return nodeAddressList;
    } catch (error) {
        console.log(
            `Unable to get nodes addresses for owner address ${walletAddress}`,
            error
        );
        throw error;
    }
};

export const updateStatus = async (node: string, status: BytesLike) => {
    const contract = await getAurumContract();
    try {
        await contract.updateStatus(status, node);
    } catch (error) {
        console.error(`unable to updateStatus for node${node}`);
    }
};
export const nodeHandOff = async (
    node: string,
    driver: string,
    reciever: string,
    id: string,
    tokenIds: number[],
    token: string,
    quantities: number[],
    data: any
) => {
    const contract = await getAurumNodeContract(node);
    try {
        await contract.nodeHandoff(
            node,
            driver,
            reciever,
            id,
            tokenIds,
            token,
            quantities,
            data
        );
    } catch (error) {
        console.error(
            `unable nodeHandoff for node${node} driver: ${driver}, reciever: ${reciever}, id:${id} tokenIDs:  ${tokenIds} token: ${token} quantities: ${quantities} data: ${data}`,
            error
        );
    }
};

export const nodeHandOn = async (
    node: string,
    driver: string,
    reciever: string,
    id: string
) => {
    const contract = await getAurumNodeContract(node);
    try {
        await contract.nodeHandOn(driver, reciever, id);
    } catch (error) {
        console.error(
            `unable to updateStatus for node: ${driver} reciever: ${reciever} id: ${id}}`,
            error
        );
    }
};

export const fetchNodeOrders = async (): Promise<LocationContract.OrderStruct[]> => {
    const contract = await getAusysContract();
    var x = true
    var counter = 0;
    var orderIdList = [];
    var orders: LocationContract.OrderStruct[] = [];
    try {
        while (x == true) {
            try {
                orderIdList.push(await contract.nodeToOrderIds(walletAddress, counter))
            } catch (e) {
                x = false
                console.error("probably end of list", e)
            }

        }

        orderIdList.map(async (orderId: string) => {
            let order = await contract.idToOrder(orderId)
            orders.push(order)
        })

        return orders;
    } catch (error) {
        console.error(
            `Unable to get node orders for node address: ${walletAddress}`,
            error
        );
        throw error
    }
};

export const fetchNodeAvailableOrders = async (): Promise<LocationContract.OrderStruct[]> => {
    const contract = await getAusysContract();
    var x = true;
    var counter = 0;
    var orderIdList: string[] = [];

    try {
        while (x == true) {
            try {
                orderIdList.push(await contract.nodeToOrderIds(walletAddress, counter));
                counter++;
            } catch (e) {
                x = false;
                console.error("probably end of list", e);
            }
        }

        const pendingOrders = await Promise.all(
            orderIdList.map(async (orderId: string) => {
                const order: LocationContract.OrderStruct = await contract.idToOrder(orderId);
                return order.currentStatus === Status.PENDING ? order : undefined;
            })
        );

        // Filter out undefined values and explicitly type the result
        return pendingOrders.filter((order): order is LocationContract.OrderStruct =>
            order !== undefined
        );
    } catch (error) {
        console.error(
            'Unable to get available orders',
            error
        );
        throw error;
    }
};
export const fetchCustomerOrders = async (): Promise<LocationContract.OrderStruct[]> => {
    const contract = await getAusysContract();
    var x = true;
    var counter = 0;
    var orderIdList: string[] = [];

    try {
        while (x == true) {
            try {
                orderIdList.push(await contract.customerToOrderIds(walletAddress, counter));
                counter++;
            } catch (e) {
                x = false;
                console.error("probably end of list", e);
            }
        }

        const orders = await Promise.all(
            orderIdList.map(async (orderId: string) => {
                const order: LocationContract.OrderStruct = await contract.idToOrder(orderId);
                return order;
            })
        );

        return orders;
    } catch (error) {
        console.error(
            `Unable to get customer orders for customer address: ${walletAddress}`,
            error
        );
        throw error;
    }
};
// Ausys

export const jobCreation = async (
    locationData: LocationContract.ParcelDataStruct,
    recipientWalletAddress: string
) => {
    try {
        const contract = await getAusysContract();
        const jobTx = await contract.journeyCreation(
            walletAddress,
            recipientWalletAddress,
            locationData,
            1,
            10
        );
        console.log(jobTx);
        const receipt = await jobTx.wait();
        console.log("Job Creation Transaction Hash:");
        console.log("success");
    } catch (error) {
        console.error("Error in jobCreation:", error);
        throw error;
    }
};

export const customerPackageSign = async (journeyId: string) => {
    try {
        const contract = await getAusysContract();
        const journey = await contract.journeyIdToJourney(journeyId);
        const customerPackageSignTx = await contract.packageSign(
            journey.driver,
            walletAddress,
            journeyId
        );
        const receipt = await customerPackageSignTx.wait();
        console.log(receipt);
    } catch (error) {
        console.error("Error in customerPackageSign:", error);
        throw error;
    }
};

export const driverPackageSign = async (journeyId: string) => {
    try {
        const contract = await getAusysContract();
        const journey = await contract.journeyIdToJourney(journeyId);
        const driverPackageSignTx = await contract.packageSign(
            walletAddress,
            journey.receiver,
            journeyId
        );
        const receipt = await driverPackageSignTx.wait();
        console.log(receipt);
    } catch (error) {
        console.error("Error in driverPackageSign:", error);
        throw error;
    }
};

export const fetchCustomerJobs = async () => {
    const journeyIds = [];
    const journeys: LocationContract.JourneyStruct[] = [];
    const contract = await getAusysContract();
    try {
        let jobNumber;
        try {
            jobNumber = await contract.numberOfJourneysCreatedForCustomer(walletAddress);
        } catch (error) {
            console.log(walletAddress);
            console.error(
                "Error fetching number of jobs created with walletAddress",
                walletAddress,
                "Error:",
                error
            );
            throw error;
        }
        jobNumber = await contract.numberOfJourneysCreatedForCustomer(walletAddress);

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
        return []; // Return an empty array in case of an error
    }
};

export const fetchReceiverJobs = async () => {
    var signer: Signer | undefined;
    const contract = await getAusysContract();
    try {
        let jobNumber;
        try {
            jobNumber = await contract.numberOfJourneysCreatedForReceiver(walletAddress);
        } catch (error) {
            console.error(
                "Error fetching number of jobs for receiver with wallet address",
                walletAddress,
                "Error:",
                error
            );
            throw error;
        }
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
                console.error(
                    `Error fetching job object with journeyId ${journeyId}:`,
                    err
                );
            }
        }
        return jobsObjList;
    } catch (error) {
        console.error("General error in fetchReceiverJobs:", error);
        return []; // Return an empty array in case of an error
    }
};

export const checkIfDriverAssignedToJobId = async (journeyId: string) => {
    const contract = await getAusysContract();
    try {
        const journey = await contract.journeyIdToJourney(journeyId);
        const isAssigned = journey.driver === ethers.ZeroAddress ? false : true;
        return isAssigned;
    } catch (error) {
        console.error("Error in checkIfDriverAssignedToJobId:", error);
        throw error;
    }
};

export const assignDriverToJobId = async (journeyId: string) => {
    const contract = await getAusysContract();
    try {
        const assignDriverToJobIdTx = await contract.assignDriverToJourneyId(
            walletAddress,
            journeyId
        );
        const receipt = await assignDriverToJobIdTx.wait();
        console.log(receipt);
    } catch (error) {
        console.error("Error in assignDriverToJobId:", error);
        throw error;
    }
};

export const fetchDriverUnassignedJourneys = async () => {
    const journeyIds: string[] = [];
    const journeys: LocationContract.JourneyStruct[] = [];
    let totalJobsCount;
    let journeyId: string | null = null;
    const contract = await getAusysContract();
    let journey: LocationContract.JourneyStruct | null = null;
    try {
        totalJobsCount = await contract.journeyIdCounter();
    } catch (error) {
        console.error("Could not get total jobs count from blockchain");
        throw error;
    }
    // Index starts with 1 beca  smart contract jobIdCounter starts at 1
    for (let i = 1; i <= totalJobsCount; i++) {
        try {
            journeyId = await contract.numberToJourneyID(i);
        } catch (error) {
            console.error(`No journeyId exists at index ${i}`);
        }
        if (journeyId) {
            journeyIds.push(journeyId);
        }
    }
    for (let i = 0; i < journeyIds.length; i++) {
        try {
            journey = await contract.journeyIdToJourney(journeyIds[i]);
        } catch (error) {
            console.error(`Error retrieving journey from journeyId ${journeyIds[i]}`);
        }
        if (journey) {
            const isAssigned = journey.driver === ethers.ZeroAddress ? false : true;
            if (!isAssigned) {
                journeys.push(journey);
            }
        } else {
            console.error("journey doesnt exist");
        }
    }
    return journeys;
};

export const fetchDriverAssignedJourneys = async () => {
    const journeyIds: string[] = [];
    const journeys: LocationContract.JourneyStruct[] = [];
    let journeyId: string | null = null;
    let journey: LocationContract.JourneyStruct;
    var numberOfJobsAssignedForDriver;
    const contract = await getAusysContract();
    try {
        numberOfJobsAssignedForDriver = await contract.numberOfJourneysAssigned(
            walletAddress
        );
    } catch (error) {
        console.error("Could not get number of jobs assigned to driver");
        throw error;
    }
    for (let i = 0; i < numberOfJobsAssignedForDriver; i++) {
        try {
            journeyId = await contract.driverToJourneyId(walletAddress, i);
        } catch (error) {
            console.error(`No journeyId exists at index ${i} for driver`);
        }
        if (journeyId) {
            journeyIds.push(journeyId);
        }
    }
    for (let i = 0; i < journeyIds.length; i++) {
        try {
            journey = await contract.journeyIdToJourney(journeyIds[i]);
            journeys.push(journey);
        } catch (error) {
            console.error(`Error retrieving journey from journeyId ${journeyIds[i]}`);
        }
    }
    return journeys;
};

export const packageHandOn = async (
    customerAddress: string,
    driverAddress: string,
    journeyId: string
) => {
    const contract = await getAusysContract();
    var handOnSuccessful;
    try {
        handOnSuccessful = await contract.handOn(
            driverAddress,
            customerAddress,
            journeyId
        );
    } catch (error) {
        console.error("Could not call contract handOn");
        throw error;
    }
    return handOnSuccessful;
};

export const packageHandOff = async (
    customerAddress: string,
    driverAddress: string,
    journeyId: BytesLike,
    token: AddressLike,
) => {
    var handOffSuccessful;
    const contract = await getAusysContract();
    try {
        handOffSuccessful = await contract.handOff(
            driverAddress,
            customerAddress,
            journeyId,
            token
        );
    } catch (error) {
        console.error("Could not call contract handOff");
        throw error;
    }
    return handOffSuccessful;
};

export const jobIdToJourney = async (journeyId: string) => {
    var signer: Signer | undefined;
    if (ethersProvider) signer = await ethersProvider.getSigner();
    else console.error("ethersProvider is underfined");
    const contract = await getAusysContract();
    if (signer) {
        try {
            const journey = await contract.journeyIdToJourney(journeyId);
            return journey;
        } catch (error) {
            console.error("Could not fetch journey object");
            throw error;
        }
    }
};

export const customerMakeOrder = async (orderData: LocationContract.OrderStruct) => {
    const contract = await getAusysContract();
    try {
        await contract.orderCreation(orderData);
    } catch (error) {
        console.error("Could not make customer order", error);
        throw error;
    }
};

import { AddressLike, BigNumberish, BytesLike, ContractTransactionReceipt } from "ethers";
import { AurumNode, AurumNode__factory, AurumNodeManager, AurumNodeManager__factory } from "@/typechain-types";
import { ethersProvider, signer, walletAddress, handleContractError } from "./base-controller";

const NODE_MANAGER_ADDRESS = process.env.EXPO_PUBLIC_NODE_MANAGER_CONTRACT_ADDRESS;

export type ResourceData = {
    id: bigint
    amount: bigint
}

const getAurumContract = async (): Promise<AurumNodeManager> => {
    if (!ethersProvider || !signer) {
        throw new Error("Wallet not connected. Please connect your wallet.");
    }
    if (!NODE_MANAGER_ADDRESS) {
        throw new Error("NODE_MANAGER_ADDRESS is undefined");
    }
    try {
        const contract = AurumNodeManager__factory.connect(NODE_MANAGER_ADDRESS, signer);
        console.log("AurumNodeManager contract fetched successfully.");
        return contract;
    } catch (error) {
        console.error("Error fetching AurumNodeManager contract:", error);
        throw error;
    }
};

const getAurumNodeContract = async (address: string): Promise<AurumNode> => {
    if (!ethersProvider || !signer) {
        throw new Error("Wallet not connected. Please connect your wallet.");
    }
    try {
        const contract = AurumNode__factory.connect(address, signer);
        console.log("AurumNode contract fetched successfully.");
        return contract;
    } catch (error) {
        console.error("Error fetching AurumNode contract:", error);
        throw error;
    }
};

export const loadAvailableAssets = async (): Promise<ResourceData[]> => {
    const contract = await getAurumContract();
    let count = 1;
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
        if (err?.message?.includes("out of bounds")) {
            console.log("End of asset list reached.");
        } else {
            console.error("Error loading available assets:", err);
            throw err;
        }
    }
    return assetList;
};

export const registerNode = async (nodeData: AurumNodeManager.NodeStruct) => {
    const contract = await getAurumContract();
    try {
        const tx = await contract.registerNode(nodeData);
        const receipt = await tx.wait() as ContractTransactionReceipt;
        console.log("Node registered successfully. Transaction hash:", receipt.hash);
        return receipt;
    } catch (error) {
        console.error("Error registering node:", error);
        throw error;
    }
};

export const getOwnedNodeAddressList = async (): Promise<string[]> => {
    const contract = await getAurumContract();
    try {
        const nodeAddressList: string[] = [];
        let counter = 0;
        
        while (true) {
            try {
                const node = await contract.ownedNodes(walletAddress, counter);
                nodeAddressList.push(node);
                counter++;
            } catch (e) {
                break;
            }
        }
        return nodeAddressList;
    } catch (error) {
        console.error(`Unable to get nodes addresses for owner address ${walletAddress}`, error);
        throw error;
    }
};

export const updateNodeStatus = async (node: string, status: BytesLike) => {
    const contract = await getAurumContract();
    try {
        const tx = await contract.updateStatus(status, node);
        const receipt = await tx.wait() as ContractTransactionReceipt;
        if (receipt) {
            console.log("Transaction completed", {
                transactionHash: receipt.hash,
                blockNumber: receipt.blockNumber
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
    data: any
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
            data
        );
        const receipt = await tx.wait() as ContractTransactionReceipt;
        return receipt;
    } catch (error) {
        console.error(
            `unable nodeHandoff for node${node} driver: ${driver}, receiver: ${receiver}, id:${id}`,
            error
        );
        throw error;
    }
};

export const nodeHandOn = async (
    node: string,
    driver: string,
    receiver: string,
    id: string
) => {
    const contract = await getAurumNodeContract(node);
    try {
        const tx = await contract.nodeHandOn(driver, receiver, id);
        const receipt = await tx.wait() as ContractTransactionReceipt;
        return receipt;
    } catch (error) {
        console.error(
            `unable to updateStatus for node: ${driver} receiver: ${receiver} id: ${id}`,
            error
        );
        throw error;
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

export const addToken = async (auraGoatAddress: string) => {
    const contract = await getAurumContract();
    try {
        const tx = await contract.addToken(auraGoatAddress);
        const receipt = await tx.wait() as ContractTransactionReceipt;
        return receipt;
    } catch (error) {
        handleContractError(error, 'add token');
    }
};

export const setAurumAdmin = async (admin: string) => {
    const contract = await getAurumContract();
    try {
        const tx = await contract.setAdmin(admin);
        const receipt = await tx.wait() as ContractTransactionReceipt;
        return receipt;
    } catch (error) {
        handleContractError(error, 'set aurum admin');
    }
};

export const expensiveFuzzyUpdateCapacity = async (
    node: string,
    quantities: number[],
    assets: number[]
) => {
    const contract = await getAurumContract();
    try {
        const tx = await contract.expensiveFuzzyUpdateCapacity(node, quantities, assets);
        const receipt = await tx.wait() as ContractTransactionReceipt;
        return receipt;
    } catch (error) {
        handleContractError(error, 'update capacity');
    }
}; 
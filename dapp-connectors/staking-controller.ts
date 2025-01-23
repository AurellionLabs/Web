import { AddressLike, BigNumberish, BrowserProvider, BytesLike, Contract, JsonRpcSigner, Signer, ethers } from "ethers";
import { AuStake } from "@/typechain-types";
import { AuStake__factory } from "@/typechain-types";
import { Wallet } from "./wallet-helper";

export interface StakeData {
    amount: BigNumberish;
    timestamp: BigNumberish;
    isActive: boolean;
}

export interface OperationData {
    id: string;
    name: string;
    token: string;
    provider: string;
    lengthInDays: BigNumberish;
    reward: BigNumberish;
    tokenTvl: BigNumberish;
}

export var ethersProvider: BrowserProvider | null;
export var walletAddress: string;
const AUSTAKE_ADDRESS = process.env.NEXT_PUBLIC_AUSTAKE_ADDRESS;
export var signer: JsonRpcSigner;
export const setWalletProvider = async () => {
    try {
        const wallet = new Wallet();
        const response = await wallet.connectWallet();

        if (response.success) {
            ethersProvider = wallet.getProvider();
            if (ethersProvider) {
                // Use this provider for your contract interactions
                signer = await ethersProvider.getSigner();
                walletAddress = await signer.getAddress();
                try {
                    console.log(await getEtherBalance())
                    console.log("success")
                } catch (e) { throw new Error("connection not established ${e}") }
            } else {
                throw new Error("Provider not initialized");
            }
        } else {
            throw new Error(response.error || "Failed to connect wallet");
        }
        return response;
    } catch (error) {
        console.error("Error setting wallet provider:", error);
        throw error;
    }
};

const getAuStakeContract = async (): Promise<AuStake> =>
    new Promise(async (resolve, reject) => {
        try {
            if (ethersProvider) {
                try {
                    signer = await ethersProvider.getSigner();
                } catch (e) {
                    throw new Error("getSigner failed with " + e);
                }
            } else {
                throw new Error("ethersProvider is undefined");
            }

            if (!signer) throw new Error("Signer is undefined");
            if (!AUSTAKE_ADDRESS) throw new Error(`AUSTAKE_ADDRESS is undefined ${AUSTAKE_ADDRESS}`);

            const contract = AuStake__factory.connect(AUSTAKE_ADDRESS, signer);
            resolve(contract);
        } catch (error) {
            console.error("Error fetching contract:", error);
            reject(error);
        }
    });

export const createOperation = async (
    name: string,
    token: string,
    provider: string,
    lengthInDays: number,
    reward: BigNumberish
): Promise<string> => {
    const contract = await getAuStakeContract();
    try {
        const tx = await contract.createOperation(name, token, provider, lengthInDays, reward);
        const receipt = await tx.wait();
        const event = receipt?.logs.find(
            log => log.fragment?.name === "OperationCreated"
        );
        if (!event || !event.args) throw new Error("Operation creation event not found");
        return event.args[0];
    } catch (error) {
        console.error("Error creating operation:", error);
        throw error;
    }
};
export const getOperationList = async () => {
    const contract = await getAuStakeContract();
    console.log("got contract")
    const operationList: string[] = []
    const operationsBuilt = false
    var index = 0
    while (!operationsBuilt) {
        try {
            const id = await contract.activeOperations(index)
            console.log("fetched id",id)
            operationList.push(id)
            index++
        }
        catch (e) {
            console.error("Error getting Operation list likely end of list:", e)
        }
        return (operationList)
    }
}
    export const stake = async (
        token: string,
        operationId: BytesLike,
        amount: BigNumberish
    ) => {
        const contract = await getAuStakeContract();
        try {
            const tx = await contract.stake(token, operationId, amount);
            await tx.wait();
        } catch (error) {
            console.error("Error staking tokens:", error);
            throw error;
        }
    };


export const triggerReward = async (
    token: string,
    operationId: BytesLike,
    user: string
) => {
    const contract = await getAuStakeContract();
    try {
        const tx = await contract.triggerReward(token, operationId, user);
        await tx.wait();
    } catch (error) {
        console.error("Error triggering reward:", error);
        throw error;
    }
};

export const setOperationReward = async (
    operationId: BytesLike,
    amount: BigNumberish
) => {
    const contract = await getAuStakeContract();
    try {
        const tx = await contract.setOperationReward(operationId, amount);
        await tx.wait();
    } catch (error) {
        console.error("Error setting operation reward:", error);
        throw error;
    }
};

export const setLockPeriod = async (lockPeriod: BigNumberish) => {
    const contract = await getAuStakeContract();
    try {
        const tx = await contract.setLockPeriod(lockPeriod);
        await tx.wait();
    } catch (error) {
        console.error("Error setting lock period:", error);
        throw error;
    }
};

export const setAdmin = async (user: string, status: boolean) => {
    const contract = await getAuStakeContract();
    try {
        const tx = await contract.setAdmin(user, status);
        await tx.wait();
    } catch (error) {
        console.error("Error setting admin status:", error);
        throw error;
    }
};

export const setProjectWallet = async (projectWallet: string) => {
    const contract = await getAuStakeContract();
    try {
        const tx = await contract.setProjectWallet(projectWallet);
        await tx.wait();
    } catch (error) {
        console.error("Error setting project wallet:", error);
        throw error;
    }
};

export const getOperation = async (operationId: BytesLike): Promise<OperationData> => {
    const contract = await getAuStakeContract();
    try {
        const operation = await contract.getOperation(operationId);
        return {
            id: operation[0],
            name: operation[1],
            token: operation[2],
            provider: operation[3],
            lengthInDays: operation[4],
            reward: operation[5],
            tokenTvl: operation[6]
        };
    } catch (error) {
        console.error("Error getting operation:", error);
        throw error;
    }
};

export const getStake = async (token: string, user: string): Promise<StakeData> => {
    const contract = await getAuStakeContract();
    try {
        const stake = await contract.stakes(token, user);
        return {
            amount: stake.amount,
            timestamp: stake.timestamp,
            isActive: stake.isActive
        };
    } catch (error) {
        console.error("Error getting stake:", error);
        throw error;
    }
};

export const getOperationStake = async (operationId: BytesLike, user: string): Promise<StakeData> => {
    const contract = await getAuStakeContract();
    try {
        const stake = await contract.operationStakes(operationId, user);
        return {
            amount: stake.amount,
            timestamp: stake.timestamp,
            isActive: stake.isActive
        };
    } catch (error) {
        console.error("Error getting operation stake:", error);
        throw error;
    }
};

export const getTokenTvl = async (token: string): Promise<BigNumberish> => {
    const contract = await getAuStakeContract();
    try {
        return await contract.tokenTvl(token);
    } catch (error) {
        console.error("Error getting token TVL:", error);
        throw error;
    }
};
export const getEtherBalance = async () => {
    if (ethersProvider) {
        console.log("signers address", await signer.getAddress())
        return await ethersProvider.getBalance(await signer.getAddress())
    } else {
        console.log("no ethersProvider")
    }
}

import {
    AddressLike,
    BigNumberish,
    BrowserProvider,
    BytesLike,
    Contract,
    JsonRpcSigner,
    Signer,
    ethers,
} from 'ethers';
import { AuStake } from '@/typechain-types';
import { AuStake__factory } from '@/typechain-types';
import { Wallet } from './wallet-helper';
import { StakedEvent } from '@/typechain-types/contracts/AuStake';
import { formatEthereumValue } from './ethereum-utils';
import { NEXT_PUBLIC_AUSTAKE_ADDRESS } from '@/chain-constants';

export interface StakeData {
    token: AddressLike;
    user: AddressLike;
    operationId: BigNumberish;
    amount: BigNumberish;
    time: BigNumberish;
}
export interface GroupedStakes {
    daily: { [key: string]: number };
    weekly: { [key: string]: number };
    monthly: { [key: string]: number };
    yearly: { [key: string]: number };
}
export interface OperationData {
    id: string;
    name: string;
    token: string;
    provider: string;
    deadline: bigint;
    startDate: bigint;
    rwaName: string;
    reward: bigint;
    tokenTvl: bigint;
    operationStatus: bigint;
}


export var ethersProvider: BrowserProvider | null;
export var walletAddress: string;
const AUSTAKE_ADDRESS = NEXT_PUBLIC_AUSTAKE_ADDRESS;
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
                    console.log(await getEtherBalance());
                    console.log('success');
                } catch (e) {
                    throw new Error('connection not established ${e}');
                }
            } else {
                throw new Error('Provider not initialized');
            }
        } else {
            throw new Error(response.error || 'Failed to connect wallet');
        }
        return response;
    } catch (error) {
        console.error('Error setting wallet provider:', error);
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
                    throw new Error('getSigner failed with ' + e);
                }
            } else {
                throw new Error('ethersProvider is undefined');
            }

            if (!signer) throw new Error('Signer is undefined');
            if (!AUSTAKE_ADDRESS)
                throw new Error(`AUSTAKE_ADDRESS is undefined ${AUSTAKE_ADDRESS}`);

            const contract = AuStake__factory.connect(AUSTAKE_ADDRESS, signer);
            resolve(contract);
        } catch (error) {
            console.error('Error fetching contract:', error);
            reject(error);
        }
    });

export const createOperation = async (
    name: string,
    token: string,
    provider: string,
    lengthInDays: number,
    reward: BigNumberish,
    rwaName: string,
): Promise<string> => {
    const contract = await getAuStakeContract();
    try {
        const tx = await contract.createOperation(
            name,
            token,
            provider,
            lengthInDays,
            reward,
            rwaName
        );
        const receipt = await tx.wait();
        const event = receipt?.logs.find(
            (log) => log.fragment?.name === 'OperationCreated',
        );
        if (!event || !event.args)
            throw new Error('Operation creation event not found');
        return event.args[0];
    } catch (error) {
        console.error('Error creating operation:', error);
        throw error;
    }
};

export const getOperationMetrics = async (operationId: BytesLike) => {
    const contract = await getAuStakeContract();
    const operation = await contract.getOperation(operationId);
    const participants = await contract.operationParticipants(operationId);

    return {
        ...operation,
        participants,
        deadlineDate: new Date(Number(operation.deadline) * 1000),
        fundingProgress: Number(operation.tokenTvl) / Number(operation.fundingGoal),
        daysRemaining: Math.ceil((Number(operation.deadline) * 1000 - Date.now()) / (1000 * 3600 * 24))
    };
};

export const getStakeHistory = async (operationId: BytesLike): Promise<StakedEvent.OutputObject[]> => {
    console.log("in getStakeHistory")
    const contract = await getAuStakeContract();
    console.log("before filter")
    const filter = contract.filters.Staked(undefined, undefined, undefined, operationId);
    console.log("after filter", filter)
    const events = await contract.queryFilter(filter);
    console.log("events")
    return events.map(e => ({
        token: e.args.token,
        user: e.args?.user,
        amount: e.args?.amount,
        operationId: e.args.operationId,
        time: e.args?.time,
    }));
};
export const groupStakesByInterval = (stakes: StakedEvent.OutputObject[]): GroupedStakes => {
    const grouped: GroupedStakes = {
        daily: {},
        weekly: {},
        monthly: {},
        yearly: {}
    };

    stakes.forEach(stake => {
        console.log(stake)
        const date = new Date(Number(stake.time) * 1000);
        const amount = Number(formatEthereumValue(stake.amount));

        // Daily
        const dailyKey = date.toISOString().split('T')[0];
        grouped.daily[dailyKey] = (grouped.daily[dailyKey] || 0) + amount;

        // Weekly
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weeklyKey = weekStart.toISOString().split('T')[0];
        grouped.weekly[weeklyKey] = (grouped.weekly[weeklyKey] || 0) + amount;

        // Monthly
        const monthlyKey = date.toISOString().substring(0, 7);
        grouped.monthly[monthlyKey] = (grouped.monthly[monthlyKey] || 0) + amount;

        // Yearly
        const yearlyKey = date.toISOString().substring(0, 4);
        grouped.yearly[yearlyKey] = (grouped.yearly[yearlyKey] || 0) + amount;
    });

    return grouped;
};

export const getOperationList = async () => {
    const contract = await getAuStakeContract();
    console.log('got contract');
    const operationList: string[] = [];
    const operationsBuilt = false;
    var index = 0;
    while (!operationsBuilt) {
        try {
            const id = await contract.activeOperations(index);
            console.log('fetched id', id);
            operationList.push(id);
            index++;
        } catch (e) {
            console.error('Error getting Operation list likely end of list:', e);
        }
        return operationList;
    }
};

export const stake = async (
    token: string,
    operationId: BytesLike,
    amount: BigNumberish,
) => {
    const contract = await getAuStakeContract();
    try {
        const tx = await contract.stake(token, operationId, amount);
        await tx.wait();
    } catch (error) {
        console.error(`Error staking tokens: ${token} operationId: ${operationId} amount: ${amount} error:`, error);
        throw error;
    }
};

export const triggerReward = async (
    token: string,
    operationId: BytesLike,
    user: string,
) => {
    const contract = await getAuStakeContract();
    try {
        const tx = await contract.claimReward(token, operationId, user);
        await tx.wait();
    } catch (error) {
        console.error('Error triggering reward:', error);
        throw error;
    }
};

export const setOperationReward = async (
    operationId: BytesLike,
    amount: BigNumberish,
) => {
    const contract = await getAuStakeContract();
    try {
        const tx = await contract.setOperationReward(operationId, amount);
        await tx.wait();
    } catch (error) {
        console.error('Error setting operation reward:', error);
        throw error;
    }
};

export const setLockPeriod = async (lockPeriod: BigNumberish) => {
    const contract = await getAuStakeContract();
    try {
        const tx = await contract.setLockPeriod(lockPeriod);
        await tx.wait();
    } catch (error) {
        console.error('Error setting lock period:', error);
        throw error;
    }
};

export const setAdmin = async (user: string, status: boolean) => {
    const contract = await getAuStakeContract();
    try {
        const tx = await contract.setAdmin(user, status);
        await tx.wait();
    } catch (error) {
        console.error('Error setting admin status:', error);
        throw error;
    }
};

export const setProjectWallet = async (projectWallet: string) => {
    const contract = await getAuStakeContract();
    try {
        const tx = await contract.setProjectWallet(projectWallet);
        await tx.wait();
    } catch (error) {
        console.error('Error setting project wallet:', error);
        throw error;
    }
};

export const getOperation = async (
    operationId: BytesLike,
): Promise<OperationData> => {
    const contract = await getAuStakeContract();
    try {
        const operation = await contract.getOperation(operationId);
        return {
            id: operation[0],
            name: operation[1],
            token: operation[2],
            provider: operation[3],
            deadline: operation[4],
            reward: operation[5],
            tokenTvl: operation[6],
            operationStatus: operation[7]
        };
    } catch (error) {
        console.error('Error getting operation:', error);
        throw error;
    }
};

export const getStake = async (
    token: string,
    user: string,
): Promise<StakeData> => {
    const contract = await getAuStakeContract();
    try {
        const stake = await contract.stakes(token, user);
        return {
            amount: stake.amount,
            timestamp: stake.timestamp,
            isActive: stake.isActive,
        };
    } catch (error) {
        console.error('Error getting stake:', error);
        throw error;
    }
};

export const getOperationStake = async (
    operationId: BytesLike,
    user: string,
): Promise<StakeData> => {
    const contract = await getAuStakeContract();
    try {
        const stake = await contract.operationStakes(operationId, user);
        return {
            amount: stake.amount,
            time: stake.timestamp,

        };
    } catch (error) {
        console.error('Error getting operation stake:', error);
        throw error;
    }
};

export const getTokenTvl = async (token: string): Promise<BigNumberish> => {
    const contract = await getAuStakeContract();
    try {
        return await contract.tokenTvl(token);
    } catch (error) {
        console.error('Error getting token TVL:', error);
        throw error;
    }
};
export const getEtherBalance = async () => {
    if (ethersProvider) {
        console.log('signers address', await signer.getAddress());
        return await ethersProvider.getBalance(await signer.getAddress());
    } else {
        console.log('no ethersProvider');
    }
};

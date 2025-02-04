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
import { AuraGoat, AuraGoat__factory, AuStake } from '@/typechain-types';
import { AuStake__factory } from '@/typechain-types';
import { Wallet } from './wallet-helper';
import {
  StakedEvent,
  UnstakedEvent,
} from '@/typechain-types/contracts/AuStake';
import { formatEthereumValue } from './ethereum-utils';
import {
  NEXT_PUBLIC_AURA_ADDRESS,
  NEXT_PUBLIC_AUSTAKE_ADDRESS,
} from '@/chain-constants';

export interface StakeData {
  token: AddressLike;
  user: AddressLike;
  operationId: BigNumberish;
  amount: BigNumberish;
  time: BigNumberish;
}
export interface GroupedStakes {
  hourly: { [key: string]: number };
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
  fundingGoal: bigint;
  assetPrice: bigint;
}

export var ethersProvider: BrowserProvider | null;
export var walletAddress: string;

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
        console.error('ethersProvider is undefined');
        console.log('restablishing connection');
        await setWalletProvider();
      }

      if (!signer) throw new Error('Signer is undefined');
      if (!NEXT_PUBLIC_AUSTAKE_ADDRESS)
        throw new Error(
          `NEXT_PUBLIC_AUSTAKE_ADDRESS is undefined ${NEXT_PUBLIC_AUSTAKE_ADDRESS}`,
        );

      const contract = AuStake__factory.connect(
        NEXT_PUBLIC_AUSTAKE_ADDRESS,
        signer,
      );
      resolve(contract);
    } catch (error) {
      console.error('Error fetching contract:', error);
      reject(error);
    }
  });

const getAuraContract = async (): Promise<AuraGoat> =>
  new Promise(async (resolve, reject) => {
    try {
      if (ethersProvider) {
        try {
          signer = await ethersProvider.getSigner();
        } catch (e) {
          throw new Error('getSigner failed with ' + e);
        }
      } else {
        console.error('ethersProvider is undefined');
        console.log('restablishing connection');
        await setWalletProvider();
      }

      if (!signer) throw new Error('Signer is undefined');
      if (!NEXT_PUBLIC_AUSTAKE_ADDRESS)
        throw new Error(
          `NEXT_PUBLIC_AUSTAKE_ADDRESS is undefined ${NEXT_PUBLIC_AUSTAKE_ADDRESS}`,
        );

      const contract = AuraGoat__factory.connect(
        NEXT_PUBLIC_AURA_ADDRESS,
        signer,
      );
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
  fundingGoal: BigNumberish,
  assetPrice: BigNumberish,
): Promise<string> => {
  const contract = await getAuStakeContract();
  try {
    const tx = await contract.createOperation(
      name,
      token,
      provider,
      lengthInDays,
      reward,
      rwaName,
      fundingGoal,
      assetPrice,
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
    daysRemaining: Math.ceil(
      (Number(operation.deadline) * 1000 - Date.now()) / (1000 * 3600 * 24),
    ),
  };
};

export const getStakeHistory = async (
  operationId: BytesLike,
): Promise<StakedEvent.OutputObject[]> => {
  const contract = await getAuStakeContract();
  const filter = contract.filters.Staked(
    undefined,
    undefined,
    undefined,
    operationId,
    undefined,
  );
  const events = await contract.queryFilter(filter);
  return events.map((e) => ({
    token: e.args.token,
    user: e.args?.user,
    amount: e.args?.amount,
    operationId: e.args.operationId,
    eType: e.args.eType,
    time: e.args?.time,
  }));
};
export const requestTokenAllowance = async (
  token: AddressLike,
  amount: BigNumberish = ethers.parseUnits('1000000000000', 18),
) => {
  const contract = await getAuraContract();
  const allowance = await contract.allowance(
    walletAddress,
    NEXT_PUBLIC_AUSTAKE_ADDRESS,
  );
  console.log('allowance', allowance);
  console.log('amount', amount);
  var tx;
  try {
    if (allowance < BigInt(amount)) {
      const totalSupply = await contract.totalSupply();
      console.log('totalSupply', totalSupply);
      if (totalSupply > BigInt(amount)) {
        tx = await contract.approve(NEXT_PUBLIC_AUSTAKE_ADDRESS, totalSupply);
      } else {
        tx = await contract.approve(NEXT_PUBLIC_AUSTAKE_ADDRESS, amount);
      }
    }
  } catch (e) {
    console.error(
      `Allowance failed to be increased, amount: ${amount} with error: ${e} `,
    );
  }
  if (tx) await tx.wait();
};
export const getBalance = async () => {
  const contract = await getAuraContract();
  const allowance = await contract.allowance(
    walletAddress,
    NEXT_PUBLIC_AUSTAKE_ADDRESS,
  );
  var tx;
  try {
    return await contract.balanceOf(walletAddress);
  } catch (e) {
    throw new Error(`Failed to fetch balance with error:${e} `);
  }
};
export const getWithdrawHistory = async (
  operationId: BytesLike,
): Promise<UnstakedEvent.OutputObject[]> => {
  const contract = await getAuStakeContract();
  const filter = contract.filters.Unstaked(
    undefined,
    undefined,
    undefined,
    operationId,
  );
  const events = await contract.queryFilter(filter);

  return events.map((e) => ({
    token: e.args.token,
    user: e.args?.user,
    amount: e.args?.amount,
    operationId: e.args.operationId,
    eType: e.args.eType,
    time: e.args?.time,
  }));
};
export const groupStakesByInterval = (
  stakes: StakedEvent.OutputObject[],
): GroupedStakes => {
  const grouped: GroupedStakes = {
    hourly: {},
    daily: {},
    weekly: {},
    monthly: {},
    yearly: {},
  };

  stakes.forEach((stake) => {
    const date = new Date(Number(stake.time) * 1000);
    const amount = Number(formatEthereumValue(stake.amount));

    // Hourly - we'll use ISO string and keep the hour part
    const hourlyKey = date.toISOString().slice(0, 13); // Format: "2024-02-03T15"
    grouped.hourly[hourlyKey] = (grouped.hourly[hourlyKey] || 0) + amount;

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
  const operationList: string[] = [];
  var operationsBuilt = false;
  var index = 0;
  while (!operationsBuilt) {
    try {
      const id = await contract.activeOperations(index);
      operationList.push(id);
      index++;
    } catch (e) {
      console.error('Error getting Operation list likely end of list:', e);
      operationsBuilt = true;
    }
  }
  return operationList;
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
    console.error(
      `Error staking tokens: ${token} operationId: ${operationId} amount: ${amount} error:`,
      error,
    );
    throw error;
  }
};

export const unlockReward = async (
  token = NEXT_PUBLIC_AURA_ADDRESS,
  operation: OperationData,
) => {
  const contract = await getAuStakeContract();
  var tx;
  try {
    const rewardPortion = (operation.tokenTvl * operation.reward) / 100n;
    const totalAmountNeeded = operation.tokenTvl + rewardPortion;
    await requestTokenAllowance(token, totalAmountNeeded);
    // Call the unlock reward function
    tx = await contract.unlockReward(token, operation.id);
    await tx.wait();
  } catch (error) {
    console.error('Error triggering reward:', error);
    throw error;
  }
};

export const triggerReward = async (token: string, operationId: BytesLike) => {
  const contract = await getAuStakeContract();
  try {
    const tx = await contract.claimReward(token, operationId, walletAddress);
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
      startDate: operation[5],
      rwaName: operation[6],
      reward: operation[7],
      tokenTvl: operation[8],
      operationStatus: operation[9],
      fundingGoal: operation[10],
      assetPrice: operation[11],
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

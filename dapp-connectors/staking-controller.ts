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
import {
  Aura,
  Aura__factory,
  AuraGoat,
  AuraGoat__factory,
  AuStake,
} from '@/typechain-types';
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
import {
  setProvider,
  setSigner,
  setWalletAddress,
  getProvider,
  getSigner,
} from './base-controller';

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
  description: string;
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

export const setWalletProvider = async () => {
  try {
    const wallet = new Wallet();
    const response = await wallet.connectWallet();

    if (response.success) {
      const provider = wallet.getProvider();
      if (provider) {
        setProvider(provider);
        const newSigner = await provider.getSigner();
        setSigner(newSigner);
        const address = await newSigner.getAddress();
        setWalletAddress(address);
        try {
          console.log(await getEtherBalance());
          console.log('success');
          return { success: true, provider: provider, address: address };
        } catch (e) {
          throw new Error(`connection not established ${e}`);
        }
      } else {
        throw new Error('Provider not initialized');
      }
    } else {
      throw new Error(response.error || 'Failed to connect wallet');
    }
  } catch (error) {
    console.error('Error setting wallet provider:', error);
    return { success: false, error };
  }
};

const getAuStakeContract = async (): Promise<AuStake> =>
  new Promise(async (resolve, reject) => {
    try {
      if (getProvider()) {
        try {
          const signer = getSigner();
        } catch (e) {
          throw new Error('getSigner failed with ' + e);
        }
      } else {
        console.error('ethersProvider is undefined');
        console.log('restablishing connection');
        await setWalletProvider();
      }

      if (!getSigner()) throw new Error('Signer is undefined');
      if (!NEXT_PUBLIC_AUSTAKE_ADDRESS)
        throw new Error(
          `NEXT_PUBLIC_AUSTAKE_ADDRESS is undefined ${NEXT_PUBLIC_AUSTAKE_ADDRESS}`,
        );

      const contract = AuStake__factory.connect(
        NEXT_PUBLIC_AUSTAKE_ADDRESS,
        getSigner(),
      );
      resolve(contract);
    } catch (error) {
      console.error('Error fetching contract:', error);
      reject(error);
    }
  });

const getAuraContract = async (): Promise<Aura> =>
  new Promise(async (resolve, reject) => {
    try {
      if (getProvider()) {
        try {
          const signer = getSigner();
        } catch (e) {
          throw new Error('getSigner failed with ' + e);
        }
      } else {
        console.error('ethersProvider is undefined');
        console.log('restablishing connection');
        await setWalletProvider();
      }

      if (!getSigner()) throw new Error('Signer is undefined');
      if (!NEXT_PUBLIC_AUSTAKE_ADDRESS)
        throw new Error(
          `NEXT_PUBLIC_AUSTAKE_ADDRESS is undefined ${NEXT_PUBLIC_AUSTAKE_ADDRESS}`,
        );

      const contract = Aura__factory.connect(
        NEXT_PUBLIC_AURA_ADDRESS,
        getSigner(),
      );
      resolve(contract);
    } catch (error) {
      console.error('Error fetching contract:', error);
      reject(error);
    }
  });

export const createOperation = async (
  name: string,
  description: string,
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
      description,
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
  try {
    const contract = await getAuraContract();

    // Make sure we have the correct addresses
    console.log('Token address:', token);
    console.log('Spender address:', NEXT_PUBLIC_AUSTAKE_ADDRESS);
    console.log('Wallet address:', getWalletAddress());

    // Check allowance with proper parameters
    const allowance = await contract.allowance(
      getWalletAddress(),
      NEXT_PUBLIC_AUSTAKE_ADDRESS,
    );

    if (allowance < BigInt(amount)) {
      // Approve exact amount needed
      const tx = await contract.approve(NEXT_PUBLIC_AUSTAKE_ADDRESS, amount);
      await tx.wait();
      console.log('Allowance approved for amount:', amount.toString());
    } else {
      console.log('Sufficient allowance exists:', allowance.toString());
    }
  } catch (error) {
    console.error('Allowance error:', error);
    throw error;
  }
};
export const getBalance = async () => {
  const contract = await getAuraContract();
  const allowance = await contract.allowance(
    getWalletAddress(),
    NEXT_PUBLIC_AUSTAKE_ADDRESS,
  );
  var tx;
  try {
    return await contract.balanceOf(getWalletAddress());
  } catch (e) {
    throw new Error(`Failed to fetch balance with error:${e} `);
  }
};

export const getDecimal = async () => {
  const contract = await getAuraContract();
  try {
    return await contract.decimals();
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
export const groupStakesByInterval = async (
  stakes: StakedEvent.OutputObject[],
): Promise<GroupedStakes> => {
  const grouped: GroupedStakes = {
    hourly: {},
    daily: {},
    weekly: {},
    monthly: {},
    yearly: {},
  };

  const decimals = await getDecimal();

  // Sort stakes by timestamp
  const sortedStakes = [...stakes].sort(
    (a, b) => Number(a.time) - Number(b.time),
  );

  let runningTotal = 0;

  // Get min and max timestamps
  const timestamps = sortedStakes.map((stake) => Number(stake.time) * 1000);
  const minTime = Math.min(...timestamps);
  const maxTime = Math.max(...timestamps, Date.now());

  // Fill in all time intervals with previous total
  for (let t = minTime; t <= maxTime; t += 3600000) {
    // Add 1 hour in ms
    const hourlyKey = new Date(t).toISOString().slice(0, 13);

    // Find all stakes that happened before or at this time
    const stakesUpToNow = sortedStakes.filter(
      (stake) => Number(stake.time) * 1000 <= t,
    );

    // Calculate cumulative total
    runningTotal = stakesUpToNow.reduce(
      (total, stake) =>
        total + Number(formatEthereumValue(stake.amount, Number(decimals))),
      0,
    );

    grouped.hourly[hourlyKey] = runningTotal;
  }

  // Similar logic for daily/weekly intervals...
  // Convert the grouped data to array format for the chart
  const chartData = Object.entries(grouped.hourly).map(([time, amount]) => ({
    time: new Date(time).getTime(),
    amount,
  }));

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
    const tx = await contract.claimReward(
      token,
      operationId,
      getWalletAddress(),
    );
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
      description: operation[2],
      token: operation[3],
      provider: operation[4],
      deadline: operation[5],
      startDate: operation[6],
      rwaName: operation[7],
      reward: operation[8],
      tokenTvl: operation[9],
      operationStatus: operation[10],
      fundingGoal: operation[11],
      assetPrice: operation[12],
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
  const currentProvider = getProvider();
  const currentSigner = getSigner();
  if (!currentProvider || !currentSigner) {
    throw new Error('Provider or signer not initialized');
  }
  const address = await currentSigner.getAddress();
  return await currentProvider.getBalance(address);
};

/**
 * @deprecated This controller uses legacy contract ABIs.
 * The Diamond pattern is now in use - see infrastructure/services for new implementations.
 * This file is kept for reference but should not be used in production.
 */
import {
  AddressLike,
  BytesLike,
  ContractTransactionReceipt,
  ContractTransaction,
} from 'ethers';
import { AuStake__factory, type AuStake } from '@/lib/contracts';
import {
  ethersProvider,
  signer,
  handleContractError,
  walletAddress,
} from './base-controller';
import { NEXT_PUBLIC_AUSTAKE_ADDRESS } from '@/chain-constants';
import { BigNumberish } from 'ethers';

const getAuStakeContract = async (): Promise<AuStake> => {
  if (!ethersProvider || !signer) {
    throw new Error('Wallet not connected. Please connect your wallet.');
  }
  if (!NEXT_PUBLIC_AUSTAKE_ADDRESS) {
    throw new Error('NEXT_PUBLIC_AUSTAKE_ADDRESS is undefined');
  }
  try {
    const contract = AuStake__factory.connect(
      NEXT_PUBLIC_AUSTAKE_ADDRESS,
      signer,
    );
    console.log('AuStake contract fetched successfully.');
    return contract;
  } catch (error) {
    console.error('Error fetching AuStake contract:', error);
    throw error;
  }
};

export const stake = async (amount: BigNumberish) => {
  try {
    // Validate amount
    if (!amount || amount <= 0) {
      throw new Error('Invalid stake amount');
    }

    const contract = await getAuStakeContract();

    // Check allowance first
    const auraContract = await getAuraContract();
    const allowance = await auraContract.allowance(
      walletAddress,
      NEXT_PUBLIC_AUSTAKE_ADDRESS,
    );

    if (allowance < amount) {
      // Request approval first
      const approveTx = await auraContract.approve(
        NEXT_PUBLIC_AUSTAKE_ADDRESS,
        amount,
      );
      await approveTx.wait();
    }

    return await contract.stake(amount);
  } catch (error) {
    handleContractError(error, 'stake');
  }
};

export const createOperation = async (
  name: string,
  description: string,
  token: string,
  provider: string,
  deadline: bigint,
  reward: bigint,
  rwaName: string,
  fundingGoal: bigint,
  assetPrice: bigint,
) => {
  const contract = await getAuStakeContract();
  try {
    const tx = await contract.createOperation(
      name,
      description,
      token,
      provider,
      deadline,
      reward,
      rwaName,
      fundingGoal,
      assetPrice,
    );
    const receipt = (await tx.wait()) as ContractTransactionReceipt;
    return receipt;
  } catch (error) {
    handleContractError(error, 'create operation');
  }
};

export const getOperation = async (operationId: BytesLike) => {
  const contract = await getAuStakeContract();
  try {
    const operation = await contract.getOperation(operationId);
    return operation;
  } catch (error) {
    console.error('Error fetching operation:', error);
    throw error;
  }
};

export const claimReward = async (
  token: string,
  operationId: BytesLike,
  user: string,
) => {
  const contract = await getAuStakeContract();
  try {
    const tx = await contract.claimReward(token, operationId, user);
    const receipt = (await tx.wait()) as ContractTransactionReceipt;
    return receipt;
  } catch (error) {
    handleContractError(error, 'claim reward');
  }
};

export const triggerReward = async (token: string, operationId: BytesLike) => {
  const contract = await getAuStakeContract();
  try {
    const tx = await contract.claimReward(token, operationId, walletAddress);
    const receipt = (await tx.wait()) as ContractTransactionReceipt;
    return receipt;
  } catch (error) {
    handleContractError(error, 'trigger reward');
  }
};

export const unlockReward = async (token: string, operationId: BytesLike) => {
  const contract = await getAuStakeContract();
  try {
    const tx = await contract.unlockReward(token, operationId);
    const receipt = (await tx.wait()) as ContractTransactionReceipt;
    return receipt;
  } catch (error) {
    handleContractError(error, 'unlock reward');
  }
};

export const setOperationReward = async (
  operationId: BytesLike,
  amount: bigint,
) => {
  const contract = await getAuStakeContract();
  try {
    const tx = await contract.setOperationReward(operationId, amount);
    const receipt = (await tx.wait()) as ContractTransactionReceipt;
    return receipt;
  } catch (error) {
    handleContractError(error, 'set operation reward');
  }
};

export const setLockPeriod = async (lockPeriod: bigint) => {
  const contract = await getAuStakeContract();
  try {
    const tx = await contract.setLockPeriod(lockPeriod);
    const receipt = (await tx.wait()) as ContractTransactionReceipt;
    return receipt;
  } catch (error) {
    handleContractError(error, 'set lock period');
  }
};

export const setAdmin = async (user: string, status: boolean) => {
  const contract = await getAuStakeContract();
  try {
    const tx = await contract.setAdmin(user, status);
    const receipt = (await tx.wait()) as ContractTransactionReceipt;
    return receipt;
  } catch (error) {
    handleContractError(error, 'set admin');
  }
};

export const setProjectWallet = async (projectWallet: string) => {
  const contract = await getAuStakeContract();
  try {
    const tx = await contract.setProjectWallet(projectWallet);
    const receipt = (await tx.wait()) as ContractTransactionReceipt;
    return receipt;
  } catch (error) {
    handleContractError(error, 'set project wallet');
  }
};

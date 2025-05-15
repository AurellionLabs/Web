import { IAuStakeRepository, StakingOperationStatus } from '@/domain/austake';
import {
  AuStake as AuStakeContract,
  AuStake__factory,
  AuraGoat, // For token approval in addStake
  AuraGoat__factory, // For token approval in addStake
} from '@/typechain-types';
import {
  BigNumberish,
  BytesLike,
  ContractTransactionReceipt,
  ethers,
  BrowserProvider,
  Signer,
  Provider,
  ContractTransactionResponse,
  TransactionReceipt,
} from 'ethers';
import {
  NEXT_PUBLIC_AUSTAKE_ADDRESS,
  // NEXT_PUBLIC_AURA_GOAT_ADDRESS, // Will be passed as tokenAddress to addStake if needed for approval
} from '@/chain-constants';

// Basic error handler, can be expanded
const handleRepositoryError = (error: any, methodName: string) => {
  console.error(`Error in BlockchainAuStakeRepository.${methodName}:`, error);
  if (error instanceof Error) {
    throw new Error(
      `BlockchainAuStakeRepository.${methodName} failed: ${error.message}`,
    );
  }
  throw new Error(
    `BlockchainAuStakeRepository.${methodName} failed with an unknown error.`,
  );
};

export class AuStakeRepository implements IAuStakeRepository {
  private contract: AuStakeContract;
  private signer: Signer;
  private provider: Provider; // Or BrowserProvider

  constructor(
    provider: Provider, // Or BrowserProvider
    signer: Signer,
    auStakeContractAddress: string = NEXT_PUBLIC_AUSTAKE_ADDRESS,
  ) {
    if (!auStakeContractAddress) {
      throw new Error(
        '[BlockchainAuStakeRepository] AuStake contract address is undefined',
      );
    }
    this.provider = provider;
    this.signer = signer;
    this.contract = AuStake__factory.connect(
      auStakeContractAddress,
      this.signer,
    );
  }

  async getOperation(
    operationId: BytesLike,
  ): Promise<AuStakeContract.OperationStructOutput | undefined> {
    const methodName = 'getOperationById';
    try {
      // The type AuStakeContract.OperationStructOutput is an *assumption* of TypeChain's output.
      // You MUST verify this exact type name in your generated typechain-types/contracts/AuStake.ts file.
      const op: AuStakeContract.OperationStructOutput =
        await this.contract.getOperation(operationId);

      // Check if the operation is valid (e.g., id is not zero hash and token is not zero address)
      // Solidity struct members are accessed directly by their name from the TypeChain output struct.
      if (
        !op ||
        op.id === ethers.ZeroHash ||
        op.id === '0x' ||
        op.token === ethers.ZeroAddress
      ) {
        console.error('couldnt find an operation');
        return undefined;
      }

      return op;
    } catch (error) {
      console.warn(
        `[${methodName}] Error fetching operation or operation not found:`,
        error,
      );
      return undefined;
    }
  }

  async createOperation(
    name: string,
    description: string,
    token: string,
    provider: string,
    deadline: BigNumberish,
    reward: BigNumberish,
    rwaName: string,
    fundingGoal: BigNumberish,
    assetPrice: BigNumberish,
  ): Promise<
    | { txReceipt: ContractTransactionReceipt; operationId: BytesLike }
    | undefined
  > {
    const methodName = 'createOperation';
    try {
      // The contract function returns bytes32 id. TypeChain might make this directly available.
      // If direct return: const operationId = await this.contract.createOperation(...);
      // const tx = operationId.getTransaction(); // if operationId is a ContractTransactionResponse
      // Or, contract.createOperation might return a TransactionResponse, and we listen for an event for the ID.
      // Let's assume it returns a TransactionResponse, and we need to parse the event for ID or contract returns it.
      // The AuStake.sol `createOperation` returns `bytes32`. So, TypeChain *should* allow us to get this.

      //This is a non-view function, so it will return a ContractTransactionResponse
      const txResponse: ContractTransactionResponse =
        await this.contract.createOperation(
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

      const txReceipt = await txResponse.wait();
      if (!txReceipt) {
        throw new Error('Transaction receipt not found for createOperation');
      }

      // How to get the operationId?
      // 1. If the function call itself returned it (not typical for non-view state changing func before tx.wait())
      // 2. From events in the receipt.
      // The AuStake.sol emits `OperationCreated(id, name, token);`
      // And `createOperation` function definition is `returns (bytes32)`
      // Ethers v6: For non-view functions that return a value, the value is available on the receipt
      // or by calling a view function that was populated by the transaction.
      // Let's try to find it in the events first as it is more robust.

      let operationIdFromEvent: BytesLike | undefined = undefined;
      if (txReceipt.logs) {
        const eventSignature =
          this.contract.interface.getEvent('OperationCreated').topicHash;
        const eventLog = txReceipt.logs.find(
          (log) => log.topics[0] === eventSignature,
        );
        if (eventLog) {
          const parsedLog = this.contract.interface.parseLog(eventLog as any); // Type assertion
          if (parsedLog && parsedLog.args.operationId) {
            operationIdFromEvent = parsedLog.args.operationId;
          }
        }
      }

      if (!operationIdFromEvent) {
        // Fallback or if TypeChain/Ethers directly provide return values from non-view functions
        // This part is tricky with Ethers. For `returns (bytes32)` in a state-changing function,
        // the value isn't usually directly on `txReceipt`. One might need to call a getter or rely on events.
        // However, the `AuStake.sol` does `return id;`. Some versions/setups of Ethers+TypeChain might expose this.
        // For now, relying on the event is safer. If event parsing fails, we throw.
        throw new Error(
          'Could not extract operationId from OperationCreated event',
        );
      }

      return {
        txReceipt: txReceipt as ContractTransactionReceipt,
        operationId: operationIdFromEvent,
      };
    } catch (error) {
      handleRepositoryError(error, methodName);
      return undefined;
    }
  }

  async addStake(
    tokenAddress: string,
    operationId: BytesLike,
    amount: BigNumberish,
  ): Promise<ContractTransactionReceipt | undefined> {
    const methodName = 'addStake';
    try {
      // Handle ERC20 approval
      // const tokenContract = AuraGoat__factory.connect(tokenAddress, this.signer);
      const erc20AbiForApproval = [
        'function allowance(address owner, address spender) view returns (uint256)',
        'function approve(address spender, uint256 amount) nonpayable returns (bool)',
      ];
      const tokenContract = new ethers.Contract(
        tokenAddress,
        erc20AbiForApproval,
        this.signer,
      );

      const allowance = await tokenContract.allowance(
        await this.signer.getAddress(),
        await this.contract.getAddress(),
      );

      if (BigInt(allowance.toString()) < BigInt(amount.toString())) {
        const approveTx = await tokenContract.approve(
          await this.contract.getAddress(),
          amount,
        );
        await approveTx.wait(); // approveTx is a TransactionResponse, wait for receipt
      }

      const tx = await this.contract.stake(tokenAddress, operationId, amount);
      return tx.wait() as Promise<ContractTransactionReceipt>;
    } catch (error) {
      handleRepositoryError(error, methodName);
      return undefined;
    }
  }

  async claimReward(
    token: string,
    operationId: BytesLike,
    user: string,
  ): Promise<ContractTransactionReceipt | undefined> {
    const methodName = 'claimReward';
    try {
      const tx = await this.contract.claimReward(token, operationId, user);
      return tx.wait() as Promise<ContractTransactionReceipt>;
    } catch (error) {
      handleRepositoryError(error, methodName);
      return undefined;
    }
  }

  async unlockRewards(
    token: string,
    operationId: BytesLike,
  ): Promise<ContractTransactionReceipt | undefined> {
    const methodName = 'unlockRewards';
    try {
      const tx = await this.contract.unlockReward(token, operationId);
      return tx.wait() as Promise<ContractTransactionReceipt>;
    } catch (error) {
      handleRepositoryError(error, methodName);
      return undefined;
    }
  }

  async updateOperationReward(
    operationId: BytesLike,
    amount: BigNumberish,
  ): Promise<ContractTransactionReceipt | undefined> {
    const methodName = 'updateOperationReward';
    try {
      const tx = await this.contract.setOperationReward(operationId, amount);
      return tx.wait() as Promise<ContractTransactionReceipt>;
    } catch (error) {
      handleRepositoryError(error, methodName);
      return undefined;
    }
  }

  async updateLockPeriod(
    lockPeriod: BigNumberish,
  ): Promise<ContractTransactionReceipt | undefined> {
    const methodName = 'updateLockPeriod';
    try {
      const tx = await this.contract.setLockPeriod(lockPeriod);
      return tx.wait() as Promise<ContractTransactionReceipt>;
    } catch (error) {
      handleRepositoryError(error, methodName);
      return undefined;
    }
  }

  async updateAdminStatus(
    user: string,
    status: boolean,
  ): Promise<ContractTransactionReceipt | undefined> {
    const methodName = 'updateAdminStatus';
    try {
      const tx = await this.contract.setAdmin(user, status);
      return tx.wait() as Promise<ContractTransactionReceipt>;
    } catch (error) {
      handleRepositoryError(error, methodName);
      return undefined;
    }
  }

  async updateProjectWallet(
    projectWallet: string,
  ): Promise<ContractTransactionReceipt | undefined> {
    const methodName = 'updateProjectWallet';
    try {
      const tx = await this.contract.setProjectWallet(projectWallet);
      return tx.wait() as Promise<ContractTransactionReceipt>;
    } catch (error) {
      handleRepositoryError(error, methodName);
      return undefined;
    }
  }

  async burnStake(
    token: string,
    user: string,
    operationId: BytesLike,
  ): Promise<ContractTransactionReceipt | undefined> {
    const methodName = 'burnStake';
    try {
      const tx = await this.contract.burn(token, user, operationId);
      return tx.wait() as Promise<ContractTransactionReceipt>;
    } catch (error) {
      handleRepositoryError(error, methodName);
      return undefined;
    }
  }
}

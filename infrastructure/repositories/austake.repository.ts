import {
  IAuStakeRepository,
  StakingOperation,
  StakingOperationStatus,
} from '@/domain/austake';
import {
  AuStake,
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

export class BlockchainAuStakeRepository implements IAuStakeRepository {
  private contract: AuStake;
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

  async findOperationById(
    operationId: BytesLike,
  ): Promise<StakingOperation | undefined> {
    const methodName = 'findOperationById';
    try {
      const op = await this.contract.getOperation(operationId);
      // If operationId is zero or some other indicator of not found, handle appropriately
      // Use op.returnId which is the id from the struct, and op.token to ensure it's a populated struct.
      if (
        op.returnId === ethers.ZeroHash ||
        op.returnId === '0x' ||
        op.token === ethers.ZeroAddress
      ) {
        return undefined;
      }
      return {
        id: op.returnId, // Note: struct in solidity has 'id', typechain generated op.returnId
        name: op.name,
        description: op.description,
        token: op.token,
        provider: op.provider,
        deadline: op.deadline, // BigInt(op.deadline.toString()),
        startDate: op.startDate, // BigInt(op.startDate.toString()),
        rwaName: op.rwaName,
        reward: op.reward, // BigInt(op.reward.toString()),
        tokenTvl: op.tokenTvl, // BigInt(op.tokenTvl.toString()),
        operationStatus:
          op.operationStatus as unknown as StakingOperationStatus,
        fundingGoal: op.fundingGoal, // BigInt(op.fundingGoal.toString()),
        assetPrice: op.assetPrice, // BigInt(op.assetPrice.toString()),
      };
    } catch (error) {
      // If error is due to "not found" (e.g. revert), return undefined
      // This depends on how the contract behaves for non-existent IDs
      console.warn(
        `[${methodName}] Potentially operation not found or error:`,
        error,
      );
      // handleRepositoryError(error, methodName); // Or let service decide if to throw
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

      let operationId: BytesLike | undefined = undefined;
      if (txReceipt.logs) {
        const eventSignature =
          this.contract.interface.getEvent('OperationCreated').topicHash;
        const eventLog = txReceipt.logs.find(
          (log) => log.topics[0] === eventSignature,
        );
        if (eventLog) {
          const parsedLog = this.contract.interface.parseLog(eventLog as any); // Type assertion
          if (parsedLog && parsedLog.args.operationId) {
            operationId = parsedLog.args.operationId;
          }
        }
      }

      if (!operationId) {
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
        operationId,
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

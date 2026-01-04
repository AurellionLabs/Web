import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { ContractTransactionReceipt } from 'ethers';
import {
  RWYOpportunityCreationData,
  Address,
  BigNumberString,
} from '../domain/rwy';
import { RWYService } from '../infrastructure/services/rwy-service';

const RWY_VAULT_ADDRESS = process.env.NEXT_PUBLIC_RWY_VAULT_ADDRESS || '';

interface ActionState {
  loading: boolean;
  error: string | null;
  txHash: string | null;
}

/**
 * Hook for RWY staking actions
 */
export function useRWYStakeActions() {
  const [state, setState] = useState<ActionState>({
    loading: false,
    error: null,
    txHash: null,
  });

  const getService = useCallback(async () => {
    if (!window.ethereum) {
      throw new Error('No wallet connected');
    }
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return new RWYService(RWY_VAULT_ADDRESS, signer);
  }, []);

  const stake = useCallback(
    async (
      opportunityId: string,
      amount: BigNumberString,
    ): Promise<ContractTransactionReceipt | undefined> => {
      try {
        setState({ loading: true, error: null, txHash: null });

        const service = await getService();
        const signer = await new ethers.BrowserProvider(
          window.ethereum,
        ).getSigner();
        const address = await signer.getAddress();

        const receipt = await service.stake(
          opportunityId,
          amount,
          address as Address,
        );

        setState({
          loading: false,
          error: null,
          txHash: receipt?.hash || null,
        });

        return receipt;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Stake failed';
        setState({ loading: false, error: errorMessage, txHash: null });
        throw err;
      }
    },
    [getService],
  );

  const unstake = useCallback(
    async (
      opportunityId: string,
      amount: BigNumberString,
    ): Promise<ContractTransactionReceipt | undefined> => {
      try {
        setState({ loading: true, error: null, txHash: null });

        const service = await getService();
        const signer = await new ethers.BrowserProvider(
          window.ethereum,
        ).getSigner();
        const address = await signer.getAddress();

        const receipt = await service.unstake(
          opportunityId,
          amount,
          address as Address,
        );

        setState({
          loading: false,
          error: null,
          txHash: receipt?.hash || null,
        });

        return receipt;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unstake failed';
        setState({ loading: false, error: errorMessage, txHash: null });
        throw err;
      }
    },
    [getService],
  );

  const claimProfits = useCallback(
    async (
      opportunityId: string,
    ): Promise<ContractTransactionReceipt | undefined> => {
      try {
        setState({ loading: true, error: null, txHash: null });

        const service = await getService();
        const signer = await new ethers.BrowserProvider(
          window.ethereum,
        ).getSigner();
        const address = await signer.getAddress();

        const receipt = await service.claimProfits(
          opportunityId,
          address as Address,
        );

        setState({
          loading: false,
          error: null,
          txHash: receipt?.hash || null,
        });

        return receipt;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Claim failed';
        setState({ loading: false, error: errorMessage, txHash: null });
        throw err;
      }
    },
    [getService],
  );

  const emergencyClaim = useCallback(
    async (
      opportunityId: string,
    ): Promise<ContractTransactionReceipt | undefined> => {
      try {
        setState({ loading: true, error: null, txHash: null });

        const service = await getService();
        const signer = await new ethers.BrowserProvider(
          window.ethereum,
        ).getSigner();
        const address = await signer.getAddress();

        const receipt = await service.emergencyClaim(
          opportunityId,
          address as Address,
        );

        setState({
          loading: false,
          error: null,
          txHash: receipt?.hash || null,
        });

        return receipt;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Emergency claim failed';
        setState({ loading: false, error: errorMessage, txHash: null });
        throw err;
      }
    },
    [getService],
  );

  const approveTokens = useCallback(
    async (
      tokenAddress: Address,
    ): Promise<ContractTransactionReceipt | undefined> => {
      try {
        setState({ loading: true, error: null, txHash: null });

        const service = await getService();
        const signer = await new ethers.BrowserProvider(
          window.ethereum,
        ).getSigner();
        const address = await signer.getAddress();

        const receipt = await service.approveTokensForStaking(
          tokenAddress,
          address as Address,
        );

        setState({
          loading: false,
          error: null,
          txHash: receipt?.hash || null,
        });

        return receipt;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Approval failed';
        setState({ loading: false, error: errorMessage, txHash: null });
        throw err;
      }
    },
    [getService],
  );

  const checkApproval = useCallback(
    async (tokenAddress: Address): Promise<boolean> => {
      try {
        const service = await getService();
        const signer = await new ethers.BrowserProvider(
          window.ethereum,
        ).getSigner();
        const address = await signer.getAddress();

        return await service.isApprovedForStaking(
          tokenAddress,
          address as Address,
        );
      } catch (err) {
        console.error('Error checking approval:', err);
        return false;
      }
    },
    [getService],
  );

  return {
    ...state,
    stake,
    unstake,
    claimProfits,
    emergencyClaim,
    approveTokens,
    checkApproval,
  };
}

/**
 * Hook for RWY operator actions
 */
export function useRWYOperatorActions() {
  const [state, setState] = useState<ActionState>({
    loading: false,
    error: null,
    txHash: null,
  });

  const getService = useCallback(async () => {
    if (!window.ethereum) {
      throw new Error('No wallet connected');
    }
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return new RWYService(RWY_VAULT_ADDRESS, signer);
  }, []);

  const createOpportunity = useCallback(
    async (
      data: RWYOpportunityCreationData,
    ): Promise<{ opportunityId: string; transactionHash: string }> => {
      try {
        setState({ loading: true, error: null, txHash: null });

        const service = await getService();
        const signer = await new ethers.BrowserProvider(
          window.ethereum,
        ).getSigner();
        const address = await signer.getAddress();

        const result = await service.createOpportunity(
          data,
          address as Address,
        );

        setState({
          loading: false,
          error: null,
          txHash: result.transactionHash,
        });

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Creation failed';
        setState({ loading: false, error: errorMessage, txHash: null });
        throw err;
      }
    },
    [getService],
  );

  const startDelivery = useCallback(
    async (
      opportunityId: string,
      journeyId: string,
    ): Promise<ContractTransactionReceipt | undefined> => {
      try {
        setState({ loading: true, error: null, txHash: null });

        const service = await getService();
        const signer = await new ethers.BrowserProvider(
          window.ethereum,
        ).getSigner();
        const address = await signer.getAddress();

        const receipt = await service.startDelivery(
          opportunityId,
          journeyId,
          address as Address,
        );

        setState({
          loading: false,
          error: null,
          txHash: receipt?.hash || null,
        });

        return receipt;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Start delivery failed';
        setState({ loading: false, error: errorMessage, txHash: null });
        throw err;
      }
    },
    [getService],
  );

  const confirmDelivery = useCallback(
    async (
      opportunityId: string,
      deliveredAmount: BigNumberString,
    ): Promise<ContractTransactionReceipt | undefined> => {
      try {
        setState({ loading: true, error: null, txHash: null });

        const service = await getService();
        const signer = await new ethers.BrowserProvider(
          window.ethereum,
        ).getSigner();
        const address = await signer.getAddress();

        const receipt = await service.confirmDelivery(
          opportunityId,
          deliveredAmount,
          address as Address,
        );

        setState({
          loading: false,
          error: null,
          txHash: receipt?.hash || null,
        });

        return receipt;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Confirm delivery failed';
        setState({ loading: false, error: errorMessage, txHash: null });
        throw err;
      }
    },
    [getService],
  );

  const completeProcessing = useCallback(
    async (
      opportunityId: string,
      outputTokenId: string,
      actualOutputAmount: BigNumberString,
    ): Promise<ContractTransactionReceipt | undefined> => {
      try {
        setState({ loading: true, error: null, txHash: null });

        const service = await getService();
        const signer = await new ethers.BrowserProvider(
          window.ethereum,
        ).getSigner();
        const address = await signer.getAddress();

        const receipt = await service.completeProcessing(
          opportunityId,
          outputTokenId,
          actualOutputAmount,
          address as Address,
        );

        setState({
          loading: false,
          error: null,
          txHash: receipt?.hash || null,
        });

        return receipt;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Complete processing failed';
        setState({ loading: false, error: errorMessage, txHash: null });
        throw err;
      }
    },
    [getService],
  );

  const cancelOpportunity = useCallback(
    async (
      opportunityId: string,
      reason: string,
    ): Promise<ContractTransactionReceipt | undefined> => {
      try {
        setState({ loading: true, error: null, txHash: null });

        const service = await getService();
        const signer = await new ethers.BrowserProvider(
          window.ethereum,
        ).getSigner();
        const address = await signer.getAddress();

        const receipt = await service.cancelOpportunity(
          opportunityId,
          reason,
          address as Address,
        );

        setState({
          loading: false,
          error: null,
          txHash: receipt?.hash || null,
        });

        return receipt;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Cancel failed';
        setState({ loading: false, error: errorMessage, txHash: null });
        throw err;
      }
    },
    [getService],
  );

  return {
    ...state,
    createOpportunity,
    startDelivery,
    confirmDelivery,
    completeProcessing,
    cancelOpportunity,
  };
}

import { useState, useCallback } from 'react';
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';
import { encodeBytes32String } from 'ethers';

type SignatureStatus = 'idle' | 'signing' | 'waiting' | 'complete' | 'error';

interface UsePackageSignatureProcessProps {
  jobId: string; // The job ID string
  // Required parameters for the actual packageSign contract call
  driverAddress: string;
  senderAddress: string;
}

interface UsePackageSignatureProcessReturn {
  signAndListen: () => Promise<void>;
  status: SignatureStatus;
  error: string | null;
  reset: () => void;
}

/**
 * Hook to manage the process of signing a package and then listening
 * for the second party's signature confirmation.
 */
export function usePackageSignatureProcess({
  jobId,
  driverAddress,
  senderAddress,
}: UsePackageSignatureProcessProps): UsePackageSignatureProcessReturn {
  const [status, setStatus] = useState<SignatureStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const repoContext = RepositoryContext.getInstance(); // Get singleton instance

  const signAndListen = useCallback(async () => {
    setStatus('signing');
    setError(null);

    // --- Input Validation ---
    if (!jobId || !driverAddress || !senderAddress) {
      const errMsg =
        'Missing required parameters: jobId, driverAddress, or senderAddress';
      console.error(`[usePackageSignatureProcess] ${errMsg}`);
      setError(errMsg);
      setStatus('error');
      return;
    }

    let jobIdBytes32: string;
    try {
      // Ensure jobID is formatted correctly for bytes32 conversion
      const formattedJobId = jobId.length > 31 ? jobId.substring(0, 31) : jobId;
      jobIdBytes32 = encodeBytes32String(formattedJobId);
    } catch (encodeError) {
      console.error(
        `[usePackageSignatureProcess] Error encoding job ID string '${jobId}':`,
        encodeError,
      );
      setError('Invalid Job ID format for bytes32 conversion.');
      setStatus('error');
      return;
    }

    try {
      // Step 1: Get contract and call packageSign
      // Assumes the stored contract in repoContext is connected to the correct signer (current user)
      const contract = repoContext.getAusysContract();

      // IMPORTANT: This assumes the current connected user (via repoContext.signer)
      // is either the senderAddress or the driverAddress passed to this hook,
      // and they are calling the correct role in packageSign.
      // You might need more sophisticated role checking or separate hook inputs/logic
      // depending on who calls this (sender or driver).
      // packageSign(bytes32 id) — only the journey id is passed on-chain.
      const tx = await contract.packageSign(jobIdBytes32);
      await tx.wait(); // Wait for transaction confirmation

      // Step 2: Transaction successful, start listening
      setStatus('waiting');
      await repoContext.listenForSignature(jobId, driverAddress); // Listen for driver's signature

      // Step 3: Listener resolved successfully
      setStatus('complete');
      setError(null);
    } catch (err) {
      console.error(
        '[usePackageSignatureProcess] Error during sign or listen:',
        err,
      );
      setError(
        err instanceof Error ? err.message : 'An unknown error occurred.',
      );
      setStatus('error');
      // Note: If waitForSignaturesForJob times out, it rejects, landing here.
    }
  }, [repoContext, jobId, driverAddress, senderAddress]);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
  }, []);

  return { signAndListen, status, error, reset };
}

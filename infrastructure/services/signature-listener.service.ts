import { ethers } from 'ethers';
import type { Ausys as LocationContract } from '@/lib/contracts';

/**
 * Normalise a job ID to a bytes32 hex string for comparison with on-chain event data.
 *
 * On-chain `emitSig(address, bytes32)` events are decoded by ethers v6 as a 66-char hex
 * string (0x + 64 hex chars).  Callers may pass either:
 *   a) A bytes32 hex string already (0x + 64 hex chars) → used directly (lowercased)
 *   b) A short human-readable string ("JOB_001") → encoded via ethers.encodeBytes32String
 */
function normaliseJobId(jobID: string): string {
  if (jobID.startsWith('0x') && jobID.length === 66) {
    return jobID.toLowerCase();
  }
  // Short ASCII string — encode to bytes32
  return ethers.encodeBytes32String(jobID).toLowerCase();
}

/**
 * Listens for two distinct 'emitSig' events for a specific job ID on a given contract.
 * Resides in Infrastructure layer, providing a service to monitor blockchain events.
 * The domain concept is Multi-Party Signature Confirmation.
 *
 * Resolves true when two signatures from different addresses are detected.
 * Rejects on timeout or error.
 *
 * @param contract The ethers Contract instance to listen on.
 * @param jobID The ID of the job to listen for — either a 0x bytes32 hex string or a short
 *   ASCII string that will be right-padded to bytes32.
 * @param timeoutMs The timeout duration in milliseconds (default: 120000 ms / 2 minutes).
 * @returns A promise that resolves to true once two distinct signers are seen, otherwise rejects.
 */
export async function listenForSignature(
  contract: LocationContract,
  jobID: string,
  timeoutMs: number = 120000,
): Promise<boolean> {
  if (!contract) {
    throw new Error('Contract instance must be provided.');
  }

  const targetIdHex = normaliseJobId(jobID);

  return new Promise((resolve, reject) => {
    const detectedSigners = new Set<string>();

    // Filter on event name only; we match the ID inside the handler
    const filter = contract.filters.emitSig();

    const timeout = setTimeout(() => {
      contract.off(filter, handler);
      reject(
        new Error(
          `Timeout: fewer than 2 signatures received for job ID ${jobID} within ${timeoutMs / 1000}s.`,
        ),
      );
    }, timeoutMs);

    const handler = (address: string, id: unknown) => {
      // Normalise the incoming event ID to hex for comparison
      let eventIdHex: string | null = null;
      try {
        if (typeof id === 'string') {
          eventIdHex = id.startsWith('0x') ? id.toLowerCase() : null;
        } else if (id instanceof Uint8Array) {
          eventIdHex = ethers.hexlify(id).toLowerCase();
        }
      } catch {
        // Unrecognised type — skip
        return;
      }

      if (eventIdHex !== targetIdHex) return;

      const lowerAddress = address.toLowerCase();
      const sizeBefore = detectedSigners.size;
      detectedSigners.add(lowerAddress);

      if (detectedSigners.size <= sizeBefore) {
        // Duplicate from same address — ignore
        return;
      }

      if (detectedSigners.size >= 2) {
        contract.off(filter, handler);
        clearTimeout(timeout);
        resolve(true);
      }
    };

    contract.on(filter, handler);
  });
}

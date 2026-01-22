// @ts-nocheck - File with outdated contract types
import type { Ausys as LocationContract } from '@/lib/contracts';

// TODO: Refine ID comparison logic inside the handler based on testing/ethers version behavior.

/**
 * Listens for two distinct 'emitSig' events for a specific job ID on a given contract.
 * Resides in Infrastructure layer, providing a service to monitor blockchain events.
 * The domain concept is Multi-Party Signature Confirmation.
 *
 * Resolves true when two signatures from different addresses are detected.
 * Rejects on timeout or error.
 *
 * @param contract The ethers Contract instance (ideally typed with TypeChain) to listen on.
 * @param jobID The ID of the job to listen for signatures (string format).
 * @param timeoutMs The timeout duration in milliseconds (default: 120000 ms or 2 minutes).
 * @returns A promise that resolves to true if two distinct signatures are received, otherwise rejects.
 */
export async function listenForSignature(
  contract: LocationContract, // Accept typed contract instance
  jobID: string,
  timeoutMs: number = 120000,
): Promise<boolean> {
  try {
    if (!contract) {
      throw new Error('Contract instance must be provided.');
    }

    return new Promise((resolve, reject) => {
      // Note: Listener function expects string ID, but contract event uses bytes32.
      // Ensure the caller provides the *string* version.
      // Comparison logic inside handler attempts to reconcile.
      console.log(`Listening for signatures for job ID string: ${jobID}...`);
      let sigCount = 0;
      const detectedSigners = new Set<string>();

      // Filter only by event name, check ID inside handler due to string/bytes32 mismatch possibility.
      const filter = contract.filters.emitSig();

      const timeout = setTimeout(() => {
        contract.off(filter, handler);
        console.error(
          `Timeout waiting for signatures for job ID string: ${jobID}`,
        );
        reject(
          new Error(
            `Timeout: No second signature detected within ${timeoutMs / 1000} seconds.`,
          ),
        );
      }, timeoutMs);

      // Handler needs to compare the string jobID with the potentially bytes32 id from the event
      const handler = (
        address: string,
        id: any /* bytes32 likely */ /*, event */,
      ) => {
        // TODO: Verify the type and comparison logic for `id` based on real event data.
        let eventIdString: string | null = null;
        try {
          // TEMPORARY: Log the received ID type/value for debugging
          console.log(
            `Event received: address=${address}, raw id=${id} (type: ${typeof id})`,
          );

          // Basic handling/conversion attempt (NEEDS VERIFICATION)
          if (
            typeof id === 'string' &&
            id.startsWith('0x') &&
            id.length === 66
          ) {
            // Very basic check if it looks like bytes32 hex. Decoding might fail.
            // For direct comparison, converting jobIDString to bytes32 hex might be safer.
            eventIdString = id; // Keep as hex for now for potential comparison
          } else if (typeof id === 'string') {
            eventIdString = id; // Use directly if already string
          } else {
            // Handle other types if necessary (e.g., BigNumber)
            console.warn(
              'Received event ID is not a recognizable string or bytes32 hex.',
            );
          }
        } catch (decodeError) {
          console.error(`Error processing event ID ${id}:`, decodeError);
          return;
        }

        // --- ID Comparison Logic (CRITICAL - Placeholder) ---
        // Comparing input string `jobID` with event `id`.
        // This might require converting jobID to bytes32 hex and comparing hex strings.
        // const jobIDBytes32Hex = ethers.encodeBytes32String(jobID);
        // const isMatch = (eventIdString?.toLowerCase() === jobIDBytes32Hex?.toLowerCase());
        // Simpler placeholder for now (ASSUMES id might be string representation):
        const isMatch = eventIdString === jobID;
        console.log(
          `Comparing event id '${eventIdString}' with target '${jobID}'. Match: ${isMatch}`,
        );
        // ----------------------------------------------------

        if (isMatch) {
          const lowerCaseAddress = address.toLowerCase();
          const initialSize = detectedSigners.size;
          detectedSigners.add(lowerCaseAddress);

          if (detectedSigners.size > initialSize) {
            sigCount = detectedSigners.size;
            console.log(
              `Signature detected! From: ${address}, jobID: ${jobID}. Total unique signatures: ${sigCount}`,
            );

            if (sigCount >= 2) {
              console.log(
                `Two distinct signatures received for job ID: ${jobID}. Resolving.`,
              );
              contract.off(filter, handler);
              clearTimeout(timeout);
              resolve(true);
            }
          } else {
            console.log(
              `Duplicate signature from address: ${address} for job ID: ${jobID}. Still waiting for ${2 - sigCount} more unique signature(s).`,
            );
          }
        } else {
          console.log(
            `Ignoring event for different job ID (event id: ${eventIdString}, target: ${jobID})`,
          );
        }
      };

      contract.on(filter, handler);
      console.log('Event listener attached.');
    });
  } catch (e) {
    console.error('Error in listenForSignature setup:', e);
    throw e instanceof Error
      ? e
      : new Error('Unknown error during listener setup');
  }
}

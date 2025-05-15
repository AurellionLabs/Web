import { ethers } from 'hardhat';
import { expect } from 'chai';
import { Contract, Signer, encodeBytes32String } from 'ethers';
import { listenForSignature } from '../infrastructure/services/signature-listener.service';
import { NEXT_PUBLIC_AUSYS_ADDRESS } from '../chain-constants'; // Adjust path
import { LocationContract } from '@/typechain-types/contracts/AuSys.sol/LocationContract';
import { LocationContract__factory } from '@/typechain-types/factories/contracts/AuSys.sol/LocationContract__factory';

// Note: We might not need initializeProvider/getWebSigner from base-controller
// if Hardhat's ethers provider is sufficient for the listener setup.
// Let's try relying solely on Hardhat environment first.

// Increase Mocha timeout for integration tests involving event listeners
const TEST_TIMEOUT_MS = 30000; // 30 seconds, adjust if needed

describe('listenForSignature [Hardhat Integration]', function () {
  this.timeout(TEST_TIMEOUT_MS + 5000); // Set suite timeout

  let deployer: Signer;
  let signer1: Signer;
  let signer2: Signer;
  let ausysContract: LocationContract;

  before(async () => {
    // Ensure Hardhat environment is ready and get signers
    [deployer, signer1, signer2] = await ethers.getSigners();

    // Ensure the contract address constant is set
    if (!NEXT_PUBLIC_AUSYS_ADDRESS) {
      throw new Error(
        'NEXT_PUBLIC_AUSYS_ADDRESS environment variable is not set. Cannot run integration tests.',
      );
    }

    // Get a strongly-typed instance of the deployed contract using the TypeChain factory
    ausysContract = LocationContract__factory.connect(
      NEXT_PUBLIC_AUSYS_ADDRESS,
      deployer, // Connect with a signer (can be any signer, like deployer)
    );

    // Optional: Verify connection if needed (factory connect usually throws if address is invalid format)
    // try {
    //   await ausysContract.getAddress(); // Simple check
    // } catch (e) {
    //   throw new Error(`Failed to connect factory to address ${NEXT_PUBLIC_AUSYS_ADDRESS}: ${e}`);
    // }

    console.log(
      `Contract instance obtained at: ${await ausysContract.getAddress()}`,
    );
    console.log(`Using signers:`);
    console.log(`  Deployer: ${await deployer.getAddress()}`);
    console.log(`  Signer 1: ${await signer1.getAddress()}`);
    console.log(`  Signer 2: ${await signer2.getAddress()}`);

    // Potentially initialize the base-controller provider/signer if needed by listenForSignature.
    // If listenForSignature *requires* window.ethereum via BrowserProvider,
    // these tests might need more setup (like mocking BrowserProvider or adapting the listener).
    // Let's assume for now listenForSignature works with Hardhat's provider.
    // await initializeProvider(); // Maybe needed? Try without first.
  });

  it('should resolve true when two distinct signatures are emitted', async () => {
    const jobIDString = `hardhat-job-${Date.now()}`.substring(0, 31); // Max 31 chars for encodeBytes32String
    const jobIDBytes32 = encodeBytes32String(jobIDString);
    console.log(
      `Test starting for jobID string: ${jobIDString}, bytes32: ${jobIDBytes32}`,
    );

    // Start the listener *before* triggering events
    // Pass the contract instance to the listener
    const listenPromise = listenForSignature(
      ausysContract,
      jobIDString,
      TEST_TIMEOUT_MS - 2000,
    );

    console.log('Listener started, triggering events...');

    // Define sender and driver for clarity
    const senderSigner = signer1;
    const driverSigner = signer2;
    const senderAddress = await senderSigner.getAddress();
    const driverAddress = await driverSigner.getAddress();

    // Trigger the first event using senderSigner
    try {
      console.log(
        `Calling packageSign as sender (${senderAddress}) for job ${jobIDBytes32}`,
      );
      // Now using the strongly-typed LocationContract instance
      const tx1 = await ausysContract
        .connect(senderSigner)
        .packageSign(driverAddress, senderAddress, jobIDBytes32);
      await tx1.wait(); // Wait for the transaction to be mined
      console.log(
        `Event 1 potentially triggered by Sender ${senderAddress} for job ${jobIDString}`,
      );
    } catch (e) {
      console.error('Failed to trigger event 1 (sender call):', e);
      throw new Error('Ensure `packageSign` exists and sender can call it.');
    }

    // Add a small delay to ensure the first event is processed by the listener
    await new Promise((res) => setTimeout(res, 500));

    // Trigger the second event using driverSigner
    try {
      console.log(
        `Calling packageSign as driver (${driverAddress}) for job ${jobIDBytes32}`,
      );
      const tx2 = await ausysContract
        .connect(driverSigner)
        .packageSign(driverAddress, senderAddress, jobIDBytes32);
      await tx2.wait();
      console.log(
        `Event 2 potentially triggered by Driver ${driverAddress} for job ${jobIDString}`,
      );
    } catch (e) {
      console.error('Failed to trigger event 2 (driver call):', e);
      throw new Error('Ensure `packageSign` exists and driver can call it.');
    }

    // Wait for the listener promise to resolve
    console.log('Waiting for listener promise to resolve...');
    // Using chai-as-promised for cleaner async expectation
    expect(listenPromise).to.eventually.equal(true);
    console.log(`Listener resolved true for ${jobIDString} as expected.`);
  });

  it('should reject with timeout if only one unique signature is emitted', async () => {
    const jobIDString = `hardhat-job-${Date.now()}`.substring(0, 31);
    const jobIDBytes32 = encodeBytes32String(jobIDString);
    const listenerTimeoutMs = 5000; // Shorter timeout for this test
    console.log(
      `Test starting for jobID string: ${jobIDString}, bytes32: ${jobIDBytes32}`,
    );

    // Pass the contract instance to the listener
    const listenPromise = listenForSignature(
      ausysContract,
      jobIDString,
      listenerTimeoutMs,
    );

    console.log('Listener started, triggering one event...');

    // Define sender and driver for clarity
    const senderSigner = signer1;
    const driverSigner = signer2; // Keep distinct roles even if only one signs
    const senderAddress = await senderSigner.getAddress();
    const driverAddress = await driverSigner.getAddress();

    // Trigger event only once using senderSigner
    try {
      console.log(
        `Calling packageSign as sender (${senderAddress}) for job ${jobIDBytes32}`,
      );
      // Now using the strongly-typed LocationContract instance
      const tx1 = await ausysContract
        .connect(senderSigner)
        .packageSign(driverAddress, senderAddress, jobIDBytes32);
      await tx1.wait();
      console.log(
        `Event 1 potentially triggered by Sender ${senderAddress} for job ${jobIDString}`,
      );
    } catch (e) {
      console.error('Failed to trigger event 1 (sender call):', e);
      throw new Error('Ensure `packageSign` exists and sender can call it.');
    }

    // Wait for the listener promise to reject (using Hardhat/Chai promises)
    console.log('Waiting for listener promise to reject...');
    // Using chai-as-promised for cleaner async rejection test
    await expect(listenPromise).to.be.rejectedWith(
      `Timeout: No second signature detected within ${listenerTimeoutMs / 1000} seconds.`,
    );
    console.log(`Listener rejected for ${jobIDString} as expected.`);
  });

  it('should reject with timeout if no signatures are emitted', async () => {
    const jobIDString = `hardhat-job-${Date.now()}`.substring(0, 31);
    const listenerTimeoutMs = 5000;
    console.log(`Test starting for jobID string: ${jobIDString}`);

    // Pass the contract instance to the listener
    const listenPromise = listenForSignature(
      ausysContract,
      jobIDString,
      listenerTimeoutMs,
    );

    console.log('Listener started, not triggering any events...');

    // Do not trigger any events

    console.log('Waiting for listener promise to reject...');
    // Using chai-as-promised for cleaner async rejection test
    await expect(listenPromise).to.be.rejectedWith(
      `Timeout: No second signature detected within ${listenerTimeoutMs / 1000} seconds.`,
    );
    console.log(`Listener rejected for ${jobIDString} as expected.`);
  });

  // Add more tests if needed (e.g., ignoring events for different job IDs)
});

// Helper/placeholder for the contract interaction - replace emitTestSignature
// with the actual function name in your AUSYS contract that emits the `emitSig` event.
// Example ABI snippet assumption:
// interface LocationContract {
//   "function packageSign(address driver, address sender, bytes32 id)": FunctionFragment;
//   "event emitSig(address indexed user, bytes32 indexed id)": EventFragment;
// }

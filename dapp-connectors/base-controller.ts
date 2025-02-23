import { BrowserProvider, JsonRpcSigner } from "ethers";

let ethersProvider: BrowserProvider | undefined;
let signer: JsonRpcSigner | undefined;
export let walletAddress: string;

export const setWalletProvider = async (_ethersProvider: BrowserProvider) => {
    try {
        ethersProvider = _ethersProvider;
        signer = await ethersProvider.getSigner();
        walletAddress = await signer.getAddress();
        console.log("Wallet connected successfully. Address:", walletAddress);
    } catch (error) {
        console.error("Failed to connect wallet:", error);
        throw error;
    }
};

// Export provider and signer for other controllers
export { ethersProvider, signer };

// Common error handling
export interface ContractError extends Error {
    code?: string;
    reason?: string;
    transaction?: any;
}

export const handleContractError = (error: any, context: string): never => {
    const contractError: ContractError = error;
    console.error(`Error in ${context}:`, {
        message: contractError.message,
        code: contractError.code,
        reason: contractError.reason,
        transaction: contractError.transaction
    });

    if (contractError.code === 'ACTION_REJECTED') {
        throw new Error('Transaction was rejected by user');
    }
    
    if (contractError.reason) {
        throw new Error(contractError.reason);
    }

    throw new Error(`Failed to ${context}: ${contractError.message}`);
}; 
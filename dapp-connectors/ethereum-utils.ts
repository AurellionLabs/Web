import { BigNumberish } from "ethers";

// utils/ethereum.ts
export const formatEthereumValue = (weiValue: BigNumberish, decimals = 4): string => {
    if (!weiValue) return '0';
    try {
        const valueInWei = typeof weiValue === 'string' ? BigInt(weiValue) : weiValue;
        // Convert to string first to preserve precision
        const etherValue = (Number(valueInWei) / Math.pow(10, 18)).toString();
        // Split at decimal
        const [whole, decimal = ''] = etherValue.split('.');
        // Truncate decimal to 18 places without rounding
        const truncatedDecimal = decimal.slice(0, 18);
        return truncatedDecimal ? `${whole}.${truncatedDecimal}` : whole;
    } catch (error) {
        console.error('Error formatting Ethereum value:', error);
        return '0';
    }
};

import { BigNumberish, formatUnits } from 'ethers';

// utils/ethereum.ts
export const formatEthereumValue = (
  weiValue: BigNumberish,
  tokenDecimals = 18,
  displayDecimals = 4
): string => {
  if (!weiValue) return '0';
  
  try {
    // Use ethers' formatUnits which properly handles BigNumber values
    const formattedValue = formatUnits(weiValue, tokenDecimals);
    
    // Split the value to handle decimals properly
    const [whole, fraction = ''] = formattedValue.split('.');
    
    // Format the decimal places without rounding
    const truncatedDecimal = fraction.slice(0, displayDecimals);
    
    // Remove trailing zeros
    const cleanDecimal = truncatedDecimal.replace(/0+$/, '');
    
    // Only include decimal point if we have decimal values
    return cleanDecimal ? `${whole}.${cleanDecimal}` : whole;
    
  } catch (error) {
    console.error('Error formatting token value:', error, {
      value: weiValue,
      tokenDecimals,
      displayDecimals
    });
    return '0';
  }
};

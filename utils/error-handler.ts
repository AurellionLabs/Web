export function handleContractError(error: any, context: string): never {
  console.error(`Error in ${context}:`, error);
  if (error instanceof Error) {
    throw new Error(`Contract error in ${context}: ${error.message}`);
  }
  throw new Error(`Unknown contract error in ${context}`);
}

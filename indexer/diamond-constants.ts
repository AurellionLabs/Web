// Diamond contract constants for the Ponder indexer
// These can be overridden by environment variables

export const DIAMOND_ADDRESS =
  (process.env.NEXT_PUBLIC_DIAMOND_ADDRESS as `0x${string}`) ||
  '0x0000000000000000000000000000000000000000';

export const DIAMOND_DEPLOY_BLOCK = parseInt(
  process.env.DIAMOND_DEPLOY_BLOCK || '0',
  10,
);

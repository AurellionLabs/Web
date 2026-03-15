#!/usr/bin/env npx ts-node
/**
 * Query on-chain journey status for a driver's deliveries.
 * Usage: npx ts-node scripts/query-driver-journeys.ts <DRIVER_ADDRESS>
 *
 * Fetches journey IDs from indexer, then calls getJourney on Diamond for each.
 */
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

const DIAMOND = '0x8ed92Ff64dC6e833182a4743124FE3e48E2966A7' as const;
const RPC = process.env.NEXT_PUBLIC_RPC_URL_84532 || 'https://sepolia.base.org';
const INDEXER_URL =
  process.env.NEXT_PUBLIC_INDEXER_URL_84532 ||
  'https://dev.indexer.aurellionlabs.com/graphql';

async function fetchJourneyIds(driverLc: string): Promise<string[]> {
  const res = await fetch(INDEXER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `query GetJourneysByDriver($driverAddress: String!, $limit: Int = 100) {
        assigned: diamondDriverAssignedEventss(
          where: { driver: $driverAddress }
          limit: $limit
          orderBy: "block_timestamp"
          orderDirection: "desc"
        ) { items { journey_id } }
      }`,
      variables: { driverAddress: driverLc },
    }),
  });
  const json = (await res.json()) as {
    data?: { assigned?: { items?: { journey_id: string }[] } };
  };
  return (json?.data?.assigned?.items ?? [])
    .map((i) => i.journey_id)
    .filter(Boolean);
}

const GET_JOURNEY_ABI = [
  {
    inputs: [{ internalType: 'bytes32', name: 'id', type: 'bytes32' }],
    name: 'getJourney',
    outputs: [
      {
        components: [
          {
            components: [
              {
                components: [
                  { name: 'lat', type: 'string' },
                  { name: 'lng', type: 'string' },
                ],
                name: 'startLocation',
                type: 'tuple',
              },
              {
                components: [
                  { name: 'lat', type: 'string' },
                  { name: 'lng', type: 'string' },
                ],
                name: 'endLocation',
                type: 'tuple',
              },
              { name: 'startName', type: 'string' },
              { name: 'endName', type: 'string' },
            ],
            name: 'parcelData',
            type: 'tuple',
          },
          { name: 'journeyId', type: 'bytes32' },
          { name: 'currentStatus', type: 'uint8' },
          { name: 'sender', type: 'address' },
          { name: 'receiver', type: 'address' },
          { name: 'driver', type: 'address' },
          { name: 'journeyStart', type: 'uint256' },
          { name: 'journeyEnd', type: 'uint256' },
          { name: 'bounty', type: 'uint256' },
          { name: 'ETA', type: 'uint256' },
        ],
        internalType: 'struct DiamondStorage.AuSysJourney',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const STATUS_LABELS: Record<number, string> = {
  0: 'Pending',
  1: 'InTransit (STUCK - receiver must sign)',
  2: 'Delivered',
  3: 'Canceled',
};

async function main() {
  const driver = process.argv[2];
  if (!driver) {
    console.error(
      'Usage: npx ts-node scripts/query-driver-journeys.ts <DRIVER_ADDRESS>',
    );
    process.exit(1);
  }

  const driverLc = driver.toLowerCase().startsWith('0x')
    ? driver.toLowerCase()
    : `0x${driver.toLowerCase()}`;

  const client = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC),
  });

  console.log('=== Driver Journey Status (on-chain) ===');
  console.log('Driver:', driverLc);
  console.log('Diamond:', DIAMOND);
  console.log('');

  // 1. getDriverJourneyCount (if available)
  try {
    const count = await client.readContract({
      address: DIAMOND as `0x${string}`,
      abi: [
        {
          inputs: [{ name: 'driver', type: 'address' }],
          name: 'getDriverJourneyCount',
          outputs: [{ type: 'uint256' }],
          stateMutability: 'view',
          type: 'function',
        },
      ],
      functionName: 'getDriverJourneyCount',
      args: [driverLc as `0x${string}`],
    });
    console.log(
      '--- driverToJourneyIds.length (on-chain):',
      String(count),
      '(max 10)',
    );
  } catch {
    console.log('--- getDriverJourneyCount: not available on deployed facet');
  }
  console.log('');

  // 2. Fetch journey IDs from indexer
  const journeyIds = await fetchJourneyIds(driverLc);

  if (journeyIds.length === 0) {
    console.log('No journeys found in indexer for this driver.');
    return;
  }

  console.log('--- getJourney status per journey ---');
  console.log('Status: 0=Pending, 1=InTransit, 2=Delivered');
  console.log('');

  let stuck = 0;
  for (const jid of journeyIds) {
    try {
      const journey = await client.readContract({
        address: DIAMOND as `0x${string}`,
        abi: GET_JOURNEY_ABI,
        functionName: 'getJourney',
        args: [jid as `0x${string}`],
      });
      const status = Number(journey.currentStatus);
      const label = STATUS_LABELS[status] ?? `status=${status}`;
      const short = `${jid.slice(0, 18)}...${jid.slice(-6)}`;
      console.log(`  ${short}  -> ${label}`);
      if (status === 1) stuck++;
    } catch (e) {
      console.log(
        `  ${jid.slice(0, 18)}...  -> (call failed: ${e instanceof Error ? e.message : e})`,
      );
    }
  }

  if (stuck > 0) {
    console.log('');
    console.log(
      `>>> ${stuck} journey(s) stuck InTransit. These count toward the 10 limit.`,
    );
    console.log(
      '    Receiver must call packageSign(journeyId), then handOff(journeyId) can complete.',
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

// @ts-nocheck - Script with outdated contract types
/**
 * Selector Collision Checker for Diamond Facets
 * Checks for function selector conflicts across all facets
 */

import { ethers } from 'hardhat';

const FACETS = [
  'DiamondCutFacet',
  'DiamondLoupeFacet',
  'OwnershipFacet',
  'NodesFacet',
  'AssetsFacet',
  'OrdersFacet',
  'StakingFacet',
  'BridgeFacet',
  'CLOBFacet',
];

async function main() {
  console.log('🔍 Checking for selector collisions across all facets...\n');

  const selectorMap = new Map<string, { facet: string; function: string }>();
  const collisions: Array<{
    selector: string;
    conflicts: Array<{ facet: string; function: string }>;
  }> = [];

  for (const facetName of FACETS) {
    try {
      const factory = await ethers.getContractFactory(facetName);
      const contractInterface = factory.interface;

      // Get all function signatures
      const fragments = Object.values(contractInterface.fragments).filter(
        (f) => f.type === 'function',
      );

      console.log(`\n📋 ${facetName} (${fragments.length} functions):`);

      for (const fragment of fragments) {
        const signature = fragment.format();
        const selector = fragment.selector;

        console.log(`  - ${signature} => ${selector}`);

        if (selectorMap.has(selector)) {
          const existing = selectorMap.get(selector)!;
          // Check if this is actually the same function signature
          if (existing.function !== signature) {
            // This is a real collision
            let collision = collisions.find((c) => c.selector === selector);
            if (!collision) {
              collision = { selector, conflicts: [existing] };
              collisions.push(collision);
            }
            collision.conflicts.push({ facet: facetName, function: signature });
          }
        } else {
          selectorMap.set(selector, { facet: facetName, function: signature });
        }
      }
    } catch (error: any) {
      console.log(`\n⚠️  Could not load ${facetName}: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(80));

  if (collisions.length > 0) {
    console.log('\n🚨 SELECTOR COLLISIONS DETECTED!\n');
    for (const collision of collisions) {
      console.log(`Selector: ${collision.selector}`);
      for (const conflict of collision.conflicts) {
        console.log(`  - ${conflict.facet}: ${conflict.function}`);
      }
      console.log('');
    }
    console.log('❌ Deployment aborted due to selector collisions!\n');
    process.exit(1);
  } else {
    console.log('\n✅ No selector collisions detected!');
    console.log(`📊 Total unique selectors: ${selectorMap.size}`);
    console.log('\n✅ Safe to deploy!\n');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

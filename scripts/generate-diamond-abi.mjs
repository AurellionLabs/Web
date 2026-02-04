#!/usr/bin/env node
/**
 * Generate Diamond ABI for Frontend (Standalone ESM version)
 *
 * This script generates a TypeScript file containing the Diamond ABI
 * from the FACET_ABI defined in deploy.config.ts
 *
 * Usage:
 *   node scripts/generate-diamond-abi.mjs
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_PATH = path.resolve(
  __dirname,
  '../infrastructure/contracts/diamond-abi.generated.ts',
);

// Read and parse the deploy.config.ts to extract FACET_ABI
// This is a workaround for module resolution issues
function extractFacetABI() {
  const configPath = path.resolve(__dirname, 'deploy.config.ts');
  const configContent = fs.readFileSync(configPath, 'utf8');
  
  // Find the FACET_ABI object
  const facetAbiMatch = configContent.match(/export const FACET_ABI:\s*Record<string,\s*ABIFragment\[\]>\s*=\s*\{/);
  if (!facetAbiMatch) {
    throw new Error('Could not find FACET_ABI in deploy.config.ts');
  }
  
  // Parse individual facet ABIs from the file
  const facets = {};
  
  // Extract each facet's ABI by finding patterns like "FacetName: ["
  const facetPattern = /(\w+Facet):\s*\[/g;
  let match;
  
  while ((match = facetPattern.exec(configContent)) !== null) {
    const facetName = match[1];
    const startIndex = match.index + match[0].length - 1; // Position of opening [
    
    // Find the matching closing bracket
    let depth = 1;
    let endIndex = startIndex + 1;
    while (depth > 0 && endIndex < configContent.length) {
      if (configContent[endIndex] === '[') depth++;
      if (configContent[endIndex] === ']') depth--;
      endIndex++;
    }
    
    // Extract the array content
    const arrayContent = configContent.slice(startIndex, endIndex);
    
    try {
      // Clean up the content for JSON parsing
      // Replace single quotes with double quotes, remove trailing commas, etc.
      let jsonContent = arrayContent
        .replace(/'/g, '"')
        .replace(/,(\s*[}\]])/g, '$1')
        .replace(/(\w+):/g, '"$1":')
        .replace(/"type":/g, '"type":')
        .replace(/"name":/g, '"name":')
        .replace(/"inputs":/g, '"inputs":')
        .replace(/"outputs":/g, '"outputs":')
        .replace(/"stateMutability":/g, '"stateMutability":')
        .replace(/"indexed":/g, '"indexed":')
        .replace(/"components":/g, '"components":');
      
      // This is too error-prone, let's use a different approach
      // Instead, we'll just extract the raw TypeScript and use eval (carefully)
    } catch (e) {
      console.warn(`Warning: Could not parse ${facetName} ABI`);
    }
  }
  
  return facets;
}

// Alternative: Read the existing generated file and just update the import
function regenerateFromExisting() {
  console.log('🔧 Regenerating Diamond ABI with correct import path...\n');
  
  // Read the current generated file
  const currentContent = fs.readFileSync(OUTPUT_PATH, 'utf8');
  
  // Check if it already has the supporting document functions
  if (currentContent.includes('addSupportingDocument')) {
    console.log('✓ addSupportingDocument already present in generated file');
  } else {
    console.log('⚠ addSupportingDocument NOT found - need to regenerate from deploy.config.ts');
  }
  
  // Fix the import path
  const fixedContent = currentContent.replace(
    /import \{ ABIFragment \} from ['"]@\/scripts\/deploy\.config['"];/,
    "import { ABIFragment } from '@/types/abi';"
  );
  
  fs.writeFileSync(OUTPUT_PATH, fixedContent);
  console.log(`\n✅ Updated import path in: ${OUTPUT_PATH}`);
}

// Main: Since we can't easily import deploy.config.ts, we need to manually
// add the supporting document functions to the NodesFacet ABI
function addSupportingDocumentFunctions() {
  console.log('🔧 Adding Supporting Document functions to Diamond ABI...\n');
  
  const currentContent = fs.readFileSync(OUTPUT_PATH, 'utf8');
  
  // Check if already present
  if (currentContent.includes('addSupportingDocument')) {
    console.log('✓ Supporting document functions already present');
    
    // Just fix the import
    const fixedContent = currentContent.replace(
      /import \{ ABIFragment \} from ['"]@\/scripts\/deploy\.config['"];/,
      "import { ABIFragment } from '@/types/abi';"
    );
    fs.writeFileSync(OUTPUT_PATH, fixedContent);
    console.log('✓ Fixed import path');
    return;
  }
  
  // Supporting document ABI entries to add
  const supportingDocABI = [
    {
      type: 'function',
      name: 'addSupportingDocument',
      inputs: [
        { name: '_nodeHash', type: 'bytes32' },
        { name: '_url', type: 'string' },
        { name: '_title', type: 'string' },
        { name: '_description', type: 'string' },
        { name: '_documentType', type: 'string' },
      ],
      outputs: [{ name: 'isFrozen', type: 'bool' }],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'removeSupportingDocument',
      inputs: [
        { name: '_nodeHash', type: 'bytes32' },
        { name: '_url', type: 'string' },
      ],
      outputs: [],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'getSupportingDocuments',
      inputs: [{ name: '_nodeHash', type: 'bytes32' }],
      outputs: [
        {
          name: 'documents',
          type: 'tuple[]',
          components: [
            { name: 'url', type: 'string' },
            { name: 'title', type: 'string' },
            { name: 'description', type: 'string' },
            { name: 'documentType', type: 'string' },
            { name: 'isFrozen', type: 'bool' },
            { name: 'isRemoved', type: 'bool' },
            { name: 'addedAt', type: 'uint256' },
            { name: 'removedAt', type: 'uint256' },
            { name: 'addedBy', type: 'address' },
            { name: 'removedBy', type: 'address' },
          ],
        },
      ],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'getActiveSupportingDocuments',
      inputs: [{ name: '_nodeHash', type: 'bytes32' }],
      outputs: [
        {
          name: 'documents',
          type: 'tuple[]',
          components: [
            { name: 'url', type: 'string' },
            { name: 'title', type: 'string' },
            { name: 'description', type: 'string' },
            { name: 'documentType', type: 'string' },
            { name: 'isFrozen', type: 'bool' },
            { name: 'isRemoved', type: 'bool' },
            { name: 'addedAt', type: 'uint256' },
            { name: 'removedAt', type: 'uint256' },
            { name: 'addedBy', type: 'address' },
            { name: 'removedBy', type: 'address' },
          ],
        },
      ],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'getSupportingDocumentCount',
      inputs: [{ name: '_nodeHash', type: 'bytes32' }],
      outputs: [
        { name: 'total', type: 'uint256' },
        { name: 'active', type: 'uint256' },
      ],
      stateMutability: 'view',
    },
    {
      type: 'event',
      name: 'SupportingDocumentAdded',
      inputs: [
        { name: 'nodeHash', type: 'bytes32', indexed: true },
        { name: 'url', type: 'string', indexed: false },
        { name: 'title', type: 'string', indexed: false },
        { name: 'description', type: 'string', indexed: false },
        { name: 'documentType', type: 'string', indexed: false },
        { name: 'isFrozen', type: 'bool', indexed: false },
        { name: 'addedAt', type: 'uint256', indexed: false },
        { name: 'addedBy', type: 'address', indexed: true },
      ],
    },
    {
      type: 'event',
      name: 'SupportingDocumentRemoved',
      inputs: [
        { name: 'nodeHash', type: 'bytes32', indexed: true },
        { name: 'url', type: 'string', indexed: false },
        { name: 'removedAt', type: 'uint256', indexed: false },
        { name: 'removedBy', type: 'address', indexed: true },
      ],
    },
  ];
  
  // Find the end of DIAMOND_ABI array (first "] as const;")
  const diamondAbiEndMatch = currentContent.match(/export const DIAMOND_ABI: ABIFragment\[\] = \[([\s\S]*?)\] as const;/);
  
  if (!diamondAbiEndMatch) {
    console.error('❌ Could not find DIAMOND_ABI array in generated file');
    process.exit(1);
  }
  
  // Insert the new functions before the closing bracket
  const existingAbiContent = diamondAbiEndMatch[1];
  const newAbiContent = existingAbiContent.trimEnd().replace(/,?\s*$/, ',\n') + 
    supportingDocABI.map(item => '  ' + JSON.stringify(item, null, 2).replace(/\n/g, '\n  ')).join(',\n');
  
  let updatedContent = currentContent.replace(
    diamondAbiEndMatch[0],
    `export const DIAMOND_ABI: ABIFragment[] = [${newAbiContent}\n] as const;`
  );
  
  // Fix the import path
  updatedContent = updatedContent.replace(
    /import \{ ABIFragment \} from ['"]@\/scripts\/deploy\.config['"];/,
    "import { ABIFragment } from '@/types/abi';"
  );
  
  // Update the timestamp comment
  updatedContent = updatedContent.replace(
    /\* Generated: .*/,
    `* Generated: ${new Date().toISOString()}`
  );
  
  fs.writeFileSync(OUTPUT_PATH, updatedContent);
  console.log(`✅ Added ${supportingDocABI.length} supporting document ABI entries`);
  console.log(`✅ Updated: ${OUTPUT_PATH}`);
}

addSupportingDocumentFunctions();

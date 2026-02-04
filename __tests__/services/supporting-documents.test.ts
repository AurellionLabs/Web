/**
 * Test to verify Supporting Document functions are available in Diamond ABI
 */

import { describe, it, expect } from 'vitest';
import { ethers } from 'ethers';
import { DIAMOND_ABI } from '@/infrastructure/contracts/diamond-abi.generated';
import * as fs from 'fs';
import * as path from 'path';

describe('Supporting Documents ABI', () => {
  it('should read the raw file and verify addSupportingDocument exists', () => {
    const filePath = path.resolve(
      __dirname,
      '../../infrastructure/contracts/diamond-abi.generated.ts',
    );
    const fileContent = fs.readFileSync(filePath, 'utf8');

    console.log('File path:', filePath);
    console.log('File size:', fileContent.length, 'bytes');
    console.log(
      'Contains addSupportingDocument:',
      fileContent.includes('addSupportingDocument'),
    );

    expect(fileContent.includes('addSupportingDocument')).toBe(true);
  });

  it('should have addSupportingDocument function in DIAMOND_ABI', () => {
    const addSupportingDocAbi = DIAMOND_ABI.find(
      (item) =>
        item.type === 'function' && item.name === 'addSupportingDocument',
    );

    expect(addSupportingDocAbi).toBeDefined();
    expect(addSupportingDocAbi?.type).toBe('function');

    if (addSupportingDocAbi?.type === 'function') {
      expect(addSupportingDocAbi.inputs).toHaveLength(5);
      expect(addSupportingDocAbi.inputs[0].name).toBe('_nodeHash');
      expect(addSupportingDocAbi.inputs[1].name).toBe('_url');
      expect(addSupportingDocAbi.inputs[2].name).toBe('_title');
      expect(addSupportingDocAbi.inputs[3].name).toBe('_description');
      expect(addSupportingDocAbi.inputs[4].name).toBe('_documentType');
    }
  });

  it('should have removeSupportingDocument function in DIAMOND_ABI', () => {
    const removeSupportingDocAbi = DIAMOND_ABI.find(
      (item) =>
        item.type === 'function' && item.name === 'removeSupportingDocument',
    );

    expect(removeSupportingDocAbi).toBeDefined();
    expect(removeSupportingDocAbi?.type).toBe('function');
  });

  it('should have getSupportingDocuments function in DIAMOND_ABI', () => {
    const getSupportingDocsAbi = DIAMOND_ABI.find(
      (item) =>
        item.type === 'function' && item.name === 'getSupportingDocuments',
    );

    expect(getSupportingDocsAbi).toBeDefined();
    expect(getSupportingDocsAbi?.type).toBe('function');
  });

  it('should create ethers Interface with addSupportingDocument method', () => {
    // This is the critical test - if this fails, the function won't be callable
    const iface = new ethers.Interface(DIAMOND_ABI);

    const addSupportingDocFragment = iface.getFunction('addSupportingDocument');
    expect(addSupportingDocFragment).not.toBeNull();
    expect(addSupportingDocFragment?.name).toBe('addSupportingDocument');

    // Verify the selector matches what we deployed
    expect(addSupportingDocFragment?.selector).toBe('0x284b031b');
  });

  it('should create Contract instance with addSupportingDocument method', () => {
    // Create a mock provider (we won't actually call it)
    const mockProvider = new ethers.JsonRpcProvider('http://localhost:8545');
    const mockAddress = '0x0000000000000000000000000000000000000001';

    // This is what the DiamondContext does
    const contract = new ethers.Contract(
      mockAddress,
      DIAMOND_ABI,
      mockProvider,
    );

    // The contract should have the addSupportingDocument method
    expect(typeof contract.addSupportingDocument).toBe('function');
    expect(typeof contract.removeSupportingDocument).toBe('function');
    expect(typeof contract.getSupportingDocuments).toBe('function');
    expect(typeof contract.getActiveSupportingDocuments).toBe('function');
    expect(typeof contract.getSupportingDocumentCount).toBe('function');
  });

  it('DIAMOND_ABI should be a non-empty array', () => {
    expect(Array.isArray(DIAMOND_ABI)).toBe(true);
    expect(DIAMOND_ABI.length).toBeGreaterThan(0);
    console.log(`DIAMOND_ABI has ${DIAMOND_ABI.length} entries`);
  });

  it('should log all supporting document related ABI entries', () => {
    const supportingDocEntries = DIAMOND_ABI.filter(
      (item) =>
        (item.type === 'function' || item.type === 'event') &&
        item.name.toLowerCase().includes('supportingdocument'),
    );

    console.log('Supporting Document ABI entries:');
    supportingDocEntries.forEach((entry) => {
      console.log(`  - ${entry.type}: ${entry.name}`);
    });

    expect(supportingDocEntries.length).toBeGreaterThanOrEqual(5);
  });
});

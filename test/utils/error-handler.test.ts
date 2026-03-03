/**
 * @file test/utils/error-handler.test.ts
 * @description Vitest unit tests for utils/error-handler.ts
 *
 * Covers:
 *  - handleContractError with Error instance
 *  - handleContractError with non-Error object
 *  - handleContractError includes context in message
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleContractError } from '@/utils/error-handler';

describe('utils/error-handler', () => {
  describe('handleContractError', () => {
    let consoleSpy: any;

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy?.mockClear();
    });

    it('should throw Error with context when given an Error instance', () => {
      const originalError = new Error('Original error message');
      const context = 'testContext';

      expect(() => handleContractError(originalError, context)).toThrow(
        `Contract error in ${context}: Original error message`,
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        `Error in ${context}:`,
        originalError,
      );
    });

    it('should throw Error with unknown message when given a non-Error object', () => {
      const nonErrorObject = { code: 'CALL_EXCEPTION', reason: 'some reason' };
      const context = 'anotherContext';

      expect(() => handleContractError(nonErrorObject, context)).toThrow(
        `Unknown contract error in ${context}`,
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        `Error in ${context}:`,
        nonErrorObject,
      );
    });

    it('should throw Error when given a string', () => {
      const stringError = 'Just a string error';
      const context = 'stringContext';

      expect(() => handleContractError(stringError, context)).toThrow(
        `Unknown contract error in ${context}`,
      );
    });

    it('should throw Error when given null', () => {
      const context = 'nullContext';

      expect(() => handleContractError(null, context)).toThrow(
        `Unknown contract error in ${context}`,
      );
    });

    it('should throw Error when given undefined', () => {
      const context = 'undefinedContext';

      expect(() => handleContractError(undefined, context)).toThrow(
        `Unknown contract error in ${context}`,
      );
    });

    it('should preserve original error stack in thrown error', () => {
      const originalError = new Error('Stack trace test');
      const context = 'stackContext';

      try {
        handleContractError(originalError, context);
        // Should have thrown
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.message).toContain('Contract error in stackContext');
        // Error should have a stack trace
        expect(error.stack).toBeDefined();
      }
    });
  });
});

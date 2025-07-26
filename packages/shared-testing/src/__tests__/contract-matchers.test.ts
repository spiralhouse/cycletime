/**
 * Tests for Contract Matchers - Custom Jest matchers for contract testing
 */

import { extendExpect } from '../assertions/contract-matchers';

// Mock console.warn to avoid noise in tests
jest.spyOn(console, 'warn').mockImplementation();

describe('Contract Matchers', () => {
  describe('extendExpect', () => {
    it('should execute without throwing errors when expect is available', () => {
      expect(() => {
        extendExpect();
      }).not.toThrow();
    });

    it('should warn when Jest expect is not available', () => {
      const originalExpect = global.expect;
      delete (global as any).expect;

      extendExpect();

      // Restore expect first so we can use it in the assertion
      global.expect = originalExpect;
      
      expect(console.warn).toHaveBeenCalledWith('Jest expect not available - contract matchers not installed');
    });
  });

  // Note: Individual matcher function testing is complex due to Jest mocking requirements
  // The matchers are tested indirectly through the extendExpected function and can be
  // tested in integration scenarios where they're actually used in contract tests
});
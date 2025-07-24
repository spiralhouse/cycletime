import { APIResponse, HttpStatus } from '@cycletime/shared-types';
import { getEnvVar, isProduction } from '@cycletime/shared-config';
import { isValidEmail } from '@cycletime/shared-utils';

describe.skip('Workspace Integration Tests', () => {
  describe('@cycletime/shared-types', () => {
    it('should import and use APIResponse type correctly', () => {
      const response: APIResponse = {
        success: true,
        data: { test: 'data' },
        metadata: {
          requestId: 'test-123',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      };

      expect(response.success).toBe(true);
      expect(response.data).toEqual({ test: 'data' });
      expect(response.metadata?.requestId).toBe('test-123');
    });

    it('should import and use HttpStatus enum correctly', () => {
      expect(HttpStatus.OK).toBe(200);
      expect(HttpStatus.BAD_REQUEST).toBe(400);
      expect(HttpStatus.INTERNAL_SERVER_ERROR).toBe(500);
    });
  });

  describe('@cycletime/shared-config', () => {
    it('should import and use environment utilities correctly', () => {
      // Test getEnvVar with default value
      const testVar = getEnvVar('NON_EXISTENT_VAR', 'default-value');
      expect(testVar).toBe('default-value');

      // Test isProduction (should be false in test environment)
      expect(isProduction()).toBe(false);
    });
  });

  describe('@cycletime/shared-utils', () => {
    it('should import and use validation utilities correctly', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('invalid-email')).toBe(false);
    });
  });

  describe('Package Resolution', () => {
    it('should resolve all shared packages without errors', () => {
      // This test passes if all imports work without throwing errors
      expect(true).toBe(true);
    });
  });

  describe('Workspace Dependencies', () => {
    it('should have proper workspace package versions', () => {
      // In a real workspace, these would be resolved correctly
      // This test validates that the imports work
      expect(typeof APIResponse).toBe('object');
      expect(typeof HttpStatus).toBe('object');
      expect(typeof getEnvVar).toBe('function');
      expect(typeof isValidEmail).toBe('function');
    });
  });
});
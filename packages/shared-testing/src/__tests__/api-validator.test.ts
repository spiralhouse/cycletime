/**
 * ApiValidator Tests
 * 
 * Tests for the API validation functionality
 */

import { ApiValidator } from '../contract/api-validator';
import { ValidationResult } from '../types';

describe('ApiValidator', () => {
  let validator: ApiValidator;

  beforeEach(() => {
    validator = new ApiValidator('test-spec.yaml', {
      strictMode: false,
      validateExamples: false
    });
  });

  describe('constructor', () => {
    it('should create validator with default options', () => {
      const defaultValidator = new ApiValidator('test.yaml');
      expect(defaultValidator).toBeInstanceOf(ApiValidator);
    });

    it('should create validator with custom options', () => {
      const customValidator = new ApiValidator('test.yaml', {
        strictMode: false,
        allowAdditionalProperties: true,
        timeout: 10000
      });
      expect(customValidator).toBeInstanceOf(ApiValidator);
    });
  });

  describe('loadSpecification', () => {
    it('should throw error when specification file does not exist', async () => {
      const invalidValidator = new ApiValidator('nonexistent.yaml');
      await expect(invalidValidator.loadSpecification()).rejects.toThrow();
    });
  });

  describe('validateRequest', () => {
    it('should return error when specification is not loaded', () => {
      const result = validator.validateRequest('/test', 'GET', {});
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('specification not loaded');
    });

    it('should return validation result for valid path', () => {
      // Mock the specification
      (validator as any).openApiSpec = {
        paths: {
          '/test': {
            get: {
              responses: {
                '200': {
                  description: 'Success'
                }
              }
            }
          }
        }
      };

      const result = validator.validateRequest('/test', 'GET', {});
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
    });

    it('should return error for non-existent path', () => {
      (validator as any).openApiSpec = {
        paths: {}
      };

      const result = validator.validateRequest('/nonexistent', 'GET', {});
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('not found');
    });

    it('should return error for unsupported method', () => {
      (validator as any).openApiSpec = {
        paths: {
          '/test': {
            get: {}
          }
        }
      };

      const result = validator.validateRequest('/test', 'POST', {});
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('not supported');
    });
  });

  describe('validateResponse', () => {
    it('should return error when specification is not loaded', () => {
      const result = validator.validateResponse('/test', 'GET', 200, {});
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('specification not loaded');
    });

    it('should validate successful response', () => {
      (validator as any).openApiSpec = {
        paths: {
          '/test': {
            get: {
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          message: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      };

      const result = validator.validateResponse('/test', 'GET', 200, { message: 'Hello' });
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
    });
  });

  describe('getSpecification', () => {
    it('should return null when no specification is loaded', () => {
      const spec = validator.getSpecification();
      expect(spec).toBeNull();
    });

    it('should return specification when loaded', () => {
      const mockSpec = { info: { title: 'Test API' }, paths: {} };
      (validator as any).openApiSpec = mockSpec;
      
      const spec = validator.getSpecification();
      expect(spec).toBe(mockSpec);
    });
  });

  describe('validateEndpointAvailability', () => {
    it('should return empty array when no specification is loaded', async () => {
      await expect(validator.validateEndpointAvailability('http://localhost:3000'))
        .rejects.toThrow('specification not loaded');
    });

    it('should check endpoint availability', async () => {
      (validator as any).openApiSpec = {
        paths: {
          '/health': {
            get: {
              responses: {
                '200': { description: 'OK' }
              }
            }
          }
        }
      };

      const reports = await validator.validateEndpointAvailability('http://localhost:3000');
      expect(reports).toBeInstanceOf(Array);
      expect(reports.length).toBeGreaterThan(0);
      expect(reports[0]).toHaveProperty('endpoint');
      expect(reports[0]).toHaveProperty('method');
      expect(reports[0]).toHaveProperty('available');
    });
  });
});
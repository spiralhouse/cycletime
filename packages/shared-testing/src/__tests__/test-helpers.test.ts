/**
 * Tests for TestHelpers - Common contract testing utilities
 */

import { TestHelpers, TestEnvironmentConfig, TestTimeout } from '../utils/test-helpers';
import { ValidationResult, PerformanceMetrics, EndpointConfig } from '../types';

// Mock console methods to avoid noise in tests
jest.spyOn(console, 'log').mockImplementation();
jest.spyOn(console, 'error').mockImplementation();
jest.spyOn(console, 'warn').mockImplementation();

describe('TestHelpers', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('setupContractTestEnvironment', () => {
    it('should return default configuration when no config provided', () => {
      const result = TestHelpers.setupContractTestEnvironment();

      expect(result).toEqual({
        baseUrl: 'http://localhost:3000',
        timeout: {
          test: 30000,
          setup: 10000,
          teardown: 5000
        },
        retries: 2,
        cleanup: true
      });
    });

    it('should merge custom configuration with defaults', () => {
      const customConfig: TestEnvironmentConfig = {
        baseUrl: 'http://localhost:8080',
        retries: 5,
        timeout: { test: 60000 }
      };

      const result = TestHelpers.setupContractTestEnvironment(customConfig);

      expect(result).toEqual({
        baseUrl: 'http://localhost:8080',
        timeout: {
          test: 60000,
          setup: 10000,
          teardown: 5000
        },
        retries: 5,
        cleanup: true
      });
    });

    it('should set Jest timeout when Jest is available', () => {
      const originalJest = (global as any).jest;
      const mockSetTimeout = jest.fn();
      (global as any).jest = { setTimeout: mockSetTimeout };

      const config: TestEnvironmentConfig = {
        timeout: { test: 45000 }
      };

      TestHelpers.setupContractTestEnvironment(config);

      expect(mockSetTimeout).toHaveBeenCalledWith(45000);

      if (originalJest) {
        (global as any).jest = originalJest;
      } else {
        delete (global as any).jest;
      }
    });

    it('should handle missing Jest gracefully', () => {
      delete (global as any).jest;

      expect(() => {
        TestHelpers.setupContractTestEnvironment();
      }).not.toThrow();
    });
  });

  describe('createTestSuite', () => {
    it('should create test suite with beforeAll and afterAll hooks', () => {
      const mockSetup = jest.fn().mockResolvedValue(undefined);
      const mockTeardown = jest.fn().mockResolvedValue(undefined);
      const mockDescribe = jest.fn();
      const mockBeforeAll = jest.fn();
      const mockAfterAll = jest.fn();

      (global as any).describe = mockDescribe;
      (global as any).beforeAll = mockBeforeAll;
      (global as any).afterAll = mockAfterAll;
      (global as any).jest = { setTimeout: jest.fn() };

      TestHelpers.createTestSuite('Test Suite', mockSetup, mockTeardown);

      expect(mockDescribe).toHaveBeenCalledWith('Test Suite', expect.any(Function));

      // Execute the describe callback to trigger beforeAll/afterAll setup
      const describeCallback = mockDescribe.mock.calls[0][1];
      describeCallback();

      expect(mockBeforeAll).toHaveBeenCalledWith(expect.any(Function), 10000);
      expect(mockAfterAll).toHaveBeenCalledWith(expect.any(Function), 5000);

      delete (global as any).describe;
      delete (global as any).beforeAll;
      delete (global as any).afterAll;
      delete (global as any).jest;
    });

    it('should skip cleanup when disabled', () => {
      const mockTeardown = jest.fn().mockResolvedValue(undefined);
      const mockAfterAll = jest.fn();

      (global as any).describe = jest.fn();
      (global as any).beforeAll = jest.fn();
      (global as any).afterAll = mockAfterAll;
      (global as any).jest = { setTimeout: jest.fn() };

      const config: TestEnvironmentConfig = { cleanup: false };
      TestHelpers.createTestSuite('Test Suite', jest.fn(), mockTeardown, config);

      const describeCallback = (global as any).describe.mock.calls[0][1];
      describeCallback();

      const afterAllCallback = mockAfterAll.mock.calls[0][0];
      afterAllCallback();

      expect(mockTeardown).not.toHaveBeenCalled();

      delete (global as any).describe;
      delete (global as any).beforeAll;
      delete (global as any).afterAll;
      delete (global as any).jest;
    });
  });

  describe('retry', () => {
    it('should return result on first successful attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await TestHelpers.retry(operation, 3, 100);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');

      const result = await TestHelpers.retry(operation, 3, 10);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should throw last error after max retries', async () => {
      const operation = jest.fn()
        .mockRejectedValue(new Error('persistent failure'));

      await expect(TestHelpers.retry(operation, 2, 10)).rejects.toThrow('persistent failure');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should handle non-Error objects', async () => {
      const operation = jest.fn().mockRejectedValue('string error');

      await expect(TestHelpers.retry(operation, 1, 10)).rejects.toThrow('string error');
    });

    it('should use exponential backoff for delays', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');

      const sleepSpy = jest.spyOn(TestHelpers, 'sleep').mockResolvedValue();

      await TestHelpers.retry(operation, 3, 100);

      expect(sleepSpy).toHaveBeenNthCalledWith(1, 100); // 100 * 2^0
      expect(sleepSpy).toHaveBeenNthCalledWith(2, 200); // 100 * 2^1

      sleepSpy.mockRestore();
    });
  });

  describe('waitFor', () => {
    it('should resolve when condition becomes true', async () => {
      let counter = 0;
      const condition = () => ++counter >= 3;

      await expect(TestHelpers.waitFor(condition, 1000, 50)).resolves.not.toThrow();
    });

    it('should resolve when async condition becomes true', async () => {
      let counter = 0;
      const condition = async () => ++counter >= 2;

      await expect(TestHelpers.waitFor(condition, 1000, 50)).resolves.not.toThrow();
    });

    it('should timeout when condition never becomes true', async () => {
      const condition = () => false;

      await expect(TestHelpers.waitFor(condition, 100, 20)).rejects.toThrow('Condition not met within 100ms');
    });

    it('should resolve immediately when condition is already true', async () => {
      const condition = () => true;
      const startTime = Date.now();

      await TestHelpers.waitFor(condition, 1000, 100);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(50); // Should be very fast
    });
  });

  describe('assertValidationResult', () => {
    it('should not throw for valid result', () => {
      const result: ValidationResult = {
        valid: true,
        errors: [],
        warnings: []
      };

      expect(() => {
        TestHelpers.assertValidationResult(result);
      }).not.toThrow();
    });

    it('should throw error for invalid result', () => {
      const result: ValidationResult = {
        valid: false,
        errors: [
          {
            instancePath: '/name',
            schemaPath: '#/properties/name',
            keyword: 'required',
            params: {},
            message: 'Name is required'
          }
        ],
        warnings: []
      };

      expect(() => {
        TestHelpers.assertValidationResult(result, 'User validation');
      }).toThrow('User validation failed:\n/name: Name is required');
    });

    it('should include warnings in error message', () => {
      const result: ValidationResult = {
        valid: false,
        errors: [
          {
            instancePath: '',
            schemaPath: '',
            keyword: 'type',
            params: {},
            message: 'Invalid type'
          }
        ],
        warnings: [
          { message: 'Deprecated field used' },
          { message: 'Field will be removed' }
        ]
      };

      expect(() => {
        TestHelpers.assertValidationResult(result);
      }).toThrow('Validation failed:\n(root): Invalid type\nWarnings:\nDeprecated field used\nField will be removed');
    });

    it('should log warnings for valid results with warnings', () => {
      const result: ValidationResult = {
        valid: true,
        errors: [],
        warnings: [
          { message: 'Warning 1' },
          { message: 'Warning 2' }
        ]
      };

      TestHelpers.assertValidationResult(result, 'Test validation');

      expect(console.warn).toHaveBeenCalledWith('Test validation warnings:', ['Warning 1', 'Warning 2']);
    });
  });

  describe('measurePerformance', () => {
    it('should measure successful operation performance', async () => {
      const operation = jest.fn().mockResolvedValue('result');

      const { result, metrics } = await TestHelpers.measurePerformance(operation, 'Test Op');

      expect(result).toBe('result');
      expect(metrics.responseTime).toBeGreaterThanOrEqual(0);
      expect(metrics.throughput).toBeGreaterThan(0);
      expect(metrics.errorRate).toBe(0);
      expect(metrics.concurrency).toBe(1);
      expect(metrics.timestamp).toBeGreaterThan(0);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Performance: Test Op took')
      );
    });

    it('should measure failed operation performance', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Operation failed'));

      await expect(TestHelpers.measurePerformance(operation, 'Failed Op')).rejects.toThrow('Operation failed');
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Performance: Failed Op failed after')
      );
    });

    it('should use default operation name', async () => {
      const operation = jest.fn().mockResolvedValue('result');

      await TestHelpers.measurePerformance(operation);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Performance: Operation took')
      );
    });
  });

  describe('generateTestId', () => {
    it('should generate unique test ID with default prefix', () => {
      const id1 = TestHelpers.generateTestId();
      const id2 = TestHelpers.generateTestId();

      expect(id1).toMatch(/^test-\d+-[a-z0-9]{6}$/);
      expect(id2).toMatch(/^test-\d+-[a-z0-9]{6}$/);
      expect(id1).not.toBe(id2);
    });

    it('should generate unique test ID with custom prefix', () => {
      const id = TestHelpers.generateTestId('contract');

      expect(id).toMatch(/^contract-\d+-[a-z0-9]{6}$/);
    });

    it('should generate different IDs on subsequent calls', () => {
      const ids = Array.from({ length: 10 }, () => TestHelpers.generateTestId());
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(10);
    });
  });

  describe('createMockHeaders', () => {
    it('should create default mock headers', () => {
      const headers = TestHelpers.createMockHeaders();

      expect(headers).toMatchObject({
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'CycleTime-Contract-Test/1.0'
      });
      expect(headers['X-Test-Id']).toMatch(/^test-\d+-[a-z0-9]{6}$/);
    });

    it('should merge custom headers with defaults', () => {
      const overrides = {
        'Content-Type': 'application/xml',
        'Authorization': 'Bearer token123',
        'Custom-Header': 'custom-value'
      };

      const headers = TestHelpers.createMockHeaders(overrides);

      expect(headers).toMatchObject({
        'Content-Type': 'application/xml',
        'Accept': 'application/json',
        'User-Agent': 'CycleTime-Contract-Test/1.0',
        'Authorization': 'Bearer token123',
        'Custom-Header': 'custom-value'
      });
    });
  });

  describe('validateEndpointConfig', () => {
    it('should validate correct endpoint configuration', () => {
      const endpoint: EndpointConfig = {
        path: '/api/users',
        method: 'GET'
      };

      expect(() => {
        TestHelpers.validateEndpointConfig(endpoint);
      }).not.toThrow();
    });

    it('should throw error for missing path', () => {
      const endpoint = { method: 'GET' } as EndpointConfig;

      expect(() => {
        TestHelpers.validateEndpointConfig(endpoint);
      }).toThrow('Endpoint path is required');
    });

    it('should throw error for missing method', () => {
      const endpoint = { path: '/api/users' } as EndpointConfig;

      expect(() => {
        TestHelpers.validateEndpointConfig(endpoint);
      }).toThrow('Endpoint method is required');
    });

    it('should validate all supported HTTP methods', () => {
      const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

      validMethods.forEach(method => {
        const endpoint: EndpointConfig = { path: '/test', method };
        expect(() => {
          TestHelpers.validateEndpointConfig(endpoint);
        }).not.toThrow();
      });
    });

    it('should throw error for invalid HTTP method', () => {
      const endpoint: EndpointConfig = { path: '/test', method: 'INVALID' };

      expect(() => {
        TestHelpers.validateEndpointConfig(endpoint);
      }).toThrow('Invalid HTTP method: INVALID');
    });

    it('should validate case-insensitive HTTP methods', () => {
      const endpoint: EndpointConfig = { path: '/test', method: 'get' };

      expect(() => {
        TestHelpers.validateEndpointConfig(endpoint);
      }).not.toThrow();
    });

    it('should throw error for non-positive timeout', () => {
      const endpoint: EndpointConfig = { path: '/test', method: 'GET', timeout: -1 };

      expect(() => {
        TestHelpers.validateEndpointConfig(endpoint);
      }).toThrow('Endpoint timeout must be positive');
    });

    it('should throw error for negative retries', () => {
      const endpoint: EndpointConfig = { path: '/test', method: 'GET', retries: -1 };

      expect(() => {
        TestHelpers.validateEndpointConfig(endpoint);
      }).toThrow('Endpoint retries must be non-negative');
    });

    it('should allow zero retries', () => {
      const endpoint: EndpointConfig = { path: '/test', method: 'GET', retries: 0 };

      expect(() => {
        TestHelpers.validateEndpointConfig(endpoint);
      }).not.toThrow();
    });
  });

  describe('formatValidationErrors', () => {
    it('should return message for no errors', () => {
      const result = TestHelpers.formatValidationErrors([]);
      expect(result).toBe('No validation errors');
    });

    it('should format single error', () => {
      const errors = [
        {
          instancePath: '/name',
          schemaPath: '#/properties/name',
          keyword: 'required',
          params: {},
          message: 'Name is required'
        }
      ];

      const result = TestHelpers.formatValidationErrors(errors);
      expect(result).toBe('1. /name: Name is required (schema: #/properties/name)');
    });

    it('should format multiple errors', () => {
      const errors = [
        {
          instancePath: '/name',
          schemaPath: '#/properties/name',
          keyword: 'required',
          params: {},
          message: 'Name is required'
        },
        {
          instancePath: '/age',
          schemaPath: '',
          keyword: 'type',
          params: {},
          message: 'Must be a number'
        }
      ];

      const result = TestHelpers.formatValidationErrors(errors);
      expect(result).toBe('1. /name: Name is required (schema: #/properties/name)\n2. /age: Must be a number');
    });

    it('should handle errors without instancePath', () => {
      const errors = [
        {
          instancePath: '',
          schemaPath: '',
          keyword: 'type',
          params: {},
          message: 'Invalid root object'
        }
      ];

      const result = TestHelpers.formatValidationErrors(errors);
      expect(result).toBe('1. (root): Invalid root object');
    });
  });

  describe('sleep', () => {
    it('should resolve after specified delay', async () => {
      const startTime = Date.now();
      await TestHelpers.sleep(100);
      const duration = Date.now() - startTime;

      expect(duration).toBeGreaterThanOrEqual(90); // Account for timing variations
      expect(duration).toBeLessThan(150);
    });
  });

  describe('deepClone', () => {
    it('should clone primitive values', () => {
      expect(TestHelpers.deepClone(42)).toBe(42);
      expect(TestHelpers.deepClone('string')).toBe('string');
      expect(TestHelpers.deepClone(true)).toBe(true);
      expect(TestHelpers.deepClone(null)).toBe(null);
      expect(TestHelpers.deepClone(undefined)).toBe(undefined);
    });

    it('should clone Date objects', () => {
      const date = new Date('2023-01-01');
      const cloned = TestHelpers.deepClone(date);

      expect(cloned).toEqual(date);
      expect(cloned).not.toBe(date);
    });

    it('should clone arrays', () => {
      const array = [1, 2, { a: 3 }];
      const cloned = TestHelpers.deepClone(array);

      expect(cloned).toEqual(array);
      expect(cloned).not.toBe(array);
      expect(cloned[2]).not.toBe(array[2]);
    });

    it('should clone objects', () => {
      const obj = { a: 1, b: { c: 2 } };
      const cloned = TestHelpers.deepClone(obj);

      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);
      expect(cloned.b).not.toBe(obj.b);
    });

    it('should handle complex nested structures', () => {
      const complex = {
        date: new Date('2023-01-01'),
        array: [1, { nested: true }],
        object: { deep: { very: { deep: 'value' } } }
      };
      const cloned = TestHelpers.deepClone(complex);

      expect(cloned).toEqual(complex);
      expect(cloned.date).not.toBe(complex.date);
      expect(cloned.array).not.toBe(complex.array);
      expect(cloned.object.deep).not.toBe(complex.object.deep);
    });
  });

  describe('compareObjects', () => {
    it('should return equal for identical objects', () => {
      const obj1 = { a: 1, b: 'test' };
      const obj2 = { a: 1, b: 'test' };

      const result = TestHelpers.compareObjects(obj1, obj2);
      expect(result.equal).toBe(true);
      expect(result.differences).toHaveLength(0);
    });

    it('should detect type differences', () => {
      const result = TestHelpers.compareObjects('string', 123);
      expect(result.equal).toBe(false);
      expect(result.differences).toContain(': type mismatch - expected string, got number');
    });

    it('should detect null differences', () => {
      const result = TestHelpers.compareObjects(null, 'string');
      expect(result.equal).toBe(false);
      expect(result.differences).toContain(': type mismatch - expected object, got string');
    });

    it('should detect array length differences', () => {
      const result = TestHelpers.compareObjects([1, 2], [1, 2, 3]);
      expect(result.equal).toBe(false);
      expect(result.differences).toContain(': array length mismatch - expected 2, got 3');
    });

    it('should detect nested object differences', () => {
      const obj1 = { a: { b: 1 } };
      const obj2 = { a: { b: 2 } };

      const result = TestHelpers.compareObjects(obj1, obj2);
      expect(result.equal).toBe(false);
      expect(result.differences).toContain('a.b: value mismatch - expected 1, got 2');
    });

    it('should detect array vs object differences', () => {
      const result = TestHelpers.compareObjects([], {});
      expect(result.equal).toBe(false);
      expect(result.differences).toContain(': array/object mismatch');
    });

    it('should handle array element differences', () => {
      const result = TestHelpers.compareObjects([1, 2], [1, 3]);
      expect(result.equal).toBe(false);
      expect(result.differences).toContain('[1]: value mismatch - expected 2, got 3');
    });
  });

  describe('createSnapshot', () => {
    it('should log snapshot data', () => {
      const data = { test: 'data', number: 42 };
      TestHelpers.createSnapshot(data, 'test-snapshot');

      expect(console.log).toHaveBeenCalledWith(
        'Snapshot test-snapshot:',
        JSON.stringify(data, null, 2)
      );
    });
  });
});
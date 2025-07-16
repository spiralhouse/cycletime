/**
 * Tests for environment variable handling utilities
 */

import {
  getCurrentEnvironment,
  isProduction,
  isDevelopment,
  isTest,
  getEnvVar,
  getRequiredEnvVar,
  getEnvVarAsNumber,
  getEnvVarAsBoolean,
  getEnvVarAsArray,
  getEnvVarAsUrl,
  getEnvVarAsPort,
  validateEnvironmentVariable,
  maskValue,
  getEnvVarsWithPrefix,
} from '../env';
import { EnvironmentVariable } from '../types';

describe('Environment utilities', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getCurrentEnvironment', () => {
    it('should return development by default', () => {
      delete process.env.NODE_ENV;
      expect(getCurrentEnvironment()).toBe('development');
    });

    it('should return the NODE_ENV value when valid', () => {
      process.env.NODE_ENV = 'production';
      expect(getCurrentEnvironment()).toBe('production');
    });

    it('should return development for invalid NODE_ENV', () => {
      process.env.NODE_ENV = 'invalid';
      expect(getCurrentEnvironment()).toBe('development');
    });
  });

  describe('environment checks', () => {
    it('should correctly identify production environment', () => {
      process.env.NODE_ENV = 'production';
      expect(isProduction()).toBe(true);
      expect(isDevelopment()).toBe(false);
      expect(isTest()).toBe(false);
    });

    it('should correctly identify development environment', () => {
      process.env.NODE_ENV = 'development';
      expect(isProduction()).toBe(false);
      expect(isDevelopment()).toBe(true);
      expect(isTest()).toBe(false);
    });

    it('should correctly identify test environment', () => {
      process.env.NODE_ENV = 'test';
      expect(isProduction()).toBe(false);
      expect(isDevelopment()).toBe(false);
      expect(isTest()).toBe(true);
    });
  });

  describe('getEnvVar', () => {
    it('should return environment variable value', () => {
      process.env.TEST_VAR = 'test-value';
      expect(getEnvVar('TEST_VAR')).toBe('test-value');
    });

    it('should return default value when variable is not set', () => {
      expect(getEnvVar('MISSING_VAR', 'default')).toBe('default');
    });

    it('should return undefined when variable is not set and no default', () => {
      expect(getEnvVar('MISSING_VAR')).toBeUndefined();
    });

    it('should apply transform function', () => {
      process.env.TEST_VAR = '123';
      const result = getEnvVar('TEST_VAR', undefined, (val) => parseInt(val, 10));
      expect(result).toBe(123);
    });

    it('should throw error when transform fails', () => {
      process.env.TEST_VAR = 'invalid';
      expect(() => {
        getEnvVar('TEST_VAR', undefined, (val) => {
          throw new Error('Transform failed');
        });
      }).toThrow();
    });
  });

  describe('getRequiredEnvVar', () => {
    it('should return environment variable value', () => {
      process.env.REQUIRED_VAR = 'required-value';
      expect(getRequiredEnvVar('REQUIRED_VAR')).toBe('required-value');
    });

    it('should throw error when variable is not set', () => {
      expect(() => {
        getRequiredEnvVar('MISSING_REQUIRED_VAR');
      }).toThrow('Required environment variable MISSING_REQUIRED_VAR is not set');
    });

    it('should throw error when variable is empty', () => {
      process.env.EMPTY_VAR = '';
      expect(() => {
        getRequiredEnvVar('EMPTY_VAR');
      }).toThrow('Required environment variable EMPTY_VAR is not set');
    });
  });

  describe('getEnvVarAsNumber', () => {
    it('should parse valid number', () => {
      process.env.NUMBER_VAR = '123';
      expect(getEnvVarAsNumber('NUMBER_VAR')).toBe(123);
    });

    it('should return default value when variable is not set', () => {
      expect(getEnvVarAsNumber('MISSING_NUMBER', 456)).toBe(456);
    });

    it('should throw error for invalid number', () => {
      process.env.INVALID_NUMBER = 'not-a-number';
      expect(() => {
        getEnvVarAsNumber('INVALID_NUMBER');
      }).toThrow('Environment variable INVALID_NUMBER must be a valid number');
    });
  });

  describe('getEnvVarAsBoolean', () => {
    it('should parse true values', () => {
      const trueValues = ['true', '1', 'yes', 'on', 'TRUE', 'YES'];
      trueValues.forEach((value, index) => {
        process.env[`BOOL_VAR_${index}`] = value;
        expect(getEnvVarAsBoolean(`BOOL_VAR_${index}`)).toBe(true);
      });
    });

    it('should parse false values', () => {
      const falseValues = ['false', '0', 'no', 'off', 'FALSE', 'NO'];
      falseValues.forEach((value, index) => {
        process.env[`BOOL_VAR_${index}`] = value;
        expect(getEnvVarAsBoolean(`BOOL_VAR_${index}`)).toBe(false);
      });
    });

    it('should return default value when variable is not set', () => {
      expect(getEnvVarAsBoolean('MISSING_BOOL', true)).toBe(true);
    });

    it('should throw error for invalid boolean', () => {
      process.env.INVALID_BOOL = 'maybe';
      expect(() => {
        getEnvVarAsBoolean('INVALID_BOOL');
      }).toThrow('Environment variable INVALID_BOOL must be a valid boolean');
    });
  });

  describe('getEnvVarAsArray', () => {
    it('should parse comma-separated values', () => {
      process.env.ARRAY_VAR = 'a,b,c';
      expect(getEnvVarAsArray('ARRAY_VAR')).toEqual(['a', 'b', 'c']);
    });

    it('should handle spaces around values', () => {
      process.env.ARRAY_VAR = ' a , b , c ';
      expect(getEnvVarAsArray('ARRAY_VAR')).toEqual(['a', 'b', 'c']);
    });

    it('should return empty array for empty string', () => {
      process.env.ARRAY_VAR = '';
      expect(getEnvVarAsArray('ARRAY_VAR')).toEqual([]);
    });

    it('should return default value when variable is not set', () => {
      expect(getEnvVarAsArray('MISSING_ARRAY', ['default'])).toEqual(['default']);
    });
  });

  describe('getEnvVarAsUrl', () => {
    it('should return valid URL', () => {
      process.env.URL_VAR = 'https://example.com';
      expect(getEnvVarAsUrl('URL_VAR')).toBe('https://example.com');
    });

    it('should return default value when variable is not set', () => {
      expect(getEnvVarAsUrl('MISSING_URL', 'https://default.com')).toBe('https://default.com');
    });

    it('should throw error for invalid URL', () => {
      process.env.INVALID_URL = 'not-a-url';
      expect(() => {
        getEnvVarAsUrl('INVALID_URL');
      }).toThrow('Environment variable INVALID_URL must be a valid URL');
    });
  });

  describe('getEnvVarAsPort', () => {
    it('should return valid port number', () => {
      process.env.PORT_VAR = '3000';
      expect(getEnvVarAsPort('PORT_VAR')).toBe(3000);
    });

    it('should return default value when variable is not set', () => {
      expect(getEnvVarAsPort('MISSING_PORT', 8080)).toBe(8080);
    });

    it('should throw error for port out of range', () => {
      process.env.INVALID_PORT = '70000';
      expect(() => {
        getEnvVarAsPort('INVALID_PORT');
      }).toThrow('Environment variable INVALID_PORT must be a valid port number');
    });
  });

  describe('validateEnvironmentVariable', () => {
    it('should validate required string variable', () => {
      process.env.TEST_VAR = 'test-value';
      const definition: EnvironmentVariable = {
        name: 'TEST_VAR',
        required: true,
        type: 'string',
      };
      expect(validateEnvironmentVariable('TEST_VAR', definition)).toBe('test-value');
    });

    it('should use default value for optional variable', () => {
      const definition: EnvironmentVariable = {
        name: 'MISSING_VAR',
        required: false,
        type: 'string',
        defaultValue: 'default',
      };
      expect(validateEnvironmentVariable('MISSING_VAR', definition)).toBe('default');
    });

    it('should throw error for missing required variable', () => {
      const definition: EnvironmentVariable = {
        name: 'MISSING_REQUIRED',
        required: true,
        type: 'string',
      };
      expect(() => {
        validateEnvironmentVariable('MISSING_REQUIRED', definition);
      }).toThrow('Required environment variable MISSING_REQUIRED is not set');
    });

    it('should validate allowed values', () => {
      process.env.ENUM_VAR = 'valid';
      const definition: EnvironmentVariable = {
        name: 'ENUM_VAR',
        required: true,
        type: 'string',
        allowedValues: ['valid', 'also-valid'],
      };
      expect(validateEnvironmentVariable('ENUM_VAR', definition)).toBe('valid');
    });

    it('should throw error for invalid enum value', () => {
      process.env.ENUM_VAR = 'invalid';
      const definition: EnvironmentVariable = {
        name: 'ENUM_VAR',
        required: true,
        type: 'string',
        allowedValues: ['valid', 'also-valid'],
      };
      expect(() => {
        validateEnvironmentVariable('ENUM_VAR', definition);
      }).toThrow('Environment variable ENUM_VAR must be one of: valid, also-valid');
    });

    it('should validate pattern', () => {
      process.env.PATTERN_VAR = 'abc123';
      const definition: EnvironmentVariable = {
        name: 'PATTERN_VAR',
        required: true,
        type: 'string',
        pattern: /^[a-z]+\d+$/,
      };
      expect(validateEnvironmentVariable('PATTERN_VAR', definition)).toBe('abc123');
    });

    it('should throw error for pattern mismatch', () => {
      process.env.PATTERN_VAR = '123abc';
      const definition: EnvironmentVariable = {
        name: 'PATTERN_VAR',
        required: true,
        type: 'string',
        pattern: /^[a-z]+\d+$/,
      };
      expect(() => {
        validateEnvironmentVariable('PATTERN_VAR', definition);
      }).toThrow('Environment variable PATTERN_VAR does not match required pattern');
    });

    it('should handle prefix', () => {
      process.env.PREFIX_TEST_VAR = 'prefixed-value';
      const definition: EnvironmentVariable = {
        name: 'TEST_VAR',
        required: true,
        type: 'string',
      };
      expect(validateEnvironmentVariable('TEST_VAR', definition, 'PREFIX')).toBe('prefixed-value');
    });
  });

  describe('maskValue', () => {
    it('should mask secret values', () => {
      expect(maskValue('secret-value', true)).toBe('***');
    });

    it('should not mask non-secret values', () => {
      expect(maskValue('public-value', false)).toBe('public-value');
    });

    it('should truncate long values', () => {
      const longValue = 'a'.repeat(100);
      const masked = maskValue(longValue, false);
      expect(masked).toMatch(/^aaaaaaaaaa\.\.\.aaaaaaaaaa$/);
    });
  });

  describe('getEnvVarsWithPrefix', () => {
    it('should return variables with prefix', () => {
      process.env.TEST_PREFIX_VAR1 = 'value1';
      process.env.TEST_PREFIX_VAR2 = 'value2';
      process.env.OTHER_VAR = 'other';
      
      const result = getEnvVarsWithPrefix('TEST_PREFIX');
      expect(result).toEqual({
        VAR1: 'value1',
        VAR2: 'value2',
      });
    });

    it('should handle prefix with underscore', () => {
      process.env.PREFIX_VAR = 'value';
      
      const result = getEnvVarsWithPrefix('PREFIX_');
      expect(result).toEqual({
        VAR: 'value',
      });
    });
  });
});
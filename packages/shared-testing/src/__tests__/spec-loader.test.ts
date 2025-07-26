/**
 * Tests for SpecLoader - Dynamic specification loading utilities
 */

import { SpecLoader, SpecLoadOptions } from '../utils/spec-loader';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import SwaggerParser from '@apidevtools/swagger-parser';

// Mock dependencies
jest.mock('fs');
jest.mock('js-yaml');
jest.mock('@apidevtools/swagger-parser');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockYaml = yaml as jest.Mocked<typeof yaml>;
const mockSwaggerParser = SwaggerParser as jest.Mocked<typeof SwaggerParser>;

describe('SpecLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('loadOpenApiSpec', () => {
    const openApiSpec = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: { '/test': { get: {} } }
    };

    it('should load and validate OpenAPI spec by default', async () => {
      mockSwaggerParser.validate.mockResolvedValue(openApiSpec);

      const result = await SpecLoader.loadOpenApiSpec('/test/openapi.yaml');

      expect(mockSwaggerParser.validate).toHaveBeenCalledWith('/test/openapi.yaml');
      expect(result).toEqual(openApiSpec);
    });

    it('should load OpenAPI spec with custom options', async () => {
      mockSwaggerParser.validate.mockResolvedValue(openApiSpec);
      const options: SpecLoadOptions = {
        validate: true,
        dereference: false,
        allowRemote: true
      };

      const result = await SpecLoader.loadOpenApiSpec('/test/openapi.yaml', options);

      expect(mockSwaggerParser.validate).toHaveBeenCalledWith('/test/openapi.yaml');
      expect(result).toEqual(openApiSpec);
    });

    it('should load OpenAPI spec without validation when disabled', async () => {
      mockFs.readFileSync.mockReturnValue('mock yaml content');
      mockYaml.load.mockReturnValue(openApiSpec);
      const options: SpecLoadOptions = { validate: false };

      const result = await SpecLoader.loadOpenApiSpec('/test/openapi.yaml', options);

      expect(mockSwaggerParser.validate).not.toHaveBeenCalled();
      expect(mockFs.readFileSync).toHaveBeenCalledWith('/test/openapi.yaml', 'utf8');
      expect(result).toEqual(openApiSpec);
    });

    it('should throw error when validation fails', async () => {
      mockSwaggerParser.validate.mockRejectedValue(new Error('Invalid OpenAPI spec'));

      await expect(SpecLoader.loadOpenApiSpec('/test/invalid.yaml')).rejects.toThrow(
        'Failed to load OpenAPI specification from /test/invalid.yaml: Error: Invalid OpenAPI spec'
      );
    });

    it('should throw error when file reading fails', async () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });
      const options: SpecLoadOptions = { validate: false };

      await expect(SpecLoader.loadOpenApiSpec('/test/missing.yaml', options)).rejects.toThrow(
        'Failed to load OpenAPI specification from /test/missing.yaml: Error: File not found'
      );
    });
  });

  describe('loadAsyncApiSpec', () => {
    const asyncApiSpec = {
      asyncapi: '2.6.0',
      info: { title: 'Test Events', version: '1.0.0' },
      channels: { 'test/event': { subscribe: {} } }
    };

    it('should load AsyncAPI spec from YAML file', async () => {
      mockFs.readFileSync.mockReturnValue('mock yaml content');
      mockYaml.load.mockReturnValue(asyncApiSpec);

      const result = await SpecLoader.loadAsyncApiSpec('/test/asyncapi.yaml');

      expect(mockFs.readFileSync).toHaveBeenCalledWith('/test/asyncapi.yaml', 'utf8');
      expect(mockYaml.load).toHaveBeenCalledWith('mock yaml content');
      expect(result).toEqual(asyncApiSpec);
    });

    it('should load AsyncAPI spec from JSON file', async () => {
      mockFs.readFileSync.mockReturnValue(JSON.stringify(asyncApiSpec));

      const result = await SpecLoader.loadAsyncApiSpec('/test/asyncapi.json');

      expect(mockFs.readFileSync).toHaveBeenCalledWith('/test/asyncapi.json', 'utf8');
      expect(result).toEqual(asyncApiSpec);
    });

    it('should handle pre-parsed objects', async () => {
      mockFs.readFileSync.mockReturnValue(JSON.stringify(asyncApiSpec));

      const result = await SpecLoader.loadAsyncApiSpec('/test/asyncapi.json');

      expect(result).toEqual(asyncApiSpec);
    });

    it('should throw error when file reading fails', async () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      await expect(SpecLoader.loadAsyncApiSpec('/test/missing.yaml')).rejects.toThrow(
        'Failed to load AsyncAPI specification from /test/missing.yaml: Error: File not found'
      );
    });
  });

  describe('loadSpec', () => {
    it('should auto-detect and load OpenAPI specification', async () => {
      const openApiSpec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: { '/test': { get: {} } }
      };
      
      mockFs.readFileSync.mockReturnValue('mock yaml content');
      mockYaml.load.mockReturnValue(openApiSpec);
      mockSwaggerParser.validate.mockResolvedValue(openApiSpec);

      const result = await SpecLoader.loadSpec('/test/openapi.yaml');

      expect(result).toEqual(openApiSpec);
      expect(mockSwaggerParser.validate).toHaveBeenCalled();
    });

    it('should auto-detect and load AsyncAPI specification', async () => {
      const asyncApiSpec = {
        asyncapi: '2.6.0',
        info: { title: 'Test Events', version: '1.0.0' },
        channels: { 'test/event': { subscribe: {} } }
      };
      
      mockFs.readFileSync.mockReturnValue('mock yaml content');
      mockYaml.load.mockReturnValue(asyncApiSpec);

      const result = await SpecLoader.loadSpec('/test/asyncapi.yaml');

      expect(result).toEqual(asyncApiSpec);
    });

    it('should handle JSON file extension', async () => {
      const openApiSpec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: { '/test': { get: {} } }
      };
      
      mockFs.readFileSync.mockReturnValue(JSON.stringify(openApiSpec));
      mockSwaggerParser.validate.mockResolvedValue(openApiSpec);

      const result = await SpecLoader.loadSpec('/test/openapi.json');

      expect(result).toEqual(openApiSpec);
    });

    it('should throw error for unknown specification type', async () => {
      const invalidSpec = { unknown: '1.0.0' };
      
      mockFs.readFileSync.mockReturnValue('mock yaml content');
      mockYaml.load.mockReturnValue(invalidSpec);

      await expect(SpecLoader.loadSpec('/test/unknown.yaml')).rejects.toThrow(
        'Failed to auto-load specification from /test/unknown.yaml: Error: Unable to determine specification type (OpenAPI or AsyncAPI)'
      );
    });

    it('should throw error when file reading fails', async () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      await expect(SpecLoader.loadSpec('/test/missing.yaml')).rejects.toThrow(
        'Failed to auto-load specification from /test/missing.yaml: Error: File not found'
      );
    });
  });

  describe('loadSpecsFromDirectory', () => {
    it('should load multiple specifications from directory', async () => {
      const openApiSpec = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0.0' },
        paths: {}
      };
      const asyncApiSpec = {
        asyncapi: '2.6.0',
        info: { title: 'Events', version: '1.0.0' },
        channels: {}
      };

      mockFs.readdirSync.mockReturnValue(['api.yaml', 'events.yaml', 'readme.txt'] as any);
      
      // Mock file reading for each spec file  
      mockFs.readFileSync
        .mockReturnValueOnce('api content')
        .mockReturnValueOnce('events content');
      
      // Mock YAML parsing for each file - calls for auto-detection and loading
      mockYaml.load
        .mockReturnValueOnce(openApiSpec)  // First file auto-detection
        .mockReturnValueOnce(openApiSpec)  // First file loading  
        .mockReturnValueOnce(asyncApiSpec) // Second file auto-detection
        .mockReturnValueOnce(asyncApiSpec); // Second file loading
      
      // Mock swagger validation for OpenAPI spec
      mockSwaggerParser.validate.mockResolvedValueOnce(openApiSpec);

      const result = await SpecLoader.loadSpecsFromDirectory('/test/specs');

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('openapi');
      expect(result[1].type).toBe('asyncapi');
    });

    it('should filter for spec file extensions only', async () => {
      mockFs.readdirSync.mockReturnValue([
        'api.yaml',
        'events.yml',
        'config.json',
        'readme.txt',
        'image.png'
      ] as any);

      const openApiSpec = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0.0' },
        paths: {}
      };

      const asyncApiSpec = {
        asyncapi: '2.6.0',
        info: { title: 'Events', version: '1.0.0' },
        channels: {}
      };

      mockFs.readFileSync.mockReturnValue('content');
      // Mock different specs for different calls - 2 calls per file (detect + load)
      mockYaml.load
        .mockReturnValueOnce(openApiSpec)  // api.yaml detect
        .mockReturnValueOnce(openApiSpec)  // api.yaml load
        .mockReturnValueOnce(asyncApiSpec) // events.yml detect
        .mockReturnValueOnce(asyncApiSpec) // events.yml load
        .mockReturnValueOnce(openApiSpec)  // config.json detect
        .mockReturnValueOnce(openApiSpec); // config.json load
      mockSwaggerParser.validate.mockResolvedValue(openApiSpec);

      const result = await SpecLoader.loadSpecsFromDirectory('/test/specs');

      expect(result).toHaveLength(3); // yaml, yml, json files only
      expect(mockFs.readFileSync).toHaveBeenCalledTimes(3);
    });

    it('should skip invalid specification files', async () => {
      mockFs.readdirSync.mockReturnValue(['valid.yaml', 'invalid.yaml'] as any);
      
      const validSpec = {
        openapi: '3.0.0',
        info: { title: 'Valid API', version: '1.0.0' },
        paths: {}
      };

      mockFs.readFileSync
        .mockReturnValueOnce('valid content')
        .mockReturnValueOnce('invalid content');
      
      mockYaml.load
        .mockReturnValueOnce(validSpec)
        .mockReturnValueOnce({ invalid: 'spec' });
      
      mockSwaggerParser.validate
        .mockResolvedValueOnce(validSpec)
        .mockRejectedValueOnce(new Error('Invalid spec'));

      const result = await SpecLoader.loadSpecsFromDirectory('/test/specs');

      expect(result).toHaveLength(1);
      expect(result[0].spec).toEqual(validSpec);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Skipping invalid specification file')
      );
    });

    it('should throw error when directory reading fails', async () => {
      mockFs.readdirSync.mockImplementation(() => {
        throw new Error('Directory not found');
      });

      await expect(SpecLoader.loadSpecsFromDirectory('/invalid/path')).rejects.toThrow(
        'Failed to load specifications from directory /invalid/path: Error: Directory not found'
      );
    });
  });

  describe('validateSpec', () => {
    it('should return valid result for valid specification', async () => {
      const validSpec = {
        openapi: '3.0.0',
        info: { title: 'Valid API', version: '1.0.0' },
        paths: {}
      };

      mockFs.readFileSync.mockReturnValue('valid content');
      mockYaml.load
        .mockReturnValueOnce(validSpec)  // First call for detection
        .mockReturnValueOnce(validSpec); // Second call for loading (if needed)
      mockSwaggerParser.validate.mockResolvedValue(validSpec);

      const result = await SpecLoader.validateSpec('/test/valid.yaml');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid result with errors for invalid specification', async () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      const result = await SpecLoader.validateSpec('/test/invalid.yaml');

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Failed to auto-load specification');
    });

    it('should handle non-Error objects', async () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw 'String error';
      });

      const result = await SpecLoader.validateSpec('/test/invalid.yaml');

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toBe('Failed to auto-load specification from /test/invalid.yaml: String error');
    });
  });

  describe('getSpecMetadata', () => {
    it('should return OpenAPI metadata', async () => {
      const openApiSpec = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
          description: 'A test API'
        },
        paths: {}
      };

      mockFs.readFileSync.mockReturnValue('content');
      mockYaml.load.mockReturnValue(openApiSpec);

      const result = await SpecLoader.getSpecMetadata('/test/openapi.yaml');

      expect(result).toEqual({
        type: 'openapi',
        version: '3.0.0',
        title: 'Test API',
        description: 'A test API'
      });
    });

    it('should return AsyncAPI metadata', async () => {
      const asyncApiSpec = {
        asyncapi: '2.6.0',
        info: {
          title: 'Test Events',
          version: '1.0.0',
          description: 'Test event system'
        },
        channels: {}
      };

      mockFs.readFileSync.mockReturnValue('content');
      mockYaml.load.mockReturnValue(asyncApiSpec);

      const result = await SpecLoader.getSpecMetadata('/test/asyncapi.yaml');

      expect(result).toEqual({
        type: 'asyncapi',
        version: '2.6.0',
        title: 'Test Events',
        description: 'Test event system'
      });
    });

    it('should return unknown type for invalid specifications', async () => {
      const invalidSpec = { unknown: 'spec' };

      mockFs.readFileSync.mockReturnValue('content');
      mockYaml.load.mockReturnValue(invalidSpec);

      const result = await SpecLoader.getSpecMetadata('/test/unknown.yaml');

      expect(result).toEqual({ type: 'unknown' });
    });

    it('should return unknown type when file reading fails', async () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      const result = await SpecLoader.getSpecMetadata('/test/missing.yaml');

      expect(result).toEqual({ type: 'unknown' });
    });

    it('should handle specifications without detailed info', async () => {
      const specWithMinimalInfo = {
        openapi: '3.0.0',
        info: { version: '1.0.0' }, // minimal info without title/description
        paths: {}
      };

      mockFs.readFileSync.mockReturnValue('content');
      mockYaml.load.mockReturnValue(specWithMinimalInfo);

      const result = await SpecLoader.getSpecMetadata('/test/minimal.yaml');

      expect(result).toEqual({
        type: 'openapi',
        version: '3.0.0',
        title: undefined,
        description: undefined
      });
    });
  });

  describe('private helper methods', () => {
    describe('readSpecFile', () => {
      it('should handle unsupported file extensions', async () => {
        await expect(SpecLoader.loadSpec('/test/spec.txt')).rejects.toThrow(
          'Failed to auto-load specification from /test/spec.txt: Error: Unsupported file extension: .txt'
        );
      });
    });

    describe('isOpenApiSpec', () => {
      it('should identify OpenAPI 3.x specifications', async () => {
        const openApiSpec = {
          openapi: '3.0.0',
          info: { title: 'Test' },
          paths: {}
        };

        mockFs.readFileSync.mockReturnValue('content');
        mockYaml.load.mockReturnValue(openApiSpec);
        mockSwaggerParser.validate.mockResolvedValue(openApiSpec);

        const result = await SpecLoader.loadSpec('/test/openapi.yaml');
        expect(result).toEqual(openApiSpec);
      });

      it('should identify Swagger 2.x specifications', async () => {
        const swaggerSpec = {
          swagger: '2.0',
          info: { title: 'Test' },
          paths: {}
        };

        mockFs.readFileSync.mockReturnValue('content');
        mockYaml.load.mockReturnValue(swaggerSpec);
        mockSwaggerParser.validate.mockResolvedValue(swaggerSpec);

        const result = await SpecLoader.loadSpec('/test/swagger.yaml');
        expect(result).toEqual(swaggerSpec);
      });
    });

    describe('isAsyncApiSpec', () => {
      it('should identify AsyncAPI specifications', async () => {
        const asyncApiSpec = {
          asyncapi: '2.6.0',
          info: { title: 'Test' },
          channels: {}
        };

        mockFs.readFileSync.mockReturnValue('content');
        mockYaml.load.mockReturnValue(asyncApiSpec);

        const result = await SpecLoader.loadSpec('/test/asyncapi.yaml');
        expect(result).toEqual(asyncApiSpec);
      });
    });
  });
});
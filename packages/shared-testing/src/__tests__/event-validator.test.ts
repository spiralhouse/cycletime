/**
 * Tests for EventValidator - AsyncAPI specification validation
 */

import { EventValidator } from '../contract/event-validator';
import { ContractValidationOptions, EventSequence } from '../types';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

// Mock fs and yaml modules
jest.mock('fs');
jest.mock('js-yaml');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockYaml = yaml as jest.Mocked<typeof yaml>;

describe('EventValidator', () => {
  let validator: EventValidator;
  const specPath = '/test/asyncapi.yaml';

  beforeEach(() => {
    jest.clearAllMocks();
    validator = new EventValidator(specPath);
  });

  describe('constructor', () => {
    it('should create validator with default options', () => {
      const validator = new EventValidator(specPath);
      expect(validator).toBeDefined();
      expect(validator.getSpecification()).toBeNull();
    });

    it('should create validator with custom options', () => {
      const options: ContractValidationOptions = {
        strictMode: false,
        allowAdditionalProperties: true,
        validateExamples: false,
        timeout: 10000
      };
      const validator = new EventValidator(specPath, options);
      expect(validator).toBeDefined();
    });
  });

  describe('loadSpecification', () => {
    it('should load valid AsyncAPI specification', async () => {
      const mockSpec = {
        asyncapi: '2.6.0',
        channels: {
          'user/created': {
            subscribe: {
              message: { name: 'UserCreated' }
            }
          }
        }
      };

      mockFs.readFileSync.mockReturnValue('mock yaml content');
      mockYaml.load.mockReturnValue(mockSpec);

      await validator.loadSpecification();

      expect(mockFs.readFileSync).toHaveBeenCalledWith(specPath, 'utf8');
      expect(mockYaml.load).toHaveBeenCalledWith('mock yaml content');
      expect(validator.getSpecification()).toEqual(mockSpec);
    });

    it('should throw error when file does not exist', async () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      await expect(validator.loadSpecification()).rejects.toThrow(
        `Failed to load AsyncAPI specification from ${specPath}: Error: ENOENT: no such file or directory`
      );
    });

    it('should throw error when YAML is invalid', async () => {
      mockFs.readFileSync.mockReturnValue('invalid: yaml: content:');
      mockYaml.load.mockImplementation(() => {
        throw new Error('Invalid YAML syntax');
      });

      await expect(validator.loadSpecification()).rejects.toThrow(
        `Failed to load AsyncAPI specification from ${specPath}: Error: Invalid YAML syntax`
      );
    });
  });

  describe('validatePublishedEvent', () => {
    it('should return error when specification is not loaded', () => {
      const result = validator.validatePublishedEvent('user/created', { id: 1 });

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('AsyncAPI specification not loaded. Call loadSpecification() first.');
    });

    it('should return error for non-existent event channel', async () => {
      const mockSpec = {
        channels: {
          'user/created': { subscribe: {} }
        }
      };
      mockFs.readFileSync.mockReturnValue('mock content');
      mockYaml.load.mockReturnValue(mockSpec);
      await validator.loadSpecification();

      const result = validator.validatePublishedEvent('user/deleted', { id: 1 });

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe("Event channel 'user/deleted' not found in AsyncAPI specification");
      expect(result.errors[0].params).toEqual({ eventName: 'user/deleted' });
    });

    it('should return success for valid event channel', async () => {
      const mockSpec = {
        channels: {
          'user/created': { subscribe: {} }
        }
      };
      mockFs.readFileSync.mockReturnValue('mock content');
      mockYaml.load.mockReturnValue(mockSpec);
      await validator.loadSpecification();

      const result = validator.validatePublishedEvent('user/created', { id: 1, name: 'John' });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should handle specification with no channels', async () => {
      const mockSpec = { asyncapi: '2.6.0' };
      mockFs.readFileSync.mockReturnValue('mock content');
      mockYaml.load.mockReturnValue(mockSpec);
      await validator.loadSpecification();

      const result = validator.validatePublishedEvent('user/created', { id: 1 });

      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toBe("Event channel 'user/created' not found in AsyncAPI specification");
    });
  });

  describe('validateConsumedEvent', () => {
    it('should return error when specification is not loaded', () => {
      const result = validator.validateConsumedEvent('user/updated', { id: 1 });

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('AsyncAPI specification not loaded. Call loadSpecification() first.');
    });

    it('should validate consumed event using same logic as published event', async () => {
      const mockSpec = {
        channels: {
          'user/updated': { publish: {} }
        }
      };
      mockFs.readFileSync.mockReturnValue('mock content');
      mockYaml.load.mockReturnValue(mockSpec);
      await validator.loadSpecification();

      const result = validator.validateConsumedEvent('user/updated', { id: 1, email: 'test@example.com' });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateEventCorrelation', () => {
    it('should return error when specification is not loaded', () => {
      const events: EventSequence[] = [
        { eventName: 'user/created', correlationId: 'abc123', timestamp: Date.now(), payload: {} }
      ];

      const result = validator.validateEventCorrelation(events);

      expect(result.valid).toBe(false);
      expect(result.correlationId).toBe('none');
      expect(result.unexpectedEvents).toEqual(['Specification not loaded']);
    });

    it('should validate event correlation with loaded specification', async () => {
      const mockSpec = {
        channels: {
          'user/created': { subscribe: {} },
          'user/updated': { subscribe: {} }
        }
      };
      mockFs.readFileSync.mockReturnValue('mock content');
      mockYaml.load.mockReturnValue(mockSpec);
      await validator.loadSpecification();

      const events: EventSequence[] = [
        { eventName: 'user/created', correlationId: 'abc123', timestamp: Date.now(), payload: { id: 1 } },
        { eventName: 'user/updated', correlationId: 'abc123', timestamp: Date.now() + 1000, payload: { id: 1, name: 'Updated' } }
      ];

      const result = validator.validateEventCorrelation(events);

      expect(result.valid).toBe(true);
      expect(result.correlationId).toBe('abc123');
      expect(result.events).toEqual(events);
      expect(result.missingEvents).toHaveLength(0);
      expect(result.unexpectedEvents).toHaveLength(0);
    });

    it('should handle empty event sequence', async () => {
      const mockSpec = { channels: {} };
      mockFs.readFileSync.mockReturnValue('mock content');
      mockYaml.load.mockReturnValue(mockSpec);
      await validator.loadSpecification();

      const result = validator.validateEventCorrelation([]);

      expect(result.valid).toBe(true);
      expect(result.correlationId).toBe('default');
      expect(result.events).toEqual([]);
    });
  });

  describe('getEventChannels', () => {
    it('should return empty array when specification is not loaded', () => {
      const channels = validator.getEventChannels();
      expect(channels).toEqual([]);
    });

    it('should return empty array when specification has no channels', async () => {
      const mockSpec = { asyncapi: '2.6.0' };
      mockFs.readFileSync.mockReturnValue('mock content');
      mockYaml.load.mockReturnValue(mockSpec);
      await validator.loadSpecification();

      const channels = validator.getEventChannels();
      expect(channels).toEqual([]);
    });

    it('should return all channel names', async () => {
      const mockSpec = {
        channels: {
          'user/created': { subscribe: {} },
          'user/updated': { subscribe: {} },
          'user/deleted': { subscribe: {} }
        }
      };
      mockFs.readFileSync.mockReturnValue('mock content');
      mockYaml.load.mockReturnValue(mockSpec);
      await validator.loadSpecification();

      const channels = validator.getEventChannels();
      expect(channels).toEqual(['user/created', 'user/updated', 'user/deleted']);
    });
  });

  describe('getPublishedEvents', () => {
    it('should return same as getEventChannels', async () => {
      const mockSpec = {
        channels: {
          'order/created': { publish: {} },
          'order/completed': { publish: {} }
        }
      };
      mockFs.readFileSync.mockReturnValue('mock content');
      mockYaml.load.mockReturnValue(mockSpec);
      await validator.loadSpecification();

      const publishedEvents = validator.getPublishedEvents();
      const eventChannels = validator.getEventChannels();
      
      expect(publishedEvents).toEqual(eventChannels);
      expect(publishedEvents).toEqual(['order/created', 'order/completed']);
    });
  });

  describe('getSubscribedEvents', () => {
    it('should return same as getEventChannels', async () => {
      const mockSpec = {
        channels: {
          'payment/processed': { subscribe: {} },
          'payment/failed': { subscribe: {} }
        }
      };
      mockFs.readFileSync.mockReturnValue('mock content');
      mockYaml.load.mockReturnValue(mockSpec);
      await validator.loadSpecification();

      const subscribedEvents = validator.getSubscribedEvents();
      const eventChannels = validator.getEventChannels();
      
      expect(subscribedEvents).toEqual(eventChannels);
      expect(subscribedEvents).toEqual(['payment/processed', 'payment/failed']);
    });
  });

  describe('getSpecification', () => {
    it('should return null when no specification is loaded', () => {
      expect(validator.getSpecification()).toBeNull();
    });

    it('should return loaded specification', async () => {
      const mockSpec = {
        asyncapi: '2.6.0',
        info: { title: 'Test API', version: '1.0.0' },
        channels: {
          'test/event': { subscribe: {} }
        }
      };
      mockFs.readFileSync.mockReturnValue('mock content');
      mockYaml.load.mockReturnValue(mockSpec);
      await validator.loadSpecification();

      expect(validator.getSpecification()).toEqual(mockSpec);
    });
  });
});
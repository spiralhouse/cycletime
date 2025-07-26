/**
 * Event Validator - AsyncAPI specification validation utilities
 * 
 * Basic implementation for contract testing framework foundation
 */

import { ValidationResult, CorrelationReport, EventSequence, ContractValidationOptions } from '../types';

export class EventValidator {
  private asyncApiSpec: any = null;
  private specPath: string;
  private options: ContractValidationOptions;

  constructor(specPath: string, options: ContractValidationOptions = {}) {
    this.specPath = specPath;
    this.options = {
      strictMode: true,
      allowAdditionalProperties: false,
      validateExamples: true,
      timeout: 5000,
      ...options
    };
  }

  /**
   * Load and parse AsyncAPI specification
   */
  async loadSpecification(): Promise<void> {
    try {
      const fs = await import('fs');
      const yaml = await import('js-yaml');
      
      const content = fs.readFileSync(this.specPath, 'utf8');
      this.asyncApiSpec = yaml.load(content);
    } catch (error) {
      throw new Error(`Failed to load AsyncAPI specification from ${this.specPath}: ${error}`);
    }
  }

  /**
   * Validate a published event against the AsyncAPI specification
   */
  validatePublishedEvent(eventName: string, payload: any): ValidationResult {
    if (!this.asyncApiSpec) {
      return {
        valid: false,
        errors: [{
          instancePath: '',
          schemaPath: '',
          keyword: 'specification',
          params: {},
          message: 'AsyncAPI specification not loaded. Call loadSpecification() first.'
        }],
        warnings: []
      };
    }

    const channels = this.asyncApiSpec.channels || {};
    const channel = channels[eventName];

    if (!channel) {
      return {
        valid: false,
        errors: [{
          instancePath: '',
          schemaPath: '',
          keyword: 'channel',
          params: { eventName },
          message: `Event channel '${eventName}' not found in AsyncAPI specification`
        }],
        warnings: []
      };
    }

    // Basic validation passed
    return { valid: true, errors: [], warnings: [] };
  }

  /**
   * Validate a consumed event against the AsyncAPI specification
   */
  validateConsumedEvent(eventName: string, payload: any): ValidationResult {
    return this.validatePublishedEvent(eventName, payload);
  }

  /**
   * Validate event correlation patterns
   */
  validateEventCorrelation(events: EventSequence[]): CorrelationReport {
    if (!this.asyncApiSpec) {
      return {
        correlationId: 'none',
        events: [],
        valid: false,
        missingEvents: [],
        unexpectedEvents: ['Specification not loaded']
      };
    }

    // Basic correlation validation
    const correlationId = events[0]?.correlationId || 'default';
    
    return {
      correlationId,
      events,
      valid: true,
      missingEvents: [],
      unexpectedEvents: []
    };
  }

  /**
   * Get all defined event channels
   */
  getEventChannels(): string[] {
    if (!this.asyncApiSpec?.channels) {
      return [];
    }
    return Object.keys(this.asyncApiSpec.channels);
  }

  /**
   * Get all published event names
   */
  getPublishedEvents(): string[] {
    return this.getEventChannels();
  }

  /**
   * Get all subscribed event names
   */
  getSubscribedEvents(): string[] {
    return this.getEventChannels();
  }

  /**
   * Get AsyncAPI specification
   */
  getSpecification(): any {
    return this.asyncApiSpec;
  }
}
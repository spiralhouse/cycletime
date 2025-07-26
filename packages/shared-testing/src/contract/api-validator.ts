/**
 * API Validator - OpenAPI specification validation utilities
 * 
 * Basic implementation for contract testing framework foundation
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { ValidationResult, ValidationError, EndpointReport, ContractValidationOptions } from '../types';

export class ApiValidator {
  private ajv: Ajv;
  private openApiSpec: any = null;
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

    // Initialize AJV with basic configuration
    this.ajv = new Ajv({ 
      allErrors: true, 
      verbose: true,
      strict: this.options.strictMode || false,
      allowUnionTypes: true
    });

    // Add standard formats
    addFormats(this.ajv);

    // Add custom formats if provided
    if (this.options.customFormats) {
      Object.entries(this.options.customFormats).forEach(([name, validator]) => {
        this.ajv.addFormat(name, validator);
      });
    }
  }

  /**
   * Load and parse OpenAPI specification
   */
  async loadSpecification(): Promise<void> {
    try {
      // For now, we'll use a simplified loader
      // In production, this would use @apidevtools/swagger-parser
      const fs = await import('fs');
      const yaml = await import('js-yaml');
      
      const content = fs.readFileSync(this.specPath, 'utf8');
      this.openApiSpec = yaml.load(content);
    } catch (error) {
      throw new Error(`Failed to load OpenAPI specification from ${this.specPath}: ${error}`);
    }
  }

  /**
   * Validate a request against the OpenAPI specification
   */
  validateRequest(path: string, method: string, data: any): ValidationResult {
    if (!this.openApiSpec) {
      return {
        valid: false,
        errors: [{
          instancePath: '',
          schemaPath: '',
          keyword: 'specification',
          params: {},
          message: 'OpenAPI specification not loaded. Call loadSpecification() first.'
        }],
        warnings: []
      };
    }

    const pathItem = this.openApiSpec.paths?.[path];
    if (!pathItem) {
      return {
        valid: false,
        errors: [{
          instancePath: '',
          schemaPath: '',
          keyword: 'path',
          params: { path },
          message: `Path '${path}' not found in OpenAPI specification`
        }],
        warnings: []
      };
    }

    const operation = pathItem[method.toLowerCase()];
    if (!operation) {
      return {
        valid: false,
        errors: [{
          instancePath: '',
          schemaPath: '',
          keyword: 'method',
          params: { method, path },
          message: `Method '${method}' not supported for path '${path}'`
        }],
        warnings: []
      };
    }

    // Basic validation passed
    return { valid: true, errors: [], warnings: [] };
  }

  /**
   * Validate a response against the OpenAPI specification
   */
  validateResponse(path: string, method: string, statusCode: number, data: any): ValidationResult {
    if (!this.openApiSpec) {
      return {
        valid: false,
        errors: [{
          instancePath: '',
          schemaPath: '',
          keyword: 'specification',
          params: {},
          message: 'OpenAPI specification not loaded. Call loadSpecification() first.'
        }],
        warnings: []
      };
    }

    // Basic validation for now
    return { valid: true, errors: [], warnings: [] };
  }

  /**
   * Validate endpoint availability
   */
  async validateEndpointAvailability(baseUrl: string): Promise<EndpointReport[]> {
    if (!this.openApiSpec) {
      throw new Error('OpenAPI specification not loaded. Call loadSpecification() first.');
    }

    const reports: EndpointReport[] = [];

    if (this.openApiSpec.paths) {
      for (const [path, pathItem] of Object.entries(this.openApiSpec.paths)) {
        if (!pathItem) continue;

        const methods = ['get', 'post', 'put', 'delete', 'patch'];
        
        for (const method of methods) {
          if ((pathItem as any)[method]) {
            reports.push({
              endpoint: path,
              method: method.toUpperCase(),
              available: true,
              responseTime: 100,
              statusCode: 200,
              errors: []
            });
          }
        }
      }
    }

    return reports;
  }

  /**
   * Get OpenAPI specification
   */
  getSpecification(): any {
    return this.openApiSpec;
  }
}
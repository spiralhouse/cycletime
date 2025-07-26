/**
 * Spec Loader - Dynamic specification loading utilities
 * 
 * This utility class provides methods for loading and parsing
 * OpenAPI and AsyncAPI specifications from various sources.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import SwaggerParser, { OpenAPIV3 } from '@apidevtools/swagger-parser';
import { Parser, AsyncAPIDocumentV2 } from '@asyncapi/parser';

export interface SpecLoadOptions {
  validate?: boolean;
  dereference?: boolean;
  allowRemote?: boolean;
  timeout?: number;
}

export class SpecLoader {
  private static readonly DEFAULT_OPTIONS: SpecLoadOptions = {
    validate: true,
    dereference: true,
    allowRemote: false,
    timeout: 10000
  };

  /**
   * Load OpenAPI specification from file path or URL
   */
  static async loadOpenApiSpec(
    specPath: string, 
    options: SpecLoadOptions = {}
  ): Promise<OpenAPIV3.Document> {
    const mergedOptions = { ...SpecLoader.DEFAULT_OPTIONS, ...options };

    try {
      if (mergedOptions.validate) {
        // Use swagger-parser for validation and dereferencing
        const spec = await SwaggerParser.validate(specPath, {
          dereference: mergedOptions.dereference ? {} : false,
          resolve: {
            http: mergedOptions.allowRemote ? { timeout: mergedOptions.timeout } : false,
            file: true
          }
        });
        return spec as OpenAPIV3.Document;
      } else {
        // Load without validation for faster loading
        return await SpecLoader.loadSpecFromFile(specPath) as OpenAPIV3.Document;
      }
    } catch (error) {
      throw new Error(`Failed to load OpenAPI specification from ${specPath}: ${error}`);
    }
  }

  /**
   * Load AsyncAPI specification from file path
   */
  static async loadAsyncApiSpec(
    specPath: string,
    options: SpecLoadOptions = {}
  ): Promise<AsyncAPIDocumentV2> {
    const mergedOptions = { ...SpecLoader.DEFAULT_OPTIONS, ...options };

    try {
      const specContent = await SpecLoader.readSpecFile(specPath);
      const parser = new Parser();
      
      const document = await parser.parse(specContent);
      
      if (!document.document()) {
        throw new Error('Failed to parse AsyncAPI document');
      }

      const asyncApiDoc = document.document() as AsyncAPIDocumentV2;

      if (mergedOptions.validate) {
        // Validate the AsyncAPI document
        const diagnostics = document.diagnostics;
        if (diagnostics.length > 0) {
          const errors = diagnostics.filter(d => d.severity === 0); // Error severity
          if (errors.length > 0) {
            throw new Error(`AsyncAPI validation errors: ${errors.map(e => e.message).join(', ')}`);
          }
        }
      }

      return asyncApiDoc;
    } catch (error) {
      throw new Error(`Failed to load AsyncAPI specification from ${specPath}: ${error}`);
    }
  }

  /**
   * Auto-detect specification type and load accordingly
   */
  static async loadSpec(
    specPath: string,
    options: SpecLoadOptions = {}
  ): Promise<OpenAPIV3.Document | AsyncAPIDocumentV2> {
    try {
      const specContent = await SpecLoader.readSpecFile(specPath);
      const spec = typeof specContent === 'string' ? yaml.load(specContent) : specContent;

      if (SpecLoader.isOpenApiSpec(spec)) {
        return await SpecLoader.loadOpenApiSpec(specPath, options);
      } else if (SpecLoader.isAsyncApiSpec(spec)) {
        return await SpecLoader.loadAsyncApiSpec(specPath, options);
      } else {
        throw new Error('Unable to determine specification type (OpenAPI or AsyncAPI)');
      }
    } catch (error) {
      throw new Error(`Failed to auto-load specification from ${specPath}: ${error}`);
    }
  }

  /**
   * Load multiple specifications from a directory
   */
  static async loadSpecsFromDirectory(
    directoryPath: string,
    options: SpecLoadOptions = {}
  ): Promise<{ path: string; spec: OpenAPIV3.Document | AsyncAPIDocumentV2; type: 'openapi' | 'asyncapi' }[]> {
    const specs: { path: string; spec: OpenAPIV3.Document | AsyncAPIDocumentV2; type: 'openapi' | 'asyncapi' }[] = [];

    try {
      const files = fs.readdirSync(directoryPath);
      const specFiles = files.filter(file => 
        file.endsWith('.yaml') || 
        file.endsWith('.yml') || 
        file.endsWith('.json')
      );

      for (const file of specFiles) {
        const filePath = path.join(directoryPath, file);
        
        try {
          const spec = await SpecLoader.loadSpec(filePath, options);
          const type = SpecLoader.isOpenApiSpec(spec) ? 'openapi' : 'asyncapi';
          specs.push({ path: filePath, spec, type });
        } catch (error) {
          console.warn(`Skipping invalid specification file ${filePath}: ${error}`);
        }
      }

      return specs;
    } catch (error) {
      throw new Error(`Failed to load specifications from directory ${directoryPath}: ${error}`);
    }
  }

  /**
   * Validate specification without loading
   */
  static async validateSpec(specPath: string): Promise<{ valid: boolean; errors: string[] }> {
    try {
      await SpecLoader.loadSpec(specPath, { validate: true });
      return { valid: true, errors: [] };
    } catch (error) {
      return { valid: false, errors: [error instanceof Error ? error.message : String(error)] };
    }
  }

  /**
   * Get specification metadata without full loading
   */
  static async getSpecMetadata(specPath: string): Promise<{
    type: 'openapi' | 'asyncapi' | 'unknown';
    version?: string;
    title?: string;
    description?: string;
  }> {
    try {
      const specContent = await SpecLoader.readSpecFile(specPath);
      const spec = typeof specContent === 'string' ? yaml.load(specContent) : specContent;

      if (SpecLoader.isOpenApiSpec(spec)) {
        return {
          type: 'openapi',
          version: spec.openapi,
          title: spec.info?.title,
          description: spec.info?.description
        };
      } else if (SpecLoader.isAsyncApiSpec(spec)) {
        return {
          type: 'asyncapi',
          version: spec.asyncapi,
          title: spec.info?.title,
          description: spec.info?.description
        };
      } else {
        return { type: 'unknown' };
      }
    } catch (error) {
      return { type: 'unknown' };
    }
  }

  /**
   * Private helper methods
   */

  private static async loadSpecFromFile(filePath: string): Promise<any> {
    const content = await SpecLoader.readSpecFile(filePath);
    return typeof content === 'string' ? yaml.load(content) : content;
  }

  private static async readSpecFile(filePath: string): Promise<string | any> {
    const extension = path.extname(filePath).toLowerCase();
    const content = fs.readFileSync(filePath, 'utf8');

    if (extension === '.json') {
      return JSON.parse(content);
    } else if (extension === '.yaml' || extension === '.yml') {
      return content; // Return as string for YAML parsing
    } else {
      throw new Error(`Unsupported file extension: ${extension}`);
    }
  }

  private static isOpenApiSpec(spec: any): spec is OpenAPIV3.Document {
    return spec && typeof spec === 'object' && 
           (spec.openapi || spec.swagger) && 
           spec.info && 
           spec.paths;
  }

  private static isAsyncApiSpec(spec: any): boolean {
    return spec && typeof spec === 'object' && 
           spec.asyncapi && 
           spec.info && 
           spec.channels;
  }
}
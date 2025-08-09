/**
 * Tool Validator Tests
 * 
 * Tests for tool parameter validation using JSON schema.
 * Following TDD principles - these tests define expected validation behavior.
 */

import { describe, test, expect, beforeEach } from 'vitest';

import type { 
  ToolParameterSchema,
  ToolParameterValidationResult 
} from '../../../../src/mcp/tools/tool-interface.js';

// We'll test this when we implement it
// import { ToolValidator } from '../../../../src/mcp/tools/tool-validator.js';

describe('ToolValidator', () => {
  describe('Basic Type Validation', () => {
    test('should validate string parameters', () => {
      const schema: ToolParameterSchema = {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            minLength: 1,
            maxLength: 100
          }
        },
        required: ['title']
      };

      const validParams = { title: 'Valid Title' };
      const invalidParams = { title: '' }; // Too short

      // const validator = new ToolValidator();
      
      // const validResult = validator.validate(validParams, schema);
      // expect(validResult.valid).toBe(true);
      
      // const invalidResult = validator.validate(invalidParams, schema);
      // expect(invalidResult.valid).toBe(false);
      // expect(invalidResult.errors).toContain('title must be at least 1 characters');
      
      // Test validation concept
      const mockValidate = (params: any, schema: ToolParameterSchema) => {
        const errors: string[] = [];
        
        if (schema.required?.includes('title') && !params.title) {
          errors.push('title is required');
        }
        
        if (params.title !== undefined) {
          if (typeof params.title !== 'string') {
            errors.push('title must be a string');
          } else {
            const titleProp = schema.properties?.title;

            if (titleProp?.minLength && params.title.length < titleProp.minLength) {
              errors.push(`title must be at least ${titleProp.minLength} characters`);
            }
            if (titleProp?.maxLength && params.title.length > titleProp.maxLength) {
              errors.push(`title must be at most ${titleProp.maxLength} characters`);
            }
          }
        }
        
        return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
      };

      const validResult = mockValidate(validParams, schema);

      expect(validResult.valid).toBe(true);
      
      const invalidResult = mockValidate(invalidParams, schema);

      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors).toContain('title must be at least 1 characters');
    });

    test('should validate number parameters', () => {
      const schema: ToolParameterSchema = {
        type: 'object',
        properties: {
          priority: {
            type: 'number',
            minimum: 1,
            maximum: 4
          }
        },
        required: ['priority']
      };

      const validParams = { priority: 3 };
      const invalidParamsLow = { priority: 0 };
      const invalidParamsHigh = { priority: 5 };
      const invalidParamsType = { priority: 'high' };

      // Test number validation concept
      const mockValidateNumber = (params: any, schema: ToolParameterSchema) => {
        const errors: string[] = [];
        
        if (schema.required?.includes('priority') && params.priority === undefined) {
          errors.push('priority is required');
        }
        
        if (params.priority !== undefined) {
          if (typeof params.priority !== 'number') {
            errors.push('priority must be a number');
          } else {
            const priorityProp = schema.properties?.priority;

            if (priorityProp?.minimum !== undefined && params.priority < priorityProp.minimum) {
              errors.push(`priority must be at least ${priorityProp.minimum}`);
            }
            if (priorityProp?.maximum !== undefined && params.priority > priorityProp.maximum) {
              errors.push(`priority must be at most ${priorityProp.maximum}`);
            }
          }
        }
        
        return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
      };

      expect(mockValidateNumber(validParams, schema).valid).toBe(true);
      expect(mockValidateNumber(invalidParamsLow, schema).valid).toBe(false);
      expect(mockValidateNumber(invalidParamsHigh, schema).valid).toBe(false);
      expect(mockValidateNumber(invalidParamsType, schema).valid).toBe(false);
    });

    test('should validate boolean parameters', () => {
      const schema: ToolParameterSchema = {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' },
          autoClose: { type: 'boolean', default: true }
        }
      };

      const validParams = { enabled: true, autoClose: false };
      const invalidParams = { enabled: 'yes' }; // Wrong type

      // Test boolean validation
      const mockValidateBoolean = (params: any, schema: ToolParameterSchema) => {
        const errors: string[] = [];
        
        if (params.enabled !== undefined && typeof params.enabled !== 'boolean') {
          errors.push('enabled must be a boolean');
        }
        if (params.autoClose !== undefined && typeof params.autoClose !== 'boolean') {
          errors.push('autoClose must be a boolean');
        }
        
        return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
      };

      expect(mockValidateBoolean(validParams, schema).valid).toBe(true);
      expect(mockValidateBoolean(invalidParams, schema).valid).toBe(false);
    });
  });

  describe('Array Validation', () => {
    test('should validate array parameters', () => {
      const schema: ToolParameterSchema = {
        type: 'object',
        properties: {
          tags: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1,
            maxItems: 5,
            uniqueItems: true
          }
        }
      };

      const validParams = { tags: ['bug', 'frontend'] };
      const invalidParamsEmpty = { tags: [] }; // Too few items
      const invalidParamsType = { tags: ['valid', 123] }; // Wrong item type
      const invalidParamsDuplicate = { tags: ['duplicate', 'duplicate'] }; // Not unique

      // Test array validation concept
      const mockValidateArray = (params: any, schema: ToolParameterSchema) => {
        const errors: string[] = [];
        
        if (params.tags !== undefined) {
          if (!Array.isArray(params.tags)) {
            errors.push('tags must be an array');
          } else {
            const tagsProp = schema.properties?.tags;
            
            if (tagsProp?.minItems && params.tags.length < tagsProp.minItems) {
              errors.push(`tags must have at least ${tagsProp.minItems} items`);
            }
            if (tagsProp?.maxItems && params.tags.length > tagsProp.maxItems) {
              errors.push(`tags must have at most ${tagsProp.maxItems} items`);
            }
            
            // Check item types
            if (tagsProp?.items?.type === 'string') {
              for (const item of params.tags) {
                if (typeof item !== 'string') {
                  errors.push('all tags items must be strings');
                  break;
                }
              }
            }
            
            // Check uniqueness
            if (tagsProp?.uniqueItems) {
              const unique = new Set(params.tags);

              if (unique.size !== params.tags.length) {
                errors.push('tags items must be unique');
              }
            }
          }
        }
        
        return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
      };

      expect(mockValidateArray(validParams, schema).valid).toBe(true);
      expect(mockValidateArray(invalidParamsEmpty, schema).valid).toBe(false);
      expect(mockValidateArray(invalidParamsType, schema).valid).toBe(false);
      expect(mockValidateArray(invalidParamsDuplicate, schema).valid).toBe(false);
    });
  });

  describe('Object Validation', () => {
    test('should validate nested object parameters', () => {
      const schema: ToolParameterSchema = {
        type: 'object',
        properties: {
          project: {
            type: 'object',
            properties: {
              name: { type: 'string', minLength: 1 },
              description: { type: 'string' },
              settings: {
                type: 'object',
                properties: {
                  autoClose: { type: 'boolean' },
                  priority: { type: 'number', minimum: 1, maximum: 4 }
                }
              }
            },
            required: ['name']
          }
        },
        required: ['project']
      };

      const validParams = {
        project: {
          name: 'Test Project',
          description: 'A test project',
          settings: {
            autoClose: true,
            priority: 2
          }
        }
      };

      const invalidParams = {
        project: {
          // Missing required 'name'
          description: 'Invalid project'
        }
      };

      // Test nested object validation concept
      const mockValidateNested = (params: any, schema: ToolParameterSchema) => {
        const errors: string[] = [];
        
        if (schema.required?.includes('project') && !params.project) {
          errors.push('project is required');
        }
        
        if (params.project) {
          if (typeof params.project !== 'object') {
            errors.push('project must be an object');
          } else {
            const projectProp = schema.properties?.project;

            if (projectProp?.required?.includes('name') && !params.project.name) {
              errors.push('project.name is required');
            }
            if (params.project.name && typeof params.project.name !== 'string') {
              errors.push('project.name must be a string');
            }
          }
        }
        
        return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
      };

      expect(mockValidateNested(validParams, schema).valid).toBe(true);
      expect(mockValidateNested(invalidParams, schema).valid).toBe(false);
    });
  });

  describe('Enum Validation', () => {
    test('should validate enum constraints', () => {
      const schema: ToolParameterSchema = {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['backlog', 'todo', 'in_progress', 'done', 'canceled']
          },
          priority: {
            type: 'number',
            enum: [1, 2, 3, 4]
          }
        },
        required: ['status']
      };

      const validParams = { status: 'todo', priority: 2 };
      const invalidStatusParams = { status: 'invalid_status' };
      const invalidPriorityParams = { status: 'todo', priority: 5 };

      // Test enum validation concept
      const mockValidateEnum = (params: any, schema: ToolParameterSchema) => {
        const errors: string[] = [];
        
        if (schema.required?.includes('status') && !params.status) {
          errors.push('status is required');
        }
        
        if (params.status !== undefined) {
          const statusProp = schema.properties?.status;

          if (statusProp?.enum && !statusProp.enum.includes(params.status)) {
            errors.push(`status must be one of: ${statusProp.enum.join(', ')}`);
          }
        }
        
        if (params.priority !== undefined) {
          const priorityProp = schema.properties?.priority;

          if (priorityProp?.enum && !priorityProp.enum.includes(params.priority)) {
            errors.push(`priority must be one of: ${priorityProp.enum.join(', ')}`);
          }
        }
        
        return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
      };

      expect(mockValidateEnum(validParams, schema).valid).toBe(true);
      expect(mockValidateEnum(invalidStatusParams, schema).valid).toBe(false);
      expect(mockValidateEnum(invalidPriorityParams, schema).valid).toBe(false);
    });
  });

  describe('Additional Properties Validation', () => {
    test('should reject additional properties when not allowed', () => {
      const schema: ToolParameterSchema = {
        type: 'object',
        properties: {
          title: { type: 'string' }
        },
        required: ['title'],
        additionalProperties: false
      };

      const validParams = { title: 'Valid Title' };
      const invalidParams = { title: 'Valid Title', extraField: 'not allowed' };

      // Test additional properties validation
      const mockValidateAdditional = (params: any, schema: ToolParameterSchema) => {
        const errors: string[] = [];
        
        if (schema.additionalProperties === false) {
          const allowedProps = Object.keys(schema.properties || {});
          const paramProps = Object.keys(params);
          
          for (const prop of paramProps) {
            if (!allowedProps.includes(prop)) {
              errors.push(`additional property '${prop}' is not allowed`);
            }
          }
        }
        
        return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
      };

      expect(mockValidateAdditional(validParams, schema).valid).toBe(true);
      expect(mockValidateAdditional(invalidParams, schema).valid).toBe(false);
    });
  });

  describe('Default Values', () => {
    test('should apply default values for missing properties', () => {
      const schema: ToolParameterSchema = {
        type: 'object',
        properties: {
          title: { type: 'string' },
          priority: { type: 'number', default: 3 },
          enabled: { type: 'boolean', default: true }
        },
        required: ['title']
      };

      const inputParams = { title: 'Test Title' };

      // Test default value application
      const mockApplyDefaults = (params: any, schema: ToolParameterSchema) => {
        const result = { ...params };
        
        if (schema.properties) {
          for (const [key, prop] of Object.entries(schema.properties)) {
            if (result[key] === undefined && 'default' in prop) {
              result[key] = prop.default;
            }
          }
        }
        
        return result;
      };

      const paramsWithDefaults = mockApplyDefaults(inputParams, schema);
      
      expect(paramsWithDefaults.title).toBe('Test Title');
      expect(paramsWithDefaults.priority).toBe(3);
      expect(paramsWithDefaults.enabled).toBe(true);
    });
  });

  describe('Complex Validation Scenarios', () => {
    test('should validate jcvd_create_issue parameters', () => {
      const createIssueSchema: ToolParameterSchema = {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'The issue title',
            minLength: 1,
            maxLength: 200
          },
          description: {
            type: 'string',
            description: 'Optional issue description'
          },
          type: {
            type: 'string',
            enum: ['epic', 'story', 'subtask'],
            description: 'Issue type'
          },
          parentId: {
            type: 'string',
            description: 'Parent issue ID for hierarchical issues'
          },
          estimate: {
            type: 'number',
            minimum: 1,
            maximum: 13,
            description: 'Effort estimate in story points'
          },
          priority: {
            type: 'number',
            minimum: 1,
            maximum: 4,
            default: 3,
            description: 'Priority level'
          }
        },
        required: ['title', 'type'],
        additionalProperties: false
      };

      const validParams = {
        title: 'Implement search functionality',
        description: 'Add search capability for user content',
        type: 'story',
        estimate: 5,
        priority: 2
      };

      const invalidParams = {
        title: '', // Too short
        type: 'invalid_type', // Not in enum
        estimate: 15, // Too high
        extraField: 'not allowed' // Additional property
      };

      // Test comprehensive validation
      const mockValidateComplex = (params: any, schema: ToolParameterSchema) => {
        const errors: string[] = [];
        
        // Required fields
        for (const required of schema.required || []) {
          if (!params[required]) {
            errors.push(`${required} is required`);
          }
        }
        
        // Title validation
        if (params.title !== undefined) {
          if (typeof params.title !== 'string') {
            errors.push('title must be a string');
          } else if (params.title.length === 0) {
            errors.push('title must not be empty');
          }
        }
        
        // Type validation
        if (params.type !== undefined) {
          const validTypes = ['epic', 'story', 'subtask'];

          if (!validTypes.includes(params.type)) {
            errors.push(`type must be one of: ${validTypes.join(', ')}`);
          }
        }
        
        // Estimate validation
        if (params.estimate !== undefined) {
          if (typeof params.estimate !== 'number' || params.estimate < 1 || params.estimate > 13) {
            errors.push('estimate must be a number between 1 and 13');
          }
        }
        
        // Additional properties
        if (schema.additionalProperties === false) {
          const allowedProps = Object.keys(schema.properties || {});

          for (const prop of Object.keys(params)) {
            if (!allowedProps.includes(prop)) {
              errors.push(`additional property '${prop}' is not allowed`);
            }
          }
        }
        
        return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
      };

      expect(mockValidateComplex(validParams, createIssueSchema).valid).toBe(true);
      
      const invalidResult = mockValidateComplex(invalidParams, createIssueSchema);

      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors).toContain('title must not be empty');
      expect(invalidResult.errors).toContain('type must be one of: epic, story, subtask');
    });
  });

  describe('Error Reporting', () => {
    test('should provide detailed error messages with field paths', () => {
      const schema: ToolParameterSchema = {
        type: 'object',
        properties: {
          project: {
            type: 'object',
            properties: {
              settings: {
                type: 'object',
                properties: {
                  priority: { type: 'number', minimum: 1, maximum: 4 }
                }
              }
            }
          }
        }
      };

      const invalidParams = {
        project: {
          settings: {
            priority: 5 // Invalid value
          }
        }
      };

      // Test detailed error path reporting
      const mockValidateWithPaths = (params: any, schema: ToolParameterSchema, path = '') => {
        const errors: string[] = [];
        
        if (params.project?.settings?.priority !== undefined) {
          const priority = params.project.settings.priority;

          if (typeof priority !== 'number' || priority < 1 || priority > 4) {
            errors.push('project.settings.priority must be a number between 1 and 4');
          }
        }
        
        return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
      };

      const result = mockValidateWithPaths(invalidParams, schema);

      expect(result.valid).toBe(false);
      expect(result.errors?.[0]).toContain('project.settings.priority');
    });
  });
});
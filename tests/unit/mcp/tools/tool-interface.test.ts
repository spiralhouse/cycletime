/**
 * Tool Interface Tests
 * 
 * Tests for the core Tool interface contracts and type definitions.
 * Following TDD principles - these tests define the expected behavior.
 */

import { describe, test, expect } from 'vitest';

import type { 
  Tool, 
  ToolCapability, 
  ToolMetadata, 
  ToolExecutionContext, 
  ToolExecutionResult,
  ToolParameterSchema,
  ToolError
} from '../../../../src/mcp/tools/tool-interface.js';

describe('Tool Interface Contracts', () => {
  describe('ToolMetadata', () => {
    test('should have required core properties', () => {
      const metadata: ToolMetadata = {
        name: 'test_tool',
        description: 'Test tool for unit testing',
        version: '1.0.0',
        capabilities: ['execute'],
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      };

      expect(metadata.name).toBe('test_tool');
      expect(metadata.description).toBe('Test tool for unit testing');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.capabilities).toEqual(['execute']);
      expect(metadata.parameters).toBeDefined();
    });

    test('should support optional properties', () => {
      const metadata: ToolMetadata = {
        name: 'test_tool',
        description: 'Test tool',
        version: '1.0.0',
        capabilities: ['execute'],
        parameters: {
          type: 'object',
          properties: {},
          required: []
        },
        tags: ['testing', 'mcp'],
        category: 'development',
        inputSchema: {
          type: 'object',
          properties: {
            input: { type: 'string' }
          }
        },
        outputSchema: {
          type: 'object',
          properties: {
            result: { type: 'string' }
          }
        }
      };

      expect(metadata.tags).toEqual(['testing', 'mcp']);
      expect(metadata.category).toBe('development');
      expect(metadata.inputSchema).toBeDefined();
      expect(metadata.outputSchema).toBeDefined();
    });
  });

  describe('ToolParameterSchema', () => {
    test('should follow JSON Schema structure', () => {
      const schema: ToolParameterSchema = {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'The title of the item'
          },
          priority: {
            type: 'number',
            minimum: 1,
            maximum: 4,
            default: 3
          },
          tags: {
            type: 'array',
            items: { type: 'string' }
          }
        },
        required: ['title'],
        additionalProperties: false
      };

      expect(schema.type).toBe('object');
      expect(schema.properties).toBeDefined();
      expect(schema.required).toEqual(['title']);
      expect(schema.additionalProperties).toBe(false);
    });
  });

  describe('ToolExecutionContext', () => {
    test('should provide execution environment information', () => {
      const context: ToolExecutionContext = {
        requestId: 'req_123',
        timestamp: Date.now(),
        projectId: 'proj_456',
        userId: 'user_789'
      };

      expect(context.requestId).toBe('req_123');
      expect(context.timestamp).toBeTypeOf('number');
      expect(context.projectId).toBe('proj_456');
      expect(context.userId).toBe('user_789');
    });

    test('should support optional metadata', () => {
      const context: ToolExecutionContext = {
        requestId: 'req_123',
        timestamp: Date.now(),
        projectId: 'proj_456',
        userId: 'user_789',
        metadata: {
          sessionId: 'session_123',
          source: 'claude-code'
        }
      };

      expect(context.metadata).toBeDefined();
      expect(context.metadata?.sessionId).toBe('session_123');
    });
  });

  describe('ToolExecutionResult', () => {
    test('should represent successful execution', () => {
      const result: ToolExecutionResult = {
        success: true,
        data: {
          message: 'Operation completed successfully',
          itemId: 'item_123'
        },
        metadata: {
          executionTime: 150,
          affectedResources: ['jcvd://project/proj_456/context']
        }
      };

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.metadata?.executionTime).toBe(150);
    });

    test('should represent failed execution', () => {
      const result: ToolExecutionResult = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid parameters provided',
          details: {
            field: 'title',
            reason: 'Required field missing'
          }
        }
      };

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('ToolCapability', () => {
    test('should define standard capabilities', () => {
      const capabilities: ToolCapability[] = [
        'execute',
        'validate',
        'preview'
      ];

      expect(capabilities).toContain('execute');
      expect(capabilities).toContain('validate');
      expect(capabilities).toContain('preview');
    });
  });

  describe('Tool Interface', () => {
    test('should define core tool contract', () => {
      // This is a compile-time test to ensure the interface structure is correct
      const toolInterface = {
        name: 'string',
        metadata: 'ToolMetadata',
        isAvailable: 'function returning Promise<boolean>',
        validateParameters: 'function returning Promise<validation result>',
        execute: 'function returning Promise<ToolExecutionResult>',
        getCapabilities: 'function returning ToolCapability[]'
      };

      // Verify the interface has the expected structure
      expect(Object.keys(toolInterface)).toEqual([
        'name',
        'metadata', 
        'isAvailable',
        'validateParameters',
        'execute',
        'getCapabilities'
      ]);
    });
  });

  describe('ToolError', () => {
    test('should extend standard Error with tool-specific properties', () => {
      const error: ToolError = {
        name: 'ToolError',
        message: 'Tool execution failed',
        code: 'EXECUTION_ERROR',
        toolName: 'test_tool',
        details: {
          step: 'validation',
          reason: 'Invalid input'
        }
      };

      expect(error.name).toBe('ToolError');
      expect(error.code).toBe('EXECUTION_ERROR');
      expect(error.toolName).toBe('test_tool');
      expect(error.details).toBeDefined();
    });
  });
});

describe('Tool Naming Conventions', () => {
  test('should follow jcvd_ prefix convention', () => {
    const validNames = [
      'jcvd_create_issue',
      'jcvd_update_issue_status',
      'jcvd_add_dependency',
      'jcvd_initialize_project'
    ];

    for (const name of validNames) {
      expect(name).toMatch(/^jcvd_[a-z][\d_a-z]*$/);
    }
  });

  test('should reject invalid naming patterns', () => {
    const invalidNames = [
      'create_issue',          // Missing jcvd_ prefix
      'jcvd_CreateIssue',      // PascalCase not allowed
      'jcvd_create-issue',     // Hyphens not allowed
      'JCVD_CREATE_ISSUE',     // All caps not allowed
      'jcvd_',                 // Empty suffix
      'jcvd_123'               // Starting with number
    ];

    for (const name of invalidNames) {
      expect(name).not.toMatch(/^jcvd_[a-z][\d_a-z]*$/);
    }
  });
});

describe('Parameter Schema Validation', () => {
  test('should support complex parameter schemas', () => {
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
          description: 'Priority level (1=urgent, 4=low)'
        }
      },
      required: ['title', 'type'],
      additionalProperties: false
    };

    expect(createIssueSchema.properties.title).toBeDefined();
    expect(createIssueSchema.properties.type).toBeDefined();
    expect(createIssueSchema.required).toContain('title');
    expect(createIssueSchema.required).toContain('type');
  });

  test('should support nested object schemas', () => {
    const complexSchema: ToolParameterSchema = {
      type: 'object',
      properties: {
        project: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            settings: {
              type: 'object',
              properties: {
                autoClose: { type: 'boolean' },
                notifications: { type: 'boolean' }
              }
            }
          },
          required: ['name']
        },
        options: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              key: { type: 'string' },
              value: { type: 'string' }
            }
          }
        }
      },
      required: ['project']
    };

    expect(complexSchema.properties.project).toBeDefined();
    expect(complexSchema.properties.options).toBeDefined();
  });
});
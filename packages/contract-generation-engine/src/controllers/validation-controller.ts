import { FastifyRequest, FastifyReply } from 'fastify';
import { ValidationService } from '../services/validation-service';
import { ValidationOptionsSchema } from '../types/validation-types';
import { logger } from '@cycletime/shared-utils';

export class ValidationController {
  private validationService: ValidationService;

  constructor(validationService: ValidationService) {
    this.validationService = validationService;
  }

  async validateContract(
    request: FastifyRequest<{
      Body: {
        contract: any;
        options?: any;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { contract, options } = request.body;
      
      if (!contract) {
        reply.code(400).send({
          error: 'Bad Request',
          message: 'Contract is required',
          timestamp: new Date().toISOString(),
          path: request.url,
        });
        return;
      }

      // Validate options if provided
      let validationOptions = {};
      if (options) {
        const optionsResult = ValidationOptionsSchema.safeParse(options);
        if (!optionsResult.success) {
          reply.code(400).send({
            error: 'Invalid options',
            message: 'Validation options are invalid',
            details: optionsResult.error.issues,
            timestamp: new Date().toISOString(),
            path: request.url,
          });
          return;
        }
        validationOptions = optionsResult.data;
      }

      const result = await this.validationService.validateContract(contract, validationOptions);
      
      reply.code(200).send(result);
    } catch (error) {
      logger.error('Contract validation failed', { error });
      
      reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  async validateAsyncAPI(
    request: FastifyRequest<{
      Body: {
        asyncapi: any;
        options?: any;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { asyncapi, options } = request.body;
      
      if (!asyncapi) {
        reply.code(400).send({
          error: 'Bad Request',
          message: 'AsyncAPI specification is required',
          timestamp: new Date().toISOString(),
          path: request.url,
        });
        return;
      }

      // Validate options if provided
      let validationOptions = {};
      if (options) {
        const optionsResult = ValidationOptionsSchema.safeParse(options);
        if (!optionsResult.success) {
          reply.code(400).send({
            error: 'Invalid options',
            message: 'Validation options are invalid',
            details: optionsResult.error.issues,
            timestamp: new Date().toISOString(),
            path: request.url,
          });
          return;
        }
        validationOptions = optionsResult.data;
      }

      const result = await this.validationService.validateAsyncAPI(asyncapi, validationOptions);
      
      reply.code(200).send(result);
    } catch (error) {
      logger.error('AsyncAPI validation failed', { error });
      
      reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  async validateMultipleContracts(
    request: FastifyRequest<{
      Body: {
        contracts: any[];
        options?: any;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { contracts, options } = request.body;
      
      if (!contracts || !Array.isArray(contracts) || contracts.length === 0) {
        reply.code(400).send({
          error: 'Bad Request',
          message: 'Contracts array is required and must not be empty',
          timestamp: new Date().toISOString(),
          path: request.url,
        });
        return;
      }

      // Validate options if provided
      let validationOptions = {};
      if (options) {
        const optionsResult = ValidationOptionsSchema.safeParse(options);
        if (!optionsResult.success) {
          reply.code(400).send({
            error: 'Invalid options',
            message: 'Validation options are invalid',
            details: optionsResult.error.issues,
            timestamp: new Date().toISOString(),
            path: request.url,
          });
          return;
        }
        validationOptions = optionsResult.data;
      }

      const results = await this.validationService.validateMultipleContracts(contracts, validationOptions);
      
      reply.code(200).send({
        results,
        summary: {
          total: results.length,
          valid: results.filter(r => r.valid).length,
          invalid: results.filter(r => !r.valid).length,
          averageScore: results.reduce((sum, r) => sum + r.score, 0) / results.length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Multiple contract validation failed', { error });
      
      reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  async generateValidationReport(
    request: FastifyRequest<{
      Body: {
        validationResults: any[];
        options?: {
          includeDetails?: boolean;
          groupByCategory?: boolean;
          format?: 'json' | 'html' | 'markdown';
        };
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { validationResults, options } = request.body;
      
      if (!validationResults || !Array.isArray(validationResults)) {
        reply.code(400).send({
          error: 'Bad Request',
          message: 'Validation results array is required',
          timestamp: new Date().toISOString(),
          path: request.url,
        });
        return;
      }

      const reportOptions = {
        includeDetails: options?.includeDetails || false,
        groupByCategory: options?.groupByCategory || false,
        format: options?.format || 'json',
      };

      const report = await this.validationService.generateValidationReport(validationResults, reportOptions);
      
      // Set appropriate content type
      if (reportOptions.format === 'html') {
        reply.type('text/html');
      } else if (reportOptions.format === 'markdown') {
        reply.type('text/markdown');
      } else {
        reply.type('application/json');
      }
      
      reply.code(200).send(report);
    } catch (error) {
      logger.error('Validation report generation failed', { error });
      
      reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  async getValidationRules(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const rules = await this.validationService.getValidationRules();
      
      reply.code(200).send({
        rules,
        total: rules.length,
        enabled: rules.filter(r => r.enabled).length,
        categories: [...new Set(rules.map(r => r.category))],
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to get validation rules', { error });
      
      reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  async addValidationRule(
    request: FastifyRequest<{
      Body: {
        rule: any;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { rule } = request.body;
      
      if (!rule) {
        reply.code(400).send({
          error: 'Bad Request',
          message: 'Validation rule is required',
          timestamp: new Date().toISOString(),
          path: request.url,
        });
        return;
      }

      // Basic validation of rule structure
      if (!rule.id || !rule.name || !rule.validate) {
        reply.code(400).send({
          error: 'Bad Request',
          message: 'Rule must have id, name, and validate properties',
          timestamp: new Date().toISOString(),
          path: request.url,
        });
        return;
      }

      await this.validationService.addValidationRule(rule);
      
      reply.code(201).send({
        message: 'Validation rule added successfully',
        ruleId: rule.id,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to add validation rule', { error });
      
      reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  async updateValidationRule(
    request: FastifyRequest<{
      Params: { ruleId: string };
      Body: {
        action: 'enable' | 'disable';
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { ruleId } = request.params;
      const { action } = request.body;
      
      if (!ruleId) {
        reply.code(400).send({
          error: 'Bad Request',
          message: 'Rule ID is required',
          timestamp: new Date().toISOString(),
          path: request.url,
        });
        return;
      }

      if (!action || !['enable', 'disable'].includes(action)) {
        reply.code(400).send({
          error: 'Bad Request',
          message: 'Action must be either "enable" or "disable"',
          timestamp: new Date().toISOString(),
          path: request.url,
        });
        return;
      }

      if (action === 'enable') {
        await this.validationService.enableValidationRule(ruleId);
      } else {
        await this.validationService.disableValidationRule(ruleId);
      }
      
      reply.code(200).send({
        message: `Validation rule ${action}d successfully`,
        ruleId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to update validation rule', { error });
      
      reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  async deleteValidationRule(
    request: FastifyRequest<{
      Params: { ruleId: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { ruleId } = request.params;
      
      if (!ruleId) {
        reply.code(400).send({
          error: 'Bad Request',
          message: 'Rule ID is required',
          timestamp: new Date().toISOString(),
          path: request.url,
        });
        return;
      }

      await this.validationService.removeValidationRule(ruleId);
      
      reply.code(204).send();
    } catch (error) {
      logger.error('Failed to delete validation rule', { error });
      
      reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  // Register all routes
  async registerRoutes(fastify: any): Promise<void> {
    // Validate contract
    fastify.post('/api/v1/validation/contract', {
      schema: {
        description: 'Validate OpenAPI contract',
        tags: ['Validation'],
        body: {
          type: 'object',
          properties: {
            contract: { type: 'object' },
            options: { type: 'object' },
          },
          required: ['contract'],
        },
      },
    }, this.validateContract.bind(this));

    // Validate AsyncAPI
    fastify.post('/api/v1/validation/asyncapi', {
      schema: {
        description: 'Validate AsyncAPI specification',
        tags: ['Validation'],
        body: {
          type: 'object',
          properties: {
            asyncapi: { type: 'object' },
            options: { type: 'object' },
          },
          required: ['asyncapi'],
        },
      },
    }, this.validateAsyncAPI.bind(this));

    // Validate multiple contracts
    fastify.post('/api/v1/validation/contracts', {
      schema: {
        description: 'Validate multiple contracts',
        tags: ['Validation'],
        body: {
          type: 'object',
          properties: {
            contracts: { type: 'array', items: { type: 'object' } },
            options: { type: 'object' },
          },
          required: ['contracts'],
        },
      },
    }, this.validateMultipleContracts.bind(this));

    // Generate validation report
    fastify.post('/api/v1/validation/report', {
      schema: {
        description: 'Generate validation report',
        tags: ['Validation'],
        body: {
          type: 'object',
          properties: {
            validationResults: { type: 'array' },
            options: { type: 'object' },
          },
          required: ['validationResults'],
        },
      },
    }, this.generateValidationReport.bind(this));

    // Get validation rules
    fastify.get('/api/v1/validation/rules', {
      schema: {
        description: 'Get validation rules',
        tags: ['Validation'],
      },
    }, this.getValidationRules.bind(this));

    // Add validation rule
    fastify.post('/api/v1/validation/rules', {
      schema: {
        description: 'Add validation rule',
        tags: ['Validation'],
        body: {
          type: 'object',
          properties: {
            rule: { type: 'object' },
          },
          required: ['rule'],
        },
      },
    }, this.addValidationRule.bind(this));

    // Update validation rule
    fastify.put('/api/v1/validation/rules/:ruleId', {
      schema: {
        description: 'Update validation rule',
        tags: ['Validation'],
        params: {
          type: 'object',
          properties: {
            ruleId: { type: 'string' },
          },
          required: ['ruleId'],
        },
        body: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['enable', 'disable'] },
          },
          required: ['action'],
        },
      },
    }, this.updateValidationRule.bind(this));

    // Delete validation rule
    fastify.delete('/api/v1/validation/rules/:ruleId', {
      schema: {
        description: 'Delete validation rule',
        tags: ['Validation'],
        params: {
          type: 'object',
          properties: {
            ruleId: { type: 'string' },
          },
          required: ['ruleId'],
        },
      },
    }, this.deleteValidationRule.bind(this));
  }
}
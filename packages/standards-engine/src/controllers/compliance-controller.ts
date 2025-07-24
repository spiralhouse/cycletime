import { FastifyRequest, FastifyReply } from 'fastify';
import { APIResponse, HttpStatus } from '@cycletime/shared-types';
import { ComplianceReportingService } from '../services/compliance-reporting-service.js';

/**
 * Compliance Controller
 * Handles compliance reporting and metrics endpoints
 */
export class ComplianceController {
  private reportingService: ComplianceReportingService;

  constructor() {
    this.reportingService = new ComplianceReportingService();
  }

  /**
   * GET /api/v1/compliance/report/:commitId
   * Get compliance report for a specific commit
   */
  async getComplianceReport(
    request: FastifyRequest<{ 
      Params: { commitId: string };
      Querystring: { include_suggestions?: boolean }
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { commitId } = request.params;
      const { include_suggestions = true } = request.query;

      // Validate commit ID format (basic validation)
      if (!commitId || commitId.length < 6) {
        const response: APIResponse = {
          success: false,
          error: {
            code: 'INVALID_COMMIT_ID',
            message: 'Invalid commit ID format'
          },
          metadata: {
            requestId: request.id,
            timestamp: new Date().toISOString(),
            version: '1.0.0'
          }
        };
        reply.status(HttpStatus.BAD_REQUEST).send(response);
        return;
      }

      // Get compliance report
      const report = await this.reportingService.getComplianceReport(commitId, include_suggestions);

      const response: APIResponse = {
        success: true,
        data: report,
        metadata: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      };

      reply.status(HttpStatus.OK).send(response);
    } catch (error) {
      request.log.error(error, 'Error getting compliance report');

      if (error instanceof Error && error.message.includes('not found')) {
        const response: APIResponse = {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Compliance report not found for commit: ${request.params.commitId}`
          },
          metadata: {
            requestId: request.id,
            timestamp: new Date().toISOString(),
            version: '1.0.0'
          }
        };
        reply.status(HttpStatus.NOT_FOUND).send(response);
        return;
      }
      
      const response: APIResponse = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while retrieving compliance report'
        },
        metadata: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      };
      
      reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send(response);
    }
  }

  /**
   * GET /api/v1/compliance/metrics/:projectId
   * Get compliance metrics for a project
   */
  async getComplianceMetrics(
    request: FastifyRequest<{ 
      Params: { projectId: string };
      Querystring: { 
        timeframe?: 'day' | 'week' | 'month' | 'quarter' | 'year';
        granularity?: 'hourly' | 'daily' | 'weekly';
      }
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { projectId } = request.params;
      const { timeframe = 'month', granularity = 'daily' } = request.query;

      // Validate project ID format (basic UUID validation)
      if (!this.isValidUUID(projectId)) {
        const response: APIResponse = {
          success: false,
          error: {
            code: 'INVALID_PROJECT_ID',
            message: 'Invalid project ID format'
          },
          metadata: {
            requestId: request.id,
            timestamp: new Date().toISOString(),
            version: '1.0.0'
          }
        };
        reply.status(HttpStatus.BAD_REQUEST).send(response);
        return;
      }

      // Validate timeframe
      const validTimeframes = ['day', 'week', 'month', 'quarter', 'year'];
      if (!validTimeframes.includes(timeframe)) {
        const response: APIResponse = {
          success: false,
          error: {
            code: 'INVALID_TIMEFRAME',
            message: `Invalid timeframe. Must be one of: ${validTimeframes.join(', ')}`
          },
          metadata: {
            requestId: request.id,
            timestamp: new Date().toISOString(),
            version: '1.0.0'
          }
        };
        reply.status(HttpStatus.BAD_REQUEST).send(response);
        return;
      }

      // Validate granularity
      const validGranularities = ['hourly', 'daily', 'weekly'];
      if (!validGranularities.includes(granularity)) {
        const response: APIResponse = {
          success: false,
          error: {
            code: 'INVALID_GRANULARITY',
            message: `Invalid granularity. Must be one of: ${validGranularities.join(', ')}`
          },
          metadata: {
            requestId: request.id,
            timestamp: new Date().toISOString(),
            version: '1.0.0'
          }
        };
        reply.status(HttpStatus.BAD_REQUEST).send(response);
        return;
      }

      // Get compliance metrics
      const metrics = await this.reportingService.getComplianceMetrics(projectId, timeframe, granularity);

      const response: APIResponse = {
        success: true,
        data: metrics,
        metadata: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      };

      reply.status(HttpStatus.OK).send(response);
    } catch (error) {
      request.log.error(error, 'Error getting compliance metrics');

      if (error instanceof Error && error.message.includes('not found')) {
        const response: APIResponse = {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Project not found: ${request.params.projectId}`
          },
          metadata: {
            requestId: request.id,
            timestamp: new Date().toISOString(),
            version: '1.0.0'
          }
        };
        reply.status(HttpStatus.NOT_FOUND).send(response);
        return;
      }
      
      const response: APIResponse = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while retrieving compliance metrics'
        },
        metadata: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      };
      
      reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send(response);
    }
  }

  /**
   * GET /api/v1/compliance/trends/:projectId
   * Get compliance trends for a project
   */
  async getComplianceTrends(
    request: FastifyRequest<{ 
      Params: { projectId: string };
      Querystring: { timeframe?: string }
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { projectId } = request.params;
      const { timeframe = 'month' } = request.query;

      // Validate project ID
      if (!this.isValidUUID(projectId)) {
        const response: APIResponse = {
          success: false,
          error: {
            code: 'INVALID_PROJECT_ID',
            message: 'Invalid project ID format'
          },
          metadata: {
            requestId: request.id,
            timestamp: new Date().toISOString(),
            version: '1.0.0'
          }
        };
        reply.status(HttpStatus.BAD_REQUEST).send(response);
        return;
      }

      // Generate trends
      const trends = await this.reportingService.generateTrends(projectId, timeframe);

      const response: APIResponse = {
        success: true,
        data: trends,
        metadata: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      };

      reply.status(HttpStatus.OK).send(response);
    } catch (error) {
      request.log.error(error, 'Error getting compliance trends');
      
      const response: APIResponse = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while retrieving compliance trends'
        },
        metadata: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      };
      
      reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send(response);
    }
  }

  /**
   * GET /api/v1/compliance/alerts/:projectId
   * Get compliance alerts for a project
   */
  async getComplianceAlerts(
    request: FastifyRequest<{ Params: { projectId: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { projectId } = request.params;

      // Validate project ID
      if (!this.isValidUUID(projectId)) {
        const response: APIResponse = {
          success: false,
          error: {
            code: 'INVALID_PROJECT_ID',
            message: 'Invalid project ID format'
          },
          metadata: {
            requestId: request.id,
            timestamp: new Date().toISOString(),
            version: '1.0.0'
          }
        };
        reply.status(HttpStatus.BAD_REQUEST).send(response);
        return;
      }

      // Get compliance alerts
      const alerts = await this.reportingService.getComplianceAlerts(projectId);

      const response: APIResponse = {
        success: true,
        data: {
          alerts,
          count: alerts.length
        },
        metadata: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      };

      reply.status(HttpStatus.OK).send(response);
    } catch (error) {
      request.log.error(error, 'Error getting compliance alerts');
      
      const response: APIResponse = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while retrieving compliance alerts'
        },
        metadata: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      };
      
      reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send(response);
    }
  }

  /**
   * GET /api/v1/compliance/summary
   * Get multi-project compliance summary
   */
  async getMultiProjectSummary(
    request: FastifyRequest<{ 
      Querystring: { 
        projectIds: string;
        timeframe?: string;
      }
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { projectIds, timeframe = 'month' } = request.query;

      // Validate project IDs
      if (!projectIds) {
        const response: APIResponse = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'projectIds parameter is required'
          },
          metadata: {
            requestId: request.id,
            timestamp: new Date().toISOString(),
            version: '1.0.0'
          }
        };
        reply.status(HttpStatus.BAD_REQUEST).send(response);
        return;
      }

      // Parse and validate project IDs
      const projectIdArray = projectIds.split(',').map(id => id.trim());
      
      for (const projectId of projectIdArray) {
        if (!this.isValidUUID(projectId)) {
          const response: APIResponse = {
            success: false,
            error: {
              code: 'INVALID_PROJECT_ID',
              message: `Invalid project ID format: ${projectId}`
            },
            metadata: {
              requestId: request.id,
              timestamp: new Date().toISOString(),
              version: '1.0.0'
            }
          };
          reply.status(HttpStatus.BAD_REQUEST).send(response);
          return;
        }
      }

      // Get multi-project summary
      const summary = await this.reportingService.getMultiProjectSummary(projectIdArray, timeframe);

      const response: APIResponse = {
        success: true,
        data: summary,
        metadata: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      };

      reply.status(HttpStatus.OK).send(response);
    } catch (error) {
      request.log.error(error, 'Error getting multi-project summary');
      
      const response: APIResponse = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while retrieving multi-project summary'
        },
        metadata: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      };
      
      reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send(response);
    }
  }

  /**
   * GET /api/v1/compliance/export/:projectId
   * Export compliance data in various formats
   */
  async exportComplianceData(
    request: FastifyRequest<{ 
      Params: { projectId: string };
      Querystring: { 
        format: 'csv' | 'json' | 'xlsx';
        timeframe?: string;
      }
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { projectId } = request.params;
      const { format, timeframe = 'month' } = request.query;

      // Validate project ID
      if (!this.isValidUUID(projectId)) {
        const response: APIResponse = {
          success: false,
          error: {
            code: 'INVALID_PROJECT_ID',
            message: 'Invalid project ID format'
          },
          metadata: {
            requestId: request.id,
            timestamp: new Date().toISOString(),
            version: '1.0.0'
          }
        };
        reply.status(HttpStatus.BAD_REQUEST).send(response);
        return;
      }

      // Validate format
      const validFormats = ['csv', 'json', 'xlsx'];
      if (!format || !validFormats.includes(format)) {
        const response: APIResponse = {
          success: false,
          error: {
            code: 'INVALID_FORMAT',
            message: `Invalid format. Must be one of: ${validFormats.join(', ')}`
          },
          metadata: {
            requestId: request.id,
            timestamp: new Date().toISOString(),
            version: '1.0.0'
          }
        };
        reply.status(HttpStatus.BAD_REQUEST).send(response);
        return;
      }

      // Export compliance data
      const exportResult = await this.reportingService.exportComplianceData(projectId, format, timeframe);

      // Set appropriate headers for file download
      reply.header('Content-Type', exportResult.contentType);
      reply.header('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
      
      reply.status(HttpStatus.OK).send(exportResult.data);
    } catch (error) {
      request.log.error(error, 'Error exporting compliance data');
      
      const response: APIResponse = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while exporting compliance data'
        },
        metadata: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      };
      
      reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send(response);
    }
  }

  /**
   * GET /api/v1/compliance/historical/:projectId
   * Get historical compliance comparison
   */
  async getHistoricalComparison(
    request: FastifyRequest<{ 
      Params: { projectId: string };
      Querystring: { 
        currentPeriod?: string;
        comparisonPeriod?: string;
      }
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { projectId } = request.params;
      const { currentPeriod = 'month', comparisonPeriod = 'previous_month' } = request.query;

      // Validate project ID
      if (!this.isValidUUID(projectId)) {
        const response: APIResponse = {
          success: false,
          error: {
            code: 'INVALID_PROJECT_ID',
            message: 'Invalid project ID format'
          },
          metadata: {
            requestId: request.id,
            timestamp: new Date().toISOString(),
            version: '1.0.0'
          }
        };
        reply.status(HttpStatus.BAD_REQUEST).send(response);
        return;
      }

      // Get historical comparison
      const comparison = await this.reportingService.getHistoricalComparison(
        projectId,
        currentPeriod,
        comparisonPeriod
      );

      const response: APIResponse = {
        success: true,
        data: comparison,
        metadata: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      };

      reply.status(HttpStatus.OK).send(response);
    } catch (error) {
      request.log.error(error, 'Error getting historical comparison');
      
      const response: APIResponse = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while retrieving historical comparison'
        },
        metadata: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      };
      
      reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send(response);
    }
  }

  /**
   * Validate UUID format
   */
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}
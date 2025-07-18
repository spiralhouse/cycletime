/**
 * Mock Data Service
 * Provides realistic mock responses for all CycleTime services
 * Used when services are unavailable or in development/testing
 */

import { logger } from '../utils/logger';

export interface MockResponse {
  statusCode: number;
  body: any;
  headers?: Record<string, string>;
  delay?: number;
}

export interface MockScenario {
  scenario: 'success' | 'error' | 'timeout' | 'partial';
  probability: number;
  response: MockResponse;
}

export class MockDataService {
  private defaultDelay: number = 150; // Default response delay in ms
  private errorRate: number = 0.05; // 5% error rate by default

  constructor(options?: { defaultDelay?: number; errorRate?: number }) {
    this.defaultDelay = options?.defaultDelay || 150;
    this.errorRate = options?.errorRate || 0.05;
  }

  /**
   * Get mock response for any service endpoint
   */
  async getMockResponse(
    serviceName: string,
    method: string,
    path: string,
    scenario?: 'success' | 'error' | 'timeout' | 'partial'
  ): Promise<MockResponse> {
    const selectedScenario = scenario || (Math.random() < this.errorRate ? 'error' : 'success');
    
    // Add realistic delay
    const delay = this.getRandomDelay();
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    const response = this.getServiceMockResponse(serviceName, method, path, selectedScenario);
    
    logger.debug(`Mock response for ${serviceName}:`, {
      service: serviceName,
      method,
      path,
      scenario: selectedScenario,
      statusCode: response.statusCode,
      delay
    });

    return response;
  }

  /**
   * Get service-specific mock response
   */
  private getServiceMockResponse(
    serviceName: string,
    method: string,
    path: string,
    scenario: 'success' | 'error' | 'timeout' | 'partial'
  ): MockResponse {
    switch (serviceName) {
      case 'ai-service':
        return this.getAiServiceMock(method, path, scenario);
      case 'project-service':
        return this.getProjectServiceMock(method, path, scenario);
      case 'task-service':
        return this.getTaskServiceMock(method, path, scenario);
      case 'document-service':
        return this.getDocumentServiceMock(method, path, scenario);
      case 'context-management-service':
        return this.getContextManagementServiceMock(method, path, scenario);
      case 'standards-engine':
        return this.getStandardsEngineMock(method, path, scenario);
      case 'notification-service':
        return this.getNotificationServiceMock(method, path, scenario);
      case 'document-indexing-service':
        return this.getDocumentIndexingServiceMock(method, path, scenario);
      case 'contract-generation-engine':
        return this.getContractGenerationEngineMock(method, path, scenario);
      case 'mcp-server':
        return this.getMcpServerMock(method, path, scenario);
      case 'cli-service':
        return this.getCliServiceMock(method, path, scenario);
      case 'issue-tracker-service':
        return this.getIssueTrackerServiceMock(method, path, scenario);
      case 'web-dashboard':
        return this.getWebDashboardMock(method, path, scenario);
      default:
        return this.getGenericMock(method, path, scenario);
    }
  }

  /**
   * AI Service Mock Responses
   */
  private getAiServiceMock(method: string, path: string, scenario: string): MockResponse {
    if (scenario === 'error') {
      return {
        statusCode: 503,
        body: {
          error: 'ServiceUnavailable',
          message: 'AI service is temporarily unavailable',
          code: 'AI_SERVICE_DOWN',
          timestamp: new Date().toISOString()
        }
      };
    }

    if (path.includes('/models')) {
      return {
        statusCode: 200,
        body: {
          models: [
            { id: 'gpt-4', name: 'GPT-4', provider: 'openai', status: 'available' },
            { id: 'claude-3', name: 'Claude 3', provider: 'anthropic', status: 'available' },
            { id: 'gemini-pro', name: 'Gemini Pro', provider: 'google', status: 'available' }
          ],
          timestamp: new Date().toISOString()
        }
      };
    }

    if (path.includes('/analyze') && method === 'POST') {
      return {
        statusCode: 200,
        body: {
          analysis: {
            sentiment: 'positive',
            confidence: 0.85,
            complexity: 'medium',
            recommendations: ['Consider breaking down into smaller tasks', 'Add more test coverage']
          },
          processingTime: 1250,
          timestamp: new Date().toISOString()
        }
      };
    }

    return this.getGenericMock(method, path, scenario);
  }

  /**
   * Project Service Mock Responses
   */
  private getProjectServiceMock(method: string, path: string, scenario: string): MockResponse {
    if (scenario === 'error') {
      return {
        statusCode: 503,
        body: {
          error: 'ServiceUnavailable',
          message: 'Project service is temporarily unavailable',
          code: 'PROJECT_SERVICE_DOWN',
          timestamp: new Date().toISOString()
        }
      };
    }

    if (path.includes('/projects') && method === 'GET') {
      return {
        statusCode: 200,
        body: {
          projects: [
            {
              id: 'proj_123',
              name: 'CycleTime Platform',
              description: 'Intelligent project orchestration platform',
              status: 'active',
              team: 'Engineering',
              createdAt: '2024-01-15T10:30:00Z',
              updatedAt: '2024-01-18T14:20:00Z'
            },
            {
              id: 'proj_456',
              name: 'Mobile App',
              description: 'Mobile companion app for CycleTime',
              status: 'planning',
              team: 'Mobile',
              createdAt: '2024-01-16T09:15:00Z',
              updatedAt: '2024-01-18T11:45:00Z'
            }
          ],
          total: 2,
          timestamp: new Date().toISOString()
        }
      };
    }

    if (path.includes('/projects') && method === 'POST') {
      return {
        statusCode: 201,
        body: {
          project: {
            id: 'proj_789',
            name: 'New Project',
            description: 'Newly created project',
            status: 'active',
            team: 'Engineering',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          timestamp: new Date().toISOString()
        }
      };
    }

    return this.getGenericMock(method, path, scenario);
  }

  /**
   * Task Service Mock Responses
   */
  private getTaskServiceMock(method: string, path: string, scenario: string): MockResponse {
    if (scenario === 'error') {
      return {
        statusCode: 503,
        body: {
          error: 'ServiceUnavailable',
          message: 'Task service is temporarily unavailable',
          code: 'TASK_SERVICE_DOWN',
          timestamp: new Date().toISOString()
        }
      };
    }

    if (path.includes('/tasks') && method === 'GET') {
      return {
        statusCode: 200,
        body: {
          tasks: [
            {
              id: 'task_123',
              title: 'Implement OAuth authentication',
              description: 'Add OAuth2 authentication for GitHub integration',
              status: 'in_progress',
              priority: 'high',
              assignee: 'user_456',
              estimatedHours: 8,
              createdAt: '2024-01-17T10:00:00Z',
              updatedAt: '2024-01-18T15:30:00Z'
            },
            {
              id: 'task_456',
              title: 'Design API documentation',
              description: 'Create comprehensive API documentation',
              status: 'todo',
              priority: 'medium',
              assignee: 'user_789',
              estimatedHours: 12,
              createdAt: '2024-01-18T09:00:00Z',
              updatedAt: '2024-01-18T09:00:00Z'
            }
          ],
          total: 2,
          timestamp: new Date().toISOString()
        }
      };
    }

    if (path.includes('/tasks/breakdown') && method === 'POST') {
      return {
        statusCode: 200,
        body: {
          breakdown: {
            subtasks: [
              { title: 'Set up OAuth provider', estimate: 2, priority: 'high' },
              { title: 'Implement auth middleware', estimate: 3, priority: 'high' },
              { title: 'Add user profile handling', estimate: 2, priority: 'medium' },
              { title: 'Write integration tests', estimate: 1, priority: 'low' }
            ],
            totalEstimate: 8,
            complexity: 'medium',
            confidence: 0.8
          },
          timestamp: new Date().toISOString()
        }
      };
    }

    return this.getGenericMock(method, path, scenario);
  }

  /**
   * Document Service Mock Responses
   */
  private getDocumentServiceMock(method: string, path: string, scenario: string): MockResponse {
    if (scenario === 'error') {
      return {
        statusCode: 503,
        body: {
          error: 'ServiceUnavailable',
          message: 'Document service is temporarily unavailable',
          code: 'DOCUMENT_SERVICE_DOWN',
          timestamp: new Date().toISOString()
        }
      };
    }

    if (path.includes('/documents') && method === 'GET') {
      return {
        statusCode: 200,
        body: {
          documents: [
            {
              id: 'doc_123',
              title: 'API Documentation',
              type: 'markdown',
              path: '/docs/api.md',
              size: 15420,
              lastModified: '2024-01-18T14:20:00Z',
              version: '1.2.0'
            },
            {
              id: 'doc_456',
              title: 'Architecture Overview',
              type: 'markdown',
              path: '/docs/architecture.md',
              size: 8930,
              lastModified: '2024-01-17T16:45:00Z',
              version: '1.1.0'
            }
          ],
          total: 2,
          timestamp: new Date().toISOString()
        }
      };
    }

    if (path.includes('/documents/process') && method === 'POST') {
      return {
        statusCode: 200,
        body: {
          processed: {
            wordCount: 1250,
            readingTime: '5 minutes',
            headings: ['Introduction', 'Getting Started', 'API Reference'],
            links: ['https://example.com/api', 'https://docs.example.com']
          },
          timestamp: new Date().toISOString()
        }
      };
    }

    return this.getGenericMock(method, path, scenario);
  }

  /**
   * Context Management Service Mock Responses
   */
  private getContextManagementServiceMock(method: string, path: string, scenario: string): MockResponse {
    if (scenario === 'error') {
      return {
        statusCode: 503,
        body: {
          error: 'ServiceUnavailable',
          message: 'Context management service is temporarily unavailable',
          code: 'CONTEXT_SERVICE_DOWN',
          timestamp: new Date().toISOString()
        }
      };
    }

    if (path.includes('/context/analyze') && method === 'POST') {
      return {
        statusCode: 200,
        body: {
          analysis: {
            contextSize: 12450,
            chunks: 8,
            priority: 'high',
            relevanceScore: 0.92,
            optimizedSize: 8200
          },
          recommendations: [
            'Remove duplicate content',
            'Prioritize recent changes',
            'Include related dependencies'
          ],
          timestamp: new Date().toISOString()
        }
      };
    }

    if (path.includes('/context/optimize') && method === 'POST') {
      return {
        statusCode: 200,
        body: {
          optimized: {
            originalSize: 15000,
            optimizedSize: 9500,
            compressionRatio: 0.63,
            processedChunks: 12
          },
          timestamp: new Date().toISOString()
        }
      };
    }

    return this.getGenericMock(method, path, scenario);
  }

  /**
   * Standards Engine Mock Responses
   */
  private getStandardsEngineMock(method: string, path: string, scenario: string): MockResponse {
    if (scenario === 'error') {
      return {
        statusCode: 503,
        body: {
          error: 'ServiceUnavailable',
          message: 'Standards engine is temporarily unavailable',
          code: 'STANDARDS_ENGINE_DOWN',
          timestamp: new Date().toISOString()
        }
      };
    }

    if (path.includes('/standards/analyze') && method === 'POST') {
      return {
        statusCode: 200,
        body: {
          analysis: {
            complianceScore: 0.88,
            violations: [
              { rule: 'naming-convention', severity: 'warning', count: 3 },
              { rule: 'test-coverage', severity: 'error', count: 1 }
            ],
            suggestions: [
              'Add unit tests for uncovered functions',
              'Follow camelCase naming convention',
              'Add JSDoc comments for public methods'
            ]
          },
          timestamp: new Date().toISOString()
        }
      };
    }

    if (path.includes('/standards/validate') && method === 'POST') {
      return {
        statusCode: 200,
        body: {
          validation: {
            isValid: true,
            score: 0.92,
            checkedRules: 15,
            passedRules: 14,
            failedRules: 1
          },
          timestamp: new Date().toISOString()
        }
      };
    }

    return this.getGenericMock(method, path, scenario);
  }

  /**
   * Notification Service Mock Responses
   */
  private getNotificationServiceMock(method: string, path: string, scenario: string): MockResponse {
    if (scenario === 'error') {
      return {
        statusCode: 503,
        body: {
          error: 'ServiceUnavailable',
          message: 'Notification service is temporarily unavailable',
          code: 'NOTIFICATION_SERVICE_DOWN',
          timestamp: new Date().toISOString()
        }
      };
    }

    if (path.includes('/notifications/send') && method === 'POST') {
      return {
        statusCode: 200,
        body: {
          notification: {
            id: 'notif_123',
            status: 'sent',
            channels: ['email', 'slack'],
            recipients: 2,
            deliveryTime: 1200
          },
          timestamp: new Date().toISOString()
        }
      };
    }

    if (path.includes('/notifications') && method === 'GET') {
      return {
        statusCode: 200,
        body: {
          notifications: [
            {
              id: 'notif_123',
              type: 'task_assigned',
              message: 'New task assigned to you',
              status: 'delivered',
              createdAt: '2024-01-18T10:30:00Z'
            },
            {
              id: 'notif_456',
              type: 'project_updated',
              message: 'Project status updated',
              status: 'pending',
              createdAt: '2024-01-18T11:45:00Z'
            }
          ],
          total: 2,
          timestamp: new Date().toISOString()
        }
      };
    }

    return this.getGenericMock(method, path, scenario);
  }

  /**
   * Document Indexing Service Mock Responses
   */
  private getDocumentIndexingServiceMock(method: string, path: string, scenario: string): MockResponse {
    if (scenario === 'error') {
      return {
        statusCode: 503,
        body: {
          error: 'ServiceUnavailable',
          message: 'Document indexing service is temporarily unavailable',
          code: 'INDEXING_SERVICE_DOWN',
          timestamp: new Date().toISOString()
        }
      };
    }

    if (path.includes('/search') && method === 'POST') {
      return {
        statusCode: 200,
        body: {
          results: [
            {
              id: 'doc_123',
              title: 'API Documentation',
              snippet: 'Complete API reference for CycleTime platform...',
              score: 0.95,
              path: '/docs/api.md'
            },
            {
              id: 'doc_456',
              title: 'Architecture Guide',
              snippet: 'System architecture and design patterns...',
              score: 0.87,
              path: '/docs/architecture.md'
            }
          ],
          total: 2,
          searchTime: 45,
          timestamp: new Date().toISOString()
        }
      };
    }

    if (path.includes('/index') && method === 'POST') {
      return {
        statusCode: 200,
        body: {
          indexed: {
            documentCount: 15,
            processingTime: 2500,
            indexSize: '12.5MB',
            lastUpdate: new Date().toISOString()
          },
          timestamp: new Date().toISOString()
        }
      };
    }

    return this.getGenericMock(method, path, scenario);
  }

  /**
   * Contract Generation Engine Mock Responses
   */
  private getContractGenerationEngineMock(method: string, path: string, scenario: string): MockResponse {
    if (scenario === 'error') {
      return {
        statusCode: 503,
        body: {
          error: 'ServiceUnavailable',
          message: 'Contract generation engine is temporarily unavailable',
          code: 'CONTRACT_ENGINE_DOWN',
          timestamp: new Date().toISOString()
        }
      };
    }

    if (path.includes('/contracts/generate') && method === 'POST') {
      return {
        statusCode: 200,
        body: {
          contract: {
            id: 'contract_123',
            type: 'openapi',
            version: '3.0.0',
            endpoints: 12,
            schemas: 8,
            size: '45KB'
          },
          metadata: {
            generatedAt: new Date().toISOString(),
            processingTime: 3200,
            compliance: 'full'
          },
          timestamp: new Date().toISOString()
        }
      };
    }

    if (path.includes('/contracts/validate') && method === 'POST') {
      return {
        statusCode: 200,
        body: {
          validation: {
            isValid: true,
            errors: [],
            warnings: [
              'Consider adding rate limiting specs',
              'Add example responses for 4xx errors'
            ],
            score: 0.91
          },
          timestamp: new Date().toISOString()
        }
      };
    }

    return this.getGenericMock(method, path, scenario);
  }

  /**
   * MCP Server Mock Responses
   */
  private getMcpServerMock(method: string, path: string, scenario: string): MockResponse {
    if (scenario === 'error') {
      return {
        statusCode: 503,
        body: {
          error: 'ServiceUnavailable',
          message: 'MCP server is temporarily unavailable',
          code: 'MCP_SERVER_DOWN',
          timestamp: new Date().toISOString()
        }
      };
    }

    if (path.includes('/mcp/context') && method === 'GET') {
      return {
        statusCode: 200,
        body: {
          context: {
            projectId: 'proj_123',
            documentation: [
              { type: 'readme', path: '/README.md', size: 2450 },
              { type: 'api', path: '/docs/api.md', size: 8920 }
            ],
            codebase: {
              files: 127,
              lines: 45000,
              languages: ['typescript', 'javascript', 'markdown']
            }
          },
          timestamp: new Date().toISOString()
        }
      };
    }

    if (path.includes('/mcp/tools') && method === 'GET') {
      return {
        statusCode: 200,
        body: {
          tools: [
            { name: 'get-documentation', description: 'Retrieve project documentation' },
            { name: 'search-context', description: 'Search project context' },
            { name: 'analyze-code', description: 'Analyze code patterns' }
          ],
          total: 3,
          timestamp: new Date().toISOString()
        }
      };
    }

    return this.getGenericMock(method, path, scenario);
  }

  /**
   * CLI Service Mock Responses
   */
  private getCliServiceMock(method: string, path: string, scenario: string): MockResponse {
    if (scenario === 'error') {
      return {
        statusCode: 503,
        body: {
          error: 'ServiceUnavailable',
          message: 'CLI service is temporarily unavailable',
          code: 'CLI_SERVICE_DOWN',
          timestamp: new Date().toISOString()
        }
      };
    }

    if (path.includes('/cli/commands') && method === 'GET') {
      return {
        statusCode: 200,
        body: {
          commands: [
            { name: 'init', description: 'Initialize new project', category: 'project' },
            { name: 'deploy', description: 'Deploy application', category: 'deployment' },
            { name: 'test', description: 'Run tests', category: 'testing' }
          ],
          total: 3,
          timestamp: new Date().toISOString()
        }
      };
    }

    if (path.includes('/cli/execute') && method === 'POST') {
      return {
        statusCode: 200,
        body: {
          execution: {
            command: 'test',
            status: 'success',
            output: 'All tests passed (15 tests)',
            duration: 2500,
            exitCode: 0
          },
          timestamp: new Date().toISOString()
        }
      };
    }

    return this.getGenericMock(method, path, scenario);
  }

  /**
   * Issue Tracker Service Mock Responses
   */
  private getIssueTrackerServiceMock(method: string, path: string, scenario: string): MockResponse {
    if (scenario === 'error') {
      return {
        statusCode: 503,
        body: {
          error: 'ServiceUnavailable',
          message: 'Issue tracker service is temporarily unavailable',
          code: 'ISSUE_TRACKER_DOWN',
          timestamp: new Date().toISOString()
        }
      };
    }

    if (path.includes('/issues') && method === 'GET') {
      return {
        statusCode: 200,
        body: {
          issues: [
            {
              id: 'SPI-123',
              title: 'Implement user authentication',
              status: 'in_progress',
              priority: 'high',
              assignee: 'john.doe@example.com',
              labels: ['feature', 'auth'],
              createdAt: '2024-01-15T10:00:00Z'
            },
            {
              id: 'SPI-124',
              title: 'Fix API documentation',
              status: 'todo',
              priority: 'medium',
              assignee: 'jane.smith@example.com',
              labels: ['documentation', 'bug'],
              createdAt: '2024-01-16T14:30:00Z'
            }
          ],
          total: 2,
          timestamp: new Date().toISOString()
        }
      };
    }

    return this.getGenericMock(method, path, scenario);
  }

  /**
   * Web Dashboard Mock Responses
   */
  private getWebDashboardMock(method: string, path: string, scenario: string): MockResponse {
    if (scenario === 'error') {
      return {
        statusCode: 503,
        body: {
          error: 'ServiceUnavailable',
          message: 'Web dashboard is temporarily unavailable',
          code: 'WEB_DASHBOARD_DOWN',
          timestamp: new Date().toISOString()
        }
      };
    }

    if (path.includes('/dashboard/metrics') && method === 'GET') {
      return {
        statusCode: 200,
        body: {
          metrics: {
            activeProjects: 8,
            completedTasks: 156,
            teamMembers: 12,
            uptime: '99.9%',
            lastUpdated: new Date().toISOString()
          },
          timestamp: new Date().toISOString()
        }
      };
    }

    return this.getGenericMock(method, path, scenario);
  }

  /**
   * Generic Mock Response (fallback)
   */
  private getGenericMock(method: string, path: string, scenario: string): MockResponse {
    if (scenario === 'error') {
      return {
        statusCode: 503,
        body: {
          error: 'ServiceUnavailable',
          message: 'Service is temporarily unavailable',
          code: 'SERVICE_DOWN',
          timestamp: new Date().toISOString()
        }
      };
    }

    if (scenario === 'timeout') {
      return {
        statusCode: 504,
        body: {
          error: 'GatewayTimeout',
          message: 'Service request timed out',
          code: 'TIMEOUT',
          timestamp: new Date().toISOString()
        }
      };
    }

    // Default success response
    return {
      statusCode: 200,
      body: {
        message: 'Mock response successful',
        method,
        path,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Get random delay within reasonable bounds
   */
  private getRandomDelay(): number {
    // Random delay between 50% and 150% of default delay
    const minDelay = this.defaultDelay * 0.5;
    const maxDelay = this.defaultDelay * 1.5;
    return Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
  }

  /**
   * Configure mock scenarios for testing
   */
  setScenario(scenario: 'success' | 'error' | 'timeout' | 'partial', probability: number = 1.0): void {
    this.errorRate = scenario === 'error' ? probability : 0;
    logger.info(`Mock scenario set to: ${scenario} with probability: ${probability}`);
  }

  /**
   * Get health check response
   */
  getHealthResponse(): MockResponse {
    return {
      statusCode: 200,
      body: {
        status: 'healthy',
        service: 'mock-data-service',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    };
  }
}

// Export singleton instance
export const mockDataService = new MockDataService();
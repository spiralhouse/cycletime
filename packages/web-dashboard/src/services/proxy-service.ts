import { EventEmitter } from 'events';
import { ProxyConfig } from '../types/service-types';

export class ProxyService extends EventEmitter {
  private config: ProxyConfig;
  private circuitBreakers: Map<string, { failures: number; lastFailure: Date; state: 'closed' | 'open' | 'half-open' }> = new Map();

  constructor() {
    super();
    this.config = {
      services: {
        'ai-service': {
          baseUrl: 'http://localhost:8003',
          timeout: 30000,
          retries: 3,
          headers: {
            'Content-Type': 'application/json',
          },
        },
        'document-service': {
          baseUrl: 'http://localhost:8001',
          timeout: 30000,
          retries: 3,
          headers: {
            'Content-Type': 'application/json',
          },
        },
        'project-service': {
          baseUrl: 'http://localhost:8002',
          timeout: 30000,
          retries: 3,
          headers: {
            'Content-Type': 'application/json',
          },
        },
        'task-service': {
          baseUrl: 'http://localhost:8004',
          timeout: 30000,
          retries: 3,
          headers: {
            'Content-Type': 'application/json',
          },
        },
        'issue-tracker-service': {
          baseUrl: 'http://localhost:8005',
          timeout: 30000,
          retries: 3,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      },
      defaultTimeout: 30000,
      defaultRetries: 3,
      circuitBreaker: {
        enabled: true,
        threshold: 5,
        timeout: 60000,
        resetTimeout: 300000,
      },
    };
  }

  public async initialize(): Promise<void> {
    console.log('Proxy service initialized');
  }

  public async shutdown(): Promise<void> {
    this.circuitBreakers.clear();
    this.removeAllListeners();
    console.log('Proxy service shutdown');
  }

  public async proxyRequest(serviceName: string, method: string, path: string, data?: any, headers?: Record<string, string>): Promise<any> {
    const serviceConfig = this.config.services[serviceName];
    
    if (!serviceConfig) {
      throw new Error(`Service ${serviceName} not configured`);
    }

    // Check circuit breaker
    if (this.isCircuitBreakerOpen(serviceName)) {
      throw new Error(`Circuit breaker open for service ${serviceName}`);
    }

    const url = `${serviceConfig.baseUrl}${path}`;
    const requestHeaders = { ...serviceConfig.headers, ...headers };
    
    try {
      const response = await this.makeRequest(url, method, data, requestHeaders, serviceConfig.timeout);
      
      // Reset circuit breaker on success
      this.resetCircuitBreaker(serviceName);
      
      return response;
    } catch (error) {
      // Record failure for circuit breaker
      this.recordFailure(serviceName);
      
      // Retry if configured
      if (serviceConfig.retries > 0) {
        return this.retryRequest(serviceName, method, path, data, headers, serviceConfig.retries);
      }
      
      throw error;
    }
  }

  private async makeRequest(url: string, method: string, data?: any, headers?: Record<string, string>, timeout?: number): Promise<any> {
    // Mock HTTP request implementation
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate random failures for circuit breaker testing
        if (Math.random() < 0.1) {
          reject(new Error('Simulated network error'));
          return;
        }

        // Mock response based on URL pattern
        const mockResponse = this.generateMockResponse(url, method, data);
        resolve(mockResponse);
      }, Math.random() * 100 + 50); // Random delay 50-150ms
    });
  }

  private generateMockResponse(url: string, method: string, data?: any): any {
    // Generate mock responses based on the service and endpoint
    if (url.includes('ai-service')) {
      return {
        success: true,
        data: {
          message: 'Mock AI service response',
          timestamp: new Date().toISOString(),
        },
      };
    }

    if (url.includes('document-service')) {
      return {
        success: true,
        data: {
          documents: [
            {
              id: 'doc-1',
              title: 'Sample Document',
              content: 'This is a sample document content',
              createdAt: new Date().toISOString(),
            },
          ],
          total: 1,
        },
      };
    }

    if (url.includes('project-service')) {
      return {
        success: true,
        data: {
          projects: [
            {
              id: 'proj-1',
              name: 'Sample Project',
              description: 'This is a sample project',
              status: 'active',
              createdAt: new Date().toISOString(),
            },
          ],
          total: 1,
        },
      };
    }

    if (url.includes('task-service')) {
      return {
        success: true,
        data: {
          tasks: [
            {
              id: 'task-1',
              title: 'Sample Task',
              description: 'This is a sample task',
              status: 'todo',
              priority: 'medium',
              createdAt: new Date().toISOString(),
            },
          ],
          total: 1,
        },
      };
    }

    if (url.includes('issue-tracker-service')) {
      return {
        success: true,
        data: {
          issues: [
            {
              id: 'issue-1',
              title: 'Sample Issue',
              description: 'This is a sample issue',
              status: 'open',
              priority: 'high',
              createdAt: new Date().toISOString(),
            },
          ],
          total: 1,
        },
      };
    }

    // Default mock response
    return {
      success: true,
      data: {
        message: 'Mock response',
        timestamp: new Date().toISOString(),
        url,
        method,
        data,
      },
    };
  }

  private async retryRequest(serviceName: string, method: string, path: string, data?: any, headers?: Record<string, string>, retries?: number): Promise<any> {
    const maxRetries = retries || this.config.defaultRetries;
    let lastError: Error;

    for (let i = 0; i < maxRetries; i++) {
      try {
        // Wait before retry (exponential backoff)
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }

        const serviceConfig = this.config.services[serviceName];
        const url = `${serviceConfig.baseUrl}${path}`;
        const requestHeaders = { ...serviceConfig.headers, ...headers };

        const response = await this.makeRequest(url, method, data, requestHeaders, serviceConfig.timeout);
        
        // Reset circuit breaker on success
        this.resetCircuitBreaker(serviceName);
        
        return response;
      } catch (error) {
        lastError = error as Error;
        this.recordFailure(serviceName);
        
        if (i === maxRetries - 1) {
          break;
        }
      }
    }

    throw lastError!;
  }

  private isCircuitBreakerOpen(serviceName: string): boolean {
    if (!this.config.circuitBreaker.enabled) {
      return false;
    }

    const breaker = this.circuitBreakers.get(serviceName);
    if (!breaker) {
      return false;
    }

    const now = new Date();
    const timeSinceLastFailure = now.getTime() - breaker.lastFailure.getTime();

    if (breaker.state === 'open') {
      if (timeSinceLastFailure > this.config.circuitBreaker.resetTimeout) {
        breaker.state = 'half-open';
        return false;
      }
      return true;
    }

    return false;
  }

  private recordFailure(serviceName: string): void {
    if (!this.config.circuitBreaker.enabled) {
      return;
    }

    const breaker = this.circuitBreakers.get(serviceName) || {
      failures: 0,
      lastFailure: new Date(),
      state: 'closed' as const,
    };

    breaker.failures++;
    breaker.lastFailure = new Date();

    if (breaker.failures >= this.config.circuitBreaker.threshold) {
      breaker.state = 'open';
      this.emit('circuit-breaker.opened', { serviceName, failures: breaker.failures });
    }

    this.circuitBreakers.set(serviceName, breaker);
  }

  private resetCircuitBreaker(serviceName: string): void {
    const breaker = this.circuitBreakers.get(serviceName);
    if (breaker) {
      breaker.failures = 0;
      breaker.state = 'closed';
      this.emit('circuit-breaker.closed', { serviceName });
    }
  }

  public getCircuitBreakerStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    
    for (const [serviceName, breaker] of this.circuitBreakers.entries()) {
      status[serviceName] = {
        state: breaker.state,
        failures: breaker.failures,
        lastFailure: breaker.lastFailure.toISOString(),
      };
    }

    return status;
  }

  public async healthCheck(): Promise<Record<string, any>> {
    const healthStatus: Record<string, any> = {};
    
    for (const [serviceName, serviceConfig] of Object.entries(this.config.services)) {
      try {
        const startTime = Date.now();
        await this.proxyRequest(serviceName, 'GET', '/health');
        const responseTime = Date.now() - startTime;
        
        healthStatus[serviceName] = {
          status: 'healthy',
          responseTime,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        healthStatus[serviceName] = {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        };
      }
    }

    return healthStatus;
  }

  public async proxyGet(serviceName: string, path: string, headers?: Record<string, string>): Promise<any> {
    return this.proxyRequest(serviceName, 'GET', path, undefined, headers);
  }

  public async proxyPost(serviceName: string, path: string, data: any, headers?: Record<string, string>): Promise<any> {
    return this.proxyRequest(serviceName, 'POST', path, data, headers);
  }

  public async proxyPut(serviceName: string, path: string, data: any, headers?: Record<string, string>): Promise<any> {
    return this.proxyRequest(serviceName, 'PUT', path, data, headers);
  }

  public async proxyDelete(serviceName: string, path: string, headers?: Record<string, string>): Promise<any> {
    return this.proxyRequest(serviceName, 'DELETE', path, undefined, headers);
  }

  public async proxyPatch(serviceName: string, path: string, data: any, headers?: Record<string, string>): Promise<any> {
    return this.proxyRequest(serviceName, 'PATCH', path, data, headers);
  }

  public getProxyStatistics(): any {
    return {
      configuredServices: Object.keys(this.config.services).length,
      circuitBreakerEnabled: this.config.circuitBreaker.enabled,
      circuitBreakerThreshold: this.config.circuitBreaker.threshold,
      circuitBreakerTimeout: this.config.circuitBreaker.timeout,
      circuitBreakerResetTimeout: this.config.circuitBreaker.resetTimeout,
      circuitBreakers: this.getCircuitBreakerStatus(),
    };
  }

  public updateServiceConfig(serviceName: string, config: Partial<typeof this.config.services[string]>): void {
    const currentConfig = this.config.services[serviceName];
    if (currentConfig) {
      this.config.services[serviceName] = { ...currentConfig, ...config };
    }
  }

  public addService(serviceName: string, config: typeof this.config.services[string]): void {
    this.config.services[serviceName] = config;
  }

  public removeService(serviceName: string): boolean {
    if (this.config.services[serviceName]) {
      delete this.config.services[serviceName];
      this.circuitBreakers.delete(serviceName);
      return true;
    }
    return false;
  }
}
/**
 * MCP Message Router - Request/response routing infrastructure
 */

import { ProtocolHandler } from './protocol-handler.js';

import type { JSONRPCRequest, JSONRPCNotification, JSONRPCResponse } from './protocol-handler.js';
import type { Logger } from '../../utils/logger.js';

/**
 * Handler function types
 */
export type RequestHandler = (params?: any) => Promise<any>;
export type NotificationHandler = (params?: any) => Promise<void>;

/**
 * Middleware function types
 */
export type RequestMiddleware = (
  request: JSONRPCRequest,
  next: (req: JSONRPCRequest) => Promise<JSONRPCResponse>
) => Promise<JSONRPCResponse>;
export type NotificationMiddleware = (
  notification: JSONRPCNotification,
  next: (notif: JSONRPCNotification) => Promise<void>
) => Promise<void>;

/**
 * Statistics interface
 */
export interface RouterStatistics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalNotifications: number;
  methodStats: Record<
    string,
    {
      count: number;
      successes: number;
      failures: number;
      averageResponseTime: number;
    }
  >;
}

/**
 * Message router for handling JSON-RPC requests and notifications
 */
export class MessageRouter {
  private requestHandlers = new Map<string, RequestHandler>();
  private notificationHandlers = new Map<string, NotificationHandler>();
  private requestMiddleware: RequestMiddleware[] = [];
  private notificationMiddleware: NotificationMiddleware[] = [];
  private requestTimeout = 30_000; // 30 seconds default
  private statistics: RouterStatistics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalNotifications: 0,
    methodStats: {},
  };

  constructor(private logger: Logger) {}

  /**
   * Register a request handler
   */
  registerHandler(method: string, handler: RequestHandler): void {
    if (this.requestHandlers.has(method)) {
      throw new Error(`Handler already registered for method: ${method}`);
    }

    this.requestHandlers.set(method, handler);
    this.logger.debug('Request handler registered', { method });
  }

  /**
   * Register a notification handler
   */
  registerNotificationHandler(method: string, handler: NotificationHandler): void {
    if (this.notificationHandlers.has(method)) {
      throw new Error(`Notification handler already registered for method: ${method}`);
    }

    this.notificationHandlers.set(method, handler);
    this.logger.debug('Notification handler registered', { method });
  }

  /**
   * Unregister a request handler
   */
  unregisterHandler(method: string): void {
    this.requestHandlers.delete(method);
    this.logger.debug('Request handler unregistered', { method });
  }

  /**
   * Unregister a notification handler
   */
  unregisterNotificationHandler(method: string): void {
    this.notificationHandlers.delete(method);
    this.logger.debug('Notification handler unregistered', { method });
  }

  /**
   * Check if request handler exists
   */
  hasHandler(method: string): boolean {
    return this.requestHandlers.has(method);
  }

  /**
   * Check if notification handler exists
   */
  hasNotificationHandler(method: string): boolean {
    return this.notificationHandlers.has(method);
  }

  /**
   * Get list of registered methods
   */
  getRegisteredMethods(): string[] {
    return Array.from(this.requestHandlers.keys());
  }

  /**
   * Get list of registered notification methods
   */
  getRegisteredNotificationMethods(): string[] {
    return Array.from(this.notificationHandlers.keys());
  }

  /**
   * Set request timeout
   */
  setRequestTimeout(timeout: number): void {
    this.requestTimeout = timeout;
  }

  /**
   * Add request middleware
   */
  addRequestMiddleware(middleware: RequestMiddleware): void {
    this.requestMiddleware.push(middleware);
  }

  /**
   * Add notification middleware
   */
  addNotificationMiddleware(middleware: NotificationMiddleware): void {
    this.notificationMiddleware.push(middleware);
  }

  /**
   * Route a JSON-RPC request
   */
  async routeRequest(request: JSONRPCRequest): Promise<JSONRPCResponse> {
    const startTime = Date.now();

    this.statistics.totalRequests++;
    this.updateMethodStats(request.method, 'request');

    try {
      // Apply middleware chain
      const response = await this.applyRequestMiddleware(request, async req => {
        const handler = this.requestHandlers.get(req.method);

        if (!handler) {
          const protocolHandler = new ProtocolHandler();

          return protocolHandler.formatErrorResponse(
            req.id,
            ProtocolHandler.createError(
              ProtocolHandler.ErrorCodes.METHOD_NOT_FOUND,
              'Method not found',
              { method: req.method }
            )
          );
        }

        // Apply timeout
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => {
            reject(new Error('Request timeout'));
          }, this.requestTimeout)
        );

        try {
          const result = await Promise.race([handler(req.params), timeoutPromise]);

          const protocolHandler = new ProtocolHandler();

          return protocolHandler.formatResponse(req.id, result);
        } catch (error) {
          throw error;
        }
      });

      // Update success statistics
      this.statistics.successfulRequests++;
      this.updateMethodStats(request.method, 'success', Date.now() - startTime);

      return response;
    } catch (error) {
      // Update failure statistics
      this.statistics.failedRequests++;
      this.updateMethodStats(request.method, 'failure');

      this.logger.error('Request handling failed', {
        method: request.method,
        id: request.id,
        error: error instanceof Error ? error.message : String(error),
      });

      const protocolHandler = new ProtocolHandler();

      return protocolHandler.formatErrorResponse(
        request.id,
        ProtocolHandler.createError(ProtocolHandler.ErrorCodes.INTERNAL_ERROR, 'Internal error', {
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }
  }

  /**
   * Route a JSON-RPC notification
   */
  async routeNotification(notification: JSONRPCNotification): Promise<void> {
    this.statistics.totalNotifications++;

    try {
      // Apply middleware chain
      await this.applyNotificationMiddleware(notification, async notif => {
        const handler = this.notificationHandlers.get(notif.method);

        if (!handler) {
          this.logger.debug('No handler registered for notification', {
            method: notif.method,
          });

          return;
        }

        await handler(notif.params);
      });
    } catch (error) {
      this.logger.error('Error in notification handler', {
        method: notification.method,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - notifications should not fail the entire message processing
    }
  }

  /**
   * Get routing statistics
   */
  getStatistics(): RouterStatistics {
    return {
      ...this.statistics,
      methodStats: { ...this.statistics.methodStats },
    };
  }

  /**
   * Reset statistics
   */
  resetStatistics(): void {
    this.statistics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalNotifications: 0,
      methodStats: {},
    };
  }

  /**
   * Apply request middleware chain
   */
  private async applyRequestMiddleware(
    request: JSONRPCRequest,
    finalHandler: (req: JSONRPCRequest) => Promise<JSONRPCResponse>
  ): Promise<JSONRPCResponse> {
    let index = 0;

    const next = async (req: JSONRPCRequest): Promise<JSONRPCResponse> => {
      if (index < this.requestMiddleware.length) {
        const middleware = this.requestMiddleware[index++];

        if (middleware) {
          return middleware(req, next);
        }
      }

      return finalHandler(req);
    };

    return next(request);
  }

  /**
   * Apply notification middleware chain
   */
  private async applyNotificationMiddleware(
    notification: JSONRPCNotification,
    finalHandler: (notif: JSONRPCNotification) => Promise<void>
  ): Promise<void> {
    let index = 0;

    const next = async (notif: JSONRPCNotification): Promise<void> => {
      if (index < this.notificationMiddleware.length) {
        const middleware = this.notificationMiddleware[index++];

        if (middleware) {
          return middleware(notif, next);
        }
      }

      return finalHandler(notif);
    };

    return next(notification);
  }

  /**
   * Update method statistics
   */
  private updateMethodStats(
    method: string,
    type: 'request' | 'success' | 'failure',
    responseTime?: number
  ): void {
    if (!this.statistics.methodStats[method]) {
      this.statistics.methodStats[method] = {
        count: 0,
        successes: 0,
        failures: 0,
        averageResponseTime: 0,
      };
    }

    const stats = this.statistics.methodStats[method];

    if (type === 'request') {
      stats.count++;
    } else if (type === 'success') {
      stats.successes++;
      if (responseTime !== undefined) {
        // Update average response time
        const totalResponseTime = stats.averageResponseTime * (stats.successes - 1) + responseTime;

        stats.averageResponseTime = totalResponseTime / stats.successes;
      }
    } else if (type === 'failure') {
      stats.failures++;
    }
  }
}

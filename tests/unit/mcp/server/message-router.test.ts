import { describe, it, expect, vi, beforeEach } from 'vitest';

import { MessageRouter } from '../../../../src/mcp/server/message-router.js';

import type { Logger } from '../../../../src/utils/logger.js';

// Mock logger
const mockLogger: Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  log: vi.fn(),
};

describe('MessageRouter', () => {
  let router: MessageRouter;

  beforeEach(() => {
    vi.clearAllMocks();
    router = new MessageRouter(mockLogger);
  });

  describe('Route registration', () => {
    it('should register request handlers', () => {
      const handler = vi.fn().mockResolvedValue({ result: 'success' });
      
      router.registerHandler('initialize', handler);
      
      expect(router.hasHandler('initialize')).toBe(true);
    });

    it('should register notification handlers', () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      
      router.registerNotificationHandler('notifications/initialized', handler);
      
      expect(router.hasNotificationHandler('notifications/initialized')).toBe(true);
    });

    it('should prevent duplicate handler registration', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      router.registerHandler('test', handler1);
      
      expect(() => {
        router.registerHandler('test', handler2);
      }).toThrow('Handler already registered for method: test');
    });

    it('should unregister handlers', () => {
      const handler = vi.fn();
      
      router.registerHandler('test', handler);
      expect(router.hasHandler('test')).toBe(true);
      
      router.unregisterHandler('test');
      expect(router.hasHandler('test')).toBe(false);
    });

    it('should get registered handler methods', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      router.registerHandler('method1', handler1);
      router.registerHandler('method2', handler2);
      
      const methods = router.getRegisteredMethods();

      expect(methods).toContain('method1');
      expect(methods).toContain('method2');
      expect(methods).toHaveLength(2);
    });
  });

  describe('Request routing', () => {
    it('should route requests to registered handlers', async () => {
      const handler = vi.fn().mockResolvedValue({ result: 'success' });
      const request = {
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'test',
        params: { input: 'test' },
      };
      
      router.registerHandler('test', handler);
      const response = await router.routeRequest(request);
      
      expect(handler).toHaveBeenCalledWith({ input: 'test' });
      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        result: { result: 'success' },
      });
    });

    it('should handle requests without params', async () => {
      const handler = vi.fn().mockResolvedValue({ result: 'success' });
      const request = {
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'test',
      };
      
      router.registerHandler('test', handler);
      const response = await router.routeRequest(request);
      
      expect(handler).toHaveBeenCalledWith(undefined);
      expect(response.result).toEqual({ result: 'success' });
    });

    it('should return method not found error for unregistered methods', async () => {
      const request = {
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'unknown',
        params: {},
      };
      
      const response = await router.routeRequest(request);
      
      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32_601,
          message: 'Method not found',
          data: { method: 'unknown' },
        },
      });
    });

    it('should handle handler errors and return error response', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('Handler failed'));
      const request = {
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'test',
        params: {},
      };
      
      router.registerHandler('test', handler);
      const response = await router.routeRequest(request);
      
      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32_603,
          message: 'Internal error',
          data: { error: 'Handler failed' },
        },
      });
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle handler timeout', async () => {
      const slowHandler = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );
      const request = {
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'test',
        params: {},
      };
      
      router.registerHandler('test', slowHandler);
      router.setRequestTimeout(100); // 100ms timeout
      
      const response = await router.routeRequest(request);
      
      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32_603,
          message: 'Internal error',
          data: { error: 'Request timeout' },
        },
      });
    });
  });

  describe('Notification routing', () => {
    it('should route notifications to registered handlers', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const notification = {
        jsonrpc: '2.0' as const,
        method: 'notifications/test',
        params: { data: 'test' },
      };
      
      router.registerNotificationHandler('notifications/test', handler);
      await router.routeNotification(notification);
      
      expect(handler).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should handle notifications without params', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const notification = {
        jsonrpc: '2.0' as const,
        method: 'notifications/test',
      };
      
      router.registerNotificationHandler('notifications/test', handler);
      await router.routeNotification(notification);
      
      expect(handler).toHaveBeenCalledWith(undefined);
    });

    it('should ignore unregistered notifications silently', async () => {
      const notification = {
        jsonrpc: '2.0' as const,
        method: 'notifications/unknown',
        params: {},
      };
      
      // Should not throw
      await router.routeNotification(notification);
      
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'No handler registered for notification',
        { method: 'notifications/unknown' }
      );
    });

    it('should handle notification handler errors gracefully', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('Handler failed'));
      const notification = {
        jsonrpc: '2.0' as const,
        method: 'notifications/test',
        params: {},
      };
      
      router.registerNotificationHandler('notifications/test', handler);
      
      // Should not throw
      await router.routeNotification(notification);
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error in notification handler',
        expect.objectContaining({
          method: 'notifications/test',
          error: 'Handler failed',
        })
      );
    });
  });

  describe('Middleware support', () => {
    it('should apply request middleware', async () => {
      const middleware = vi.fn().mockImplementation(async (req, next) => {
        req.params = { ...req.params, middleware: true };

        return next(req);
      });
      const handler = vi.fn().mockResolvedValue({ result: 'success' });
      const request = {
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'test',
        params: { input: 'test' },
      };
      
      router.addRequestMiddleware(middleware);
      router.registerHandler('test', handler);
      
      await router.routeRequest(request);
      
      expect(middleware).toHaveBeenCalled();
      expect(handler).toHaveBeenCalledWith({ input: 'test', middleware: true });
    });

    it('should apply notification middleware', async () => {
      const middleware = vi.fn().mockImplementation(async (notif, next) => {
        notif.params = { ...notif.params, middleware: true };

        return next(notif);
      });
      const handler = vi.fn().mockResolvedValue(undefined);
      const notification = {
        jsonrpc: '2.0' as const,
        method: 'notifications/test',
        params: { data: 'test' },
      };
      
      router.addNotificationMiddleware(middleware);
      router.registerNotificationHandler('notifications/test', handler);
      
      await router.routeNotification(notification);
      
      expect(middleware).toHaveBeenCalled();
      expect(handler).toHaveBeenCalledWith({ data: 'test', middleware: true });
    });

    it('should handle middleware errors', async () => {
      const middleware = vi.fn().mockRejectedValue(new Error('Middleware failed'));
      const handler = vi.fn().mockResolvedValue({ result: 'success' });
      const request = {
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'test',
        params: {},
      };
      
      router.addRequestMiddleware(middleware);
      router.registerHandler('test', handler);
      
      const response = await router.routeRequest(request);
      
      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32_603,
          message: 'Internal error',
          data: { error: 'Middleware failed' },
        },
      });
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Statistics and monitoring', () => {
    it('should track request statistics', async () => {
      const handler = vi.fn().mockResolvedValue({ result: 'success' });
      const request = {
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'test',
        params: {},
      };
      
      router.registerHandler('test', handler);
      await router.routeRequest(request);
      
      const stats = router.getStatistics();

      expect(stats.totalRequests).toBe(1);
      expect(stats.successfulRequests).toBe(1);
      expect(stats.failedRequests).toBe(0);
      expect(stats.methodStats.test).toEqual({
        count: 1,
        successes: 1,
        failures: 0,
        averageResponseTime: expect.any(Number),
      });
    });

    it('should track notification statistics', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const notification = {
        jsonrpc: '2.0' as const,
        method: 'notifications/test',
        params: {},
      };
      
      router.registerNotificationHandler('notifications/test', handler);
      await router.routeNotification(notification);
      
      const stats = router.getStatistics();

      expect(stats.totalNotifications).toBe(1);
    });

    it('should track error statistics', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('Test error'));
      const request = {
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'test',
        params: {},
      };
      
      router.registerHandler('test', handler);
      await router.routeRequest(request);
      
      const stats = router.getStatistics();

      expect(stats.totalRequests).toBe(1);
      expect(stats.successfulRequests).toBe(0);
      expect(stats.failedRequests).toBe(1);
    });

    it('should reset statistics', async () => {
      const handler = vi.fn().mockResolvedValue({ result: 'success' });
      const request = {
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'test',
        params: {},
      };
      
      router.registerHandler('test', handler);
      await router.routeRequest(request);
      
      let stats = router.getStatistics();

      expect(stats.totalRequests).toBe(1);
      
      router.resetStatistics();
      stats = router.getStatistics();
      expect(stats.totalRequests).toBe(0);
    });
  });
});
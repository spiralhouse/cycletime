/**
 * Tests for health check system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { HealthChecker } from '../../../../src/mcp/health/health-check.js';
import { ComponentStatus } from '../../../../src/mcp/health/component-status.js';

describe('HealthChecker', () => {
  let healthChecker: HealthChecker;

  beforeEach(async () => {
    // Create a completely fresh instance each time
    healthChecker = new HealthChecker({
      checkInterval: 100, // Fast interval for testing
      timeoutMs: 50,
    });
  });

  afterEach(async () => {
    if (healthChecker.isRunning()) {
      await healthChecker.stop();
    }
    // Clear all registered components to avoid test pollution
    const components = healthChecker.getRegisteredComponents();
    for (const component of components) {
      healthChecker.unregisterComponent(component);
    }
    vi.restoreAllMocks();
  });

  describe('start', () => {
    it('should start health monitoring', async () => {
      // Create isolated instance to avoid test pollution
      const isolatedChecker = new HealthChecker({
        checkInterval: 100,
        timeoutMs: 50,
      });
      
      const result = await isolatedChecker.start();

      expect(result.success).toBe(true);
      expect(isolatedChecker.isRunning()).toBe(true);
      
      await isolatedChecker.stop();
    });

    it('should not start if already running', async () => {
      const isolatedChecker = new HealthChecker({
        checkInterval: 100,
        timeoutMs: 50,
      });
      
      await isolatedChecker.start();
      
      const result = await isolatedChecker.start();

      expect(result.success).toBe(false);
      expect(result.error).toContain('already running');
      
      await isolatedChecker.stop();
    });
  });

  describe('stop', () => {
    it('should stop health monitoring', async () => {
      await healthChecker.start();
      
      const result = await healthChecker.stop();

      expect(result.success).toBe(true);
      expect(healthChecker.isRunning()).toBe(false);
    });

    it('should handle stop when not running', async () => {
      const result = await healthChecker.stop();

      expect(result.success).toBe(true);
    });
  });

  describe('registerComponent', () => {
    it('should register component for health checking', () => {
      const mockHealthCheck = vi.fn().mockResolvedValue({ healthy: true });

      healthChecker.registerComponent('test-component', mockHealthCheck);

      const components = healthChecker.getRegisteredComponents();
      expect(components).toContain('test-component');
    });

    it('should replace existing component health check', () => {
      const firstCheck = vi.fn().mockResolvedValue({ healthy: true });
      const secondCheck = vi.fn().mockResolvedValue({ healthy: false });

      healthChecker.registerComponent('test-component', firstCheck);
      healthChecker.registerComponent('test-component', secondCheck);

      const components = healthChecker.getRegisteredComponents();
      expect(components).toHaveLength(1);
    });
  });

  describe('checkHealth', () => {
    it('should return healthy status for all healthy components', async () => {
      // Create a completely isolated instance for this test
      const isolatedChecker = new HealthChecker({
        checkInterval: 100,
        timeoutMs: 50,
      });
      
      isolatedChecker.registerComponent('component1', async () => ({ healthy: true }));
      isolatedChecker.registerComponent('component2', async () => ({ healthy: true }));

      const health = await isolatedChecker.checkHealth();
      
      expect(health.status).toBe('healthy');
      expect(health.components).toHaveProperty('component1');
      expect(health.components).toHaveProperty('component2');
      expect(health.components.component1.healthy).toBe(true);
      expect(health.components.component2.healthy).toBe(true);
    });

    it('should return unhealthy status if any component is unhealthy', async () => {
      healthChecker.registerComponent('healthy-component', async () => ({ healthy: true }));
      healthChecker.registerComponent('unhealthy-component', async () => ({ 
        healthy: false, 
        error: 'Component is down' 
      }));

      const health = await healthChecker.checkHealth();

      expect(health.status).toBe('unhealthy');
      expect(health.components['unhealthy-component'].healthy).toBe(false);
      expect(health.components['unhealthy-component'].error).toBe('Component is down');
    });

    it('should handle component health check timeout', async () => {
      healthChecker.registerComponent('slow-component', async () => {
        await new Promise(resolve => setTimeout(resolve, 100)); // Longer than timeout
        return { healthy: true };
      });

      const health = await healthChecker.checkHealth();

      expect(health.status).toBe('unhealthy');
      expect(health.components['slow-component'].healthy).toBe(false);
      expect(health.components['slow-component'].error).toContain('timeout');
    });

    it('should handle component health check error', async () => {
      healthChecker.registerComponent('error-component', async () => {
        throw new Error('Health check failed');
      });

      const health = await healthChecker.checkHealth();

      expect(health.status).toBe('unhealthy');
      expect(health.components['error-component'].healthy).toBe(false);
      expect(health.components['error-component'].error).toContain('Health check failed');
    });
  });

  describe('getHealthStatus', () => {
    it('should return cached health status', async () => {
      healthChecker.registerComponent('test-component', async () => ({ healthy: true }));
      
      // Manually call checkHealth to populate the cache
      await healthChecker.checkHealth();

      const status = healthChecker.getHealthStatus();

      expect(status).toBeDefined();
      expect(status!.status).toBe('healthy');
    });

    it('should return undefined if no health check has been performed', () => {
      const status = healthChecker.getHealthStatus();

      expect(status).toBeUndefined();
    });
  });

  describe('unregisterComponent', () => {
    it('should remove component from health checking', () => {
      healthChecker.registerComponent('test-component', async () => ({ healthy: true }));
      
      const beforeUnregister = healthChecker.getRegisteredComponents();
      expect(beforeUnregister).toContain('test-component');

      healthChecker.unregisterComponent('test-component');

      const afterUnregister = healthChecker.getRegisteredComponents();
      expect(afterUnregister).not.toContain('test-component');
    });

    it('should handle unregistering non-existent component', () => {
      expect(() => {
        healthChecker.unregisterComponent('non-existent');
      }).not.toThrow();
    });
  });
});

describe('ComponentStatus', () => {
  let componentStatus: ComponentStatus;

  beforeEach(() => {
    componentStatus = new ComponentStatus();
  });

  afterEach(() => {
    componentStatus.clear();
  });

  describe('setStatus', () => {
    it('should set component status', () => {
      componentStatus.setStatus('test-component', 'running', { message: 'All good' });

      const status = componentStatus.getStatus('test-component');
      expect(status?.status).toBe('running');
      expect(status?.metadata?.message).toBe('All good');
    });

    it('should update existing component status', () => {
      componentStatus.setStatus('test-component', 'initializing');
      componentStatus.setStatus('test-component', 'running');

      const status = componentStatus.getStatus('test-component');
      expect(status?.status).toBe('running');
    });
  });

  describe('getStatus', () => {
    it('should return undefined for unknown component', () => {
      const status = componentStatus.getStatus('unknown-component');
      expect(status).toBeUndefined();
    });

    it('should return component status with timestamp', () => {
      const beforeTime = Date.now();
      componentStatus.setStatus('test-component', 'running');
      const afterTime = Date.now();

      const status = componentStatus.getStatus('test-component');
      expect(status?.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(status?.timestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('getAllStatuses', () => {
    it('should return all component statuses', () => {
      componentStatus.setStatus('component1', 'running');
      componentStatus.setStatus('component2', 'stopped');

      const allStatuses = componentStatus.getAllStatuses();

      expect(Object.keys(allStatuses)).toHaveLength(2);
      expect(allStatuses).toHaveProperty('component1');
      expect(allStatuses).toHaveProperty('component2');
    });

    it('should return empty object when no components', () => {
      const allStatuses = componentStatus.getAllStatuses();
      expect(allStatuses).toEqual({});
    });
  });

  describe('removeComponent', () => {
    it('should remove component status', () => {
      componentStatus.setStatus('test-component', 'running');
      
      expect(componentStatus.getStatus('test-component')).toBeDefined();
      
      componentStatus.removeComponent('test-component');
      
      expect(componentStatus.getStatus('test-component')).toBeUndefined();
    });
  });

  describe('getComponentsByStatus', () => {
    it('should return components filtered by status', () => {
      componentStatus.setStatus('running1', 'running');
      componentStatus.setStatus('running2', 'running');
      componentStatus.setStatus('stopped1', 'stopped');

      const runningComponents = componentStatus.getComponentsByStatus('running');

      expect(runningComponents).toHaveLength(2);
      expect(runningComponents).toContain('running1');
      expect(runningComponents).toContain('running2');
    });

    it('should return empty array when no components match status', () => {
      componentStatus.setStatus('component1', 'running');

      const stoppedComponents = componentStatus.getComponentsByStatus('stopped');

      expect(stoppedComponents).toHaveLength(0);
    });
  });
});
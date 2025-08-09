/**
 * Integration tests for MCP configuration and initialization system
 */

import { describe, it, expect } from 'vitest';

import { MCPConfigManager } from '../../src/mcp/config/mcp-config-manager.js';
import { ComponentStatus } from '../../src/mcp/health/component-status.js';
import { HealthChecker } from '../../src/mcp/health/health-check.js';

describe('MCP System Integration', () => {
  it('should integrate configuration management with health checking', async () => {
    // Load configuration
    const config = await MCPConfigManager.loadMCPConfig();

    expect(config).toBeDefined();
    expect(config.server.name).toBe('jcvd-mcp-server');
    expect(config.health.checkInterval).toBeDefined();

    // Create health checker with config values
    const healthChecker = new HealthChecker({
      checkInterval: config.health.checkInterval,
      timeoutMs: config.health.timeoutMs,
    });

    // Register a test component
    healthChecker.registerComponent('test-service', async () => ({
      healthy: true,
      metadata: { version: config.server.version },
    }));

    // Perform health check
    const health = await healthChecker.checkHealth();

    expect(health.status).toBe('healthy');
    expect(health.components['test-service'].healthy).toBe(true);
    expect(health.components['test-service'].metadata?.version).toBe(config.server.version);
  });

  it('should handle component status tracking', () => {
    const componentStatus = new ComponentStatus();

    // Set statuses for different components
    componentStatus.setStatus('config', 'running', { loaded: true });
    componentStatus.setStatus('server', 'initializing');
    componentStatus.setStatus('health', 'running');

    // Check overall status
    const summary = componentStatus.getHealthSummary();

    expect(summary.totalComponents).toBe(3);
    expect(summary.healthy).toBe(2); // config and health
    expect(summary.unknown).toBe(1); // server (initializing)

    // Check specific components
    const runningComponents = componentStatus.getComponentsByStatus('running');

    expect(runningComponents).toContain('config');
    expect(runningComponents).toContain('health');
    expect(runningComponents).not.toContain('server');
  });

  it('should validate environment variable configuration', async () => {
    // Test environment variable parsing
    process.env.JCVD_MCP_SERVER_NAME = 'test-env-server';
    process.env.JCVD_MCP_TRANSPORT = 'websocket';
    process.env.JCVD_MCP_PORT = '8080';

    const config = await MCPConfigManager.loadMCPConfig();

    expect(config.server.name).toBe('test-env-server');
    expect(config.server.transport).toBe('websocket');
    expect(config.server.port).toBe(8080);

    // Cleanup
    delete process.env.JCVD_MCP_SERVER_NAME;
    delete process.env.JCVD_MCP_TRANSPORT;
    delete process.env.JCVD_MCP_PORT;
  });
});

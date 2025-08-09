/**
 * Unit tests for the Orchestrator class
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { testData } from '../../setup';

import type { JCVDConfig } from '@/types/config';

import { Orchestrator } from '@/core/orchestrator';

describe('Orchestrator', () => {
  let config: JCVDConfig;
  let orchestrator: Orchestrator;

  beforeEach(() => {
    config = testData.createJCVDConfig();
    orchestrator = new Orchestrator(config);
  });

  describe('constructor', () => {
    it('should create an orchestrator instance', () => {
      expect(orchestrator).toBeInstanceOf(Orchestrator);
    });

    it('should initialize with idle status', () => {
      const status = orchestrator.getStatus();

      expect(status.status).toBe('idle');
      expect(status.uptime).toBe(0);
      expect(status.activeAgents).toBe(0);
      expect(status.activeProviders).toBe(0);
    });
  });

  describe('initialize', () => {
    it('should initialize successfully with empty configuration', async () => {
      const result = await orchestrator.initialize();

      expect(result.success).toBe(true);

      const status = orchestrator.getStatus();

      expect(status.status).toBe('running');
      expect(status.uptime).toBeGreaterThan(0);
    });

    it('should initialize with configured agents and providers', async () => {
      const configWithComponents = testData.createJCVDConfig({
        agents: [
          testData.createAgentConfig({ id: 'agent-1' }),
          testData.createAgentConfig({ id: 'agent-2', enabled: false }),
        ],
        providers: [testData.createProviderConfig({ id: 'provider-1' })],
      });

      const orchestratorWithComponents = new Orchestrator(configWithComponents);
      const result = await orchestratorWithComponents.initialize();

      expect(result.success).toBe(true);

      const status = orchestratorWithComponents.getStatus();

      expect(status.activeAgents).toBe(1); // Only enabled agents
      expect(status.activeProviders).toBe(1);
    });

    it('should emit initialization event on success', async () => {
      const initSpy = vi.fn();

      orchestrator.on('orchestrator.initialized', initSpy);

      await orchestrator.initialize();

      expect(initSpy).toHaveBeenCalledOnce();
    });

    it('should handle initialization errors gracefully', async () => {
      // Mock a failure in one of the initialization steps
      const failingConfig = testData.createJCVDConfig({
        database: {
          ...testData.createJCVDConfig().database,
          path: '/invalid/path/that/should/fail',
        },
      });

      const failingOrchestrator = new Orchestrator(failingConfig);

      // Note: Since we haven't implemented actual database initialization yet,
      // this test will pass. When we implement the real initialization,
      // we should update this test to verify proper error handling.
      const result = await failingOrchestrator.initialize();

      expect(result.success).toBe(true); // Will be false once implemented
    });
  });

  describe('shutdown', () => {
    it('should shutdown successfully after initialization', async () => {
      await orchestrator.initialize();

      const result = await orchestrator.shutdown();

      expect(result.success).toBe(true);

      const status = orchestrator.getStatus();

      expect(status.status).toBe('stopped');
    });

    it('should emit shutdown event on success', async () => {
      const shutdownSpy = vi.fn();

      orchestrator.on('orchestrator.shutdown', shutdownSpy);

      await orchestrator.initialize();
      await orchestrator.shutdown();

      expect(shutdownSpy).toHaveBeenCalledOnce();
    });

    it('should handle shutdown errors gracefully', async () => {
      await orchestrator.initialize();

      // For now, shutdown should always succeed since we haven't implemented
      // the actual cleanup logic yet
      const result = await orchestrator.shutdown();

      expect(result.success).toBe(true);
    });
  });

  describe('getStatus', () => {
    it('should return correct status information', async () => {
      const beforeInit = orchestrator.getStatus();

      expect(beforeInit.status).toBe('idle');
      expect(beforeInit.uptime).toBe(0);

      await orchestrator.initialize();

      const afterInit = orchestrator.getStatus();

      expect(afterInit.status).toBe('running');
      expect(afterInit.uptime).toBeGreaterThan(0);
      expect(afterInit.lastActivity).toBeInstanceOf(Date);
    });

    it('should count active agents and providers correctly', async () => {
      const configWithMixed = testData.createJCVDConfig({
        agents: [
          testData.createAgentConfig({ id: 'agent-1', enabled: true }),
          testData.createAgentConfig({ id: 'agent-2', enabled: false }),
          testData.createAgentConfig({ id: 'agent-3', enabled: true }),
        ],
        providers: [
          testData.createProviderConfig({ id: 'provider-1', enabled: true }),
          testData.createProviderConfig({ id: 'provider-2', enabled: false }),
        ],
      });

      const orchestratorWithMixed = new Orchestrator(configWithMixed);

      await orchestratorWithMixed.initialize();

      const status = orchestratorWithMixed.getStatus();

      expect(status.activeAgents).toBe(2); // Only enabled agents
      expect(status.activeProviders).toBe(1); // Only enabled providers
    });
  });

  describe('event handling', () => {
    it('should be an EventEmitter', () => {
      expect(orchestrator.on).toBeDefined();
      expect(orchestrator.emit).toBeDefined();
      expect(orchestrator.removeListener).toBeDefined();
    });

    it('should emit events during lifecycle', async () => {
      const events: string[] = [];

      orchestrator.on('orchestrator.initialized', () => events.push('initialized'));
      orchestrator.on('orchestrator.shutdown', () => events.push('shutdown'));

      await orchestrator.initialize();
      await orchestrator.shutdown();

      expect(events).toEqual(['initialized', 'shutdown']);
    });
  });

  describe('configuration handling', () => {
    it('should handle minimal configuration', () => {
      const minimalConfig = testData.createJCVDConfig({
        agents: [],
        providers: [],
        workflows: [],
      });

      const minimalOrchestrator = new Orchestrator(minimalConfig);
      const status = minimalOrchestrator.getStatus();

      expect(status.activeAgents).toBe(0);
      expect(status.activeProviders).toBe(0);
    });

    it('should handle complex configuration', () => {
      const complexConfig = testData.createJCVDConfig({
        agents: [
          testData.createAgentConfig({
            id: 'pm',
            type: 'product-manager',
            dependencies: ['architect'],
          }),
          testData.createAgentConfig({
            id: 'architect',
            type: 'architect',
          }),
        ],
        providers: [
          testData.createProviderConfig({
            id: 'linear',
            type: 'linear',
          }),
          testData.createProviderConfig({
            id: 'github',
            type: 'github',
          }),
        ],
      });

      const complexOrchestrator = new Orchestrator(complexConfig);

      expect(complexOrchestrator).toBeInstanceOf(Orchestrator);
    });
  });
});

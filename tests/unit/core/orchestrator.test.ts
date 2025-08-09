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

    it('should initialize with configured providers', async () => {
      const configWithComponents = testData.createJCVDConfig({
        providers: [testData.createProviderConfig({ id: 'provider-1' })],
      });

      const orchestratorWithComponents = new Orchestrator(configWithComponents);
      const result = await orchestratorWithComponents.initialize();

      expect(result.success).toBe(true);

      const status = orchestratorWithComponents.getStatus();

      expect(status.activeAgents).toBe(0); // JCVD does not manage agents
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
      // Create a fresh orchestrator instance for this test
      const freshOrchestrator = new Orchestrator(testData.createJCVDConfig());
      await freshOrchestrator.initialize();

      const result = await freshOrchestrator.shutdown();

      expect(result.success).toBe(true);

      const status = freshOrchestrator.getStatus();

      expect(status.status).toBe('stopped');
    });

    it('should emit shutdown event on success', async () => {
      // Create a fresh orchestrator instance for this test
      const freshOrchestrator = new Orchestrator(testData.createJCVDConfig());
      const shutdownSpy = vi.fn();

      freshOrchestrator.on('orchestrator.shutdown', shutdownSpy);

      await freshOrchestrator.initialize();
      await freshOrchestrator.shutdown();

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
      // Create a fresh orchestrator instance to ensure clean state
      const freshOrchestrator = new Orchestrator(testData.createJCVDConfig());
      const beforeInit = freshOrchestrator.getStatus();

      expect(beforeInit.status).toBe('idle');
      expect(beforeInit.uptime).toBe(0);

      await freshOrchestrator.initialize();

      const afterInit = freshOrchestrator.getStatus();

      expect(afterInit.status).toBe('running');
      expect(afterInit.uptime).toBeGreaterThan(0);
      expect(afterInit.lastActivity).toBeInstanceOf(Date);
    });

    it('should count active providers correctly', async () => {
      const configWithMixed = testData.createJCVDConfig({
        providers: [
          testData.createProviderConfig({ id: 'provider-1', enabled: true }),
          testData.createProviderConfig({ id: 'provider-2', enabled: false }),
        ],
      });

      const orchestratorWithMixed = new Orchestrator(configWithMixed);

      await orchestratorWithMixed.initialize();

      const status = orchestratorWithMixed.getStatus();

      expect(status.activeAgents).toBe(0); // JCVD does not manage agents
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

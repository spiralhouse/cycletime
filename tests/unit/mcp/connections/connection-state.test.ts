import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  ConnectionState,
  ConnectionStatus,
} from '../../../../src/mcp/connections/connection-state.js';

describe('ConnectionState', () => {
  let connectionState: ConnectionState;
  const mockConnectionId = 'conn-123';

  beforeEach(() => {
    vi.clearAllMocks();
    connectionState = new ConnectionState(mockConnectionId);
  });

  describe('Initialization', () => {
    it('should initialize with correct default state', () => {
      expect(connectionState.getId()).toBe(mockConnectionId);
      expect(connectionState.getStatus()).toBe(ConnectionStatus.DISCONNECTED);
      expect(connectionState.isConnected()).toBe(false);
      expect(connectionState.getConnectedAt()).toBeUndefined();
      expect(connectionState.getLastActivity()).toBeUndefined();
    });

    it('should initialize with custom metadata', () => {
      const metadata = { clientName: 'test-client', version: '1.0.0' };
      const stateWithMeta = new ConnectionState(mockConnectionId, metadata);

      expect(stateWithMeta.getMetadata()).toEqual(metadata);
    });
  });

  describe('Status transitions', () => {
    it('should transition from disconnected to connecting', () => {
      connectionState.setStatus(ConnectionStatus.CONNECTING);

      expect(connectionState.getStatus()).toBe(ConnectionStatus.CONNECTING);
      expect(connectionState.isConnected()).toBe(false);
    });

    it('should transition to connected and set timestamp', () => {
      const beforeConnect = Date.now();

      connectionState.setStatus(ConnectionStatus.CONNECTED);
      const afterConnect = Date.now();

      expect(connectionState.getStatus()).toBe(ConnectionStatus.CONNECTED);
      expect(connectionState.isConnected()).toBe(true);

      const connectedAt = connectionState.getConnectedAt()!;

      expect(connectedAt).toBeGreaterThanOrEqual(beforeConnect);
      expect(connectedAt).toBeLessThanOrEqual(afterConnect);
    });

    it('should transition to disconnected and clear timestamp', () => {
      connectionState.setStatus(ConnectionStatus.CONNECTED);
      connectionState.setStatus(ConnectionStatus.DISCONNECTED);

      expect(connectionState.getStatus()).toBe(ConnectionStatus.DISCONNECTED);
      expect(connectionState.isConnected()).toBe(false);
      expect(connectionState.getConnectedAt()).toBeUndefined();
    });

    it('should handle error state', () => {
      const error = new Error('Connection failed');

      connectionState.setStatus(ConnectionStatus.ERROR, error);

      expect(connectionState.getStatus()).toBe(ConnectionStatus.ERROR);
      expect(connectionState.isConnected()).toBe(false);
      expect(connectionState.getError()).toBe(error);
    });
  });

  describe('Activity tracking', () => {
    it('should update last activity timestamp', () => {
      const beforeActivity = Date.now();

      connectionState.updateActivity();
      const afterActivity = Date.now();

      const lastActivity = connectionState.getLastActivity()!;

      expect(lastActivity).toBeGreaterThanOrEqual(beforeActivity);
      expect(lastActivity).toBeLessThanOrEqual(afterActivity);
    });

    it('should calculate uptime correctly', () => {
      connectionState.setStatus(ConnectionStatus.CONNECTED);

      // Wait a small amount
      const uptime = connectionState.getUptime();

      expect(uptime).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 uptime when not connected', () => {
      expect(connectionState.getUptime()).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should track message counts', () => {
      connectionState.incrementMessageCount('request');
      connectionState.incrementMessageCount('request');
      connectionState.incrementMessageCount('response');

      const stats = connectionState.getStatistics();

      expect(stats.messageCount.request).toBe(2);
      expect(stats.messageCount.response).toBe(1);
      expect(stats.messageCount.notification).toBe(0);
    });

    it('should provide complete connection statistics', () => {
      connectionState.setStatus(ConnectionStatus.CONNECTED);
      connectionState.updateActivity();
      connectionState.incrementMessageCount('request');

      const stats = connectionState.getStatistics();

      expect(stats).toEqual({
        id: mockConnectionId,
        status: ConnectionStatus.CONNECTED,
        connectedAt: expect.any(Number),
        lastActivity: expect.any(Number),
        uptime: expect.any(Number),
        messageCount: {
          request: 1,
          response: 0,
          notification: 0,
        },
        metadata: {},
      });
    });
  });

  describe('Metadata management', () => {
    it('should update metadata', () => {
      const newMetadata = { clientType: 'web', userAgent: 'browser' };

      connectionState.updateMetadata(newMetadata);

      expect(connectionState.getMetadata()).toEqual(newMetadata);
    });

    it('should merge metadata when updating', () => {
      const initialMetadata = { clientName: 'test-client' };
      const stateWithMeta = new ConnectionState(mockConnectionId, initialMetadata);

      stateWithMeta.updateMetadata({ version: '1.0.0' });

      expect(stateWithMeta.getMetadata()).toEqual({
        clientName: 'test-client',
        version: '1.0.0',
      });
    });
  });
});

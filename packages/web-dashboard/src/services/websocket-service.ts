import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { WebSocketConnection, WebSocketManager } from '../types/service-types';

export class WebSocketService extends EventEmitter implements WebSocketManager {
  public connections: Map<string, WebSocketConnection> = new Map();
  private rooms: Map<string, Set<string>> = new Map();
  private userConnections: Map<string, Set<string>> = new Map();
  private io: any; // Socket.IO instance
  private isInitialized = false;

  constructor() {
    super();
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // In a real implementation, this would initialize Socket.IO
    console.log('WebSocket service initialized');
    this.isInitialized = true;
  }

  public async shutdown(): Promise<void> {
    if (!this.isInitialized) return;

    // Disconnect all connections
    for (const connection of this.connections.values()) {
      this.disconnectClient(connection.id, 'server_shutdown');
    }

    this.connections.clear();
    this.rooms.clear();
    this.userConnections.clear();
    this.removeAllListeners();
    this.isInitialized = false;
    
    console.log('WebSocket service shutdown');
  }

  public addConnection(connection: WebSocketConnection): void {
    this.connections.set(connection.id, connection);
    
    // Add to user connections
    if (!this.userConnections.has(connection.userId)) {
      this.userConnections.set(connection.userId, new Set());
    }
    this.userConnections.get(connection.userId)!.add(connection.id);

    // Join default rooms
    this.joinRoom(connection.id, 'dashboard');
    this.joinRoom(connection.id, `user-${connection.userId}`);

    this.emit('connection.added', connection);
    console.log(`WebSocket connection added: ${connection.id} for user ${connection.userId}`);
  }

  public removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Remove from user connections
    const userConnections = this.userConnections.get(connection.userId);
    if (userConnections) {
      userConnections.delete(connectionId);
      if (userConnections.size === 0) {
        this.userConnections.delete(connection.userId);
      }
    }

    // Remove from all rooms
    connection.rooms.forEach(room => {
      this.leaveRoom(connectionId, room);
    });

    this.connections.delete(connectionId);
    this.emit('connection.removed', connection);
    console.log(`WebSocket connection removed: ${connectionId} for user ${connection.userId}`);
  }

  public getConnection(connectionId: string): WebSocketConnection | undefined {
    return this.connections.get(connectionId);
  }

  public getUserConnections(userId: string): WebSocketConnection[] {
    const connectionIds = this.userConnections.get(userId) || new Set();
    return Array.from(connectionIds)
      .map(id => this.connections.get(id))
      .filter(conn => conn !== undefined) as WebSocketConnection[];
  }

  public broadcastToUser(userId: string, event: string, data: any): void {
    const userConnections = this.getUserConnections(userId);
    
    userConnections.forEach(connection => {
      this.sendToConnection(connection.id, event, data);
    });

    if (userConnections.length > 0) {
      console.log(`Broadcast to user ${userId}: ${event} (${userConnections.length} connections)`);
    }
  }

  public broadcastToRoom(room: string, event: string, data: any): void {
    const roomConnections = this.rooms.get(room) || new Set();
    
    roomConnections.forEach(connectionId => {
      this.sendToConnection(connectionId, event, data);
    });

    if (roomConnections.size > 0) {
      console.log(`Broadcast to room ${room}: ${event} (${roomConnections.size} connections)`);
    }
  }

  public broadcastToAll(event: string, data: any): void {
    this.connections.forEach((connection, connectionId) => {
      this.sendToConnection(connectionId, event, data);
    });

    console.log(`Broadcast to all: ${event} (${this.connections.size} connections)`);
  }

  public joinRoom(connectionId: string, room: string): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) return false;

    // Add to room
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    this.rooms.get(room)!.add(connectionId);

    // Add to connection's rooms
    if (!connection.rooms.includes(room)) {
      connection.rooms.push(room);
    }

    console.log(`Connection ${connectionId} joined room ${room}`);
    return true;
  }

  public leaveRoom(connectionId: string, room: string): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) return false;

    // Remove from room
    const roomConnections = this.rooms.get(room);
    if (roomConnections) {
      roomConnections.delete(connectionId);
      if (roomConnections.size === 0) {
        this.rooms.delete(room);
      }
    }

    // Remove from connection's rooms
    const roomIndex = connection.rooms.indexOf(room);
    if (roomIndex > -1) {
      connection.rooms.splice(roomIndex, 1);
    }

    console.log(`Connection ${connectionId} left room ${room}`);
    return true;
  }

  public sendToConnection(connectionId: string, event: string, data: any): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) return false;

    // Update last activity
    connection.lastActivity = new Date().toISOString();

    // In a real implementation, this would send via Socket.IO
    console.log(`Send to connection ${connectionId}: ${event}`, data);
    
    // Mock WebSocket send
    if (connection.socket && connection.socket.send) {
      try {
        connection.socket.send(JSON.stringify({ event, data }));
        return true;
      } catch (error) {
        console.error(`Failed to send to connection ${connectionId}:`, error);
        return false;
      }
    }

    return true;
  }

  public disconnectClient(connectionId: string, reason: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Send disconnect event
    this.sendToConnection(connectionId, 'disconnect', { reason });

    // Close socket if available
    if (connection.socket && connection.socket.close) {
      try {
        connection.socket.close();
      } catch (error) {
        console.error(`Failed to close socket for connection ${connectionId}:`, error);
      }
    }

    // Remove connection
    this.removeConnection(connectionId);
  }

  public updateConnectionActivity(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.lastActivity = new Date().toISOString();
    }
  }

  public getConnectionStatus(): any {
    const activeConnections = this.connections.size;
    const totalRooms = this.rooms.size;
    const uniqueUsers = this.userConnections.size;

    const connectionsByRoom = Array.from(this.rooms.entries()).map(([room, connections]) => ({
      room,
      connectionCount: connections.size,
    }));

    const connectionsByUser = Array.from(this.userConnections.entries()).map(([userId, connections]) => ({
      userId,
      connectionCount: connections.size,
    }));

    return {
      activeConnections,
      totalRooms,
      uniqueUsers,
      connectionsByRoom,
      connectionsByUser,
      uptime: process.uptime(),
    };
  }

  public pingAllConnections(): void {
    const now = new Date().toISOString();
    
    this.connections.forEach((connection, connectionId) => {
      this.sendToConnection(connectionId, 'ping', { timestamp: now });
    });
  }

  public cleanupStaleConnections(maxIdleTime: number = 300000): number {
    const now = new Date().getTime();
    const staleConnections: string[] = [];

    this.connections.forEach((connection, connectionId) => {
      const lastActivity = new Date(connection.lastActivity).getTime();
      if (now - lastActivity > maxIdleTime) {
        staleConnections.push(connectionId);
      }
    });

    staleConnections.forEach(connectionId => {
      this.disconnectClient(connectionId, 'idle_timeout');
    });

    if (staleConnections.length > 0) {
      console.log(`Cleaned up ${staleConnections.length} stale connections`);
    }

    return staleConnections.length;
  }

  public createMockConnection(userId: string, sessionId: string): WebSocketConnection {
    const connection: WebSocketConnection = {
      id: randomUUID(),
      userId,
      sessionId,
      socket: {
        send: (data: string) => {
          console.log(`Mock socket send for ${userId}:`, data);
        },
        close: () => {
          console.log(`Mock socket close for ${userId}`);
        },
      },
      connectedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      rooms: [],
      metadata: {
        userAgent: 'Mock WebSocket Client',
        ip: '127.0.0.1',
      },
    };

    this.addConnection(connection);
    return connection;
  }

  public handleUserPresence(userId: string, status: 'online' | 'away' | 'busy' | 'offline'): void {
    const userConnections = this.getUserConnections(userId);
    
    if (userConnections.length === 0 && status !== 'offline') {
      // User has no active connections but is not offline
      return;
    }

    const presenceData = {
      userId,
      status,
      lastSeen: new Date().toISOString(),
      activeConnections: userConnections.length,
    };

    // Broadcast presence to all users
    this.broadcastToRoom('presence', 'user.presence', presenceData);
    
    // Update user's own connections
    userConnections.forEach(connection => {
      connection.metadata.presence = status;
    });
  }

  public handleRealtimeUpdate(updateType: string, data: any, targetUsers?: string[]): void {
    const event = `realtime.${updateType}`;
    const payload = {
      type: updateType,
      data,
      timestamp: new Date().toISOString(),
    };

    if (targetUsers && targetUsers.length > 0) {
      // Send to specific users
      targetUsers.forEach(userId => {
        this.broadcastToUser(userId, event, payload);
      });
    } else {
      // Send to all connected users
      this.broadcastToAll(event, payload);
    }
  }

  public getRoomMembers(room: string): string[] {
    const roomConnections = this.rooms.get(room) || new Set();
    return Array.from(roomConnections)
      .map(connectionId => this.connections.get(connectionId))
      .filter(conn => conn !== undefined)
      .map(conn => conn!.userId);
  }

  public sendNotificationToUser(userId: string, notification: any): void {
    this.broadcastToUser(userId, 'notification', notification);
  }

  public sendDashboardUpdate(updateType: string, data: any, targetUsers?: string[]): void {
    const event = 'dashboard.update';
    const payload = {
      type: updateType,
      data,
      timestamp: new Date().toISOString(),
    };

    if (targetUsers && targetUsers.length > 0) {
      targetUsers.forEach(userId => {
        this.broadcastToUser(userId, event, payload);
      });
    } else {
      this.broadcastToRoom('dashboard', event, payload);
    }
  }
}
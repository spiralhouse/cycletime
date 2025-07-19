import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { DashboardEvent, BaseEvent } from '../types/event-types';

export class EventService extends EventEmitter {
  private eventStore: Map<string, BaseEvent> = new Map();
  private subscribers: Map<string, Set<string>> = new Map();

  constructor() {
    super();
    this.setMaxListeners(100);
  }

  public async initialize(): Promise<void> {
    // In a real implementation, this would connect to Redis or another event store
    console.log('Event service initialized');
  }

  public async shutdown(): Promise<void> {
    this.removeAllListeners();
    this.eventStore.clear();
    this.subscribers.clear();
    console.log('Event service shutdown');
  }

  /**
   * Publish an event to all subscribers
   */
  public publishEvent(event: DashboardEvent): void {
    const eventId = randomUUID();
    const fullEvent: BaseEvent = {
      id: eventId,
      type: event.type,
      timestamp: new Date().toISOString(),
      source: 'web-dashboard-service',
      version: '1.0.0',
      ...event,
    };

    // Store the event
    this.eventStore.set(eventId, fullEvent);

    // Emit to local subscribers
    this.emit(event.type, fullEvent);
    this.emit('*', fullEvent);

    // In a real implementation, this would publish to Redis or message queue
    console.log(`Event published: ${event.type}`, { eventId, timestamp: fullEvent.timestamp });
  }

  /**
   * Subscribe to specific event types
   */
  public subscribe(eventType: string, subscriberId: string): void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType)!.add(subscriberId);
  }

  /**
   * Unsubscribe from specific event types
   */
  public unsubscribe(eventType: string, subscriberId: string): void {
    const subscribers = this.subscribers.get(eventType);
    if (subscribers) {
      subscribers.delete(subscriberId);
      if (subscribers.size === 0) {
        this.subscribers.delete(eventType);
      }
    }
  }

  /**
   * Get event history for a specific type
   */
  public getEventHistory(eventType: string, limit = 50): BaseEvent[] {
    const events = Array.from(this.eventStore.values())
      .filter(event => event.type === eventType)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    return events;
  }

  /**
   * Get all events for a specific user
   */
  public getUserEvents(userId: string, limit = 50): BaseEvent[] {
    const events = Array.from(this.eventStore.values())
      .filter(event => {
        // Check if event is related to the user
        const payload = (event as any).payload;
        return payload?.userId === userId || 
               payload?.affectedUsers?.includes(userId) ||
               payload?.assignedTo?.userId === userId;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    return events;
  }

  /**
   * Emit user connected event
   */
  public emitUserConnected(userId: string, sessionId: string, username: string, clientInfo: any): void {
    this.publishEvent({
      type: 'user.connected',
      payload: {
        userId,
        sessionId,
        username,
        connectedAt: new Date().toISOString(),
        clientInfo,
      },
    } as any);
  }

  /**
   * Emit user disconnected event
   */
  public emitUserDisconnected(userId: string, sessionId: string, username: string, duration: number, reason: string): void {
    this.publishEvent({
      type: 'user.disconnected',
      payload: {
        userId,
        sessionId,
        username,
        disconnectedAt: new Date().toISOString(),
        duration,
        reason,
      },
    } as any);
  }

  /**
   * Emit dashboard data updated event
   */
  public emitDashboardDataUpdated(dataType: string, updateType: string, affectedUsers: string[], changes: any): void {
    this.publishEvent({
      type: 'dashboard.data.updated',
      payload: {
        dataType,
        updateType,
        updatedAt: new Date().toISOString(),
        affectedUsers,
        changes,
        metadata: {
          source: 'system_update',
        },
      },
    } as any);
  }

  /**
   * Emit notification sent event
   */
  public emitNotificationSent(notificationId: string, userId: string, type: string, title: string, message: string, priority: string): void {
    this.publishEvent({
      type: 'dashboard.notification.sent',
      payload: {
        notificationId,
        userId,
        type,
        title,
        message,
        priority,
        sentAt: new Date().toISOString(),
      },
    } as any);
  }

  /**
   * Emit notification read event
   */
  public emitNotificationRead(notificationId: string, userId: string, sessionId: string): void {
    this.publishEvent({
      type: 'dashboard.notification.read',
      payload: {
        notificationId,
        userId,
        sessionId,
        readAt: new Date().toISOString(),
      },
    } as any);
  }

  /**
   * Emit project updated event
   */
  public emitProjectUpdated(projectId: string, name: string, action: string, changes: any, updatedBy: any, affectedUsers: string[]): void {
    this.publishEvent({
      type: 'project.updated',
      payload: {
        projectId,
        name,
        action,
        changes,
        updatedBy,
        updatedAt: new Date().toISOString(),
        affectedUsers,
      },
    } as any);
  }

  /**
   * Emit task updated event
   */
  public emitTaskUpdated(taskId: string, title: string, action: string, changes: any, updatedBy: any, affectedUsers: string[], projectId: string, projectName: string): void {
    this.publishEvent({
      type: 'task.updated',
      payload: {
        taskId,
        title,
        action,
        changes,
        updatedBy,
        updatedAt: new Date().toISOString(),
        affectedUsers,
        projectId,
        projectName,
      },
    } as any);
  }

  /**
   * Emit widget updated event
   */
  public emitWidgetUpdated(widgetId: string, userId: string, action: string, widget: any): void {
    this.publishEvent({
      type: 'dashboard.widget.updated',
      payload: {
        widgetId,
        userId,
        action,
        widget,
        updatedAt: new Date().toISOString(),
      },
    } as any);
  }

  /**
   * Emit system maintenance event
   */
  public emitSystemMaintenance(maintenanceId: string, type: string, title: string, message: string, severity: string, scheduledStart: string, estimatedDuration: number, affectedServices: string[], status: string): void {
    this.publishEvent({
      type: 'system.maintenance',
      payload: {
        maintenanceId,
        type,
        title,
        message,
        severity,
        scheduledStart,
        estimatedDuration,
        affectedServices,
        status,
        notifiedAt: new Date().toISOString(),
      },
    } as any);
  }

  /**
   * Emit system error event
   */
  public emitSystemError(errorId: string, type: string, title: string, message: string, severity: string, service: string, affectedUsers: string[], resolution?: any): void {
    this.publishEvent({
      type: 'system.error',
      payload: {
        errorId,
        type,
        title,
        message,
        severity,
        service,
        timestamp: new Date().toISOString(),
        affectedUsers,
        resolution,
      },
    } as any);
  }

  /**
   * Emit analytics updated event
   */
  public emitAnalyticsUpdated(dataType: string, timeframe: string, affectedProjects: string[], affectedUsers: string[], summary: any, source: string): void {
    this.publishEvent({
      type: 'analytics.updated',
      payload: {
        dataType,
        timeframe,
        updatedAt: new Date().toISOString(),
        affectedProjects,
        affectedUsers,
        summary,
        source,
      },
    } as any);
  }

  /**
   * Get event statistics
   */
  public getEventStatistics(): any {
    const eventsByType = new Map<string, number>();
    const eventsByHour = new Map<string, number>();

    Array.from(this.eventStore.values()).forEach(event => {
      // Count by type
      const currentCount = eventsByType.get(event.type) || 0;
      eventsByType.set(event.type, currentCount + 1);

      // Count by hour
      const hour = new Date(event.timestamp).toISOString().slice(0, 13);
      const currentHourCount = eventsByHour.get(hour) || 0;
      eventsByHour.set(hour, currentHourCount + 1);
    });

    return {
      totalEvents: this.eventStore.size,
      eventsByType: Object.fromEntries(eventsByType),
      eventsByHour: Object.fromEntries(eventsByHour),
      subscribers: Array.from(this.subscribers.entries()).map(([type, subs]) => ({
        eventType: type,
        subscriberCount: subs.size,
      })),
    };
  }
}
import Redis from 'redis';
import {
  IEventService,
  StandardsAnalyzedEvent,
  ComplianceViolationEvent,
  StandardsUpdatedEvent,
  BaseEventPayload,
  StandardsSeverity,
  EnforcementLevel
} from '../types/standards-types.js';
import { getEnvVar } from '@cycletime/shared-config';
import { MockDataService } from './mock-data-service.js';

/**
 * Event Service
 * Handles event publishing to Redis and event correlation
 */
export class EventService implements IEventService {
  private redisClient: Redis.RedisClientType | null = null;
  private mockDataService: MockDataService;
  private eventQueue: BaseEventPayload[] = [];
  private isConnected = false;
  private retryCount = 0;
  private maxRetries = 3;

  constructor() {
    this.mockDataService = new MockDataService();
    this.initializeRedisConnection();
  }

  /**
   * Initialize Redis connection
   */
  private async initializeRedisConnection(): Promise<void> {
    try {
      const redisUrl = getEnvVar('REDIS_URL', 'redis://localhost:6379');
      
      this.redisClient = Redis.createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > this.maxRetries) {
              console.error('Max Redis reconnection attempts reached');
              return false;
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });

      this.redisClient.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.redisClient.on('connect', () => {
        console.log('Connected to Redis');
        this.isConnected = true;
        this.retryCount = 0;
        this.processQueuedEvents();
      });

      this.redisClient.on('disconnect', () => {
        console.log('Disconnected from Redis');
        this.isConnected = false;
      });

      await this.redisClient.connect();
    } catch (error) {
      console.error('Failed to initialize Redis connection:', error);
      this.isConnected = false;
    }
  }

  /**
   * Publish standards analysis completed event
   */
  async publishStandardsAnalyzed(event: StandardsAnalyzedEvent): Promise<void> {
    const channelName = 'standards/analyzed';
    
    // Add base event metadata if missing
    const enrichedEvent = this.enrichEvent(event);
    
    await this.publishEvent(channelName, enrichedEvent);
    
    // Log event for debugging
    console.log(`Published StandardsAnalyzed event: ${enrichedEvent.eventId}`);
  }

  /**
   * Publish compliance violation detected event
   */
  async publishComplianceViolation(event: ComplianceViolationEvent): Promise<void> {
    const channelName = 'compliance/violation';
    
    const enrichedEvent = this.enrichEvent(event);
    
    await this.publishEvent(channelName, enrichedEvent);
    
    // Log critical violations immediately
    if (event.data.severity === 'error') {
      console.warn(`Critical compliance violation detected: ${event.data.ruleId} in ${event.data.filePath}`);
    }
  }

  /**
   * Publish standards updated event
   */
  async publishStandardsUpdated(event: StandardsUpdatedEvent): Promise<void> {
    const channelName = 'standards/updated';
    
    const enrichedEvent = this.enrichEvent(event);
    
    await this.publishEvent(channelName, enrichedEvent);
    
    console.log(`Published StandardsUpdated event for team: ${event.data.teamId}`);
  }

  /**
   * Publish compliance passed event
   */
  async publishCompliancePassed(data: {
    checkId: string;
    teamId: string;
    projectId: string;
    filesChecked: number;
    rulesPassed: number;
    overallScore: number;
    previousScore?: number;
    improvement?: number;
  }): Promise<void> {
    const event: BaseEventPayload & { data: typeof data } = {
      eventId: this.mockDataService.generateUUID(),
      timestamp: new Date().toISOString(),
      correlationId: this.mockDataService.generateUUID(),
      source: 'standards-engine',
      version: '1.0',
      data
    };

    const channelName = 'compliance/passed';
    await this.publishEvent(channelName, event);
    
    console.log(`Published CompliancePassed event: ${event.eventId}`);
  }

  /**
   * Publish guidance delivered event
   */
  async publishGuidanceDelivered(data: {
    guidanceId: string;
    requestId: string;
    teamId: string;
    deliveryMethod: 'mcp' | 'api' | 'webhook';
    guidanceType: 'real_time' | 'on_demand' | 'scheduled';
    language: string;
    context: string;
    standardsApplied: string[];
    responseTimeMs: number;
    cacheHit?: boolean;
  }): Promise<void> {
    const event: BaseEventPayload & { data: typeof data } = {
      eventId: this.mockDataService.generateUUID(),
      timestamp: new Date().toISOString(),
      correlationId: this.mockDataService.generateUUID(),
      source: 'standards-engine',
      version: '1.0',
      data
    };

    const channelName = 'standards/guidance/delivered';
    await this.publishEvent(channelName, event);
    
    console.log(`Published GuidanceDelivered event: ${event.eventId}`);
  }

  /**
   * Publish template used event
   */
  async publishTemplateUsed(data: {
    templateId: string;
    templateName: string;
    teamId: string;
    appliedBy: string;
    rulesAdded: number;
    customizations: number;
    inheritanceMode: 'replace' | 'merge' | 'overlay';
    success: boolean;
    errors?: string[];
  }): Promise<void> {
    const event: BaseEventPayload & { data: typeof data } = {
      eventId: this.mockDataService.generateUUID(),
      timestamp: new Date().toISOString(),
      correlationId: this.mockDataService.generateUUID(),
      source: 'standards-engine',
      version: '1.0',
      data
    };

    const channelName = 'standards/template/used';
    await this.publishEvent(channelName, event);
    
    console.log(`Published TemplateUsed event: ${event.eventId}`);
  }

  /**
   * Publish enforcement triggered event
   */
  async publishEnforcementTriggered(data: {
    enforcementId: string;
    teamId: string;
    projectId: string;
    action: 'block_pr' | 'block_commit' | 'notify_only' | 'auto_fix' | 'escalate';
    reason: 'standards_violations' | 'policy_breach' | 'security_concern' | 'quality_threshold';
    target: {
      type: 'pull_request' | 'commit' | 'deployment' | 'release';
      id: string;
    };
    violations: {
      error: number;
      warning: number;
      info: number;
    };
    enforcementLevel: 'advisory' | 'warning' | 'blocking';
    autoFixableViolations: number;
    manualReviewRequired?: boolean;
    escalationContacts?: string[];
  }): Promise<void> {
    const event: BaseEventPayload & { data: typeof data } = {
      eventId: this.mockDataService.generateUUID(),
      timestamp: new Date().toISOString(),
      correlationId: this.mockDataService.generateUUID(),
      source: 'standards-engine',
      version: '1.0',
      data
    };

    const channelName = 'standards/enforcement/triggered';
    await this.publishEvent(channelName, event);
    
    console.log(`Published EnforcementTriggered event: ${event.eventId}`);
  }

  /**
   * Subscribe to external events that trigger standards processing
   */
  async subscribeToTriggerEvents(): Promise<void> {
    if (!this.redisClient || !this.isConnected) {
      console.warn('Redis not connected, cannot subscribe to events');
      return;
    }

    const channels = [
      'code/committed',
      'pull-request/opened',
      'ai/request/started',
      'team/configuration/updated',
      'mcp/standards/requested'
    ];

    try {
      for (const channel of channels) {
        await this.redisClient.subscribe(channel, (message, channel) => {
          this.handleIncomingEvent(channel, message);
        });
      }

      console.log(`Subscribed to trigger events: ${channels.join(', ')}`);
    } catch (error) {
      console.error('Failed to subscribe to trigger events:', error);
    }
  }

  /**
   * Handle incoming events that trigger standards processing
   */
  private async handleIncomingEvent(channel: string, message: string): Promise<void> {
    try {
      const event = JSON.parse(message);
      console.log(`Received event on ${channel}:`, event.eventId);

      switch (channel) {
        case 'code/committed':
          await this.handleCodeCommittedEvent(event);
          break;
        case 'pull-request/opened':
          await this.handlePullRequestEvent(event);
          break;
        case 'ai/request/started':
          await this.handleAIRequestEvent(event);
          break;
        case 'team/configuration/updated':
          await this.handleTeamConfigurationEvent(event);
          break;
        case 'mcp/standards/requested':
          await this.handleMCPStandardsRequestEvent(event);
          break;
        default:
          console.warn(`Unknown event channel: ${channel}`);
      }
    } catch (error) {
      console.error(`Error handling event from ${channel}:`, error);
    }
  }

  /**
   * Handle code committed events
   */
  private async handleCodeCommittedEvent(event: any): Promise<void> {
    // Trigger standards analysis for the committed code
    console.log(`Triggering standards analysis for commit: ${event.data.commitId}`);
    
    // In a real implementation, this would trigger the analysis pipeline
    // For now, we'll simulate by publishing an analysis result
    await this.mockDataService.delay(500);
    
    await this.publishStandardsAnalyzed({
      eventId: this.mockDataService.generateUUID(),
      timestamp: new Date().toISOString(),
      correlationId: event.correlationId,
      source: 'standards-engine',
      version: '1.0',
      data: {
        analysisId: this.mockDataService.generateUUID(),
        teamId: event.data.teamId,
        projectId: event.data.projectId,
        files: [
          {
            path: 'src/example.ts',
            language: 'typescript',
            score: 85,
            violationsCount: 3
          }
        ],
        overallScore: 85,
        totalViolations: 3,
        analysisDurationMs: 1250,
        triggeredBy: `commit:${event.data.commitId}`
      }
    });
  }

  /**
   * Handle pull request opened events
   */
  private async handlePullRequestEvent(event: any): Promise<void> {
    console.log(`Triggering compliance check for PR: ${event.data.pullRequestId}`);
    
    // Simulate compliance analysis
    await this.mockDataService.delay(800);
    
    // Example: publish a violation if needed
    if (Math.random() > 0.7) { // 30% chance of violation
      await this.publishComplianceViolation({
        eventId: this.mockDataService.generateUUID(),
        timestamp: new Date().toISOString(),
        correlationId: event.correlationId,
        source: 'standards-engine',
        version: '1.0',
        data: {
          violationId: this.mockDataService.generateUUID(),
          teamId: event.data.teamId,
          projectId: event.data.projectId,
          standardId: 'std-ts-best-practices',
          ruleId: 'ts-no-var',
          severity: StandardsSeverity.ERROR,
          message: 'Use const or let instead of var',
          filePath: 'src/component.tsx',
          line: 15,
          column: 5,
          fixAvailable: true,
          autoFixable: true,
          enforcementLevel: EnforcementLevel.BLOCKING,
          suggestedFix: 'Replace var with const',
          context: {
            pullRequestId: event.data.pullRequestId,
            branch: event.data.sourceBranch
          }
        }
      });
    }
  }

  /**
   * Handle AI request events
   */
  private async handleAIRequestEvent(event: any): Promise<void> {
    console.log(`Processing AI guidance request: ${event.data.requestId}`);
    
    // Simulate guidance generation
    await this.mockDataService.delay(300);
    
    await this.publishGuidanceDelivered({
      guidanceId: this.mockDataService.generateUUID(),
      requestId: event.data.requestId,
      teamId: event.data.teamId,
      deliveryMethod: 'mcp',
      guidanceType: 'real_time',
      language: event.data.language || 'typescript',
      context: event.data.requestType || 'code_completion',
      standardsApplied: ['std-ts-best-practices', 'std-security-practices'],
      responseTimeMs: 250,
      cacheHit: false
    });
  }

  /**
   * Handle team configuration updated events
   */
  private async handleTeamConfigurationEvent(event: any): Promise<void> {
    console.log(`Processing team configuration update: ${event.data.teamId}`);
    
    // Simulate configuration processing
    await this.mockDataService.delay(200);
    
    // In a real implementation, this would trigger cache updates, etc.
  }

  /**
   * Handle MCP standards request events
   */
  private async handleMCPStandardsRequestEvent(event: any): Promise<void> {
    console.log(`Processing MCP standards request: ${event.data.requestId}`);
    
    // Simulate standards delivery
    await this.mockDataService.delay(150);
    
    await this.publishGuidanceDelivered({
      guidanceId: this.mockDataService.generateUUID(),
      requestId: event.data.requestId,
      teamId: event.data.teamId,
      deliveryMethod: 'mcp',
      guidanceType: 'on_demand',
      language: event.data.requestContext?.language || 'typescript',
      context: event.data.requestContext?.taskType || 'implementation',
      standardsApplied: ['std-ts-best-practices'],
      responseTimeMs: 120,
      cacheHit: true
    });
  }

  /**
   * Generic event publishing method
   */
  private async publishEvent(channel: string, event: BaseEventPayload): Promise<void> {
    if (!this.isConnected || !this.redisClient) {
      // Queue event for later processing
      this.eventQueue.push(event);
      console.warn(`Redis not connected, queued event ${event.eventId} for channel ${channel}`);
      return;
    }

    try {
      const eventString = JSON.stringify(event);
      await this.redisClient.publish(channel, eventString);
    } catch (error) {
      console.error(`Failed to publish event to ${channel}:`, error);
      // Queue for retry
      this.eventQueue.push(event);
    }
  }

  /**
   * Process queued events when Redis reconnects
   */
  private async processQueuedEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    console.log(`Processing ${this.eventQueue.length} queued events`);
    
    const events = [...this.eventQueue];
    this.eventQueue = [];

    for (const event of events) {
      try {
        // Determine channel from event type or source
        const channel = this.getChannelForEvent(event);
        await this.publishEvent(channel, event);
      } catch (error) {
        console.error('Failed to process queued event:', error);
      }
    }
  }

  /**
   * Get appropriate channel for an event
   */
  private getChannelForEvent(event: BaseEventPayload): string {
    // This is a simplified implementation
    // In a real system, this would be more sophisticated
    if (event.source === 'standards-engine') {
      return 'standards/analyzed'; // Default channel
    }
    return 'general';
  }

  /**
   * Enrich event with additional metadata
   */
  private enrichEvent<T extends BaseEventPayload>(event: T): T {
    return {
      ...event,
      eventId: event.eventId || this.mockDataService.generateUUID(),
      timestamp: event.timestamp || new Date().toISOString(),
      correlationId: event.correlationId || this.mockDataService.generateUUID(),
      source: event.source || 'standards-engine',
      version: event.version || '1.0'
    };
  }

  /**
   * Get event service health status
   */
  getHealth(): {
    connected: boolean;
    queuedEvents: number;
    lastError?: string;
  } {
    return {
      connected: this.isConnected,
      queuedEvents: this.eventQueue.length,
      lastError: this.retryCount > 0 ? 'Connection issues detected' : undefined
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.disconnect();
      console.log('Event service shut down gracefully');
    }
  }
}
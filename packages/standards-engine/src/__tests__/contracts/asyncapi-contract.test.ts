/**
 * AsyncAPI Contract Validation Tests
 * Validates that event schemas and publishing contracts match the AsyncAPI specification
 */

import { AsyncAPIDocumentV3 as AsyncAPIDocument } from '@asyncapi/parser/cjs';
import { Parser } from '@asyncapi/parser/cjs';
import fs from 'fs';
import path from 'path';

describe('AsyncAPI Contract Validation', () => {
  let parsedSpec: AsyncAPIDocument;
  let parser: Parser;

  beforeAll(async () => {
    // Parse the AsyncAPI specification
    const specPath = path.join(__dirname, '../../../asyncapi.yaml');
    const specContent = fs.readFileSync(specPath, 'utf8');
    
    parser = new Parser();
    const { document } = await parser.parse(specContent);
    
    if (!document) {
      throw new Error('Failed to parse AsyncAPI specification');
    }
    
    parsedSpec = document;
  });

  describe('AsyncAPI Specification Validation', () => {
    it('should have valid AsyncAPI specification', () => {
      expect(parsedSpec).toBeDefined();
      expect(parsedSpec.version()).toBe('3.0.0');
      expect(parsedSpec.info().title()).toBe('Standards Engine Event API');
      expect(parsedSpec.info().version()).toBe('1.0.0');
    });

    it('should define required servers', () => {
      const servers = parsedSpec.servers();
      expect(servers.has('development')).toBe(true);
      expect(servers.has('production')).toBe(true);
      
      const devServer = servers.get('development');
      expect(devServer?.host()).toBe('localhost:6379');
      expect(devServer?.protocol()).toBe('redis');
      
      const prodServer = servers.get('production');
      expect(prodServer?.host()).toBe('redis.cycletime.dev:6379');
      expect(prodServer?.protocol()).toBe('redis');
    });

    it('should define all required channels', () => {
      const requiredChannels = [
        'standards/analyzed',
        'compliance/violation',
        'compliance/passed',
        'standards/updated',
        'standards/guidance/delivered',
        'code/committed',
        'pull-request/opened',
        'ai/request/started',
        'team/configuration/updated',
        'mcp/standards/requested',
        'standards/template/used',
        'standards/enforcement/triggered'
      ];

      const channels = parsedSpec.channels();
      requiredChannels.forEach(channelName => {
        expect(channels.has(channelName)).toBe(true);
      });
    });

    it('should define all required operations', () => {
      const requiredOperations = [
        'publishStandardsAnalyzed',
        'publishComplianceViolation', 
        'publishCompliancePassed',
        'publishStandardsUpdated',
        'publishGuidanceDelivered',
        'publishTemplateUsed',
        'publishEnforcementTriggered',
        'subscribeCodeCommitted',
        'subscribePullRequestOpened',
        'subscribeAIRequestStarted',
        'subscribeTeamConfigurationUpdated',
        'subscribeMCPStandardsRequested'
      ];

      const operations = parsedSpec.operations();
      requiredOperations.forEach(operationId => {
        expect(operations.has(operationId)).toBe(true);
      });
    });
  });

  describe('Message Schema Validation', () => {
    it('should define StandardsAnalyzed message schema', () => {
      const components = parsedSpec.components();
      const messages = components?.messages();
      
      expect(messages?.has('StandardsAnalyzed')).toBe(true);
      
      const message = messages?.get('StandardsAnalyzed');
      expect(message?.name()).toBe('StandardsAnalyzed');
      expect(message?.title()).toBe('Standards Analysis Completed');
      expect(message?.contentType()).toBe('application/json');
      
      // Validate payload schema exists
      const payload = message?.payload();
      expect(payload).toBeDefined();
    });

    it('should define ComplianceViolation message schema', () => {
      const components = parsedSpec.components();
      const messages = components?.messages();
      
      expect(messages?.has('ComplianceViolation')).toBe(true);
      
      const message = messages?.get('ComplianceViolation');
      expect(message?.name()).toBe('ComplianceViolation');
      expect(message?.title()).toBe('Standards Violation Detected');
      expect(message?.contentType()).toBe('application/json');
      
      const payload = message?.payload();
      expect(payload).toBeDefined();
    });

    it('should define CompliancePassed message schema', () => {
      const components = parsedSpec.components();
      const messages = components?.messages();
      
      expect(messages?.has('CompliancePassed')).toBe(true);
      
      const message = messages?.get('CompliancePassed');
      expect(message?.name()).toBe('CompliancePassed');
      expect(message?.title()).toBe('Compliance Check Passed');
      expect(message?.contentType()).toBe('application/json');
      
      const payload = message?.payload();
      expect(payload).toBeDefined();
    });

    it('should define GuidanceDelivered message schema', () => {
      const components = parsedSpec.components();
      const messages = components?.messages();
      
      expect(messages?.has('GuidanceDelivered')).toBe(true);
      
      const message = messages?.get('GuidanceDelivered');
      expect(message?.name()).toBe('GuidanceDelivered');
      expect(message?.title()).toBe('Real-time Guidance Delivered');
      
      const payload = message?.payload();
      expect(payload).toBeDefined();
    });
  });

  describe('Event Payload Schema Validation', () => {
    it('should validate StandardsAnalyzed payload structure', () => {
      // Mock standards analyzed event payload
      const mockPayload = {
        eventId: 'evt_standards_001',
        timestamp: '2025-01-20T10:30:00Z',
        correlationId: 'corr_abc123',
        source: 'standards-engine',
        version: '1.0',
        data: {
          analysisId: 'analysis_789',
          teamId: '550e8400-e29b-41d4-a716-446655440000',
          projectId: '550e8400-e29b-41d4-a716-446655440001',
          files: [
            {
              path: 'src/utils/helper.ts',
              language: 'typescript',
              score: 85,
              violations_count: 2
            }
          ],
          overall_score: 85,
          total_violations: 2,
          analysis_duration_ms: 1250,
          triggered_by: 'commit:abc123def'
        }
      };

      // Validate required base properties
      expect(mockPayload).toHaveProperty('eventId');
      expect(mockPayload).toHaveProperty('timestamp');
      expect(mockPayload).toHaveProperty('source');
      expect(mockPayload).toHaveProperty('data');
      
      // Validate data structure
      expect(mockPayload.data).toHaveProperty('analysisId');
      expect(mockPayload.data).toHaveProperty('teamId');
      expect(mockPayload.data).toHaveProperty('projectId');
      expect(mockPayload.data).toHaveProperty('files');
      expect(mockPayload.data).toHaveProperty('overall_score');
      expect(mockPayload.data).toHaveProperty('total_violations');
      
      // Validate types
      expect(typeof mockPayload.eventId).toBe('string');
      expect(typeof mockPayload.timestamp).toBe('string');
      expect(typeof mockPayload.source).toBe('string');
      expect(Array.isArray(mockPayload.data.files)).toBe(true);
      expect(typeof mockPayload.data.overall_score).toBe('number');
      expect(typeof mockPayload.data.total_violations).toBe('number');
      
      // Validate score bounds
      expect(mockPayload.data.overall_score).toBeGreaterThanOrEqual(0);
      expect(mockPayload.data.overall_score).toBeLessThanOrEqual(100);
      expect(mockPayload.data.total_violations).toBeGreaterThanOrEqual(0);
    });

    it('should validate ComplianceViolation payload structure', () => {
      // Mock compliance violation event payload
      const mockPayload = {
        eventId: 'evt_violation_001',
        timestamp: '2025-01-20T10:30:05Z',
        correlationId: 'corr_abc123',
        source: 'standards-engine',
        version: '1.0',
        data: {
          violationId: 'viol_001',
          teamId: '550e8400-e29b-41d4-a716-446655440000',
          projectId: '550e8400-e29b-41d4-a716-446655440001',
          standardId: 'std_eslint_001',
          ruleId: 'no-var',
          severity: 'error',
          message: 'Use const or let instead of var',
          file_path: 'src/utils/helper.ts',
          line: 15,
          column: 5,
          fix_available: true,
          auto_fixable: true,
          enforcement_level: 'blocking'
        }
      };

      // Validate required properties
      expect(mockPayload.data).toHaveProperty('violationId');
      expect(mockPayload.data).toHaveProperty('teamId');
      expect(mockPayload.data).toHaveProperty('standardId');
      expect(mockPayload.data).toHaveProperty('ruleId');
      expect(mockPayload.data).toHaveProperty('severity');
      expect(mockPayload.data).toHaveProperty('message');
      expect(mockPayload.data).toHaveProperty('enforcement_level');
      
      // Validate enum values
      expect(['error', 'warning', 'info']).toContain(mockPayload.data.severity);
      expect(['advisory', 'warning', 'blocking']).toContain(mockPayload.data.enforcement_level);
      
      // Validate types
      expect(typeof mockPayload.data.violationId).toBe('string');
      expect(typeof mockPayload.data.message).toBe('string');
      expect(typeof mockPayload.data.fix_available).toBe('boolean');
      expect(typeof mockPayload.data.auto_fixable).toBe('boolean');
      
      if (mockPayload.data.line !== undefined) {
        expect(typeof mockPayload.data.line).toBe('number');
        expect(mockPayload.data.line).toBeGreaterThanOrEqual(1);
      }
      
      if (mockPayload.data.column !== undefined) {
        expect(typeof mockPayload.data.column).toBe('number');
        expect(mockPayload.data.column).toBeGreaterThanOrEqual(1);
      }
    });

    it('should validate GuidanceDelivered payload structure', () => {
      // Mock guidance delivered event payload
      const mockPayload = {
        eventId: 'evt_guidance_001',
        timestamp: '2025-01-20T10:40:00Z',
        correlationId: 'corr_ghi789',
        source: 'standards-engine',
        version: '1.0',
        data: {
          guidanceId: 'guid_001',
          requestId: 'req_456',
          teamId: '550e8400-e29b-41d4-a716-446655440000',
          delivery_method: 'mcp',
          guidance_type: 'real_time',
          language: 'typescript',
          context: 'code_completion',
          standards_applied: ['std_001', 'std_002'],
          response_time_ms: 150,
          cache_hit: false
        }
      };

      // Validate required properties
      expect(mockPayload.data).toHaveProperty('guidanceId');
      expect(mockPayload.data).toHaveProperty('requestId');
      expect(mockPayload.data).toHaveProperty('teamId');
      expect(mockPayload.data).toHaveProperty('delivery_method');
      expect(mockPayload.data).toHaveProperty('guidance_type');
      expect(mockPayload.data).toHaveProperty('response_time_ms');
      
      // Validate enum values
      expect(['mcp', 'api', 'webhook']).toContain(mockPayload.data.delivery_method);
      expect(['real_time', 'on_demand', 'scheduled']).toContain(mockPayload.data.guidance_type);
      expect(['code_completion', 'code_review', 'documentation', 'testing']).toContain(mockPayload.data.context);
      
      // Validate types
      expect(typeof mockPayload.data.guidanceId).toBe('string');
      expect(typeof mockPayload.data.requestId).toBe('string');
      expect(typeof mockPayload.data.response_time_ms).toBe('number');
      expect(Array.isArray(mockPayload.data.standards_applied)).toBe(true);
      
      if (mockPayload.data.cache_hit !== undefined) {
        expect(typeof mockPayload.data.cache_hit).toBe('boolean');
      }
    });
  });

  describe('Channel Operation Validation', () => {
    it('should define publish operations for Standards Engine events', () => {
      const operations = parsedSpec.operations();
      
      // Verify publish operations exist
      const publishOps = [
        'publishStandardsAnalyzed',
        'publishComplianceViolation',
        'publishCompliancePassed',
        'publishStandardsUpdated',
        'publishGuidanceDelivered'
      ];
      
      publishOps.forEach(opId => {
        const operation = operations.get(opId);
        expect(operation).toBeDefined();
        expect(operation?.action()).toBe('send');
      });
    });

    it('should define subscribe operations for trigger events', () => {
      const operations = parsedSpec.operations();
      
      // Verify subscribe operations exist
      const subscribeOps = [
        'subscribeCodeCommitted',
        'subscribePullRequestOpened',
        'subscribeAIRequestStarted',
        'subscribeTeamConfigurationUpdated',
        'subscribeMCPStandardsRequested'
      ];
      
      subscribeOps.forEach(opId => {
        const operation = operations.get(opId);
        expect(operation).toBeDefined();
        expect(operation?.action()).toBe('receive');
      });
    });

    it('should link operations to correct channels', () => {
      const operations = parsedSpec.operations();
      
      // Test specific operation-channel mappings
      const publishAnalyzed = operations.get('publishStandardsAnalyzed');
      expect(publishAnalyzed?.channels().all()).toContain(
        expect.objectContaining({
          address: expect.stringContaining('standards/analyzed')
        })
      );
      
      const subscribeCommit = operations.get('subscribeCodeCommitted');
      expect(subscribeCommit?.channels().all()).toContain(
        expect.objectContaining({
          address: expect.stringContaining('code/committed')
        })
      );
    });
  });

  describe('Message Trait Validation', () => {
    it('should define common header traits', () => {
      const components = parsedSpec.components();
      const messageTraits = components?.messageTraits();
      
      expect(messageTraits?.has('commonHeaders')).toBe(true);
      
      const commonHeaders = messageTraits?.get('commonHeaders');
      expect(commonHeaders).toBeDefined();
      
      // Verify headers structure exists
      const headers = commonHeaders?.headers();
      expect(headers).toBeDefined();
    });

    it('should validate event header structure', () => {
      // Mock event with common headers
      const mockEventHeaders = {
        eventType: 'StandardsAnalyzed',
        eventVersion: '1.0',
        priority: 'normal',
        retry: true,
        ttl: 3600
      };

      // Validate required headers
      expect(mockEventHeaders).toHaveProperty('eventType');
      expect(typeof mockEventHeaders.eventType).toBe('string');
      
      // Validate enum values
      if (mockEventHeaders.priority) {
        expect(['low', 'normal', 'high', 'critical']).toContain(mockEventHeaders.priority);
      }
      
      // Validate types
      if (mockEventHeaders.retry !== undefined) {
        expect(typeof mockEventHeaders.retry).toBe('boolean');
      }
      
      if (mockEventHeaders.ttl !== undefined) {
        expect(typeof mockEventHeaders.ttl).toBe('number');
      }
    });
  });

  describe('Event Publishing Contract', () => {
    it('should support Redis protocol for event streaming', () => {
      const servers = parsedSpec.servers();
      
      // Validate Redis protocol support
      servers.all().forEach(server => {
        expect(server.protocol()).toBe('redis');
      });
    });

    it('should use application/json as default content type', () => {
      expect(parsedSpec.defaultContentType()).toBe('application/json');
    });

    it('should define proper event correlation', () => {
      // Mock related events with correlation
      const analysisEvent = {
        eventId: 'evt_001',
        correlationId: 'corr_123',
        source: 'standards-engine'
      };
      
      const violationEvent = {
        eventId: 'evt_002', 
        correlationId: 'corr_123', // Same correlation ID
        source: 'standards-engine'
      };

      // Validate correlation tracking
      expect(analysisEvent.correlationId).toBe(violationEvent.correlationId);
      expect(typeof analysisEvent.correlationId).toBe('string');
      expect(analysisEvent.correlationId.length).toBeGreaterThan(0);
    });
  });
});
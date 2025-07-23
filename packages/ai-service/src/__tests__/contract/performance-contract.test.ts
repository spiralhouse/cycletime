/**
 * Performance Contract Testing Suite
 * 
 * Tests performance baselines against SLA requirements
 * for SPI-130: Contract Testing and Validation Suite
 */

import { FastifyInstance } from 'fastify';
import request from 'supertest';
import { createApp } from '../../app';

describe('Performance Contract Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createApp({
      logger: false,
      port: 0,
      host: 'localhost'
    });
    await app.ready();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Response Time Requirements', () => {
    it('should respond to health check within 100ms', async () => {
      const startTime = Date.now();
      
      await request(app.server)
        .get('/health')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(100);
    });

    it('should respond to provider listing within 100ms', async () => {
      const startTime = Date.now();
      
      await request(app.server)
        .get('/providers')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(100);
    });

    it('should respond to metrics endpoint within 100ms', async () => {
      const startTime = Date.now();
      
      await request(app.server)
        .get('/metrics')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(100);
    });

    it('should handle AI request creation within 100ms', async () => {
      const requestBody = {
        type: 'chat_completion',
        messages: [{ role: 'user', content: 'Hello' }],
        maxTokens: 100
      };

      const startTime = Date.now();
      
      await request(app.server)
        .post('/api/v1/chat/completions')
        .send(requestBody)
        .expect(201);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(100);
    });
  });

  describe('Mock Processing Timing Validation', () => {
    it('should simulate realistic AI processing times (2-30s range)', async () => {
      const requestBody = {
        type: 'chat_completion',
        messages: [{ role: 'user', content: 'Generate a detailed analysis' }],
        maxTokens: 4000
      };

      // Create request
      const createResponse = await request(app.server)
        .post('/api/v1/chat/completions')
        .send(requestBody)
        .expect(201);
      
      const requestId = createResponse.body.id;
      const startTime = Date.now();

      // Poll status until completed or timeout
      let completed = false;
      let processingTime = 0;
      const maxWaitTime = 35000; // 35 seconds max wait
      
      while (!completed && processingTime < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        
        const statusResponse = await request(app.server)
          .get(`/api/v1/requests/${requestId}`)
          .expect(200);
        
        if (statusResponse.body.status === 'completed') {
          completed = true;
          processingTime = Date.now() - startTime;
        } else {
          processingTime = Date.now() - startTime;
        }
      }

      // Verify processing time is within expected range (2-30 seconds)
      expect(processingTime).toBeGreaterThan(2000); // At least 2 seconds
      expect(processingTime).toBeLessThan(30000);   // Less than 30 seconds
    }, 40000); // 40 second test timeout

    it('should provide estimated completion times', async () => {
      const requestBody = {
        type: 'project_analysis',
        projectId: 'test-project-123'
      };

      const response = await request(app.server)
        .post('/api/v1/chat/completions')
        .send(requestBody)
        .expect(201);
      
      expect(response.body.estimatedCompletion).toBeDefined();
      
      const estimatedTime = new Date(response.body.estimatedCompletion);
      const currentTime = new Date();
      const timeDiff = estimatedTime.getTime() - currentTime.getTime();
      
      // Estimated completion should be between 2-30 seconds from now
      expect(timeDiff).toBeGreaterThan(2000);
      expect(timeDiff).toBeLessThan(30000);
    });
  });

  describe('Concurrent Operation Support', () => {
    it('should handle 100 concurrent health check requests', async () => {
      const concurrentRequests = 100;
      const requests = [];

      const startTime = Date.now();
      
      for (let i = 0; i < concurrentRequests; i++) {
        requests.push(
          request(app.server)
            .get('/health')
            .expect(200)
        );
      }

      const results = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      // All requests should complete
      expect(results.length).toBe(concurrentRequests);
      
      // Total time should be reasonable (less than 5 seconds)
      expect(totalTime).toBeLessThan(5000);
      
      // Each response should be valid
      results.forEach(response => {
        expect(response.body.status).toBeDefined();
      });
    }, 10000); // 10 second timeout

    it('should handle 50 concurrent AI request creations', async () => {
      const concurrentRequests = 50;
      const requests = [];

      const requestBody = {
        type: 'chat_completion',
        messages: [{ role: 'user', content: 'Test concurrent request' }],
        maxTokens: 50
      };

      const startTime = Date.now();
      
      for (let i = 0; i < concurrentRequests; i++) {
        requests.push(
          request(app.server)
            .post('/api/v1/chat/completions')
            .send(requestBody)
            .expect(201)
        );
      }

      const results = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      // All requests should complete
      expect(results.length).toBe(concurrentRequests);
      
      // Total time should be reasonable (less than 3 seconds for creation)
      expect(totalTime).toBeLessThan(3000);
      
      // Each response should have unique request ID
      const requestIds = results.map(r => r.body.id);
      const uniqueIds = new Set(requestIds);
      expect(uniqueIds.size).toBe(concurrentRequests);
    }, 10000);

    it('should maintain performance under sustained load', async () => {
      const requestsPerBatch = 25;
      const batches = 4;
      const results: number[] = [];

      for (let batch = 0; batch < batches; batch++) {
        const batchStartTime = Date.now();
        const batchRequests = [];

        for (let i = 0; i < requestsPerBatch; i++) {
          batchRequests.push(
            request(app.server)
              .get('/providers')
              .expect(200)
          );
        }

        await Promise.all(batchRequests);
        const batchTime = Date.now() - batchStartTime;
        results.push(batchTime);

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Performance should not degrade significantly
      const avgTime = results.reduce((a, b) => a + b, 0) / results.length;
      const maxTime = Math.max(...results);
      
      expect(avgTime).toBeLessThan(1000); // Average batch time under 1 second
      expect(maxTime).toBeLessThan(2000);  // No batch should take more than 2 seconds
    }, 20000);
  });

  describe('Memory and Resource Usage Validation', () => {
    it('should not leak memory during request processing', async () => {
      const initialMemory = process.memoryUsage();
      
      // Create multiple requests to test memory usage
      for (let i = 0; i < 50; i++) {
        await request(app.server)
          .post('/api/v1/chat/completions')
          .send({
            type: 'chat_completion',
            messages: [{ role: 'user', content: `Request ${i}` }]
          })
          .expect(201);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncreaseMB).toBeLessThan(50);
    });

    it('should handle cleanup properly after request completion', async () => {
      const requestBody = {
        type: 'embedding',
        input: ['Test input for cleanup validation'],
        model: 'text-embedding-3-small'
      };

      // Create and track multiple requests
      const requestIds = [];
      
      for (let i = 0; i < 10; i++) {
        const response = await request(app.server)
          .post('/api/v1/chat/completions')
          .send(requestBody)
          .expect(201);
        
        requestIds.push(response.body.id);
      }

      // Wait for processing and cleanup
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check that requests are tracked properly
      for (const requestId of requestIds) {
        const statusResponse = await request(app.server)
          .get(`/api/v1/requests/${requestId}`);
        
        expect([200, 404]).toContain(statusResponse.status);
      }
    });
  });

  describe('Throughput Validation', () => {
    it('should achieve minimum throughput of 10 requests per second', async () => {
      const testDuration = 5000; // 5 seconds
      const minExpectedRequests = 50; // 10 requests/second * 5 seconds
      
      let completedRequests = 0;
      const startTime = Date.now();
      
      // Start concurrent request processing
      const makeRequest = async () => {
        try {
          await request(app.server)
            .get('/health')
            .expect(200);
          completedRequests++;
        } catch (error) {
          // Ignore individual request failures for throughput test
        }
      };

      // Keep making requests for the test duration
      const requestInterval = setInterval(() => {
        makeRequest();
      }, 100); // Every 100ms = 10 requests/second

      // Wait for test duration
      await new Promise(resolve => setTimeout(resolve, testDuration));
      clearInterval(requestInterval);

      const actualDuration = Date.now() - startTime;
      const requestsPerSecond = (completedRequests * 1000) / actualDuration;

      expect(completedRequests).toBeGreaterThanOrEqual(minExpectedRequests);
      expect(requestsPerSecond).toBeGreaterThanOrEqual(10);
    }, 10000);
  });
});
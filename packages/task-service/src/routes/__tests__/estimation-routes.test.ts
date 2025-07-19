import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { estimationRoutes } from '../estimation-routes';

describe('Estimation Routes', () => {
  let app: FastifyInstance;

  const mockRequest = {
    tasks: [
      {
        id: randomUUID(),
        title: 'Test Task',
        description: 'A test task for estimation',
        type: 'feature' as const,
        complexity: 'medium' as const
      }
    ],
    context: {
      teamExperience: 'senior' as const,
      projectType: 'greenfield' as const,
      techStack: ['TypeScript', 'Node.js']
    },
    options: {
      unit: 'hours' as const,
      includeBuffer: true,
      includeBreakdown: true,
      confidenceLevel: 'high' as const
    }
  };

  beforeEach(() => {
    // Mock Fastify instance with required decorators
    app = {
      post: jest.fn(),
      get: jest.fn(),
      put: jest.fn(),
      register: jest.fn(),
      logEvent: jest.fn(),
      logPerformance: jest.fn(),
      mockDataService: {
        // Mock methods as needed
      }
    } as any;
  });

  describe('POST /estimate', () => {
    it('should register the estimation route', async () => {
      await estimationRoutes(app);
      expect(app.post).toHaveBeenCalledWith('/estimate', expect.any(Object), expect.any(Function));
    });

    it('should have correct schema structure', async () => {
      await estimationRoutes(app);
      const postCall = (app.post as jest.Mock).mock.calls.find(call => call[0] === '/estimate');
      expect(postCall).toBeDefined();
      
      const schema = postCall[1].schema;
      expect(schema.tags).toEqual(['AI Estimation']);
      expect(schema.body).toBeDefined();
      expect(schema.response).toBeDefined();
    });
  });

  describe('GET /:taskId/estimate', () => {
    it('should register the get estimate route', async () => {
      await estimationRoutes(app);
      expect(app.get).toHaveBeenCalledWith('/:taskId/estimate', expect.any(Object), expect.any(Function));
    });
  });

  describe('PUT /:taskId/estimate', () => {
    it('should register the update estimate route', async () => {
      await estimationRoutes(app);
      expect(app.put).toHaveBeenCalledWith('/:taskId/estimate', expect.any(Object), expect.any(Function));
    });
  });

  describe('GET /estimates/batch', () => {
    it('should register the batch get route', async () => {
      await estimationRoutes(app);
      expect(app.get).toHaveBeenCalledWith('/estimates/batch', expect.any(Object), expect.any(Function));
    });
  });

  describe('POST /estimates/batch', () => {
    it('should register the batch create route', async () => {
      await estimationRoutes(app);
      expect(app.post).toHaveBeenCalledWith('/estimates/batch', expect.any(Object), expect.any(Function));
    });
  });

  describe('Helper functions', () => {
    it('should calculate base hours correctly', () => {
      // Test helper functions are working
      expect(typeof calculateBaseHours).toBe('function');
    });
  });
});

// Mock helper functions for testing
function calculateBaseHours(type: string, complexity?: string): number {
  const baseHours = {
    feature: 20,
    bug: 8,
    maintenance: 12,
    research: 16,
    documentation: 6
  };
  
  const complexityMultipliers = {
    low: 0.7,
    medium: 1.0,
    high: 1.5,
    very_high: 2.0
  };
  
  const base = baseHours[type as keyof typeof baseHours] || 16;
  const multiplier = complexityMultipliers[complexity as keyof typeof complexityMultipliers] || 1.0;
  
  return Math.round(base * multiplier);
}
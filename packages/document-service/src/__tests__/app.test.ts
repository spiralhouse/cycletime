import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { App } from '../app';

describe.skip('App', () => {
  let app: App;

  beforeEach(() => {
    app = new App();
  });

  afterEach(async () => {
    if (app) {
      await app.stop();
    }
  });

  describe('initialization', () => {
    it('should initialize successfully', () => {
      expect(app).toBeDefined();
      expect(app.getServer()).toBeDefined();
      expect(app.getDocumentService()).toBeDefined();
      expect(app.getStorageService()).toBeDefined();
      expect(app.getEventService()).toBeDefined();
    });

    it('should have a fastify server instance', () => {
      const server = app.getServer();
      expect(server).toBeDefined();
      expect(typeof server.listen).toBe('function');
      expect(typeof server.close).toBe('function');
    });
  });

  describe('services', () => {
    it('should have document service', () => {
      const documentService = app.getDocumentService();
      expect(documentService).toBeDefined();
      expect(typeof documentService.createDocument).toBe('function');
      expect(typeof documentService.getDocument).toBe('function');
      expect(typeof documentService.updateDocument).toBe('function');
      expect(typeof documentService.deleteDocument).toBe('function');
      expect(typeof documentService.listDocuments).toBe('function');
      expect(typeof documentService.searchDocuments).toBe('function');
    });

    it('should have storage service', () => {
      const storageService = app.getStorageService();
      expect(storageService).toBeDefined();
      expect(typeof storageService.uploadFile).toBe('function');
      expect(typeof storageService.downloadFile).toBe('function');
      expect(typeof storageService.deleteFile).toBe('function');
      expect(typeof storageService.fileExists).toBe('function');
    });

    it('should have event service', () => {
      const eventService = app.getEventService();
      expect(eventService).toBeDefined();
      expect(typeof eventService.publishDocumentCreated).toBe('function');
      expect(typeof eventService.publishDocumentUpdated).toBe('function');
      expect(typeof eventService.publishDocumentDeleted).toBe('function');
    });
  });

  describe('routes', () => {
    it('should have health route registered', async () => {
      const server = app.getServer();
      
      // Inject a test request to the health endpoint
      const response = await server.inject({
        method: 'GET',
        url: '/health'
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.status).toBe('healthy');
      expect(body.timestamp).toBeDefined();
      expect(body.version).toBeDefined();
      expect(body.dependencies).toBeDefined();
      expect(body.metrics).toBeDefined();
    });

    it('should have document routes registered', async () => {
      const server = app.getServer();
      
      // Test document creation endpoint
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/documents',
        payload: {
          title: 'Test Document',
          type: 'pdf',
          description: 'Test description'
        }
      });

      expect(response.statusCode).toBe(201);
      
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.document).toBeDefined();
      expect(body.document.title).toBe('Test Document');
    });

    it('should have document list route registered', async () => {
      const server = app.getServer();
      
      // Test document list endpoint
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/documents'
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.documents).toBeDefined();
      expect(body.pagination).toBeDefined();
      expect(body.success).toBe(true);
    });

    it('should return 404 for non-existent routes', async () => {
      const server = app.getServer();
      
      const response = await server.inject({
        method: 'GET',
        url: '/non-existent-route'
      });

      expect(response.statusCode).toBe(404);
      
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Not Found');
    });
  });

  describe('swagger documentation', () => {
    it('should have swagger documentation available', async () => {
      const server = app.getServer();
      
      // Test swagger JSON endpoint
      const response = await server.inject({
        method: 'GET',
        url: '/documentation/json'
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.openapi).toBeDefined();
      expect(body.info).toBeDefined();
      expect(body.info.title).toBe('Document Service API');
    });
  });

  describe('error handling', () => {
    it('should handle internal server errors gracefully', async () => {
      const server = app.getServer();
      
      // Mock an endpoint that throws an error
      server.get('/test-error', async (request, reply) => {
        throw new Error('Test error');
      });

      const response = await server.inject({
        method: 'GET',
        url: '/test-error'
      });

      expect(response.statusCode).toBe(500);
      
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Internal Server Error');
      expect(body.message).toBeDefined();
      expect(body.timestamp).toBeDefined();
    });

    it('should handle validation errors', async () => {
      const server = app.getServer();
      
      // Test document creation with invalid payload
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/documents',
        payload: {
          // Missing required fields
          description: 'Test description'
        }
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
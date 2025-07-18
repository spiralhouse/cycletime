import { HealthCheck } from '../health';
import { DocumentService } from '../service';
import { IncomingMessage, ServerResponse } from 'http';

describe('HealthCheck', () => {
  let healthCheck: HealthCheck;
  let documentService: DocumentService;
  let mockRequest: jest.Mocked<IncomingMessage>;
  let mockResponse: jest.Mocked<ServerResponse>;

  beforeEach(() => {
    documentService = new DocumentService();
    healthCheck = new HealthCheck(documentService);
    
    mockRequest = {} as jest.Mocked<IncomingMessage>;
    mockResponse = {
      writeHead: jest.fn(),
      end: jest.fn()
    } as unknown as jest.Mocked<ServerResponse>;
  });

  it('should return healthy status', () => {
    healthCheck.handle(mockRequest, mockResponse);

    expect(mockResponse.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/json' });
    expect(mockResponse.end).toHaveBeenCalled();

    const responseData = JSON.parse((mockResponse.end as jest.Mock).mock.calls[0][0]);
    expect(responseData).toMatchObject({
      status: 'healthy',
      service: 'document-service',
      version: '0.1.0',
      storage_backend: 'minio',
      minio_configured: false
    });
    expect(responseData.timestamp).toBeDefined();
  });
});
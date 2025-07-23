import { HealthCheck } from '../health';
import { TaskService } from '../service';
import { IncomingMessage, ServerResponse } from 'http';

describe.skip('HealthCheck', () => {
  let healthCheck: HealthCheck;
  let taskService: TaskService;
  let mockRequest: jest.Mocked<IncomingMessage>;
  let mockResponse: jest.Mocked<ServerResponse>;

  beforeEach(() => {
    taskService = new TaskService();
    healthCheck = new HealthCheck(taskService);
    
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
      service: 'task-service',
      version: '0.1.0',
      integrations: ['linear', 'github'],
      linear_configured: false,
      github_configured: false
    });
    expect(responseData.timestamp).toBeDefined();
  });
});
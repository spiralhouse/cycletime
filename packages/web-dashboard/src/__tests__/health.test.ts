import { HealthCheck } from '../health';
import { DashboardService } from '../service';
import { IncomingMessage, ServerResponse } from 'http';

describe('HealthCheck', () => {
  let healthCheck: HealthCheck;
  let dashboardService: DashboardService;
  let mockRequest: jest.Mocked<IncomingMessage>;
  let mockResponse: jest.Mocked<ServerResponse>;

  beforeEach(() => {
    dashboardService = new DashboardService();
    healthCheck = new HealthCheck(dashboardService);
    
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
      service: 'web-dashboard',
      version: '0.1.0',
      features: ['placeholder', 'health-check'],
      frontend: 'react',
      ready: false
    });
    expect(responseData.timestamp).toBeDefined();
  });
});
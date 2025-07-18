import { IncomingMessage, ServerResponse } from 'http';
import { DashboardService } from './service';

export class HealthCheck {
  constructor(private dashboardService: DashboardService) {}

  public handle(req: IncomingMessage, res: ServerResponse): void {
    const healthStatus = {
      status: this.dashboardService.getStatus(),
      service: 'web-dashboard',
      timestamp: new Date().toISOString(),
      version: this.dashboardService.getVersion(),
      features: this.dashboardService.getFeatures(),
      frontend: 'react',
      ready: false
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(healthStatus));
  }
}
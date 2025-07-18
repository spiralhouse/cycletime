import { IncomingMessage, ServerResponse } from 'http';
import { TaskService } from './service';

export class HealthCheck {
  constructor(private taskService: TaskService) {}

  public handle(req: IncomingMessage, res: ServerResponse): void {
    const healthStatus = {
      status: 'healthy',
      service: 'task-service',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      integrations: this.taskService.getIntegrations(),
      linear_configured: this.taskService.isLinearConfigured(),
      github_configured: this.taskService.isGitHubConfigured()
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(healthStatus));
  }
}
import { createServer } from 'http';
import { DashboardService } from './service';
import { HealthCheck } from './health';

const port = process.env.WEB_DASHBOARD_PORT || 3000;

const dashboardService = new DashboardService();
const healthCheck = new HealthCheck(dashboardService);

const server = createServer((req, res) => {
  if (req.url === '/health') {
    healthCheck.handle(req, res);
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Not Found',
      message: 'Web Dashboard placeholder - React frontend not yet implemented',
      service: 'web-dashboard'
    }));
  }
});

server.listen(Number(port), '0.0.0.0', () => {
  console.log(`Web Dashboard development server running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
});

process.on('SIGTERM', () => {
  console.log('Web Dashboard shutting down...');
  server.close(() => {
    process.exit(0);
  });
});

export { DashboardService, HealthCheck };
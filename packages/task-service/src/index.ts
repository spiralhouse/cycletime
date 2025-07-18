import { createServer } from 'http';
import { TaskService } from './service';
import { HealthCheck } from './health';

const port = process.env.TASK_SERVICE_PORT || 8004;

const taskService = new TaskService();
const healthCheck = new HealthCheck(taskService);

const server = createServer((req, res) => {
  if (req.url === '/health') {
    healthCheck.handle(req, res);
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Not Found',
      message: 'Task Service placeholder - service not yet implemented',
      service: 'task-service'
    }));
  }
});

server.listen(Number(port), '0.0.0.0', () => {
  console.log(`Task Service development server running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
});

process.on('SIGTERM', () => {
  console.log('Task Service shutting down...');
  server.close(() => {
    process.exit(0);
  });
});

export { TaskService, HealthCheck };
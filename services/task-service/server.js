#!/usr/bin/env node

const http = require('http');
const port = process.env.TASK_SERVICE_PORT || 8004;

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      service: 'task-service',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      integrations: ['linear', 'github'],
      linear_configured: process.env.LINEAR_API_KEY !== 'dev_key_replace_me',
      github_configured: process.env.GITHUB_TOKEN !== 'dev_token_replace_me'
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Not Found',
      message: 'Task Service placeholder - service not yet implemented',
      service: 'task-service'
    }));
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Task Service development server running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
});

process.on('SIGTERM', () => {
  console.log('Task Service shutting down...');
  server.close(() => {
    process.exit(0);
  });
});
#!/usr/bin/env node

const http = require('http');
const port = process.env.API_PORT || 8000;

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
      version: '0.1.0'
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Not Found',
      message: 'API Gateway placeholder - service not yet implemented',
      service: 'api-gateway'
    }));
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`API Gateway development server running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
});

process.on('SIGTERM', () => {
  console.log('API Gateway server shutting down...');
  server.close(() => {
    process.exit(0);
  });
});
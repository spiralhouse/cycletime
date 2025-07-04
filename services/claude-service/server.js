#!/usr/bin/env node

const http = require('http');
const port = process.env.CLAUDE_SERVICE_PORT || 8002;

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      service: 'claude-service',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      ai_model: 'claude-4-sonnet',
      api_configured: process.env.ANTHROPIC_API_KEY !== 'dev_key_replace_me'
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Not Found',
      message: 'Claude Service placeholder - service not yet implemented',
      service: 'claude-service'
    }));
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Claude Service development server running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
});

process.on('SIGTERM', () => {
  console.log('Claude Service shutting down...');
  server.close(() => {
    process.exit(0);
  });
});
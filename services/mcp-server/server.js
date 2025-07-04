#!/usr/bin/env node

const http = require('http');
const port = process.env.MCP_PORT || 8001;

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      service: 'mcp-server',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      protocol: 'MCP 1.0'
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Not Found',
      message: 'MCP Server placeholder - service not yet implemented',
      service: 'mcp-server'
    }));
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`MCP Server development server running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
});

process.on('SIGTERM', () => {
  console.log('MCP Server shutting down...');
  server.close(() => {
    process.exit(0);
  });
});
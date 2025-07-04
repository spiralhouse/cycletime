#!/usr/bin/env node

const http = require('http');
const port = process.env.DOCUMENT_SERVICE_PORT || 8003;

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      service: 'document-service',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      storage_backend: 'minio',
      minio_endpoint: process.env.MINIO_ENDPOINT
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Not Found',
      message: 'Document Service placeholder - service not yet implemented',
      service: 'document-service'
    }));
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Document Service development server running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
});

process.on('SIGTERM', () => {
  console.log('Document Service shutting down...');
  server.close(() => {
    process.exit(0);
  });
});
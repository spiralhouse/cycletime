#!/usr/bin/env node

const http = require('http');
const port = process.env.WEB_PORT || 3001;

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      service: 'web-dashboard',
      timestamp: new Date().toISOString(),
      version: '0.1.0'
    }));
  } else if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>CycleTime - Web Dashboard</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .container { max-width: 600px; margin: 0 auto; }
            .status { color: #28a745; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🚀 CycleTime Web Dashboard</h1>
            <p class="status">Development Server Running</p>
            <p>Web Dashboard placeholder - service not yet implemented</p>
            <p>Health Check: <a href="/health">/health</a></p>
          </div>
        </body>
      </html>
    `);
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Not Found',
      message: 'Web Dashboard placeholder - service not yet implemented',
      service: 'web-dashboard'
    }));
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Web Dashboard development server running on port ${port}`);
  console.log(`Visit: http://localhost:${port}`);
});

process.on('SIGTERM', () => {
  console.log('Web Dashboard server shutting down...');
  server.close(() => {
    process.exit(0);
  });
});
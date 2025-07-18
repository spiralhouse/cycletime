import { createServer } from 'http';
import { DocumentService } from './service';
import { HealthCheck } from './health';

const port = process.env.DOCUMENT_SERVICE_PORT || 8003;

const documentService = new DocumentService();
const healthCheck = new HealthCheck(documentService);

const server = createServer((req, res) => {
  if (req.url === '/health') {
    healthCheck.handle(req, res);
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Not Found',
      message: 'Document Service placeholder - service not yet implemented',
      service: 'document-service'
    }));
  }
});

server.listen(Number(port), '0.0.0.0', () => {
  console.log(`Document Service development server running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
});

process.on('SIGTERM', () => {
  console.log('Document Service shutting down...');
  server.close(() => {
    process.exit(0);
  });
});

export { DocumentService, HealthCheck };
import { IncomingMessage, ServerResponse } from 'http';
import { DocumentService } from './service';

export class HealthCheck {
  constructor(private documentService: DocumentService) {}

  public handle(req: IncomingMessage, res: ServerResponse): void {
    const healthStatus = {
      status: 'healthy',
      service: 'document-service',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      storage_backend: 'minio',
      minio_endpoint: this.documentService.getMinioEndpoint(),
      minio_configured: this.documentService.isMinioConfigured()
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(healthStatus));
  }
}
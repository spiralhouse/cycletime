import { FastifyInstance } from 'fastify';
import { DocumentController } from '../controllers/document-controller';
import { registerDocumentRoutes } from './document-routes';
import { registerHealthRoutes } from './health-routes';
import { registerVersionRoutes } from './version-routes';
import { registerCollaborationRoutes } from './collaboration-routes';
import { registerFileRoutes } from './file-routes';
import { registerSearchRoutes } from './search-routes';
import { registerMetadataRoutes } from './metadata-routes';

export function registerRoutes(
  server: FastifyInstance,
  documentController: DocumentController
): void {
  // Register all route groups
  registerHealthRoutes(server);
  registerDocumentRoutes(server, documentController);
  registerVersionRoutes(server, documentController);
  registerCollaborationRoutes(server, documentController);
  registerFileRoutes(server, documentController);
  registerSearchRoutes(server, documentController);
  registerMetadataRoutes(server, documentController);
}
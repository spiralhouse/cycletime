import { FastifyReply, FastifyRequest } from 'fastify';
import { DocumentService } from '../services/document-service';
import { 
  CreateDocumentRequest, 
  UpdateDocumentRequest, 
  DocumentListQuery,
  DocumentQuery,
  DocumentContentQuery,
  DocumentDownloadQuery
} from '../types';
import { logger } from '../utils/logger';

export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  async createDocument(
    request: FastifyRequest<{ Body: CreateDocumentRequest }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { body } = request;
      const userId = this.getUserId(request);

      logger.info('Creating document', { title: body.title, userId });

      const document = await this.documentService.createDocument(body, userId);

      reply.code(201).send({
        document,
        success: true,
        message: 'Document created successfully',
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Failed to create document', { error });
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create document',
        timestamp: new Date()
      });
    }
  }

  async getDocument(
    request: FastifyRequest<{ 
      Params: { documentId: string };
      Querystring: DocumentQuery;
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { documentId } = request.params;
      const { includeContent = false } = request.query;

      logger.info('Getting document', { documentId, includeContent });

      const document = await this.documentService.getDocument(documentId, includeContent);

      if (!document) {
        reply.code(404).send({
          error: 'Not Found',
          message: 'Document not found',
          timestamp: new Date()
        });
        return;
      }

      reply.send({
        document,
        success: true,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Failed to get document', { error });
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve document',
        timestamp: new Date()
      });
    }
  }

  async updateDocument(
    request: FastifyRequest<{ 
      Params: { documentId: string };
      Body: UpdateDocumentRequest;
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { documentId } = request.params;
      const { body } = request;
      const userId = this.getUserId(request);

      logger.info('Updating document', { documentId, userId });

      const document = await this.documentService.updateDocument(documentId, body, userId);

      if (!document) {
        reply.code(404).send({
          error: 'Not Found',
          message: 'Document not found',
          timestamp: new Date()
        });
        return;
      }

      reply.send({
        document,
        success: true,
        message: 'Document updated successfully',
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Failed to update document', { error });
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to update document',
        timestamp: new Date()
      });
    }
  }

  async deleteDocument(
    request: FastifyRequest<{ 
      Params: { documentId: string };
      Querystring: { permanent?: boolean };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { documentId } = request.params;
      const { permanent = false } = request.query;
      const userId = this.getUserId(request);

      logger.info('Deleting document', { documentId, userId, permanent });

      const success = await this.documentService.deleteDocument(documentId, userId, permanent);

      if (!success) {
        reply.code(404).send({
          error: 'Not Found',
          message: 'Document not found',
          timestamp: new Date()
        });
        return;
      }

      reply.code(204).send();
    } catch (error) {
      logger.error('Failed to delete document', { error });
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to delete document',
        timestamp: new Date()
      });
    }
  }

  async listDocuments(
    request: FastifyRequest<{ Querystring: DocumentListQuery }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        type,
        status,
        tag,
        author,
        sortBy = 'updatedAt',
        sortOrder = 'desc'
      } = request.query;

      logger.info('Listing documents', { page, limit, search, type, status });

      const filters = {
        search,
        type,
        status,
        tag,
        author,
        sortBy,
        sortOrder
      };

      const result = await this.documentService.listDocuments(filters, { page, limit });

      const response = {
        documents: result.documents,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
          hasNext: page * limit < result.total,
          hasPrevious: page > 1
        },
        filters: {
          search,
          type,
          status,
          tag,
          author
        },
        facets: this.generateFacets(result.documents),
        success: true,
        timestamp: new Date()
      };

      reply.send(response);
    } catch (error) {
      logger.error('Failed to list documents', { error });
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to list documents',
        timestamp: new Date()
      });
    }
  }

  async getDocumentContent(
    request: FastifyRequest<{ 
      Params: { documentId: string };
      Querystring: DocumentContentQuery;
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { documentId } = request.params;
      const { version } = request.query;

      logger.info('Getting document content', { documentId, version });

      const document = await this.documentService.getDocument(documentId, true);

      if (!document) {
        reply.code(404).send({
          error: 'Not Found',
          message: 'Document not found',
          timestamp: new Date()
        });
        return;
      }

      // Mock content based on document type
      const content = `Mock content for document: ${document.title}\n\nThis is placeholder content that would normally be retrieved from storage.`;

      reply
        .type('application/octet-stream')
        .header('Content-Disposition', `attachment; filename="${document.title}.txt"`)
        .send(Buffer.from(content));
    } catch (error) {
      logger.error('Failed to get document content', { error });
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve document content',
        timestamp: new Date()
      });
    }
  }

  async downloadDocument(
    request: FastifyRequest<{ 
      Params: { documentId: string };
      Querystring: DocumentDownloadQuery;
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { documentId } = request.params;
      const { version, format } = request.query;
      const userId = this.getUserId(request);

      logger.info('Downloading document', { documentId, version, format, userId });

      const result = await this.documentService.downloadDocument(documentId, userId, version, format);

      if (!result) {
        reply.code(404).send({
          error: 'Not Found',
          message: 'Document not found',
          timestamp: new Date()
        });
        return;
      }

      reply
        .type(result.mimeType)
        .header('Content-Disposition', `attachment; filename="${result.filename}"`)
        .send(result.buffer);
    } catch (error) {
      logger.error('Failed to download document', { error });
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to download document',
        timestamp: new Date()
      });
    }
  }

  private getUserId(request: FastifyRequest): string {
    // In a real implementation, this would extract the user ID from the JWT token
    // For now, return a mock user ID
    return 'mock-user-id';
  }

  private generateFacets(documents: any[]) {
    // Generate facets for the UI
    const facets = {
      types: this.generateFacetCounts(documents, 'type'),
      statuses: this.generateFacetCounts(documents, 'status'),
      tags: this.generateTagFacets(documents)
    };

    return facets;
  }

  private generateFacetCounts(documents: any[], field: string) {
    const counts = new Map<string, number>();
    
    documents.forEach(doc => {
      const value = doc[field];
      counts.set(value, (counts.get(value) || 0) + 1);
    });

    return Array.from(counts.entries()).map(([value, count]) => ({ value, count }));
  }

  private generateTagFacets(documents: any[]) {
    const tagCounts = new Map<string, number>();
    
    documents.forEach(doc => {
      doc.tags.forEach((tag: string) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    return Array.from(tagCounts.entries()).map(([value, count]) => ({ value, count }));
  }
}
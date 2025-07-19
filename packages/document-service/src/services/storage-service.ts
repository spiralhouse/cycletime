import { Client } from 'minio';
import { StorageConfig } from '../types';
import { logger } from '../utils/logger';

export class StorageService {
  private client: Client;
  private bucketName: string;

  constructor(config: StorageConfig) {
    this.bucketName = config.bucket;
    
    this.client = new Client({
      endPoint: config.endpoint,
      port: config.endpoint.includes('localhost') ? 9000 : 443,
      useSSL: config.ssl !== false,
      accessKey: config.accessKey,
      secretKey: config.secretKey,
      region: config.region
    });

    this.initializeBucket();
  }

  private async initializeBucket(): Promise<void> {
    try {
      const exists = await this.client.bucketExists(this.bucketName);
      
      if (!exists) {
        await this.client.makeBucket(this.bucketName);
        logger.info('Storage bucket created', { bucket: this.bucketName });
      } else {
        logger.info('Storage bucket already exists', { bucket: this.bucketName });
      }
    } catch (error) {
      logger.error('Failed to initialize storage bucket', { error, bucket: this.bucketName });
      throw error;
    }
  }

  async uploadFile(
    objectName: string, 
    buffer: Buffer, 
    metadata: Record<string, string> = {}
  ): Promise<{ etag: string; location: string }> {
    logger.info('Uploading file to storage', { objectName, size: buffer.length });

    try {
      const result = await this.client.putObject(
        this.bucketName, 
        objectName, 
        buffer, 
        buffer.length, 
        metadata
      );

      const location = `${this.bucketName}/${objectName}`;
      
      logger.info('File uploaded successfully', { objectName, etag: result.etag, location });
      
      return {
        etag: result.etag,
        location
      };
    } catch (error) {
      logger.error('Failed to upload file', { error, objectName });
      throw error;
    }
  }

  async downloadFile(objectName: string): Promise<Buffer> {
    logger.info('Downloading file from storage', { objectName });

    try {
      const stream = await this.client.getObject(this.bucketName, objectName);
      
      const chunks: Buffer[] = [];
      
      return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => {
          const buffer = Buffer.concat(chunks);
          logger.info('File downloaded successfully', { objectName, size: buffer.length });
          resolve(buffer);
        });
        stream.on('error', (error) => {
          logger.error('Failed to download file', { error, objectName });
          reject(error);
        });
      });
    } catch (error) {
      logger.error('Failed to download file', { error, objectName });
      throw error;
    }
  }

  async deleteFile(objectName: string): Promise<void> {
    logger.info('Deleting file from storage', { objectName });

    try {
      await this.client.removeObject(this.bucketName, objectName);
      logger.info('File deleted successfully', { objectName });
    } catch (error) {
      logger.error('Failed to delete file', { error, objectName });
      throw error;
    }
  }

  async fileExists(objectName: string): Promise<boolean> {
    try {
      await this.client.statObject(this.bucketName, objectName);
      return true;
    } catch (error) {
      return false;
    }
  }

  async getFileInfo(objectName: string): Promise<{
    size: number;
    lastModified: Date;
    etag: string;
    contentType: string;
  } | null> {
    try {
      const stat = await this.client.statObject(this.bucketName, objectName);
      
      return {
        size: stat.size,
        lastModified: stat.lastModified,
        etag: stat.etag,
        contentType: stat.metaData['content-type'] || 'application/octet-stream'
      };
    } catch (error) {
      logger.error('Failed to get file info', { error, objectName });
      return null;
    }
  }

  async listFiles(prefix?: string): Promise<string[]> {
    logger.info('Listing files in storage', { prefix });

    try {
      const objects: string[] = [];
      const stream = this.client.listObjects(this.bucketName, prefix);
      
      return new Promise((resolve, reject) => {
        stream.on('data', (obj) => objects.push(obj.name!));
        stream.on('end', () => {
          logger.info('Files listed successfully', { count: objects.length });
          resolve(objects);
        });
        stream.on('error', (error) => {
          logger.error('Failed to list files', { error, prefix });
          reject(error);
        });
      });
    } catch (error) {
      logger.error('Failed to list files', { error, prefix });
      throw error;
    }
  }

  async copyFile(sourceObjectName: string, destObjectName: string): Promise<void> {
    logger.info('Copying file in storage', { sourceObjectName, destObjectName });

    try {
      await this.client.copyObject(
        this.bucketName, 
        destObjectName, 
        `${this.bucketName}/${sourceObjectName}`
      );
      
      logger.info('File copied successfully', { sourceObjectName, destObjectName });
    } catch (error) {
      logger.error('Failed to copy file', { error, sourceObjectName, destObjectName });
      throw error;
    }
  }

  async moveFile(sourceObjectName: string, destObjectName: string): Promise<void> {
    logger.info('Moving file in storage', { sourceObjectName, destObjectName });

    try {
      await this.copyFile(sourceObjectName, destObjectName);
      await this.deleteFile(sourceObjectName);
      
      logger.info('File moved successfully', { sourceObjectName, destObjectName });
    } catch (error) {
      logger.error('Failed to move file', { error, sourceObjectName, destObjectName });
      throw error;
    }
  }

  async generatePresignedUrl(
    objectName: string, 
    expires: number = 3600, 
    method: 'GET' | 'PUT' = 'GET'
  ): Promise<string> {
    logger.info('Generating presigned URL', { objectName, expires, method });

    try {
      const url = await this.client.presignedUrl(method, this.bucketName, objectName, expires);
      
      logger.info('Presigned URL generated successfully', { objectName, method });
      return url;
    } catch (error) {
      logger.error('Failed to generate presigned URL', { error, objectName });
      throw error;
    }
  }

  async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    bucketName: string;
  }> {
    logger.info('Getting storage statistics');

    try {
      const files = await this.listFiles();
      let totalSize = 0;

      for (const file of files) {
        const info = await this.getFileInfo(file);
        if (info) {
          totalSize += info.size;
        }
      }

      const stats = {
        totalFiles: files.length,
        totalSize,
        bucketName: this.bucketName
      };

      logger.info('Storage statistics retrieved', stats);
      return stats;
    } catch (error) {
      logger.error('Failed to get storage statistics', { error });
      throw error;
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    try {
      await this.client.bucketExists(this.bucketName);
      return { healthy: true };
    } catch (error) {
      logger.error('Storage health check failed', { error });
      return { 
        healthy: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}
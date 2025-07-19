import { ServiceConfig } from '../types';

export const config: ServiceConfig = {
  port: parseInt(process.env.PORT || '8004'),
  host: process.env.HOST || '0.0.0.0',
  storage: {
    provider: (process.env.STORAGE_PROVIDER as 'minio' | 's3') || 'minio',
    endpoint: process.env.STORAGE_ENDPOINT || 'localhost',
    accessKey: process.env.STORAGE_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.STORAGE_SECRET_KEY || 'minioadmin',
    bucket: process.env.STORAGE_BUCKET || 'cycletime-documents',
    region: process.env.STORAGE_REGION || 'us-east-1',
    ssl: process.env.STORAGE_SSL === 'true'
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0')
  },
  processing: {
    enabled: process.env.PROCESSING_ENABLED !== 'false',
    concurrency: parseInt(process.env.PROCESSING_CONCURRENCY || '5'),
    timeout: parseInt(process.env.PROCESSING_TIMEOUT || '30000'),
    retryAttempts: parseInt(process.env.PROCESSING_RETRY_ATTEMPTS || '3'),
    retryDelay: parseInt(process.env.PROCESSING_RETRY_DELAY || '1000')
  },
  security: {
    virusScanning: {
      enabled: process.env.VIRUS_SCANNING_ENABLED === 'true',
      quarantineInfected: process.env.QUARANTINE_INFECTED !== 'false'
    },
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'), // 50MB
    allowedTypes: (process.env.ALLOWED_TYPES || 'pdf,docx,txt,md,json,xml,html,csv,xlsx,pptx,jpg,jpeg,png,gif').split(','),
    encryption: {
      enabled: process.env.ENCRYPTION_ENABLED === 'true',
      algorithm: process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm'
    }
  }
};
export interface Document {
  id: string;
  title: string;
  description?: string;
  type: DocumentType;
  mimeType: string;
  size: number;
  status: DocumentStatus;
  version: string;
  checksum: string;
  tags: string[];
  metadata: Record<string, unknown>;
  storageLocation: string;
  author: DocumentAuthor;
  permissions: DocumentPermissions;
  statistics: DocumentStatistics;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export enum DocumentType {
  PDF = 'pdf',
  DOCX = 'docx',
  TXT = 'txt',
  MD = 'md',
  JSON = 'json',
  XML = 'xml',
  HTML = 'html',
  CSV = 'csv',
  XLSX = 'xlsx',
  PPTX = 'pptx',
  IMAGE = 'image'
}

export enum DocumentStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
  DELETED = 'deleted'
}

export interface DocumentAuthor {
  id: string;
  name: string;
  email: string;
}

export interface DocumentPermissions {
  public: boolean;
  readers: string[];
  writers: string[];
  admins: string[];
}

export interface DocumentStatistics {
  viewCount: number;
  downloadCount: number;
  commentCount: number;
  lastAccessed?: Date;
}

export interface DocumentVersion {
  id: string;
  version: string;
  comment?: string;
  size: number;
  checksum: string;
  author: DocumentAuthor;
  changes: VersionChange[];
  createdAt: Date;
}

export interface VersionChange {
  type: 'added' | 'removed' | 'modified';
  path: string;
  description: string;
}

export interface DocumentComment {
  id: string;
  content: string;
  author: DocumentAuthor;
  position?: CommentPosition;
  thread: CommentReply[];
  status: CommentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommentPosition {
  page?: number;
  x?: number;
  y?: number;
  selection?: string;
}

export interface CommentReply {
  id: string;
  content: string;
  author: DocumentAuthor;
  createdAt: Date;
  updatedAt: Date;
}

export enum CommentStatus {
  ACTIVE = 'active',
  RESOLVED = 'resolved',
  DELETED = 'deleted'
}

export interface DocumentMetadata {
  documentId: string;
  metadata: Record<string, unknown>;
  systemMetadata: DocumentSystemMetadata;
  analytics: DocumentAnalytics;
}

export interface DocumentSystemMetadata {
  extractedText?: string;
  language?: string;
  pageCount?: number;
  wordCount?: number;
  readingTime?: number;
  lastIndexed?: Date;
  processingStatus: ProcessingStatus;
}

export enum ProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface DocumentAnalytics {
  viewCount: number;
  downloadCount: number;
  shareCount: number;
  commentCount: number;
  lastAccessed?: Date;
  topViewers: ViewerStats[];
}

export interface ViewerStats {
  userId: string;
  viewCount: number;
  lastViewed: Date;
}

export interface ShareInfo {
  shareId: string;
  shareLink: string;
  permissions: string[];
  expiresAt?: Date;
  createdAt: Date;
}

export interface CreateDocumentRequest {
  title: string;
  description?: string;
  type: DocumentType;
  content?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  status?: DocumentStatus;
}

export interface UpdateDocumentRequest {
  title?: string;
  description?: string;
  content?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  status?: DocumentStatus;
  version?: string;
}

export interface SearchRequest {
  query: string;
  filters?: SearchFilters;
  facets?: string[];
  sort?: SortOptions;
  pagination?: PaginationOptions;
  highlight?: HighlightOptions;
}

export interface SearchFilters {
  type?: string[];
  status?: string[];
  tags?: string[];
  author?: string[];
  dateRange?: DateRange;
}

export interface DateRange {
  from?: Date;
  to?: Date;
}

export interface SortOptions {
  field: 'relevance' | 'createdAt' | 'updatedAt' | 'title' | 'size';
  order: 'asc' | 'desc';
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface HighlightOptions {
  enabled: boolean;
  fields?: string[];
  fragmentSize?: number;
  maxFragments?: number;
}

export interface SearchResult {
  document: Document;
  score: number;
  highlights?: Record<string, string[]>;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  pagination: PaginationInfo;
  facets?: Record<string, FacetValue[]>;
  statistics: SearchStatistics;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface FacetValue {
  value: string;
  count: number;
}

export interface SearchStatistics {
  totalDocuments: number;
  searchTime: number;
  maxScore: number;
}

export interface UploadResult {
  documentId: string;
  filename: string;
  originalName: string;
  size: number;
  checksum: string;
  storageLocation: string;
  processingStatus: ProcessingStatus;
}

export interface ProcessingResult {
  documentId: string;
  processingType: ProcessingType;
  status: ProcessingStatus;
  processingTime: number;
  results?: ProcessingData;
  errors?: ProcessingError[];
}

export enum ProcessingType {
  TEXT_EXTRACTION = 'text-extraction',
  THUMBNAIL_GENERATION = 'thumbnail-generation',
  FORMAT_CONVERSION = 'format-conversion',
  VIRUS_SCAN = 'virus-scan',
  INDEXING = 'indexing'
}

export interface ProcessingData {
  extractedText?: string;
  pageCount?: number;
  wordCount?: number;
  language?: string;
  thumbnailGenerated?: boolean;
  formatConverted?: boolean;
  virusScanResult?: 'clean' | 'infected' | 'failed';
  indexingResult?: 'indexed' | 'failed' | 'partial';
}

export interface ProcessingError {
  type: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ServiceConfig {
  port: number;
  host: string;
  storage: StorageConfig;
  redis: RedisConfig;
  processing: ProcessingConfig;
  security: SecurityConfig;
}

export interface StorageConfig {
  provider: 'minio' | 's3';
  endpoint: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
  region?: string;
  ssl?: boolean;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
}

export interface ProcessingConfig {
  enabled: boolean;
  concurrency: number;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface SecurityConfig {
  virusScanning: {
    enabled: boolean;
    quarantineInfected: boolean;
  };
  maxFileSize: number;
  allowedTypes: string[];
  encryption: {
    enabled: boolean;
    algorithm: string;
  };
}
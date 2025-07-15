/**
 * Common types and interfaces shared across CycleTime services
 */

/**
 * Standard API response wrapper
 */
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: APIError;
  metadata?: {
    requestId: string;
    timestamp: string;
    version?: string;
  };
}

/**
 * Standard API error structure
 */
export interface APIError {
  code: string;
  message: string;
  details?: unknown;
  field?: string;
}

/**
 * Common HTTP status codes
 */
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  ACCEPTED = 202,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  RATE_LIMITED = 429,
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504
}

/**
 * Common pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

/**
 * Common pagination response metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> extends APIResponse<T[]> {
  data: T[];
  pagination: PaginationMeta;
}

/**
 * Common timestamp fields
 */
export interface Timestamps {
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * Soft delete timestamp
 */
export interface SoftDelete {
  deletedAt: Date | string | null;
}

/**
 * Base entity with ID and timestamps
 */
export interface BaseEntity extends Timestamps {
  id: string;
}

/**
 * Base entity with soft delete support
 */
export interface BaseEntityWithSoftDelete extends BaseEntity, SoftDelete {}
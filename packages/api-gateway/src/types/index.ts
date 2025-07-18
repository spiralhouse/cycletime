/**
 * API Gateway TypeScript type definitions
 * Centralized export for all gateway-related types
 */

import { FastifyRequest } from 'fastify';

// Re-export all gateway types from gateway-types.ts
export * from './gateway-types';

// Legacy types (preserve existing functionality)
export interface UserContext {
  id: string;
  email: string;
  githubUsername: string;
  name: string;
  avatarUrl: string;
}

export interface APIKeyContext {
  id: string;
  user_id: string;
  name: string;
  permissions: string[];
  last_used_at: Date;
}

export interface ProjectPermission {
  project_id: string;
  user_id: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  permissions: {
    read: boolean;
    write: boolean;
    admin: boolean;
    delete: boolean;
  };
}

export type APIKeyPermission = 
  | 'projects:read'
  | 'projects:write'
  | 'documents:read'
  | 'documents:write'
  | 'ai:request'
  | 'github:read'
  | 'linear:read'
  | 'linear:write';

export interface APIErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
    request_id: string;
  };
}

// Enhanced JWT payload structure (merging legacy and new)
export interface JWTPayload {
  sub: string;        // User ID
  email: string;      // User email
  name: string;       // User name
  roles: string[];    // User roles
  permissions: string[]; // User permissions
  github_id?: number;  // GitHub user ID (optional for backwards compatibility)
  github_username?: string; // GitHub username (optional for backwards compatibility)
  iat: number;        // Issued at
  exp: number;        // Expires at
  aud: string;        // Audience
  iss: string;        // Issuer
  jti: string;        // JWT ID
}

// Refresh token payload
export interface RefreshTokenPayload {
  sub: string; // user id
  tokenId: string;
  iat: number;
  exp: number;
  aud: string;
  iss: string;
}

// Fastify-specific types
export interface FastifyRequestContext {
  requestId: string;
  user?: {
    id: string;
    email: string;
    name: string;
    roles: string[];
    permissions: string[];
  };
  clientIp: string;
  userAgent: string;
  timestamp: string;
}

// Declare module augmentation for Fastify
declare module 'fastify' {
  interface FastifyRequest {
    context: FastifyRequestContext;
  }
}

// Plugin options types
export interface AuthPluginOptions {
  jwtSecret: string;
  tokenExpirationTime: number;
  refreshTokenExpirationTime: number;
  excludedRoutes?: string[];
}

export interface RateLimitPluginOptions {
  global: {
    max: number;
    timeWindow: number;
  };
  endpoints: Array<{
    path: string;
    method: string;
    max: number;
    timeWindow: number;
  }>;
  keyGenerator?: (request: any) => string;
  errorResponse?: (request: any, context: any) => any;
}

export interface ServiceDiscoveryPluginOptions {
  consulUrl?: string;
  etcdUrl?: string;
  healthCheckInterval: number;
  serviceTimeout: number;
  retryAttempts: number;
}

export interface ProxyPluginOptions {
  services: Array<{
    name: string;
    prefix: string;
    upstream: string;
    rewritePrefix?: string;
    healthCheckPath?: string;
  }>;
  timeout: number;
  retries: number;
  mockResponses?: {
    enabled: boolean;
    defaultDelay?: number;
    errorRate?: number;
  };
}

// Validation schema types
export interface ValidationSchema {
  body?: any;
  querystring?: any;
  params?: any;
  headers?: any;
  response?: Record<string, any>;
}

// Common response wrappers
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  timestamp: string;
  requestId: string;
}

export interface ApiError {
  error: string;
  message: string;
  code?: string;
  statusCode: number;
  timestamp: string;
  requestId: string;
  details?: Record<string, any>;
}

export interface PaginatedApiResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// Utility types
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
export type ServiceStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';
export type RateLimitType = 'per_second' | 'per_minute' | 'per_hour' | 'per_day';
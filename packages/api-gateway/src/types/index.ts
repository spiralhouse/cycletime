import { FastifyRequest } from 'fastify';

// User context for authenticated requests
export interface UserContext {
  id: string;
  email: string;
  github_id: number;
  github_username: string;
  name: string;
}

// API Key context for machine-to-machine requests
export interface APIKeyContext {
  id: string;
  user_id: string;
  name: string;
  permissions: string[];
  last_used_at: Date;
}

// Extended Fastify request with authentication context
export interface AuthenticatedRequest extends FastifyRequest {
  user?: UserContext;
  apiKey?: APIKeyContext;
}

// JWT payload structure
export interface JWTPayload {
  sub: string;        // User ID
  email: string;      // User email
  github_id: number;  // GitHub user ID
  github_username: string;
  iat: number;        // Issued at
  exp: number;        // Expires at
}

// Project permission structure
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

// API Key permission types
export type APIKeyPermission = 
  | 'projects:read'
  | 'projects:write'
  | 'documents:read'
  | 'documents:write'
  | 'ai:request'
  | 'github:read'
  | 'linear:read'
  | 'linear:write';

// Standard API error response
export interface APIErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
    request_id: string;
  };
}
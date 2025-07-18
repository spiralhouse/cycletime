/**
 * Authentication and authorization types
 */

import { BaseEntity } from './common';

/**
 * User entity
 */
export interface User extends BaseEntity {
  email: string;
  githubUsername: string;
  name: string;
  avatarUrl: string;
  githubId: number;
}

/**
 * User context for authenticated requests
 */
export interface UserContext {
  id: string;
  email: string;
  githubUsername: string;
  name: string;
  avatarUrl: string;
}

/**
 * JWT payload structure
 */
export interface JWTPayload {
  sub: string;        // User ID
  email: string;      // User email
  github_id: number;  // GitHub user ID
  github_username: string;
  name: string;
  avatar_url: string;
  iat: number;        // Issued at
  exp: number;        // Expires at
}

/**
 * API Key entity
 */
export interface APIKey extends BaseEntity {
  userId: string;
  name: string;
  keyHash: string;
  permissions: APIKeyPermission[];
  lastUsedAt: Date | string | null;
  expiresAt: Date | string | null;
  isActive: boolean;
}

/**
 * API Key context for machine-to-machine requests
 */
export interface APIKeyContext {
  id: string;
  userId: string;
  name: string;
  permissions: APIKeyPermission[];
  lastUsedAt: Date | string | null;
}

/**
 * API Key permission types
 */
export type APIKeyPermission = 
  | 'projects:read'
  | 'projects:write'
  | 'projects:delete'
  | 'documents:read'
  | 'documents:write'
  | 'documents:delete'
  | 'ai:request'
  | 'github:read'
  | 'linear:read'
  | 'linear:write';

/**
 * Project roles
 */
export enum ProjectRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER'
}

/**
 * Project permission structure
 */
export interface ProjectPermission extends BaseEntity {
  projectId: string;
  userId: string;
  role: ProjectRole;
  permissions: {
    read: boolean;
    write: boolean;
    admin: boolean;
    delete: boolean;
  };
}

/**
 * Authentication request/response types
 */
export interface AuthCallbackParams {
  code: string;
  state?: string;
}

export interface AuthResponse {
  token: string;
  user: UserContext;
  expiresAt: string;
}
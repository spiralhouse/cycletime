/**
 * TypeScript type definitions for API Gateway contracts
 * Generated from OpenAPI and AsyncAPI specifications
 */

// Health and Status Types
export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  services: Record<string, ServiceHealthStatus>;
}

export interface ServiceHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  lastCheck: string;
}

export interface MetricsResponse {
  requestCount: Record<string, number>;
  responseTime: {
    average: number;
    p95: number;
    p99: number;
  };
  errorRate: Record<string, number>;
  rateLimitHits: Record<string, number>;
  activeConnections: number;
  timestamp: string;
}

// Authentication Types
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  user: UserProfile;
}

export interface LogoutResponse {
  message: string;
  timestamp: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
  createdAt: string;
  lastLogin?: string;
}

// Service Management Types
export interface ServiceListResponse {
  services: ServiceInfo[];
  total: number;
  timestamp: string;
}

export interface ServiceInfo {
  id: string;
  name: string;
  version: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  url: string;
  healthCheckUrl?: string;
  lastHealthCheck?: string;
  responseTime?: number;
  registeredAt: string;
}

export interface ServiceDetailsResponse {
  service: ServiceInfo;
  endpoints: EndpointInfo[];
  metrics: ServiceMetrics;
  configuration: Record<string, any>;
}

export interface EndpointInfo {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  description?: string;
  rateLimitEnabled: boolean;
  rateLimitConfig?: RateLimitEndpointConfig;
}

export interface ServiceMetrics {
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  lastHour: {
    requests: number;
    errors: number;
  };
}

// Rate Limiting Types
export interface RateLimitConfig {
  global: RateLimitGlobalConfig;
  endpoints: RateLimitEndpointConfig[];
  ipWhitelist: string[];
  ipBlacklist: string[];
}

export interface RateLimitGlobalConfig {
  enabled: boolean;
  requestsPerMinute?: number;
  requestsPerHour?: number;
  requestsPerDay?: number;
  burstLimit?: number;
}

export interface RateLimitEndpointConfig {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | '*';
  requestsPerMinute?: number;
  requestsPerHour?: number;
  requestsPerDay?: number;
  burstLimit?: number;
  enabled: boolean;
}

// Error Types
export interface ErrorResponse {
  error: string;
  message: string;
  code?: string;
  timestamp: string;
  path?: string;
  requestId?: string;
  details?: Record<string, any>;
}

// Event Types for AsyncAPI
export interface GatewayRequestPayload {
  requestId: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  path: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body?: any;
  clientIp: string;
  userAgent: string;
  timestamp: string;
  userId?: string;
}

export interface GatewayRequestRoutedPayload {
  requestId: string;
  targetService: string;
  targetUrl: string;
  routingRule: string;
  routingTime: number;
  timestamp: string;
}

export interface GatewayRequestCompletedPayload {
  requestId: string;
  statusCode: number;
  responseTime: number;
  bytesIn?: number;
  bytesOut?: number;
  timestamp: string;
}

export interface GatewayRequestFailedPayload {
  requestId: string;
  statusCode: number;
  errorCode: string;
  errorMessage: string;
  responseTime: number;
  timestamp: string;
}

export interface GatewayAuthPayload {
  userId: string;
  email?: string;
  authMethod: 'jwt' | 'oauth2' | 'api_key';
  timestamp: string;
  clientIp: string;
  userAgent?: string;
}

export interface GatewayAuthFailedPayload {
  reason: 'invalid_token' | 'expired_token' | 'invalid_credentials' | 'missing_token' | 'insufficient_permissions';
  message: string;
  timestamp: string;
  clientIp: string;
  userAgent?: string;
  attemptedPath?: string;
}

export interface GatewayAuthTokenRefreshedPayload {
  userId: string;
  oldTokenId: string;
  newTokenId: string;
  timestamp: string;
  clientIp: string;
}

export interface GatewayAuthLogoutPayload {
  userId: string;
  tokenId: string;
  timestamp: string;
  clientIp: string;
}

export interface GatewayRateLimitPayload {
  clientIp: string;
  endpoint: string;
  method: string;
  userId?: string;
  limitType: 'per_second' | 'per_minute' | 'per_hour' | 'per_day';
  limit: number;
  currentCount: number;
  resetTime: string;
  timestamp: string;
}

export interface GatewayRateLimitWarningPayload {
  clientIp: string;
  endpoint: string;
  method: string;
  userId?: string;
  limitType: 'per_second' | 'per_minute' | 'per_hour' | 'per_day';
  limit: number;
  currentCount: number;
  thresholdPercentage: number;
  resetTime: string;
  timestamp: string;
}

export interface GatewayRateLimitResetPayload {
  limitType: 'per_second' | 'per_minute' | 'per_hour' | 'per_day';
  resetTime: string;
  timestamp: string;
}

export interface ServiceHealthPayload {
  serviceId: string;
  serviceName: string;
  previousStatus: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  currentStatus: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  healthCheckUrl?: string;
  responseTime?: number;
  errorMessage?: string;
  timestamp: string;
}

export interface ServiceRegisteredPayload {
  serviceId: string;
  serviceName: string;
  serviceUrl: string;
  healthCheckUrl?: string;
  version: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface ServiceDeregisteredPayload {
  serviceId: string;
  serviceName: string;
  reason: 'planned_maintenance' | 'service_shutdown' | 'health_check_failed' | 'manual_removal';
  timestamp: string;
}

export interface ServiceDiscoveryPayload {
  updateType: 'health_check' | 'configuration' | 'routing_rules' | 'load_balancer';
  affectedServices: string[];
  timestamp: string;
}

export interface GatewayConfigPayload {
  configSection: string;
  updatedBy: string;
  changes: Array<{
    field: string;
    oldValue: string;
    newValue: string;
  }>;
  timestamp: string;
}

export interface GatewayMetricsPayload {
  totalRequests: number;
  totalErrors: number;
  averageResponseTime: number;
  activeConnections: number;
  rateLimitViolations: number;
  topEndpoints: Array<{
    endpoint: string;
    requests: number;
  }>;
  timestamp: string;
}

export interface GatewayAlertPayload {
  alertType: 'high_error_rate' | 'high_response_time' | 'service_down' | 'rate_limit_abuse' | 'security_threat';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  currentValue?: number;
  threshold?: number;
  affectedServices?: string[];
  timestamp: string;
}

// Configuration Types
export interface GatewayConfig {
  server: {
    host: string;
    port: number;
    environment: string;
  };
  auth: {
    jwtSecret: string;
    tokenExpirationTime: number;
    refreshTokenExpirationTime: number;
  };
  rateLimit: RateLimitConfig;
  services: ServiceConfig[];
  monitoring: {
    enabled: boolean;
    metricsInterval: number;
    healthCheckInterval: number;
  };
  logging: {
    level: string;
    format: string;
  };
}

export interface ServiceConfig {
  id: string;
  name: string;
  url: string;
  healthCheckUrl?: string;
  timeout: number;
  retries: number;
  circuitBreaker: {
    enabled: boolean;
    threshold: number;
    timeout: number;
  };
  loadBalancer: {
    strategy: 'round_robin' | 'least_connections' | 'random';
    healthyOnly: boolean;
  };
}

// Middleware Types
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
}

export interface RequestContext {
  requestId: string;
  user?: AuthenticatedUser;
  clientIp: string;
  userAgent: string;
  timestamp: string;
  route?: {
    path: string;
    method: string;
    targetService?: string;
  };
}

// Event Publisher Types
export interface EventPublisher {
  publish(channel: string, event: string, payload: any): Promise<void>;
}

// Service Discovery Types
export interface ServiceDiscovery {
  register(service: ServiceConfig): Promise<void>;
  deregister(serviceId: string): Promise<void>;
  discover(serviceId: string): Promise<ServiceInfo | null>;
  listServices(): Promise<ServiceInfo[]>;
  healthCheck(serviceId: string): Promise<ServiceHealthStatus>;
}

// Load Balancer Types
export interface LoadBalancer {
  selectInstance(serviceId: string): Promise<ServiceInfo | null>;
  updateHealthStatus(serviceId: string, status: ServiceHealthStatus): Promise<void>;
}

// Circuit Breaker Types
export interface CircuitBreaker {
  isOpen(serviceId: string): boolean;
  recordSuccess(serviceId: string): void;
  recordFailure(serviceId: string): void;
  reset(serviceId: string): void;
}

// Gateway Event Types
export type GatewayEvent = 
  | { type: 'gateway.request.received'; payload: GatewayRequestPayload }
  | { type: 'gateway.request.routed'; payload: GatewayRequestRoutedPayload }
  | { type: 'gateway.request.completed'; payload: GatewayRequestCompletedPayload }
  | { type: 'gateway.request.failed'; payload: GatewayRequestFailedPayload }
  | { type: 'gateway.auth.success'; payload: GatewayAuthPayload }
  | { type: 'gateway.auth.failed'; payload: GatewayAuthFailedPayload }
  | { type: 'gateway.auth.token.refreshed'; payload: GatewayAuthTokenRefreshedPayload }
  | { type: 'gateway.auth.logout'; payload: GatewayAuthLogoutPayload }
  | { type: 'gateway.rate.limit.exceeded'; payload: GatewayRateLimitPayload }
  | { type: 'gateway.rate.limit.warning'; payload: GatewayRateLimitWarningPayload }
  | { type: 'gateway.rate.limit.reset'; payload: GatewayRateLimitResetPayload }
  | { type: 'service.health.changed'; payload: ServiceHealthPayload }
  | { type: 'service.registered'; payload: ServiceRegisteredPayload }
  | { type: 'service.deregistered'; payload: ServiceDeregisteredPayload }
  | { type: 'service.discovery.updated'; payload: ServiceDiscoveryPayload }
  | { type: 'gateway.config.updated'; payload: GatewayConfigPayload }
  | { type: 'gateway.metrics.snapshot'; payload: GatewayMetricsPayload }
  | { type: 'gateway.alert.triggered'; payload: GatewayAlertPayload };

// Export type aliases for easier imports
export type GatewayEventType = GatewayEvent['type'];
export type GatewayEventPayload<T extends GatewayEventType> = Extract<GatewayEvent, { type: T }>['payload'];
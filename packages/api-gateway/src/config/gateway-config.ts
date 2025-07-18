/**
 * API Gateway Configuration
 * Centralized configuration for all gateway settings
 */

import { GatewayConfig } from '../types';

export const config: GatewayConfig = {
  server: {
    host: process.env.GATEWAY_HOST || '0.0.0.0',
    port: parseInt(process.env.GATEWAY_PORT || '8000', 10),
    environment: process.env.NODE_ENV || 'development',
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    tokenExpirationTime: parseInt(process.env.TOKEN_EXPIRATION_TIME || '3600', 10), // 1 hour
    refreshTokenExpirationTime: parseInt(process.env.REFRESH_TOKEN_EXPIRATION_TIME || '604800', 10), // 7 days
  },
  rateLimit: {
    global: {
      enabled: true,
      requestsPerMinute: parseInt(process.env.RATE_LIMIT_GLOBAL_PER_MINUTE || '100', 10),
      requestsPerHour: parseInt(process.env.RATE_LIMIT_GLOBAL_PER_HOUR || '1000', 10),
      requestsPerDay: parseInt(process.env.RATE_LIMIT_GLOBAL_PER_DAY || '10000', 10),
      burstLimit: parseInt(process.env.RATE_LIMIT_BURST || '10', 10),
    },
    endpoints: [
      {
        path: '/auth/login',
        method: 'POST',
        requestsPerMinute: 10,
        requestsPerHour: 50,
        requestsPerDay: 100,
        burstLimit: 5,
        enabled: true,
      },
      {
        path: '/auth/refresh',
        method: 'POST',
        requestsPerMinute: 20,
        requestsPerHour: 100,
        requestsPerDay: 500,
        burstLimit: 10,
        enabled: true,
      },
      {
        path: '/api/v1/ai-service/*',
        method: '*',
        requestsPerMinute: 60,
        requestsPerHour: 500,
        requestsPerDay: 2000,
        burstLimit: 15,
        enabled: true,
      },
      {
        path: '/api/v1/project-service/*',
        method: '*',
        requestsPerMinute: 60,
        requestsPerHour: 500,
        requestsPerDay: 2000,
        burstLimit: 15,
        enabled: true,
      },
      {
        path: '/api/v1/task-service/*',
        method: '*',
        requestsPerMinute: 60,
        requestsPerHour: 500,
        requestsPerDay: 2000,
        burstLimit: 15,
        enabled: true,
      },
      {
        path: '/api/v1/standards-engine/*',
        method: '*',
        requestsPerMinute: 60,
        requestsPerHour: 500,
        requestsPerDay: 2000,
        burstLimit: 15,
        enabled: true,
      },
      {
        path: '/api/v1/notification-service/*',
        method: '*',
        requestsPerMinute: 60,
        requestsPerHour: 500,
        requestsPerDay: 2000,
        burstLimit: 15,
        enabled: true,
      },
      {
        path: '/api/v1/document-indexing-service/*',
        method: '*',
        requestsPerMinute: 60,
        requestsPerHour: 500,
        requestsPerDay: 2000,
        burstLimit: 15,
        enabled: true,
      },
      {
        path: '/api/v1/contract-generation-engine/*',
        method: '*',
        requestsPerMinute: 60,
        requestsPerHour: 500,
        requestsPerDay: 2000,
        burstLimit: 15,
        enabled: true,
      },
      {
        path: '/api/v1/mcp-server/*',
        method: '*',
        requestsPerMinute: 60,
        requestsPerHour: 500,
        requestsPerDay: 2000,
        burstLimit: 15,
        enabled: true,
      },
      {
        path: '/api/v1/cli-service/*',
        method: '*',
        requestsPerMinute: 60,
        requestsPerHour: 500,
        requestsPerDay: 2000,
        burstLimit: 15,
        enabled: true,
      },
      {
        path: '/admin/*',
        method: '*',
        requestsPerMinute: 30,
        requestsPerHour: 200,
        requestsPerDay: 1000,
        burstLimit: 5,
        enabled: true,
      },
    ],
    ipWhitelist: process.env.RATE_LIMIT_IP_WHITELIST?.split(',') || [],
    ipBlacklist: process.env.RATE_LIMIT_IP_BLACKLIST?.split(',') || [],
  },
  services: [
    {
      id: 'ai-service',
      name: 'ai-service',
      url: process.env.AI_SERVICE_URL || 'http://localhost:8080',
      healthCheckUrl: process.env.AI_SERVICE_HEALTH_URL || 'http://localhost:8080/health',
      timeout: 30000,
      retries: 3,
      circuitBreaker: {
        enabled: true,
        threshold: 5,
        timeout: 60000,
      },
      loadBalancer: {
        strategy: 'round_robin',
        healthyOnly: true,
      },
    },
    {
      id: 'context-management-service',
      name: 'context-management-service',
      url: process.env.CONTEXT_MANAGEMENT_SERVICE_URL || 'http://localhost:8020',
      healthCheckUrl: process.env.CONTEXT_MANAGEMENT_SERVICE_HEALTH_URL || 'http://localhost:8020/health',
      timeout: 30000,
      retries: 3,
      circuitBreaker: {
        enabled: true,
        threshold: 5,
        timeout: 60000,
      },
      loadBalancer: {
        strategy: 'round_robin',
        healthyOnly: true,
      },
    },
    {
      id: 'issue-tracker-service',
      name: 'issue-tracker-service',
      url: process.env.ISSUE_TRACKER_SERVICE_URL || 'http://localhost:8030',
      healthCheckUrl: process.env.ISSUE_TRACKER_SERVICE_HEALTH_URL || 'http://localhost:8030/health',
      timeout: 30000,
      retries: 3,
      circuitBreaker: {
        enabled: true,
        threshold: 5,
        timeout: 60000,
      },
      loadBalancer: {
        strategy: 'round_robin',
        healthyOnly: true,
      },
    },
    {
      id: 'document-service',
      name: 'document-service',
      url: process.env.DOCUMENT_SERVICE_URL || 'http://localhost:8040',
      healthCheckUrl: process.env.DOCUMENT_SERVICE_HEALTH_URL || 'http://localhost:8040/health',
      timeout: 30000,
      retries: 3,
      circuitBreaker: {
        enabled: true,
        threshold: 5,
        timeout: 60000,
      },
      loadBalancer: {
        strategy: 'round_robin',
        healthyOnly: true,
      },
    },
    {
      id: 'web-dashboard',
      name: 'web-dashboard',
      url: process.env.WEB_DASHBOARD_URL || 'http://localhost:8050',
      healthCheckUrl: process.env.WEB_DASHBOARD_HEALTH_URL || 'http://localhost:8050/health',
      timeout: 30000,
      retries: 3,
      circuitBreaker: {
        enabled: true,
        threshold: 5,
        timeout: 60000,
      },
      loadBalancer: {
        strategy: 'round_robin',
        healthyOnly: true,
      },
    },
    {
      id: 'project-service',
      name: 'project-service',
      url: process.env.PROJECT_SERVICE_URL || 'http://localhost:8010',
      healthCheckUrl: process.env.PROJECT_SERVICE_HEALTH_URL || 'http://localhost:8010/health',
      timeout: 30000,
      retries: 3,
      circuitBreaker: {
        enabled: true,
        threshold: 5,
        timeout: 60000,
      },
      loadBalancer: {
        strategy: 'round_robin',
        healthyOnly: true,
      },
    },
    {
      id: 'task-service',
      name: 'task-service',
      url: process.env.TASK_SERVICE_URL || 'http://localhost:8011',
      healthCheckUrl: process.env.TASK_SERVICE_HEALTH_URL || 'http://localhost:8011/health',
      timeout: 30000,
      retries: 3,
      circuitBreaker: {
        enabled: true,
        threshold: 5,
        timeout: 60000,
      },
      loadBalancer: {
        strategy: 'round_robin',
        healthyOnly: true,
      },
    },
    {
      id: 'standards-engine',
      name: 'standards-engine',
      url: process.env.STANDARDS_ENGINE_URL || 'http://localhost:8012',
      healthCheckUrl: process.env.STANDARDS_ENGINE_HEALTH_URL || 'http://localhost:8012/health',
      timeout: 30000,
      retries: 3,
      circuitBreaker: {
        enabled: true,
        threshold: 5,
        timeout: 60000,
      },
      loadBalancer: {
        strategy: 'round_robin',
        healthyOnly: true,
      },
    },
    {
      id: 'notification-service',
      name: 'notification-service',
      url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:8013',
      healthCheckUrl: process.env.NOTIFICATION_SERVICE_HEALTH_URL || 'http://localhost:8013/health',
      timeout: 30000,
      retries: 3,
      circuitBreaker: {
        enabled: true,
        threshold: 5,
        timeout: 60000,
      },
      loadBalancer: {
        strategy: 'round_robin',
        healthyOnly: true,
      },
    },
    {
      id: 'document-indexing-service',
      name: 'document-indexing-service',
      url: process.env.DOCUMENT_INDEXING_SERVICE_URL || 'http://localhost:8014',
      healthCheckUrl: process.env.DOCUMENT_INDEXING_SERVICE_HEALTH_URL || 'http://localhost:8014/health',
      timeout: 30000,
      retries: 3,
      circuitBreaker: {
        enabled: true,
        threshold: 5,
        timeout: 60000,
      },
      loadBalancer: {
        strategy: 'round_robin',
        healthyOnly: true,
      },
    },
    {
      id: 'contract-generation-engine',
      name: 'contract-generation-engine',
      url: process.env.CONTRACT_GENERATION_ENGINE_URL || 'http://localhost:8015',
      healthCheckUrl: process.env.CONTRACT_GENERATION_ENGINE_HEALTH_URL || 'http://localhost:8015/health',
      timeout: 30000,
      retries: 3,
      circuitBreaker: {
        enabled: true,
        threshold: 5,
        timeout: 60000,
      },
      loadBalancer: {
        strategy: 'round_robin',
        healthyOnly: true,
      },
    },
    {
      id: 'mcp-server',
      name: 'mcp-server',
      url: process.env.MCP_SERVER_URL || 'http://localhost:8016',
      healthCheckUrl: process.env.MCP_SERVER_HEALTH_URL || 'http://localhost:8016/health',
      timeout: 30000,
      retries: 3,
      circuitBreaker: {
        enabled: true,
        threshold: 5,
        timeout: 60000,
      },
      loadBalancer: {
        strategy: 'round_robin',
        healthyOnly: true,
      },
    },
    {
      id: 'cli-service',
      name: 'cli-service',
      url: process.env.CLI_SERVICE_URL || 'http://localhost:8017',
      healthCheckUrl: process.env.CLI_SERVICE_HEALTH_URL || 'http://localhost:8017/health',
      timeout: 30000,
      retries: 3,
      circuitBreaker: {
        enabled: true,
        threshold: 5,
        timeout: 60000,
      },
      loadBalancer: {
        strategy: 'round_robin',
        healthyOnly: true,
      },
    },
  ],
  monitoring: {
    enabled: true,
    metricsInterval: parseInt(process.env.METRICS_INTERVAL || '60000', 10), // 1 minute
    healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10), // 30 seconds
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },
};

// Validate critical configuration
if (!config.auth.jwtSecret || config.auth.jwtSecret === 'your-super-secret-jwt-key-change-this-in-production') {
  console.warn('WARNING: Using default JWT secret. This is insecure for production!');
}

export default config;
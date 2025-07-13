import { z } from 'zod';

// Configuration schema
const configSchema = z.object({
  // Server Configuration
  port: z.number().int().min(1).max(65535).default(3000),
  host: z.string().default('0.0.0.0'),
  nodeEnv: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  logLevel: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Database
  databaseUrl: z.string().url(),

  // GitHub OAuth
  githubClientId: z.string().min(1),
  githubClientSecret: z.string().min(1),
  githubRedirectUri: z.string().url(),

  // JWT Configuration
  jwtSecret: z.string().min(32),
  jwtAccessExpiry: z.string().default('1h'),
  jwtRefreshExpiry: z.string().default('30d'),

  // Rate Limiting
  rateLimitWindowMs: z.number().int().positive().default(3600000), // 1 hour
  rateLimitMaxRequests: z.number().int().positive().default(1000),

  // Service URLs
  documentServiceUrl: z.string().url().optional(),
  aiServiceUrl: z.string().url().optional(),
  githubServiceUrl: z.string().url().optional(),
  linearServiceUrl: z.string().url().optional(),

  // CORS Origins
  corsOrigins: z.array(z.string()).default([
    'https://cycletime.ai',
    'https://staging.cycletime.ai',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ]),
});

// Parse environment variables
const parseConfig = () => {
  const envConfig = {
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : undefined,
    host: process.env.HOST,
    nodeEnv: process.env.NODE_ENV,
    logLevel: process.env.LOG_LEVEL,
    
    databaseUrl: process.env.DATABASE_URL,
    
    githubClientId: process.env.GITHUB_CLIENT_ID,
    githubClientSecret: process.env.GITHUB_CLIENT_SECRET,
    githubRedirectUri: process.env.GITHUB_REDIRECT_URI,
    
    jwtSecret: process.env.JWT_SECRET,
    jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRY,
    jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY,
    
    rateLimitWindowMs: process.env.RATE_LIMIT_WINDOW_MS ? 
      parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) : undefined,
    rateLimitMaxRequests: process.env.RATE_LIMIT_MAX_REQUESTS ? 
      parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) : undefined,
    
    documentServiceUrl: process.env.DOCUMENT_SERVICE_URL,
    aiServiceUrl: process.env.AI_SERVICE_URL,
    githubServiceUrl: process.env.GITHUB_SERVICE_URL,
    linearServiceUrl: process.env.LINEAR_SERVICE_URL,
    
    corsOrigins: process.env.CORS_ORIGINS ? 
      process.env.CORS_ORIGINS.split(',').map(origin => origin.trim()) : undefined,
  };

  try {
    return configSchema.parse(envConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingFields = error.errors
        .filter(err => err.code === 'invalid_type' && err.received === 'undefined')
        .map(err => err.path.join('.'));
      
      throw new Error(
        `Missing required environment variables: ${missingFields.join(', ')}\n` +
        'Please check your .env file or environment configuration.'
      );
    }
    throw error;
  }
};

export const config = parseConfig();

export type Config = z.infer<typeof configSchema>;
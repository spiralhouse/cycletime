# @cycletime/shared-config

Type-safe configuration management utilities for CycleTime services. This package provides comprehensive configuration loading, validation, and environment handling for all services in the CycleTime ecosystem.

## Features

- **Type-safe configuration** - Full TypeScript support with strict typing
- **Environment variable validation** - Parse and validate environment variables with proper error handling
- **Schema-based configuration** - Define configuration schemas for consistent validation
- **Multi-environment support** - Handle development, test, staging, and production environments
- **Default value management** - Centralized default configuration values
- **Validation with Zod** - Robust validation using Zod schemas
- **Error handling** - Comprehensive error reporting and recovery
- **Security-aware** - Automatic masking of sensitive values in logs
- **Service-specific schemas** - Pre-defined schemas for different service types

## Installation

```bash
npm install @cycletime/shared-config
```

## Quick Start

### Basic Usage

```typescript
import { loadAppConfiguration } from '@cycletime/shared-config';

// Load complete application configuration
const config = loadAppConfiguration();

console.log(`Server running on ${config.server.host}:${config.server.port}`);
console.log(`Database: ${config.database.host}:${config.database.port}`);
```

### Safe Loading with Error Handling

```typescript
import { safeLoadConfiguration } from '@cycletime/shared-config';

const result = safeLoadConfiguration();

if (result.config) {
  // Configuration loaded successfully
  console.log('Configuration loaded');
} else {
  // Handle configuration error
  console.error('Configuration error:', result.error?.message);
}
```

### Environment-specific Configuration

```typescript
import { loadAppConfiguration } from '@cycletime/shared-config';

// Load configuration for specific environment
const config = loadAppConfiguration({
  environment: 'production',
  strict: true, // Throw on validation errors
});
```

## Environment Variables

The package supports a comprehensive set of environment variables organized by service category:

### Database Configuration
```bash
DATABASE_HOST=localhost              # Database host
DATABASE_PORT=5432                  # Database port
DATABASE_NAME=cycletime_dev         # Database name
DATABASE_USERNAME=cycletime         # Database username
DATABASE_PASSWORD=password          # Database password
DATABASE_SSL=false                  # Enable SSL
DATABASE_POOL_SIZE=10               # Connection pool size
DATABASE_CONNECTION_TIMEOUT=30000   # Connection timeout (ms)
DATABASE_MAX_RETRIES=3              # Max connection retries
```

### Redis Configuration
```bash
REDIS_HOST=localhost                # Redis host
REDIS_PORT=6379                     # Redis port
REDIS_PASSWORD=                     # Redis password (optional)
REDIS_DATABASE=0                    # Redis database number
REDIS_KEY_PREFIX=cycletime:         # Key prefix
REDIS_RETRY_DELAY=100               # Retry delay (ms)
REDIS_MAX_RETRIES=3                 # Max retries per request
```

### Server Configuration
```bash
SERVER_HOST=0.0.0.0                 # Server bind address
SERVER_PORT=3000                    # Server port
SERVER_CORS_ORIGINS=http://localhost:3000  # CORS origins (comma-separated)
SERVER_TRUST_PROXY=false            # Trust proxy headers
SERVER_REQUEST_TIMEOUT=30000        # Request timeout (ms)
SERVER_BODY_LIMIT=1mb               # Request body size limit
```

### Authentication Configuration
```bash
JWT_SECRET=your-super-secret-jwt-key-32-chars-minimum  # JWT signing secret
JWT_EXPIRES_IN=1h                   # JWT expiration
REFRESH_TOKEN_EXPIRES_IN=7d         # Refresh token expiration
GITHUB_CLIENT_ID=your-github-client-id                # GitHub OAuth client ID
GITHUB_CLIENT_SECRET=your-github-client-secret        # GitHub OAuth client secret
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback  # GitHub callback URL
```

### Logging Configuration
```bash
LOG_LEVEL=info                      # Log level (error|warn|info|debug|trace)
LOG_FORMAT=json                     # Log format (json|pretty|simple)
LOG_ENABLE_CONSOLE=true             # Enable console logging
LOG_ENABLE_FILE=false               # Enable file logging
LOG_FILE_PATH=/var/log/cycletime.log  # Log file path
LOG_MAX_FILE_SIZE=10mb              # Max log file size
LOG_MAX_FILES=5                     # Max log files to keep
```

### AI Provider Configuration
```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-key   # OpenAI API key
OPENAI_MODEL=gpt-4                  # OpenAI model
OPENAI_MAX_TOKENS=4000              # Max tokens per request
OPENAI_TEMPERATURE=0.7              # Temperature setting
OPENAI_TIMEOUT=30000                # Request timeout (ms)
OPENAI_RETRIES=3                    # Max retries

# Claude Configuration
CLAUDE_API_KEY=your-claude-key      # Claude API key
CLAUDE_MODEL=claude-3-sonnet-20240229  # Claude model
CLAUDE_MAX_TOKENS=4000              # Max tokens per request
CLAUDE_TEMPERATURE=0.7              # Temperature setting
CLAUDE_TIMEOUT=30000                # Request timeout (ms)
CLAUDE_RETRIES=3                    # Max retries

# AI General
AI_DEFAULT_PROVIDER=claude          # Default AI provider (openai|claude)
```

### Monitoring Configuration
```bash
ENABLE_METRICS=true                 # Enable metrics collection
METRICS_PORT=9090                   # Metrics server port
ENABLE_HEALTH_CHECK=true            # Enable health check endpoint
HEALTH_CHECK_PATH=/health           # Health check endpoint path
ENABLE_PROMETHEUS=false             # Enable Prometheus metrics
```

### Security Configuration
```bash
RATE_LIMIT_WINDOW=900000            # Rate limit window (ms)
RATE_LIMIT_MAX=100                  # Max requests per window
ENABLE_HELMET=true                  # Enable Helmet security middleware
ENABLE_CORS=true                    # Enable CORS middleware
SESSION_SECRET=your-session-secret-32-chars-minimum  # Session secret
CSRF_PROTECTION=true                # Enable CSRF protection
```

### Storage Configuration
```bash
STORAGE_TYPE=local                  # Storage type (local|s3|minio)
STORAGE_BASE_PATH=/tmp/uploads      # Base path for local storage
STORAGE_BUCKET=cycletime-storage    # Storage bucket name
STORAGE_REGION=us-east-1            # Storage region
STORAGE_ENDPOINT=http://localhost:9000  # Storage endpoint (for MinIO)
STORAGE_ACCESS_KEY_ID=minioadmin    # Storage access key
STORAGE_SECRET_ACCESS_KEY=minioadmin  # Storage secret key
```

## API Reference

### Environment Utilities

#### `getCurrentEnvironment(): Environment`
Gets the current environment from NODE_ENV.

```typescript
import { getCurrentEnvironment } from '@cycletime/shared-config';

const env = getCurrentEnvironment(); // 'development' | 'test' | 'staging' | 'production'
```

#### `getRequiredEnvVar(name: string): string`
Gets a required environment variable, throws if not set.

```typescript
import { getRequiredEnvVar } from '@cycletime/shared-config';

const dbPassword = getRequiredEnvVar('DATABASE_PASSWORD');
```

#### `getEnvVar(name: string, defaultValue?: string): string | undefined`
Gets an environment variable with optional default value.

```typescript
import { getEnvVar } from '@cycletime/shared-config';

const host = getEnvVar('DATABASE_HOST', 'localhost');
```

#### `getEnvVarAsNumber(name: string, defaultValue?: number): number | undefined`
Gets an environment variable as a number.

```typescript
import { getEnvVarAsNumber } from '@cycletime/shared-config';

const port = getEnvVarAsNumber('DATABASE_PORT', 5432);
```

#### `getEnvVarAsBoolean(name: string, defaultValue?: boolean): boolean | undefined`
Gets an environment variable as a boolean.

```typescript
import { getEnvVarAsBoolean } from '@cycletime/shared-config';

const ssl = getEnvVarAsBoolean('DATABASE_SSL', false);
```

#### `getEnvVarAsArray(name: string, defaultValue?: string[]): string[] | undefined`
Gets an environment variable as an array (comma-separated).

```typescript
import { getEnvVarAsArray } from '@cycletime/shared-config';

const corsOrigins = getEnvVarAsArray('SERVER_CORS_ORIGINS', []);
```

### Configuration Loading

#### `loadAppConfiguration(options?: ConfigurationOptions): AppConfiguration`
Loads and validates complete application configuration.

```typescript
import { loadAppConfiguration } from '@cycletime/shared-config';

const config = loadAppConfiguration({
  environment: 'production',
  strict: true,
});
```

#### `safeLoadConfiguration(options?: ConfigurationOptions): { config?: AppConfiguration; error?: ConfigurationError }`
Safely loads configuration without throwing errors.

```typescript
import { safeLoadConfiguration } from '@cycletime/shared-config';

const { config, error } = safeLoadConfiguration();
if (error) {
  console.error('Configuration error:', error.message);
  process.exit(1);
}
```

### Validation

#### `validateConfig<T>(schema: ZodSchema<T>, data: unknown): ValidationResult<T>`
Validates configuration using a Zod schema.

```typescript
import { validateConfig, databaseConfigSchema } from '@cycletime/shared-config';

const result = validateConfig(databaseConfigSchema, {
  host: 'localhost',
  port: 5432,
  database: 'testdb',
  username: 'user',
  password: 'password',
});

if (result.success) {
  console.log('Database config is valid:', result.data);
} else {
  console.error('Validation error:', result.error?.message);
}
```

### Configuration Health

#### `validateConfigurationHealth(config: AppConfiguration): Promise<{ healthy: boolean; issues: string[] }>`
Validates configuration health and connectivity requirements.

```typescript
import { loadAppConfiguration, validateConfigurationHealth } from '@cycletime/shared-config';

const config = loadAppConfiguration();
const health = await validateConfigurationHealth(config);

if (!health.healthy) {
  console.error('Configuration issues:', health.issues);
}
```

### Configuration Summary

#### `createConfigurationSummary(config: AppConfiguration, includeSecrets?: boolean): Record<string, unknown>`
Creates a configuration summary for logging/debugging.

```typescript
import { loadAppConfiguration, createConfigurationSummary } from '@cycletime/shared-config';

const config = loadAppConfiguration();
const summary = createConfigurationSummary(config, false); // Masks secrets

console.log('Configuration summary:', summary);
```

## Service-Specific Schemas

The package includes pre-defined schemas for different service types:

### API Gateway
```typescript
import { getServiceSchema } from '@cycletime/shared-config';

const schema = getServiceSchema('api-gateway');
// Includes: server, auth, logging, monitoring, security
```

### AI Service
```typescript
const schema = getServiceSchema('ai-service');
// Includes: server, database, redis, ai, logging, monitoring, security
```

### Document Service
```typescript
const schema = getServiceSchema('document-service');
// Includes: server, database, storage, logging, monitoring, security
```

### Task Service
```typescript
const schema = getServiceSchema('task-service');
// Includes: server, database, redis, logging, monitoring, security
```

## Environment-Specific Validation

The package applies different validation rules based on the environment:

### Production Environment
- Requires stronger security settings (64+ character secrets)
- Disallows debug/trace logging levels
- Enforces all required fields

### Development Environment
- More lenient validation
- Allows debug logging
- Provides sensible defaults

### Test Environment
- Minimal validation requirements
- Supports partial configurations
- Allows overriding most settings

## Error Handling

The package provides comprehensive error handling with detailed error messages:

```typescript
import { loadAppConfiguration, ConfigurationError } from '@cycletime/shared-config';

try {
  const config = loadAppConfiguration();
} catch (error) {
  if (error instanceof Error) {
    const configError = error as ConfigurationError;
    console.error('Configuration error:', {
      message: configError.message,
      code: configError.code,
      field: configError.field,
      value: configError.value,
    });
  }
}
```

### Common Error Codes

- `MISSING_REQUIRED_VAR` - Required environment variable not set
- `INVALID_NUMBER` - Invalid number format
- `INVALID_BOOLEAN` - Invalid boolean format
- `INVALID_URL` - Invalid URL format
- `INVALID_PORT` - Invalid port number
- `INVALID_EMAIL` - Invalid email format
- `PATTERN_MISMATCH` - Value doesn't match required pattern
- `INVALID_VALUE` - Value not in allowed values list
- `VALIDATION_ERROR` - Schema validation failed
- `TRANSFORM_ERROR` - Value transformation failed

## Security Features

- **Automatic secret masking** - Sensitive values are automatically masked in logs
- **Pattern validation** - Enforce minimum length requirements for secrets
- **Type-safe handling** - Prevent common configuration mistakes
- **Environment-aware validation** - Stricter validation in production

## TypeScript Support

The package is written in TypeScript and provides full type safety:

```typescript
import { AppConfiguration, DatabaseConfig, RedisConfig } from '@cycletime/shared-config';

// Full type safety for configuration objects
const config: AppConfiguration = loadAppConfiguration();
const dbConfig: DatabaseConfig = config.database;
const redisConfig: RedisConfig = config.redis;
```

## Testing

Run the test suite:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
```

## Contributing

1. Follow the existing code style
2. Add tests for new functionality
3. Update documentation as needed
4. Ensure all tests pass

## License

MIT
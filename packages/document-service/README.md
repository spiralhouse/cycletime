# Document Service

A comprehensive document lifecycle management service with version control, collaboration features, and search integration for the CycleTime project.

## Features

- **Document Management**: Create, read, update, and delete documents with comprehensive metadata
- **Version Control**: Track document versions with comparison capabilities
- **Collaboration**: Share documents, manage permissions, and add comments
- **File Operations**: Upload, download, and process various document formats
- **Search Integration**: Advanced search with filters, facets, and highlighting
- **Event-Driven**: Publishes events for integration with other services
- **Storage Backend**: Supports MinIO and S3 for scalable document storage
- **Processing Pipeline**: Automated text extraction, thumbnail generation, and indexing

## Supported Document Types

- PDF (.pdf)
- Microsoft Word (.docx)
- Text files (.txt)
- Markdown (.md)
- JSON (.json)
- XML (.xml)
- HTML (.html)
- CSV (.csv)
- Microsoft Excel (.xlsx)
- Microsoft PowerPoint (.pptx)
- Images (.jpg, .png, .gif)

## API Documentation

The service provides a comprehensive REST API with OpenAPI 3.0 specification. When running, documentation is available at:

- **Swagger UI**: `http://localhost:8004/docs`
- **OpenAPI JSON**: `http://localhost:8004/documentation/json`

### Main Endpoints

- `POST /api/v1/documents` - Create a new document
- `GET /api/v1/documents` - List documents with filtering and pagination
- `GET /api/v1/documents/{id}` - Get document details
- `PUT /api/v1/documents/{id}` - Update document
- `DELETE /api/v1/documents/{id}` - Delete document
- `POST /api/v1/documents/upload` - Upload document file
- `GET /api/v1/documents/{id}/download` - Download document
- `POST /api/v1/documents/search` - Advanced document search
- `POST /api/v1/documents/{id}/share` - Share document
- `GET /api/v1/documents/{id}/comments` - Get document comments
- `POST /api/v1/documents/{id}/comments` - Add comment
- `GET /api/v1/documents/{id}/versions` - List document versions
- `POST /api/v1/documents/{id}/versions` - Create new version
- `GET /api/v1/documents/{id}/metadata` - Get document metadata
- `GET /api/v1/documents/{id}/analytics` - Get document analytics

## Event System

The service publishes events to Redis for real-time integration:

### Published Events

- `document.created` - New document created
- `document.updated` - Document updated
- `document.deleted` - Document deleted
- `document.uploaded` - File uploaded
- `document.downloaded` - Document downloaded
- `document.shared` - Document shared
- `document.commented` - Comment added
- `document.version.created` - New version created
- `document.indexed` - Document indexed for search
- `document.processed` - Document processing completed

## Configuration

The service can be configured using environment variables:

### Server Configuration

```bash
PORT=8004                    # Server port
HOST=0.0.0.0                # Server host
NODE_ENV=development         # Environment (development, production)
LOG_LEVEL=info              # Logging level
```

### Storage Configuration

```bash
STORAGE_PROVIDER=minio       # Storage provider (minio, s3)
STORAGE_ENDPOINT=localhost   # Storage endpoint
STORAGE_ACCESS_KEY=minioadmin # Storage access key
STORAGE_SECRET_KEY=minioadmin # Storage secret key
STORAGE_BUCKET=cycletime-documents # Storage bucket name
STORAGE_REGION=us-east-1     # Storage region
STORAGE_SSL=false           # Use SSL for storage
```

### Redis Configuration

```bash
REDIS_HOST=localhost        # Redis host
REDIS_PORT=6379            # Redis port
REDIS_PASSWORD=            # Redis password (optional)
REDIS_DB=0                 # Redis database number
```

### Security Configuration

```bash
VIRUS_SCANNING_ENABLED=false      # Enable virus scanning
QUARANTINE_INFECTED=true          # Quarantine infected files
MAX_FILE_SIZE=52428800            # Maximum file size (50MB)
ALLOWED_TYPES=pdf,docx,txt,md     # Allowed file types
ENCRYPTION_ENABLED=false          # Enable file encryption
```

### Processing Configuration

```bash
PROCESSING_ENABLED=true           # Enable document processing
PROCESSING_CONCURRENCY=5          # Processing concurrency
PROCESSING_TIMEOUT=30000          # Processing timeout (ms)
PROCESSING_RETRY_ATTEMPTS=3       # Retry attempts
PROCESSING_RETRY_DELAY=1000       # Retry delay (ms)
```

## Development

### Prerequisites

- Node.js 18+
- Redis server
- MinIO server (for storage)

### Installation

```bash
# Install dependencies
npm install

# Build the service
npm run build

# Run in development mode
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Type checking
npm run typecheck

# Linting
npm run lint
```

### Docker Development

```bash
# Build development image
docker build -f Dockerfile.dev -t document-service:dev .

# Run with Docker Compose
docker-compose up document-service
```

### Testing

The service includes comprehensive test coverage:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Architecture

### Services

- **DocumentService**: Main business logic for document operations
- **StorageService**: Handles file storage operations with MinIO/S3
- **EventService**: Publishes events to Redis for integration
- **MockDataService**: Provides realistic mock data for development

### Controllers

- **DocumentController**: REST API endpoints for document operations
- **HealthController**: Health check and monitoring endpoints

### Types

- **DocumentTypes**: Core document type definitions
- **EventTypes**: Event payload definitions
- **APITypes**: API request/response types

## Integration

### Event Consumption

Other services can subscribe to document events:

```javascript
// Example Redis subscription
const redis = require('redis');
const client = redis.createClient();

client.subscribe('documents/created', (message) => {
  const event = JSON.parse(message);
  console.log('Document created:', event.payload.documentId);
});
```

### Search Integration

The service publishes `document.indexed` events for search service integration:

```javascript
// Example search indexing
client.subscribe('documents/indexed', (message) => {
  const event = JSON.parse(message);
  // Index document in search service
  searchService.indexDocument(event.payload);
});
```

## Monitoring

### Health Checks

- `GET /health` - Overall service health
- `GET /health/ready` - Readiness check
- `GET /health/live` - Liveness check

### Metrics

The service provides metrics for:
- Document count
- Storage usage
- Processing queue status
- Response times
- Error rates

## Security

### Authentication

The service expects JWT tokens in the Authorization header:

```
Authorization: Bearer <jwt-token>
```

### File Security

- Virus scanning (configurable)
- File type restrictions
- Size limits
- Encryption at rest (configurable)

## Deployment

### Production

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Environment Variables

Ensure all required environment variables are set for production deployment.

## Contributing

1. Follow the existing code style and patterns
2. Add tests for new features
3. Update documentation as needed
4. Ensure all tests pass before submitting

## License

MIT License - see LICENSE file for details.
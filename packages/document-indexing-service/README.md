# Document Indexing Service

A vector-based semantic search and document indexing service with AI-powered embeddings for the CycleTime platform.

## 🚀 Overview

The Document Indexing Service provides comprehensive document processing, vector indexing, and semantic search capabilities. It enables AI-powered document understanding through advanced embedding models and supports multiple search modalities including semantic, keyword, and hybrid search.

### Key Features

- **Vector-based Semantic Search**: Advanced similarity search using AI embeddings
- **Document Processing**: Support for multiple document formats (PDF, DOC, TXT, HTML, etc.)
- **Hybrid Search**: Combines semantic and keyword search for optimal results
- **Real-time Indexing**: Immediate document processing and indexing
- **Analytics & Monitoring**: Comprehensive search analytics and performance metrics
- **Scalable Architecture**: Event-driven design with Redis integration
- **OpenAPI Documentation**: Fully documented REST API with Swagger UI

## 📋 Table of Contents

- [Quick Start](#-quick-start)
- [API Documentation](#-api-documentation)
- [Architecture](#-architecture)
- [Development Setup](#-development-setup)
- [Docker Deployment](#-docker-deployment)
- [Configuration](#-configuration)
- [Testing](#-testing)
- [Performance](#-performance)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)

## 🏃 Quick Start

### Prerequisites

- Node.js 22+
- Redis (for event publishing)
- Vector database (Qdrant recommended)
- OpenAI API key (for embeddings)

### Installation

```bash
# Install dependencies
npm install

# Build the service
npm run build

# Start the service
npm start
```

### Basic Usage

```bash
# Check service health
curl http://localhost:3003/health

# View API documentation
open http://localhost:3003/docs

# Create an index
curl -X POST http://localhost:3003/api/v1/indices \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-documents",
    "description": "My document collection",
    "vectorDimensions": 1536,
    "embeddingModel": "text-embedding-3-small"
  }'

# Index a document
curl -X POST http://localhost:3003/api/v1/documents \
  -H "Content-Type: application/json" \
  -d '{
    "indexId": "idx-001",
    "title": "Sample Document",
    "content": "This is a sample document for testing.",
    "metadata": {
      "author": "John Doe",
      "category": "test"
    }
  }'

# Search documents
curl -X POST http://localhost:3003/api/v1/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "sample document",
    "searchType": "semantic",
    "limit": 10
  }'
```

## 📚 API Documentation

### REST API Endpoints

The service provides a comprehensive REST API with the following main endpoints:

#### Index Management
- `GET /api/v1/indices` - List all indices
- `POST /api/v1/indices` - Create a new index
- `GET /api/v1/indices/{id}` - Get index details
- `PUT /api/v1/indices/{id}` - Update index configuration
- `DELETE /api/v1/indices/{id}` - Delete an index

#### Document Operations
- `GET /api/v1/documents` - List documents
- `POST /api/v1/documents` - Index a new document
- `GET /api/v1/documents/{id}` - Get document details
- `PUT /api/v1/documents/{id}` - Update document
- `DELETE /api/v1/documents/{id}` - Remove document

#### Search Operations
- `POST /api/v1/search` - Search documents
- `POST /api/v1/search/similarity` - Similarity search with embeddings
- `GET /api/v1/search/suggestions` - Get search suggestions
- `GET /api/v1/search/documents/{id}/similar` - Find similar documents
- `POST /api/v1/search/explain` - Explain search query processing

#### Embedding Services
- `POST /api/v1/embeddings` - Generate embeddings
- `POST /api/v1/embeddings/batch` - Batch embedding generation
- `POST /api/v1/embeddings/compare` - Compare embeddings

#### Analytics
- `GET /api/v1/analytics/statistics` - Get index statistics
- `GET /api/v1/analytics/reports` - Generate analytics reports
- `GET /api/v1/search/analytics` - Search performance analytics

### Interactive Documentation

Visit `http://localhost:3003/docs` when the service is running to access the interactive Swagger UI documentation with:

- Complete API reference
- Request/response schemas
- Interactive testing interface
- Authentication examples

### AsyncAPI Documentation

The service also provides AsyncAPI specification for event-driven interactions:

- Document lifecycle events
- Search operation events
- Analytics and monitoring events
- Error and notification events

## 🏗 Architecture

### System Overview

The Document Indexing Service follows a microservices architecture with the following components:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Gateway   │───▶│  Document Index │───▶│  Vector Store   │
│                 │    │    Service      │    │   (Qdrant)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │  Event Service  │    │  Embedding API  │
                       │    (Redis)      │    │   (OpenAI)      │
                       └─────────────────┘    └─────────────────┘
```

### Core Services

1. **Indexing Service**: Manages document processing and vector indexing
2. **Search Service**: Handles all search operations and ranking
3. **Embedding Service**: Manages AI embedding generation and clustering
4. **Analytics Service**: Provides insights and performance metrics
5. **Event Service**: Handles async communication and notifications

### Data Flow

1. **Document Ingestion**: Documents are received via REST API
2. **Text Extraction**: Content is extracted and preprocessed
3. **Chunking**: Large documents are split into manageable chunks
4. **Embedding Generation**: AI models create vector representations
5. **Vector Storage**: Embeddings are stored in vector database
6. **Indexing**: Metadata and relationships are indexed
7. **Search**: Queries are processed and matched against vectors

## 💻 Development Setup

### Local Development

```bash
# Clone the repository
git clone <repository-url>
cd cycletime/packages/document-indexing-service

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server with hot reload
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Type check
npm run typecheck
```

### Environment Variables

Create a `.env` file in the service root:

```env
# Server Configuration
PORT=3003
HOST=0.0.0.0
NODE_ENV=development

# Database Configuration
REDIS_URL=redis://localhost:6379
VECTOR_DB_URL=http://localhost:6333

# AI Configuration
OPENAI_API_KEY=your_openai_api_key
EMBEDDING_MODEL=text-embedding-3-small

# Search Configuration
MAX_CHUNK_SIZE=1000
CHUNK_OVERLAP=100
SIMILARITY_THRESHOLD=0.7

# Logging
LOG_LEVEL=debug
```

### Project Structure

```
packages/document-indexing-service/
├── src/
│   ├── app.ts                 # Main application setup
│   ├── index.ts              # Service entry point
│   ├── controllers/          # HTTP controllers
│   ├── routes/               # API route definitions
│   ├── services/             # Business logic services
│   ├── types/                # TypeScript type definitions
│   └── utils/                # Utility functions
├── __tests__/                # Test files
├── docs/                     # Additional documentation
├── Dockerfile                # Production container
├── Dockerfile.dev            # Development container
├── docker-compose.yml        # Development environment
├── docker-compose.prod.yml   # Production environment
├── openapi.yaml              # OpenAPI specification
├── asyncapi.yaml             # AsyncAPI specification
└── package.json              # Package configuration
```

## 🐳 Docker Deployment

### Development Environment

```bash
# Start all services with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f document-indexing-service

# Stop services
docker-compose down
```

### Production Deployment

```bash
# Build and start production environment
docker-compose -f docker-compose.prod.yml up -d

# Scale the service
docker-compose -f docker-compose.prod.yml up -d --scale document-indexing-service=3

# Health check
docker-compose -f docker-compose.prod.yml exec document-indexing-service curl -f http://localhost:3003/health
```

### Container Images

The service provides optimized Docker images:

- **Production Image**: Multi-stage build with minimal dependencies
- **Development Image**: Full development environment with hot reload
- **Health Checks**: Built-in health monitoring
- **Security**: Non-root user execution

## ⚙️ Configuration

### Service Configuration

The service supports configuration through environment variables and configuration files:

#### Core Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3003` | HTTP server port |
| `HOST` | `localhost` | Server host binding |
| `NODE_ENV` | `development` | Environment mode |
| `LOG_LEVEL` | `info` | Logging verbosity |

#### Database Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `VECTOR_DB_URL` | `http://localhost:6333` | Vector database URL |

#### AI/ML Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | - | OpenAI API key (required) |
| `EMBEDDING_MODEL` | `text-embedding-3-small` | Embedding model |
| `MAX_CHUNK_SIZE` | `1000` | Maximum chunk size for documents |
| `CHUNK_OVERLAP` | `100` | Overlap between chunks |
| `SIMILARITY_THRESHOLD` | `0.7` | Default similarity threshold |

### Performance Tuning

#### Indexing Performance

```env
# Batch processing
BATCH_SIZE=50
MAX_CONCURRENT_EMBEDDINGS=10
EMBEDDING_TIMEOUT=30000

# Memory management
MAX_DOCUMENT_SIZE=10485760  # 10MB
MAX_CHUNKS_PER_DOCUMENT=100
```

#### Search Performance

```env
# Query optimization
DEFAULT_SEARCH_LIMIT=10
MAX_SEARCH_LIMIT=100
SEARCH_TIMEOUT=5000

# Caching
ENABLE_SEARCH_CACHE=true
CACHE_TTL=300  # 5 minutes
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- document-service.test.ts

# Run tests in watch mode
npm run test:watch

# Run integration tests
npm run test:integration
```

### Test Categories

1. **Unit Tests**: Individual service and utility testing
2. **Integration Tests**: API endpoint and service integration
3. **Contract Tests**: OpenAPI specification validation
4. **Performance Tests**: Load and stress testing

### Test Data

The service includes comprehensive mock data for testing:

- Sample documents with various formats
- Realistic embedding vectors
- Search scenarios and expected results
- Performance benchmarks

### Example Test

```typescript
import { createApp } from '../src/app';
import { FastifyInstance } from 'fastify';

describe('Document Indexing API', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createApp({
      port: 0,
      host: 'localhost',
      logger: false
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create a new document index', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/indices',
      payload: {
        name: 'test-index',
        description: 'Test index',
        vectorDimensions: 1536
      }
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      name: 'test-index',
      status: 'creating'
    });
  });
});
```

## 📊 Performance

### Benchmarks

The service is designed for high performance with the following characteristics:

#### Indexing Performance

- **Document Processing**: 100-500 docs/minute (depending on size)
- **Embedding Generation**: 1,000 chunks/minute with OpenAI API
- **Vector Storage**: 10,000+ vectors/second with Qdrant

#### Search Performance

- **Semantic Search**: <100ms average response time
- **Keyword Search**: <50ms average response time
- **Hybrid Search**: <150ms average response time
- **Throughput**: 1,000+ searches/minute

#### Resource Usage

- **Memory**: ~512MB baseline + 1MB per 1,000 indexed documents
- **CPU**: Low usage during search, moderate during indexing
- **Storage**: ~1KB per document + vector storage

### Optimization Tips

1. **Batch Operations**: Use batch APIs for bulk operations
2. **Chunk Size**: Optimize chunk size for your use case
3. **Embedding Models**: Choose appropriate model for speed/accuracy trade-off
4. **Caching**: Enable search result caching for frequently accessed content
5. **Vector DB**: Configure Qdrant for your specific access patterns

## 🔧 Troubleshooting

### Common Issues

#### Service Won't Start

```bash
# Check port availability
lsof -i :3003

# Verify environment variables
npm run config:check

# Check dependencies
npm run health:dependencies
```

#### Embedding API Errors

```bash
# Verify OpenAI API key
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models

# Check rate limits
npm run debug:embeddings
```

#### Vector Database Connection

```bash
# Check Qdrant connectivity
curl http://localhost:6333/health

# Verify collections
curl http://localhost:6333/collections
```

#### Search Quality Issues

1. **Low Relevance**: Adjust similarity threshold
2. **Missing Results**: Check document indexing status
3. **Slow Performance**: Review chunk size and embedding model

### Debug Mode

Enable debug logging for detailed troubleshooting:

```env
LOG_LEVEL=debug
DEBUG_EMBEDDINGS=true
DEBUG_SEARCH=true
DEBUG_INDEXING=true
```

### Monitoring

The service provides comprehensive monitoring endpoints:

- `/health` - Service health check
- `/metrics` - Prometheus metrics
- `/api/v1/analytics/statistics` - Detailed statistics
- `/api/v1/analytics/performance` - Performance metrics

## 🤝 Contributing

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests for new functionality
5. Run the test suite: `npm test`
6. Run linting: `npm run lint`
7. Commit your changes: `git commit -m 'Add amazing feature'`
8. Push to the branch: `git push origin feature/amazing-feature`
9. Open a Pull Request

### Code Standards

- **TypeScript**: Use strict mode with comprehensive typing
- **ESLint**: Follow the project's linting rules
- **Prettier**: Use automatic code formatting
- **Tests**: Maintain 90%+ test coverage
- **Documentation**: Document all public APIs

### Review Process

All contributions go through:

1. Automated testing (CI/CD)
2. Code quality checks
3. Security scanning
4. Peer review
5. Integration testing

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [Full API Documentation](http://localhost:3003/docs)
- **Issues**: [GitHub Issues](https://github.com/cycletime/issues)
- **Community**: [Discord Server](https://discord.gg/cycletime)
- **Email**: support@cycletime.dev

---

**Built with ❤️ by the CycleTime Team**
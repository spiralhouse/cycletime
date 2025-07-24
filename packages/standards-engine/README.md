# Standards Engine

Development standards management and delivery system for AI-assisted development in CycleTime.

## Overview

The Standards Engine is responsible for:

- 🔧 **Standards Management**: Define, store, and version development standards
- 🔍 **Compliance Checking**: Automated code compliance validation 
- 🤖 **AI Integration**: Deliver standards to AI coding tools via MCP
- 📊 **Analytics**: Track compliance metrics and improvement trends
- 🎯 **Contract Enforcement**: Ensure adherence to service contracts

## Features

### Standards Management
- Create and manage development standards by category (coding, testing, documentation, architecture, security)
- Version control for standards with change tracking
- Project-specific and organization-wide standards

### Compliance Monitoring
- Real-time compliance checking against defined standards
- Violation detection with severity levels (error, warning, info)
- Automated compliance reports and scoring

### AI Tool Integration
- MCP (Model Context Protocol) server for delivering standards to AI tools
- Support for Claude, GitHub Copilot, and Cursor
- Context-aware standards delivery based on current development task

### Analytics & Reporting
- Compliance trend analysis
- Standards effectiveness metrics
- Team and project compliance dashboards

## API Endpoints

### Health
- `GET /health` - Service health check

### Standards Management
- `GET /api/v1/standards` - List development standards
- `POST /api/v1/standards` - Create new standard
- `GET /api/v1/standards/{id}` - Get specific standard
- `PUT /api/v1/standards/{id}` - Update standard
- `DELETE /api/v1/standards/{id}` - Delete standard

### Compliance
- `GET /api/v1/compliance` - Get compliance status
- `POST /api/v1/compliance/check` - Trigger compliance check
- `GET /api/v1/compliance/reports/{id}` - Get compliance report
- `GET /api/v1/compliance/violations` - List violations

## Events

The Standards Engine publishes events for:

- Standards lifecycle (created, updated, deleted)
- Compliance checks (started, completed, failed)
- Violations (detected, resolved, ignored)
- AI integrations (standards delivered, feedback received)

See `asyncapi.yaml` for complete event specifications.

## Development

### Setup

```bash
# Install dependencies
npm install

# Build the service
npm run build

# Run in development mode
npm run dev

# Run tests
npm test

# Run with coverage
npm run test:coverage
```

### Configuration

Environment variables:

- `PORT` - Service port (default: 3007)
- `HOST` - Service host (default: 0.0.0.0)
- `NODE_ENV` - Environment (development, production, test)
- `LOG_LEVEL` - Logging level (debug, info, warn, error)
- `REDIS_URL` - Redis connection URL
- `DATABASE_URL` - Database connection URL

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Type check
npm run typecheck
```

## Architecture

### Core Components

- **Standards Repository**: Storage and versioning of standards definitions
- **Compliance Engine**: Rule evaluation and violation detection
- **MCP Server**: Integration with AI coding tools
- **Event Publisher**: Asynchronous event publishing for system integration
- **Analytics Engine**: Metrics collection and trend analysis

### Integration Points

- **API Gateway**: Authentication and routing
- **Document Service**: Standards documentation storage
- **Project Service**: Project-specific standards application
- **AI Service**: AI-powered standards suggestions and improvements
- **Notification Service**: Compliance alerts and reports

## Standards Categories

### Coding Standards
- Code style and formatting rules
- Naming conventions
- Code complexity limits
- Design pattern enforcement

### Testing Standards
- Test coverage requirements
- Test naming conventions
- Test structure and organization
- Mocking and assertion standards

### Documentation Standards
- Code documentation requirements
- API documentation standards
- README and setup guide requirements
- Architecture decision records (ADRs)

### Architecture Standards
- Service design patterns
- API contract standards
- Data modeling conventions
- Security architecture requirements

### Security Standards
- Authentication and authorization patterns
- Data encryption requirements
- Input validation rules
- Vulnerability scanning requirements

## License

MIT
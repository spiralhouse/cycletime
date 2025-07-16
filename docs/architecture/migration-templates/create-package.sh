#!/bin/bash
# Package creation automation script
# Usage: ./docs/architecture/migration-templates/create-package.sh <service-name> <description> [type]

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Validate input parameters
if [ $# -lt 2 ]; then
    print_error "Usage: $0 <service-name> <description> [type]"
    print_error "  service-name: kebab-case name (e.g., document-service)"
    print_error "  description: Brief description of the service"
    print_error "  type: web-service (default) or library"
    exit 1
fi

SERVICE_NAME=$1
DESCRIPTION=$2
TYPE=${3:-web-service}

# Validate service name format
if [[ ! $SERVICE_NAME =~ ^[a-z0-9-]+$ ]]; then
    print_error "Service name must be in kebab-case format (lowercase letters, numbers, and hyphens only)"
    exit 1
fi

# Validate type
if [[ "$TYPE" != "web-service" && "$TYPE" != "library" ]]; then
    print_error "Type must be either 'web-service' or 'library'"
    exit 1
fi

PACKAGE_DIR="packages/$SERVICE_NAME"
TEMPLATE_DIR="docs/architecture/migration-templates"

# Check if package already exists
if [ -d "$PACKAGE_DIR" ]; then
    print_error "Package directory $PACKAGE_DIR already exists!"
    exit 1
fi

print_status "Creating new $TYPE: @cycletime/$SERVICE_NAME"
print_status "Description: $DESCRIPTION"

# Create directory structure
print_status "Creating directory structure..."
mkdir -p "$PACKAGE_DIR/src"
mkdir -p "$PACKAGE_DIR/src/__tests__"
mkdir -p "$PACKAGE_DIR/src/types"
mkdir -p "$PACKAGE_DIR/src/utils"

if [ "$TYPE" == "web-service" ]; then
    mkdir -p "$PACKAGE_DIR/src/routes"
    mkdir -p "$PACKAGE_DIR/src/services"
    mkdir -p "$PACKAGE_DIR/src/middleware"
fi

# Copy and customize template files
print_status "Setting up configuration files..."

# Package.json
if [ -f "$TEMPLATE_DIR/package.json.template" ]; then
    sed -e "s/SERVICE_NAME/$SERVICE_NAME/g" \
        -e "s/SERVICE_DESCRIPTION/$DESCRIPTION/g" \
        -e "s/SERVICE_KEYWORDS/$SERVICE_NAME, $(echo $SERVICE_NAME | tr '-' ' ')/g" \
        "$TEMPLATE_DIR/package.json.template" > "$PACKAGE_DIR/package.json"
else
    print_warning "Template package.json not found, creating basic version"
    cat > "$PACKAGE_DIR/package.json" << EOF
{
  "name": "@cycletime/$SERVICE_NAME",
  "version": "1.0.0",
  "description": "$DESCRIPTION",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "start": "node dist/index.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/**/*.ts --no-warn-ignored",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist coverage"
  },
  "dependencies": {
    "@cycletime/shared-types": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "^20.10.5",
    "typescript": "^5.3.3",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.8",
    "ts-jest": "^29.1.1"
  },
  "author": "CycleTime Team",
  "license": "MIT"
}
EOF
fi

# TypeScript config
if [ -f "$TEMPLATE_DIR/tsconfig.json.template" ]; then
    cp "$TEMPLATE_DIR/tsconfig.json.template" "$PACKAGE_DIR/tsconfig.json"
else
    print_warning "Template tsconfig.json not found, creating basic version"
    cat > "$PACKAGE_DIR/tsconfig.json" << EOF
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true,
    "types": ["node", "jest"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
EOF
fi

# Jest config
if [ -f "$TEMPLATE_DIR/jest.config.js.template" ]; then
    cp "$TEMPLATE_DIR/jest.config.js.template" "$PACKAGE_DIR/jest.config.js"
else
    print_warning "Template jest.config.js not found, creating basic version"
    cat > "$PACKAGE_DIR/jest.config.js" << EOF
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts']
};
EOF
fi

# Create basic source files
print_status "Creating initial source files..."

# Index file
cat > "$PACKAGE_DIR/src/index.ts" << EOF
/**
 * @cycletime/$SERVICE_NAME
 * $DESCRIPTION
 */

export * from './types';

// Main entry point
async function main() {
  console.log('$SERVICE_NAME starting...');
  
  // TODO: Implement service logic
  
  console.log('$SERVICE_NAME started successfully');
}

if (require.main === module) {
  main().catch(console.error);
}
EOF

# Types file
cat > "$PACKAGE_DIR/src/types/index.ts" << EOF
/**
 * Type definitions for $SERVICE_NAME
 */

export interface ServiceConfig {
  port: number;
  host: string;
  nodeEnv: 'development' | 'production' | 'test';
}

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}
EOF

# Test setup
cat > "$PACKAGE_DIR/src/__tests__/setup.ts" << EOF
/**
 * Test setup for $SERVICE_NAME
 */

import { jest } from '@jest/globals';

// Global test configuration
beforeAll(async () => {
  // Setup test environment
});

afterAll(async () => {
  // Cleanup test environment
});

beforeEach(() => {
  // Reset mocks before each test
  jest.clearAllMocks();
});

// Test utilities
export const createMockConfig = (overrides: Partial<any> = {}) => ({
  port: 8000,
  host: '0.0.0.0',
  nodeEnv: 'test' as const,
  ...overrides
});
EOF

# Basic test file
cat > "$PACKAGE_DIR/src/__tests__/index.test.ts" << EOF
/**
 * Basic tests for $SERVICE_NAME
 */

describe('$SERVICE_NAME', () => {
  it('should be defined', () => {
    expect(true).toBe(true);
  });

  // TODO: Add actual tests
});
EOF

# README file
cat > "$PACKAGE_DIR/README.md" << EOF
# @cycletime/$SERVICE_NAME

$DESCRIPTION

## Installation

\`\`\`bash
npm install @cycletime/$SERVICE_NAME
\`\`\`

## Usage

\`\`\`typescript
import { /* TODO */ } from '@cycletime/$SERVICE_NAME';

// TODO: Add usage examples
\`\`\`

## Configuration

| Environment Variable | Description | Default |
|---------------------|-------------|---------|
| PORT | Service port | 8000 |
| HOST | Service host | 0.0.0.0 |
| NODE_ENV | Environment | development |

## Development

\`\`\`bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
\`\`\`

## Testing

\`\`\`bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
\`\`\`

## API Documentation

TODO: Document API endpoints and usage

## Contributing

Please read the [contributing guidelines](../../CONTRIBUTING.md) before making changes.

## License

MIT License - see [LICENSE](../../LICENSE) file for details.
EOF

# Create Dockerfile if it's a web service
if [ "$TYPE" == "web-service" ]; then
    if [ -f "$TEMPLATE_DIR/Dockerfile.template" ]; then
        sed -e "s/SERVICE_NAME/$SERVICE_NAME/g" \
            "$TEMPLATE_DIR/Dockerfile.template" > "$PACKAGE_DIR/Dockerfile"
    else
        print_warning "Dockerfile template not found, creating basic version"
        cat > "$PACKAGE_DIR/Dockerfile" << EOF
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 8000

CMD ["npm", "start"]
EOF
    fi
fi

# Install dependencies
print_status "Installing dependencies..."
cd "$PACKAGE_DIR"
npm install

# Run initial build and test
print_status "Running initial build and tests..."
npm run build
npm run test

cd - > /dev/null

print_success "Package @cycletime/$SERVICE_NAME created successfully!"
print_success "📁 Location: $PACKAGE_DIR"
print_success ""
print_status "🔧 Next steps:"
print_status "   1. Review and customize package.json"
print_status "   2. Implement your service logic in src/"
print_status "   3. Add comprehensive tests"
print_status "   4. Update the README with proper documentation"
if [ "$TYPE" == "web-service" ]; then
    print_status "   5. Update docker-compose.yml to include the new service"
fi
print_status "   6. Follow the migration checklist for complete integration"
print_status ""
print_status "📖 See docs/architecture/migration-checklist.md for detailed migration steps"
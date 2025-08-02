# JCVD Development Guide

## Quick Start (< 30 minutes)

### Prerequisites

- **Node.js v22.17.0 LTS** (check with `node --version`)
- **npm v10.9.0+** (comes with Node.js)
- **Git** for version control

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/jburbridge/jcvd.git
   cd jcvd
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up development environment**

   ```bash
   npm run setup
   ```

4. **Verify installation**

   ```bash
   npm run validate
   ```

5. **Start development**
   ```bash
   npm run dev
   ```

🎉 You should now have JCVD running locally!

## Development Workflow

### Daily Development

1. **Start development server**

   ```bash
   npm run dev:watch
   ```

2. **Run tests in watch mode**

   ```bash
   npm run test:watch
   ```

3. **Check code quality**
   ```bash
   npm run lint
   npm run type-check
   ```

### Making Changes

1. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow TypeScript best practices
   - Write tests for new functionality
   - Update documentation as needed

3. **Validate your changes**

   ```bash
   npm run validate  # Runs type-check, lint, and tests
   ```

4. **Commit and push**
   ```bash
   git add .
   git commit -m "feat: describe your changes"
   git push origin feature/your-feature-name
   ```

## Project Structure

```
jcvd/
├── src/                    # Source code
│   ├── index.ts           # Main entry point
│   ├── cli.ts             # CLI interface
│   ├── types/             # TypeScript types
│   ├── core/              # Core framework and task coordination
│   ├── providers/         # Provider implementations
│   ├── database/          # Database layer
│   ├── mcp/               # MCP integration
│   ├── config/            # Configuration management
│   └── utils/             # Utility functions
├── tests/                 # Test suites
├── examples/              # Example configurations
├── docs/                  # Documentation
└── scripts/               # Development scripts
```

## Key Commands

### Development

- `npm run dev` - Start development server
- `npm run dev:watch` - Start with auto-restart
- `npm run build` - Build for production
- `npm run clean` - Clean build artifacts

### Testing

- `npm run test` - Run tests in watch mode
- `npm run test:run` - Run tests once
- `npm run test:coverage` - Generate coverage report
- `npm run test:ui` - Open test UI

### Code Quality

- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix auto-fixable issues
- `npm run format` - Format code with Prettier
- `npm run type-check` - Check TypeScript types

### Database

- `npm run db:migrate` - Run database migrations
- `npm run db:reset` - Reset database
- `npm run db:seed` - Seed database with test data

### Validation

- `npm run validate` - Run all quality checks
- `npm run ci` - Run CI pipeline locally

## CLI Usage

### Basic Commands

```bash
# Show help
npx tsx src/cli.ts --help

# Check configuration
npx tsx src/cli.ts config --validate

# List providers
npx tsx src/cli.ts providers --list

# Show task coordination status
npx tsx src/cli.ts status --detailed

# Start JCVD
npx tsx src/cli.ts start --log-level debug
```

### Configuration Management

```bash
# Validate configuration
npx tsx src/cli.ts config --validate

# Show current configuration
npx tsx src/cli.ts config --show

# Initialize new configuration
npx tsx src/cli.ts config --init
```

## Architecture Overview

### Technology Stack

- **TypeScript 5.7.2** - Type-safe development
- **Node.js 22.17.0 LTS** - Runtime platform
- **better-sqlite3** - High-performance embedded database
- **Vitest** - Fast testing framework
- **ESLint 9.17.0** - Modern linting

## Contributing

### Before Contributing

1. Read the [Architecture documentation](docs/ARCHITECTURE.md)
2. Understand the [User Experience](docs/USER_EXPERIENCE.md)
3. Check existing [Issues](https://github.com/spiralhouse/jcvd/issues)

### Development Process

1. **Fork** the repository
2. **Create** a feature branch
3. **Write** tests for new functionality
4. **Ensure** all tests pass
5. **Submit** a pull request

### Pull Request Guidelines

- Write clear commit messages
- Include tests for new features
- Update documentation as needed
- Ensure CI passes

## Development Practices

### Code Style

- Use **TypeScript strict mode**
- Follow **ESLint configuration**
- Use **Prettier for formatting**
- Write **JSDoc comments** for public APIs

### Testing Strategy

- **Unit tests** for individual components
- **Integration tests** for agent interactions
- **E2E tests** for complete workflows
- **>80% test coverage** target

### Error Handling

```typescript
import type { Result } from '@/types';

// Use Result type for operations that may fail
async function someOperation(): Promise<Result<Data, Error>> {
  try {
    const data = await performOperation();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: new SomeError('Operation failed', { cause: error }),
    };
  }
}
```

### Logging

```typescript
import { createLogger } from '@/utils/logger';

const logger = createLogger('component-name');

logger.info('Operation started', { context: 'value' });
logger.error('Operation failed', { error, context: 'value' });
```

## Configuration

### Basic Configuration

Create `jcvd.config.json`:

```json
{
  "name": "My JCVD Instance",
  "version": "0.1.0",
  "database": {
    "path": "./jcvd.db",
    "walMode": true
  },
  "providers": [],
  "workflows": [],
  "taskCoordination": {
    "defaultAgent": "developer",
    "fallbackAgent": "general-purpose"
  }
}
```

### Environment Variables

```bash
# Logging
LOG_LEVEL=debug

# Database
JCVD_DB_PATH=./custom.db
JCVD_DB_WAL_MODE=true

# MCP Server
JCVD_MCP_PORT=3001
JCVD_MCP_HOST=localhost

# Features
JCVD_EXPERIMENTAL=false
```

## VS Code Setup

### Recommended Extensions

The project includes a `.vscode/extensions.json` with recommended extensions:

- **TypeScript and JavaScript** - Enhanced TypeScript support
- **ESLint** - Linting integration
- **Prettier** - Code formatting
- **Vitest** - Test runner integration
- **SQLite Viewer** - Database inspection

### Workspace Settings

Pre-configured settings in `.vscode/settings.json`:

- **Format on save** enabled
- **ESLint auto-fix** on save
- **Import organization** on save
- **TypeScript strict mode**

### Debug Configuration

Debug configurations in `.vscode/launch.json`:

- **Debug JCVD CLI** - Debug CLI commands
- **Debug JCVD Main** - Debug main application
- **Debug Current Test** - Debug specific test file
- **Debug MCP Server** - Debug MCP integration

## Troubleshooting

### Common Issues

#### "Module not found" errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### TypeScript compilation errors

```bash
# Check TypeScript configuration
npm run type-check

# Clean and rebuild
npm run clean
npm run build
```

#### Test failures

```bash
# Run tests with verbose output
npm run test:run -- --reporter=verbose

# Run specific test file
npm run test:run -- path/to/test.ts
```

#### Database issues

```bash
# Reset database
npm run db:reset

# Run migrations manually
npm run db:migrate
```

### Performance Issues

#### Slow startup

- Check database file permissions
- Verify SQLite WAL mode is enabled
- Check for large log files

#### Memory usage

- Monitor with `node --inspect`
- Check for memory leaks in task coordination
- Verify proper cleanup in providers

## Advanced Topics

### Task Coordination with Claude Code Agents

```typescript
import { TaskCoordinator } from '@/core/task-coordinator';

// Coordinate work through Claude Code's built-in agents
const coordinator = new TaskCoordinator();
await coordinator.delegateTask('developer', {
  description: 'Implement user authentication',
  context: projectContext,
  requirements: taskRequirements,
});
```

### Custom Providers

```typescript
import { BaseProvider } from '@/providers/base';

export class CustomProvider extends BaseProvider {
  async connect(): Promise<Result<void>> {
    // Custom provider implementation
  }
}
```

### MCP Integration

```typescript
import { MCPServer } from '@/mcp/server';

// Extend MCP server with custom tools
server.addTool('custom-tool', async params => {
  // Custom tool implementation
});
```

## Resources

### Documentation

- [Architecture](docs/ARCHITECTURE.md) - System design and components
- [PRD](docs/PRD.md) - Product requirements and vision
- [User Experience](docs/USER_EXPERIENCE.md) - User workflows and interfaces

### External Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vitest Documentation](https://vitest.dev/)
- [better-sqlite3 API](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md)
- [ESLint Configuration](https://eslint.org/docs/latest/)

---

## Need Help?

If you encounter issues during setup or development:

1. **Check this guide** for common solutions
2. **Search existing issues** on GitHub
3. **Create a new issue** with detailed information
4. **Join the discussion** in GitHub Discussions

Happy coding! 🚀

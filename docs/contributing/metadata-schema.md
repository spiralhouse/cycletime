# Documentation Metadata Schema

## Required Fields

All documents MUST include these fields:

- `title`: Human-readable title
- `type`: One of: concept|pattern|example|reference|guide
- `domain`: Array of domain tags (see Domain Taxonomy below)
- `description`: One-sentence summary
- `keywords`: Array of 3-5 searchable keywords

## Optional Fields

- `dependencies`: Array of prerequisite documents (use relative paths)
- `related`: Array of related documents (use relative paths)
- `last_updated`: YYYY-MM-DD format
- `audience`: Array (developers, architects, new-contributors, ops)
- `difficulty`: beginner|intermediate|advanced
- `tested`: true|false (for examples - is code tested?)
- `estimated_time`: X minutes (for guides)

## Domain Taxonomy

Primary domains:
- `testing`: Testing strategies, patterns, examples
- `mcp`: Model Context Protocol integration
- `persistence`: Database, repositories, data access
- `architecture`: System design, DDD, patterns
- `configuration`: Config management, environment setup
- `dependency-injection`: DI patterns and usage
- `cicd`: CI/CD, deployment, pipelines
- `api`: REST APIs, MCP tools/resources
- `development`: Development workflows, setup
- `operations`: Deployment, monitoring, maintenance

## Validation Rules

1. **No circular dependencies**: DAG structure only
2. **Dependencies must exist**: Referenced files must be present
3. **Keywords lowercase**: All lowercase, hyphenated
4. **Domain tags must be from taxonomy**: Use standard tags
5. **Description max 100 chars**: Keep concise

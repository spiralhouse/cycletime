# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CycleTime is an Intelligent Project Orchestration Platform with MCP Integration that enhances team collaboration and developer experience through AI-assisted project planning. The platform keeps humans in control while leveraging AI to improve planning efficiency and team coordination.

**Key Value Propositions:**
- Contract-First Parallel Development: Generate system boundaries and API contracts from PRDs to enable simultaneous development
- Custom Development Standards Enforcement: Define and enforce team-specific standards through AI coding tools via MCP
- Repository-Centric Documentation: All project context lives in version-controlled Markdown files

## Current State

This appears to be a new project in the planning phase. The repository currently contains:
- Documentation (README.md, docs/PRD.md) 
- No implementation code yet
- No build system or dependencies configured

## Development Workflow

Based on the README.md, this project follows a structured development workflow using Linear for task management. The planned architecture includes:

1. **Repository-Centric Approach**: All coordination happens through Git operations with Markdown documentation
2. **Multi-Model AI Integration**: Support for multiple AI providers (OpenAI, Anthropic, Google)
3. **MCP Integration**: Model Context Protocol server for AI coding tools
4. **Issue Tracker Integration**: Native integration with Linear, Jira, GitHub Issues

## Key Architecture Components (Planned)

- **CycleTime Server**: Central orchestration engine with REST API
- **Multi-Model AI Integration**: Intelligent routing across AI providers
- **Git Integration**: Direct repository access for documentation management
- **Contract Generation Engine**: API specifications and dependency mapping
- **Standards Engine**: Custom development standards enforcement
- **MCP Server Component**: Context delivery for AI coding tools
- **Web Dashboard**: React-based interface for project management

## Documentation Structure

The project uses a specific documentation structure:
- `/docs/requirements/` - PRD documents
- `/docs/technical-designs/` - Technical design documents  
- `/docs/standards/` - Development standards definitions
- `/docs/contracts/` - API specifications and system boundaries

## Target Technology Stack (From PRD)

- **Backend**: REST API server (language TBD)
- **Frontend**: React-based web dashboard
- **AI Integration**: Multiple provider APIs (OpenAI, Anthropic, Google)
- **Database**: TBD
- **MCP Protocol**: stdio/HTTP transport
- **Repository Integration**: Git via SSH/HTTPS

## License

GNU Affero General Public License v3.0 - This is a copyleft license requiring derivative works to be open source.
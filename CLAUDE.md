# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

JCVD is a multi-agent orchestration framework for Claude Code that aims to transform Claude Code into a specialized software development team for individual engineers. The project is currently in the conceptual/planning phase.

## Current State

This repository contains:
- **docs/PRD.md**: Product Requirements Document focused on business requirements, user needs, and success criteria
- **docs/ARCHITECTURE.md**: Technical architecture document detailing system design, components, and integration patterns  
- **README.md**: Basic project description
- **docs/**: Architecture documentation and detailed design docs

**Status**: Pre-implementation phase - no actual code exists yet

## System Architecture (see docs/ARCHITECTURE.md)

The system will consist of 7 specialized agents:
1. **Product Manager Agent** - Requirements gathering, stakeholder communication
2. **Tech Lead Agent** - Task coordination, dependency management  
3. **Software Architect Agent** - System design, architecture decisions
4. **Developer Agent** - Code implementation, unit testing
5. **QA Agent** - Test planning, quality assurance
6. **DevOps Agent** - Infrastructure, CI/CD, deployment
7. **Release Engineer Agent** - Release coordination, deployment orchestration

## Key Integration Points

- **Claude Code Integration**: Extends existing subagent framework and tool ecosystem
- **Linear MCP Integration**: For issue tracking and project management
- **State Management**: Multi-layer system (in-memory, repository docs, Linear sync)

For detailed technical architecture, component specifications, and integration patterns, see `docs/ARCHITECTURE.md`.

## Implementation Phases (from PRD)

1. **Phase 1**: Foundation - Orchestrator core, state management, Linear integration
2. **Phase 2**: Core Agents - Implement all 7 specialized agents
3. **Phase 3**: Advanced Orchestration - Parallel execution, enterprise features
4. **Phase 4**: Production Readiness - Performance optimization, security, documentation

## Development Commands

**Note**: No build/test/lint commands exist yet as implementation hasn't started.

When implementation begins, common commands will likely include:
- Testing framework (TBD)
- Build process (TBD) 
- Linting/type checking (TBD)

## Working with this Repository

Since this is pre-implementation:
- Focus on understanding the business vision outlined in docs/PRD.md
- Review the technical architecture detailed in docs/ARCHITECTURE.md
- Any code implementation should follow the architectural patterns described in the architecture document
- Consider the planned agent specializations when designing components
- State management will be critical - design with multi-layer persistence in mind

## Next Steps for Implementation

1. Set up basic project structure (package.json, TypeScript config)
2. Implement core orchestrator engine
3. Create base agent interface and framework
4. Add Linear MCP integration
5. Implement individual specialized agents

The docs/PRD.md contains business requirements and implementation phases, while docs/ARCHITECTURE.md contains the technical architecture and design patterns that should guide all development decisions.
# Task Tool Workflow

This document describes how to effectively use Task tool agents for CycleTime development, including patterns, capabilities, and integration with branching and Linear workflows.

## Overview

Task tool agents provide interactive, specialized assistance for development tasks using Claude Code's built-in agent system. They excel at analysis, planning, and iterative development while working within Claude Code's environment.

## Available Agent Types

### Core Development Agents

#### @agent-developer
**Specialization**: Code implementation and development
**Best for**: Feature implementation, refactoring, bug fixes

```
@agent-developer "Implement user authentication system with JWT tokens, including login, logout, and token refresh functionality"
```

#### @agent-qa
**Specialization**: Testing and quality assurance
**Best for**: Test planning, test implementation, quality validation

```
@agent-qa "Create comprehensive test suite for the authentication system, including unit tests, integration tests, and security testing"
```

#### @agent-code-reviewer
**Specialization**: Code review and quality assessment
**Best for**: Code review, best practices validation, security analysis

```
@agent-code-reviewer "Review the authentication implementation for security vulnerabilities, code quality, and adherence to project standards"
```

### Architecture and Planning Agents

#### @agent-software-architect
**Specialization**: System design and architecture
**Best for**: Architecture decisions, system design, technical planning

```
@agent-software-architect "Design the overall architecture for a user management system including authentication, authorization, and profile management"
```

#### @agent-product-manager
**Specialization**: Requirements and stakeholder coordination
**Best for**: Requirements gathering, user story creation, stakeholder communication

```
@agent-product-manager "Define user stories and acceptance criteria for the user authentication feature based on business requirements"
```

#### @agent-tech-lead
**Specialization**: Technical coordination and planning
**Best for**: Task breakdown, dependency management, technical coordination

```
@agent-tech-lead "Break down the user management epic into implementable stories and identify dependencies between them"
```

### Operations Agent

#### @agent-devops-engineer
**Specialization**: Build, deployment, and infrastructure
**Best for**: CI/CD optimization, build improvements, deployment automation

```
@agent-devops-engineer "Optimize the CI/CD pipeline to support parallel testing and deployment of multiple features"
```

## Task Tool Agent Capabilities

### ✅ What Task Tool Agents Excel At

**Interactive Development**
- Real-time problem solving
- Iterative refinement based on feedback
- Context-aware decision making
- Complex analysis and reasoning

**Code Understanding**
- Deep analysis of existing codebase
- Pattern recognition and consistency checking
- Architecture assessment
- Impact analysis for changes

**Planning and Design**
- Requirements analysis
- Technical planning
- Architecture design
- Risk assessment

**Quality Assurance**
- Code review and feedback
- Best practices validation
- Security analysis
- Performance assessment

### ❌ Task Tool Agent Limitations

**File System Access**
- Work in isolated environment
- Cannot make real filesystem changes
- Cannot create actual git commits
- Cannot work with real worktrees

**Parallel Execution**
- Sequential execution only
- Cannot run multiple agents simultaneously
- Limited to single-threaded operations

**Persistence**
- No state persistence between invocations
- Cannot access external services directly
- Limited to single session context

## Task Tool Workflow Patterns

### Pattern 1: Single Feature Development

**Recommended for**: Most development tasks, interactive problem-solving

```mermaid
flowchart TD
    A[Requirements] --> B[@agent-product-manager]
    B --> C[@agent-software-architect]
    C --> D[@agent-developer]
    D --> E[@agent-qa]
    E --> F[@agent-code-reviewer]
    F --> G{Feedback}
    G -->|Refinement Needed| D
    G -->|Approved| H[Complete]
```

**Example Workflow**:
```
# 1. Requirements and Planning
@agent-product-manager "Define requirements for user profile management feature based on SPI-612"

# 2. Architecture Design
@agent-software-architect "Design the architecture for user profile management including data models, API endpoints, and UI components"

# 3. Implementation
@agent-developer "Implement the user profile management feature according to the architecture design"

# 4. Testing
@agent-qa "Create comprehensive tests for user profile management including validation, error handling, and edge cases"

# 5. Review
@agent-code-reviewer "Review the user profile implementation for code quality, security, and adherence to project standards"

# 6. Refinement (if needed)
@agent-developer "Address the code review feedback and improve the implementation"
```

### Pattern 2: Research and Analysis

**Recommended for**: Understanding existing code, exploring options, making decisions

```
# Understanding existing patterns
@agent-software-architect "Analyze the current authentication implementation and identify opportunities for improvement"

# Exploring alternatives
@agent-developer "Research different approaches for implementing real-time notifications and recommend the best option for our architecture"

# Impact analysis
@agent-tech-lead "Analyze the impact of migrating from SQLite to H2 database on the existing codebase"
```

### Pattern 3: Problem Solving

**Recommended for**: Debugging, troubleshooting, finding solutions

```
# Bug investigation
@agent-developer "Investigate why user sessions are expiring prematurely and identify the root cause"

# Performance analysis
@agent-software-architect "Analyze performance bottlenecks in the user authentication flow and recommend optimizations"

# Security assessment
@agent-code-reviewer "Assess the security implications of the current JWT implementation and identify potential vulnerabilities"
```

### Pattern 4: Iterative Refinement

**Recommended for**: Complex features requiring multiple iterations

```
# Initial implementation
@agent-developer "Implement basic user authentication with username/password"

# User feedback incorporation
@agent-product-manager "Based on user feedback, what improvements should we make to the authentication flow?"

# Enhanced implementation
@agent-developer "Enhance the authentication system based on the product manager's recommendations"

# Quality validation
@agent-qa "Validate that the enhanced authentication meets all requirements and handles edge cases properly"
```

## Integration with Branching Strategy

### Main Directory Development

Task tool agents work well with main directory development:

```bash
# 1. Create feature branch
git checkout -b feat/spi-612-user-profiles

# 2. Use Task tool agents for development
@agent-developer "Implement user profile management for SPI-612"

# 3. Iterative refinement
@agent-code-reviewer "Review implementation"
@agent-developer "Address feedback"

# 4. Final validation
@agent-qa "Validate implementation meets acceptance criteria"

# 5. Commit changes (manually)
git add . && git commit -m "feat: implement user profile management (SPI-612)"
```

### Worktree Integration

Task tool agents can also work with worktrees for analysis and planning:

```bash
# 1. Create worktree
git worktree add .worktrees/spi-612-user-profiles -b feat/spi-612-user-profiles
cd .worktrees/spi-612-user-profiles

# 2. Use Task tool agents
@agent-software-architect "Design user profile architecture"
@agent-developer "Implement according to design"

# 3. Manual commit of changes
git add . && git commit -m "feat: implement user profile management"
```

## Linear Integration

### Status Management with Task Tool Agents

```mermaid
flowchart LR
    A[Linear: Todo] --> B[@agent-product-manager]
    B --> C[Linear: In Progress]
    C --> D[@agent-developer]
    D --> E[@agent-qa]
    E --> F[@agent-code-reviewer]
    F --> G[Linear: In Review]
    G --> H[PR Creation]
    H --> I[Linear: Done]
```

### Example with Linear Updates

```bash
# Start work on SPI-612
git checkout -b feat/spi-612-user-profiles
# Update Linear SPI-612 to "In Progress"

# Development with Task tool agents
@agent-product-manager "Clarify requirements for SPI-612 user profile management"
@agent-software-architect "Design architecture for SPI-612"
@agent-developer "Implement user profile management per SPI-612 requirements"
@agent-qa "Test implementation against SPI-612 acceptance criteria"
@agent-code-reviewer "Review SPI-612 implementation for quality and compliance"

# Create PR
git push -u origin feat/spi-612-user-profiles
gh pr create --title "feat: implement user profile management (SPI-612)"
# Update Linear SPI-612 to "In Review"

# After merge
# Update Linear SPI-612 to "Done"
```

## Best Practices

### Task Description Guidelines

**Be Specific and Clear**
```
❌ @agent-developer "Fix the auth issue"
✅ @agent-developer "Fix the JWT token expiration issue where tokens expire after 15 minutes instead of the configured 1 hour, causing users to be logged out prematurely"
```

**Provide Context**
```
❌ @agent-code-reviewer "Review this code"
✅ @agent-code-reviewer "Review the user authentication implementation for security vulnerabilities, focusing on JWT token handling, password validation, and session management"
```

**Include Constraints and Requirements**
```
❌ @agent-developer "Add user registration"
✅ @agent-developer "Add user registration with email validation, password strength requirements (minimum 8 characters with uppercase, lowercase, and numbers), and duplicate email prevention"
```

### Agent Selection Guidelines

**Choose the Right Agent for the Task**
- **Planning/Requirements**: `@agent-product-manager`
- **Architecture/Design**: `@agent-software-architect`
- **Implementation**: `@agent-developer`
- **Testing**: `@agent-qa`
- **Review/Quality**: `@agent-code-reviewer`
- **Coordination**: `@agent-tech-lead`
- **Infrastructure**: `@agent-devops-engineer`

**Use Multiple Agents for Complex Tasks**
```
# Complex feature requiring multiple perspectives
@agent-product-manager "Define requirements"
@agent-software-architect "Design architecture"
@agent-developer "Implement solution"
@agent-qa "Design test strategy"
@agent-code-reviewer "Review for quality"
```

### Iteration and Refinement

**Iterate Based on Feedback**
```
@agent-developer "Implement user authentication"
# Review output, provide feedback
@agent-developer "Refine the authentication implementation to handle edge cases: empty passwords, SQL injection attempts, and concurrent login sessions"
```

**Build on Previous Work**
```
@agent-software-architect "Design user management architecture"
# Use architectural output as input for implementation
@agent-developer "Implement user management according to the architecture design provided above"
```

## Quality Gates

### Before Using Task Tool Agents

- [ ] Clear understanding of requirements
- [ ] Appropriate agent selected for task
- [ ] Specific, actionable task description prepared
- [ ] Context and constraints identified

### During Agent Interaction

- [ ] Review agent output carefully
- [ ] Provide specific feedback for improvements
- [ ] Iterate until requirements are met
- [ ] Validate recommendations against project standards

### After Agent Completion

- [ ] Implement agent recommendations manually
- [ ] Test implementations thoroughly
- [ ] Commit changes with appropriate messages
- [ ] Update Linear status as needed

## Common Patterns and Examples

### Pattern: Feature Implementation

```
# 1. Requirements clarification
@agent-product-manager "Based on SPI-612, define specific user stories for profile management including view profile, edit profile, and profile validation"

# 2. Technical design
@agent-software-architect "Design the technical implementation for user profile management including database schema, API endpoints, and frontend components"

# 3. Implementation
@agent-developer "Implement user profile management with the following features: view current profile, edit profile fields (name, email, bio), validate email format, and handle update errors gracefully"

# 4. Testing strategy
@agent-qa "Create a comprehensive testing strategy for user profile management including unit tests for validation logic, integration tests for API endpoints, and UI tests for profile editing workflow"

# 5. Quality review
@agent-code-reviewer "Review the user profile implementation focusing on: input validation, error handling, data consistency, UI/UX patterns, and security considerations"
```

### Pattern: Bug Investigation and Fix

```
# 1. Problem analysis
@agent-developer "Investigate the reported issue where user sessions expire immediately after login. Analyze the JWT token generation, storage, and validation logic to identify the root cause"

# 2. Solution design
@agent-software-architect "Based on the session expiration investigation, design a robust solution that ensures proper JWT token lifecycle management"

# 3. Implementation
@agent-developer "Implement the fix for session expiration ensuring that JWT tokens have correct expiration times, are properly stored, and validation handles edge cases"

# 4. Testing
@agent-qa "Design tests to verify the session expiration fix works correctly and add regression tests to prevent similar issues in the future"

# 5. Security review
@agent-code-reviewer "Review the session management fix for security implications, ensuring no vulnerabilities were introduced and best practices are followed"
```

### Pattern: Code Refactoring

```
# 1. Analysis
@agent-software-architect "Analyze the current authentication module and identify areas for refactoring to improve maintainability, testability, and performance"

# 2. Refactoring plan
@agent-tech-lead "Create a step-by-step refactoring plan that minimizes risk and allows for incremental improvements to the authentication module"

# 3. Implementation
@agent-developer "Refactor the authentication module according to the plan, focusing on separation of concerns, reducing code duplication, and improving error handling"

# 4. Testing validation
@agent-qa "Ensure all existing functionality still works after refactoring and that the code is more testable than before"

# 5. Quality assessment
@agent-code-reviewer "Review the refactored authentication module for code quality improvements, maintainability, and adherence to project standards"
```

## Troubleshooting

### Common Issues

#### Agent Provides Generic Response
**Problem**: Agent gives vague or generic advice
**Solution**: Provide more specific context and requirements

```
❌ @agent-developer "Implement authentication"
✅ @agent-developer "Implement JWT-based authentication for the CycleTime application using Kotlin/Ktor, including login endpoint that accepts username/password, validates against database, and returns signed JWT token with 1-hour expiration"
```

#### Agent Doesn't Understand Codebase
**Problem**: Agent recommendations don't fit project patterns
**Solution**: Provide more context about existing patterns and conventions

```
@agent-developer "Implement user registration following the existing repository pattern used in ProjectRepository and IssueRepository, using Exposed ORM for database operations and Ktor routing for API endpoints"
```

#### Agent Output Doesn't Match Requirements
**Problem**: Implementation doesn't meet specific requirements
**Solution**: Be more explicit about requirements and constraints

```
@agent-developer "Implement user registration with these specific requirements: email must be unique, password must be hashed with bcrypt, user gets verification email, account is inactive until verified, and API returns appropriate error codes for validation failures"
```

### Recovery Strategies

#### Iterative Refinement
```
# If first attempt doesn't meet requirements
@agent-developer "The previous authentication implementation is missing password strength validation. Please enhance it to require passwords with minimum 8 characters, at least one uppercase letter, one lowercase letter, one number, and one special character"
```

#### Agent Chain Correction
```
# Use different agent type for clarification
@agent-software-architect "Review the authentication implementation approach and suggest improvements for better security and maintainability"

# Then refine with developer agent
@agent-developer "Implement the authentication improvements suggested by the software architect"
```

## Integration with Other Workflows

Task tool workflow integrates with:

- **[Single Feature Workflow](../docs/development/single-feature-workflow.md)**: Primary workflow for single features
- **[Branching Strategy](../docs/development/branching-strategy.md)**: Works with both main directory and worktree patterns
- **[Linear Integration](../docs/development/linear-branch-integration.md)**: Supports Linear status updates throughout development
- **[Parallel Development](../docs/testing/parallel-development.md)**: Can be used for planning parallel work

## Quick Reference

### Agent Commands
```
# Development
@agent-developer "specific implementation task"

# Testing
@agent-qa "specific testing requirements"

# Review
@agent-code-reviewer "specific review criteria"

# Architecture
@agent-software-architect "specific design challenge"

# Requirements
@agent-product-manager "specific requirements question"

# Coordination
@agent-tech-lead "specific planning or coordination need"

# Operations
@agent-devops-engineer "specific infrastructure or build task"
```

### Best Practices Summary

1. **Be Specific**: Provide detailed, specific task descriptions
2. **Choose Right Agent**: Select agent type that matches task requirements
3. **Iterate**: Use feedback to refine and improve outputs
4. **Validate**: Review agent recommendations against project standards
5. **Implement Manually**: Task tool agents provide guidance, you implement changes
6. **Update Status**: Keep Linear status current throughout development

Task tool agents provide powerful interactive assistance for development while maintaining the flexibility to work with any branching strategy or workflow pattern.
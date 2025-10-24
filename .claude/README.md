# Claude Code Configuration Structure

This directory contains configuration files for Claude Code integration with the CycleTime project.

## Directory Structure

```
.claude/
├── agents/           # Agent configuration files for Task tool
├── workflows/        # Development workflow templates
├── shared/           # Shared content for imports
└── settings.local.json  # Local Claude Code settings
```

## Shared Content Pattern

The `shared/` directory contains reusable content that can be imported into CLAUDE.md using the `@` import syntax.

### Available Shared Files

- `linear-reference.md` - Linear team/project IDs, status IDs, and workflow rules
- `testing-standards.md` - Testing architecture and best practices
- `git-conventions.md` - Git branch naming conventions
- `development-commands.md` - npm script reference
- `parallel-development-detection.md` - Proactive parallelization detection patterns

### How Imports Work

**In CLAUDE.md (✅ Supported):**
```markdown
## Linear Reference
@shared/linear-reference.md
```

**In Agent Configuration Files (✅ Supported):**
Agent configuration files (`.claude/agents/*.md`) support the `@` import syntax for shared content.

## Maintenance Requirements

### When Linear IDs Change

Update in ONE place:
1. `.claude/shared/linear-reference.md` (imported by CLAUDE.md and agent configs)

### Why This Pattern?

- **Single source of truth**: Shared files avoid duplication across CLAUDE.md and agent configs
- **Maintainability**: Updates propagate automatically via imports
- **Separation of concerns**: Workflows are orthogonal to parallel development capabilities

## Agent Configuration Files

Specialized agents for different development roles (see `docs/reference/agents.md` for complete reference):

- **qa.md** - Testing and quality assurance specialist
- **developer.md** - Feature implementation specialist
- **code-reviewer.md** - Code review and quality gates
- **software-architect.md** - Architecture and design decisions
- **product-manager.md** - Requirements and user stories
- **tech-lead.md** - Planning and coordination
- **devops-engineer.md** - Infrastructure and CI/CD
- **tech-writer.md** - Documentation specialist
- **context-engineer.md** - Context curation for agent delegation

## Workflow Templates

Development workflow guides in `.claude/workflows/`:

- **tdd-workflow.md** - Complete TDD methodology (RED → GREEN → REFACTOR)
- **direct-workflow.md** - Direct implementation approach
- **bugfix-workflow.md** - Systematic bug resolution process

## Usage Patterns

### Parallel Development with Workflow Choice

When Claude detects parallel development opportunities, it offers workflow choices:

1. **TDD Workflow** - For complex business logic requiring test-first development
2. **Direct Implementation** - For well-understood features or rapid prototyping  
3. **Bug Fix Workflow** - For systematic bug resolution with reproduce → fix → verify
4. **Mixed Workflows** - Different workflows per feature based on requirements

### Task Tool Agent Integration

Agent configuration files are designed for Claude Code Task tool execution:

```
@agent-developer "Implement user authentication feature"
@agent-qa "Create comprehensive tests for authentication"
@agent-code-reviewer "Review authentication implementation"
```

Agents can be invoked individually or coordinated in parallel workflows by the tech-lead agent.

## Best Practices

1. **Keep shared files focused**: Each file should contain one logical section
2. **Workflow independence**: Parallel development and workflows are orthogonal capabilities
3. **Test imports**: After changing shared files, verify CLAUDE.md still works correctly
4. **Version control**: Commit shared files and CLAUDE.md changes together
5. **Agent specialization**: Use appropriate agents based on task requirements, not rigid role assignments
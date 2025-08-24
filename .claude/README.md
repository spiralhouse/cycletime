# Claude Code Configuration Structure

This directory contains configuration files for Claude Code integration with the CycleTime CE project.

## Directory Structure

```
.claude/
├── prompts/          # Agent prompt files for Claude CLI execution
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
@.claude/shared/linear-reference.md
```

**In Agent Prompt Files (❌ Not Supported):**
Agent prompt files (`.claude/prompts/*.txt`) do NOT support the `@` import syntax. Content must be duplicated in prompt files when needed.

## Maintenance Requirements

### When Linear IDs Change

Update in ONE place:
1. `.claude/shared/linear-reference.md` (imported by CLAUDE.md)

Agent prompt files currently don't use Linear IDs directly - they delegate Linear operations to Claude orchestration.

### Why This Pattern?

- **CLAUDE.md benefits**: Uses imports to avoid duplication for the orchestrator
- **Agent limitations**: Prompt files don't support imports (Claude CLI limitation)
- **Separation of concerns**: Workflows are orthogonal to parallel development capabilities

## Agent Prompt Files

Generic agents that adapt to different workflows:

- **task-agent.txt** - General purpose development agent for features, bugs, refactoring
- **test-agent.txt** - Testing specialist with multiple modes (TDD, validation, bug fix, integration)
- **implementation-agent.txt** - Code implementation specialist adaptable to any workflow
- **review-agent.txt** - Code review and quality assurance for any development approach

### Legacy TDD-Specific Agents (Backward Compatibility)

- **qa-agent.txt** - TDD RED phase specialist
- **developer-agent.txt** - TDD GREEN phase specialist  
- **reviewer-agent.txt** - TDD REFACTOR phase specialist

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

### Claude CLI Integration

Agent prompt files are designed for Claude CLI execution with specific command patterns:

```bash
claude -p "[task]" \
  --append-system-prompt "$(cat .claude/prompts/[agent].txt)" \
  --permission-mode bypassPermissions \
  --output-format stream-json \
  --verbose
```

## Best Practices

1. **Keep shared files focused**: Each file should contain one logical section
2. **Workflow independence**: Parallel development and workflows are orthogonal capabilities
3. **Test imports**: After changing shared files, verify CLAUDE.md still works correctly
4. **Version control**: Commit shared files and CLAUDE.md changes together
5. **Agent specialization**: Use appropriate agents based on task requirements, not rigid role assignments
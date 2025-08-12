# Claude Code Configuration Structure

This directory contains configuration files for Claude Code integration with the JCVD project.

## Directory Structure

```
.claude/
├── agents/           # Agent definition files
├── commands/         # Slash command definitions
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

### How Imports Work

**In CLAUDE.md (✅ Supported):**
```markdown
## Linear Reference
@.claude/shared/linear-reference.md
```

**In Agent Files (❌ Not Supported):**
Agent definition files (`.claude/agents/*.md`) do NOT support the `@` import syntax. Content must be duplicated in agent files when needed.

## Maintenance Requirements

### When Linear IDs Change

Update in TWO places:
1. `.claude/shared/linear-reference.md` (imported by CLAUDE.md)
2. Individual agent files that need Linear IDs:
   - `agents/product-manager.md`
   - `agents/developer.md`
   - `agents/tech-lead.md`
   - `agents/qa.md`
   - `agents/code-reviewer.md`

### Why This Pattern?

- **CLAUDE.md benefits**: Uses imports to avoid duplication for the orchestrator
- **Agent limitations**: Agent files don't support imports (Claude Code limitation)
- **Future-ready**: If Claude Code adds import support for agents, we can easily refactor

## Agent Files

Each agent has a specific role and personality:

- **product-manager.md** - Empathetic, user-focused, questions solutions
- **developer.md** - Humble, asks clarifying questions
- **code-reviewer.md** - Skeptical but encouraging
- **qa.md** - Skeptical, direct but constructive
- **software-architect.md** - Confident with self-deprecating humor
- **tech-lead.md** - Confident leader with realistic estimation humor

## Best Practices

1. **Keep shared files focused**: Each file should contain one logical section
2. **Document updates**: When updating shared content, check if agents need updates too
3. **Test imports**: After changing shared files, verify CLAUDE.md still works correctly
4. **Version control**: Commit shared files and CLAUDE.md changes together
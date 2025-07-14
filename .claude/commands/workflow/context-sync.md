# Context Recovery & Project Sync

Intelligently recover project context after interruption or context loss: $ARGUMENTS (optional issue ID)

## When to Use This Command

- **System restart or crash recovery**: After unexpected shutdowns or restarts
- **Context window overflow**: When AI context has been reset or compacted
- **Returning to work**: After breaks, meetings, or switching between projects
- **Team collaboration**: When picking up work from another developer
- **Debugging workflow issues**: When unsure of current project state

## Context Recovery Process

### 1. **Linear State Analysis**
- Query current "In Progress" issues for the team
- Identify priority tasks and dependencies
- Show recent issue updates and comments
- Display current sprint/cycle status

### 2. **Git State Assessment**
- Show current branch and working directory status
- Display recent commits and changes
- Check for uncommitted or unstaged changes
- Verify branch relationship to main/origin

### 3. **Technical Documentation Discovery**
- Link to relevant technical design documents
- Show architecture overview for current work
- Display project structure and key files
- Reference applicable workflow documentation

### 4. **Code Quality Health Check**
- Run basic linting validation
- Check TypeScript compilation status
- Verify test suite baseline
- Check for obvious build issues

### 5. **Actionable Recommendations**
- Suggest immediate next steps based on current state
- Recommend quality checks to run
- Identify blockers or dependencies
- Provide workflow guidance for current task

## Command Execution Steps

```bash
# 1. Linear Analysis
echo "🔍 Analyzing Linear project state..."
# Query in-progress issues and current priorities

# 2. Git Status Check  
echo "📊 Checking git repository status..."
git status --porcelain
git log --oneline -5
git branch -vv

# 3. Documentation Links
echo "📚 Relevant technical documentation:"
# Show links to design docs for current work

# 4. Quality Validation
echo "✅ Running basic quality checks..."
npm run lint --silent || echo "⚠️  Linting issues detected"
npm run typecheck --silent || echo "⚠️  TypeScript errors detected"

# 5. Next Steps
echo "🎯 Recommended next steps:"
# Provide contextual guidance based on findings
```

## Usage Examples

```bash
# General context recovery
/workflow:context-sync

# Recovery for specific Linear issue
/workflow:context-sync SPI-48

# After returning from break
/workflow:context-sync --verbose
```

## Integration with Existing Workflow

This command complements existing workflow commands:
- Use **before** `/linear:start-feature` if unsure of current state
- Use **after** system restarts to resume work efficiently  
- Use **instead of** starting fresh when work is already in progress
- Use **with** `/workflow:quality-check` for comprehensive status

## Output Format

```
🔄 CONTEXT SYNC: CycleTime Project Recovery
=====================================

📋 LINEAR STATUS:
   • In Progress: SPI-48 (Provider Abstraction Layer)
   • Next Priority: SPI-49 (Claude Provider Implementation)
   • Current Sprint: 32/32 points committed

📂 GIT STATUS:
   • Branch: feature/spi-48-provider-abstraction-layer
   • Status: 3 modified files, 1 untracked
   • Last commit: feat: implement BaseAIProvider interface (2 hours ago)

📖 RELEVANT DOCS:
   • Technical Design: /docs/technical-designs/claude-ai-service.md
   • Architecture: /docs/architecture/system-overview.md
   • Current Phase: Phase 1 - Provider Abstraction Layer

✅ QUALITY STATUS:
   • Linting: ✅ No issues
   • TypeScript: ⚠️  3 type errors in provider interfaces
   • Tests: ✅ 24/24 passing

🎯 NEXT STEPS:
   1. Fix TypeScript errors in AIProvider interface
   2. Complete BaseAIProvider abstract class implementation  
   3. Run /workflow:quality-check before committing
   4. Update Linear issue with progress notes
```

This systematic approach ensures quick, accurate context recovery without assumptions or duplicate work.
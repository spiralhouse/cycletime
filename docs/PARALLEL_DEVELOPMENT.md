# Parallel Agent Development

This document describes how to enable multiple agents to work on independent features simultaneously using Git Worktrees, following Test-Driven Development (TDD) cycles with structured agent handoffs.

## Overview

Parallel development in JCVD allows multiple features to be developed simultaneously by leveraging Git Worktrees. Each feature follows a complete TDD cycle with structured handoffs between specialized agents within its own isolated workspace.

### Key Concepts

- **Feature-Level Parallelism**: Multiple independent features developed simultaneously
- **Agent Handoffs**: Sequential collaboration within each feature branch following TDD phases
- **Isolated Workspaces**: Each feature gets its own worktree to prevent conflicts
- **Structured TDD**: RED → GREEN → REFACTOR cycle with agent validation gates

## Parallel Feature Development Strategy

### When to Use Parallel Development

Use parallel development when:
- Multiple independent features can be developed simultaneously
- Features have minimal dependencies on each other
- Clear scope boundaries can be established
- Each feature can follow a complete TDD cycle independently

### Feature Selection Criteria

**Good Candidates:**
- New feature implementations
- Bug fixes with isolated scope
- Component enhancements
- Independent utility functions

**Avoid Parallel Development For:**
- Features that modify the same core files
- Interdependent features requiring coordination
- Major architectural changes
- Database schema migrations

## TDD Workflow per Feature Branch

Each feature follows a structured TDD cycle with agent handoffs:

```
┌─────────────────────────────────────────────────────────────┐
│                    Feature TDD Lifecycle                   │
├─────────────────────────────────────────────────────────────┤
│ 1. QA Agent: Write failing tests (RED)                     │
│    ↓                                                        │
│ 2. Code Reviewer: Validate test quality & RED state        │
│    ↓                                                        │
│ 3. Developer: Implement code (GREEN)                       │
│    ↓                                                        │
│ 4. Developer: Refactor implementation (REFACTOR)           │
│    ↓                                                        │
│ 5. Code Reviewer: Final review & approval                  │
└─────────────────────────────────────────────────────────────┘
```

### Phase Responsibilities

#### 1. RED Phase (QA Agent)
- Create comprehensive test specifications
- Write failing tests that define expected behavior
- Ensure tests cover edge cases and error conditions
- Document acceptance criteria
- **Exit Criteria**: All tests fail with meaningful error messages

#### 2. RED Validation (Code Reviewer)
- Review test quality and completeness
- Verify tests properly fail for the right reasons
- Validate test design patterns and structure
- Suggest improvements to test specifications
- **Exit Criteria**: Test quality approved, ready for implementation

#### 3. GREEN Phase (Developer)
- Implement minimal code to make tests pass
- Focus on functionality over optimization
- Ensure all tests transition from failing to passing
- **Exit Criteria**: All tests pass, functionality complete

#### 4. REFACTOR Phase (Developer)
- Optimize implementation for clarity and performance
- Remove code duplication
- Improve naming and structure
- Ensure tests continue to pass
- **Exit Criteria**: Code is clean, tests still pass

#### 5. Final Review (Code Reviewer)
- Review final implementation quality
- Verify adherence to coding standards
- Check integration patterns and architecture alignment
- Approve for merge to main
- **Exit Criteria**: Feature approved for production

## Worktree Organization

### Directory Structure

```
jcvd/                          # Main worktree (main branch)
├── .git/                      # Shared Git database
├── src/                       # Main development area
├── .worktrees/                # Parallel development area
│   ├── widget-one/            # Feature: Widget implementation
│   │   ├── .agent-handoff     # Handoff tracking file
│   │   ├── src/               # Feature implementation
│   │   └── tests/             # Feature tests
│   ├── red-thingy/            # Feature: Red component
│   │   ├── .agent-handoff     # Handoff tracking file
│   │   ├── src/               # Feature implementation
│   │   └── tests/             # Feature tests
│   └── broken-fix/            # Bug fix: Specific issue
│       ├── .agent-handoff     # Handoff tracking file
│       ├── src/               # Bug fix implementation
│       └── tests/             # Regression tests
└── docs/                      # Shared documentation
```

### Worktree Setup Commands

#### Create New Feature Worktree

```bash
# Create feature branch and worktree
git worktree add .worktrees/widget-one -b feat/widget-one

# Navigate to feature workspace
cd .worktrees/widget-one

# Initialize handoff tracking
echo '{
  "feature": "widget-one",
  "branch": "feat/widget-one",
  "current_phase": "SETUP",
  "current_agent": "none",
  "next_agent": "qa",
  "status": "ready_to_start",
  "history": []
}' > .agent-handoff
```

#### Create Bug Fix Worktree

```bash
# Create fix branch and worktree
git worktree add .worktrees/broken-fix -b fix/broken-gets-fixed

# Navigate to fix workspace
cd .worktrees/broken-fix

# Initialize handoff tracking for bug fix
echo '{
  "feature": "broken-gets-fixed",
  "branch": "fix/broken-gets-fixed",
  "current_phase": "SETUP",
  "current_agent": "none",
  "next_agent": "qa",
  "status": "ready_to_start",
  "history": []
}' > .agent-handoff
```

## Agent Handoff Protocol

### Handoff File Format (`.agent-handoff`)

Each worktree contains a `.agent-handoff` JSON file that tracks the current state and history:

```json
{
  "feature": "widget-one",
  "branch": "feat/widget-one",
  "current_phase": "RED",
  "current_agent": "qa",
  "next_agent": "code-reviewer",
  "status": "ready_for_handoff",
  "blocking_issues": [],
  "history": [
    {
      "phase": "SETUP",
      "agent": "tech-lead",
      "timestamp": "2025-01-13T10:00:00Z",
      "status": "completed",
      "notes": "Feature worktree created"
    },
    {
      "phase": "RED",
      "agent": "qa",
      "timestamp": "2025-01-13T10:30:00Z", 
      "status": "in_progress",
      "notes": "Writing failing tests for widget functionality"
    }
  ]
}
```

### Phase Transitions

#### QA → Code Reviewer (RED → RED_VALIDATION)

```bash
# Update handoff status
jq '.current_phase = "RED_VALIDATION" | 
    .current_agent = "code-reviewer" | 
    .status = "ready_for_handoff" |
    .history += [{
      "phase": "RED",
      "agent": "qa", 
      "timestamp": (now | todate),
      "status": "completed",
      "notes": "Tests written, all failing as expected"
    }]' .agent-handoff > .agent-handoff.tmp && mv .agent-handoff.tmp .agent-handoff
```

#### Code Reviewer → Developer (RED_VALIDATION → GREEN)

```bash
# Update handoff status
jq '.current_phase = "GREEN" | 
    .current_agent = "developer" | 
    .status = "ready_for_handoff" |
    .history += [{
      "phase": "RED_VALIDATION",
      "agent": "code-reviewer",
      "timestamp": (now | todate),
      "status": "completed", 
      "notes": "Tests reviewed and approved"
    }]' .agent-handoff > .agent-handoff.tmp && mv .agent-handoff.tmp .agent-handoff
```

### Agent Assignment Discovery

#### For Agents: Finding Your Current Assignment

```bash
# Find worktrees where you're the next agent
find .worktrees -name ".agent-handoff" -exec sh -c '
  next_agent=$(jq -r ".next_agent" "$1")
  if [ "$next_agent" = "qa" ]; then
    echo "QA assignment: $1"
    jq -r ".feature + \" (\" + .current_phase + \")\"" "$1"
  fi
' _ {} \;
```

#### For Tech Leads: Status Overview

```bash
# Overview of all parallel features
for worktree in .worktrees/*/; do
  if [ -f "$worktree/.agent-handoff" ]; then
    echo "=== $(basename "$worktree") ==="
    jq -r '"Phase: " + .current_phase + " | Agent: " + .current_agent + " | Status: " + .status' "$worktree/.agent-handoff"
  fi
done
```

## Pull Request Workflow

### Branch Management Strategy

Each feature branch follows this lifecycle:
1. **Local Development**: Complete TDD cycle in worktree
2. **Push to Origin**: Push feature branch for backup and sharing
3. **Pull Request**: Create PR for code review and integration
4. **CI/CD**: Automated testing and quality checks
5. **Merge**: Integration to main branch via GitHub

### Creating Pull Requests

#### Standard PR Creation

```bash
# From feature worktree (after completing TDD cycle)
cd .worktrees/feature-name

# Final commit with complete TDD cycle
git add .
git commit -m "feat: complete feature implementation

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to origin
git push -u origin feat/feature-name

# Create PR with comprehensive description
gh pr create --title "feat: implement feature-name" --body "$(cat <<'EOF'
## Summary
Brief description of the feature and its purpose

## Agent Handoff History  
- ✅ QA: Test specification (RED phase)
- ✅ Code Reviewer: Test validation
- ✅ Developer: Implementation (GREEN phase)
- ✅ Developer: Refactoring (REFACTOR phase)
- ✅ Code Reviewer: Final review

## Changes Made
- List of key changes
- Files modified
- New functionality added

## Test Plan
- [ ] All existing tests pass
- [ ] New functionality tested
- [ ] Integration verified

🤖 Generated with [Claude Code](https://claude.ai/code)
EOF
)"
```

#### PR Status Monitoring

```bash
# Check status of all open PRs
gh pr status

# View specific PR details
gh pr view feat/feature-name

# Check PR checks/CI status
gh pr checks feat/feature-name
```

## Coordination and Best Practices

### Preventing Conflicts

1. **Clear Scope Boundaries**: Each feature should modify distinct file sets
2. **Shared Code Changes**: Coordinate through main branch integration
3. **Database Schema**: Avoid parallel schema changes
4. **Configuration Files**: Minimize parallel config modifications
5. **PR Dependencies**: Clearly document if PRs depend on each other

### Communication Patterns

- **Status Updates**: Use Linear issue status updates for progress
- **Blocking Issues**: Document in `.agent-handoff` blocking_issues array
- **Questions**: Create comments on Linear issues for clarification
- **Architecture Decisions**: Involve Software Architect for guidance

### Quality Gates

- **RED Phase**: All tests must fail meaningfully
- **RED Validation**: Code Reviewer must approve test design
- **GREEN Phase**: All tests must pass
- **REFACTOR Phase**: Tests must continue passing
- **Final Review**: Code Reviewer must approve for merge

## Cleanup Procedures

### Feature Completion

#### Push and Create Pull Request

```bash
# From feature worktree
cd .worktrees/widget-one

# Commit all changes
git add .
git commit -m "feat: implement widget-one functionality

Complete TDD cycle with agent handoffs:
- QA: Written comprehensive tests
- Code Reviewer: Validated test quality  
- Developer: Implemented functionality
- Developer: Refactored for clarity
- Code Reviewer: Final approval

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push feature branch to origin
git push -u origin feat/widget-one

# Create pull request
gh pr create --title "feat: implement widget-one functionality" --body "$(cat <<'EOF'
## Summary
- Complete widget-one implementation following TDD methodology
- All tests passing with comprehensive coverage
- Agent handoffs completed successfully

## Agent Handoff History
- ✅ QA: Test specification and RED phase
- ✅ Code Reviewer: RED validation
- ✅ Developer: GREEN implementation
- ✅ Developer: REFACTOR optimization
- ✅ Code Reviewer: Final review

## Test Plan
- [ ] Verify all existing tests continue to pass
- [ ] Confirm widget-one functionality works as specified
- [ ] Check integration with existing codebase

🤖 Generated with [Claude Code](https://claude.ai/code)
EOF
)"
```

#### Worktree Cleanup (After PR Merge)

```bash
# After PR is merged on GitHub
# Remove completed worktree
git worktree remove .worktrees/widget-one

# Delete local feature branch
git branch -d feat/widget-one

# Clean up remote tracking branch (handled by GitHub after merge)
# git push origin --delete feat/widget-one  # Usually automatic after PR merge
```

### Emergency Cleanup

#### Abandoned Features

```bash
# Force remove worktree with uncommitted changes
git worktree remove --force .worktrees/abandoned-feature

# Force delete branch
git branch -D feat/abandoned-feature
```

#### Reset Handoff State

```bash
# Reset to beginning of TDD cycle
echo '{
  "feature": "widget-one",
  "branch": "feat/widget-one",
  "current_phase": "SETUP",
  "current_agent": "none",
  "next_agent": "qa",
  "status": "ready_to_start",
  "history": []
}' > .worktrees/widget-one/.agent-handoff
```

## Troubleshooting

### Common Issues

#### Merge Conflicts
- **Prevention**: Regular rebasing against main
- **Resolution**: Coordinate through Tech Lead
- **Recovery**: Use `git worktree` isolation for conflict resolution

#### Agent Confusion
- **Symptom**: Multiple agents working on same phase
- **Solution**: Check `.agent-handoff` file before starting work
- **Prevention**: Clear handoff protocols and status checking

#### Test Dependencies
- **Issue**: Tests depending on shared infrastructure changes
- **Solution**: Coordinate infrastructure changes through main branch
- **Pattern**: Feature-specific test utilities in feature worktrees

## Integration with JCVD Framework

### Agent Delegation

When starting parallel development:

```bash
# Tech Lead creates worktrees
@agent-tech-lead: "Setup three parallel features: widget-one, red-thingy, broken-fix"

# QA starts RED phase on each
@agent-qa: "Begin TDD RED phase for feat/widget-one in .worktrees/widget-one/"

# Code Reviewer validates
@agent-code-reviewer: "Review RED phase tests in .worktrees/widget-one/"

# Developer implements
@agent-developer: "Implement GREEN phase for feat/widget-one"
```

### Status Tracking

- **Linear Issues**: Update parent story status based on overall progress
- **Handoff Files**: Track detailed phase transitions
- **Git Commits**: Clear commit messages indicating TDD phase
- **Comments**: Use for questions and architectural discussions

## Success Metrics

### Parallel Development Success

- Multiple features progressing simultaneously
- Clear agent handoffs without confusion  
- No merge conflicts between parallel features
- Complete TDD cycles for each feature
- Clean integration to main branch

### Quality Indicators

- All tests passing before merge
- Code review approval for each feature
- Adherence to established patterns
- Documentation completeness
- Minimal technical debt introduction

---

*This documentation enables reproducible parallel development workflows while maintaining code quality and clear coordination between specialized agents.*
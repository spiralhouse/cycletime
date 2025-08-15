# Test Plan: Parallel TDD Development with Generic Agents

**Objective**: Validate that our decoupled architecture can still execute parallel TDD development across 3 independent features using generic agents with TDD workflow specialization.

## Test Scenario Overview

**What We're Testing**: 
- 3 independent features developed in parallel using TDD workflow
- Generic agents (test-agent, implementation-agent, review-agent) operating in TDD modes
- Complete RED → GREEN → REFACTOR cycles for each feature
- Claude orchestration across multiple worktrees simultaneously

**Expected Outcome**:
- All 3 features complete TDD cycles successfully
- Same quality and completeness as previous TDD-specific agent approach
- Proper isolation between parallel development streams
- All tests passing and proper git commits in each worktree

## Test Features Selection

**Feature 1: User Authentication System**
- **Scope**: Login, logout, session management
- **Complexity**: Medium (3-5 points)
- **Files**: `src/auth/`, `tests/auth/`
- **TDD Focus**: Security, validation, error handling

**Feature 2: User Profile Management**  
- **Scope**: CRUD operations for user profiles
- **Complexity**: Simple-Medium (2-3 points)
- **Files**: `src/profile/`, `tests/profile/`
- **TDD Focus**: Data validation, API contracts

**Feature 3: Password Reset Flow**
- **Scope**: Email-based password reset with tokens
- **Complexity**: Medium (3-4 points) 
- **Files**: `src/password-reset/`, `tests/password-reset/`
- **TDD Focus**: Security, token handling, email integration

**Why These Features**: Independent, different complexity levels, minimal file overlap, clear TDD value proposition.

## Prerequisites Verification

### Step 1: Environment Setup
```bash
# Verify Claude CLI available
which claude
# Expected: /usr/local/bin/claude or similar path

# Verify current branch and clean state
git status
# Expected: On branch main, working tree clean

# Verify prompt files exist
ls -la .claude/prompts/
# Expected: test-agent.txt, implementation-agent.txt, review-agent.txt (plus legacy TDD agents)

# Verify workflow documentation
ls -la .claude/workflows/
# Expected: tdd-workflow.md, direct-workflow.md, bugfix-workflow.md
```

### Step 2: Agent Prompt File Content Verification
```bash
# Verify test-agent.txt supports TDD mode
grep -i "TDD\|test.*first\|RED.*GREEN.*REFACTOR" .claude/prompts/test-agent.txt
# Expected: Evidence of TDD mode support

# Verify implementation-agent.txt supports test-driven mode  
grep -i "test.*driven\|make.*test.*pass\|minimal.*implementation" .claude/prompts/implementation-agent.txt
# Expected: Evidence of test-driven implementation support

# Verify review-agent.txt supports TDD refactoring
grep -i "refactor\|maintain.*test\|quality.*improvement" .claude/prompts/review-agent.txt
# Expected: Evidence of refactoring and quality focus
```

## Phase 1: Parallel Worktree Setup

### Step 1: Create Feature Worktrees
```bash
# Create 3 feature worktrees with TDD-appropriate branch names
git worktree add .worktrees/user-auth -b feat/spi-425-user-authentication-tdd
git worktree add .worktrees/user-profile -b feat/spi-425-user-profile-tdd  
git worktree add .worktrees/password-reset -b feat/spi-425-password-reset-tdd

# Verify worktrees created
git worktree list
# Expected: 4 entries (main + 3 features)
```

### Step 2: Install Dependencies
```bash
# Install dependencies in each worktree
for worktree in .worktrees/*/; do
    echo "Installing dependencies in $worktree"
    (cd "$worktree" && npm install)
done

# Verify installations
for worktree in .worktrees/*/; do
    if [ -d "$worktree/node_modules" ]; then
        echo "✓ Dependencies installed in $worktree"
    else
        echo "✗ Missing dependencies in $worktree"
        exit 1
    fi
done
```

### Step 3: Verify Prompt File Inheritance
```bash
# Verify prompt files available in all worktrees
find .worktrees -name "*.txt" -path "*/.claude/prompts/*" | wc -l
# Expected: 21 (3 worktrees × 7 prompt files = 21 total)

# Verify specific agents we'll use
find .worktrees -name "test-agent.txt" -path "*/.claude/prompts/*"
find .worktrees -name "implementation-agent.txt" -path "*/.claude/prompts/*" 
find .worktrees -name "review-agent.txt" -path "*/.claude/prompts/*"
# Expected: 3 entries each (one per worktree)
```

## Phase 2: TDD RED Phase (Parallel Test Creation)

### Step 1: Launch Test Agents in TDD Mode
```python
# Agent 1: User Authentication Tests (TDD RED)
Bash(
    command="cd /Users/jburbridge/Projects/jcvd/.worktrees/user-auth && claude -p 'Execute TDD RED phase for user authentication system. Create comprehensive failing tests for login, logout, session management, password validation, and security edge cases. Tests should fail meaningfully since no implementation exists yet. Focus on behavior-driven test design.' --append-system-prompt \"$(cat .claude/prompts/test-agent.txt)\" --permission-mode bypassPermissions --output-format stream-json --verbose",
    description="Launch TDD RED phase agent for user authentication",
    run_in_background=true
)
# Expected bash_id: e.g., "bash_5"

# Agent 2: User Profile Tests (TDD RED)  
Bash(
    command="cd /Users/jburbridge/Projects/jcvd/.worktrees/user-profile && claude -p 'Execute TDD RED phase for user profile management. Create comprehensive failing tests for profile CRUD operations, data validation, field updates, and error handling. Tests should define clear API contracts and fail meaningfully before implementation.' --append-system-prompt \"$(cat .claude/prompts/test-agent.txt)\" --permission-mode bypassPermissions --output-format stream-json --verbose",
    description="Launch TDD RED phase agent for user profile",
    run_in_background=true
)
# Expected bash_id: e.g., "bash_6"

# Agent 3: Password Reset Tests (TDD RED)
Bash(
    command="cd /Users/jburbridge/Projects/jcvd/.worktrees/password-reset && claude -p 'Execute TDD RED phase for password reset functionality. Create comprehensive failing tests for email-based reset flow, token generation/validation, security requirements, and edge cases. Tests should cover the complete reset workflow and fail appropriately before implementation.' --append-system-prompt \"$(cat .claude/prompts/test-agent.txt)\" --permission-mode bypassPermissions --output-format stream-json --verbose",
    description="Launch TDD RED phase agent for password reset",
    run_in_background=true
)
# Expected bash_id: e.g., "bash_7"
```

### Step 2: Monitor RED Phase Progress
```python
# Check status of all TDD RED agents
BashOutput(bash_id="bash_5")  # user-auth tests
BashOutput(bash_id="bash_6")  # user-profile tests
BashOutput(bash_id="bash_7")  # password-reset tests

# Filter for TDD-specific events
BashOutput(bash_id="bash_5", filter="test|spec|RED|fail|commit")
BashOutput(bash_id="bash_6", filter="test|spec|RED|fail|commit")  
BashOutput(bash_id="bash_7", filter="test|spec|RED|fail|commit")
```

### Step 3: RED Phase Success Criteria
**Must verify ALL of these for EACH worktree:**

```bash
# 1. Test files created
ls .worktrees/user-auth/tests/
ls .worktrees/user-profile/tests/  
ls .worktrees/password-reset/tests/
# Expected: Test files exist (*.test.ts or *.spec.ts)

# 2. All tests fail meaningfully
cd .worktrees/user-auth && npm run test:run
cd .worktrees/user-profile && npm run test:run
cd .worktrees/password-reset && npm run test:run
# Expected: Tests run but all fail (non-zero exit codes)

# 3. Git commits made
cd .worktrees/user-auth && git log --oneline -n 2
cd .worktrees/user-profile && git log --oneline -n 2  
cd .worktrees/password-reset && git log --oneline -n 2
# Expected: Recent commits with TDD RED phase messages

# 4. Agent completion status
BashOutput(bash_id="bash_5") # Should show: "status": "completed", "exit_code": 0
BashOutput(bash_id="bash_6") # Should show: "status": "completed", "exit_code": 0
BashOutput(bash_id="bash_7") # Should show: "status": "completed", "exit_code": 0
```

**RED Phase Gate**: Do NOT proceed to GREEN phase until ALL RED agents complete successfully and all success criteria are met.

## Phase 3: TDD GREEN Phase (Parallel Implementation)

### Step 1: Launch Implementation Agents in Test-Driven Mode
**CRITICAL**: Only launch after RED phase completely successful.

```python
# Agent 1: User Authentication Implementation (TDD GREEN)
Bash(
    command="cd /Users/jburbridge/Projects/jcvd/.worktrees/user-auth && claude -p 'Execute TDD GREEN phase for user authentication. Implement minimal code to make failing tests pass. Focus on core login/logout functionality, session management, and security requirements. Follow test-driven implementation approach - write just enough code to satisfy the failing tests without over-engineering.' --append-system-prompt \"$(cat .claude/prompts/implementation-agent.txt)\" --permission-mode bypassPermissions --output-format stream-json --verbose",
    description="Launch TDD GREEN phase agent for user authentication",
    run_in_background=true
)
# Expected bash_id: e.g., "bash_8"

# Agent 2: User Profile Implementation (TDD GREEN)
Bash(
    command="cd /Users/jburbridge/Projects/jcvd/.worktrees/user-profile && claude -p 'Execute TDD GREEN phase for user profile management. Implement minimal CRUD operations to make failing tests pass. Focus on data validation, API contracts, and error handling as defined by the tests. Use test-driven implementation approach.' --append-system-prompt \"$(cat .claude/prompts/implementation-agent.txt)\" --permission-mode bypassPermissions --output-format stream-json --verbose",
    description="Launch TDD GREEN phase agent for user profile", 
    run_in_background=true
)
# Expected bash_id: e.g., "bash_9"

# Agent 3: Password Reset Implementation (TDD GREEN)
Bash(
    command="cd /Users/jburbridge/Projects/jcvd/.worktrees/password-reset && claude -p 'Execute TDD GREEN phase for password reset functionality. Implement email-based reset flow with token handling to make failing tests pass. Focus on security requirements and workflow steps as defined by tests. Use minimal test-driven implementation.' --append-system-prompt \"$(cat .claude/prompts/implementation-agent.txt)\" --permission-mode bypassPermissions --output-format stream-json --verbose",
    description="Launch TDD GREEN phase agent for password reset",
    run_in_background=true
)
# Expected bash_id: e.g., "bash_10"
```

### Step 2: Monitor GREEN Phase Progress
```python
# Check status of all TDD GREEN agents
BashOutput(bash_id="bash_8")  # user-auth implementation
BashOutput(bash_id="bash_9")  # user-profile implementation
BashOutput(bash_id="bash_10") # password-reset implementation

# Filter for implementation events
BashOutput(bash_id="bash_8", filter="implement|GREEN|pass|commit|feat")
BashOutput(bash_id="bash_9", filter="implement|GREEN|pass|commit|feat")
BashOutput(bash_id="bash_10", filter="implement|GREEN|pass|commit|feat")
```

### Step 3: GREEN Phase Success Criteria
**Must verify ALL of these for EACH worktree:**

```bash
# 1. Implementation files created
ls .worktrees/user-auth/src/
ls .worktrees/user-profile/src/
ls .worktrees/password-reset/src/
# Expected: Implementation files exist (*.ts files)

# 2. All tests now pass
cd .worktrees/user-auth && npm run test:run
cd .worktrees/user-profile && npm run test:run  
cd .worktrees/password-reset && npm run test:run
# Expected: All tests pass (exit code 0)

# 3. TypeScript compilation successful
cd .worktrees/user-auth && npm run type-check
cd .worktrees/user-profile && npm run type-check
cd .worktrees/password-reset && npm run type-check  
# Expected: No TypeScript errors

# 4. Git commits made for implementation
cd .worktrees/user-auth && git log --oneline -n 3
cd .worktrees/user-profile && git log --oneline -n 3
cd .worktrees/password-reset && git log --oneline -n 3
# Expected: Recent commits with TDD GREEN phase messages

# 5. Agent completion status
BashOutput(bash_id="bash_8")  # Should show: "status": "completed", "exit_code": 0
BashOutput(bash_id="bash_9")  # Should show: "status": "completed", "exit_code": 0  
BashOutput(bash_id="bash_10") # Should show: "status": "completed", "exit_code": 0
```

**GREEN Phase Gate**: Do NOT proceed to REFACTOR phase until ALL GREEN agents complete successfully and all success criteria are met.

## Phase 4: TDD REFACTOR Phase (Parallel Code Review)

### Step 1: Launch Review Agents in TDD Refactoring Mode
**CRITICAL**: Only launch after GREEN phase completely successful.

```python
# Agent 1: User Authentication Review (TDD REFACTOR)
Bash(
    command="cd /Users/jburbridge/Projects/jcvd/.worktrees/user-auth && claude -p 'Execute TDD REFACTOR phase for user authentication implementation. Review code quality, improve structure and performance while maintaining all test coverage. Focus on security best practices, code maintainability, and adherence to project standards. Ensure all tests continue passing after refactoring.' --append-system-prompt \"$(cat .claude/prompts/review-agent.txt)\" --permission-mode bypassPermissions --output-format stream-json --verbose",
    description="Launch TDD REFACTOR phase agent for user authentication",
    run_in_background=true
)
# Expected bash_id: e.g., "bash_11"

# Agent 2: User Profile Review (TDD REFACTOR)
Bash(
    command="cd /Users/jburbridge/Projects/jcvd/.worktrees/user-profile && claude -p 'Execute TDD REFACTOR phase for user profile management. Review and improve code quality, optimize data validation, enhance error handling while preserving test coverage. Ensure code follows project patterns and maintains all functionality.' --append-system-prompt \"$(cat .claude/prompts/review-agent.txt)\" --permission-mode bypassPermissions --output-format stream-json --verbose",
    description="Launch TDD REFACTOR phase agent for user profile",
    run_in_background=true
)
# Expected bash_id: e.g., "bash_12"

# Agent 3: Password Reset Review (TDD REFACTOR)  
Bash(
    command="cd /Users/jburbridge/Projects/jcvd/.worktrees/password-reset && claude -p 'Execute TDD REFACTOR phase for password reset functionality. Review security implementation, improve error handling, optimize token management while maintaining test coverage. Focus on security best practices and code quality improvements.' --append-system-prompt \"$(cat .claude/prompts/review-agent.txt)\" --permission-mode bypassPermissions --output-format stream-json --verbose",
    description="Launch TDD REFACTOR phase agent for password reset",
    run_in_background=true
)
# Expected bash_id: e.g., "bash_13"
```

### Step 2: Monitor REFACTOR Phase Progress
```python
# Check status of all TDD REFACTOR agents
BashOutput(bash_id="bash_11") # user-auth review
BashOutput(bash_id="bash_12") # user-profile review  
BashOutput(bash_id="bash_13") # password-reset review

# Filter for refactoring events
BashOutput(bash_id="bash_11", filter="refactor|review|quality|REFACTOR|commit")
BashOutput(bash_id="bash_12", filter="refactor|review|quality|REFACTOR|commit")
BashOutput(bash_id="bash_13", filter="refactor|review|quality|REFACTOR|commit")
```

### Step 3: REFACTOR Phase Success Criteria
**Must verify ALL of these for EACH worktree:**

```bash
# 1. Tests still pass after refactoring
cd .worktrees/user-auth && npm run test:run
cd .worktrees/user-profile && npm run test:run
cd .worktrees/password-reset && npm run test:run
# Expected: All tests still pass (exit code 0) 

# 2. Code quality improvements made
cd .worktrees/user-auth && npm run lint
cd .worktrees/user-profile && npm run lint  
cd .worktrees/password-reset && npm run lint
# Expected: No lint errors

# 3. TypeScript compilation still successful
cd .worktrees/user-auth && npm run type-check
cd .worktrees/user-profile && npm run type-check
cd .worktrees/password-reset && npm run type-check
# Expected: No TypeScript errors

# 4. Git commits made for refactoring
cd .worktrees/user-auth && git log --oneline -n 4
cd .worktrees/user-profile && git log --oneline -n 4
cd .worktrees/password-reset && git log --oneline -n 4
# Expected: Recent commits with TDD REFACTOR phase messages

# 5. Agent completion status
BashOutput(bash_id="bash_11") # Should show: "status": "completed", "exit_code": 0
BashOutput(bash_id="bash_12") # Should show: "status": "completed", "exit_code": 0
BashOutput(bash_id="bash_13") # Should show: "status": "completed", "exit_code": 0
```

## Phase 5: Final Validation

### Step 1: Complete TDD Cycle Verification
```bash
# Verify complete TDD history for each feature
for worktree in .worktrees/*/; do
    echo "=== TDD History for $(basename "$worktree") ==="
    (cd "$worktree" && git log --oneline --grep="RED\|GREEN\|REFACTOR" -n 10)
    echo ""
done
# Expected: Clear RED → GREEN → REFACTOR commit sequence for each feature
```

### Step 2: Cross-Feature Integration Test
```bash
# Run comprehensive test suite from main repository
npm run test:run
# Expected: All tests pass (including new features)

# Run lint across all worktrees  
for worktree in .worktrees/*/; do
    echo "=== Linting $(basename "$worktree") ==="
    (cd "$worktree" && npm run lint)
done
# Expected: No lint errors in any worktree
```

### Step 3: Feature Completeness Assessment
```bash
# Check file structure created in each worktree
for worktree in .worktrees/*/; do
    echo "=== Files in $(basename "$worktree") ==="
    find "$worktree" -name "*.ts" -o -name "*.test.ts" -o -name "*.spec.ts" | grep -E "(src|tests)" | sort
    echo ""
done
# Expected: Implementation files AND test files for each feature
```

## Success Criteria Summary

**Overall Test PASSES if ALL of the following are met:**

### ✅ Process Success Criteria
- [ ] All 9 agents complete successfully (3 RED + 3 GREEN + 3 REFACTOR)
- [ ] No agent failures or timeouts
- [ ] All bash_ids show "status": "completed", "exit_code": 0
- [ ] No Claude CLI command failures

### ✅ TDD Methodology Success Criteria  
- [ ] RED Phase: All tests initially fail in all 3 worktrees
- [ ] GREEN Phase: All tests pass after implementation in all 3 worktrees
- [ ] REFACTOR Phase: Tests continue passing after code improvements in all 3 worktrees
- [ ] Clear commit history showing RED → GREEN → REFACTOR progression

### ✅ Code Quality Success Criteria
- [ ] TypeScript compilation successful in all worktrees
- [ ] ESLint passes in all worktrees
- [ ] Proper error handling and validation implemented
- [ ] Security best practices followed (especially for auth and password reset)

### ✅ Parallel Development Success Criteria
- [ ] 3 features developed simultaneously without conflicts
- [ ] Isolated worktree development successful
- [ ] No cross-feature interference or shared file conflicts
- [ ] Each feature maintains independent git history

### ✅ Integration Success Criteria
- [ ] All features integrate cleanly with existing codebase
- [ ] No breaking changes to existing functionality
- [ ] Comprehensive test coverage for new features
- [ ] Features work together harmoniously

## Failure Modes and Troubleshooting

### Agent Failures
**Symptom**: Agent shows "status": "failed" or "exit_code": != 0
**Investigation**:
```bash
BashOutput(bash_id="failed_agent_id") # Check full error output
```
**Common Causes**: Claude CLI not found, permission issues, prompt file missing

### Test Failures  
**Symptom**: Tests fail during GREEN or REFACTOR phases
**Investigation**:
```bash
cd .worktrees/failing-feature && npm run test:run -- --verbose
```
**Common Causes**: Implementation doesn't match test expectations, refactoring broke functionality

### Git Issues
**Symptom**: No commits or commit failures
**Investigation**:  
```bash
cd .worktrees/failing-feature && git status && git log --oneline -n 5
```
**Common Causes**: File permission issues, git configuration problems

### TypeScript/Lint Issues
**Symptom**: Compilation or lint failures
**Investigation**:
```bash
cd .worktrees/failing-feature && npm run type-check && npm run lint
```
**Common Causes**: Import path issues, code style violations, missing type definitions

## Comparison with Previous TDD Approach

This test validates that our decoupled generic agent approach produces **equivalent results** to the previous TDD-specific agent system:

### Functional Equivalence
- **Same TDD phases**: RED → GREEN → REFACTOR sequence maintained  
- **Same quality gates**: All tests must pass after each phase
- **Same parallel execution**: Multiple features developed simultaneously
- **Same commit structure**: Clear phase-based commit history

### Architectural Improvements
- **Flexibility**: Agents can work in multiple workflows, not just TDD
- **Maintainability**: Fewer specialized prompt files to maintain
- **Extensibility**: Easy to add new workflows without new agent types
- **Clarity**: Clear separation between parallel infrastructure and workflow choice

### Risk Mitigation
- **Legacy support**: Original TDD agents still available for comparison
- **Gradual migration**: Can test both approaches and compare results
- **Rollback capability**: Can revert to original approach if needed

## Test Execution Timeline

**Estimated Duration**: 45-60 minutes total
- **Setup Phase**: 5-10 minutes
- **RED Phase**: 10-15 minutes  
- **GREEN Phase**: 15-20 minutes
- **REFACTOR Phase**: 10-15 minutes
- **Validation**: 5-10 minutes

**Critical Decision Points**:
- After RED: Verify all tests fail before proceeding
- After GREEN: Verify all tests pass before proceeding  
- After REFACTOR: Verify tests still pass and quality improved

This comprehensive test plan validates that our architectural refactoring maintains full TDD capability while providing the flexibility for other development workflows.
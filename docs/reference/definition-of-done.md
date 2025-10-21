---
title: "Definition of Done"
type: reference
domain: [development, quality, process]
description: "Comprehensive completion criteria for all development work in CycleTime"
dependencies: []
related: [../contributing/document-standards.md, ../../CONTRIBUTING.md, ../testing/strategy.md, ../../.claude/shared/testing-standards.md]
keywords: [definition-of-done, dod, quality-gates, completion-criteria, standards, code-quality, testing, documentation]
last_updated: 2025-10-21
---

# Definition of Done

This document establishes clear, measurable completion criteria for all development work in CycleTime. Every feature, bug fix, refactoring, and documentation change must meet these standards before being considered complete.

## Purpose

The Definition of Done (DoD) ensures:
- **Consistent Quality**: Every change meets the same high standards
- **Clear Expectations**: Developers know exactly what "done" means
- **Reduced Rework**: Issues are caught early, not in production
- **Team Alignment**: Shared understanding of completion criteria
- **Continuous Delivery**: Code is always in a deployable state

## Core Principle

**Work is not done until it is production-ready.** This means fully implemented, tested, documented, reviewed, and integrated into the main branch without breaking existing functionality.

---

## 1. Code Completion Criteria

### 1.1 Functionality Complete

**Criteria:**
- [ ] All acceptance criteria from Linear issue are implemented
- [ ] Feature works as specified in requirements
- [ ] Edge cases are handled appropriately
- [ ] Error conditions have proper error handling
- [ ] No known bugs or defects remain

**Verification:**
```bash
# Manual verification through issue acceptance criteria
# Functional testing through automated tests
./gradlew test
```

**Example - PASS:**
```kotlin
// User authentication feature with all edge cases handled
fun authenticate(credentials: Credentials): Result<User> {
    return when {
        credentials.isEmpty() -> Result.failure(InvalidCredentialsException())
        !credentials.isValid() -> Result.failure(InvalidFormatException())
        else -> repository.findUser(credentials)
            .map { user -> user.validatePassword(credentials.password) }
            .getOrElse { Result.failure(AuthenticationFailedException()) }
    }
}
```

**Example - FAIL:**
```kotlin
// Missing edge case handling
fun authenticate(credentials: Credentials): User {
    return repository.findUser(credentials).get() // Can throw if not found!
}
```

### 1.2 Code Quality Standards

**Criteria:**
- [ ] Follows Kotlin coding conventions
- [ ] Uses meaningful variable and function names
- [ ] Functions are focused and single-purpose
- [ ] Complex logic has explanatory comments
- [ ] No commented-out code (use version control)
- [ ] No hardcoded values (use configuration)
- [ ] No security vulnerabilities (secrets, SQL injection, etc.)

**Verification:**
```bash
./gradlew detekt  # Must pass with zero violations
```

**Example - PASS:**
```kotlin
/**
 * Validates session expiration based on configured timeout.
 * Uses injected TimeProvider to ensure testability.
 */
class SessionValidator(
    private val timeProvider: TimeProvider,
    private val config: SessionConfig
) {
    fun isExpired(session: Session): Boolean {
        val sessionAge = Duration.between(
            session.lastActivity,
            timeProvider.now()
        )
        return sessionAge > config.maxAge
    }
}
```

**Example - FAIL:**
```kotlin
// Hardcoded timeout, untestable time dependency
fun isExpired(session: Session): Boolean {
    val age = System.currentTimeMillis() - session.lastActivity
    return age > 3600000 // Magic number!
}
```

### 1.3 Architecture Alignment

**Criteria:**
- [ ] Follows Domain-Driven Design principles
- [ ] Uses dependency injection (Ktor native DI)
- [ ] Respects layered architecture (domain → application → infrastructure → MCP)
- [ ] Interfaces used for external dependencies
- [ ] Repository pattern for data access
- [ ] No domain logic in infrastructure layer

**Verification:**
- Manual code review against architecture patterns
- Check dependency direction (infrastructure depends on domain, not vice versa)

**References:**
- [Architecture Overview](../architecture/overview.md)
- [Dependency Injection Patterns](../patterns/architecture/dependency-injection.md)
- [Domain-Driven Design](../concepts/architecture/domain-driven-design.md)

### 1.4 Performance Compliance

**Criteria:**
- [ ] No regression from baseline metrics
- [ ] Response times within established thresholds:
  - MCP tool calls: < 500ms (p95)
  - Database queries: < 100ms (p95)
  - API endpoints: < 1s (p95)
- [ ] Memory usage remains stable (no leaks)
- [ ] No unnecessary blocking operations

**Verification:**
```bash
# Run performance baseline tests
./gradlew systemTest --tests "*PerformanceTest"

# Compare against baseline
diff <(cat docs/performance/baseline-results.md) <(./gradlew systemTest | grep -A 20 "Performance Results")
```

**References:**
- [Performance Baseline Results](../archive/pre-dag-migration/performance/baseline-results.md) (archived - pending migration)
- [Caching Strategy](../archive/pre-dag-migration/performance/caching-strategy.md) (archived - pending migration)

---

## 2. Documentation Requirements

### 2.1 Code Documentation

**Criteria:**
- [ ] Public APIs have KDoc comments
- [ ] Complex algorithms have explanatory comments
- [ ] Non-obvious business rules are documented
- [ ] Architectural decisions are explained (inline or ADR)
- [ ] No misleading or outdated comments

**Example - PASS:**
```kotlin
/**
 * Manages session lifecycle with configurable timeout and cleanup.
 *
 * Sessions are stored in-memory with periodic cleanup of expired entries.
 * Cleanup runs every [SessionConfig.cleanupInterval] to prevent memory leaks.
 *
 * @param sessionService Application service for session CRUD operations
 * @param timeProvider Injectable time source for testing
 * @param dbProvider Database connection provider
 * @param config Session configuration (timeout, cleanup interval)
 */
class SessionManager(
    private val sessionService: SessionApplicationService,
    private val timeProvider: TimeProvider,
    private val dbProvider: DatabaseProvider,
    private val config: SessionConfig
) { /* ... */ }
```

### 2.2 Documentation File Standards

**NEW REQUIREMENT (SPI-722):**

All new or modified documentation files MUST include:

- [ ] **YAML frontmatter** with required fields:
  - `title`: Clear, descriptive title
  - `type`: Document type (guide, reference, concept, tutorial)
  - `domain`: Relevant domains (array)
  - `description`: One-sentence summary
  - `dependencies`: Prerequisite documents (array)
  - `related`: Related documents with context (array)
  - `keywords`: Searchable terms (array)
  - `last_updated`: ISO date (YYYY-MM-DD)

- [ ] **Dependency declarations** for prerequisite knowledge
- [ ] **Cross-references updated** to point to new doc structure
- [ ] **Relative paths** used for all internal links
- [ ] **Length guidelines** followed (200-500 lines optimal)

**Example - PASS:**
```yaml
---
title: "Session Management Architecture"
type: concept
domain: [architecture, sessions]
description: "Design and implementation of session lifecycle management"
dependencies: [../architecture/overview.md]
related: [./dependency-injection-patterns.md, ../../api/mcp-tools-reference.md]
keywords: [sessions, lifecycle, architecture, state-management]
last_updated: 2025-10-21
---
```

**Example - FAIL:**
```markdown
# Session Management

This document explains sessions...
<!-- Missing frontmatter entirely! -->
```

**Verification:**
```bash
# Check for frontmatter in new/modified docs
git diff main --name-only -- 'docs/**/*.md' | while read file; do
    if ! head -1 "$file" | grep -q "^---$"; then
        echo "ERROR: Missing frontmatter in $file"
    fi
done
```

**References:**
- [Document Standards](../contributing/document-standards.md)
- [DAG Documentation Architecture](../README.md)

### 2.3 User-Facing Documentation

**Criteria:**
- [ ] README updated if installation/usage changes
- [ ] API documentation updated for new/changed endpoints
- [ ] Migration guides provided for breaking changes
- [ ] Configuration examples updated
- [ ] Troubleshooting guide updated for new error scenarios

**Applies to:**
- New MCP tools or resources
- API endpoint changes
- Configuration option changes
- Deployment procedure changes
- Error handling changes

---

## 3. Quality Gates

### 3.1 Static Analysis

**Criteria:**
- [ ] Detekt passes with zero violations
- [ ] No suppressed warnings without justification
- [ ] Code complexity within thresholds (cyclomatic complexity < 15)
- [ ] No duplicated code blocks

**Verification:**
```bash
./gradlew detekt
# Expected output: "0 findings" or justified suppressions only
```

**Acceptable Suppression:**
```kotlin
@Suppress("ComplexMethod") // Business rules complexity inherent to domain
fun calculatePremium(policy: Policy): Amount {
    // 20+ line method with business rule complexity
}
```

**Unacceptable Suppression:**
```kotlin
@Suppress("TooManyFunctions") // Lazy - refactor instead!
class GodObject { /* 50 methods */ }
```

### 3.2 Test Coverage

**Criteria:**
- [ ] Overall coverage ≥ 80% (enforced by koverVerify)
- [ ] Business logic coverage = 100%
- [ ] New code coverage ≥ existing project average
- [ ] Meaningful tests (not just coverage for coverage)

**Verification:**
```bash
./gradlew koverVerify koverHtmlReport
# Open build/reports/kover/html/index.html
```

**Coverage by Component Type:**
- **Domain entities**: 100% (pure business logic)
- **Application services**: 100% (orchestration logic)
- **Infrastructure**: 80% (database, external systems)
- **MCP handlers**: 90% (tool and resource handlers)
- **Configuration**: 60% (mostly boilerplate)

**References:**
- [Testing Strategy](../concepts/testing/testing-strategy.md)
- [Testing Standards](../../.claude/shared/testing-standards.md)

### 3.3 Security Review

**Required for changes involving:**

- [ ] **Authentication/Authorization**: Token handling, permission checks
- [ ] **Data Access**: Database queries, file system access
- [ ] **API Endpoints**: Input validation, rate limiting
- [ ] **Configuration**: Secret management, sensitive settings
- [ ] **External Integrations**: Third-party API calls, webhooks

**Security Checklist:**
- [ ] No secrets in code (use environment variables)
- [ ] Input validation on all user-supplied data
- [ ] SQL injection prevention (parameterized queries)
- [ ] Proper error messages (no stack traces to users)
- [ ] Authentication checks on protected endpoints
- [ ] Rate limiting on public endpoints

**Verification:**
```bash
# Check for secrets in code
git diff main | grep -iE '(password|secret|key|token).*=.*["\']'

# Dependency vulnerability scan
./gradlew dependencyCheckAnalyze
```

**Example - PASS:**
```kotlin
// Environment variable for secrets
val apiKey = System.getenv("CYCLETIME_API_KEY")
    ?: throw ConfigurationException("API key required")

// Parameterized query (SQL injection safe)
fun findUser(email: String): User? {
    return transaction {
        Users.select { Users.email eq email }.singleOrNull()
    }
}
```

**Example - FAIL:**
```kotlin
// Secret hardcoded!
val apiKey = "sk-1234567890abcdef"

// SQL injection vulnerable!
val query = "SELECT * FROM users WHERE email = '$email'"
```

### 3.4 Build Pipeline Success

**Criteria:**
- [ ] Local build succeeds: `./gradlew build`
- [ ] All CI checks pass (triggered on PR)
- [ ] No build warnings (treat warnings as errors)
- [ ] Docker build succeeds (if infrastructure changes)

**CI Checks:**
- Unit tests (parallel execution)
- Integration tests (database setup)
- System tests (performance baselines)
- Static analysis (detekt)
- Dependency security scan
- Commit message validation

**Verification:**
```bash
# Run full local build
./gradlew clean build

# Verify Docker build (if applicable)
docker build -t cycletime:test .
```

---

## 4. Linear Integration

### 4.1 Issue Status Management

**Criteria:**
- [ ] Subtask status updated to "In Progress" when work begins
- [ ] Subtask status updated to "Done" when work completes
- [ ] Parent story status updated only when ALL subtasks complete
- [ ] Issue status reflects actual work state (not aspirational)

**Workflow:**
```
1. Start work: Todo → In Progress (subtask)
2. Complete work: In Progress → Done (subtask)
3. All subtasks done: Story → In Review (parent)
4. After code review: In Review → Done (parent)
```

**IMPORTANT:** Update status fields using Linear integration, not comments.

**Correct:**
```bash
# Update subtask status to Done
mcp__linear-server__update_issue --id "SPI-123" --state "Done"
```

**Incorrect:**
```bash
# Don't use comments for status updates!
mcp__linear-server__create_comment --issueId "SPI-123" --body "Work completed"
```

**References:**
- [Linear Reference](../../.claude/shared/linear-reference.md)
- [Linear Integration Guide](../guides/development/linear-integration.md)

### 4.2 Acceptance Criteria Verification

**Criteria:**
- [ ] All acceptance criteria checked off in Linear
- [ ] Each criterion verified through testing
- [ ] No unchecked criteria remain
- [ ] No "partially complete" items

**Verification Process:**
1. Read acceptance criteria from Linear issue
2. Create test for each criterion
3. Verify test passes
4. Check off criterion in Linear
5. Repeat for all criteria

### 4.3 Related Issues Linked

**Criteria:**
- [ ] Dependencies declared (blocks, blocked by)
- [ ] Related issues linked (relates to)
- [ ] Duplicate issues marked and linked
- [ ] Parent-child relationships correct (story → subtask)

**Link Types:**
- **Blocks**: This issue must complete before linked issue
- **Blocked by**: Cannot proceed until linked issue completes
- **Relates to**: Related work, useful context
- **Duplicates**: Same issue, close one

### 4.4 Implementation Notes

**Required for:**
- Complex technical decisions
- Architectural trade-offs
- Non-obvious implementation approaches
- Future improvement opportunities
- Known limitations or constraints

**Example - Implementation Note:**
```
Implementation used in-memory caching with LRU eviction (SPI-456).
Considered Redis but opted for simplicity given current scale.
Monitor cache hit rate; if < 70%, revisit Redis implementation.

Performance: 95th percentile response time: 45ms (baseline: 120ms)
Trade-off: Memory usage increased 50MB for 10,000 sessions
```

---

## 5. Testing Requirements

### 5.1 Unit Tests

**Criteria:**
- [ ] 100% coverage of business logic
- [ ] All edge cases tested
- [ ] Error conditions tested
- [ ] Tests are fast (< 10ms per test)
- [ ] Tests are isolated (no external dependencies)
- [ ] Uses mocks/fakes for dependencies

**Location:** `src/test/kotlin/`

**Verification:**
```bash
./gradlew unitTest
# Expected: All pass, < 30s total runtime
```

**Example:**
```kotlin
class SessionValidatorTest : StringSpec({
    lateinit var mockTimeProvider: MockTimeProvider
    lateinit var validator: SessionValidator

    beforeEach {
        mockTimeProvider = MockTimeProvider()
        validator = SessionValidator(
            mockTimeProvider,
            SessionConfig(maxAge = Duration.ofSeconds(60))
        )
    }

    "should expire session when maxAge exceeded" {
        val session = Session(
            lastActivity = mockTimeProvider.now()
        )

        mockTimeProvider.advance(Duration.ofSeconds(61))

        validator.isExpired(session) shouldBe true
    }

    "should not expire session within maxAge" {
        val session = Session(
            lastActivity = mockTimeProvider.now()
        )

        mockTimeProvider.advance(Duration.ofSeconds(59))

        validator.isExpired(session) shouldBe false
    }
})
```

**Anti-Pattern (NEVER DO):**
```kotlin
// ❌ Real time dependency (flaky)
"should expire session" {
    val session = Session(lastActivity = Instant.now())
    delay(1100) // Flaky! Depends on real time
    validator.isExpired(session) shouldBe true
}
```

### 5.2 Integration Tests

**Criteria:**
- [ ] All database operations tested
- [ ] Repository implementations tested
- [ ] API endpoints tested
- [ ] Real infrastructure (database, HTTP)
- [ ] Tests are moderate speed (< 100ms per test)
- [ ] Database isolation (fresh DB per test)

**Location:** `src/integrationTest/kotlin/`

**Verification:**
```bash
./gradlew integrationTest
# Expected: All pass, < 3min total runtime
```

**Example:**
```kotlin
class SessionRepositoryIntegrationTest : StringSpec({
    lateinit var database: Database
    lateinit var repository: SessionRepository

    beforeEach {
        database = Database.connect(
            "jdbc:h2:mem:test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1"
        )
        transaction(database) {
            SchemaUtils.create(SessionStates, Projects, Issues)
        }
        repository = ExposedSessionRepository()
    }

    afterEach {
        TransactionManager.closeAndUnregister(database)
    }

    "should persist and retrieve session" {
        val session = Session(id = "sess-123", projectId = "proj-456")

        repository.save(session)
        val retrieved = repository.findById("sess-123")

        retrieved shouldBe session
    }
})
```

### 5.3 System Tests

**Criteria:**
- [ ] Critical workflows tested end-to-end
- [ ] Performance baselines validated
- [ ] Production-like conditions
- [ ] Tests are slower (< 1s per test acceptable)
- [ ] Load testing where applicable

**Location:** `src/systemTest/kotlin/`

**Verification:**
```bash
./gradlew systemTest
# Expected: All pass, < 10min total runtime
```

**Example:**
```kotlin
class WorkflowSystemTest : StringSpec({
    "should complete full session lifecycle" {
        testApplication {
            // Full MCP server + database + all components

            // Create session via MCP
            val createResponse = client.post("/mcp/tools/create_session") {
                contentType(ContentType.Application.Json)
                setBody("""{"projectId": "proj-123"}""")
            }
            createResponse.status shouldBe HttpStatusCode.OK

            // Use session
            val sessionId = extractSessionId(createResponse)

            // Verify session persisted
            val getResponse = client.get("/mcp/tools/get_session/$sessionId")
            getResponse.status shouldBe HttpStatusCode.OK

            // Cleanup session
            client.delete("/mcp/tools/delete_session/$sessionId")
        }
    }
})
```

### 5.4 Test Quality Standards

**Criteria:**
- [ ] Tests are deterministic (pass consistently)
- [ ] Tests are independent (can run in any order)
- [ ] Tests have clear names (describe what they test)
- [ ] Tests use AAA pattern (Arrange, Act, Assert)
- [ ] No commented-out tests
- [ ] No ignored tests without justification

**References:**
- [Testing Standards](../../.claude/shared/testing-standards.md)
- [Testing Strategy](../concepts/testing/testing-strategy.md)
- [Test Architecture](../concepts/testing/test-architecture.md)

---

## 6. Git & Code Review

### 6.1 Branch Naming

**Criteria:**
- [ ] Branch follows naming convention
- [ ] Branch name includes Linear issue ID
- [ ] Branch name is descriptive

**Convention:**
```
<type>/spi-XXX-description

Types:
- feat/    : New features
- fix/     : Bug fixes
- docs/    : Documentation only
- refactor/: Code refactoring
- test/    : Test additions/changes
- chore/   : Maintenance tasks
```

**Examples:**
```
feat/spi-722-dag-documentation-structure
fix/spi-456-session-expiration-bug
docs/add-definition-of-done
refactor/spi-789-extract-session-validator
```

**References:**
- [Git Conventions](../../.claude/shared/git-conventions.md)
- [Branching Strategy](../guides/development/branching-strategy.md)

### 6.2 Commit Messages

**Criteria:**
- [ ] Follows Conventional Commits specification
- [ ] Type is appropriate (feat, fix, docs, etc.)
- [ ] Scope is meaningful (optional but recommended)
- [ ] Subject is imperative mood ("add" not "added")
- [ ] Subject is ≤ 50 characters
- [ ] Body explains "why" not "what" (if needed)
- [ ] References Linear issue in footer

**Format:**
```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

**Examples:**

**PASS:**
```
feat(sessions): add configurable session timeout

Implement session timeout with configurable duration to allow
different timeout policies per deployment environment.

Implements SPI-456
```

**PASS:**
```
fix(auth): handle expired JWT tokens gracefully

JWT validation was throwing uncaught exception on expired tokens,
causing 500 errors. Now returns 401 with proper error message.

Fixes SPI-789
```

**FAIL:**
```
fixed bug
<!-- Missing type, non-descriptive -->
```

**FAIL:**
```
feat: Added new session timeout feature with configurable duration
<!-- Subject too long (>50 chars) -->
```

**Verification:**
```bash
# Validate commits locally
npm run commitlint-ci  # Last commit
npm run commitlint-pr  # All commits in branch
```

**References:**
- [CONTRIBUTING.md](../../CONTRIBUTING.md) - Full commit message guide

### 6.3 Pull Request Requirements

**Criteria:**
- [ ] PR title follows commit message convention
- [ ] PR description explains changes thoroughly
- [ ] PR links to Linear issue
- [ ] PR includes testing approach
- [ ] Breaking changes clearly documented
- [ ] Screenshots/videos for UI changes
- [ ] No merge conflicts with main
- [ ] Branch is up-to-date with main

**PR Description Template:**
```markdown
## Summary
Brief description of changes (2-3 sentences)

## Linear Issue
Implements SPI-XXX: [Issue Title](linear-url)

## Changes
- Added session timeout configuration
- Implemented timeout validation in SessionValidator
- Updated session manager to use configurable timeout

## Testing
- Unit tests: SessionValidatorTest (100% coverage)
- Integration tests: SessionRepositoryIntegrationTest
- System tests: SessionLifecycleSystemTest
- Manual testing: Verified timeout in local environment

## Breaking Changes
None

## Documentation
- Updated docs/architecture/session-management.md
- Added KDoc to SessionValidator class
```

### 6.4 Code Review Approval

**Criteria:**
- [ ] At least one approving review from maintainer
- [ ] All review comments addressed or discussed
- [ ] No unresolved conversations
- [ ] Reviewer verified tests pass locally (for complex changes)
- [ ] Security review completed (if applicable)

**Review Focus Areas:**
1. **Correctness**: Does it work as intended?
2. **Architecture**: Does it fit the design?
3. **Testability**: Is it properly tested?
4. **Security**: Are there vulnerabilities?
5. **Performance**: Will it scale?
6. **Maintainability**: Can others understand it?

**Review Checklist:**
```markdown
- [ ] Code follows architecture patterns
- [ ] Tests are comprehensive and meaningful
- [ ] No security vulnerabilities introduced
- [ ] Performance impact assessed
- [ ] Documentation is clear and complete
- [ ] Breaking changes properly handled
```

---

## 7. Continuous Integration

### 7.1 CI Pipeline Success

**All CI checks must pass:**

- [ ] **Commit Validation**: All commit messages valid
- [ ] **Unit Tests**: All unit tests pass
- [ ] **Integration Tests**: All integration tests pass
- [ ] **System Tests**: All system tests pass
- [ ] **Static Analysis**: Detekt passes with zero violations
- [ ] **Coverage**: Coverage thresholds met (≥80%)
- [ ] **Security Scan**: No vulnerable dependencies
- [ ] **Build**: Clean build succeeds

**Pipeline Stages:**
```
1. Commit Message Validation
2. Unit Tests (parallel)
3. Integration Tests (parallel)
4. System Tests (sequential)
5. Static Analysis (detekt)
6. Coverage Report (kover)
7. Security Scan (dependency check)
8. Build Verification (JAR + Docker)
```

### 7.2 Performance Baseline Compliance

**Criteria:**
- [ ] No regression in response times (within 10% of baseline)
- [ ] Memory usage within acceptable range
- [ ] Database query counts unchanged or reduced
- [ ] No new slow queries (> 100ms)

**Baseline Metrics:**
```
MCP Tool Calls:
- create_session: 45ms (p95)
- get_session: 12ms (p95)
- list_issues: 78ms (p95)

Database Operations:
- Insert: 5ms (p95)
- Select: 8ms (p95)
- Update: 6ms (p95)
```

**Verification:**
```bash
./gradlew systemTest --tests "*PerformanceTest"
# Review output against docs/performance/baseline-results.md
```

**References:**
- [Performance Baseline Results](../archive/pre-dag-migration/performance/baseline-results.md) (archived - pending migration)

---

## 8. Definition of Done Checklist

Use this checklist to verify work is complete:

### Code Quality
- [ ] All acceptance criteria implemented
- [ ] Detekt passes with zero violations
- [ ] Code follows architecture patterns
- [ ] No hardcoded values or secrets
- [ ] Performance within thresholds
- [ ] Security review completed (if applicable)

### Testing
- [ ] Unit tests pass (100% business logic coverage)
- [ ] Integration tests pass (all infrastructure tested)
- [ ] System tests pass (critical workflows validated)
- [ ] All tests are deterministic and fast
- [ ] Test coverage ≥ 80% overall

### Documentation
- [ ] Code has appropriate KDoc/comments
- [ ] New docs have YAML frontmatter
- [ ] Dependencies declared in frontmatter
- [ ] Cross-references updated
- [ ] README/guides updated (if applicable)

### Linear Integration
- [ ] Issue status updated correctly
- [ ] All acceptance criteria verified
- [ ] Related issues linked
- [ ] Implementation notes added

### Git & Review
- [ ] Branch name follows convention
- [ ] Commits follow Conventional Commits
- [ ] PR description is comprehensive
- [ ] Code review approved
- [ ] No merge conflicts
- [ ] All CI checks pass

### Build & Deploy
- [ ] Local build succeeds
- [ ] All CI pipeline checks pass
- [ ] Docker build succeeds (if applicable)
- [ ] No build warnings

---

## 9. Exceptions and Edge Cases

### 9.1 When DoD May Be Relaxed

**Documentation-only changes:**
- Tests not required for docs-only PRs
- Still requires: proper frontmatter, review approval, build success

**Emergency hotfixes:**
- May bypass normal review for severity 1 production issues
- Still requires: tests, documentation, post-incident review
- Expedited process, not skipped process

**Experimental/spike work:**
- Exploratory work may skip full test coverage
- Must be clearly marked as experimental
- Cannot be merged to main without meeting full DoD

### 9.2 Never Skip These

**Always required, no exceptions:**
- [ ] Code review approval
- [ ] No secrets in code
- [ ] Commit message validation
- [ ] Build success
- [ ] Linear issue tracking

---

## 10. DoD Compliance

### 10.1 Self-Assessment

Before requesting review, honestly assess:
1. "Would I be comfortable deploying this to production right now?"
2. "Can another developer understand and maintain this code?"
3. "Are there any shortcuts or 'TODOs' I'm leaving for later?"

If any answer is "no" or uncertain, the work is not done.

### 10.2 Review Enforcement

Code reviewers should:
- Use this DoD as their review checklist
- Block PRs that don't meet DoD criteria
- Provide specific DoD references in feedback
- Ensure team consistency in standards

### 10.3 Continuous Improvement

This DoD should evolve:
- Updated as new patterns emerge
- Refined based on production issues
- Simplified if overly burdensome
- Expanded if gaps are discovered

**Propose changes via:**
1. Discussion in team retrospectives
2. PR to update this document
3. ADR for significant changes

---

## 11. Novel Project-Specific Criteria

Beyond standard Definition of Done practices, CycleTime adds:

### 11.1 DAG Documentation Architecture (SPI-722)
- All documentation includes machine-readable frontmatter
- Dependencies form a directed acyclic graph
- Enables RAG-optimized retrieval for AI agents
- **Impact**: Better context for AI-assisted development

### 11.2 Baseline Performance Testing
- Every change compared against performance baseline
- Regression detected automatically in CI
- **Impact**: Prevents performance degradation over time

### 11.3 Three-Tier Test Categorization
- Physical separation by source set (not package filters)
- Clear execution strategies per tier
- **Impact**: Faster feedback, clearer test purposes

### 11.4 Linear Subtask-First Workflow
- Update subtask status, not parent comments
- Parent status reflects subtask completion
- **Impact**: Better progress tracking, clearer accountability

### 11.5 Time-Mockable Architecture
- All time dependencies injected (TimeProvider)
- No `Instant.now()` or `delay()` in business logic
- **Impact**: Deterministic, fast tests

### 11.6 Agent-Optimized Documentation
- Documentation written for AI agent consumption
- Structured for context retrieval
- **Impact**: Better AI-assisted development experience

---

## References

### Internal Standards
- [Testing Strategy](../concepts/testing/testing-strategy.md)
- [Testing Standards](../../.claude/shared/testing-standards.md)
- [Document Standards](../contributing/document-standards.md)
- [Architecture Overview](../architecture/overview.md)
- [CONTRIBUTING.md](../../CONTRIBUTING.md)

### Development Workflows
- [Single Feature Workflow](../guides/development/feature-workflow.md)
- [TDD Workflow](../../.claude/workflows/tdd-workflow.md)
- [Bug Fix Workflow](../../.claude/workflows/bugfix-workflow.md)

### Linear & Git
- [Linear Reference](../../.claude/shared/linear-reference.md)
- [Git Conventions](../../.claude/shared/git-conventions.md)
- [Branching Strategy](../guides/development/branching-strategy.md)

---

**Remember:** The Definition of Done exists to maintain quality and enable continuous delivery. It's not bureaucracy—it's your safety net for shipping production-ready code with confidence.

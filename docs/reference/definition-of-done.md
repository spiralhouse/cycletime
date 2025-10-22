---
title: "Definition of Done"
type: reference
domain: [development, quality, process]
description: "Comprehensive completion criteria for all development work in CycleTime"
dependencies: []
related: [../contributing/document-standards.md, ../../CONTRIBUTING.md, ../concepts/testing/testing-strategy.md, ../../.claude/shared/testing-standards.md]
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

**Verification:** See [Verification Commands](#verification-commands-reference)

**Examples:** [Error Handling Example](../examples/definition-of-done/error-handling-example.md)

### 1.2 Code Quality Standards

**Criteria:**
- [ ] Follows Kotlin coding conventions
- [ ] Uses meaningful variable and function names
- [ ] Functions are focused and single-purpose
- [ ] Complex logic has explanatory comments
- [ ] No commented-out code (use version control)
- [ ] No hardcoded values (use configuration)
- [ ] No security vulnerabilities (secrets, SQL injection, etc.)

**Verification:** See [Verification Commands](#verification-commands-reference)

### 1.3 Architecture Alignment

**Complete standards:** See [Architecture Overview](../architecture/overview.md)

**Criteria:**
- [ ] Follows Domain-Driven Design principles
- [ ] Uses dependency injection (Ktor native DI)
- [ ] Respects layered architecture (domain → application → infrastructure → MCP)
- [ ] Interfaces used for external dependencies
- [ ] Repository pattern for data access
- [ ] No domain logic in infrastructure layer

**Examples:** [Architecture Alignment Example](../examples/definition-of-done/architecture-alignment-example.md)

**References:**
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

**Verification:** See [Verification Commands](#verification-commands-reference)

---

## 2. Documentation Requirements

### 2.1 Code Documentation

**Criteria:**
- [ ] Public APIs have KDoc comments
- [ ] Complex algorithms have explanatory comments
- [ ] Non-obvious business rules are documented
- [ ] Architectural decisions are explained (inline or ADR)
- [ ] No misleading or outdated comments

### 2.2 Documentation File Standards

**Complete standards:** See [Document Standards](../contributing/document-standards.md)

**Criteria (SPI-722):**
- [ ] YAML frontmatter present on all new/modified docs
- [ ] Required frontmatter fields: title, type, domain, description, dependencies, related, keywords, last_updated
- [ ] Dependencies declared for prerequisite topics
- [ ] Cross-references updated to new DAG structure
- [ ] Relative paths used for all internal links
- [ ] Document length appropriate for type (200-500 lines optimal)

**Verification:** See [Verification Commands](#verification-commands-reference)

**References:** [DAG Documentation Architecture](../README.md)

### 2.3 User-Facing Documentation

**Criteria:**
- [ ] README updated if installation/usage changes
- [ ] API documentation updated for new/changed endpoints
- [ ] Migration guides provided for breaking changes
- [ ] Configuration examples updated
- [ ] Troubleshooting guide updated for new error scenarios

**Applies to:** New MCP tools/resources, API changes, configuration changes, deployment changes, error handling changes

---

## 3. Quality Gates

### 3.1 Static Analysis

**Criteria:**
- [ ] Detekt passes with zero violations
- [ ] No suppressed warnings without justification
- [ ] Code complexity within thresholds (cyclomatic complexity < 15)
- [ ] No duplicated code blocks

**Verification:** See [Verification Commands](#verification-commands-reference)

**Note:** Suppressions require justification comment explaining why complexity is inherent to domain.

### 3.2 Test Coverage

**Complete standards:** See [Testing Standards](../../.claude/shared/testing-standards.md)

**Criteria:**
- [ ] Overall coverage ≥ 80% (enforced by koverVerify)
- [ ] Business logic coverage = 100%
- [ ] New code coverage ≥ existing project average
- [ ] Meaningful tests (not just coverage for coverage)

**Coverage by Component:**
- Domain entities: 100% (pure business logic)
- Application services: 100% (orchestration logic)
- Infrastructure: 80% (database, external systems)
- MCP handlers: 90% (tool and resource handlers)
- Configuration: 60% (mostly boilerplate)

**Verification:** See [Verification Commands](#verification-commands-reference)

**References:** [Testing Strategy](../concepts/testing/testing-strategy.md)

### 3.3 Security Review

**Required for changes involving:**
- [ ] Authentication/Authorization: Token handling, permission checks
- [ ] Data Access: Database queries, file system access
- [ ] API Endpoints: Input validation, rate limiting
- [ ] Configuration: Secret management, sensitive settings
- [ ] External Integrations: Third-party API calls, webhooks

**Security Checklist:**
- [ ] No secrets in code (use environment variables)
- [ ] Input validation on all user-supplied data
- [ ] SQL injection prevention (parameterized queries)
- [ ] Proper error messages (no stack traces to users)
- [ ] Authentication checks on protected endpoints
- [ ] Rate limiting on public endpoints

**Verification:** See [Verification Commands](#verification-commands-reference)

**Examples:** [Error Handling Example](../examples/definition-of-done/error-handling-example.md)

### 3.4 Build Pipeline Success

**Criteria:**
- [ ] Local build succeeds: `./gradlew build`
- [ ] All CI checks pass (triggered on PR)
- [ ] No build warnings (treat warnings as errors)
- [ ] Docker build succeeds (if infrastructure changes)

**CI Checks:** Commit validation, unit tests (parallel), integration tests (parallel), system tests (sequential), static analysis (detekt), coverage report (kover), security scan, build verification

**Verification:** See [Verification Commands](#verification-commands-reference)

---

## 4. Linear Integration

**Complete workflow:** See [Linear Reference](../../.claude/shared/linear-reference.md)

### 4.1 Issue Status Management

**Criteria:**
- [ ] Subtask status updated to "In Progress" when work begins
- [ ] Subtask status updated to "Done" when work completes
- [ ] Parent story status updated only when ALL subtasks complete
- [ ] Issue status reflects actual work state (not aspirational)

**Workflow:** Todo → In Progress (subtask) → Done (subtask) → In Review (parent story after ALL subtasks done) → Done (after code review)

**IMPORTANT:** Update status fields using Linear integration, not comments.

**References:** [Linear Integration Guide](../guides/development/linear-integration.md)

### 4.2 Acceptance Criteria Verification

**Criteria:**
- [ ] All acceptance criteria checked off in Linear
- [ ] Each criterion verified through testing
- [ ] No unchecked criteria remain
- [ ] No "partially complete" items

**Process:** Read criteria → Create test → Verify test passes → Check off in Linear → Repeat

### 4.3 Related Issues Linked

**Criteria:**
- [ ] Dependencies declared (blocks, blocked by)
- [ ] Related issues linked (relates to)
- [ ] Duplicate issues marked and linked
- [ ] Parent-child relationships correct (story → subtask)

### 4.4 Implementation Notes

**Required for:** Complex technical decisions, architectural trade-offs, non-obvious implementations, future improvements, known limitations

**Template:** Implementation approach, alternatives considered, performance metrics, trade-offs

---

## 5. Testing Requirements

**Complete standards:** See [Testing Standards](../../.claude/shared/testing-standards.md)

### 5.1 Unit Tests

**Criteria:**
- [ ] 100% coverage of business logic
- [ ] All edge cases tested
- [ ] Error conditions tested
- [ ] Tests are fast (< 10ms per test)
- [ ] Tests are isolated (no external dependencies)
- [ ] Uses mocks/fakes for dependencies

**Location:** `src/test/kotlin/`

**Performance:** All pass, < 30s total runtime

**Verification:** See [Verification Commands](#verification-commands-reference)

**Examples:** [Unit Test Example](../examples/definition-of-done/unit-test-example.md)

### 5.2 Integration Tests

**Criteria:**
- [ ] All database operations tested
- [ ] Repository implementations tested
- [ ] API endpoints tested
- [ ] Real infrastructure (database, HTTP)
- [ ] Tests are moderate speed (< 100ms per test)
- [ ] Database isolation (fresh DB per test)

**Location:** `src/integrationTest/kotlin/`

**Performance:** All pass, < 3min total runtime

**Verification:** See [Verification Commands](#verification-commands-reference)

**Examples:** [Integration Test Example](../examples/definition-of-done/integration-test-example.md)

### 5.3 System Tests

**Criteria:**
- [ ] Critical workflows tested end-to-end
- [ ] Performance baselines validated
- [ ] Production-like conditions
- [ ] Tests are slower (< 1s per test acceptable)
- [ ] Load testing where applicable

**Location:** `src/systemTest/kotlin/`

**Performance:** All pass, < 10min total runtime

**Verification:** See [Verification Commands](#verification-commands-reference)

**Examples:** [System Test Example](../examples/definition-of-done/system-test-example.md)

### 5.4 Test Quality Standards

**Criteria:**
- [ ] Tests are deterministic (pass consistently)
- [ ] Tests are independent (can run in any order)
- [ ] Tests have clear names (describe what they test)
- [ ] Tests use AAA pattern (Arrange, Act, Assert)
- [ ] No commented-out tests
- [ ] No ignored tests without justification

**References:**
- [Test Architecture](../concepts/testing/test-architecture.md)
- [Testing Standards](../../.claude/shared/testing-standards.md)

---

## 6. Git & Code Review

**Complete standards:** See [CONTRIBUTING.md](../../CONTRIBUTING.md)

### 6.1 Branch Naming

**Complete standards:** See [Git Conventions](../../.claude/shared/git-conventions.md)

**Criteria:**
- [ ] Branch follows naming convention: `<type>/spi-XXX-description`
- [ ] Branch name includes Linear issue ID
- [ ] Branch name is descriptive

**Types:** feat/, fix/, docs/, refactor/, test/, chore/

**Examples:** `feat/spi-722-dag-documentation`, `fix/spi-456-session-expiration`

**References:** [Branching Strategy](../guides/development/branching-strategy.md)

### 6.2 Commit Messages

**Complete standards:** See [CONTRIBUTING.md](../../CONTRIBUTING.md) sections on Conventional Commits

**Criteria:**
- [ ] Format: `<type>(<scope>): <subject>`
- [ ] Type is appropriate (feat, fix, docs, refactor, test, etc.)
- [ ] Subject is imperative mood ("add" not "added")
- [ ] Subject is ≤ 50 characters
- [ ] Body explains "why" not "what" (optional)
- [ ] References Linear issue in footer

**Verification:** See [Verification Commands](#verification-commands-reference)

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

**Template:** See CONTRIBUTING.md for PR description template

### 6.4 Code Review Approval

**Criteria:**
- [ ] At least one approving review from maintainer
- [ ] All review comments addressed or discussed
- [ ] No unresolved conversations
- [ ] Reviewer verified tests pass locally (for complex changes)
- [ ] Security review completed (if applicable)

**Review Focus:** Correctness, architecture, testability, security, performance, maintainability

---

## 7. Master Checklist

Quick self-assessment before requesting review:

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

## 8. Exceptions and Edge Cases

### 8.1 When DoD May Be Relaxed

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

### 8.2 Never Skip These

**Always required, no exceptions:**
- [ ] Code review approval
- [ ] No secrets in code
- [ ] Commit message validation
- [ ] Build success
- [ ] Linear issue tracking

---

## 9. Novel Project-Specific Criteria

Beyond standard Definition of Done practices, CycleTime adds these unique requirements:

### 9.1 DAG Documentation Architecture (SPI-722)
- [ ] New docs have YAML frontmatter with required fields
- [ ] Dependencies declared for prerequisite knowledge
- [ ] Documents placed in correct `docs/{type}/{domain}/` directory
- [ ] Cross-references use relative paths
- [ ] Document length follows guidelines (200-500 lines optimal)

**Impact:** Enables RAG-optimized retrieval for AI agents, better context for AI-assisted development

**References:** [Document Standards](../contributing/document-standards.md)

### 9.2 Baseline Performance Testing
- [ ] Pre-development baseline captured (if new feature affects performance)
- [ ] Post-development comparison shows no regression (within 10%)
- [ ] Delta analysis documents new test additions
- [ ] Performance metrics documented in implementation notes

**Impact:** Prevents performance degradation over time, maintains SLA compliance

**Baseline Metrics:**
- MCP tool calls: create_session (45ms p95), get_session (12ms p95), list_issues (78ms p95)
- Database operations: Insert (5ms p95), Select (8ms p95), Update (6ms p95)

### 9.3 Three-Tier Test Categorization
- [ ] Tests in correct source set (test/integrationTest/systemTest)
- [ ] Physical directory determines test tier, not package name
- [ ] Test type matches execution requirements (speed, dependencies)
- [ ] No package-based filters needed

**Impact:** Faster feedback, clearer test purposes, better IDE recognition

**References:** [Testing Standards](../../.claude/shared/testing-standards.md)

### 9.4 Linear Subtask-First Workflow
- [ ] Update subtask status fields (not parent comments)
- [ ] Parent story to "In Review" only when ALL subtasks done
- [ ] Status reflects actual work state
- [ ] Use MCP Linear integration for status updates

**Impact:** Better progress tracking, clearer accountability, accurate reporting

**Correct:** `mcp__linear-server__update_issue --id "SPI-123" --state "Done"`

**Incorrect:** Using comments for status updates

### 9.5 Time-Mockable Architecture
- [ ] Time dependencies injected via TimeProvider
- [ ] No `Instant.now()` in business logic
- [ ] No `delay()` in business logic
- [ ] All time-dependent code testable with MockTimeProvider

**Impact:** Deterministic, fast tests; no flaky time-based failures

**Examples:** [Unit Test Example](../examples/definition-of-done/unit-test-example.md), [Architecture Alignment Example](../examples/definition-of-done/architecture-alignment-example.md)

### 9.6 Agent-Optimized Documentation
- [ ] Documentation structured for Context Engineer discovery
- [ ] Dependency declarations enable auto-inclusion
- [ ] Clear examples with working code
- [ ] Diagrams complement text explanations

**Impact:** Better AI-assisted development experience, faster onboarding

---

## 10. Verification Commands Reference

All verification commands in one place for quick access:

### Code Quality
```bash
./gradlew detekt                       # Static analysis (must pass with zero violations)
./gradlew koverVerify                  # Test coverage verification (≥80%)
./gradlew koverHtmlReport              # Generate coverage report (build/reports/kover/html/index.html)
```

### Testing
```bash
./gradlew test                         # Run unit tests (alias for unitTest)
./gradlew unitTest                     # Fast unit tests (< 30s total)
./gradlew integrationTest              # Infrastructure tests (< 3min total)
./gradlew systemTest                   # E2E workflows (< 10min total)
./gradlew testAll                      # All test categories sequentially
./gradlew quickTest                    # Unit tests only (development)
./gradlew ciTest                       # Parallel test execution (CI)
```

### Build & Quality Gates
```bash
./gradlew clean build                  # Full quality check (compile + test + detekt)
./gradlew check                        # Run all quality checks (test + detekt + kover)
./gradlew buildFatJar                  # Build executable JAR
./gradlew dependencyCheckAnalyze       # Check for vulnerable dependencies
```

### Security
```bash
# Check for secrets in code
git diff main | grep -iE '(password|secret|key|token).*=.*["\']'

# Dependency vulnerability scan
./gradlew dependencyCheckAnalyze
```

### Commit Message Validation
```bash
npm run commitlint-ci                  # Validate last commit message
npm run commitlint-pr                  # Validate all commits in current branch
```

### Documentation Validation
```bash
# Navigate to docs directory for validation scripts
cd docs

# Check frontmatter YAML syntax
./.scripts/validate-frontmatter.sh

# Check required fields present
./.scripts/check-required-fields.sh

# Check document lengths
./.scripts/check-file-lengths.sh

# Validate DAG (no circular dependencies)
./.scripts/check-circular-deps.py
```

### Docker & Deployment
```bash
docker build -t cycletime:test .       # Verify Docker build (if infrastructure changes)
./gradlew installDist                  # Install distribution locally
```

---

## 11. References

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

### Examples
- [Unit Test Example](../examples/definition-of-done/unit-test-example.md)
- [Integration Test Example](../examples/definition-of-done/integration-test-example.md)
- [System Test Example](../examples/definition-of-done/system-test-example.md)
- [Architecture Alignment Example](../examples/definition-of-done/architecture-alignment-example.md)
- [Error Handling Example](../examples/definition-of-done/error-handling-example.md)

---

**Remember:** The Definition of Done exists to maintain quality and enable continuous delivery. It's not bureaucracy—it's your safety net for shipping production-ready code with confidence.

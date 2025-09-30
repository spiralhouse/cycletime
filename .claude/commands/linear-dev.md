# Linear Development Workflow Command

**Usage**: `/linear-dev [issue-id]`

**Description**: Comprehensive Linear issue development workflow that manages the entire lifecycle from issue analysis to completion with agent coordination, quality gates, and intelligent workflow selection.

---

## Command Execution Protocol

When this command is invoked with a Linear issue ID (e.g., `/linear-dev SPI-634`), execute the following structured workflow:

### Phase 1: Environment Preparation & Baseline Quality Capture

**🔧 CRITICAL SETUP - Execute First**

```bash
# 1.1 Sync with latest main branch
echo "🔄 Syncing with main branch..."
git checkout main
git pull origin main

# 1.2 Establish TRUE baseline with forced fresh test execution
echo "✅ Establishing baseline quality metrics..."
BASELINE_LOG="/tmp/baseline-${1}.log"
BASELINE_JSON="/tmp/baseline-${1}.json"

# Force fresh test execution (bypass cache)
./gradlew clean check --rerun-tasks > "${BASELINE_LOG}" 2>&1
BASELINE_EXIT_CODE=$?

# Parse test results from Gradle output (macOS/Linux compatible)
if [ ${BASELINE_EXIT_CODE} -eq 0 ]; then
    # Extract test counts from successful build
    TOTAL_TESTS=$(grep -oE '[0-9]+ tests? completed' "${BASELINE_LOG}" | grep -oE '[0-9]+' | head -1 || echo "0")
    FAILED_TESTS="0"
    SKIPPED_TESTS=$(grep -oE '[0-9]+ skipped' "${BASELINE_LOG}" | grep -oE '[0-9]+' | head -1 || echo "0")
    BASELINE_STATUS="PASS"
else
    # Extract test counts from failed build
    TOTAL_TESTS=$(grep -oE '[0-9]+ tests? completed' "${BASELINE_LOG}" | grep -oE '[0-9]+' | head -1 || echo "0")
    FAILED_TESTS=$(grep -oE '[0-9]+ failed' "${BASELINE_LOG}" | grep -oE '[0-9]+' | head -1 || echo "0")
    SKIPPED_TESTS=$(grep -oE '[0-9]+ skipped' "${BASELINE_LOG}" | grep -oE '[0-9]+' | head -1 || echo "0")
    BASELINE_STATUS="FAIL"
fi

PASSED_TESTS=$((TOTAL_TESTS - FAILED_TESTS - SKIPPED_TESTS))

# Store baseline metrics as JSON for comparison
cat > "${BASELINE_JSON}" <<EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "branch": "main",
  "issue_id": "${1}",
  "total_tests": ${TOTAL_TESTS},
  "passed_tests": ${PASSED_TESTS},
  "failed_tests": ${FAILED_TESTS},
  "skipped_tests": ${SKIPPED_TESTS},
  "status": "${BASELINE_STATUS}",
  "exit_code": ${BASELINE_EXIT_CODE}
}
EOF

echo "📊 Baseline Metrics Captured:"
echo "   Total Tests: ${TOTAL_TESTS}"
echo "   Passed: ${PASSED_TESTS}"
echo "   Failed: ${FAILED_TESTS}"
echo "   Skipped: ${SKIPPED_TESTS}"
echo "   Status: ${BASELINE_STATUS}"
echo "   Log: ${BASELINE_LOG}"
echo "   Metrics: ${BASELINE_JSON}"

# 1.3 Escalate immediately if baseline quality gates fail
if [ ${BASELINE_EXIT_CODE} -ne 0 ]; then
    echo "❌ ESCALATION: Baseline quality gates failed - main branch has ${FAILED_TESTS} failing tests"
    echo "🚨 Cannot proceed with development until main branch is fixed"
    echo "📋 Failing tests must be resolved before starting new work"
    exit 1
fi

echo "✅ Baseline established - all ${TOTAL_TESTS} tests passing"
echo "✅ Environment ready for development"
```

**Success Criteria**:
- Main branch synced
- Baseline metrics captured with forced fresh test execution
- All tests pass OR baseline failures documented with exit code
- Baseline stored in `/tmp/baseline-${ISSUE_ID}.json` for later comparison
- No FROM-CACHE false positives

**Escalation Point**: If quality checks fail, STOP and escalate to user immediately

---

### Phase 2: Issue Analysis & Setup

**📋 ISSUE DISCOVERY & BRANCH CREATION**

```bash
# 2.1 Fetch Linear issue details
echo "📋 Analyzing Linear issue..."
```

**Execute Linear Analysis:**
- Use `mcp__linear__get_issue` to fetch complete issue details
- Extract: title, description, acceptance criteria, hierarchy (Epic → Story → Subtask)
- Identify technical domains: authentication, data layer, UI, infrastructure, etc.
- Determine issue complexity: simple (1-3 points), moderate (5-8 points), complex (13+ points)

**Issue Status Management:**
- Update issue status to "In Progress" using `mcp__linear__update_issue`
- Document start time and development approach in issue

**Branch Creation:**
```bash
# 2.2 Create feature branch following trunk-based conventions
ISSUE_ID=$(echo "${1}" | tr '[:upper:]' '[:lower:]')
BRANCH_NAME="feat/${ISSUE_ID}-$(echo "${ISSUE_TITLE}" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | cut -c1-50)"

echo "🌿 Creating feature branch: ${BRANCH_NAME}"
git checkout -b "${BRANCH_NAME}"
```

**Success Criteria**: Issue analyzed, status updated to "In Progress", feature branch created

---

### Phase 3: Agent Coordination Planning

**🧠 INTELLIGENT WORKFLOW & AGENT SELECTION**

**3.1 Analyze Issue Requirements:**
Based on Linear issue analysis, determine:

**Issue Complexity Assessment:**
- **Simple (1-3 points)**: Single agent, direct implementation
- **Moderate (5-8 points)**: 2-3 agents, TDD recommended
- **Complex (13+ points)**: 3+ agents, TDD required, Context Engineer mandatory

**Technical Domain Analysis:**
- **Authentication/Security**: Requires `qa`, `developer`, `code-reviewer` (security focus)
- **Data Layer/Repository**: Requires `qa`, `developer` (TDD recommended)
- **API/REST Endpoints**: Requires `qa`, `developer`, `code-reviewer` (TDD required)
- **UI/Frontend**: Requires `developer`, `code-reviewer` (direct implementation)
- **Infrastructure/DevOps**: Requires `devops-engineer`, `qa`
- **Architecture Changes**: Requires `software-architect`, `developer`, `code-reviewer`

**3.2 Workflow Selection Logic:**
```
IF (issue involves business logic OR API design OR data layer) THEN
    workflow = "TDD"
    agents = ["qa", "developer", "code-reviewer"]
ELSE IF (issue involves UI OR simple configuration) THEN
    workflow = "Direct Implementation"
    agents = ["developer", "code-reviewer"]
ELSE IF (issue involves architecture OR performance) THEN
    workflow = "Architecture-First"
    agents = ["software-architect", "developer", "qa", "code-reviewer"]
END IF
```

**3.3 Think Level Assignment (Complexity + 1):**
- **Simple issues**: Base think levels (think, think, think)
- **Moderate issues**: Enhanced think levels (think hard, think hard, think hard)
- **Complex issues**: Advanced think levels (think harder, think harder, think harder)
- **Critical/GA blockers**: Maximum think levels (ultrathink, ultrathink, ultrathink)

**3.4 Context Engineer Invocation:**
**ALWAYS invoke Context Engineer for 2+ agents:**

```bash
echo "🔍 Preparing context for agent coordination..."
```

**Context Engineer Prompt:**
```
@agent-context-engineer "Prepare context for ${ISSUE_ID} requiring agents: ${AGENT_LIST}.
Issue complexity: ${COMPLEXITY_LEVEL}.
Workflow: ${SELECTED_WORKFLOW}.
Technical domains: ${TECHNICAL_DOMAINS}.
Focus areas: ${FOCUS_AREAS}"
```

**Success Criteria**: Workflow selected, agents identified, think levels assigned, context prepared

---

### Phase 4: Execution Management

**⚡ COORDINATED AGENT EXECUTION**

**4.1 Agent Delegation Strategy:**

**For TDD Workflow:**
```bash
echo "🔴 TDD Phase 1: RED - Creating failing tests..."
```

**QA Agent (RED Phase) - Think Level: ${QA_THINK_LEVEL}:**
```
@agent-qa "${QA_THINK_LEVEL}" "Create comprehensive failing tests for ${ISSUE_ID}: ${ISSUE_TITLE}

Requirements:
${ISSUE_REQUIREMENTS}

Technical Context:
${QA_CONTEXT_FROM_CONTEXT_ENGINEER}

TDD RED Phase Instructions:
- Write failing tests that define expected behavior
- Cover happy path, edge cases, and error conditions
- Ensure tests fail with meaningful error messages
- Follow project testing standards and patterns
- Tests should serve as living documentation

Success Criteria: All tests fail initially with clear error messages indicating missing implementation"
```

**Monitor QA Progress & Handle Blockers:**
- Track test creation progress
- If QA agent encounters blockers: escalate think level and re-engage
- Verify tests are failing as expected before proceeding

```bash
echo "🟢 TDD Phase 2: GREEN - Implementing minimal code..."
```

**Developer Agent (GREEN Phase) - Think Level: ${DEVELOPER_THINK_LEVEL}:**
```
@agent-developer "${DEVELOPER_THINK_LEVEL}" "Implement minimal code to make tests pass for ${ISSUE_ID}: ${ISSUE_TITLE}

Failing Tests Created:
${TEST_SUMMARY}

Technical Context:
${DEVELOPER_CONTEXT_FROM_CONTEXT_ENGINEER}

TDD GREEN Phase Instructions:
- Implement minimal code to make ALL tests pass
- Follow existing project patterns and conventions
- No over-engineering or premature optimization
- Focus on making tests pass correctly, not perfectly
- Follow domain-driven design principles

Success Criteria: All tests transition from failing to passing"
```

**Monitor Developer Progress & Handle Blockers:**
- Track implementation progress
- If tests still fail after implementation: re-engage developer with higher think level
- If new complexities discovered: consider additional agent consultation

**For Direct Implementation Workflow:**
```bash
echo "🚀 Direct Implementation - Building feature..."
```

**Developer Agent - Think Level: ${DEVELOPER_THINK_LEVEL}:**
```
@agent-developer "${DEVELOPER_THINK_LEVEL}" "Implement ${ISSUE_ID}: ${ISSUE_TITLE}

Requirements:
${ISSUE_REQUIREMENTS}

Technical Context:
${DEVELOPER_CONTEXT_FROM_CONTEXT_ENGINEER}

Direct Implementation Instructions:
- Implement feature following requirements and acceptance criteria
- Create appropriate tests alongside implementation
- Follow project conventions and patterns
- Consider edge cases and error handling
- Write clean, maintainable code

Success Criteria: Feature implemented with appropriate test coverage"
```

**4.2 Parallel Execution Monitoring:**
For multiple agents working simultaneously:
- Monitor each agent's progress independently
- Handle blockers by re-engaging specific agents with escalated think levels
- Ensure agents don't conflict with each other's work
- Coordinate integration if agents modify related components

**4.3 Blocker Escalation Protocol:**
```
IF agent encounters blocker THEN
    current_think_level = agent.think_level
    escalated_think_level = escalate_think_level(current_think_level)
    re_engage_agent(agent, escalated_think_level, blocker_context)

    IF still_blocked_after_escalation THEN
        consider_additional_agents() OR escalate_to_user()
    END IF
END IF

escalate_think_level(level):
    think → think hard
    think hard → think harder
    think harder → ultrathink
    ultrathink → escalate_to_user()
```

**Success Criteria**: All assigned agents complete their work successfully, tests are passing, implementation meets requirements

---

### Phase 5: Quality Assurance

**🔍 COMPREHENSIVE CODE REVIEW & QUALITY GATES**

**5.1 Code Review with Enhanced Think Level:**
```bash
echo "👁️ Conducting comprehensive code review..."
```

**Code Reviewer Agent - Think Level: think hard (always enhanced for reviews):**
```
@agent-code-reviewer "think hard" "Review implementation for ${ISSUE_ID}: ${ISSUE_TITLE}

Implementation Summary:
${IMPLEMENTATION_SUMMARY}

Code Review Context:
${CODE_REVIEWER_CONTEXT_FROM_CONTEXT_ENGINEER}

Review Instructions:
- Conduct thorough security review (especially for auth/API changes)
- Verify adherence to project standards and patterns
- Check error handling and edge cases
- Validate test coverage and quality
- Review for performance implications
- Ensure code maintainability and readability
- Verify Linear issue requirements are fully met

Focus Areas:
${TECHNICAL_DOMAINS}

Success Criteria: Code meets all quality standards and is ready for production"
```

**Success Criteria**: Code review approved with no blockers identified

---

### Phase 6: Final Quality Gates & Baseline Comparison

**✅ COMPREHENSIVE QUALITY VERIFICATION WITH DELTA REPORTING**

**6.1 Run Final Quality Checks:**
```bash
echo "🧪 Running final quality checks..."

# Run comprehensive test suite (fresh, not cached)
FINAL_LOG="/tmp/final-${1}.log"
FINAL_JSON="/tmp/final-${1}.json"

./gradlew clean check --rerun-tasks > "${FINAL_LOG}" 2>&1
FINAL_EXIT_CODE=$?

# Parse final test results (macOS/Linux compatible)
if [ ${FINAL_EXIT_CODE} -eq 0 ]; then
    FINAL_TOTAL=$(grep -oE '[0-9]+ tests? completed' "${FINAL_LOG}" | grep -oE '[0-9]+' | head -1 || echo "0")
    FINAL_FAILED="0"
    FINAL_SKIPPED=$(grep -oE '[0-9]+ skipped' "${FINAL_LOG}" | grep -oE '[0-9]+' | head -1 || echo "0")
    FINAL_STATUS="PASS"
else
    FINAL_TOTAL=$(grep -oE '[0-9]+ tests? completed' "${FINAL_LOG}" | grep -oE '[0-9]+' | head -1 || echo "0")
    FINAL_FAILED=$(grep -oE '[0-9]+ failed' "${FINAL_LOG}" | grep -oE '[0-9]+' | head -1 || echo "0")
    FINAL_SKIPPED=$(grep -oE '[0-9]+ skipped' "${FINAL_LOG}" | grep -oE '[0-9]+' | head -1 || echo "0")
    FINAL_STATUS="FAIL"
fi

FINAL_PASSED=$((FINAL_TOTAL - FINAL_FAILED - FINAL_SKIPPED))

# Store final metrics
cat > "${FINAL_JSON}" <<EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "branch": "${BRANCH_NAME}",
  "issue_id": "${1}",
  "total_tests": ${FINAL_TOTAL},
  "passed_tests": ${FINAL_PASSED},
  "failed_tests": ${FINAL_FAILED},
  "skipped_tests": ${FINAL_SKIPPED},
  "status": "${FINAL_STATUS}",
  "exit_code": ${FINAL_EXIT_CODE}
}
EOF
```

**6.2 Compare Against Baseline:**
```bash
echo "📊 Baseline vs Final Comparison:"
echo ""

# Load baseline metrics (macOS/Linux compatible)
BASELINE_JSON="/tmp/baseline-${1}.json"
if [ -f "${BASELINE_JSON}" ]; then
    BASELINE_TOTAL=$(grep '"total_tests"' "${BASELINE_JSON}" | grep -oE '[0-9]+' | head -1)
    BASELINE_PASSED=$(grep '"passed_tests"' "${BASELINE_JSON}" | grep -oE '[0-9]+' | head -1)
    BASELINE_FAILED=$(grep '"failed_tests"' "${BASELINE_JSON}" | grep -oE '[0-9]+' | head -1)

    # Calculate deltas
    DELTA_TOTAL=$((FINAL_TOTAL - BASELINE_TOTAL))
    DELTA_PASSED=$((FINAL_PASSED - BASELINE_PASSED))
    DELTA_FAILED=$((FINAL_FAILED - BASELINE_FAILED))

    echo "   BASELINE (main):"
    echo "   • Total: ${BASELINE_TOTAL} | Passed: ${BASELINE_PASSED} | Failed: ${BASELINE_FAILED}"
    echo ""
    echo "   FINAL (${BRANCH_NAME}):"
    echo "   • Total: ${FINAL_TOTAL} | Passed: ${FINAL_PASSED} | Failed: ${FINAL_FAILED}"
    echo ""
    echo "   DELTA (Final - Baseline):"
    echo "   • Total: ${DELTA_TOTAL:+"+"}${DELTA_TOTAL} | Passed: ${DELTA_PASSED:+"+"}${DELTA_PASSED} | Failed: ${DELTA_FAILED:+"+"}${DELTA_FAILED}"
    echo ""

    # Interpret deltas
    if [ ${DELTA_TOTAL} -gt 0 ]; then
        echo "   ✅ ${DELTA_TOTAL} new tests added"
    fi

    if [ ${DELTA_FAILED} -gt 0 ]; then
        echo "   ⚠️  ${DELTA_FAILED} NEW test failures introduced"
        echo "   📋 Analyze if failures are:"
        echo "      - Expected (testing deprecated endpoints)"
        echo "      - Bugs requiring fixes"
        echo "      - Pre-existing issues incorrectly attributed"
    elif [ ${DELTA_FAILED} -lt 0 ]; then
        echo "   ✅ ${DELTA_FAILED#-} test failures FIXED"
    fi

    if [ ${DELTA_PASSED} -gt 0 ]; then
        echo "   ✅ ${DELTA_PASSED} additional tests passing"
    fi
else
    echo "   ⚠️  No baseline found at ${BASELINE_JSON}"
    echo "   ⚠️  Cannot perform delta comparison"
    echo "   ℹ️  This may indicate baseline capture failed in Phase 1"
fi

echo ""
echo "📄 Detailed Logs:"
echo "   Baseline: ${BASELINE_LOG}"
echo "   Final: ${FINAL_LOG}"
echo "   Baseline Metrics: ${BASELINE_JSON}"
echo "   Final Metrics: ${FINAL_JSON}"
```

**6.3 Quality Gate Decision:**
```bash
if [ ${FINAL_EXIT_CODE} -ne 0 ]; then
    echo "❌ QUALITY GATE FAILED: ${FINAL_FAILED} tests failing"
    echo "🔍 Review delta comparison above to determine:"
    echo "   1. Are these NEW failures introduced by your changes?"
    echo "   2. Are these expected failures (e.g., deprecated endpoint tests)?"
    echo "   3. Do these failures require fixes or test updates?"
    echo ""
    echo "📋 Next Steps:"
    echo "   - Review failing test logs in ${FINAL_LOG}"
    echo "   - Compare with baseline metrics in ${BASELINE_JSON}"
    echo "   - Re-engage agents if fixes needed"
    exit 1
else
    echo "✅ All quality gates PASSED"
    echo "✅ Ready to proceed with completion steps"
fi
```

**Success Criteria**:
- Final tests run fresh (not FROM-CACHE)
- Baseline comparison completed with delta analysis
- Test failures categorized as NEW vs pre-existing
- Decision made on whether failures are acceptable

---

### Phase 7: Reporting & Completion

**📊 COMPREHENSIVE DEVELOPMENT REPORT**

**7.1 Generate Development Summary:**
```bash
echo "📋 Generating development report..."
```

**Report Template:**
```markdown
# Development Report: ${ISSUE_ID}

## Issue Summary
- **Title**: ${ISSUE_TITLE}
- **Linear URL**: ${ISSUE_URL}
- **Branch**: ${BRANCH_NAME}
- **Development Time**: ${START_TIME} → ${END_TIME}
- **Workflow Used**: ${SELECTED_WORKFLOW}

## Requirements Analysis
${ISSUE_REQUIREMENTS}

## Technical Implementation
${IMPLEMENTATION_DETAILS}

## Agents Involved
${AGENT_SUMMARY_WITH_THINK_LEVELS}

## Quality Metrics
- **Tests Added**: ${TEST_COUNT}
- **Test Coverage**: ${COVERAGE_PERCENTAGE}%
- **Code Quality**: ${DETEKT_SCORE}
- **Security Review**: ${SECURITY_STATUS}

## Key Decisions Made
${TECHNICAL_DECISIONS}

## Blockers Resolved
${BLOCKER_RESOLUTION_SUMMARY}

## Files Modified
${FILE_CHANGE_SUMMARY}

## Next Steps
- [ ] Ready for PR creation
- [ ] Linear issue updated to "In Review"
- [ ] All quality gates passed
- [ ] Documentation updated if needed

## Agent Performance
${AGENT_EFFECTIVENESS_ANALYSIS}
```

**7.2 Linear Issue Status Update:**
```bash
echo "📝 Updating Linear issue status..."
```

**Update issue to "In Review" with completion summary:**
```
mcp__linear__update_issue(
    id="${ISSUE_ID}",
    state="In Review",
    # Add completion comment with summary
)
```

**7.3 Final Status Check:**
```bash
echo "✅ Development workflow completed successfully!"
echo "📋 Summary:"
echo "   • Issue: ${ISSUE_ID} - ${ISSUE_TITLE}"
echo "   • Workflow: ${SELECTED_WORKFLOW}"
echo "   • Agents: ${AGENT_LIST}"
echo "   • Status: Ready for PR"
echo "   • Quality: All gates passed"
```

**Success Criteria**: Development report generated, Linear issue updated, ready for PR creation

---

## Error Handling & Escalation Matrix

### Immediate Escalations (STOP workflow):
- **Environment Setup Failures**: Main branch broken, quality gates fail
- **Linear API Failures**: Cannot fetch issue or update status
- **Git Failures**: Cannot create branch or sync with main

### Agent Escalations (Retry with higher think level):
- **Test Failures After Implementation**: Developer → think harder
- **Code Quality Issues**: Code Reviewer → think harder
- **Complex Blocker Resolution**: Any agent → escalate think level

### Think Level Progression:
1. **Base Level**: `think` (simple issues)
2. **Enhanced Level**: `think hard` (moderate complexity)
3. **Advanced Level**: `think harder` (complex issues or after 1 escalation)
4. **Maximum Level**: `ultrathink` (critical issues or after 2 escalations)

### Escalation to User:
- Agent fails at `ultrathink` level
- Multiple quality gate failures
- Unresolvable technical blockers
- Time-sensitive critical issues

---

## Integration Points

### Linear Integration:
- `mcp__linear__get_issue` for issue analysis
- `mcp__linear__update_issue` for status management
- Hierarchical issue understanding (Epic → Story → Subtask)

### Agent Coordination:
- Task tool for agent delegation with think levels
- Context Engineer for structured context preparation
- Agent progress monitoring and blocker resolution

### Quality Integration:
- Gradle commands for testing and quality checks
- Git conventions for branching and commits
- TDD workflow integration for complex features

### Development Integration:
- Branch naming following trunk-based development
- Code review integration with security focus
- Comprehensive reporting with metrics and decisions

---

## Command Usage Examples

### Simple Feature:
```bash
/linear-dev SPI-500
# → Direct implementation workflow
# → Developer + Code Reviewer agents
# → Base think levels
```

### Complex API Feature:
```bash
/linear-dev SPI-634
# → TDD workflow
# → QA + Developer + Code Reviewer agents
# → Enhanced think levels (think hard)
# → Context Engineer coordination
```

### Critical Security Feature:
```bash
/linear-dev SPI-700
# → TDD workflow
# → QA + Developer + Code Reviewer agents
# → Advanced think levels (think harder)
# → Enhanced security review focus
```

### Baseline Verification Example:
```bash
/linear-dev SPI-634
# Phase 1: Establishes baseline
#   • Runs: ./gradlew clean check --rerun-tasks
#   • Captures: 820 tests, 820 passed, 0 failed
#   • Stores: /tmp/baseline-SPI-634.json
# Phase 6: Compares final state
#   • Runs: ./gradlew clean check --rerun-tasks
#   • Shows delta: +60 total, -28 passed, +88 failed
#   • Interprets: 60 new tests added, 88 new failures (deprecated endpoints)
#   • Decision: Categorizes failures as expected vs bugs
```

---

**This command provides a complete, intelligent development workflow that adapts to issue complexity, coordinates multiple agents effectively, and maintains high quality standards throughout the development process.**
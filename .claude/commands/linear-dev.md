# Linear Development Workflow Command

**Usage**: `/linear-dev [issue-id]`

**Description**: Comprehensive Linear issue development workflow that manages the entire lifecycle from issue analysis to completion with agent coordination, quality gates, and intelligent workflow selection.

---

## Command Execution Protocol

When this command is invoked with a Linear issue ID (e.g., `/linear-dev SPI-634`), execute the following structured workflow:

### Phase 1: Environment Preparation & Quality Gates

**🔧 CRITICAL SETUP - Execute First**

```bash
# 1.1 Sync with latest main branch
echo "🔄 Syncing with main branch..."
git checkout main
git pull origin main

# 1.2 Run comprehensive quality checks
echo "✅ Running quality gates..."
./gradlew check

# 1.3 Escalate immediately if quality gates fail
if [ $? -ne 0 ]; then
    echo "❌ ESCALATION: Quality gates failed - build is broken"
    echo "🚨 Cannot proceed with development until main branch is fixed"
    exit 1
fi

echo "✅ Environment ready - all quality gates passed"
```

**Success Criteria**: Main branch synced, all tests pass, build is clean

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

**5.2 Final Quality Gates:**
```bash
echo "🧪 Running final quality checks..."

# Run comprehensive test suite
./gradlew test

# Run static analysis
./gradlew detekt

# Verify build
./gradlew build

# Check test coverage
./gradlew koverVerify
```

**5.3 Quality Gate Failure Handling:**
```
IF quality_gates_fail THEN
    analyze_failure_type()

    IF test_failures THEN
        re_engage_developer("think harder", test_failure_context)
    ELSE IF code_quality_issues THEN
        re_engage_code_reviewer("think harder", quality_issue_context)
    ELSE IF build_failures THEN
        escalate_to_user("Build system issues detected")
    END IF

    retry_quality_gates()
END IF
```

**Success Criteria**: All tests pass, code review approved, all quality gates pass

---

### Phase 6: Reporting & Completion

**📊 COMPREHENSIVE DEVELOPMENT REPORT**

**6.1 Generate Development Summary:**
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

**6.2 Linear Issue Status Update:**
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

**6.3 Final Status Check:**
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

---

**This command provides a complete, intelligent development workflow that adapts to issue complexity, coordinates multiple agents effectively, and maintains high quality standards throughout the development process.**
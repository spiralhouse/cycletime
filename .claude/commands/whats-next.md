---
description: Strategic task recommendation with quality gates and scoring
allowed-tools: mcp__linear-server__list_issues, mcp__linear-server__get_issue, Bash
model: sonnet
---

# Strategic Task Selector Command

**Usage**: `/whats-next`

**Description**: Strategic task recommendation system that combines quality gates, git/Linear analysis, and a 20-point scoring system to recommend the optimal next task based on strategic value and tactical readiness.

---

## Command Execution Protocol

When this command is invoked, execute the following structured workflow to identify and recommend the highest-value task:

### Phase 1: Quality Gate - Baseline Health Check

**🔬 QUALITY GATE - Verify System Health First**

Before recommending any new work, ensure the current state is stable:

```bash
echo "🔬 Quality Gate: Running test suite..."
TEST_RESULT=$(./gradlew test --quiet 2>&1)
TEST_EXIT_CODE=$?

if [ ${TEST_EXIT_CODE} -ne 0 ]; then
    echo "❌ QUALITY GATE FAILED: Test suite has failures"
    echo ""
    echo "🚫 BLOCKED: Cannot recommend new tasks until tests are fixed"
    echo ""
    echo "📋 Action Required:"
    echo "   • Fix failing tests before starting new work"
    echo "   • Run: ./gradlew test --rerun-tasks for detailed failure info"
    echo "   • Review test logs and resolve issues"
    echo ""
    echo "⚠️  Starting new work with failing tests will compound technical debt"
    exit 1
fi

echo "✅ Quality Gate PASSED - All tests passing"
echo ""
```

**Success Criteria**: Test suite passes completely, system ready for new work

**Escalation Point**: If quality gate fails, STOP and report failures immediately

---

### Phase 2: Git State Analysis

**📊 GIT CONTEXT - Understand Current Development State**

Analyze git state to understand context and WIP status:

```bash
echo "📊 Git State Analysis..."
echo ""

# 2.1 Current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "   Current Branch: ${CURRENT_BRANCH}"

# 2.2 Recent commits (last 5)
echo "   Recent Commits:"
git log --oneline -5 --pretty=format:"      %h - %s (%ar)" | head -5
echo ""

# 2.3 WIP Status - Count branches with work in progress
# Look for feature branches (feat/*, fix/*, etc.)
WIP_BRANCHES=$(git branch | grep -E "^\s*(feat|fix|refactor|chore)/" | wc -l | tr -d ' ')
echo "   WIP Branches: ${WIP_BRANCHES}"

# 2.4 Uncommitted changes
UNCOMMITTED_CHANGES=$(git status --porcelain | wc -l | tr -d ' ')
if [ ${UNCOMMITTED_CHANGES} -gt 0 ]; then
    echo "   ⚠️  Uncommitted Changes: ${UNCOMMITTED_CHANGES} files"
else
    echo "   ✅ Working Directory: Clean"
fi

echo ""

# 2.5 WIP Limit Check
if [ ${WIP_BRANCHES} -ge 3 ]; then
    echo "⚠️  WIP LIMIT WARNING: ${WIP_BRANCHES} feature branches in progress"
    echo "   • Recommended WIP limit: 3 concurrent tasks"
    echo "   • Consider completing existing work before starting new tasks"
    echo "   • High WIP reduces focus and increases context switching"
    echo ""
fi
```

**Success Criteria**: Git state analyzed, WIP count captured, uncommitted changes identified

---

### Phase 3: Linear Issue Analysis

**📋 LINEAR ANALYSIS - Fetch and Categorize All Issues**

Retrieve comprehensive issue state from Linear:

**3.1 Fetch All Project Issues:**

Use `mcp__linear-server__list_issues` with filters:
- Project: CycleTime (ID: `217eeb45-4f83-4ca0-8030-81f9c78692bc`)
- Limit: 250 (maximum)
- Include: All states (Backlog, Todo, In Progress, In Review, Done, Canceled)

**3.2 Group Issues by Status:**

```
Issues by State:
   • Backlog: [count] issues
   • Todo: [count] issues
   • In Progress: [count] issues (tracked as WIP)
   • In Review: [count] issues
   • Done: [count] issues (recent completions)
```

**3.3 Identify Blocked Issues:**

For each issue in Todo/Backlog:
- Check for dependencies (parent issues, blockers)
- Identify missing requirements
- Flag issues with incomplete acceptance criteria

**Success Criteria**: All issues fetched, grouped by state, blockers identified

---

### Phase 4: Strategic + Tactical Scoring System

**🎯 SCORING ENGINE - 20-Point Comprehensive Scoring**

Apply dual scoring framework to all Todo/Backlog issues:

#### Strategic Scoring (0-10 points)

Evaluate long-term value and impact:

**1. Epic Priority (0-4 points)**
- **4 points**: Critical path epic (GA blocker, core functionality)
- **3 points**: High-value epic (major feature, significant user impact)
- **2 points**: Medium-value epic (enhancement, optimization)
- **1 point**: Low-value epic (nice-to-have, minor improvement)
- **0 points**: No epic association

**2. Dependency Impact (0-3 points)**
- **3 points**: Unblocks 3+ downstream tasks
- **2 points**: Unblocks 1-2 downstream tasks
- **1 point**: Enables parallel work streams
- **0 points**: No dependencies waiting on this task

**3. Value Delivery (0-2 points)**
- **2 points**: User-facing feature with immediate value
- **1 point**: Internal improvement with measurable impact
- **0 points**: Technical debt or infrastructure work

**4. Foundation Factor (0-1 point)**
- **1 point**: Enables future development or architectural improvement
- **0 points**: Standalone work with no enabling effect

**Strategic Score**: Sum of above (0-10 points)

#### Tactical Scoring (0-10 points)

Evaluate immediate feasibility and context fit:

**1. Not Blocked (0-4 points)**
- **4 points**: All dependencies resolved, ready to start
- **3 points**: One minor dependency, can work around
- **2 points**: 1-2 dependencies, requires coordination
- **1 point**: Multiple dependencies, complex coordination
- **0 points**: Blocked, cannot proceed

**2. Clear Requirements (0-3 points)**
- **3 points**: Complete acceptance criteria, well-defined scope
- **2 points**: Good description, some clarification needed
- **1 point**: Vague requirements, needs refinement
- **0 points**: Incomplete or missing requirements

**3. Context Match (0-2 points)**
- **2 points**: Directly related to current branch/work
- **1 point**: Related domain, familiar codebase area
- **0 points**: Unrelated to current work, new domain

**4. Completes WIP (0-1 point)**
- **1 point**: Completes an in-progress feature or story
- **0 points**: New work, doesn't finish existing WIP

**Tactical Score**: Sum of above (0-10 points)

#### Total Score Calculation

```
Total Score = Strategic Score + Tactical Score
Maximum: 20 points
Minimum: 0 points
```

**Success Criteria**: All Todo/Backlog issues scored, ranked by total score

---

### Phase 5: Recommendation Engine

**🏆 RECOMMENDATION - Select Optimal Next Task**

**5.1 Rank Issues by Total Score:**

Sort all scored issues descending by total score.

**5.2 Select Top Recommendation:**

```
🏆 Recommended Next Task:

   Issue: [ISSUE_ID] - [TITLE]
   Epic: [EPIC_NAME]
   Estimate: [POINTS] points

   Total Score: [XX]/20
   • Strategic: [X]/10
     - Epic Priority: [X]/4
     - Dependency Impact: [X]/3
     - Value Delivery: [X]/2
     - Foundation: [X]/1
   • Tactical: [X]/10
     - Not Blocked: [X]/4
     - Clear Requirements: [X]/3
     - Context Match: [X]/2
     - Completes WIP: [X]/1

   Rationale:
   [Explain why this task scored highest and why it's the best choice now]

   Linear URL: [ISSUE_URL]
```

**5.3 List Alternative Options:**

Show top 3-5 alternatives with scores and trade-offs:

```
📊 Alternative Options:

   2. [ISSUE_ID] - [TITLE] (Score: [XX]/20)
      Trade-off: [Why this scored lower, when to consider it]

   3. [ISSUE_ID] - [TITLE] (Score: [XX]/20)
      Trade-off: [Why this scored lower, when to consider it]

   4. [ISSUE_ID] - [TITLE] (Score: [XX]/20)
      Trade-off: [Why this scored lower, when to consider it]
```

**5.4 Context-Specific Warnings:**

```
⚠️  Considerations:

[If WIP limit exceeded]
• You have [N] branches in progress - consider completing existing work first

[If high-scoring task has complexity concerns]
• This task is [X] points - plan for [workflow type] and agent coordination

[If top recommendation is blocked]
• Top tasks are blocked - consider unblocking dependencies first

[If context mismatch]
• This task is in a different domain - expect context switching overhead

[If requirements unclear]
• Requirements need clarification - consider refining before starting
```

**Success Criteria**: Clear recommendation provided with scoring rationale, alternatives listed, relevant warnings shown

---

### Phase 6: Action Guidance

**🚀 NEXT STEPS - How to Proceed**

Provide clear guidance on executing the recommendation:

```
🚀 To Start This Task:

   1. Create feature branch:
      git checkout main
      git pull origin main
      git checkout -b feat/[issue-id]-[description]

   2. Update Linear issue:
      mcp__linear__update_issue(id="[ISSUE_ID]", state="In Progress")

   3. Begin development:
      /linear-dev [ISSUE_ID]

      OR (for manual development):

      [Recommended workflow based on issue complexity]
      • Simple (1-3 points): Direct implementation
      • Moderate (5-8 points): TDD workflow
      • Complex (13+ points): Architecture-first + TDD

   4. Quality reminder:
      • Run ./gradlew test frequently
      • Commit early and often
      • Keep WIP focused
```

**Success Criteria**: Clear actionable steps provided for starting recommended task

---

## Scoring Examples

### Example 1: Critical Infrastructure Task

```
Issue: SPI-900 - Implement session persistence layer
Epic: Core Infrastructure (Critical)
Estimate: 8 points

Strategic Score: 9/10
• Epic Priority: 4/4 (Critical path, GA blocker)
• Dependency Impact: 3/3 (Unblocks authentication, MCP tools, workflow engine)
• Value Delivery: 1/2 (Internal infrastructure, not user-facing)
• Foundation: 1/1 (Enables all stateful features)

Tactical Score: 10/10
• Not Blocked: 4/4 (All dependencies resolved)
• Clear Requirements: 3/3 (Complete technical spec in description)
• Context Match: 2/2 (Currently working on data layer)
• Completes WIP: 1/1 (Completes in-progress persistence epic)

Total Score: 19/20

Rationale: Highest impact task that unblocks critical features, fully ready
to start, and aligns with current work context.
```

### Example 2: User-Facing Feature with Dependencies

```
Issue: SPI-901 - Add dark mode to UI
Epic: UI Enhancements (Medium priority)
Estimate: 3 points

Strategic Score: 4/10
• Epic Priority: 2/4 (Medium-value enhancement)
• Dependency Impact: 0/3 (No tasks blocked by this)
• Value Delivery: 2/2 (User-facing feature)
• Foundation: 0/1 (Standalone feature)

Tactical Score: 5/10
• Not Blocked: 2/4 (Requires theme system to be built first)
• Clear Requirements: 3/3 (Well-defined user stories)
• Context Match: 0/2 (Current work is backend-focused)
• Completes WIP: 0/1 (New work)

Total Score: 9/20

Rationale: Good user value but has dependencies and mismatches current
context. Consider after theme system is complete and when switching to
frontend work.
```

### Example 3: Technical Debt with Low Urgency

```
Issue: SPI-902 - Refactor legacy config parsing
Epic: Technical Debt (Low priority)
Estimate: 5 points

Strategic Score: 2/10
• Epic Priority: 1/4 (Low-value improvement)
• Dependency Impact: 0/3 (Nothing blocked)
• Value Delivery: 0/2 (Internal refactoring)
• Foundation: 1/1 (Improves maintainability)

Tactical Score: 8/10
• Not Blocked: 4/4 (Ready to start)
• Clear Requirements: 2/3 (Could use more detail)
• Context Match: 2/2 (Related to current config work)
• Completes WIP: 0/1 (New work)

Total Score: 10/20

Rationale: Low strategic value despite tactical readiness. Good choice
when clearing small items or between major features, but not optimal for
high-impact work sessions.
```

---

## Integration Points

### Linear Integration:
- `mcp__linear-server__list_issues` for comprehensive issue retrieval
- `mcp__linear-server__get_issue` for detailed issue analysis
- `mcp__linear-server__update_issue` for status management
- Issue hierarchy understanding (Epic → Story → Subtask)

### Git Integration:
- Branch analysis for WIP detection
- Commit history for context understanding
- Working directory status for clean state verification

### Quality Integration:
- Test suite as quality gate
- Blocker detection before recommendations
- WIP limit enforcement for focus management

---

## Command Usage Examples

### Normal Operation:
```bash
/whats-next
# → Quality gate passes
# → Git shows 2 WIP branches, clean working directory
# → Linear shows 15 Todo items, 5 In Progress
# → Recommends SPI-900 (19/20 score) - critical infrastructure
# → Shows 4 alternatives with trade-offs
# → Provides clear next steps
```

### With Quality Gate Failure:
```bash
/whats-next
# → Quality gate FAILS - 3 tests failing
# → BLOCKS recommendation
# → Shows failing test details
# → Instructs to fix tests before new work
```

### With WIP Limit Warning:
```bash
/whats-next
# → Quality gate passes
# → Git shows 4 WIP branches
# → ⚠️ WIP LIMIT WARNING displayed
# → Still provides recommendation but suggests completing WIP first
# → Highlights tasks that complete existing WIP (bonus tactical points)
```

### With All Tasks Blocked:
```bash
/whats-next
# → Quality gate passes
# → All high-scoring tasks have unresolved dependencies
# → Recommends unblocking work (lower scoring but actionable)
# → Provides guidance on resolving blockers
```

---

**This command provides intelligent, data-driven task selection that balances strategic value with tactical readiness, ensuring developers always know the optimal next step in their workflow.**

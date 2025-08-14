# Parallel Development Opportunities

**PROACTIVE DETECTION**: Actively monitor for opportunities to suggest parallel development workflows that can significantly accelerate feature delivery.

## When to Suggest Parallelization

**Automatically analyze and suggest parallel development when detecting:**

1. **Multiple Independent Subtasks** (Primary Indicator)
   - After Linear story breakdown produces 3+ subtasks
   - Subtasks have estimates between 1-5 points each
   - Subtasks modify different files/modules (low coupling)
   - Combined complexity would benefit from parallel execution
   - Example: "Story has 5 subtasks, each 2-3 points, touching different modules"

2. **Multiple Feature/Bug Requests**
   - User mentions multiple items: "implement X, Y, and Z"
   - Unrelated bugs in different components
   - Multiple small enhancements with clear boundaries
   - Example: "fix the login bug, add dark mode, and update the API endpoints"

3. **Post-Estimation Triggers**
   - After completing estimation of subtasks in Linear
   - When total story points exceed 8 across subtasks
   - When subtasks have similar complexity (good for parallel completion)
   - Example: "Three 3-point subtasks could complete in parallel vs sequentially"

## How to Suggest Parallelization

When opportunity detected, proactively suggest:

```
💡 **Parallel Development Opportunity Detected**

I notice this story has [N] independent subtasks that could be developed in parallel:
- [Subtask 1]: [X] points - [brief description]
- [Subtask 2]: [Y] points - [brief description]  
- [Subtask 3]: [Z] points - [brief description]

Using parallel development with specialized agents (@docs/PARALLEL_DEVELOPMENT.md), we could:
- Complete all subtasks simultaneously vs sequentially  
- Maintain isolation between features (separate worktrees)
- Follow TDD methodology (RED → GREEN → REFACTOR) for each

Would you like me to set up parallel development for these subtasks?
```

## Detection Patterns

**Monitor for these specific user language patterns:**

- "implement these features", "fix these bugs", "add tests for"
- "multiple", "several", "various" 
- "can you do X, Y, and Z"
- "list of", "following items"

**Linear issue analysis indicators:**
- Story has 3+ subtasks with 1-5 point estimates
- All subtasks in 'Todo' status (ready to start)
- Subtasks touch different files/modules (minimal overlap)

## When NOT to Suggest Parallelization

**Avoid suggesting parallel development for:**
- Single feature/task requests
- Highly interdependent tasks (shared files, sequential dependencies)  
- Tasks requiring architectural decisions that affect other tasks
- Database migrations or schema changes
- Tasks already in progress
- Simple tasks that complete faster than setup overhead

## Integration with Linear Workflow

When parallelization is accepted:
1. **Verify subtask independence** via Linear issue analysis
2. **Create worktrees** named after Linear issue IDs (e.g., `spi-425-feature`)
3. **Update Linear status** for all subtasks to "In Progress" simultaneously  
4. **Track parallel progress** via bash monitoring and Linear updates
5. **Consolidate PRs** linking back to parent story

## Key Principle

Be helpful but not pushy. Suggest once per suitable opportunity, explain benefits clearly, and respect if user prefers sequential development. The goal is acceleration without complication.
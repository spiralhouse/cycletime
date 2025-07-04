# Start Feature Workflow

Execute the complete feature development startup process for Linear issue: $ARGUMENTS

## Steps to Execute:

1. **Sync and Branch**:
   - Check current git status
   - Sync from main: `git checkout main && git pull origin main`
   - Create feature branch: `git checkout -b feature/$ARGUMENTS`

2. **Linear Issue Management**:
   - Get details for Linear issue $ARGUMENTS
   - Create "Technical Design for $ARGUMENTS" subtask in Linear
   - Move design subtask to "In Progress" status

3. **Setup Technical Design**:
   - Create technical design document in `/docs/technical-designs/$ARGUMENTS.md`
   - Include template with sections for:
     - Overview and Requirements
     - Architectural Decisions
     - API Specifications
     - Implementation Approach
     - Testing Strategy

4. **Notify Next Steps**:
   - Remind about design-first approach
   - Confirm design document location
   - Next step: Create design PR and move subtask to "In Review"

Please execute this workflow systematically, ensuring each step completes before proceeding to the next.
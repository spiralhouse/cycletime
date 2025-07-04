# Move to Review Workflow

Move Linear issue to "In Review" status and create pull request for: $ARGUMENTS

## Steps to Execute:

1. **Verify Readiness**:
   - Check git status and ensure all changes are committed
   - Verify tests are passing: `npm test`
   - Run linting: `npm run lint`
   - Run type checking: `npm run typecheck`

2. **Create Pull Request**:
   - Push current branch to origin
   - Create PR using GitHub CLI with conventional commit format
   - Include Linear issue reference in PR description
   - Link to any relevant technical design documents

3. **Update Linear Issue**:
   - Move parent Linear issue $ARGUMENTS to "In Review" status (ID: `8d617a10-15f3-4e26-ad28-3653215c2f25`)
   - Ensure PR is linked to the Linear issue

4. **Notify Team**:
   - Confirm PR creation with URL
   - Confirm Linear issue status update
   - Remind about review requirements

Execute this workflow ensuring all quality checks pass before creating the PR.
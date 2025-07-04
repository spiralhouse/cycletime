# Atomic Commit Workflow

Create focused, atomic commits following conventional commit standards for: $ARGUMENTS

## Commit Type Analysis:

Determine the appropriate commit type for your changes:

- **feat:** New features or functionality
- **fix:** Bug fixes  
- **docs:** Documentation changes only
- **test:** Adding or updating tests
- **refactor:** Code refactoring without changing functionality
- **chore:** Build process, dependencies, tooling
- **style:** Code formatting, whitespace (no logic changes)
- **perf:** Performance improvements
- **ci:** CI/CD pipeline changes

## Atomic Commit Rules:

### ⚠️ **NEVER Mix Different Types**
- Documentation updates = separate `docs:` commit
- Test additions = separate `test:` commit  
- Refactoring = separate `refactor:` commit
- Bug fixes = separate `fix:` commit
- Each commit must have ONE clear purpose

## Commit Process:

### 1. **Stage Changes by Type**
```bash
# Example: Separate commits for different types
git add src/feature.ts                    # feat: commit
git commit -m "feat: add $ARGUMENTS functionality"

git add tests/feature.test.ts             # test: commit  
git commit -m "test: add tests for $ARGUMENTS"

git add docs/api.md                       # docs: commit
git commit -m "docs: update API documentation for $ARGUMENTS"
```

### 2. **Verify Commit Quality**
- Each commit should compile and pass tests
- Commit message follows conventional format
- Changes are logically grouped
- No unrelated files included

### 3. **Commit Message Format**
```
type(scope): brief description

Optional longer description explaining the change

- List key changes
- Reference Linear issue if applicable
```

## Example Workflow for $ARGUMENTS:

1. **Test Commit**: `test: add failing test for $ARGUMENTS`
2. **Feature Commit**: `feat: implement $ARGUMENTS core functionality`  
3. **Refactor Commit**: `refactor: clean up $ARGUMENTS implementation`
4. **Docs Commit**: `docs: add $ARGUMENTS documentation`

## Quality Checklist:
- [ ] Each commit has single, clear purpose
- [ ] No mixed commit types
- [ ] Conventional commit format used
- [ ] Each commit passes tests individually
- [ ] Descriptive commit messages
- [ ] Related changes grouped logically

Maintain atomic commits for clean git history and easy rollbacks!
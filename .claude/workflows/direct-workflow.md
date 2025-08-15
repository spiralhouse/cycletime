# Direct Implementation Workflow

Direct implementation builds features from specifications without the test-first approach. This workflow prioritizes speed and is suitable for well-understood requirements or rapid prototyping.

## Direct Implementation Process

### 1. Implementation Phase
**Agent**: implementation-agent.txt (in direct mode) or task-agent.txt
**Objective**: Build the complete feature directly from requirements

```bash
claude -p "Implement [feature] directly from requirements. Create production-ready code with proper error handling, validation, and integration with existing codebase." \
  --append-system-prompt "$(cat .claude/prompts/implementation-agent.txt)" \
  --permission-mode bypassPermissions --output-format stream-json --verbose
```

**Success Criteria**:
- Feature works according to specifications
- Proper error handling and edge cases covered
- Code follows project patterns and conventions
- Integration with existing codebase is smooth

### 2. Validation Phase (Optional)
**Agent**: test-agent.txt (in validation mode)
**Objective**: Add tests to validate the implemented functionality

```bash
claude -p "Add comprehensive tests to validate [feature] functionality. Focus on critical paths, edge cases, and integration points." \
  --append-system-prompt "$(cat .claude/prompts/test-agent.txt)" \
  --permission-mode bypassPermissions --output-format stream-json --verbose
```

**Success Criteria**:
- Good test coverage of implemented functionality
- Tests validate current behavior accurately
- Tests serve as regression protection
- Critical business logic is thoroughly tested

### 3. Review Phase
**Agent**: review-agent.txt
**Objective**: Ensure code quality and adherence to standards

```bash
claude -p "Review [feature] implementation for code quality, security, performance, and adherence to project standards." \
  --append-system-prompt "$(cat .claude/prompts/review-agent.txt)" \
  --permission-mode bypassPermissions --output-format stream-json --verbose
```

**Success Criteria**:
- Code meets quality standards
- Security vulnerabilities identified and addressed
- Performance is acceptable
- Architecture aligns with project patterns

## Single Feature Direct Implementation

For single feature development:

1. Analyze requirements and plan implementation approach
2. Run implementation phase agent
3. Verify feature works as expected
4. Optionally run validation phase to add tests
5. Run review phase for quality assurance

## Parallel Direct Implementation

For multiple features using parallel development:

1. Create worktrees for each feature
2. Run implementation agents in parallel across all features
3. Monitor completion of all implementation agents
4. Optionally run validation agents in parallel
5. Run review agents in parallel for final quality check

## When to Use Direct Implementation

**Ideal for**:
- Well-understood requirements
- Simple CRUD operations  
- UI components and visual features
- Rapid prototyping
- Performance-critical code
- External API integrations
- Configuration and setup tasks

**Consider TDD instead for**:
- Complex business logic
- Algorithm implementation
- Unclear or evolving requirements
- Code that requires frequent refactoring
- Mission-critical functionality

## Direct Implementation Benefits

- **Speed**: Faster initial development
- **Simplicity**: Straightforward approach
- **Flexibility**: Easy to adjust during implementation
- **Natural flow**: Matches how many developers think
- **Visual feedback**: Can see results immediately

## Best Practices

### During Implementation
- **Plan first**: Think through the implementation approach
- **Start simple**: Build core functionality first, add complexity later
- **Test as you go**: Manual testing during development
- **Handle errors**: Include proper error handling from the start
- **Follow patterns**: Use existing codebase patterns and conventions

### Code Quality
- **Readable code**: Use descriptive names and clear structure
- **Documentation**: Add comments for complex logic
- **Error handling**: Graceful degradation and proper error messages  
- **Performance**: Consider performance implications
- **Security**: Follow security best practices

### Integration
- **Incremental commits**: Commit working increments regularly
- **Integration testing**: Test with existing systems frequently
- **Backward compatibility**: Ensure changes don't break existing functionality
- **API contracts**: Maintain consistent interfaces

## Anti-Patterns to Avoid

- **No error handling**: Always consider error scenarios
- **Hardcoded values**: Use configuration or constants
- **Tight coupling**: Keep components loosely coupled
- **No validation**: Validate inputs and assumptions
- **Skipping review**: Always have code reviewed
- **No documentation**: Document complex decisions and APIs

This workflow provides a streamlined approach to feature development when test-first development isn't the best fit.
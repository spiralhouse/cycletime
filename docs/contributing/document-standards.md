# Documentation Quality Standards

## Document Length Guidelines

- **Target**: 200-500 lines (optimal for RAG embedding)
- **Maximum**: 800 lines (exception for comprehensive references)
- **Minimum**: 50 lines (ensure substance)

## Single Responsibility Principle

Each document should focus on ONE topic only. If covering multiple topics, split into separate documents.

## Writing Style

- **Clear**: Use simple, direct language
- **Concise**: No filler or redundancy
- **Actionable**: Provide practical value
- **Scannable**: Use headings, bullets, code blocks

## Code Examples

- Must be runnable (or clearly marked as pseudo-code)
- Include necessary imports and context
- Show error handling
- Provide expected output

## Cross-References

When linking to other documents:
- Use relative paths
- Provide context: `[Repository Pattern](../../patterns/persistence/repository.md) - explains data access abstraction`
- Avoid bare links

## Mermaid Diagrams

- Keep focused (5-10 nodes maximum)
- Use consistent notation
- Label all relationships
- Include diagram in code block with ```mermaid

## Frontmatter Requirements

- All required fields must be present
- Dependencies must be declared
- Keywords must be relevant and searchable

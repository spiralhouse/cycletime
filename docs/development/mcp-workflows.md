# MCP Server Workflows for CycleTime Development

## Overview

This document provides examples of useful MCP server workflows for CycleTime development tasks.

## GitHub MCP Server Workflows

### 1. Issue Dependency Management

**Use Case**: Update issue dependencies using the "Depends on" custom field

**Workflow**:
```bash
# Start GitHub MCP server
docker run -i --rm \
  -e GITHUB_PERSONAL_ACCESS_TOKEN=$(gh auth token) \
  -e GITHUB_TOOLSETS=issues,projects \
  ghcr.io/github/github-mcp-server

# Then use MCP tools to:
# 1. Get current issue details
# 2. Update custom fields (including "Depends on")
# 3. Move issues between project board columns
```

**Benefits**:
- Programmatic dependency management
- Consistent custom field updates
- Automated project board maintenance

### 2. Automated Issue Creation from PRD

**Use Case**: Create GitHub issues from PRD requirements with proper categorization

**Workflow**:
```bash
# Start GitHub MCP server with full permissions
docker run -i --rm \
  -e GITHUB_PERSONAL_ACCESS_TOKEN=$(gh auth token) \
  ghcr.io/github/github-mcp-server

# Use MCP tools to:
# 1. Create issues with standardized templates
# 2. Add issues to CycleTime Scrum project
# 3. Set initial status and dependencies
# 4. Apply appropriate labels
```

**Benefits**:
- Consistent issue formatting
- Automatic project board integration
- Reduced manual work

### 3. PR and Issue Synchronization

**Use Case**: Keep PRs and issues synchronized with project board status

**Workflow**:
```bash
# Monitor PR status and update related issues
# Use GitHub MCP server to:
# 1. Detect PR merge events
# 2. Update related issue status to "Done"
# 3. Move issues to appropriate project board columns
```

**Benefits**:
- Automated status synchronization
- Reduced manual project board maintenance
- Better project visibility

## Future MCP Server Workflows

### File System MCP Server

**Use Case**: Documentation management and generation

**Planned Workflow**:
- Read PRD and technical documents
- Generate project documentation templates
- Maintain living documentation sync

### Git MCP Server

**Use Case**: Repository analysis and branch management

**Planned Workflow**:
- Analyze commit history for project insights
- Automated branch cleanup
- Code change impact analysis

## Getting Started

1. **Install GitHub MCP Server**: Follow setup instructions in `mcp-setup.md`
2. **Test Basic Operations**: Use the test script to verify installation
3. **Start with Simple Workflows**: Begin with issue creation and updates
4. **Expand Gradually**: Add more complex workflows as needed

## Security Best Practices

- Use environment variables for tokens
- Start with read-only mode for testing
- Limit token permissions to minimum required
- Monitor MCP server access logs
- Regular token rotation

## Troubleshooting

### Common Issues

1. **Permission Errors**: Verify GitHub token has required scopes
2. **Docker Issues**: Ensure Docker is running and accessible
3. **MCP Connection**: Check network connectivity and server logs

### Debug Commands

```bash
# Check Docker status
docker ps

# View MCP server logs
docker logs <container-name>

# Test GitHub token
gh auth status
```

## References

- [GitHub MCP Server Documentation](https://github.com/github/github-mcp-server)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [CycleTime MCP Setup Guide](./mcp-setup.md)
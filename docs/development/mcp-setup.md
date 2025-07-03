# MCP Server Setup for CycleTime Development

## Overview

This document describes the setup and configuration of Model Context Protocol (MCP) servers for CycleTime development. MCP servers provide AI agents with structured access to external tools and data sources.

## Installed MCP Servers

### 1. GitHub MCP Server

**Purpose**: Provides GitHub API access for issue management, repository operations, and project board updates.

**Installation**: 
- Repository: https://github.com/github/github-mcp-server
- Docker Image: `ghcr.io/github/github-mcp-server`

**Setup Steps**:

1. **Prerequisites**:
   - Docker installed and running
   - GitHub Personal Access Token with appropriate permissions

2. **Required GitHub Token Permissions**:
   - `repo` - Full control of private repositories
   - `project` - Full control of projects
   - `read:org` - Read org and team membership
   - `read:user` - Read user profile data

3. **Local Docker Installation**:
   ```bash
   docker run -i --rm \
     -e GITHUB_PERSONAL_ACCESS_TOKEN=<your-token> \
     ghcr.io/github/github-mcp-server
   ```

4. **Configuration Options**:
   - `--toolsets`: Specify which GitHub API toolsets to enable
   - `--read-only`: Enable read-only mode for safety
   - `GITHUB_TOOLSETS`: Environment variable for toolset configuration

**Available Tools**:
- `create_issue` - Create new GitHub issues
- `update_issue` - Update existing issues (including custom fields)
- `list_issues` - List and filter issues
- `create_pull_request` - Create pull requests
- `get_issue` - Get detailed issue information
- `search_repositories` - Search for repositories

**Usage Examples**:
```bash
# Test GitHub MCP server
docker run -i --rm \
  -e GITHUB_PERSONAL_ACCESS_TOKEN=$GITHUB_TOKEN \
  ghcr.io/github/github-mcp-server

# With specific toolsets
docker run -i --rm \
  -e GITHUB_PERSONAL_ACCESS_TOKEN=$GITHUB_TOKEN \
  -e GITHUB_TOOLSETS=issues,pulls,repos \
  ghcr.io/github/github-mcp-server
```

## Research Results

### Recommended MCP Servers for CycleTime Development

1. **GitHub MCP Server** ✅ (Installed)
   - Official GitHub MCP server
   - Essential for issue and project management
   - Supports custom fields and project boards

2. **File System MCP Server** (To be installed)
   - Provides secure file operations
   - Useful for documentation management
   - Available in official MCP servers collection

3. **Git MCP Server** (To be evaluated)
   - Git repository operations
   - Commit history analysis
   - Branch management

4. **JetBrains MCP Server** (Future consideration)
   - IDE integration
   - Code analysis capabilities
   - Development environment integration

5. **Notion MCP Server** (Future consideration)
   - Project documentation
   - Knowledge management
   - Team collaboration

### Enterprise/Advanced Options

- **GitKraken MCP Server**: Multi-platform Git operations
- **Buildkite MCP Server**: CI/CD pipeline management
- **Semgrep MCP Server**: Code security scanning
- **AWS MCP Server**: Cloud infrastructure management

## Next Steps

1. ✅ Install GitHub MCP server
2. ⏳ Set up authentication and test GitHub operations
3. ⏳ Install File System MCP server
4. ⏳ Create MCP server configuration management
5. ⏳ Document common MCP workflows for the team

## Security Considerations

- Store GitHub tokens securely (use environment variables)
- Use read-only mode when possible
- Limit token permissions to minimum required
- Regular token rotation
- Monitor MCP server access logs

## Troubleshooting

### Common Issues

1. **Docker Permission Errors**:
   - Ensure Docker daemon is running
   - Check user permissions for Docker

2. **GitHub Token Issues**:
   - Verify token has required scopes
   - Check token expiration
   - Ensure token is for correct organization

3. **MCP Server Connection Issues**:
   - Check network connectivity
   - Verify server is running
   - Check server logs for errors

## References

- [GitHub MCP Server Documentation](https://github.com/github/github-mcp-server)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [Official MCP Servers Collection](https://github.com/modelcontextprotocol/servers)
- [Awesome MCP Servers List](https://github.com/wong2/awesome-mcp-servers)
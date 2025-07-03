#!/bin/bash

# Test GitHub MCP Server installation
echo "Testing GitHub MCP Server..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if GitHub token is available
if [ -z "$(gh auth token 2>/dev/null)" ]; then
    echo "❌ GitHub CLI token not available. Please run 'gh auth login' first."
    exit 1
fi

echo "✅ Docker is running"
echo "✅ GitHub CLI token is available"

# Test GitHub MCP server in read-only mode
echo "🔍 Testing GitHub MCP server connection..."

# Start the server in the background for a quick test
docker run --rm -d \
  --name github-mcp-test \
  -e GITHUB_PERSONAL_ACCESS_TOKEN=$(gh auth token) \
  -e GITHUB_TOOLSETS=issues,repos \
  ghcr.io/github/github-mcp-server --read-only > /tmp/github-mcp-test.log 2>&1

# Give it a moment to start
sleep 2

# Check if container is running
if docker ps | grep -q github-mcp-test; then
    echo "✅ GitHub MCP server started successfully"
    
    # Stop the test container
    docker stop github-mcp-test > /dev/null 2>&1
    echo "✅ Test completed successfully"
else
    echo "❌ GitHub MCP server failed to start"
    echo "Check logs:"
    cat /tmp/github-mcp-test.log
    exit 1
fi

echo ""
echo "🎉 GitHub MCP server is ready to use!"
echo ""
echo "Usage examples:"
echo "# Start server interactively:"
echo "docker run -i --rm \\"
echo "  -e GITHUB_PERSONAL_ACCESS_TOKEN=\$(gh auth token) \\"
echo "  ghcr.io/github/github-mcp-server"
echo ""
echo "# Start server with specific toolsets:"
echo "docker run -i --rm \\"
echo "  -e GITHUB_PERSONAL_ACCESS_TOKEN=\$(gh auth token) \\"
echo "  -e GITHUB_TOOLSETS=issues,pulls,repos \\"
echo "  ghcr.io/github/github-mcp-server"
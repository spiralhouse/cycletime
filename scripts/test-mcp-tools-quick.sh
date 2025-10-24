#!/usr/bin/env bash

# ==============================================================================
# Quick MCP Tools Test (SPI-765)
# ==============================================================================
# Fast smoke test for SPI-765 implementation - verifies core functionality only
#
# Usage: ./scripts/test-mcp-tools-quick.sh [server-url]
#
# Exit Codes:
#   0 - Core tests passed
#   1 - One or more tests failed
#   2 - Server not responding
# ==============================================================================

set -e

SERVER_URL="${1:-http://localhost:8080}"
MCP_URL="${SERVER_URL}/mcp"

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "🚀 Quick MCP Tools Test (${MCP_URL})"
echo ""

# Check server
if ! curl -s -f -m 5 "${SERVER_URL}/health" >/dev/null 2>&1; then
    echo -e "${RED}❌${NC} Server not responding"
    exit 2
fi

# Test 1: tools/list
echo "Test 1: tools/list..."
TOOL_COUNT=$(curl -s -X POST "${MCP_URL}" \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
    | python3 -c "import json,sys; print(len(json.load(sys.stdin)['result']['tools']))" 2>/dev/null)

if [ "$TOOL_COUNT" = "17" ]; then
    echo -e "${GREEN}✅${NC} All 17 tools registered"
else
    echo -e "${RED}❌${NC} Expected 17 tools, got $TOOL_COUNT"
    exit 1
fi

# Test 2: tools/call real data
echo "Test 2: tools/call real data..."
RESPONSE=$(curl -s -X POST "${MCP_URL}" \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"project_list_projects","arguments":{}}}')

if echo "$RESPONSE" | grep -q "Tool executed successfully"; then
    echo -e "${RED}❌${NC} Still returning placeholder!"
    exit 1
elif echo "$RESPONSE" | grep -q "projects"; then
    echo -e "${GREEN}✅${NC} Returns real data (not placeholder)"
else
    echo -e "${RED}❌${NC} Unexpected response format"
    exit 1
fi

# Test 3: Error handling
echo "Test 3: Error handling..."
if curl -s -X POST "${MCP_URL}" \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"invalid_tool","arguments":{}}}' \
    | grep -q '"-32601"'; then
    echo -e "${GREEN}✅${NC} Returns proper error code (-32601)"
else
    echo -e "${RED}❌${NC} Error handling not working"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Quick test passed!${NC}"
echo "   Run ./scripts/test-mcp-tools.sh for comprehensive tests"

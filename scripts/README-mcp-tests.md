# MCP Tools Test Scripts (SPI-765)

Comprehensive smoke tests for validating the Streamable HTTP transport implementation.

## Quick Start

```bash
# Start the server
./gradlew run

# In another terminal, run quick test (30 seconds)
./scripts/test-mcp-tools-quick.sh

# Or run comprehensive test suite (2-3 minutes)
./scripts/test-mcp-tools.sh
```

## Test Scripts

### `test-mcp-tools.sh` - Comprehensive Test Suite

Full validation of SPI-765 implementation with 5 comprehensive tests:

1. **Tool Discovery** - Verifies all 17 tools registered with correct namespacing
2. **Real Data Execution** - Confirms placeholder replaced with actual business logic
3. **Error Handling** - Validates JSON-RPC error codes (-32601 for invalid tools)
4. **Entity Creation** - Tests database persistence via `project_create_project`
5. **Response Format** - Ensures MCP-compliant JSON-RPC 2.0 format

**Usage:**
```bash
./scripts/test-mcp-tools.sh [OPTIONS]

Options:
  --server-url URL    Base URL (default: http://localhost:8080)
  --endpoint PATH     MCP endpoint (default: /mcp)
  --verbose          Enable detailed output
  --help             Show usage information
```

**Example Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧪 MCP Tools Smoke Test Suite (SPI-765)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ℹ Server URL: http://localhost:8080/mcp
✅ Server is responding

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Running Tests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

▶  Test 1: tools/list - Verify all 17 tools are registered
✅ Test 1 PASSED: All 17 tools registered with correct namespacing

▶  Test 2: tools/call - Execute project_list_projects (real data)
✅ Test 2 PASSED: Returns real database data (85 projects, not placeholder)

▶  Test 3: Error handling - Invalid tool name (expect JSON-RPC -32601)
✅ Test 3 PASSED: Returns JSON-RPC error -32601 for invalid tool

▶  Test 4: Entity creation - Create project via tools/call
✅ Test 4 PASSED: Project created successfully with database persistence

▶  Test 5: Response format - Verify MCP-compliant JSON-RPC format
✅ Test 5 PASSED: Response follows MCP-compliant JSON-RPC 2.0 format

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Test Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Tests run:    5
  Tests passed: 5
  Tests failed: 0

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ All tests passed! SPI-765 implementation verified.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ℹ Implementation proof:
ℹ   ✅ Placeholder replaced with real business logic
ℹ   ✅ All 17 tools execute via Streamable HTTP
ℹ   ✅ Error handling implemented (JSON-RPC -32601)
ℹ   ✅ Entity creation working (database persistence)
ℹ   ✅ Response format MCP-compliant
```

### `test-mcp-tools-quick.sh` - Fast Smoke Test

Minimal validation for rapid feedback (3 core tests, ~5 seconds):

1. Tool discovery (17 tools)
2. Real data execution (no placeholder)
3. Error handling (proper error codes)

**Usage:**
```bash
./scripts/test-mcp-tools-quick.sh [server-url]

# Examples:
./scripts/test-mcp-tools-quick.sh                          # Default: localhost:8080
./scripts/test-mcp-tools-quick.sh http://staging:8080     # Custom server
```

**Example Output:**
```
🚀 Quick MCP Tools Test (http://localhost:8080/mcp)

Test 1: tools/list...
✅ All 17 tools registered
Test 2: tools/call real data...
✅ Returns real data (not placeholder)
Test 3: Error handling...
✅ Returns proper error code (-32601)

✅ Quick test passed!
   Run ./scripts/test-mcp-tools.sh for comprehensive tests
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All tests passed |
| 1 | One or more tests failed |
| 2 | Server not responding |
| 3 | Invalid arguments (comprehensive test only) |

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Start CycleTime Server
  run: ./gradlew run &

- name: Wait for server startup
  run: sleep 10

- name: Run MCP Tools Tests
  run: ./scripts/test-mcp-tools.sh --server-url http://localhost:8080

- name: Stop server
  run: pkill -f cycletime
```

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-push

echo "Running MCP tools quick test..."
if ! ./scripts/test-mcp-tools-quick.sh; then
    echo "❌ MCP tools test failed - push aborted"
    exit 1
fi
```

## Testing Strategy

### When to Use Each Script

**Quick Test** (`test-mcp-tools-quick.sh`):
- During active development (every code change)
- Pre-commit validation
- Quick sanity checks
- CI fast-fail path

**Comprehensive Test** (`test-mcp-tools.sh`):
- Before creating pull requests
- Post-merge validation
- Release candidate testing
- Full regression testing

## Troubleshooting

### Server Not Responding (Exit Code 2)

```bash
# Check if server is running
curl -s http://localhost:8080/health

# Start server if not running
./gradlew run

# Check server logs
tail -f logs/cycletime.log
```

### Test Failures

**Enable verbose mode for detailed diagnostics:**
```bash
./scripts/test-mcp-tools.sh --verbose
```

**Common issues:**

1. **Wrong tool count**: Check if all tool providers are registered
2. **Placeholder still returned**: Verify `StreamableHttpHandler.kt` implementation
3. **Error code mismatch**: Check JSON-RPC error handling logic
4. **Entity creation fails**: Verify database connectivity and schema

### Custom Server Configuration

**Different port:**
```bash
./scripts/test-mcp-tools.sh --server-url http://localhost:9090
```

**Different endpoint:**
```bash
./scripts/test-mcp-tools.sh --endpoint /api/mcp
```

**Both:**
```bash
./scripts/test-mcp-tools.sh \
    --server-url http://staging:8080 \
    --endpoint /v2/mcp \
    --verbose
```

## What These Tests Validate

### SPI-765 Acceptance Criteria

✅ **Functional Requirements**:
- `tools/call` executes real business logic from tool providers
- `project_list_projects` returns actual database content
- `project_create_project` creates new projects in database
- All 17 tools execute correctly via Streamable HTTP

✅ **Technical Requirements**:
- Request parameters converted from JSON-RPC to tool handler format
- Response converted from `Result<JsonElement>` to JSON-RPC format
- Error handling matches SDK adapter patterns (isError: true, error codes)
- Async tool handlers execute without blocking Ktor event loop

✅ **Test Coverage**:
- Tool execution tests verify actual data returned (not placeholders)
- Error cases tested (invalid tool name, missing parameters)
- Response format validated (JSON-RPC 2.0 compliance)

## Related Documentation

- **Linear Issue**: [SPI-765](https://linear.app/spiral-house/issue/SPI-765)
- **Implementation**: `src/main/kotlin/io/spiralhouse/cycletime/mcp/sdk/StreamableHttpHandler.kt`
- **Integration Tests**: `src/integrationTest/kotlin/io/spiralhouse/cycletime/integration/mcp/StreamableHttpIntegrationTest.kt`
- **Code Review**: Development report at `/tmp/spi-765-development-report.md`

## Contributing

When modifying these tests:

1. **Maintain backward compatibility** - tests should work with existing servers
2. **Update documentation** - keep this README in sync with script changes
3. **Test the tests** - verify scripts work on clean environments
4. **Follow conventions** - match existing output formatting and exit codes

## License

Same as CycleTime project (see root LICENSE file)

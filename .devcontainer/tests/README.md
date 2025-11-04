# DevContainer Test Suite

Comprehensive test suite for validating devcontainer functionality, safety mechanisms, and readiness for unattended Claude Code operations.

## Overview

This test suite validates all aspects of the CycleTime devcontainer implementation:

- **Container Build & Dependencies** - Runtime environments, tools, and configurations
- **Claude CLI Integration** - Claude Code CLI installation and operations
- **Resource Limits** - CPU, memory, PID, and disk I/O enforcement under stress
- **Safety Mechanisms** - Audit logging, monitoring, and emergency controls
- **Dangerous Mode** - Enable/disable, dry-run, allowlists, and time-limited sessions
- **End-to-End Integration** - Complete workflows including Gradle, git, and safety integration

## Test Suites

### 1. Container Build Tests (`test-devcontainer-build.sh`)

**Purpose**: Validate container builds successfully with all required dependencies

**Test Categories**:
- Runtime Dependencies (Node.js 20, JVM 21, Gradle, Git, Bash, jq, curl)
- Volume Mounts (workspace, Gradle cache, NPM cache)
- User Permissions (vscode user, non-root UID, sudo restrictions)
- Port Configuration (8080 availability)
- Environment Configuration (PATH, HOME, SHELL)
- Container Build Artifacts (devcontainer scripts presence and executability)

**Total Tests**: 22

**Execution Time**: ~10 seconds

**Usage**:
```bash
bash .devcontainer/tests/test-devcontainer-build.sh
```

### 2. Claude CLI Tests (`test-claude-cli.sh`)

**Purpose**: Validate Claude CLI installation, accessibility, and basic operations

**Test Categories**:
- CLI Installation (command availability, version check, npm packages)
- Help and Documentation (help command, subcommands)
- Configuration (config directory, API key setup, environment variables)
- Error Handling (invalid commands, missing config behavior)
- File System Access (temp directory, workspace access)
- Integration with DevContainer (safety scripts callable, git integration, Node.js compatibility)
- Security Checks (config file permissions, no hardcoded credentials)

**Total Tests**: 18

**Execution Time**: ~15 seconds

**Usage**:
```bash
bash .devcontainer/tests/test-claude-cli.sh
```

### 3. Safety Mechanisms Tests (`../scripts/test-safety-mechanisms.sh`)

**Purpose**: Validate audit logging, resource monitoring, and emergency stop functionality

**Test Categories**:
- Audit Logger (file_write, command_exec, network_req, git operations, security events, statistics, JSON format)
- Resource Monitor (CPU, memory, disk, PID usage detection, snapshots in human/JSON format)
- Emergency Stop (circuit breaker trip/reset, status detection, state save, condition checks)
- Integration (audit + monitor integration, script executability, environment variables)

**Total Tests**: 22 (from SPI-944)

**Execution Time**: ~20 seconds

**Usage**:
```bash
bash .devcontainer/scripts/test-safety-mechanisms.sh
```

### 4. Resource Limits Tests (`test-resource-limits.sh`)

**Purpose**: Stress test CPU, memory, PID, and disk I/O limits under load

**Test Categories**:
- CPU Limits (cgroup detection, stress test with 4 cores, throttling verification)
- Memory Limits (cgroup detection, current usage, OOM killer, allocation tests)
- PID Limits (cgroup detection, current usage, fork bomb protection)
- Disk I/O Limits (I/O controls, write/read performance, disk space checks)
- Combined Stress Test (CPU + memory + disk simultaneously)
- Resource Recovery (load recovery, memory cleanup verification)

**Total Tests**: 16

**Execution Time**: ~30 seconds

**WARNING**: This test suite intentionally creates high load. Do not run on production systems.

**Usage**:
```bash
bash .devcontainer/tests/test-resource-limits.sh
```

### 5. Dangerous Mode Tests (`test-dangerous-mode.sh`)

**Purpose**: Validate dangerous mode controls, dry-run, allowlists, and circuit breaker

**Test Categories**:
- Script Availability (enable/disable/dry-run scripts exist)
- Enable/Disable Functionality (state management, verification, cleanup)
- Dry-Run Mode (execution, risk assessment, command simulation without execution)
- Operation Allowlist/Denylist (config file structure, allowlist/denylist configuration)
- Time-Limited Sessions (short duration, auto-expiration, duration validation)
- Circuit Breaker Integration (breaker trips dangerous mode, prevents enable when tripped)
- Audit Logging (enable/disable logged, security events)
- Safety Verification (prevent duplicate enable, clean shutdown)

**Total Tests**: 22

**Execution Time**: ~20 seconds (includes 6s wait for session expiration)

**Usage**:
```bash
bash .devcontainer/tests/test-dangerous-mode.sh
```

### 6. Integration Tests (`test-integration.sh`)

**Purpose**: End-to-end workflows including Gradle build, git operations, and safety integration

**Test Categories**:
- Build System (Gradle availability, wrapper, version check, tasks, daemon status)
- Git Operations (configuration, repository detection, status, staging, log access)
- Audit Logging Integration (log creation, multiple event types, JSON format, statistics)
- Resource Monitoring Integration (monitor execution, metrics availability, JSON output)
- Emergency Procedures (trip, status check, state save, reset)
- End-to-End Workflow (complete safety workflow, script chaining, error recovery)
- Performance Checks (script execution speed, concurrent execution)

**Total Tests**: 26

**Execution Time**: ~60 seconds (includes Gradle operations)

**Usage**:
```bash
bash .devcontainer/tests/test-integration.sh
```

## Master Test Runner

### `run-all-tests.sh`

Executes all test suites in sequence and generates comprehensive report.

**Features**:
- Colored output with test progress
- Individual suite timing
- Comprehensive summary report
- Report saved to `/tmp/devcontainer-test-report-TIMESTAMP.txt`
- Exit code 0 if all pass, 1 if any fail

**Usage**:
```bash
bash .devcontainer/tests/run-all-tests.sh
```

**Expected Output**:
```
╔════════════════════════════════════════════════════════════════════════════╗
║                    DevContainer Test Suite Runner                          ║
║                                                                            ║
║  Comprehensive validation of devcontainer functionality, safety            ║
║  mechanisms, and readiness for unattended Claude Code operations           ║
╚════════════════════════════════════════════════════════════════════════════╝

✓ Running inside devcontainer

Test execution started: 2025-11-03 16:45:00

═══ Test Suite 1: Container Build & Dependencies ═══

Running: Container Build Tests
...
✓ Container Build Tests PASSED (10s)

═══ Test Suite 2: Claude CLI Installation & Operations ═══
...

═══ Final Summary ═══

Total Test Suites: 6
Passed: 6
Failed: 0

╔═══════════════════════════════════════════════╗
║                                               ║
║  ✓ ALL DEVCONTAINER TESTS PASSED!            ║
║                                               ║
║  Container is ready for unattended Claude     ║
║  Code operations with full safety controls.   ║
║                                               ║
╚═══════════════════════════════════════════════╝

Report saved to: /tmp/devcontainer-test-report-20251103-164530.txt
```

## Test Coverage Matrix

| Feature Category | Test Suite | Positive Tests | Negative Tests | Edge Cases | Integration |
|-----------------|------------|----------------|----------------|------------|-------------|
| Container Build | test-devcontainer-build.sh | ✓ | ✓ | ✓ | - |
| Claude CLI | test-claude-cli.sh | ✓ | ✓ | ✓ | ✓ |
| Safety Mechanisms | test-safety-mechanisms.sh | ✓ | ✓ | ✓ | ✓ |
| Resource Limits | test-resource-limits.sh | ✓ | ✓ | ✓ | ✓ |
| Dangerous Mode | test-dangerous-mode.sh | ✓ | ✓ | ✓ | ✓ |
| End-to-End | test-integration.sh | ✓ | ✓ | ✓ | ✓ |

**Total Test Count**: 126 tests across 6 suites

## CI/CD Integration

### GitHub Actions Integration

Add to `.github/workflows/devcontainer-tests.yml`:

```yaml
name: DevContainer Tests

on:
  pull_request:
    paths:
      - '.devcontainer/**'
  push:
    branches:
      - main
      - 'feat/spi-916-*'

jobs:
  devcontainer-tests:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Build devcontainer
        uses: devcontainers/ci@v0.3
        with:
          imageName: cycletime-devcontainer
          runCmd: bash .devcontainer/tests/run-all-tests.sh

      - name: Upload test report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-report
          path: /tmp/devcontainer-test-report-*.txt
```

### Pre-commit Hook

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash
# Run devcontainer tests before commit (if in devcontainer)

if [[ -f "/.dockerenv" ]]; then
    echo "Running devcontainer tests..."
    bash .devcontainer/tests/run-all-tests.sh || {
        echo "Devcontainer tests failed. Commit aborted."
        exit 1
    }
fi
```

### Manual Execution in DevContainer

```bash
# Inside devcontainer
cd /workspace
bash .devcontainer/tests/run-all-tests.sh
```

## Test Environment Variables

Tests use isolated temporary directories and environment variables:

```bash
# Audit logging
export CLAUDE_AUDIT_LOG="/tmp/test-audit-$$.log"

# Circuit breaker
export CIRCUIT_BREAKER_FILE="/tmp/test-circuit-breaker-$$"

# State directory
export STATE_DIR="/tmp/test-state-$$"

# Dangerous mode config
export DANGEROUS_MODE_CONFIG="/tmp/test-dangerous-mode-$$.json"
export DANGEROUS_MODE_STATE="/tmp/test-dangerous-mode-state-$$"
export DANGEROUS_MODE_LOG="/tmp/test-dangerous-mode-$$.log"
```

All temporary files are cleaned up after test execution.

## Troubleshooting

### Tests Fail Outside Devcontainer

**Symptom**: Resource limit tests or cgroup tests fail

**Solution**: These tests require container environment. Run inside devcontainer:

```bash
# Start devcontainer in VS Code or via CLI
devcontainer up --workspace-folder .
devcontainer exec --workspace-folder . bash .devcontainer/tests/run-all-tests.sh
```

### Gradle Tests Timeout

**Symptom**: Integration tests fail with Gradle timeout

**Solution**: Increase timeout or ensure Gradle daemon is warm:

```bash
# Pre-warm Gradle
./gradlew --version
./gradlew tasks

# Then run tests
bash .devcontainer/tests/run-all-tests.sh
```

### Claude CLI Not Found

**Symptom**: Claude CLI tests all skip/fail

**Solution**: Ensure Claude CLI installed via post-create script:

```bash
bash .devcontainer/scripts/install-claude-cli.sh
```

### Resource Limit Tests Show "No Limit Set"

**Symptom**: Tests skip cgroup checks

**Solution**: Normal on systems without cgroup v2 or Docker resource limits. Not a failure.

### Permission Denied on Scripts

**Symptom**: Tests fail to execute scripts

**Solution**: Ensure scripts are executable:

```bash
chmod +x .devcontainer/tests/*.sh
chmod +x .devcontainer/scripts/*.sh
```

## Test Development Guidelines

When adding new tests:

1. **Follow Existing Patterns**:
   - Use consistent color coding (GREEN=pass, RED=fail, YELLOW=skip, BLUE=section)
   - Implement `report_test()` function for consistent output
   - Track TESTS_PASSED, TESTS_FAILED, TESTS_TOTAL counters

2. **Implement Proper Cleanup**:
   ```bash
   trap "rm -rf $TEST_DIR" EXIT
   ```

3. **Use Isolated Test Environment**:
   - Create unique temp directories with `$$` (PID)
   - Export test-specific environment variables
   - Don't modify global state

4. **Handle Missing Tools Gracefully**:
   ```bash
   if command -v jq >/dev/null 2>&1; then
       # Run test
   else
       report_test "Test name" "skip" "jq not available"
   fi
   ```

5. **Document Each Test**:
   - Clear test names
   - Descriptive messages on pass/fail
   - Group related tests with section headers

6. **Exit Codes**:
   - Exit 0 if all tests pass
   - Exit 1 if any test fails
   - Track skipped tests separately

## Maintenance

### Updating Tests

When devcontainer configuration changes:

1. Update relevant test suite
2. Update test count in this README
3. Run full suite to verify
4. Update documentation if test categories change

### Adding New Test Suite

1. Create `test-new-feature.sh` in `.devcontainer/tests/`
2. Make executable: `chmod +x test-new-feature.sh`
3. Add to `run-all-tests.sh` in appropriate section
4. Update this README with test suite documentation
5. Update test coverage matrix

## Related Documentation

- **[DevContainer Safety Architecture](../../docs/architecture/devcontainer-safety-architecture.md)** - Complete safety system design
- **[DevContainer Best Practices](../../docs/research/devcontainer-claude-code-best-practices.md)** - Research and best practices
- **[DevContainer README](../ README.md)** - Main devcontainer documentation
- **[Safety Mechanisms](../SAFETY.md)** - Safety mechanisms overview
- **[Dangerous Mode Guide](../DANGEROUS-MODE.md)** - Dangerous mode documentation

## License

This test suite is part of CycleTime CE and follows the project's license.

## Support

For issues or questions:

1. Check troubleshooting section above
2. Review test output for specific failure messages
3. Consult related documentation
4. Open issue on GitHub with test report attached

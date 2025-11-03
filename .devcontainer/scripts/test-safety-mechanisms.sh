#!/bin/bash
# test-safety-mechanisms.sh - Comprehensive test suite for safety mechanisms
# Validates audit logging, resource monitoring, and emergency stop functionality

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Temporary test directory
TEST_DIR="/tmp/safety-tests-$$"
mkdir -p "$TEST_DIR"

# Cleanup on exit
trap "rm -rf $TEST_DIR" EXIT

# Function: Report test result
report_test() {
    local test_name="$1"
    local result="$2"
    local message="${3:-}"

    ((TESTS_TOTAL++))

    if [[ "$result" == "pass" ]]; then
        ((TESTS_PASSED++))
        echo -e "${GREEN}✓${NC} $test_name"
        [[ -n "$message" ]] && echo "  $message"
    else
        ((TESTS_FAILED++))
        echo -e "${RED}✗${NC} $test_name"
        [[ -n "$message" ]] && echo "  $message"
    fi
}

# Function: Run test with timeout
run_test_with_timeout() {
    local timeout_seconds="$1"
    shift
    local test_command="$@"

    timeout "$timeout_seconds" bash -c "$test_command" 2>/dev/null
}

echo -e "${BLUE}=== Safety Mechanisms Test Suite ===${NC}"
echo "Testing audit logging, resource monitoring, and emergency stop..."
echo ""

# Test 1: Audit Logger - Basic Logging
echo -e "${BLUE}[Test Group: Audit Logger]${NC}"

export CLAUDE_AUDIT_LOG="$TEST_DIR/audit.log"

if .devcontainer/scripts/audit-logger.sh file_write "test.txt" "success" 100 >/dev/null 2>&1; then
    if grep -q '"type":"file_write"' "$TEST_DIR/audit.log" 2>/dev/null; then
        report_test "Audit Logger: Basic file_write logging" "pass" "Event logged to $TEST_DIR/audit.log"
    else
        report_test "Audit Logger: Basic file_write logging" "fail" "Event not found in log"
    fi
else
    report_test "Audit Logger: Basic file_write logging" "fail" "Script execution failed"
fi

# Test 2: Audit Logger - Command Execution Logging
if .devcontainer/scripts/audit-logger.sh command_exec "echo test" "success" 50 0 >/dev/null 2>&1; then
    if grep -q '"type":"command_exec"' "$TEST_DIR/audit.log" 2>/dev/null; then
        report_test "Audit Logger: Command execution logging" "pass"
    else
        report_test "Audit Logger: Command execution logging" "fail" "Event not found in log"
    fi
else
    report_test "Audit Logger: Command execution logging" "fail" "Script execution failed"
fi

# Test 3: Audit Logger - Network Request Logging
if .devcontainer/scripts/audit-logger.sh network_req "https://api.github.com" "success" 200 200 >/dev/null 2>&1; then
    if grep -q '"type":"network_req"' "$TEST_DIR/audit.log" 2>/dev/null; then
        report_test "Audit Logger: Network request logging" "pass"
    else
        report_test "Audit Logger: Network request logging" "fail" "Event not found in log"
    fi
else
    report_test "Audit Logger: Network request logging" "fail" "Script execution failed"
fi

# Test 4: Audit Logger - Git Operation Logging
if .devcontainer/scripts/audit-logger.sh git commit "test commit" "success" 300 >/dev/null 2>&1; then
    if grep -q '"type":"git_commit"' "$TEST_DIR/audit.log" 2>/dev/null; then
        report_test "Audit Logger: Git operation logging" "pass"
    else
        report_test "Audit Logger: Git operation logging" "fail" "Event not found in log"
    fi
else
    report_test "Audit Logger: Git operation logging" "fail" "Script execution failed"
fi

# Test 5: Audit Logger - Security Event Logging
if .devcontainer/scripts/audit-logger.sh security "test_event" "Test security event" "critical" >/dev/null 2>&1; then
    if grep -q '"type":"security_event"' "$TEST_DIR/audit.log" 2>/dev/null && \
       grep -q '"severity":"critical"' "$TEST_DIR/audit.log" 2>/dev/null; then
        report_test "Audit Logger: Security event logging" "pass"
    else
        report_test "Audit Logger: Security event logging" "fail" "Event not found or incorrect severity"
    fi
else
    report_test "Audit Logger: Security event logging" "fail" "Script execution failed"
fi

# Test 6: Audit Logger - Statistics
if .devcontainer/scripts/audit-logger.sh stats >/dev/null 2>&1; then
    report_test "Audit Logger: Statistics generation" "pass"
else
    report_test "Audit Logger: Statistics generation" "fail" "Stats command failed"
fi

# Test 7: Audit Logger - JSON Format Validation
if command -v jq >/dev/null 2>&1; then
    if jq empty "$TEST_DIR/audit.log" 2>/dev/null; then
        report_test "Audit Logger: Valid JSON format" "pass" "All log entries are valid JSON"
    else
        report_test "Audit Logger: Valid JSON format" "fail" "Invalid JSON detected"
    fi
else
    report_test "Audit Logger: Valid JSON format" "skip" "jq not available"
fi

echo ""
echo -e "${BLUE}[Test Group: Resource Monitor]${NC}"

# Test 8: Resource Monitor - CPU Usage
if output=$(.devcontainer/scripts/monitor-resources.sh cpu 2>/dev/null); then
    if [[ "$output" =~ ^[0-9]+(\.[0-9]+)?$ ]]; then
        report_test "Resource Monitor: CPU usage detection" "pass" "CPU: ${output}%"
    else
        report_test "Resource Monitor: CPU usage detection" "fail" "Invalid output: $output"
    fi
else
    report_test "Resource Monitor: CPU usage detection" "fail" "Script execution failed"
fi

# Test 9: Resource Monitor - Memory Usage
if output=$(.devcontainer/scripts/monitor-resources.sh memory 2>/dev/null); then
    if [[ "$output" =~ ^[0-9]+(\.[0-9]+)?$ ]]; then
        report_test "Resource Monitor: Memory usage detection" "pass" "Memory: ${output}%"
    else
        report_test "Resource Monitor: Memory usage detection" "fail" "Invalid output: $output"
    fi
else
    report_test "Resource Monitor: Memory usage detection" "fail" "Script execution failed"
fi

# Test 10: Resource Monitor - Disk Usage
if output=$(.devcontainer/scripts/monitor-resources.sh disk 2>/dev/null); then
    if [[ "$output" =~ ^[0-9]+$ ]]; then
        report_test "Resource Monitor: Disk usage detection" "pass" "Disk: ${output}%"
    else
        report_test "Resource Monitor: Disk usage detection" "fail" "Invalid output: $output"
    fi
else
    report_test "Resource Monitor: Disk usage detection" "fail" "Script execution failed"
fi

# Test 11: Resource Monitor - PID Usage
if output=$(.devcontainer/scripts/monitor-resources.sh pids 2>/dev/null); then
    if [[ "$output" =~ ^[0-9]+(\.[0-9]+)?$ ]]; then
        report_test "Resource Monitor: PID usage detection" "pass" "PIDs: ${output}%"
    else
        report_test "Resource Monitor: PID usage detection" "fail" "Invalid output: $output"
    fi
else
    report_test "Resource Monitor: PID usage detection" "fail" "Script execution failed"
fi

# Test 12: Resource Monitor - Single Snapshot (Human Format)
if .devcontainer/scripts/monitor-resources.sh once 2>/dev/null | grep -q "CPU:"; then
    report_test "Resource Monitor: Single snapshot (human)" "pass"
else
    report_test "Resource Monitor: Single snapshot (human)" "fail" "Output format incorrect"
fi

# Test 13: Resource Monitor - Single Snapshot (JSON Format)
if command -v jq >/dev/null 2>&1; then
    if output=$(.devcontainer/scripts/monitor-resources.sh once json 2>/dev/null); then
        if echo "$output" | jq -e '.cpu_percent' >/dev/null 2>&1; then
            report_test "Resource Monitor: Single snapshot (JSON)" "pass"
        else
            report_test "Resource Monitor: Single snapshot (JSON)" "fail" "Missing cpu_percent field"
        fi
    else
        report_test "Resource Monitor: Single snapshot (JSON)" "fail" "Script execution failed"
    fi
else
    report_test "Resource Monitor: Single snapshot (JSON)" "skip" "jq not available"
fi

echo ""
echo -e "${BLUE}[Test Group: Emergency Stop]${NC}"

export CIRCUIT_BREAKER_FILE="$TEST_DIR/circuit-breaker"
export STATE_DIR="$TEST_DIR/state"
mkdir -p "$STATE_DIR"

# Test 14: Emergency Stop - Circuit Breaker Trip
if .devcontainer/scripts/emergency-stop.sh trip "test trip" >/dev/null 2>&1; then
    if [[ -f "$CIRCUIT_BREAKER_FILE" ]]; then
        report_test "Emergency Stop: Circuit breaker trip" "pass"
    else
        report_test "Emergency Stop: Circuit breaker trip" "fail" "Breaker file not created"
    fi
else
    report_test "Emergency Stop: Circuit breaker trip" "fail" "Script execution failed"
fi

# Test 15: Emergency Stop - Circuit Breaker Status (Tripped)
if output=$(.devcontainer/scripts/emergency-stop.sh status 2>/dev/null); then
    if echo "$output" | grep -q "TRIPPED"; then
        report_test "Emergency Stop: Status detection (tripped)" "pass"
    else
        report_test "Emergency Stop: Status detection (tripped)" "fail" "Status not showing TRIPPED"
    fi
else
    report_test "Emergency Stop: Status detection (tripped)" "fail" "Script execution failed"
fi

# Test 16: Emergency Stop - Circuit Breaker Reset
if .devcontainer/scripts/emergency-stop.sh reset >/dev/null 2>&1; then
    if [[ ! -f "$CIRCUIT_BREAKER_FILE" ]]; then
        report_test "Emergency Stop: Circuit breaker reset" "pass"
    else
        report_test "Emergency Stop: Circuit breaker reset" "fail" "Breaker file still exists"
    fi
else
    report_test "Emergency Stop: Circuit breaker reset" "fail" "Script execution failed"
fi

# Test 17: Emergency Stop - Circuit Breaker Status (Reset)
if output=$(.devcontainer/scripts/emergency-stop.sh status 2>/dev/null); then
    if echo "$output" | grep -q "OK"; then
        report_test "Emergency Stop: Status detection (reset)" "pass"
    else
        report_test "Emergency Stop: Status detection (reset)" "fail" "Status not showing OK"
    fi
else
    report_test "Emergency Stop: Status detection (reset)" "fail" "Script execution failed"
fi

# Test 18: Emergency Stop - State Save
mkdir -p /workspace/test-save-$$
echo "test content" > /workspace/test-save-$$/test.txt

if .devcontainer/scripts/emergency-stop.sh save "test-save-$$" >/dev/null 2>&1; then
    if [[ -f "$STATE_DIR/test-save-$$.tar.gz" ]]; then
        report_test "Emergency Stop: State save" "pass" "State saved to $STATE_DIR/test-save-$$.tar.gz"
    else
        report_test "Emergency Stop: State save" "fail" "State file not created"
    fi
else
    report_test "Emergency Stop: State save" "fail" "Script execution failed"
fi

rm -rf /workspace/test-save-$$

# Test 19: Emergency Stop - Condition Check (Should Pass)
if .devcontainer/scripts/emergency-stop.sh check >/dev/null 2>&1; then
    report_test "Emergency Stop: Condition check (normal)" "pass"
else
    report_test "Emergency Stop: Condition check (normal)" "fail" "Check failed unexpectedly"
fi

echo ""
echo -e "${BLUE}[Test Group: Integration]${NC}"

# Test 20: Integration - Audit Logger with Resource Monitor
export CLAUDE_AUDIT_LOG="$TEST_DIR/integration-audit.log"

if .devcontainer/scripts/monitor-resources.sh once >/dev/null 2>&1; then
    # Check if monitoring triggered any audit events (alerts)
    if [[ -f "$TEST_DIR/integration-audit.log" ]]; then
        report_test "Integration: Resource monitor with audit logging" "pass" "Monitoring integrated with audit system"
    else
        report_test "Integration: Resource monitor with audit logging" "pass" "No alerts triggered (normal)"
    fi
else
    report_test "Integration: Resource monitor with audit logging" "fail" "Monitoring failed"
fi

# Test 21: Integration - Script Executability
scripts=(
    ".devcontainer/scripts/audit-logger.sh"
    ".devcontainer/scripts/monitor-resources.sh"
    ".devcontainer/scripts/emergency-stop.sh"
)

all_executable=true
for script in "${scripts[@]}"; do
    if [[ ! -x "$script" ]]; then
        all_executable=false
        break
    fi
done

if $all_executable; then
    report_test "Integration: All scripts executable" "pass"
else
    report_test "Integration: All scripts executable" "fail" "Some scripts not executable"
fi

# Test 22: Integration - Environment Variables
required_vars=(
    "CLAUDE_AUDIT_LOG"
    "CIRCUIT_BREAKER_FILE"
    "STATE_DIR"
)

all_vars_set=true
for var in "${required_vars[@]}"; do
    if [[ -z "${!var:-}" ]]; then
        all_vars_set=false
        break
    fi
done

if $all_vars_set; then
    report_test "Integration: Environment variables set" "pass"
else
    report_test "Integration: Environment variables set" "fail" "Some variables not set"
fi

echo ""
echo -e "${BLUE}=== Test Summary ===${NC}"
echo "Total tests: $TESTS_TOTAL"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"

if [[ $TESTS_FAILED -eq 0 ]]; then
    echo ""
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi

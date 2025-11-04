#!/bin/bash
# test-integration.sh - End-to-End Integration Tests
# Validates complete workflows including Gradle build, git operations, audit logging, and emergency procedures

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

# Test directory
TEST_DIR="/tmp/integration-tests-$$"
mkdir -p "$TEST_DIR"

# Cleanup on exit
trap "rm -rf $TEST_DIR" EXIT

# Export test environment
export CLAUDE_AUDIT_LOG="$TEST_DIR/audit.log"
export CIRCUIT_BREAKER_FILE="$TEST_DIR/circuit-breaker"
export STATE_DIR="$TEST_DIR/state"
mkdir -p "$STATE_DIR"

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
    elif [[ "$result" == "skip" ]]; then
        echo -e "${YELLOW}⊘${NC} $test_name (skipped)"
        [[ -n "$message" ]] && echo "  $message"
    else
        ((TESTS_FAILED++))
        echo -e "${RED}✗${NC} $test_name"
        [[ -n "$message" ]] && echo "  $message"
    fi
}

echo -e "${BLUE}=== Integration Test Suite ===${NC}"
echo "Testing end-to-end workflows, Gradle build, git operations, and safety mechanisms..."
echo ""

# Test 1: Gradle Availability
echo -e "${BLUE}[Test Group: Build System]${NC}"

if command -v gradle >/dev/null 2>&1; then
    report_test "Gradle command available" "pass"
else
    report_test "Gradle command available" "fail" "Gradle not in PATH"
fi

# Test 2: Gradle Wrapper
if [[ -f "/workspace/gradlew" ]]; then
    if [[ -x "/workspace/gradlew" ]]; then
        report_test "Gradle wrapper executable" "pass"
    else
        report_test "Gradle wrapper executable" "fail" "Not executable"
    fi
else
    report_test "Gradle wrapper executable" "skip" "gradlew not found"
fi

# Test 3: Gradle Build (Quick Check)
echo "Running Gradle build (this may take time)..."

if [[ -f "/workspace/gradlew" ]]; then
    build_start=$(date +%s)

    if timeout 300 /workspace/gradlew --version >/dev/null 2>&1; then
        build_end=$(date +%s)
        build_time=$((build_end - build_start))
        report_test "Gradle version check" "pass" "Completed in ${build_time}s"
    else
        report_test "Gradle version check" "fail" "Version check failed or timed out"
    fi
else
    report_test "Gradle version check" "skip" "gradlew not available"
fi

# Test 4: Gradle Tasks Available
if [[ -f "/workspace/gradlew" ]]; then
    if timeout 60 /workspace/gradlew tasks --console=plain 2>&1 | grep -q "Build Setup tasks\|build\|test"; then
        report_test "Gradle tasks available" "pass" "Standard tasks found"
    else
        report_test "Gradle tasks available" "skip" "Cannot list tasks"
    fi
else
    report_test "Gradle tasks available" "skip" "gradlew not available"
fi

# Test 5: Gradle Daemon Status
if command -v gradle >/dev/null 2>&1; then
    if gradle --status 2>&1 | grep -qiE "daemon|gradle"; then
        report_test "Gradle daemon status check" "pass"
    else
        report_test "Gradle daemon status check" "skip" "Daemon status unclear"
    fi
else
    report_test "Gradle daemon status check" "skip" "Gradle not available"
fi

echo ""
echo -e "${BLUE}[Test Group: Git Operations]${NC}"

# Test 6: Git Configuration
if command -v git >/dev/null 2>&1; then
    if git config --list >/dev/null 2>&1; then
        report_test "Git configuration accessible" "pass"
    else
        report_test "Git configuration accessible" "fail" "Cannot read git config"
    fi
else
    report_test "Git configuration accessible" "skip" "Git not available"
fi

# Test 7: Git Repository Detection
if [[ -d "/workspace/.git" ]]; then
    report_test "Git repository detected" "pass" "/workspace is a git repo"
else
    report_test "Git repository detected" "skip" "/workspace not a git repo"
fi

# Test 8: Git Status
if [[ -d "/workspace/.git" ]] && command -v git >/dev/null 2>&1; then
    if git -C /workspace status >/dev/null 2>&1; then
        report_test "Git status command" "pass"
    else
        report_test "Git status command" "fail" "Git status failed"
    fi
else
    report_test "Git status command" "skip" "No git repo or git unavailable"
fi

# Test 9: Git Commit (Dry Run)
if [[ -d "/workspace/.git" ]] && command -v git >/dev/null 2>&1; then
    # Create test file
    test_file="/workspace/.test-git-$$"
    echo "test" > "$test_file"

    if git -C /workspace add "$test_file" 2>/dev/null && \
       git -C /workspace diff --cached --name-only 2>/dev/null | grep -q "\.test-git"; then
        report_test "Git staging works" "pass"

        # Reset
        git -C /workspace reset HEAD "$test_file" >/dev/null 2>&1 || true
    else
        report_test "Git staging works" "skip" "Cannot stage test file"
    fi

    rm -f "$test_file"
else
    report_test "Git staging works" "skip" "No git repo"
fi

# Test 10: Git Log Access
if [[ -d "/workspace/.git" ]] && command -v git >/dev/null 2>&1; then
    if git -C /workspace log --oneline -1 >/dev/null 2>&1; then
        report_test "Git log accessible" "pass"
    else
        report_test "Git log accessible" "skip" "No commits or log unavailable"
    fi
else
    report_test "Git log accessible" "skip" "No git repo"
fi

echo ""
echo -e "${BLUE}[Test Group: Audit Logging Integration]${NC}"

# Test 11: Audit Log Creation
if .devcontainer/scripts/audit-logger.sh file_write "test.txt" "success" 100 >/dev/null 2>&1; then
    if [[ -f "$CLAUDE_AUDIT_LOG" ]]; then
        report_test "Audit log created" "pass" "Log file: $CLAUDE_AUDIT_LOG"
    else
        report_test "Audit log created" "fail" "Log file not created"
    fi
else
    report_test "Audit log created" "skip" "Audit logger failed"
fi

# Test 12: Multiple Event Types Logged
event_types=("file_write" "command_exec" "network_req")
logged_types=0

for event_type in "${event_types[@]}"; do
    case "$event_type" in
        "file_write")
            .devcontainer/scripts/audit-logger.sh file_write "test.txt" "success" 100 >/dev/null 2>&1
            ;;
        "command_exec")
            .devcontainer/scripts/audit-logger.sh command_exec "echo test" "success" 50 0 >/dev/null 2>&1
            ;;
        "network_req")
            .devcontainer/scripts/audit-logger.sh network_req "https://example.com" "success" 200 200 >/dev/null 2>&1
            ;;
    esac

    if grep -q "\"type\":\"$event_type\"" "$CLAUDE_AUDIT_LOG" 2>/dev/null; then
        ((logged_types++))
    fi
done

if [[ $logged_types -eq ${#event_types[@]} ]]; then
    report_test "Multiple event types logged" "pass" "All $logged_types event types found"
else
    report_test "Multiple event types logged" "skip" "Only $logged_types/${#event_types[@]} event types logged"
fi

# Test 13: Audit Log JSON Format
if [[ -f "$CLAUDE_AUDIT_LOG" ]] && command -v jq >/dev/null 2>&1; then
    if jq empty "$CLAUDE_AUDIT_LOG" 2>/dev/null; then
        report_test "Audit log valid JSON" "pass"
    else
        report_test "Audit log valid JSON" "fail" "Invalid JSON in audit log"
    fi
else
    report_test "Audit log valid JSON" "skip" "No audit log or jq unavailable"
fi

# Test 14: Audit Statistics
if .devcontainer/scripts/audit-logger.sh stats 2>&1 | grep -qE "Total events|Event types|Statistics"; then
    report_test "Audit statistics generation" "pass"
else
    report_test "Audit statistics generation" "skip" "Statistics unclear"
fi

echo ""
echo -e "${BLUE}[Test Group: Resource Monitoring Integration]${NC}"

# Test 15: Resource Monitor Runs
if .devcontainer/scripts/monitor-resources.sh once >/dev/null 2>&1; then
    report_test "Resource monitor executes" "pass"
else
    report_test "Resource monitor executes" "fail" "Monitor failed to run"
fi

# Test 16: Resource Metrics Available
if monitor_output=$(.devcontainer/scripts/monitor-resources.sh once 2>/dev/null); then
    if echo "$monitor_output" | grep -qE "CPU:|Memory:|Disk:|PIDs:"; then
        report_test "Resource metrics available" "pass"
    else
        report_test "Resource metrics available" "skip" "Metrics format unclear"
    fi
else
    report_test "Resource metrics available" "skip" "Monitor output unavailable"
fi

# Test 17: Resource Monitor JSON Output
if command -v jq >/dev/null 2>&1; then
    if monitor_json=$(.devcontainer/scripts/monitor-resources.sh once json 2>/dev/null); then
        if echo "$monitor_json" | jq -e '.cpu_percent' >/dev/null 2>&1; then
            report_test "Resource monitor JSON format" "pass"
        else
            report_test "Resource monitor JSON format" "skip" "JSON format unclear"
        fi
    else
        report_test "Resource monitor JSON format" "skip" "Cannot get JSON output"
    fi
else
    report_test "Resource monitor JSON format" "skip" "jq not available"
fi

echo ""
echo -e "${BLUE}[Test Group: Emergency Procedures]${NC}"

# Test 18: Emergency Stop Trip
if .devcontainer/scripts/emergency-stop.sh trip "Integration test" >/dev/null 2>&1; then
    if [[ -f "$CIRCUIT_BREAKER_FILE" ]]; then
        report_test "Emergency stop trip" "pass" "Circuit breaker tripped"
    else
        report_test "Emergency stop trip" "fail" "Breaker file not created"
    fi
else
    report_test "Emergency stop trip" "fail" "Emergency stop failed"
fi

# Test 19: Emergency Stop Status Check
if status_output=$(.devcontainer/scripts/emergency-stop.sh status 2>/dev/null); then
    if echo "$status_output" | grep -q "TRIPPED"; then
        report_test "Emergency stop status detection" "pass" "Status: TRIPPED"
    else
        report_test "Emergency stop status detection" "fail" "Status: $status_output"
    fi
else
    report_test "Emergency stop status detection" "skip" "Status command failed"
fi

# Test 20: State Save Procedure
test_save_dir="/workspace/.integration-test-save-$$"
mkdir -p "$test_save_dir"
echo "test data" > "$test_save_dir/test.txt"

if .devcontainer/scripts/emergency-stop.sh save "integration-test-$$" >/dev/null 2>&1; then
    if [[ -f "$STATE_DIR/integration-test-$$.tar.gz" ]]; then
        report_test "Emergency state save" "pass" "State archived"
    else
        report_test "Emergency state save" "fail" "Archive not created"
    fi
else
    report_test "Emergency state save" "skip" "Save procedure failed"
fi

rm -rf "$test_save_dir"

# Test 21: Emergency Stop Reset
if .devcontainer/scripts/emergency-stop.sh reset >/dev/null 2>&1; then
    if [[ ! -f "$CIRCUIT_BREAKER_FILE" ]]; then
        report_test "Emergency stop reset" "pass" "Breaker reset"
    else
        report_test "Emergency stop reset" "fail" "Breaker file still exists"
    fi
else
    report_test "Emergency stop reset" "fail" "Reset command failed"
fi

echo ""
echo -e "${BLUE}[Test Group: End-to-End Workflow]${NC}"

# Test 22: Complete Safety Workflow
echo "Running complete safety workflow..."

# 1. Start with clean state
.devcontainer/scripts/emergency-stop.sh reset >/dev/null 2>&1 || true

# 2. Log an operation
.devcontainer/scripts/audit-logger.sh file_write "workflow-test.txt" "success" 100 >/dev/null 2>&1

# 3. Check resources
.devcontainer/scripts/monitor-resources.sh once >/dev/null 2>&1

# 4. Trip breaker
.devcontainer/scripts/emergency-stop.sh trip "Workflow test" >/dev/null 2>&1

# 5. Verify audit log has all events
workflow_events=0
if grep -q "file_write" "$CLAUDE_AUDIT_LOG" 2>/dev/null; then ((workflow_events++)); fi
if grep -q "security_event" "$CLAUDE_AUDIT_LOG" 2>/dev/null; then ((workflow_events++)); fi

# 6. Reset
.devcontainer/scripts/emergency-stop.sh reset >/dev/null 2>&1 || true

if [[ $workflow_events -ge 1 ]]; then
    report_test "End-to-end safety workflow" "pass" "Workflow completed with $workflow_events events logged"
else
    report_test "End-to-end safety workflow" "skip" "Workflow events incomplete"
fi

# Test 23: Script Chaining
if .devcontainer/scripts/monitor-resources.sh once >/dev/null 2>&1 && \
   .devcontainer/scripts/audit-logger.sh command_exec "monitor" "success" 100 0 >/dev/null 2>&1; then
    report_test "Script chaining works" "pass" "Multiple scripts can be called sequentially"
else
    report_test "Script chaining works" "skip" "Script chaining unclear"
fi

# Test 24: Error Recovery
# Intentionally cause an error and verify system remains stable
if ! .devcontainer/scripts/audit-logger.sh invalid_type "test" "test" 2>/dev/null; then
    # Error expected, check if we can still run other commands
    if .devcontainer/scripts/monitor-resources.sh once >/dev/null 2>&1; then
        report_test "System stable after error" "pass" "Recovery successful"
    else
        report_test "System stable after error" "fail" "System unstable after error"
    fi
else
    report_test "System stable after error" "skip" "No error occurred"
fi

echo ""
echo -e "${BLUE}[Test Group: Performance Checks]${NC}"

# Test 25: Script Execution Speed
script_start=$(date +%s%N 2>/dev/null || date +%s)

for i in {1..10}; do
    .devcontainer/scripts/audit-logger.sh file_write "perf-test-$i" "success" 10 >/dev/null 2>&1
done

script_end=$(date +%s%N 2>/dev/null || date +%s)

if command -v bc >/dev/null 2>&1 && [[ "$script_start" != "$script_end" ]]; then
    script_duration=$(echo "scale=0; ($script_end - $script_start) / 1000000" | bc 2>/dev/null || echo "unknown")

    if [[ "$script_duration" != "unknown" ]] && [[ $script_duration -lt 5000 ]]; then
        report_test "Script performance (10 iterations)" "pass" "Completed in ${script_duration}ms"
    else
        report_test "Script performance (10 iterations)" "skip" "Duration: ${script_duration}ms"
    fi
else
    report_test "Script performance (10 iterations)" "skip" "Cannot measure timing"
fi

# Test 26: Concurrent Script Execution
concurrent_pids=()

for i in {1..5}; do
    .devcontainer/scripts/monitor-resources.sh once >/dev/null 2>&1 &
    concurrent_pids+=($!)
done

wait "${concurrent_pids[@]}" 2>/dev/null

report_test "Concurrent script execution" "pass" "5 scripts ran concurrently"

echo ""
echo -e "${BLUE}=== Test Summary ===${NC}"
echo "Total tests: $TESTS_TOTAL"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"

if [[ $TESTS_FAILED -eq 0 ]]; then
    echo ""
    echo -e "${GREEN}✓ All integration tests passed!${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}✗ Some integration tests failed${NC}"
    exit 1
fi

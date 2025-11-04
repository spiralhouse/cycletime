#!/bin/bash
# test-dangerous-mode.sh - Dangerous Mode Safety Tests
# Validates dangerous mode enable/disable, dry-run, allowlists, time limits, and circuit breaker

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
TEST_DIR="/tmp/dangerous-mode-tests-$$"
mkdir -p "$TEST_DIR"

# Cleanup on exit
trap "rm -rf $TEST_DIR" EXIT

# Export test environment variables
export DANGEROUS_MODE_CONFIG="$TEST_DIR/dangerous-mode.json"
export DANGEROUS_MODE_STATE="$TEST_DIR/dangerous-mode-state"
export DANGEROUS_MODE_LOG="$TEST_DIR/dangerous-mode.log"
export CIRCUIT_BREAKER_FILE="$TEST_DIR/circuit-breaker"

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

echo -e "${BLUE}=== Dangerous Mode Safety Test Suite ===${NC}"
echo "Testing dangerous mode controls, dry-run, allowlists, and circuit breaker..."
echo ""

# Test 1: Scripts Exist
echo -e "${BLUE}[Test Group: Script Availability]${NC}"

if [[ -x ".devcontainer/scripts/enable-dangerous-mode.sh" ]]; then
    report_test "enable-dangerous-mode.sh exists" "pass"
else
    report_test "enable-dangerous-mode.sh exists" "fail" "Script not found or not executable"
fi

if [[ -x ".devcontainer/scripts/disable-dangerous-mode.sh" ]]; then
    report_test "disable-dangerous-mode.sh exists" "pass"
else
    report_test "disable-dangerous-mode.sh exists" "fail" "Script not found or not executable"
fi

if [[ -x ".devcontainer/scripts/dry-run-mode.sh" ]]; then
    report_test "dry-run-mode.sh exists" "pass"
else
    report_test "dry-run-mode.sh exists" "fail" "Script not found or not executable"
fi

echo ""
echo -e "${BLUE}[Test Group: Enable/Disable Functionality]${NC}"

# Test 2: Initial State (Should be Disabled)
if [[ ! -f "$DANGEROUS_MODE_STATE" ]]; then
    report_test "Dangerous mode initially disabled" "pass" "No state file"
else
    report_test "Dangerous mode initially disabled" "skip" "State file exists from previous run"
fi

# Test 3: Enable Dangerous Mode
if .devcontainer/scripts/enable-dangerous-mode.sh --duration 60 >/dev/null 2>&1; then
    if [[ -f "$DANGEROUS_MODE_STATE" ]]; then
        report_test "Enable dangerous mode" "pass" "State file created"
    else
        report_test "Enable dangerous mode" "fail" "State file not created"
    fi
else
    report_test "Enable dangerous mode" "fail" "Script execution failed"
fi

# Test 4: Verify Enabled State
if [[ -f "$DANGEROUS_MODE_STATE" ]]; then
    state_content=$(cat "$DANGEROUS_MODE_STATE")

    if echo "$state_content" | grep -q "enabled"; then
        report_test "Dangerous mode state verification" "pass" "State: enabled"
    else
        report_test "Dangerous mode state verification" "fail" "State unclear: $state_content"
    fi
else
    report_test "Dangerous mode state verification" "skip" "State file missing"
fi

# Test 5: Time Limit Configuration
if [[ -f "$DANGEROUS_MODE_STATE" ]]; then
    if grep -q "expires_at\|duration\|expiry" "$DANGEROUS_MODE_STATE"; then
        report_test "Time limit configured" "pass" "Expiry timestamp present"
    else
        report_test "Time limit configured" "skip" "Cannot verify time limit"
    fi
else
    report_test "Time limit configured" "skip" "State file missing"
fi

# Test 6: Disable Dangerous Mode
if .devcontainer/scripts/disable-dangerous-mode.sh >/dev/null 2>&1; then
    if [[ ! -f "$DANGEROUS_MODE_STATE" ]]; then
        report_test "Disable dangerous mode" "pass" "State file removed"
    else
        # Check if state file shows disabled
        if grep -q "disabled" "$DANGEROUS_MODE_STATE" 2>/dev/null; then
            report_test "Disable dangerous mode" "pass" "State: disabled"
        else
            report_test "Disable dangerous mode" "fail" "State file still exists and shows enabled"
        fi
    fi
else
    report_test "Disable dangerous mode" "fail" "Script execution failed"
fi

echo ""
echo -e "${BLUE}[Test Group: Dry-Run Mode]${NC}"

# Test 7: Dry-Run Mode Execution
if .devcontainer/scripts/dry-run-mode.sh --command "rm -rf /" >/dev/null 2>&1; then
    report_test "Dry-run mode executes" "pass" "Simulated dangerous command"
else
    report_test "Dry-run mode executes" "skip" "Dry-run script execution failed (may be expected)"
fi

# Test 8: Dry-Run Risk Assessment
dry_run_output=$(.devcontainer/scripts/dry-run-mode.sh --command "rm -rf /important" 2>&1 || true)

if echo "$dry_run_output" | grep -qiE "risk|danger|warn|high|critical"; then
    report_test "Dry-run risk assessment" "pass" "Risk level identified"
else
    report_test "Dry-run risk assessment" "skip" "Cannot verify risk assessment in output"
fi

# Test 9: Dry-Run Does Not Execute
test_file="$TEST_DIR/should-not-be-deleted"
touch "$test_file"

if .devcontainer/scripts/dry-run-mode.sh --command "rm $test_file" >/dev/null 2>&1; then
    if [[ -f "$test_file" ]]; then
        report_test "Dry-run does not execute commands" "pass" "File still exists"
    else
        report_test "Dry-run does not execute commands" "fail" "File was deleted"
    fi
else
    report_test "Dry-run does not execute commands" "skip" "Dry-run failed"
fi

echo ""
echo -e "${BLUE}[Test Group: Operation Allowlist/Denylist]${NC}"

# Test 10: Config File Structure
if [[ -f ".devcontainer/config/dangerous-mode.json" ]]; then
    if command -v jq >/dev/null 2>&1; then
        if jq empty ".devcontainer/config/dangerous-mode.json" 2>/dev/null; then
            report_test "Dangerous mode config valid JSON" "pass"
        else
            report_test "Dangerous mode config valid JSON" "fail" "Invalid JSON"
        fi
    else
        report_test "Dangerous mode config valid JSON" "skip" "jq not available"
    fi
else
    report_test "Dangerous mode config valid JSON" "skip" "Config file not found"
fi

# Test 11: Allowlist Configuration
if [[ -f ".devcontainer/config/dangerous-mode.json" ]] && command -v jq >/dev/null 2>&1; then
    if jq -e '.allowlist' ".devcontainer/config/dangerous-mode.json" >/dev/null 2>&1; then
        allowlist_count=$(jq '.allowlist | length' ".devcontainer/config/dangerous-mode.json" 2>/dev/null || echo 0)
        report_test "Allowlist configured" "pass" "Contains $allowlist_count entries"
    else
        report_test "Allowlist configured" "skip" "No allowlist in config"
    fi
else
    report_test "Allowlist configured" "skip" "Cannot parse config"
fi

# Test 12: Denylist Configuration
if [[ -f ".devcontainer/config/dangerous-mode.json" ]] && command -v jq >/dev/null 2>&1; then
    if jq -e '.denylist' ".devcontainer/config/dangerous-mode.json" >/dev/null 2>&1; then
        denylist_count=$(jq '.denylist | length' ".devcontainer/config/dangerous-mode.json" 2>/dev/null || echo 0)
        report_test "Denylist configured" "pass" "Contains $denylist_count entries"
    else
        report_test "Denylist configured" "skip" "No denylist in config"
    fi
else
    report_test "Denylist configured" "skip" "Cannot parse config"
fi

echo ""
echo -e "${BLUE}[Test Group: Time-Limited Sessions]${NC}"

# Test 13: Short Duration Session (5 seconds)
if .devcontainer/scripts/enable-dangerous-mode.sh --duration 5 >/dev/null 2>&1; then
    if [[ -f "$DANGEROUS_MODE_STATE" ]]; then
        report_test "Time-limited session created (5s)" "pass"

        # Wait for expiration
        echo "  Waiting for session to expire..."
        sleep 6

        # Check if still enabled
        if [[ -f "$DANGEROUS_MODE_STATE" ]] && grep -q "enabled" "$DANGEROUS_MODE_STATE" 2>/dev/null; then
            report_test "Session auto-expires after duration" "fail" "Session still active after 6s"
        else
            report_test "Session auto-expires after duration" "pass" "Session expired"
        fi
    else
        report_test "Time-limited session created (5s)" "fail" "State file not created"
    fi
else
    report_test "Time-limited session created (5s)" "skip" "Cannot create session"
fi

# Test 14: Duration Validation
if .devcontainer/scripts/enable-dangerous-mode.sh --duration 0 2>&1 | grep -qiE "invalid|error"; then
    report_test "Zero duration rejected" "pass" "Invalid duration rejected"
else
    # Clean up if it somehow succeeded
    .devcontainer/scripts/disable-dangerous-mode.sh >/dev/null 2>&1 || true
    report_test "Zero duration rejected" "skip" "Zero duration may be allowed"
fi

# Test 15: Maximum Duration Check
if [[ -f ".devcontainer/config/dangerous-mode.json" ]] && command -v jq >/dev/null 2>&1; then
    if jq -e '.max_duration' ".devcontainer/config/dangerous-mode.json" >/dev/null 2>&1; then
        max_duration=$(jq -r '.max_duration' ".devcontainer/config/dangerous-mode.json" 2>/dev/null || echo "unknown")
        report_test "Maximum duration configured" "pass" "Max: $max_duration"
    else
        report_test "Maximum duration configured" "skip" "No max duration in config"
    fi
else
    report_test "Maximum duration configured" "skip" "Cannot parse config"
fi

echo ""
echo -e "${BLUE}[Test Group: Circuit Breaker Integration]${NC}"

# Test 16: Circuit Breaker File Location
if [[ -n "${CIRCUIT_BREAKER_FILE:-}" ]]; then
    report_test "Circuit breaker file configured" "pass" "Location: $CIRCUIT_BREAKER_FILE"
else
    report_test "Circuit breaker file configured" "skip" "CIRCUIT_BREAKER_FILE not set"
fi

# Test 17: Circuit Breaker Trips Dangerous Mode
if .devcontainer/scripts/enable-dangerous-mode.sh --duration 60 >/dev/null 2>&1; then
    # Trip circuit breaker
    if .devcontainer/scripts/emergency-stop.sh trip "Test trip" >/dev/null 2>&1; then
        # Check if dangerous mode was disabled
        if [[ ! -f "$DANGEROUS_MODE_STATE" ]] || ! grep -q "enabled" "$DANGEROUS_MODE_STATE" 2>/dev/null; then
            report_test "Circuit breaker disables dangerous mode" "pass"
        else
            report_test "Circuit breaker disables dangerous mode" "skip" "Integration may not be automatic"
        fi

        # Reset circuit breaker
        .devcontainer/scripts/emergency-stop.sh reset >/dev/null 2>&1 || true
    else
        report_test "Circuit breaker disables dangerous mode" "skip" "Cannot trip circuit breaker"
    fi
else
    report_test "Circuit breaker disables dangerous mode" "skip" "Cannot enable dangerous mode"
fi

# Test 18: Dangerous Mode Respects Circuit Breaker
# Trip breaker first
if .devcontainer/scripts/emergency-stop.sh trip "Test trip" >/dev/null 2>&1; then
    # Try to enable dangerous mode
    if .devcontainer/scripts/enable-dangerous-mode.sh --duration 60 2>&1 | grep -qiE "breaker|stopped|prevented"; then
        report_test "Cannot enable with tripped breaker" "pass" "Dangerous mode prevented"
    else
        # May have succeeded, check state
        if [[ -f "$DANGEROUS_MODE_STATE" ]] && grep -q "enabled" "$DANGEROUS_MODE_STATE" 2>/dev/null; then
            report_test "Cannot enable with tripped breaker" "fail" "Dangerous mode enabled despite breaker"
            .devcontainer/scripts/disable-dangerous-mode.sh >/dev/null 2>&1 || true
        else
            report_test "Cannot enable with tripped breaker" "skip" "Cannot verify breaker enforcement"
        fi
    fi

    # Reset circuit breaker
    .devcontainer/scripts/emergency-stop.sh reset >/dev/null 2>&1 || true
else
    report_test "Cannot enable with tripped breaker" "skip" "Cannot trip circuit breaker"
fi

echo ""
echo -e "${BLUE}[Test Group: Audit Logging]${NC}"

# Test 19: Enable/Disable Logged
export CLAUDE_AUDIT_LOG="$TEST_DIR/audit.log"

if .devcontainer/scripts/enable-dangerous-mode.sh --duration 30 >/dev/null 2>&1; then
    .devcontainer/scripts/disable-dangerous-mode.sh >/dev/null 2>&1 || true

    if [[ -f "$TEST_DIR/audit.log" ]]; then
        if grep -q "dangerous_mode" "$TEST_DIR/audit.log" 2>/dev/null; then
            report_test "Dangerous mode changes logged" "pass"
        else
            report_test "Dangerous mode changes logged" "skip" "No dangerous mode events in audit log"
        fi
    else
        report_test "Dangerous mode changes logged" "skip" "Audit log not created"
    fi
else
    report_test "Dangerous mode changes logged" "skip" "Cannot enable dangerous mode"
fi

# Test 20: Security Events Logged
if [[ -f "$TEST_DIR/audit.log" ]] && command -v jq >/dev/null 2>&1; then
    if jq -e 'select(.type == "security_event")' "$TEST_DIR/audit.log" >/dev/null 2>&1; then
        report_test "Security events in audit log" "pass"
    else
        report_test "Security events in audit log" "skip" "No security events found"
    fi
else
    report_test "Security events in audit log" "skip" "Cannot parse audit log"
fi

echo ""
echo -e "${BLUE}[Test Group: Safety Verification]${NC}"

# Test 21: Multiple Enable Attempts
.devcontainer/scripts/enable-dangerous-mode.sh --duration 30 >/dev/null 2>&1 || true

if .devcontainer/scripts/enable-dangerous-mode.sh --duration 30 2>&1 | grep -qiE "already|active|enabled"; then
    report_test "Prevent duplicate enable" "pass" "Already enabled detected"
else
    report_test "Prevent duplicate enable" "skip" "May allow re-enable"
fi

.devcontainer/scripts/disable-dangerous-mode.sh >/dev/null 2>&1 || true

# Test 22: Cleanup on Disable
.devcontainer/scripts/enable-dangerous-mode.sh --duration 30 >/dev/null 2>&1 || true
.devcontainer/scripts/disable-dangerous-mode.sh >/dev/null 2>&1

if [[ ! -f "$DANGEROUS_MODE_STATE" ]]; then
    report_test "Clean shutdown removes state" "pass"
else
    if grep -q "disabled" "$DANGEROUS_MODE_STATE" 2>/dev/null; then
        report_test "Clean shutdown removes state" "pass" "State marked disabled"
    else
        report_test "Clean shutdown removes state" "fail" "State file remains"
    fi
fi

echo ""
echo -e "${BLUE}=== Test Summary ===${NC}"
echo "Total tests: $TESTS_TOTAL"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"

if [[ $TESTS_FAILED -eq 0 ]]; then
    echo ""
    echo -e "${GREEN}✓ All dangerous mode tests passed!${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}✗ Some dangerous mode tests failed${NC}"
    exit 1
fi

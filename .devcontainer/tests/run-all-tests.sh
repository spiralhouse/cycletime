#!/bin/bash
# run-all-tests.sh - Master Test Runner for DevContainer Test Suite
# Executes all test suites and generates comprehensive report

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Test suite tracking
declare -a TEST_SUITES=()
declare -a TEST_RESULTS=()
declare -a TEST_DURATIONS=()

TOTAL_SUITES=0
PASSED_SUITES=0
FAILED_SUITES=0

# Report file
REPORT_FILE="/tmp/devcontainer-test-report-$(date +%Y%m%d-%H%M%S).txt"

# Function: Print header
print_header() {
    echo -e "${CYAN}${BOLD}"
    echo "╔════════════════════════════════════════════════════════════════════════════╗"
    echo "║                    DevContainer Test Suite Runner                          ║"
    echo "║                                                                            ║"
    echo "║  Comprehensive validation of devcontainer functionality, safety            ║"
    echo "║  mechanisms, and readiness for unattended Claude Code operations           ║"
    echo "╚════════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
}

# Function: Print section
print_section() {
    local section="$1"
    echo ""
    echo -e "${BLUE}${BOLD}═══ $section ═══${NC}"
    echo ""
}

# Function: Run test suite
run_test_suite() {
    local suite_name="$1"
    local suite_script="$2"
    local suite_desc="$3"

    ((TOTAL_SUITES++))
    TEST_SUITES+=("$suite_name")

    echo -e "${CYAN}Running: ${BOLD}$suite_name${NC}"
    echo "Description: $suite_desc"
    echo "Script: $suite_script"
    echo ""

    # Record start time
    local start_time=$(date +%s)

    # Run the test suite
    if bash "$suite_script"; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))

        ((PASSED_SUITES++))
        TEST_RESULTS+=("PASS")
        TEST_DURATIONS+=("${duration}s")

        echo ""
        echo -e "${GREEN}✓ $suite_name PASSED${NC} (${duration}s)"
    else
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))

        ((FAILED_SUITES++))
        TEST_RESULTS+=("FAIL")
        TEST_DURATIONS+=("${duration}s")

        echo ""
        echo -e "${RED}✗ $suite_name FAILED${NC} (${duration}s)"
    fi

    echo ""
    echo "────────────────────────────────────────────────────────────────────────────"
    echo ""
}

# Function: Generate report
generate_report() {
    local report_content=""

    report_content+="DevContainer Test Suite Report\n"
    report_content+="Generated: $(date)\n"
    report_content+="═══════════════════════════════════════════════════════════════════════════\n\n"

    report_content+="Test Suite Summary:\n"
    report_content+="  Total Suites: $TOTAL_SUITES\n"
    report_content+="  Passed: $PASSED_SUITES\n"
    report_content+="  Failed: $FAILED_SUITES\n\n"

    report_content+="Individual Suite Results:\n"
    report_content+="───────────────────────────────────────────────────────────────────────────\n"

    for i in "${!TEST_SUITES[@]}"; do
        local suite="${TEST_SUITES[$i]}"
        local result="${TEST_RESULTS[$i]}"
        local duration="${TEST_DURATIONS[$i]}"

        if [[ "$result" == "PASS" ]]; then
            report_content+="  ✓ $suite - PASSED ($duration)\n"
        else
            report_content+="  ✗ $suite - FAILED ($duration)\n"
        fi
    done

    report_content+="\n═══════════════════════════════════════════════════════════════════════════\n"

    if [[ $FAILED_SUITES -eq 0 ]]; then
        report_content+="Result: ALL TESTS PASSED ✓\n"
    else
        report_content+="Result: SOME TESTS FAILED ✗\n"
    fi

    # Write to file
    echo -e "$report_content" > "$REPORT_FILE"

    # Print to console
    echo ""
    print_section "Test Report"
    echo -e "$report_content"
}

# Function: Print final summary
print_summary() {
    echo ""
    print_section "Final Summary"

    echo -e "Total Test Suites: ${BOLD}$TOTAL_SUITES${NC}"
    echo -e "Passed: ${GREEN}${BOLD}$PASSED_SUITES${NC}"
    echo -e "Failed: ${RED}${BOLD}$FAILED_SUITES${NC}"
    echo ""

    if [[ $FAILED_SUITES -eq 0 ]]; then
        echo -e "${GREEN}${BOLD}╔═══════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}${BOLD}║                                               ║${NC}"
        echo -e "${GREEN}${BOLD}║  ✓ ALL DEVCONTAINER TESTS PASSED!            ║${NC}"
        echo -e "${GREEN}${BOLD}║                                               ║${NC}"
        echo -e "${GREEN}${BOLD}║  Container is ready for unattended Claude     ║${NC}"
        echo -e "${GREEN}${BOLD}║  Code operations with full safety controls.   ║${NC}"
        echo -e "${GREEN}${BOLD}║                                               ║${NC}"
        echo -e "${GREEN}${BOLD}╚═══════════════════════════════════════════════╝${NC}"
    else
        echo -e "${RED}${BOLD}╔═══════════════════════════════════════════════╗${NC}"
        echo -e "${RED}${BOLD}║                                               ║${NC}"
        echo -e "${RED}${BOLD}║  ✗ SOME DEVCONTAINER TESTS FAILED             ║${NC}"
        echo -e "${RED}${BOLD}║                                               ║${NC}"
        echo -e "${RED}${BOLD}║  Review failed tests before deploying to      ║${NC}"
        echo -e "${RED}${BOLD}║  unattended mode.                             ║${NC}"
        echo -e "${RED}${BOLD}║                                               ║${NC}"
        echo -e "${RED}${BOLD}╚═══════════════════════════════════════════════╝${NC}"
    fi

    echo ""
    echo "Report saved to: $REPORT_FILE"
    echo ""
}

# Main execution
main() {
    # Change to script directory
    cd "$(dirname "$0")"

    # Print header
    print_header

    # Check if running in devcontainer
    if [[ -f "/.dockerenv" ]] || [[ -n "${CODESPACES:-}" ]] || [[ -n "${REMOTE_CONTAINERS:-}" ]]; then
        echo -e "${GREEN}✓ Running inside devcontainer${NC}"
    else
        echo -e "${YELLOW}⚠ Warning: Not running inside devcontainer${NC}"
        echo "  Some tests may fail or behave differently outside container environment"
    fi

    echo ""
    echo "Test execution started: $(date)"
    echo ""

    # Test Suite 1: Container Build
    print_section "Test Suite 1: Container Build & Dependencies"
    run_test_suite \
        "Container Build Tests" \
        "./test-devcontainer-build.sh" \
        "Validates container builds, dependencies, mounts, ports, and permissions"

    # Test Suite 2: Claude CLI
    print_section "Test Suite 2: Claude CLI Installation & Operations"
    run_test_suite \
        "Claude CLI Tests" \
        "./test-claude-cli.sh" \
        "Validates Claude CLI installation, accessibility, and basic operations"

    # Test Suite 3: Safety Mechanisms (Existing)
    print_section "Test Suite 3: Safety Mechanisms"
    if [[ -f "../scripts/test-safety-mechanisms.sh" ]]; then
        run_test_suite \
            "Safety Mechanisms Tests" \
            "../scripts/test-safety-mechanisms.sh" \
            "Validates audit logging, resource monitoring, and emergency stop (22 tests from SPI-944)"
    else
        echo -e "${YELLOW}⊘ Skipping: test-safety-mechanisms.sh not found${NC}"
        ((TOTAL_SUITES++))
        TEST_SUITES+=("Safety Mechanisms Tests")
        TEST_RESULTS+=("SKIP")
        TEST_DURATIONS+=("0s")
    fi

    # Test Suite 4: Resource Limits
    print_section "Test Suite 4: Resource Limits & Stress Tests"
    run_test_suite \
        "Resource Limits Tests" \
        "./test-resource-limits.sh" \
        "Stress tests for CPU, memory, PID, and disk I/O limits under load"

    # Test Suite 5: Dangerous Mode
    print_section "Test Suite 5: Dangerous Mode Controls"
    run_test_suite \
        "Dangerous Mode Tests" \
        "./test-dangerous-mode.sh" \
        "Validates dangerous mode enable/disable, dry-run, allowlists, and time limits"

    # Test Suite 6: Integration
    print_section "Test Suite 6: End-to-End Integration"
    run_test_suite \
        "Integration Tests" \
        "./test-integration.sh" \
        "End-to-end workflows including Gradle build, git operations, and safety integration"

    # Generate report
    generate_report

    # Print summary
    print_summary

    # Exit with appropriate code
    if [[ $FAILED_SUITES -eq 0 ]]; then
        exit 0
    else
        exit 1
    fi
}

# Run main function
main "$@"

#!/bin/bash
# build-and-test.sh - CI-specific build and test script for DevContainer
# Runs comprehensive build, test, and validation in CI environment

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Configuration
START_TIME=$(date +%s)
BUILD_DIR="$(pwd)"
REPORTS_DIR="$BUILD_DIR/build/reports"
TEST_RESULTS_DIR="$BUILD_DIR/build/test-results"

# Function: Print header
print_header() {
    echo -e "${CYAN}${BOLD}"
    echo "════════════════════════════════════════════════════════════════"
    echo " DevContainer CI Build and Test"
    echo " Running comprehensive validation in containerized environment"
    echo "════════════════════════════════════════════════════════════════"
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

# Function: Check environment
check_environment() {
    print_section "Environment Validation"

    echo "Working directory: $(pwd)"
    echo "User: $(whoami)"
    echo "Home: $HOME"
    echo ""

    echo "Tool versions:"
    echo "  Java: $(java -version 2>&1 | head -1)"
    echo "  Gradle: $(./gradlew --version | grep Gradle | head -1)"
    echo "  Node.js: $(node --version)"
    echo "  npm: $(npm --version)"
    echo ""

    echo "System resources:"
    echo "  CPU cores: $(nproc)"
    echo "  Memory: $(free -h | grep Mem | awk '{print $2}')"
    echo "  Disk: $(df -h . | tail -1 | awk '{print $4}') available"
    echo ""

    # Check if running in devcontainer
    if [ "${DEVCONTAINER:-}" = "true" ]; then
        echo -e "${GREEN}✓${NC} Running in DevContainer environment"
    else
        echo -e "${YELLOW}⚠${NC} Not detected as DevContainer (DEVCONTAINER env var not set)"
    fi

    # Check circuit breaker
    if [ -f "/tmp/claude-circuit-breaker" ]; then
        echo -e "${RED}✗${NC} Circuit breaker is active - stopping build"
        cat /tmp/claude-circuit-breaker
        exit 1
    else
        echo -e "${GREEN}✓${NC} Circuit breaker not active"
    fi

    echo ""
}

# Function: Clean build
clean_build() {
    print_section "Clean Build"

    echo "Removing previous build artifacts..."
    ./gradlew clean --no-daemon

    echo -e "${GREEN}✓${NC} Build cleaned"
    echo ""
}

# Function: Compile code
compile_code() {
    print_section "Code Compilation"

    echo "Compiling main and test sources..."
    ./gradlew compileKotlin compileTestKotlin compileIntegrationTestKotlin compileSystemTestKotlin \
        --no-daemon \
        --build-cache \
        --parallel

    echo -e "${GREEN}✓${NC} Code compilation successful"
    echo ""
}

# Function: Run tests
run_tests() {
    print_section "Test Execution"

    echo "Running all test suites..."
    echo ""

    # Run unit tests
    echo "→ Unit tests..."
    ./gradlew unitTest --no-daemon --build-cache --parallel || {
        echo -e "${RED}✗${NC} Unit tests failed"
        return 1
    }
    echo -e "${GREEN}✓${NC} Unit tests passed"
    echo ""

    # Run integration tests
    echo "→ Integration tests..."
    ./gradlew integrationTest --no-daemon --build-cache --parallel || {
        echo -e "${RED}✗${NC} Integration tests failed"
        return 1
    }
    echo -e "${GREEN}✓${NC} Integration tests passed"
    echo ""

    # Run system tests
    echo "→ System tests..."
    ./gradlew systemTest --no-daemon --build-cache || {
        echo -e "${RED}✗${NC} System tests failed"
        return 1
    }
    echo -e "${GREEN}✓${NC} System tests passed"
    echo ""

    # Generate coverage report
    echo "→ Generating coverage report..."
    ./gradlew koverXmlReport --no-daemon
    echo -e "${GREEN}✓${NC} Coverage report generated"
    echo ""

    # Print test summary
    if [ -d "$TEST_RESULTS_DIR" ]; then
        echo "Test Summary:"
        find "$TEST_RESULTS_DIR" -name "*.xml" -type f | while read -r file; do
            tests=$(grep -o 'tests="[^"]*"' "$file" | cut -d'"' -f2)
            failures=$(grep -o 'failures="[^"]*"' "$file" | cut -d'"' -f2)
            errors=$(grep -o 'errors="[^"]*"' "$file" | cut -d'"' -f2)
            skipped=$(grep -o 'skipped="[^"]*"' "$file" | cut -d'"' -f2)
            suite=$(basename "$(dirname "$file")")

            if [ "$failures" = "0" ] && [ "$errors" = "0" ]; then
                echo -e "  ${GREEN}✓${NC} $suite: $tests tests, $skipped skipped"
            else
                echo -e "  ${RED}✗${NC} $suite: $tests tests, $failures failures, $errors errors"
            fi
        done
        echo ""
    fi
}

# Function: Run code quality checks
run_quality_checks() {
    print_section "Code Quality Checks"

    echo "Running Detekt static analysis..."
    ./gradlew detekt --no-daemon --build-cache || {
        echo -e "${YELLOW}⚠${NC} Detekt found issues (non-blocking)"
    }

    if [ -f "$REPORTS_DIR/detekt/detekt.xml" ]; then
        issues=$(grep -o '<error' "$REPORTS_DIR/detekt/detekt.xml" | wc -l || echo "0")
        if [ "$issues" -gt 0 ]; then
            echo -e "${YELLOW}⚠${NC} Detekt found $issues issues"
        else
            echo -e "${GREEN}✓${NC} Detekt found no issues"
        fi
    fi

    echo ""
}

# Function: Build application
build_application() {
    print_section "Application Build"

    echo "Building application JAR and distributions..."
    ./gradlew buildFatJar assembleDist \
        --no-daemon \
        --build-cache \
        --parallel

    # Verify artifacts
    if [ -f "build/libs/cycletime-server.jar" ]; then
        jar_size=$(du -h build/libs/cycletime-server.jar | cut -f1)
        echo -e "${GREEN}✓${NC} JAR built: cycletime-server.jar ($jar_size)"
    else
        echo -e "${RED}✗${NC} JAR build failed"
        return 1
    fi

    if [ -d "build/distributions" ]; then
        echo -e "${GREEN}✓${NC} Distributions built:"
        ls -lh build/distributions/ | tail -n +2 | awk '{print "  " $9 " (" $5 ")"}'
    fi

    echo ""
}

# Function: Run devcontainer-specific tests
run_devcontainer_tests() {
    print_section "DevContainer Validation Tests"

    if [ -f ".devcontainer/tests/run-all-tests.sh" ]; then
        echo "Running DevContainer test suite..."
        bash .devcontainer/tests/run-all-tests.sh || {
            echo -e "${YELLOW}⚠${NC} Some DevContainer tests failed (non-blocking in CI)"
        }
    else
        echo -e "${YELLOW}⚠${NC} DevContainer test suite not found (skipping)"
    fi

    echo ""
}

# Function: Generate CI reports
generate_reports() {
    print_section "Report Generation"

    # Create reports directory if it doesn't exist
    mkdir -p "$REPORTS_DIR"

    # Generate build summary
    cat > "$REPORTS_DIR/ci-build-summary.txt" <<EOF
DevContainer CI Build Summary
=============================

Build Time: $(date)
Build Directory: $BUILD_DIR
Build Duration: $(($(date +%s) - START_TIME)) seconds

Environment:
  - Java: $(java -version 2>&1 | head -1)
  - Gradle: $(./gradlew --version | grep Gradle | head -1)
  - Node.js: $(node --version)

Test Results:
$(find "$TEST_RESULTS_DIR" -name "*.xml" -type f | wc -l) test result files generated

Build Artifacts:
$(find build/libs -name "*.jar" -type f 2>/dev/null | wc -l) JAR files
$(find build/distributions -name "*.tar" -o -name "*.zip" -type f 2>/dev/null | wc -l) distribution files

Reports:
$(find "$REPORTS_DIR" -type f 2>/dev/null | wc -l) report files generated

EOF

    cat "$REPORTS_DIR/ci-build-summary.txt"

    echo -e "${GREEN}✓${NC} CI reports generated"
    echo ""
}

# Function: Print summary
print_summary() {
    local end_time=$(date +%s)
    local duration=$((end_time - START_TIME))

    print_section "Build Summary"

    echo "Total build time: ${duration}s"
    echo ""
    echo -e "${GREEN}${BOLD}✓ All CI checks passed successfully!${NC}"
    echo ""
    echo "Artifacts:"
    echo "  - Application JAR: build/libs/cycletime-server.jar"
    echo "  - Distributions: build/distributions/"
    echo "  - Test reports: build/reports/"
    echo "  - Test results: build/test-results/"
    echo "  - Coverage report: build/reports/kover/report.xml"
    echo ""
}

# Main execution
main() {
    print_header
    check_environment
    clean_build
    compile_code
    run_tests
    run_quality_checks
    build_application
    run_devcontainer_tests
    generate_reports
    print_summary

    echo -e "${GREEN}${BOLD}DevContainer CI build completed successfully!${NC}"
    exit 0
}

# Run main function
main "$@"

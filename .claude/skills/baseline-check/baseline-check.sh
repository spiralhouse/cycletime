#!/usr/bin/env bash
#
# baseline-check.sh
#
# Executes project quality checks (detekt, Gradle tests) and outputs results in
# standardized JSON format. Supports capture, compare, and autonomous modes for
# baseline regression detection.
#
# Usage:
#   baseline-check.sh [--capture] [--issue ISSUE_ID]     # Capture baseline (default)
#   baseline-check.sh --compare [BASELINE_FILE]          # Compare against baseline
#   baseline-check.sh --auto [--issue ISSUE_ID]          # Autonomous (capture + compare if available)
#
# Exit codes:
#   0 - Success (all checks passed or none available)
#   1 - Check failures or regressions detected
#   2 - Script error (not in git repo, invalid arguments, etc.)
#

set -o pipefail

# --- Global variables ---
MODE="capture"           # Default mode: capture, compare, auto
ISSUE_ID=""              # Optional issue ID for naming
BASELINE_FILE=""         # Baseline file to compare against
TIMEOUT=300              # 5 minute timeout for test execution

# --- Color codes for output ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# --- Helper functions ---

log_info() {
  echo -e "${BLUE}[INFO]${NC} $*" >&2
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $*" >&2
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $*" >&2
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $*" >&2
}

# Check if jq is available
has_jq() {
  command -v jq >/dev/null 2>&1
}

# Escape string for JSON (when jq not available)
json_escape() {
  local string="$1"
  # Escape backslashes, quotes, and control characters
  printf '%s' "$string" | sed 's/\\/\\\\/g; s/"/\\"/g; s/	/\\t/g' | sed ':a;N;$!ba;s/\n/\\n/g'
}

# Parse command-line arguments
parse_arguments() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --capture)
        MODE="capture"
        shift
        ;;
      --compare)
        MODE="compare"
        if [[ -n "$2" && "$2" != --* ]]; then
          BASELINE_FILE="$2"
          shift
        fi
        shift
        ;;
      --auto)
        MODE="auto"
        shift
        ;;
      --issue)
        if [[ -z "$2" || "$2" == --* ]]; then
          log_error "Missing argument for --issue"
          exit 2
        fi
        ISSUE_ID="$2"
        shift 2
        ;;
      --timeout)
        if [[ -z "$2" || "$2" == --* ]]; then
          log_error "Missing argument for --timeout"
          exit 2
        fi
        TIMEOUT="$2"
        shift 2
        ;;
      --help|-h)
        cat <<EOF
Usage: baseline-check.sh [OPTIONS]

Modes:
  --capture           Capture baseline metrics (default)
  --compare [FILE]    Compare against baseline (auto-detect latest if FILE not provided)
  --auto              Autonomous mode: capture + optional compare

Options:
  --issue ISSUE_ID    Issue ID for file naming (e.g., SPI-866)
  --timeout SECONDS   Timeout for test execution (default: 300)
  --help, -h          Show this help message

Examples:
  baseline-check.sh --capture --issue SPI-866
  baseline-check.sh --compare
  baseline-check.sh --compare .claude/baseline/main-20241120-100000.json
  baseline-check.sh --auto --issue SPI-866
EOF
        exit 0
        ;;
      *)
        log_error "Unknown option: $1"
        echo "Use --help for usage information"
        exit 2
        ;;
    esac
  done
}

# --- Git information extraction ---

get_git_branch() {
  git rev-parse --abbrev-ref HEAD 2>/dev/null
}

get_git_commit() {
  git rev-parse --short HEAD 2>/dev/null
}

# --- Detekt check ---

check_detekt() {
  local available="false"
  local status="not_available"
  local total_offenses=0
  local convention=0
  local warning=0
  local error=0
  local execution_time=0

  log_info "Checking detekt availability..."

  if ./gradlew tasks --all 2>/dev/null | grep -q "^detekt$"; then
    available="true"
    log_info "detekt is available, running checks..."

    local start_time=$SECONDS
    local detekt_exit_code=0

    # Run detekt with XML report
    ./gradlew detekt >/dev/null 2>&1 || detekt_exit_code=$?
    execution_time=$((SECONDS - start_time))

    # Parse XML output from build/reports/detekt/detekt.xml
    local xml_file="build/reports/detekt/detekt.xml"
    if [ -f "$xml_file" ]; then
      # Count total issues
      total_offenses=$(grep -c "<error " "$xml_file" 2>/dev/null || echo "0")

      # Count by severity
      convention=$(grep "severity=\"convention\"" "$xml_file" 2>/dev/null | wc -l | tr -d ' ')
      warning=$(grep "severity=\"warning\"" "$xml_file" 2>/dev/null | wc -l | tr -d ' ')
      error=$(grep "severity=\"error\"" "$xml_file" 2>/dev/null | wc -l | tr -d ' ')

      if [ "$detekt_exit_code" -eq 0 ]; then
        status="passed"
        log_success "detekt passed ($total_offenses issues)"
      else
        status="failed"
        log_warn "detekt failed ($total_offenses issues)"
      fi
    else
      log_warn "Could not find detekt XML report at $xml_file"
      status="failed"
    fi
  else
    log_warn "detekt not available (gradle task not found)"
  fi

  # Return values as pipe-delimited string
  echo "$available|$status|$total_offenses|$convention|$warning|$error|$execution_time"
}

# --- Comprehensive test execution with clean check --rerun-tasks ---

check_comprehensive_tests() {
  local available="false"
  local status="not_available"
  local total_tests=0
  local failures=0
  local skipped=0
  local execution_time=0
  local log_file="$1"  # Path to store console output

  log_info "Checking Gradle test availability..."

  if ./gradlew tasks --all 2>/dev/null | grep -q "^check - "; then
    available="true"
    log_info "Running comprehensive check with forced fresh execution..."

    local start_time=$SECONDS
    local test_exit_code=0

    # Run comprehensive check with timeout
    if command -v timeout >/dev/null 2>&1; then
      # Linux/macOS with timeout command
      timeout "$TIMEOUT" ./gradlew clean check --rerun-tasks > "$log_file" 2>&1 || test_exit_code=$?
    elif command -v gtimeout >/dev/null 2>&1; then
      # macOS with coreutils
      gtimeout "$TIMEOUT" ./gradlew clean check --rerun-tasks > "$log_file" 2>&1 || test_exit_code=$?
    else
      # No timeout available, run directly
      ./gradlew clean check --rerun-tasks > "$log_file" 2>&1 || test_exit_code=$?
    fi
    execution_time=$((SECONDS - start_time))

    # Primary: Parse from Gradle console output (macOS/Linux compatible)
    if [ -f "$log_file" ]; then
      total_tests=$(grep -oE '[0-9]+ tests? completed' "$log_file" | grep -oE '[0-9]+' | head -1 || echo "0")
      failures=$(grep -oE '[0-9]+ failed' "$log_file" | grep -oE '[0-9]+' | head -1 || echo "0")
      skipped=$(grep -oE '[0-9]+ skipped' "$log_file" | grep -oE '[0-9]+' | head -1 || echo "0")

      # If console parsing failed, fallback to XML
      if [ "$total_tests" -eq 0 ]; then
        log_warn "Console parsing returned 0 tests, falling back to XML parsing..."
        local test_dirs=(
          "build/test-results/test"
          "build/test-results/integrationTest"
          "build/test-results/systemTest"
        )

        for test_dir in "${test_dirs[@]}"; do
          if [ -d "$test_dir" ]; then
            for xml_file in "$test_dir"/*.xml; do
              if [ -f "$xml_file" ]; then
                # Extract test counts from XML
                local tests=$(grep -o 'tests="[0-9]*"' "$xml_file" | grep -o '[0-9]*' || echo "0")
                local fails=$(grep -o 'failures="[0-9]*"' "$xml_file" | grep -o '[0-9]*' || echo "0")
                local skip=$(grep -o 'skipped="[0-9]*"' "$xml_file" | grep -o '[0-9]*' || echo "0")

                total_tests=$((total_tests + tests))
                failures=$((failures + fails))
                skipped=$((skipped + skip))
              fi
            done
          fi
        done
      fi
    fi

    if [ "$test_exit_code" -eq 0 ]; then
      status="passed"
      log_success "Comprehensive checks passed ($total_tests tests, $failures failures, $skipped skipped)"
    else
      status="failed"
      log_warn "Comprehensive checks failed ($total_tests tests, $failures failures, $skipped skipped)"
    fi
  else
    log_warn "Gradle check task not available"
  fi

  # Return values as pipe-delimited string
  echo "$available|$status|$total_tests|$failures|$skipped|$execution_time"
}

# --- Baseline comparison functions ---

# Find the latest baseline file for the current branch
find_latest_baseline() {
  local branch="$1"
  local branch_sanitized
  branch_sanitized=$(echo "$branch" | tr '/' '-')

  local baseline_dir=".claude/baseline"
  if [ ! -d "$baseline_dir" ]; then
    echo ""
    return 1
  fi

  # Find latest baseline for this branch (sorted by timestamp, most recent first)
  local latest
  latest=$(find "$baseline_dir" -name "${branch_sanitized}-*.json" -type f 2>/dev/null | sort -r | head -1)

  echo "$latest"
}

# Load JSON metrics from a file (supports jq or manual parsing)
load_json_metrics() {
  local json_file="$1"

  if [ ! -f "$json_file" ]; then
    log_error "Baseline file not found: $json_file"
    return 1
  fi

  if has_jq; then
    # Use jq for reliable parsing
    local total passed failed skipped
    total=$(jq -r '.checks.tests.total // 0' "$json_file")
    failed=$(jq -r '.checks.tests.failures // 0' "$json_file")
    skipped=$(jq -r '.checks.tests.skipped // 0' "$json_file")
    passed=$((total - failed - skipped))

    echo "$total|$passed|$failed|$skipped"
  else
    # Manual parsing without jq
    local total passed failed skipped
    total=$(grep '"total"' "$json_file" | grep -oE '[0-9]+' | head -1 || echo "0")
    failed=$(grep '"failures"' "$json_file" | grep -oE '[0-9]+' | head -1 || echo "0")
    skipped=$(grep '"skipped"' "$json_file" | grep -oE '[0-9]+' | head -1 || echo "0")
    passed=$((total - failed - skipped))

    echo "$total|$passed|$failed|$skipped"
  fi
}

# Compare current metrics against baseline and generate report
compare_with_baseline() {
  local baseline_file="$1"
  local current_total="$2"
  local current_passed="$3"
  local current_failed="$4"
  local current_skipped="$5"

  log_info "Loading baseline from: $baseline_file"

  local baseline_metrics
  baseline_metrics=$(load_json_metrics "$baseline_file")
  if [ $? -ne 0 ]; then
    log_error "Failed to load baseline metrics"
    return 1
  fi

  IFS='|' read -r baseline_total baseline_passed baseline_failed baseline_skipped <<< "$baseline_metrics"

  # Calculate deltas
  local delta_total delta_passed delta_failed delta_skipped
  delta_total=$((current_total - baseline_total))
  delta_passed=$((current_passed - baseline_passed))
  delta_failed=$((current_failed - baseline_failed))
  delta_skipped=$((current_skipped - baseline_skipped))

  # Generate comparison report
  echo ""
  echo "═══════════════════════════════════════════════════════════"
  echo "  BASELINE vs CURRENT COMPARISON"
  echo "═══════════════════════════════════════════════════════════"
  echo ""
  echo "BASELINE:"
  echo "  • Total: $baseline_total | Passed: $baseline_passed | Failed: $baseline_failed | Skipped: $baseline_skipped"
  echo ""
  echo "CURRENT:"
  echo "  • Total: $current_total | Passed: $current_passed | Failed: $current_failed | Skipped: $current_skipped"
  echo ""
  echo "DELTA (Current - Baseline):"

  # Format deltas with +/- signs
  local delta_total_str delta_passed_str delta_failed_str delta_skipped_str
  [[ $delta_total -gt 0 ]] && delta_total_str="+$delta_total" || delta_total_str="$delta_total"
  [[ $delta_passed -gt 0 ]] && delta_passed_str="+$delta_passed" || delta_passed_str="$delta_passed"
  [[ $delta_failed -gt 0 ]] && delta_failed_str="+$delta_failed" || delta_failed_str="$delta_failed"
  [[ $delta_skipped -gt 0 ]] && delta_skipped_str="+$delta_skipped" || delta_skipped_str="$delta_skipped"

  echo "  • Total: $delta_total_str | Passed: $delta_passed_str | Failed: $delta_failed_str | Skipped: $delta_skipped_str"
  echo ""
  echo "───────────────────────────────────────────────────────────"
  echo "  INTERPRETATION"
  echo "───────────────────────────────────────────────────────────"

  local has_regressions=false

  # Interpret deltas
  if [ $delta_total -gt 0 ]; then
    echo "  ✅ $delta_total new tests added"
  elif [ $delta_total -lt 0 ]; then
    echo "  ⚠️  ${delta_total#-} tests removed"
  fi

  if [ $delta_failed -gt 0 ]; then
    echo "  ❌ $delta_failed NEW test failures introduced"
    echo "     📋 Analyze if failures are:"
    echo "        - Expected (testing edge cases, deprecated endpoints)"
    echo "        - Bugs requiring fixes"
    echo "        - Pre-existing issues incorrectly attributed"
    has_regressions=true
  elif [ $delta_failed -lt 0 ]; then
    echo "  ✅ ${delta_failed#-} test failures FIXED"
  fi

  if [ $delta_passed -gt 0 ] && [ $delta_total -eq 0 ]; then
    echo "  ✅ $delta_passed additional tests now passing (failures fixed)"
  fi

  if [ $delta_skipped -ne 0 ]; then
    if [ $delta_skipped -gt 0 ]; then
      echo "  ⚠️  $delta_skipped more tests skipped"
    else
      echo "  ✅ ${delta_skipped#-} fewer tests skipped"
    fi
  fi

  echo ""
  echo "═══════════════════════════════════════════════════════════"

  # Return exit code based on regressions
  if [ "$has_regressions" = true ]; then
    return 1
  else
    return 0
  fi
}

# --- Main execution ---

# Mode: Capture baseline
mode_capture() {
  local branch="$1"
  local branch_sanitized="$2"
  local commit="$3"
  local timestamp="$4"
  local file_timestamp="$5"

  log_info "Mode: CAPTURE - Running comprehensive quality checks..."

  # Ensure baseline directory exists
  local baseline_dir=".claude/baseline"
  mkdir -p "$baseline_dir"

  # Determine file naming
  local file_base
  if [ -n "$ISSUE_ID" ]; then
    file_base="${ISSUE_ID}-${file_timestamp}"
  else
    file_base="${branch_sanitized}-${file_timestamp}"
  fi

  local log_file="${baseline_dir}/${file_base}.log"
  local json_file="${baseline_dir}/${file_base}.json"

  # Run checks
  local detekt_result
  local test_result

  detekt_result=$(check_detekt)
  test_result=$(check_comprehensive_tests "$log_file")

  # Parse results
  IFS='|' read -r detekt_available detekt_status detekt_offenses \
    detekt_convention detekt_warning detekt_error detekt_time <<< "$detekt_result"

  IFS='|' read -r test_available test_status test_total test_failures \
    test_skipped test_time <<< "$test_result"

  # Calculate passed tests
  local test_passed=$((test_total - test_failures - test_skipped))

  # Determine overall status
  local overall_status="not_available"
  local any_available=false

  if [ "$detekt_available" = "true" ] || [ "$test_available" = "true" ]; then
    any_available=true
    overall_status="passed"

    if [ "$detekt_status" = "failed" ] || [ "$test_status" = "failed" ]; then
      overall_status="failed"
    fi
  fi

  # Generate summary
  local summary=""
  if [ "$any_available" = false ]; then
    summary="No quality checks available yet"
  elif [ "$overall_status" = "passed" ]; then
    summary="All quality checks passed"
  else
    summary="Some quality checks failed"
  fi

  # Build JSON output
  local json_output

  if has_jq; then
    # Use jq to build JSON (ensures proper escaping)
    json_output=$(jq -n \
      --arg timestamp "$timestamp" \
      --arg branch "$branch" \
      --arg commit "$commit" \
      --arg issue_id "$ISSUE_ID" \
      --arg detekt_available "$detekt_available" \
      --arg detekt_status "$detekt_status" \
      --argjson detekt_offenses "$detekt_offenses" \
      --argjson detekt_convention "$detekt_convention" \
      --argjson detekt_warning "$detekt_warning" \
      --argjson detekt_error "$detekt_error" \
      --argjson detekt_time "$detekt_time" \
      --arg test_available "$test_available" \
      --arg test_status "$test_status" \
      --argjson test_total "$test_total" \
      --argjson test_passed "$test_passed" \
      --argjson test_failures "$test_failures" \
      --argjson test_skipped "$test_skipped" \
      --argjson test_time "$test_time" \
      --arg overall_status "$overall_status" \
      --arg summary "$summary" \
      '{
        timestamp: $timestamp,
        branch: $branch,
        commit: $commit,
        issue_id: $issue_id,
        checks: {
          detekt: {
            available: ($detekt_available == "true"),
            status: $detekt_status,
            total_offenses: $detekt_offenses,
            offenses_by_severity: {
              convention: $detekt_convention,
              warning: $detekt_warning,
              error: $detekt_error
            },
            execution_time: $detekt_time
          },
          tests: {
            available: ($test_available == "true"),
            status: $test_status,
            total: $test_total,
            passed: $test_passed,
            failures: $test_failures,
            skipped: $test_skipped,
            execution_time: $test_time
          }
        },
        overall_status: $overall_status,
        summary: $summary
      }')
  else
    # Manual JSON construction (fallback when jq not available)
    log_warn "jq not available, using manual JSON construction"
    json_output=$(cat <<EOF
{
  "timestamp": "$(json_escape "$timestamp")",
  "branch": "$(json_escape "$branch")",
  "commit": "$(json_escape "$commit")",
  "issue_id": "$(json_escape "$ISSUE_ID")",
  "checks": {
    "detekt": {
      "available": $([[ "$detekt_available" == "true" ]] && echo "true" || echo "false"),
      "status": "$(json_escape "$detekt_status")",
      "total_offenses": $detekt_offenses,
      "offenses_by_severity": {
        "convention": $detekt_convention,
        "warning": $detekt_warning,
        "error": $detekt_error
      },
      "execution_time": $detekt_time
    },
    "tests": {
      "available": $([[ "$test_available" == "true" ]] && echo "true" || echo "false"),
      "status": "$(json_escape "$test_status")",
      "total": $test_total,
      "passed": $test_passed,
      "failures": $test_failures,
      "skipped": $test_skipped,
      "execution_time": $test_time
    }
  },
  "overall_status": "$(json_escape "$overall_status")",
  "summary": "$(json_escape "$summary")"
}
EOF
    )
  fi

  # Write JSON output file
  echo "$json_output" > "$json_file"

  # Create latest symlink for this branch
  local latest_link="${baseline_dir}/latest-${branch_sanitized}.json"
  ln -sf "$(basename "$json_file")" "$latest_link"

  log_success "Results saved to:"
  echo "  JSON: $json_file"
  echo "  Log:  $log_file"
  echo "  Link: $latest_link"
  echo ""
  echo "Summary: $summary"
  echo ""

  # Pretty print JSON if jq available
  if has_jq; then
    echo "$json_output" | jq '.'
  else
    echo "$json_output"
  fi

  # Return captured metrics for potential comparison
  echo "$json_file|$test_total|$test_passed|$test_failures|$test_skipped"

  # Exit with appropriate code
  if [ "$overall_status" = "failed" ]; then
    return 1
  else
    return 0
  fi
}

# Mode: Compare against baseline
mode_compare() {
  local branch="$1"
  local branch_sanitized="$2"

  log_info "Mode: COMPARE - Running checks and comparing against baseline..."

  # Determine baseline file
  local baseline_file="$BASELINE_FILE"
  if [ -z "$baseline_file" ]; then
    # Auto-detect latest baseline for this branch
    baseline_file=$(find_latest_baseline "$branch")
    if [ -z "$baseline_file" ]; then
      log_error "No baseline found for branch: $branch"
      log_error "Run with --capture first to establish a baseline"
      return 2
    fi
    log_info "Auto-detected baseline: $baseline_file"
  fi

  # Capture current metrics (without saving as new baseline)
  local timestamp
  timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  local file_timestamp
  file_timestamp=$(date -u +"%Y%m%d-%H%M%S")

  local temp_log="/tmp/baseline-check-${file_timestamp}.log"

  # Run comprehensive tests
  local test_result
  test_result=$(check_comprehensive_tests "$temp_log")

  IFS='|' read -r test_available test_status test_total test_failures \
    test_skipped test_time <<< "$test_result"

  local test_passed=$((test_total - test_failures - test_skipped))

  log_info "Current metrics captured: $test_total tests, $test_passed passed, $test_failures failed, $test_skipped skipped"

  # Compare against baseline
  compare_with_baseline "$baseline_file" "$test_total" "$test_passed" "$test_failures" "$test_skipped"
  local compare_result=$?

  echo ""
  log_info "Detailed logs: $temp_log"

  return $compare_result
}

# Mode: Autonomous (capture + optional compare)
mode_auto() {
  local branch="$1"
  local branch_sanitized="$2"
  local commit="$3"
  local timestamp="$4"
  local file_timestamp="$5"

  log_info "Mode: AUTO - Autonomous baseline check..."

  # First, capture current baseline
  local capture_result
  capture_result=$(mode_capture "$branch" "$branch_sanitized" "$commit" "$timestamp" "$file_timestamp")
  local capture_exit=$?

  IFS='|' read -r json_file test_total test_passed test_failures test_skipped <<< "$capture_result"

  # Check if there's a previous baseline to compare against
  local baseline_dir=".claude/baseline"
  local baseline_count
  baseline_count=$(find "$baseline_dir" -name "${branch_sanitized}-*.json" -type f 2>/dev/null | wc -l | tr -d ' ')

  if [ "$baseline_count" -gt 1 ]; then
    echo ""
    log_info "Previous baseline detected, performing comparison..."

    # Find the second-most recent baseline (excluding the one we just created)
    local previous_baseline
    previous_baseline=$(find "$baseline_dir" -name "${branch_sanitized}-*.json" -type f ! -name "$(basename "$json_file")" 2>/dev/null | sort -r | head -1)

    if [ -n "$previous_baseline" ]; then
      compare_with_baseline "$previous_baseline" "$test_total" "$test_passed" "$test_failures" "$test_skipped"
      local compare_exit=$?

      if [ $compare_exit -ne 0 ]; then
        log_warn "Regressions detected compared to previous baseline"
        return 1
      else
        log_success "No regressions detected"
      fi
    fi
  else
    echo ""
    log_info "No previous baseline for comparison (first run on this branch)"
  fi

  return $capture_exit
}

main() {
  # Parse command-line arguments
  parse_arguments "$@"

  log_info "Starting baseline quality checks..."
  log_info "Mode: $MODE"

  # Verify we're in a git repository
  if ! git rev-parse --git-dir >/dev/null 2>&1; then
    log_error "Not in a git repository"
    exit 2
  fi

  # Extract git information
  local branch
  local branch_sanitized
  local commit
  branch=$(get_git_branch)
  commit=$(get_git_commit)

  if [ -z "$branch" ] || [ -z "$commit" ]; then
    log_error "Could not extract git branch or commit"
    exit 2
  fi

  # Sanitize branch name for use in filenames (replace / with -)
  branch_sanitized=$(echo "$branch" | tr '/' '-')

  log_info "Branch: $branch"
  log_info "Commit: $commit"
  if [ -n "$ISSUE_ID" ]; then
    log_info "Issue: $ISSUE_ID"
  fi
  echo ""

  # Generate timestamp
  local timestamp
  timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  local file_timestamp
  file_timestamp=$(date -u +"%Y%m%d-%H%M%S")

  # Execute based on mode
  local exit_code=0
  case "$MODE" in
    capture)
      mode_capture "$branch" "$branch_sanitized" "$commit" "$timestamp" "$file_timestamp" >/dev/null
      exit_code=$?
      ;;
    compare)
      mode_compare "$branch" "$branch_sanitized"
      exit_code=$?
      ;;
    auto)
      mode_auto "$branch" "$branch_sanitized" "$commit" "$timestamp" "$file_timestamp"
      exit_code=$?
      ;;
    *)
      log_error "Unknown mode: $MODE"
      exit 2
      ;;
  esac

  exit $exit_code
}

# Run main function
main "$@"

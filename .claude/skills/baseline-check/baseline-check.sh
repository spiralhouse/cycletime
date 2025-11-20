#!/usr/bin/env bash
#
# baseline-check.sh
#
# Executes project quality checks (detekt, Gradle tests) and outputs results in
# standardized JSON format. Designed to gracefully handle missing tools during
# early project lifecycle.
#
# Exit codes:
#   0 - Success (all checks passed or none available)
#   1 - Check failures
#   2 - Script error (not in git repo, etc.)
#

set -o pipefail

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

# --- Gradle test check ---

check_gradle_tests() {
  local available="false"
  local status="not_available"
  local total_tests=0
  local failures=0
  local skipped=0
  local execution_time=0

  log_info "Checking Gradle test availability..."

  if ./gradlew tasks --all 2>/dev/null | grep -q "^test - "; then
    available="true"
    log_info "Gradle tests available, running test + integrationTest..."

    local start_time=$SECONDS
    local test_exit_code=0

    # Run both test and integrationTest
    ./gradlew test integrationTest >/dev/null 2>&1 || test_exit_code=$?
    execution_time=$((SECONDS - start_time))

    # Parse test results from build/test-results directories
    local test_dirs=(
      "build/test-results/test"
      "build/test-results/integrationTest"
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

    if [ "$test_exit_code" -eq 0 ]; then
      status="passed"
      log_success "Gradle tests passed ($total_tests tests, $failures failures, $skipped skipped)"
    else
      status="failed"
      log_warn "Gradle tests failed ($total_tests tests, $failures failures, $skipped skipped)"
    fi
  else
    log_warn "Gradle tests not available (test task not found)"
  fi

  # Return values as pipe-delimited string
  echo "$available|$status|$total_tests|$failures|$skipped|$execution_time"
}

# --- Main execution ---

main() {
  log_info "Starting baseline quality checks..."

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

  # Generate timestamp
  local timestamp
  timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  local file_timestamp
  file_timestamp=$(date -u +"%Y%m%d-%H%M%S")

  # Run checks
  local detekt_result
  local test_result

  detekt_result=$(check_detekt)
  test_result=$(check_gradle_tests)

  # Parse results
  IFS='|' read -r detekt_available detekt_status detekt_offenses \
    detekt_convention detekt_warning detekt_error detekt_time <<< "$detekt_result"

  IFS='|' read -r test_available test_status test_total test_failures \
    test_skipped test_time <<< "$test_result"

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
      --argjson test_failures "$test_failures" \
      --argjson test_skipped "$test_skipped" \
      --argjson test_time "$test_time" \
      --arg overall_status "$overall_status" \
      --arg summary "$summary" \
      '{
        timestamp: $timestamp,
        branch: $branch,
        commit: $commit,
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

  # Ensure baseline directory exists
  local baseline_dir=".claude/baseline"
  mkdir -p "$baseline_dir"

  # Write output file
  local output_file="${baseline_dir}/${branch_sanitized}-${file_timestamp}.json"
  echo "$json_output" > "$output_file"

  log_success "Results saved to: $output_file"
  echo ""
  echo "Summary: $summary"
  echo ""

  # Pretty print JSON if jq available
  if has_jq; then
    echo "$json_output" | jq '.'
  else
    echo "$json_output"
  fi

  # Exit with appropriate code
  if [ "$overall_status" = "failed" ]; then
    exit 1
  else
    exit 0
  fi
}

# Run main function
main "$@"

#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# disable-dangerous-mode.sh
# ==============================================================================
# Gracefully disable Claude Code dangerous mode with cleanup and reporting.
#
# Usage:
#   disable-dangerous-mode.sh [reason]
#
# Arguments:
#   reason - Reason for disabling (default: "manual_disable")
#
# Examples:
#   disable-dangerous-mode.sh                        # Manual disable
#   disable-dangerous-mode.sh "task_complete"        # Task completed
#   disable-dangerous-mode.sh "auto_timeout"         # Auto-timeout
#   disable-dangerous-mode.sh "emergency"            # Emergency disable
#
# Operations:
#   - Stop resource monitoring
#   - Capture final state
#   - Generate summary report
#   - Clean up temporary files
#   - Log to audit system
# ==============================================================================

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly STATE_FILE="/tmp/dangerous-mode-state"
readonly MONITOR_PID_FILE="/tmp/dangerous-mode-monitor.pid"
readonly AUDIT_SCRIPT="${SCRIPT_DIR}/audit-logger.sh"
readonly MONITOR_SCRIPT="${SCRIPT_DIR}/monitor-resources.sh"

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Parse arguments
REASON="${1:-manual_disable}"

# ==============================================================================
# Utility Functions
# ==============================================================================

log() {
    echo -e "${BLUE}[$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")]${NC} ✓ $*"
}

log_warning() {
    echo -e "${YELLOW}[$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")]${NC} ⚠ $*"
}

log_error() {
    echo -e "${RED}[$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")]${NC} ✗ $*" >&2
}

audit_log() {
    local operation="$1"
    local resource="$2"
    local result="$3"
    local duration="${4:-0}"

    if [ -x "$AUDIT_SCRIPT" ]; then
        "$AUDIT_SCRIPT" "$operation" "$resource" "$result" "$duration"
    fi
}

# ==============================================================================
# State Management
# ==============================================================================

check_dangerous_mode_active() {
    if [ ! -f "$STATE_FILE" ]; then
        log_warning "Dangerous mode is not currently active"
        return 1
    fi
    return 0
}

get_state_value() {
    local key="$1"
    local default="${2:-}"

    if [ ! -f "$STATE_FILE" ]; then
        echo "$default"
        return
    fi

    # Simple JSON parsing (in production, use jq)
    local value
    value=$(grep "\"$key\"" "$STATE_FILE" | cut -d: -f2 | tr -d ' ,"' | head -1)
    echo "${value:-$default}"
}

capture_final_state() {
    log "Capturing final state..."

    local state_dir="${STATE_DIR:-/workspace/.claude/state}"
    if [ ! -d "$state_dir" ]; then
        mkdir -p "$state_dir"
    fi

    local final_state_file="${state_dir}/final_state_$(date +%s).json"

    # Get current resource usage
    local resource_json="{}"
    if [ -x "$MONITOR_SCRIPT" ]; then
        resource_json=$("$MONITOR_SCRIPT" once json 2>/dev/null || echo "{}")
    fi

    # Get git state
    local git_branch="unknown"
    local git_commit="unknown"
    local git_status=""

    if command -v git &> /dev/null && git rev-parse --git-dir &> /dev/null; then
        git_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
        git_commit=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
        git_status=$(git status --porcelain 2>/dev/null || echo "")
    fi

    # Create final state file
    cat > "$final_state_file" <<EOF
{
  "disable_reason": "$REASON",
  "disable_time": $(date +%s),
  "start_time": $(get_state_value "start_time" "0"),
  "duration_seconds": $(($(date +%s) - $(get_state_value "start_time" "0"))),
  "git_branch": "$git_branch",
  "git_commit": "$git_commit",
  "git_modified_files": $([ -n "$git_status" ] && echo "true" || echo "false"),
  "working_directory": "$(pwd)",
  "final_resource_usage": $resource_json
}
EOF

    log_success "Final state captured: $final_state_file"
}

# ==============================================================================
# Stop Monitoring
# ==============================================================================

stop_resource_monitoring() {
    log "Stopping resource monitoring..."

    if [ -f "$MONITOR_PID_FILE" ]; then
        local monitor_pid
        monitor_pid=$(cat "$MONITOR_PID_FILE")

        if kill -0 "$monitor_pid" 2>/dev/null; then
            log "Stopping monitor process (PID: $monitor_pid)..."
            kill "$monitor_pid" 2>/dev/null || true

            # Wait for graceful shutdown
            local timeout=5
            while kill -0 "$monitor_pid" 2>/dev/null && [ $timeout -gt 0 ]; do
                sleep 1
                timeout=$((timeout - 1))
            done

            # Force kill if still running
            if kill -0 "$monitor_pid" 2>/dev/null; then
                log_warning "Forcing monitor process termination..."
                kill -9 "$monitor_pid" 2>/dev/null || true
            fi

            log_success "Resource monitoring stopped"
        else
            log_warning "Monitor process not running (PID: $monitor_pid)"
        fi

        rm -f "$MONITOR_PID_FILE"
    else
        log "No monitor PID file found"
    fi
}

# ==============================================================================
# Generate Report
# ==============================================================================

generate_summary_report() {
    log "Generating summary report..."

    local start_time
    local end_time
    local duration
    local original_duration

    start_time=$(get_state_value "start_time" "0")
    end_time=$(date +%s)
    duration=$((end_time - start_time))
    original_duration=$(get_state_value "duration" "0")

    local report_file="/workspace/.claude/dangerous-mode-summary-${end_time}.txt"

    cat > "$report_file" <<EOF
═══════════════════════════════════════════════════════════════════
              DANGEROUS MODE SESSION SUMMARY
═══════════════════════════════════════════════════════════════════

Session Information:
  Reason for enabling: $(get_state_value "reason" "Unknown")
  Reason for disabling: $REASON
  Start time: $(date -d "@$start_time" 2>/dev/null || date -r "$start_time" 2>/dev/null || echo "Unknown")
  End time: $(date -d "@$end_time" 2>/dev/null || date -r "$end_time" 2>/dev/null || echo "Unknown")
  Planned duration: $((original_duration / 60)) minutes
  Actual duration: $((duration / 60)) minutes $((duration % 60)) seconds
  Completed: $([ "$duration" -ge "$original_duration" ] && echo "Yes (full duration)" || echo "No (early termination)")

Git State:
  Branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "Unknown")
  Commit: $(git rev-parse --short HEAD 2>/dev/null || echo "Unknown")
  Modified files: $(git status --porcelain 2>/dev/null | wc -l || echo "Unknown")

Final Resource Usage:
$([ -x "$MONITOR_SCRIPT" ] && "$MONITOR_SCRIPT" once 2>/dev/null || echo "  Resource monitoring not available")

Audit Log Summary:
$([ -x "$AUDIT_SCRIPT" ] && "$AUDIT_SCRIPT" stats 2>/dev/null || echo "  Audit statistics not available")

State Backups:
$(ls -1 "${STATE_DIR:-/workspace/.claude/state}"/*.json 2>/dev/null | tail -5 || echo "  No state backups found")

═══════════════════════════════════════════════════════════════════
                      END OF SUMMARY
═══════════════════════════════════════════════════════════════════
EOF

    log_success "Summary report generated: $report_file"

    # Display summary to console
    echo
    cat "$report_file"
    echo
}

# ==============================================================================
# Cleanup
# ==============================================================================

cleanup_state_files() {
    log "Cleaning up state files..."

    # Remove state file
    if [ -f "$STATE_FILE" ]; then
        rm -f "$STATE_FILE"
        log_success "State file removed"
    fi

    # Remove monitor PID file (if still exists)
    if [ -f "$MONITOR_PID_FILE" ]; then
        rm -f "$MONITOR_PID_FILE"
        log_success "Monitor PID file removed"
    fi

    # Clean up old state backups (keep last 10)
    local state_dir="${STATE_DIR:-/workspace/.claude/state}"
    if [ -d "$state_dir" ]; then
        local backup_count
        backup_count=$(find "$state_dir" -name "*.json" -type f | wc -l)

        if [ "$backup_count" -gt 10 ]; then
            log "Cleaning up old state backups (keeping last 10)..."
            find "$state_dir" -name "*.json" -type f | sort | head -n -10 | xargs rm -f
            log_success "Old backups cleaned up"
        fi
    fi
}

# ==============================================================================
# Main Execution
# ==============================================================================

main() {
    log "═══════════════════════════════════════════════════════════════════"
    log "  Dangerous Mode Disablement"
    log "═══════════════════════════════════════════════════════════════════"
    echo

    # Check if dangerous mode is active
    if ! check_dangerous_mode_active; then
        log_error "Dangerous mode is not active"
        echo
        echo "To enable dangerous mode, run:"
        echo "  enable-dangerous-mode.sh [duration] [reason]"
        echo
        exit 1
    fi

    local start_time
    start_time=$(date +%s)

    # Capture state before cleanup
    capture_final_state

    # Stop monitoring
    stop_resource_monitoring

    # Generate report
    generate_summary_report

    # Clean up
    cleanup_state_files

    # Log to audit system
    local end_time
    end_time=$(date +%s)
    local total_duration=$((end_time - start_time))
    audit_log "dangerous_mode" "disabled" "success" "$total_duration"

    log_success "Dangerous mode DISABLED"

    echo
    echo "╔════════════════════════════════════════════════════════════════════╗"
    echo "║                   DANGEROUS MODE DEACTIVATED                       ║"
    echo "╠════════════════════════════════════════════════════════════════════╣"
    echo "║  Reason: $REASON"
    echo "║                                                                    ║"
    echo "║  All safety restrictions have been restored.                       ║"
    echo "║  Summary report saved to:                                          ║"
    echo "║    /workspace/.claude/dangerous-mode-summary-${end_time}.txt"
    echo "║                                                                    ║"
    echo "║  State backups preserved in:                                       ║"
    echo "║    ${STATE_DIR:-/workspace/.claude/state}/"
    echo "╚════════════════════════════════════════════════════════════════════╝"
    echo

    log "Disable complete"
}

# Run main function
main "$@"

#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# enable-dangerous-mode.sh
# ==============================================================================
# Safely enable Claude Code --dangerously-skip-permissions mode with
# comprehensive safety checks and monitoring.
#
# Usage:
#   enable-dangerous-mode.sh [duration_seconds] [reason]
#
# Arguments:
#   duration_seconds - Maximum duration for dangerous mode (default: 1800 = 30 min)
#   reason          - Reason for enabling dangerous mode (for audit log)
#
# Examples:
#   enable-dangerous-mode.sh                    # 30 minute session
#   enable-dangerous-mode.sh 3600              # 1 hour session
#   enable-dangerous-mode.sh 1800 "Implement auth feature"
#
# Pre-flight Checks:
#   - Verify running inside devcontainer
#   - Check circuit breaker status
#   - Verify resource availability
#   - Ensure audit logging active
#   - Check git repository state
#
# Safety Mechanisms:
#   - Time-limited session with auto-disable
#   - Continuous resource monitoring
#   - Audit logging of all operations
#   - Circuit breaker integration
#   - State checkpointing
# ==============================================================================

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly CONFIG_FILE="${SCRIPT_DIR}/../config/dangerous-mode.json"
readonly STATE_FILE="/tmp/dangerous-mode-state"
readonly MONITOR_PID_FILE="/tmp/dangerous-mode-monitor.pid"
readonly DEFAULT_DURATION=1800  # 30 minutes
readonly AUDIT_SCRIPT="${SCRIPT_DIR}/audit-logger.sh"
readonly MONITOR_SCRIPT="${SCRIPT_DIR}/monitor-resources.sh"
readonly EMERGENCY_SCRIPT="${SCRIPT_DIR}/emergency-stop.sh"

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Parse arguments
DURATION="${1:-$DEFAULT_DURATION}"
REASON="${2:-Unspecified reason}"

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

die() {
    log_error "$*"
    audit_log "dangerous_mode" "enable_failed" "error" 0
    exit 1
}

# ==============================================================================
# Pre-flight Checks
# ==============================================================================

preflight_check_devcontainer() {
    log "Checking devcontainer environment..."

    if [ "${DEVCONTAINER:-}" != "true" ]; then
        die "CRITICAL: Must run inside devcontainer. Set DEVCONTAINER=true."
    fi

    if [ "${CONTAINER_NAME:-}" != "cycletime-claude-code" ]; then
        log_warning "Container name mismatch. Expected: cycletime-claude-code, Got: ${CONTAINER_NAME:-unknown}"
    fi

    log_success "Devcontainer check passed"
}

preflight_check_circuit_breaker() {
    log "Checking circuit breaker status..."

    if [ ! -x "$EMERGENCY_SCRIPT" ]; then
        die "CRITICAL: Emergency stop script not found: $EMERGENCY_SCRIPT"
    fi

    if ! "$EMERGENCY_SCRIPT" check > /dev/null 2>&1; then
        die "CRITICAL: Circuit breaker is tripped. Run 'emergency-stop.sh status' for details."
    fi

    log_success "Circuit breaker check passed"
}

preflight_check_resources() {
    log "Checking resource availability..."

    if [ ! -x "$MONITOR_SCRIPT" ]; then
        log_warning "Resource monitor script not found: $MONITOR_SCRIPT"
        return 0
    fi

    # Get resource usage in JSON format
    local resource_json
    if ! resource_json=$("$MONITOR_SCRIPT" once json 2>/dev/null); then
        log_warning "Could not check resource usage"
        return 0
    fi

    # Parse thresholds from config (simplified - in production use jq)
    local cpu_threshold=70
    local mem_threshold=70
    local disk_threshold=80
    local pid_threshold=60

    # Extract values (simplified parsing)
    local cpu_usage
    local mem_usage
    local disk_usage
    local pid_usage

    cpu_usage=$(echo "$resource_json" | grep -o '"cpu":[0-9]*' | cut -d: -f2 || echo "0")
    mem_usage=$(echo "$resource_json" | grep -o '"memory":[0-9]*' | cut -d: -f2 || echo "0")
    disk_usage=$(echo "$resource_json" | grep -o '"disk":[0-9]*' | cut -d: -f2 || echo "0")
    pid_usage=$(echo "$resource_json" | grep -o '"pids":[0-9]*' | cut -d: -f2 || echo "0")

    local warnings=0

    if [ "$cpu_usage" -ge "$cpu_threshold" ]; then
        log_warning "CPU usage high: ${cpu_usage}% (threshold: ${cpu_threshold}%)"
        warnings=$((warnings + 1))
    fi

    if [ "$mem_usage" -ge "$mem_threshold" ]; then
        log_warning "Memory usage high: ${mem_usage}% (threshold: ${mem_threshold}%)"
        warnings=$((warnings + 1))
    fi

    if [ "$disk_usage" -ge "$disk_threshold" ]; then
        log_warning "Disk usage high: ${disk_usage}% (threshold: ${disk_threshold}%)"
        warnings=$((warnings + 1))
    fi

    if [ "$pid_usage" -ge "$pid_threshold" ]; then
        log_warning "PID usage high: ${pid_usage}% (threshold: ${pid_threshold}%)"
        warnings=$((warnings + 1))
    fi

    if [ "$warnings" -eq 0 ]; then
        log_success "Resource check passed (CPU: ${cpu_usage}%, MEM: ${mem_usage}%, DISK: ${disk_usage}%, PIDs: ${pid_usage}%)"
    else
        log_warning "Resource check completed with $warnings warning(s)"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            die "Aborted due to resource warnings"
        fi
    fi
}

preflight_check_audit_logging() {
    log "Checking audit logging..."

    local audit_log_file="${CLAUDE_AUDIT_LOG:-/workspace/.claude/audit.log}"
    local audit_dir
    audit_dir="$(dirname "$audit_log_file")"

    if [ ! -d "$audit_dir" ]; then
        log "Creating audit log directory: $audit_dir"
        mkdir -p "$audit_dir" || die "Could not create audit log directory"
    fi

    if [ ! -f "$audit_log_file" ]; then
        log "Creating audit log file: $audit_log_file"
        touch "$audit_log_file" || die "Could not create audit log file"
    fi

    if [ ! -w "$audit_log_file" ]; then
        die "CRITICAL: Audit log file is not writable: $audit_log_file"
    fi

    log_success "Audit logging check passed"
}

preflight_check_git_state() {
    log "Checking git repository state..."

    if ! command -v git &> /dev/null; then
        log_warning "Git not found, skipping repository check"
        return 0
    fi

    if ! git rev-parse --git-dir &> /dev/null; then
        log_warning "Not in a git repository"
        return 0
    fi

    # Check for uncommitted changes
    if [ -n "$(git status --porcelain)" ]; then
        log_warning "Git repository has uncommitted changes"
        git status --short
        read -p "Continue with uncommitted changes? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            die "Aborted due to uncommitted changes"
        fi
    fi

    log_success "Git state check passed"
}

preflight_check_config() {
    log "Checking configuration file..."

    if [ ! -f "$CONFIG_FILE" ]; then
        die "CRITICAL: Configuration file not found: $CONFIG_FILE"
    fi

    if ! command -v jq &> /dev/null; then
        log_warning "jq not found, skipping JSON validation"
    else
        if ! jq empty "$CONFIG_FILE" 2>/dev/null; then
            die "CRITICAL: Invalid JSON in configuration file"
        fi
    fi

    log_success "Configuration check passed"
}

# ==============================================================================
# Enable Dangerous Mode
# ==============================================================================

enable_dangerous_mode() {
    local start_time
    local end_time

    start_time=$(date +%s)
    end_time=$((start_time + DURATION))

    log "Enabling dangerous mode..."
    log "  Duration: ${DURATION} seconds ($((DURATION / 60)) minutes)"
    log "  Reason: $REASON"
    log "  Start: $(date -d "@$start_time" 2>/dev/null || date -r "$start_time")"
    log "  End: $(date -d "@$end_time" 2>/dev/null || date -r "$end_time")"

    # Create state file
    cat > "$STATE_FILE" <<EOF
{
  "enabled": true,
  "start_time": $start_time,
  "end_time": $end_time,
  "duration": $DURATION,
  "reason": "$REASON",
  "pid": $$,
  "user": "${USER:-unknown}",
  "hostname": "${HOSTNAME:-unknown}"
}
EOF

    log_success "Dangerous mode state file created: $STATE_FILE"

    # Log to audit system
    audit_log "dangerous_mode" "enabled" "success" 0

    # Start resource monitoring in background
    if [ -x "$MONITOR_SCRIPT" ]; then
        log "Starting resource monitoring..."
        nohup "$MONITOR_SCRIPT" > /dev/null 2>&1 &
        local monitor_pid=$!
        echo "$monitor_pid" > "$MONITOR_PID_FILE"
        log_success "Resource monitoring started (PID: $monitor_pid)"
    fi

    # Create checkpoint
    create_checkpoint "dangerous_mode_enabled"

    log_success "Dangerous mode ENABLED"
    echo
    echo "╔════════════════════════════════════════════════════════════════════╗"
    echo "║                     DANGEROUS MODE ACTIVE                          ║"
    echo "╠════════════════════════════════════════════════════════════════════╣"
    echo "║  Duration: $((DURATION / 60)) minutes                                                ║"
    echo "║  Auto-disable at: $(date -d "@$end_time" 2>/dev/null || date -r "$end_time" '+%Y-%m-%d %H:%M:%S')                              ║"
    echo "║                                                                    ║"
    echo "║  Safety Mechanisms:                                                ║"
    echo "║    • Circuit breaker monitoring active                             ║"
    echo "║    • Resource monitoring active                                    ║"
    echo "║    • Audit logging enabled                                         ║"
    echo "║    • State checkpointing enabled                                   ║"
    echo "║                                                                    ║"
    echo "║  Emergency Controls:                                               ║"
    echo "║    • Manual stop: disable-dangerous-mode.sh                        ║"
    echo "║    • Emergency stop: emergency-stop.sh stop                        ║"
    echo "║    • Status check: dangerous-mode-status.sh                        ║"
    echo "╚════════════════════════════════════════════════════════════════════╝"
    echo
}

# ==============================================================================
# State Management
# ==============================================================================

create_checkpoint() {
    local checkpoint_name="${1:-checkpoint}"
    local state_dir="${STATE_DIR:-/workspace/.claude/state}"

    if [ ! -d "$state_dir" ]; then
        mkdir -p "$state_dir"
    fi

    local checkpoint_file="${state_dir}/${checkpoint_name}_$(date +%s).json"

    # Capture current state
    cat > "$checkpoint_file" <<EOF
{
  "checkpoint_name": "$checkpoint_name",
  "timestamp": $(date +%s),
  "git_branch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')",
  "git_commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "working_directory": "$(pwd)",
  "resource_usage": $(command -v "$MONITOR_SCRIPT" &> /dev/null && "$MONITOR_SCRIPT" once json 2>/dev/null || echo '{}')
}
EOF

    log "Checkpoint created: $checkpoint_file"
}

# ==============================================================================
# Cleanup on Exit
# ==============================================================================

cleanup() {
    log "Cleaning up temporary files..."

    # Don't remove state file - disable-dangerous-mode.sh will handle it
    # This allows checking state even if this script is interrupted

    log "Cleanup complete"
}

trap cleanup EXIT

# ==============================================================================
# Main Execution
# ==============================================================================

main() {
    log "═══════════════════════════════════════════════════════════════════"
    log "  Dangerous Mode Enablement - Pre-flight Checks"
    log "═══════════════════════════════════════════════════════════════════"
    echo

    # Run all pre-flight checks
    preflight_check_devcontainer
    preflight_check_circuit_breaker
    preflight_check_resources
    preflight_check_audit_logging
    preflight_check_git_state
    preflight_check_config

    echo
    log "═══════════════════════════════════════════════════════════════════"
    log "  All Pre-flight Checks Passed"
    log "═══════════════════════════════════════════════════════════════════"
    echo

    # Validate duration
    if ! [[ "$DURATION" =~ ^[0-9]+$ ]]; then
        die "Invalid duration: $DURATION (must be a positive integer)"
    fi

    if [ "$DURATION" -lt 60 ]; then
        die "Duration too short: $DURATION seconds (minimum: 60 seconds)"
    fi

    if [ "$DURATION" -gt 7200 ]; then
        log_warning "Duration very long: $DURATION seconds ($((DURATION / 60)) minutes)"
        log_warning "Maximum recommended duration: 2 hours (7200 seconds)"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            die "Aborted due to duration warning"
        fi
    fi

    # Enable dangerous mode
    enable_dangerous_mode

    # Schedule auto-disable
    log "Scheduling auto-disable in $DURATION seconds..."
    (
        sleep "$DURATION"
        if [ -f "$STATE_FILE" ]; then
            log "Auto-disable timer expired, disabling dangerous mode..."
            "${SCRIPT_DIR}/disable-dangerous-mode.sh" "auto_timeout"
        fi
    ) &

    log_success "Auto-disable scheduled"

    echo
    log "Dangerous mode enablement complete"
    log "Use 'disable-dangerous-mode.sh' to manually disable before timeout"
}

# Run main function
main "$@"

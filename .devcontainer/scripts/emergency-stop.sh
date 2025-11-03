#!/bin/bash
# emergency-stop.sh - Emergency stop mechanism for Claude Code operations
# Implements circuit breaker pattern with graceful shutdown and state preservation

set -euo pipefail

# Configuration
CIRCUIT_BREAKER_FILE="${CIRCUIT_BREAKER_FILE:-/tmp/claude-circuit-breaker}"
STATE_DIR="${STATE_DIR:-/workspace/.claude/state}"
BACKUP_DIR="${BACKUP_DIR:-/workspace/.claude/backups}"
GRACE_PERIOD="${GRACE_PERIOD:-30}"  # Seconds to wait for graceful shutdown

# Color codes
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Ensure directories exist
mkdir -p "$STATE_DIR" "$BACKUP_DIR"

# Function: Get current timestamp
get_timestamp() {
    date -u +"%Y-%m-%dT%H:%M:%S.%3NZ"
}

# Function: Log to audit system
log_audit() {
    local message="$1"
    local severity="${2:-warning}"

    if command -v audit-logger.sh >/dev/null 2>&1; then
        audit-logger.sh security "emergency_stop" "$message" "$severity"
    fi

    echo -e "${YELLOW}[EMERGENCY]${NC} $(get_timestamp) $message" >&2
}

# Function: Check if circuit breaker is tripped
is_circuit_breaker_tripped() {
    [[ -f "$CIRCUIT_BREAKER_FILE" ]]
}

# Function: Trip circuit breaker
trip_circuit_breaker() {
    local reason="$1"

    if is_circuit_breaker_tripped; then
        echo "Circuit breaker already tripped"
        return 0
    fi

    echo "$(get_timestamp)|$reason" > "$CIRCUIT_BREAKER_FILE"
    log_audit "Circuit breaker tripped: $reason" "critical"

    echo -e "${RED}CIRCUIT BREAKER TRIPPED${NC}"
    echo "Reason: $reason"
    echo "Timestamp: $(get_timestamp)"
}

# Function: Reset circuit breaker
reset_circuit_breaker() {
    if [[ ! -f "$CIRCUIT_BREAKER_FILE" ]]; then
        echo "Circuit breaker not tripped"
        return 0
    fi

    local trip_info
    trip_info=$(cat "$CIRCUIT_BREAKER_FILE")

    rm -f "$CIRCUIT_BREAKER_FILE"
    log_audit "Circuit breaker reset (was: $trip_info)" "warning"

    echo -e "${GREEN}CIRCUIT BREAKER RESET${NC}"
    echo "Previous trip: $trip_info"
}

# Function: Get circuit breaker status
get_circuit_breaker_status() {
    if is_circuit_breaker_tripped; then
        local trip_info
        trip_info=$(cat "$CIRCUIT_BREAKER_FILE")
        echo -e "${RED}TRIPPED${NC}"
        echo "Info: $trip_info"
    else
        echo -e "${GREEN}OK${NC}"
    fi
}

# Function: Find Claude Code processes
find_claude_processes() {
    pgrep -f "claude" || true
}

# Function: Save current state
save_state() {
    local state_name="${1:-emergency-$(date +%Y%m%d-%H%M%S)}"
    local state_file="$STATE_DIR/$state_name.tar.gz"

    echo "Saving current state to $state_file..."

    # Save workspace changes
    if [[ -d /workspace ]]; then
        tar -czf "$state_file" \
            -C /workspace \
            --exclude=".git" \
            --exclude="build" \
            --exclude=".gradle" \
            --exclude="node_modules" \
            . 2>/dev/null || true

        log_audit "State saved: $state_file" "warning"
        echo "State saved: $state_file (size: $(du -h "$state_file" | cut -f1))"
    else
        log_audit "Failed to save state: /workspace not found" "error"
        echo "Error: /workspace not found"
        return 1
    fi
}

# Function: Terminate processes gracefully
terminate_gracefully() {
    local pids=("$@")

    if [[ ${#pids[@]} -eq 0 ]]; then
        echo "No processes to terminate"
        return 0
    fi

    echo "Sending SIGTERM to ${#pids[@]} process(es)..."
    for pid in "${pids[@]}"; do
        if ps -p "$pid" >/dev/null 2>&1; then
            kill -TERM "$pid" 2>/dev/null || true
            echo "  - Sent SIGTERM to PID $pid"
        fi
    done

    # Wait for graceful shutdown
    echo "Waiting up to ${GRACE_PERIOD}s for graceful shutdown..."
    local elapsed=0
    local all_stopped=false

    while [[ $elapsed -lt $GRACE_PERIOD ]]; do
        local still_running=0

        for pid in "${pids[@]}"; do
            if ps -p "$pid" >/dev/null 2>&1; then
                ((still_running++))
            fi
        done

        if [[ $still_running -eq 0 ]]; then
            all_stopped=true
            break
        fi

        sleep 1
        ((elapsed++))
        echo -ne "\r  Waiting... ${elapsed}s / ${GRACE_PERIOD}s (${still_running} process(es) still running)"
    done

    echo ""  # New line after progress

    if $all_stopped; then
        echo -e "${GREEN}All processes stopped gracefully${NC}"
        log_audit "Graceful shutdown completed" "warning"
        return 0
    else
        echo -e "${YELLOW}Some processes did not stop gracefully${NC}"
        return 1
    fi
}

# Function: Force kill processes
force_kill() {
    local pids=("$@")

    if [[ ${#pids[@]} -eq 0 ]]; then
        return 0
    fi

    echo "Force killing remaining processes..."
    for pid in "${pids[@]}"; do
        if ps -p "$pid" >/dev/null 2>&1; then
            kill -KILL "$pid" 2>/dev/null || true
            echo "  - Sent SIGKILL to PID $pid"
            log_audit "Force killed PID $pid" "critical"
        fi
    done
}

# Function: Emergency stop sequence
emergency_stop() {
    local reason="${1:-Manual emergency stop}"

    echo -e "${RED}=== EMERGENCY STOP INITIATED ===${NC}"
    echo "Reason: $reason"
    echo "Time: $(get_timestamp)"
    echo ""

    # 1. Trip circuit breaker
    trip_circuit_breaker "$reason"

    # 2. Find Claude Code processes
    echo "Finding Claude Code processes..."
    local pids
    mapfile -t pids < <(find_claude_processes)

    if [[ ${#pids[@]} -eq 0 ]]; then
        echo "No Claude Code processes found"
    else
        echo "Found ${#pids[@]} Claude Code process(es): ${pids[*]}"

        # 3. Save current state
        save_state "emergency-stop-$(date +%Y%m%d-%H%M%S)"

        # 4. Graceful shutdown
        if ! terminate_gracefully "${pids[@]}"; then
            # 5. Force kill if graceful shutdown failed
            local still_running
            mapfile -t still_running < <(find_claude_processes)

            if [[ ${#still_running[@]} -gt 0 ]]; then
                force_kill "${still_running[@]}"
            fi
        fi
    fi

    echo ""
    echo -e "${RED}=== EMERGENCY STOP COMPLETE ===${NC}"
    echo "Circuit breaker status: $(get_circuit_breaker_status)"
    echo ""
    echo "To resume operations:"
    echo "  1. Investigate the cause: cat $CIRCUIT_BREAKER_FILE"
    echo "  2. Fix the issue"
    echo "  3. Reset circuit breaker: emergency-stop.sh reset"
}

# Function: Check conditions and auto-trip if needed
check_conditions() {
    # Check resource usage
    if command -v monitor-resources.sh >/dev/null 2>&1; then
        local metrics
        metrics=$(monitor-resources.sh once json 2>/dev/null || echo '{}')

        local cpu
        local mem
        local pids

        cpu=$(echo "$metrics" | jq -r '.cpu_percent // 0' 2>/dev/null | cut -d. -f1)
        mem=$(echo "$metrics" | jq -r '.memory_percent // 0' 2>/dev/null | cut -d. -f1)
        pids=$(echo "$metrics" | jq -r '.pid_percent // 0' 2>/dev/null | cut -d. -f1)

        # Trip if critical thresholds exceeded
        if [[ $cpu -gt 95 ]]; then
            emergency_stop "CPU usage critical: ${cpu}%"
            return 1
        fi

        if [[ $mem -gt 95 ]]; then
            emergency_stop "Memory usage critical: ${mem}%"
            return 1
        fi

        if [[ $pids -gt 90 ]]; then
            emergency_stop "PID usage critical: ${pids}%"
            return 1
        fi
    fi

    # Check audit log for suspicious activity
    if command -v audit-logger.sh >/dev/null 2>&1; then
        local recent_failures
        recent_failures=$(audit-logger.sh stats 2>/dev/null | grep "Events by result" -A 5 | grep -c "failure" || echo "0")

        # Trip if excessive failures
        if [[ $recent_failures -gt 50 ]]; then
            emergency_stop "Excessive failures detected: $recent_failures"
            return 1
        fi
    fi

    echo "All conditions OK"
    return 0
}

# Function: Display help
show_help() {
    cat <<EOF
Usage: emergency-stop.sh <command> [options]

Commands:
  stop [reason]     - Execute emergency stop with optional reason
  trip [reason]     - Trip circuit breaker without stopping processes
  reset             - Reset circuit breaker
  status            - Show circuit breaker status
  check             - Check conditions and auto-trip if needed
  save [name]       - Save current state without stopping

Environment Variables:
  CIRCUIT_BREAKER_FILE  - Circuit breaker state file (default: /tmp/claude-circuit-breaker)
  STATE_DIR             - State backup directory (default: /workspace/.claude/state)
  GRACE_PERIOD          - Graceful shutdown timeout seconds (default: 30)

Examples:
  emergency-stop.sh stop                        # Manual emergency stop
  emergency-stop.sh stop "High CPU usage"       # Stop with reason
  emergency-stop.sh trip "Testing"              # Trip without stopping
  emergency-stop.sh reset                       # Reset circuit breaker
  emergency-stop.sh status                      # Check status
  emergency-stop.sh check                       # Auto-trip if conditions met
  emergency-stop.sh save backup-before-deploy   # Save state
EOF
}

# Main command dispatcher
case "${1:-}" in
    stop)
        emergency_stop "${2:-Manual emergency stop}"
        ;;
    trip)
        trip_circuit_breaker "${2:-Manual trip}"
        ;;
    reset)
        reset_circuit_breaker
        ;;
    status)
        echo "Circuit Breaker Status: $(get_circuit_breaker_status)"
        ;;
    check)
        check_conditions
        ;;
    save)
        save_state "$2"
        ;;
    help|-h|--help)
        show_help
        ;;
    *)
        show_help
        exit 1
        ;;
esac

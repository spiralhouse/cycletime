#!/bin/bash
# monitor-resources.sh - Real-time resource monitoring with threshold alerting
# Tracks CPU, memory, disk, and PID usage to prevent resource exhaustion

set -euo pipefail

# Configuration
MONITOR_INTERVAL="${MONITOR_INTERVAL:-5}"  # Check every 5 seconds
CPU_THRESHOLD="${CPU_THRESHOLD:-90}"       # Alert at 90% CPU usage
MEM_THRESHOLD="${MEM_THRESHOLD:-85}"       # Alert at 85% memory usage
DISK_THRESHOLD="${DISK_THRESHOLD:-90}"     # Alert at 90% disk usage
PID_THRESHOLD="${PID_THRESHOLD:-80}"       # Alert at 80% PID limit

# Alert tracking
ALERT_COOLDOWN=60  # Seconds between repeated alerts
declare -A last_alert_time

# Color codes
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function: Get current timestamp
get_timestamp() {
    date -u +"%Y-%m-%dT%H:%M:%S.%3NZ"
}

# Function: Send alert (logs to audit and stderr)
send_alert() {
    local alert_type="$1"
    local message="$2"
    local severity="${3:-warning}"

    # Check cooldown
    local current_time
    current_time=$(date +%s)
    local last_alert="${last_alert_time[$alert_type]:-0}"

    if [[ $((current_time - last_alert)) -lt $ALERT_COOLDOWN ]]; then
        return 0  # Skip if in cooldown period
    fi

    last_alert_time[$alert_type]=$current_time

    # Log to audit system
    if command -v audit-logger.sh >/dev/null 2>&1; then
        audit-logger.sh security "resource_alert" "$message" "$severity"
    fi

    # Console output
    local color="$YELLOW"
    [[ "$severity" == "critical" ]] && color="$RED"

    echo -e "${color}[ALERT]${NC} $(get_timestamp) $alert_type: $message" >&2
}

# Function: Get CPU usage percentage
get_cpu_usage() {
    # Use top to get current CPU usage (average across all cores)
    if command -v top >/dev/null 2>&1; then
        # macOS and Linux compatible
        local cpu_idle
        cpu_idle=$(top -l 1 -n 0 2>/dev/null | grep "CPU usage" | awk '{print $7}' | tr -d '%' || \
                   top -bn1 2>/dev/null | grep "Cpu(s)" | awk '{print $8}' | tr -d '%id,')

        if [[ -n "$cpu_idle" ]]; then
            echo "scale=2; 100 - $cpu_idle" | bc
        else
            echo "0"
        fi
    else
        echo "0"
    fi
}

# Function: Get memory usage percentage
get_memory_usage() {
    if [[ -f /proc/meminfo ]]; then
        # Linux
        local mem_total
        local mem_available
        mem_total=$(grep MemTotal /proc/meminfo | awk '{print $2}')
        mem_available=$(grep MemAvailable /proc/meminfo | awk '{print $2}')

        echo "scale=2; 100 * (1 - $mem_available / $mem_total)" | bc
    elif command -v vm_stat >/dev/null 2>&1; then
        # macOS
        local page_size=4096
        local pages_free
        local pages_active
        local pages_inactive
        local pages_wired

        pages_free=$(vm_stat | grep "Pages free" | awk '{print $3}' | tr -d '.')
        pages_active=$(vm_stat | grep "Pages active" | awk '{print $3}' | tr -d '.')
        pages_inactive=$(vm_stat | grep "Pages inactive" | awk '{print $3}' | tr -d '.')
        pages_wired=$(vm_stat | grep "Pages wired down" | awk '{print $4}' | tr -d '.')

        local total_pages=$((pages_free + pages_active + pages_inactive + pages_wired))
        local used_pages=$((pages_active + pages_wired))

        echo "scale=2; 100 * $used_pages / $total_pages" | bc
    else
        echo "0"
    fi
}

# Function: Get disk usage percentage
get_disk_usage() {
    local mount_point="${1:-/workspace}"

    if df "$mount_point" >/dev/null 2>&1; then
        df "$mount_point" | tail -1 | awk '{print $5}' | tr -d '%'
    else
        echo "0"
    fi
}

# Function: Get PID usage (current/limit)
get_pid_usage() {
    local current_pids
    current_pids=$(ps aux | wc -l)

    local pid_limit
    if [[ -f /sys/fs/cgroup/pids.max ]]; then
        # cgroups v2
        pid_limit=$(cat /sys/fs/cgroup/pids.max)
        [[ "$pid_limit" == "max" ]] && pid_limit=32768
    elif [[ -f /sys/fs/cgroup/pids/pids.max ]]; then
        # cgroups v1
        pid_limit=$(cat /sys/fs/cgroup/pids/pids.max)
    else
        # Use ulimit as fallback
        pid_limit=$(ulimit -u)
    fi

    local usage_percent
    usage_percent=$(echo "scale=2; 100 * $current_pids / $pid_limit" | bc)

    echo "$usage_percent"
}

# Function: Monitor CPU and alert on threshold
monitor_cpu() {
    local cpu_usage
    cpu_usage=$(get_cpu_usage)
    cpu_usage=${cpu_usage%.*}  # Convert to integer

    if [[ $cpu_usage -gt $CPU_THRESHOLD ]]; then
        send_alert "cpu_high" "CPU usage at ${cpu_usage}% (threshold: ${CPU_THRESHOLD}%)" "warning"
    fi

    echo "$cpu_usage"
}

# Function: Monitor memory and alert on threshold
monitor_memory() {
    local mem_usage
    mem_usage=$(get_memory_usage)
    mem_usage=${mem_usage%.*}  # Convert to integer

    if [[ $mem_usage -gt $MEM_THRESHOLD ]]; then
        send_alert "memory_high" "Memory usage at ${mem_usage}% (threshold: ${MEM_THRESHOLD}%)" "warning"
    fi

    echo "$mem_usage"
}

# Function: Monitor disk and alert on threshold
monitor_disk() {
    local disk_usage
    disk_usage=$(get_disk_usage)

    if [[ $disk_usage -gt $DISK_THRESHOLD ]]; then
        send_alert "disk_high" "Disk usage at ${disk_usage}% (threshold: ${DISK_THRESHOLD}%)" "warning"
    fi

    echo "$disk_usage"
}

# Function: Monitor PIDs and alert on threshold
monitor_pids() {
    local pid_usage
    pid_usage=$(get_pid_usage)
    pid_usage=${pid_usage%.*}  # Convert to integer

    if [[ $pid_usage -gt $PID_THRESHOLD ]]; then
        send_alert "pid_high" "PID usage at ${pid_usage}% (threshold: ${PID_THRESHOLD}%)" "critical"
    fi

    echo "$pid_usage"
}

# Function: Display metrics in human-readable format
display_metrics() {
    local cpu="$1"
    local mem="$2"
    local disk="$3"
    local pids="$4"

    local timestamp
    timestamp=$(get_timestamp)

    # Color code based on thresholds
    local cpu_color="$GREEN"
    [[ ${cpu%.*} -gt $CPU_THRESHOLD ]] && cpu_color="$RED"

    local mem_color="$GREEN"
    [[ ${mem%.*} -gt $MEM_THRESHOLD ]] && mem_color="$RED"

    local disk_color="$GREEN"
    [[ $disk -gt $DISK_THRESHOLD ]] && disk_color="$RED"

    local pid_color="$GREEN"
    [[ ${pids%.*} -gt $PID_THRESHOLD ]] && pid_color="$RED"

    echo -e "${BLUE}[$timestamp]${NC} CPU: ${cpu_color}${cpu}%${NC} | MEM: ${mem_color}${mem}%${NC} | DISK: ${disk_color}${disk}%${NC} | PIDs: ${pid_color}${pids}%${NC}"
}

# Function: Export metrics in JSON format
export_metrics_json() {
    local cpu="$1"
    local mem="$2"
    local disk="$3"
    local pids="$4"

    cat <<EOF
{"timestamp":"$(get_timestamp)","cpu_percent":${cpu},"memory_percent":${mem},"disk_percent":${disk},"pid_percent":${pids}}
EOF
}

# Function: Continuous monitoring loop
monitor_loop() {
    echo "Starting resource monitoring (interval: ${MONITOR_INTERVAL}s)"
    echo "Thresholds: CPU=${CPU_THRESHOLD}%, MEM=${MEM_THRESHOLD}%, DISK=${DISK_THRESHOLD}%, PIDs=${PID_THRESHOLD}%"
    echo "Press Ctrl+C to stop"
    echo ""

    while true; do
        local cpu
        local mem
        local disk
        local pids

        cpu=$(monitor_cpu)
        mem=$(monitor_memory)
        disk=$(monitor_disk)
        pids=$(monitor_pids)

        display_metrics "$cpu" "$mem" "$disk" "$pids"

        sleep "$MONITOR_INTERVAL"
    done
}

# Function: One-shot metrics collection
get_metrics() {
    local format="${1:-human}"

    local cpu
    local mem
    local disk
    local pids

    cpu=$(monitor_cpu)
    mem=$(monitor_memory)
    disk=$(monitor_disk)
    pids=$(monitor_pids)

    case "$format" in
        json)
            export_metrics_json "$cpu" "$mem" "$disk" "$pids"
            ;;
        human|*)
            display_metrics "$cpu" "$mem" "$disk" "$pids"
            ;;
    esac
}

# Main command dispatcher
case "${1:-monitor}" in
    monitor)
        monitor_loop
        ;;
    once)
        get_metrics "${2:-human}"
        ;;
    cpu)
        monitor_cpu
        ;;
    memory|mem)
        monitor_memory
        ;;
    disk)
        monitor_disk
        ;;
    pids)
        monitor_pids
        ;;
    *)
        cat <<EOF
Usage: monitor-resources.sh [command] [options]

Commands:
  monitor           - Continuous monitoring (default)
  once [format]     - Single metrics snapshot (format: human|json)
  cpu               - CPU usage only
  memory|mem        - Memory usage only
  disk              - Disk usage only
  pids              - PID usage only

Environment Variables:
  MONITOR_INTERVAL  - Check interval in seconds (default: 5)
  CPU_THRESHOLD     - CPU alert threshold percentage (default: 90)
  MEM_THRESHOLD     - Memory alert threshold percentage (default: 85)
  DISK_THRESHOLD    - Disk alert threshold percentage (default: 90)
  PID_THRESHOLD     - PID alert threshold percentage (default: 80)

Examples:
  monitor-resources.sh                    # Continuous monitoring
  monitor-resources.sh once               # Single snapshot
  monitor-resources.sh once json          # JSON output
  CPU_THRESHOLD=80 monitor-resources.sh   # Lower CPU threshold
EOF
        exit 1
        ;;
esac

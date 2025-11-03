#!/bin/bash
# audit-logger.sh - Comprehensive audit logging system for Claude Code operations
# Logs all operations in JSON Lines format for centralized aggregation

set -euo pipefail

# Configuration
AUDIT_LOG_FILE="${CLAUDE_AUDIT_LOG:-/workspace/.claude/audit.log}"
LOG_DIR="$(dirname "$AUDIT_LOG_FILE")"

# Ensure log directory exists
mkdir -p "$LOG_DIR"
touch "$AUDIT_LOG_FILE"

# Color codes for console output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function: Log audit event in JSON Lines format
# Usage: log_event <type> <resource> <result> <duration_ms> [metadata]
log_event() {
    local type="$1"
    local resource="$2"
    local result="$3"
    local duration_ms="${4:-0}"
    local metadata="${5:-{}}"

    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

    local user="${USER:-unknown}"
    local pid="$$"
    local hostname="${HOSTNAME:-container}"

    # Build JSON event
    local json_event
    json_event=$(cat <<EOF
{"timestamp":"$timestamp","type":"$type","resource":"$resource","user":"$user","result":"$result","duration_ms":$duration_ms,"pid":$pid,"hostname":"$hostname","metadata":$metadata}
EOF
)

    # Write to audit log
    echo "$json_event" >> "$AUDIT_LOG_FILE"

    # Console output with color coding
    local color="$GREEN"
    case "$result" in
        failure|error) color="$RED" ;;
        warning) color="$YELLOW" ;;
        success) color="$GREEN" ;;
    esac

    echo -e "${color}[AUDIT]${NC} [$timestamp] $type: $resource -> $result (${duration_ms}ms)" >&2
}

# Function: Log file write operation
log_file_write() {
    local file_path="$1"
    local result="${2:-success}"
    local duration="${3:-0}"

    log_event "file_write" "$file_path" "$result" "$duration"
}

# Function: Log command execution
log_command_exec() {
    local command="$1"
    local result="${2:-success}"
    local duration="${3:-0}"
    local exit_code="${4:-0}"

    local metadata="{\"exit_code\":$exit_code}"
    log_event "command_exec" "$command" "$result" "$duration" "$metadata"
}

# Function: Log network request
log_network_request() {
    local url="$1"
    local result="${2:-success}"
    local duration="${3:-0}"
    local status_code="${4:-0}"

    local metadata="{\"status_code\":$status_code}"
    log_event "network_req" "$url" "$result" "$duration" "$metadata"
}

# Function: Log Git operation
log_git_operation() {
    local operation="$1"
    local target="$2"
    local result="${3:-success}"
    local duration="${4:-0}"

    log_event "git_$operation" "$target" "$result" "$duration"
}

# Function: Log security event
log_security_event() {
    local event_type="$1"
    local details="$2"
    local severity="${3:-warning}"

    local metadata="{\"severity\":\"$severity\",\"details\":\"$details\"}"
    log_event "security_event" "$event_type" "$severity" 0 "$metadata"
}

# Function: Get audit log statistics
audit_stats() {
    if [[ ! -f "$AUDIT_LOG_FILE" ]]; then
        echo "No audit log found at $AUDIT_LOG_FILE"
        return 1
    fi

    echo "=== Audit Log Statistics ==="
    echo "Log file: $AUDIT_LOG_FILE"
    echo "Total events: $(wc -l < "$AUDIT_LOG_FILE")"
    echo ""

    echo "Events by type:"
    jq -r '.type' "$AUDIT_LOG_FILE" 2>/dev/null | sort | uniq -c | sort -rn || echo "Error parsing JSON"
    echo ""

    echo "Events by result:"
    jq -r '.result' "$AUDIT_LOG_FILE" 2>/dev/null | sort | uniq -c | sort -rn || echo "Error parsing JSON"
    echo ""

    echo "Recent failures (last 10):"
    jq -r 'select(.result=="failure" or .result=="error") | "\(.timestamp) \(.type): \(.resource)"' "$AUDIT_LOG_FILE" 2>/dev/null | tail -10 || echo "No failures found"
}

# Function: Rotate audit logs
rotate_logs() {
    local max_size_mb="${1:-100}"
    local max_size_bytes=$((max_size_mb * 1024 * 1024))

    if [[ ! -f "$AUDIT_LOG_FILE" ]]; then
        return 0
    fi

    local file_size
    file_size=$(stat -f%z "$AUDIT_LOG_FILE" 2>/dev/null || stat -c%s "$AUDIT_LOG_FILE" 2>/dev/null)

    if [[ $file_size -gt $max_size_bytes ]]; then
        local timestamp
        timestamp=$(date +"%Y%m%d-%H%M%S")
        local archive_file="${AUDIT_LOG_FILE}.${timestamp}.gz"

        echo "Rotating audit log (size: $((file_size / 1024 / 1024))MB)"
        gzip -c "$AUDIT_LOG_FILE" > "$archive_file"
        > "$AUDIT_LOG_FILE"  # Truncate current log

        log_event "log_rotation" "$archive_file" "success" 0
    fi
}

# Function: Export logs to centralized logging system
export_logs() {
    local endpoint="${1:-}"

    if [[ -z "$endpoint" ]]; then
        echo "Usage: export_logs <endpoint_url>"
        return 1
    fi

    if [[ ! -f "$AUDIT_LOG_FILE" ]]; then
        echo "No audit log to export"
        return 1
    fi

    echo "Exporting audit logs to $endpoint..."

    local start_time
    start_time=$(date +%s%3N)

    local response
    response=$(curl -s -w "%{http_code}" -o /dev/null \
        -X POST "$endpoint" \
        -H "Content-Type: application/x-ndjson" \
        --data-binary "@$AUDIT_LOG_FILE" \
        --max-time 30)

    local end_time
    end_time=$(date +%s%3N)
    local duration=$((end_time - start_time))

    if [[ "$response" =~ ^2[0-9]{2}$ ]]; then
        log_event "log_export" "$endpoint" "success" "$duration" "{\"status_code\":$response}"
        echo "Successfully exported $(wc -l < "$AUDIT_LOG_FILE") events"
    else
        log_event "log_export" "$endpoint" "failure" "$duration" "{\"status_code\":$response}"
        echo "Failed to export logs (HTTP $response)"
        return 1
    fi
}

# Main command dispatcher
case "${1:-}" in
    file_write)
        log_file_write "$2" "${3:-success}" "${4:-0}"
        ;;
    command_exec)
        log_command_exec "$2" "${3:-success}" "${4:-0}" "${5:-0}"
        ;;
    network_req)
        log_network_request "$2" "${3:-success}" "${4:-0}" "${5:-0}"
        ;;
    git)
        log_git_operation "$2" "$3" "${4:-success}" "${5:-0}"
        ;;
    security)
        log_security_event "$2" "$3" "${4:-warning}"
        ;;
    stats)
        audit_stats
        ;;
    rotate)
        rotate_logs "${2:-100}"
        ;;
    export)
        export_logs "$2"
        ;;
    *)
        cat <<EOF
Usage: audit-logger.sh <command> [args...]

Commands:
  file_write <path> [result] [duration_ms]
  command_exec <command> [result] [duration_ms] [exit_code]
  network_req <url> [result] [duration_ms] [status_code]
  git <operation> <target> [result] [duration_ms]
  security <event_type> <details> [severity]
  stats                 - Display audit log statistics
  rotate [max_size_mb]  - Rotate logs if exceeding size (default: 100MB)
  export <endpoint>     - Export logs to centralized logging system

Examples:
  audit-logger.sh file_write /workspace/src/main/kotlin/App.kt success 45
  audit-logger.sh command_exec "./gradlew test" success 12340 0
  audit-logger.sh network_req "https://api.anthropic.com" success 234 200
  audit-logger.sh git commit "feat: add feature" success 500
  audit-logger.sh security firewall_violation "Blocked: example.com" critical
  audit-logger.sh stats
  audit-logger.sh rotate 50
  audit-logger.sh export https://logs.example.com/ingest
EOF
        exit 1
        ;;
esac

#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# dry-run-mode.sh
# ==============================================================================
# Simulate dangerous mode operations without executing them.
# Provides risk assessment and planning capabilities for dangerous operations.
#
# Usage:
#   dry-run-mode.sh [command...]
#   dry-run-mode.sh --simulate-session [duration]
#   dry-run-mode.sh --assess-operation [operation_type] [operation_args...]
#   dry-run-mode.sh --validate-config
#
# Examples:
#   dry-run-mode.sh git push origin feat/my-feature
#   dry-run-mode.sh rm -rf /some/directory
#   dry-run-mode.sh --simulate-session 1800
#   dry-run-mode.sh --assess-operation git_push_force origin main
#   dry-run-mode.sh --validate-config
#
# Features:
#   - Risk assessment for operations
#   - Allowlist/denylist checking
#   - Simulation of dangerous mode session
#   - Configuration validation
#   - Operation logging without execution
# ==============================================================================

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly CONFIG_FILE="${SCRIPT_DIR}/../config/dangerous-mode.json"
readonly DRY_RUN_LOG="/workspace/.claude/dry-run.log"
readonly AUDIT_SCRIPT="${SCRIPT_DIR}/audit-logger.sh"

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly MAGENTA='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m' # No Color

# Risk level colors
readonly RISK_LOW="$GREEN"
readonly RISK_MEDIUM="$YELLOW"
readonly RISK_HIGH="$RED"
readonly RISK_CRITICAL="$MAGENTA"

# ==============================================================================
# Utility Functions
# ==============================================================================

log() {
    echo -e "${BLUE}[DRY-RUN]${NC} $*"
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")] $*" >> "$DRY_RUN_LOG"
}

log_success() {
    echo -e "${GREEN}[DRY-RUN]${NC} ✓ $*"
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")] SUCCESS: $*" >> "$DRY_RUN_LOG"
}

log_warning() {
    echo -e "${YELLOW}[DRY-RUN]${NC} ⚠ $*"
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")] WARNING: $*" >> "$DRY_RUN_LOG"
}

log_error() {
    echo -e "${RED}[DRY-RUN]${NC} ✗ $*"
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")] ERROR: $*" >> "$DRY_RUN_LOG"
}

log_risk() {
    local level="$1"
    shift
    local message="$*"

    case "$level" in
        low)
            echo -e "${RISK_LOW}[RISK: LOW]${NC} $message"
            ;;
        medium)
            echo -e "${RISK_MEDIUM}[RISK: MEDIUM]${NC} $message"
            ;;
        high)
            echo -e "${RISK_HIGH}[RISK: HIGH]${NC} $message"
            ;;
        critical)
            echo -e "${RISK_CRITICAL}[RISK: CRITICAL]${NC} $message"
            ;;
    esac

    echo "[$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")] RISK_$level: $message" >> "$DRY_RUN_LOG"
}

# ==============================================================================
# Risk Assessment
# ==============================================================================

assess_git_operation() {
    local operation="$1"
    shift
    local args=("$@")

    log "Assessing git operation: $operation ${args[*]}"

    # Check for force push
    if [[ "$operation" == "push" && " ${args[*]} " =~ " --force " ]]; then
        log_risk critical "Force push detected - BLOCKED by denylist"
        echo "  Action: DENY"
        echo "  Reason: Force push can rewrite history and cause data loss"
        echo "  Alternative: Use --force-with-lease or coordinate with team"
        return 1
    fi

    # Check for push to protected branches
    if [[ "$operation" == "push" ]]; then
        local branch=""
        for arg in "${args[@]}"; do
            if [[ ! "$arg" =~ ^- ]]; then
                branch="$arg"
                break
            fi
        done

        if [[ "$branch" =~ ^(main|master|develop)$ ]]; then
            log_risk critical "Push to protected branch '$branch' - BLOCKED by denylist"
            echo "  Action: DENY"
            echo "  Reason: Protected branches require pull request workflow"
            return 1
        fi

        if [[ "$branch" =~ ^(feat|fix|refactor|test|docs|chore|build|ci)/ ]]; then
            log_risk medium "Push to feature branch '$branch' - requires confirmation"
            echo "  Action: REQUIRE_CONFIRMATION"
            echo "  Reason: Sharing work with remote requires explicit approval"
            return 0
        fi
    fi

    # Check for hard reset
    if [[ "$operation" == "reset" && " ${args[*]} " =~ " --hard " ]]; then
        log_risk critical "Hard reset detected - BLOCKED by denylist"
        echo "  Action: DENY"
        echo "  Reason: Hard reset discards uncommitted changes permanently"
        echo "  Alternative: Use 'git stash' to preserve changes"
        return 1
    fi

    # Safe operations
    if [[ "$operation" =~ ^(status|log|diff|show|branch)$ ]]; then
        log_risk low "Read-only git operation - ALLOWED"
        echo "  Action: ALLOW"
        return 0
    fi

    # Default: medium risk
    log_risk medium "Git operation requires assessment: $operation"
    echo "  Action: REQUIRE_CONFIRMATION"
    return 0
}

assess_file_operation() {
    local operation="$1"
    shift
    local paths=("$@")

    log "Assessing file operation: $operation ${paths[*]}"

    # Check for recursive delete
    if [[ "$operation" =~ ^(rm|delete)$ ]] && [[ " ${paths[*]} " =~ " -r" || " ${paths[*]} " =~ " -rf" ]]; then
        log_risk critical "Recursive delete detected - BLOCKED by denylist"
        echo "  Action: DENY"
        echo "  Reason: Recursive delete can cause irreversible data loss"
        echo "  Alternative: Delete files individually or use git rm for tracked files"
        return 1
    fi

    # Check for protected paths
    for path in "${paths[@]}"; do
        if [[ "$path" =~ ^\. || "$path" =~ ^/ ]]; then
            if [[ "$path" =~ \.(env|key|pem|pfx|credentials) ]]; then
                log_risk critical "Operation on credential file '$path' - BLOCKED"
                echo "  Action: DENY"
                echo "  Reason: Credential files must not be modified by automation"
                return 1
            fi

            if [[ "$path" =~ ^/etc/ || "$path" =~ ^/sys/ || "$path" =~ ^/proc/ ]]; then
                log_risk critical "System path modification '$path' - BLOCKED"
                echo "  Action: DENY"
                echo "  Reason: System paths are protected for security"
                return 1
            fi
        fi
    done

    # Check for allowed paths
    local allowed=false
    for path in "${paths[@]}"; do
        if [[ "$path" =~ ^/workspace/(src|docs|\.claude|build|\.devcontainer)/ ]]; then
            allowed=true
            break
        fi
    done

    if [ "$allowed" = true ]; then
        log_risk medium "File operation in allowed path - requires confirmation"
        echo "  Action: REQUIRE_CONFIRMATION"
        return 0
    fi

    # Read operations are low risk
    if [[ "$operation" =~ ^(cat|less|head|tail|grep|find)$ ]]; then
        log_risk low "Read-only file operation - ALLOWED"
        echo "  Action: ALLOW"
        return 0
    fi

    # Default: high risk for unknown paths
    log_risk high "File operation on unknown path - requires review"
    echo "  Action: REQUIRE_CONFIRMATION"
    return 0
}

assess_command() {
    local cmd="$1"
    shift
    local args=("$@")

    log "Assessing command: $cmd ${args[*]}"

    # Git operations
    if [[ "$cmd" == "git" ]]; then
        assess_git_operation "${args[@]}"
        return $?
    fi

    # File operations
    if [[ "$cmd" =~ ^(rm|mv|cp|touch|mkdir|rmdir)$ ]]; then
        assess_file_operation "$cmd" "${args[@]}"
        return $?
    fi

    # Build operations (generally safe)
    if [[ "$cmd" =~ ^(gradle|./gradlew|npm|yarn)$ ]]; then
        # Check for deployment tasks
        if [[ " ${args[*]} " =~ " deploy" || " ${args[*]} " =~ " publish" ]]; then
            log_risk high "Deployment command detected - BLOCKED"
            echo "  Action: DENY"
            echo "  Reason: Deployment requires manual approval"
            return 1
        fi

        log_risk low "Build/test command - ALLOWED"
        echo "  Action: ALLOW"
        return 0
    fi

    # System commands
    if [[ "$cmd" =~ ^(sudo|su|chmod|chown|systemctl|service)$ ]]; then
        log_risk critical "System command detected - BLOCKED"
        echo "  Action: DENY"
        echo "  Reason: System commands can compromise container security"
        return 1
    fi

    # Network commands
    if [[ "$cmd" =~ ^(curl|wget|ssh|scp|rsync)$ ]]; then
        log_risk medium "Network command - requires confirmation"
        echo "  Action: REQUIRE_CONFIRMATION"
        echo "  Reason: Network operations may have external side effects"
        return 0
    fi

    # Default: unknown command
    log_risk high "Unknown command - requires review"
    echo "  Action: REQUIRE_CONFIRMATION"
    return 0
}

# ==============================================================================
# Session Simulation
# ==============================================================================

simulate_session() {
    local duration="${1:-1800}"

    log "═══════════════════════════════════════════════════════════════════"
    log "  Simulating Dangerous Mode Session"
    log "═══════════════════════════════════════════════════════════════════"
    echo

    log "Session parameters:"
    echo "  Duration: $((duration / 60)) minutes"
    echo "  Start: $(date)"
    echo "  End: $(date -d "+${duration} seconds" 2>/dev/null || date -v "+${duration}S" 2>/dev/null || echo "Unknown")"
    echo

    # Simulate pre-flight checks
    log "Running pre-flight checks..."
    echo "  ✓ Devcontainer check"
    echo "  ✓ Circuit breaker status"
    echo "  ✓ Resource availability"
    echo "  ✓ Audit logging"
    echo "  ✓ Git repository state"
    echo "  ✓ Configuration validation"
    log_success "All pre-flight checks passed (simulated)"
    echo

    # Simulate enable
    log "Enabling dangerous mode (simulated)..."
    echo "  State file: /tmp/dangerous-mode-state (not created)"
    echo "  Monitoring: Started (simulated)"
    echo "  Audit logging: Active (simulated)"
    log_success "Dangerous mode enabled (simulated)"
    echo

    # Simulate operations
    log "Sample operations that would be allowed:"
    echo
    echo "  ALLOWED (low risk):"
    echo "    • git status, git log, git diff"
    echo "    • ./gradlew test, ./gradlew build"
    echo "    • File reads (cat, grep, find)"
    echo "    • Code quality checks (detekt, kover)"
    echo
    echo "  REQUIRES CONFIRMATION (medium risk):"
    echo "    • git push origin feat/my-branch"
    echo "    • File modifications in /workspace/src/"
    echo "    • File deletions"
    echo "    • Network requests"
    echo
    echo "  BLOCKED (high/critical risk):"
    echo "    • git push --force"
    echo "    • git reset --hard"
    echo "    • rm -rf"
    echo "    • Credential file access"
    echo "    • System configuration changes"
    echo
    log "═══════════════════════════════════════════════════════════════════"
    log_success "Session simulation complete"
}

# ==============================================================================
# Configuration Validation
# ==============================================================================

validate_config() {
    log "Validating configuration: $CONFIG_FILE"

    if [ ! -f "$CONFIG_FILE" ]; then
        log_error "Configuration file not found: $CONFIG_FILE"
        return 1
    fi

    if ! command -v jq &> /dev/null; then
        log_warning "jq not found, performing basic validation only"

        # Basic JSON syntax check
        if ! python3 -c "import json; json.load(open('$CONFIG_FILE'))" 2>/dev/null; then
            log_error "Invalid JSON syntax in configuration file"
            return 1
        fi

        log_success "Basic JSON validation passed"
        return 0
    fi

    # Validate JSON structure
    if ! jq empty "$CONFIG_FILE" 2>/dev/null; then
        log_error "Invalid JSON in configuration file"
        return 1
    fi

    log_success "JSON structure valid"

    # Check required fields
    local required_fields=(
        ".mode"
        ".timeouts"
        ".operationCategories.allowlist"
        ".operationCategories.denylist"
        ".operationCategories.requireConfirmation"
        ".safetyChecks"
        ".auditLogging"
    )

    local missing_fields=()
    for field in "${required_fields[@]}"; do
        if ! jq -e "$field" "$CONFIG_FILE" &> /dev/null; then
            missing_fields+=("$field")
        fi
    done

    if [ ${#missing_fields[@]} -gt 0 ]; then
        log_error "Missing required fields:"
        for field in "${missing_fields[@]}"; do
            echo "  - $field"
        done
        return 1
    fi

    log_success "All required fields present"

    # Display summary
    echo
    echo "Configuration Summary:"
    echo "  Version: $(jq -r '.version // "unknown"' "$CONFIG_FILE")"
    echo "  Default duration: $(jq -r '.mode.maxDuration // 1800' "$CONFIG_FILE") seconds"
    echo "  Allowlist categories: $(jq -r '.operationCategories.allowlist.operations | length' "$CONFIG_FILE")"
    echo "  Denylist categories: $(jq -r '.operationCategories.denylist.operations | length' "$CONFIG_FILE")"
    echo "  Confirmation required: $(jq -r '.operationCategories.requireConfirmation.operations | length' "$CONFIG_FILE")"
    echo "  Pre-flight checks: $(jq -r '.safetyChecks.preFlightChecks | length' "$CONFIG_FILE")"
    echo "  Emergency stop conditions: $(jq -r '.safetyChecks.emergencyStopConditions | length' "$CONFIG_FILE")"
    echo

    log_success "Configuration validation complete"
}

# ==============================================================================
# Main Execution
# ==============================================================================

show_usage() {
    cat <<EOF
Usage: dry-run-mode.sh [OPTIONS] [COMMAND...]

Simulate dangerous mode operations without executing them.

OPTIONS:
    --simulate-session [duration]     Simulate a dangerous mode session
    --assess-operation [op] [args]    Assess risk of specific operation
    --validate-config                 Validate configuration file
    --help                           Show this help message

EXAMPLES:
    # Assess a git push
    dry-run-mode.sh git push origin feat/my-branch

    # Assess a file deletion
    dry-run-mode.sh rm -rf /some/directory

    # Simulate 30-minute session
    dry-run-mode.sh --simulate-session 1800

    # Validate configuration
    dry-run-mode.sh --validate-config

EOF
}

main() {
    # Create dry-run log directory if needed
    local log_dir
    log_dir="$(dirname "$DRY_RUN_LOG")"
    mkdir -p "$log_dir"

    # Initialize log file
    if [ ! -f "$DRY_RUN_LOG" ]; then
        touch "$DRY_RUN_LOG"
    fi

    log "═══════════════════════════════════════════════════════════════════"
    log "  Dangerous Mode Dry Run"
    log "═══════════════════════════════════════════════════════════════════"
    echo

    # Parse options
    if [ $# -eq 0 ]; then
        show_usage
        exit 0
    fi

    case "$1" in
        --simulate-session)
            simulate_session "${2:-1800}"
            ;;
        --assess-operation)
            shift
            assess_command "$@"
            ;;
        --validate-config)
            validate_config
            ;;
        --help|-h)
            show_usage
            exit 0
            ;;
        *)
            # Assess the provided command
            log "Assessing command: $*"
            echo
            assess_command "$@"
            ;;
    esac

    echo
    log "Dry run log: $DRY_RUN_LOG"
}

# Run main function
main "$@"

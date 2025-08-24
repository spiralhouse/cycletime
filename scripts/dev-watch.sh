#!/bin/bash

# CycleTime Development File Watcher Script
# SPI-479: Enhance local development experience
# 
# This script provides file watching and automatic execution for development tasks.
# It can watch for file changes and trigger builds, tests, or server restarts.

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WATCH_DIRS=("src/main/kotlin" "src/main/resources" "src/test/kotlin")
EXCLUDE_PATTERNS=("*.tmp" "*.log" "*.class" "build/*" ".git/*")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are available
check_dependencies() {
    local missing_deps=()
    
    if ! command -v fswatch >/dev/null 2>&1; then
        missing_deps+=("fswatch")
    fi
    
    if ! command -v ./gradlew >/dev/null 2>&1; then
        log_error "gradlew not found in project root"
        return 1
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Missing dependencies: ${missing_deps[*]}"
        log_info "Install fswatch:"
        log_info "  macOS: brew install fswatch"
        log_info "  Ubuntu: sudo apt-get install fswatch"
        log_info "  Alternative: Use 'inotifywait' on Linux"
        return 1
    fi
    
    return 0
}

# Debounce function to avoid rapid repeated executions
debounce() {
    local debounce_file="/tmp/cycletime-dev-debounce"
    local debounce_time=2  # seconds
    
    if [ -f "$debounce_file" ]; then
        local last_run=$(cat "$debounce_file")
        local current_time=$(date +%s)
        local time_diff=$((current_time - last_run))
        
        if [ $time_diff -lt $debounce_time ]; then
            return 1  # Skip execution
        fi
    fi
    
    echo $(date +%s) > "$debounce_file"
    return 0
}

# Test watcher - automatically run tests when source changes
watch_tests() {
    log_info "Starting test watcher..."
    log_info "Watching directories: ${WATCH_DIRS[*]}"
    log_info "Press Ctrl+C to stop"
    
    cd "$PROJECT_ROOT"
    
    # Build exclude patterns for fswatch
    local exclude_args=()
    for pattern in "${EXCLUDE_PATTERNS[@]}"; do
        exclude_args+=("--exclude" "$pattern")
    done
    
    # Start watching
    fswatch -o "${exclude_args[@]}" "${WATCH_DIRS[@]}" | while read num; do
        if debounce; then
            log_info "File changes detected, running tests..."
            
            if ./gradlew quickTest --build-cache; then
                log_success "Tests passed ✅"
            else
                log_error "Tests failed ❌"
            fi
            
            echo "---"
        fi
    done
}

# Build watcher - automatically build when source changes
watch_build() {
    log_info "Starting build watcher..."
    log_info "Watching directories: ${WATCH_DIRS[*]}"
    log_info "Press Ctrl+C to stop"
    
    cd "$PROJECT_ROOT"
    
    # Build exclude patterns for fswatch
    local exclude_args=()
    for pattern in "${EXCLUDE_PATTERNS[@]}"; do
        exclude_args+=("--exclude" "$pattern")
    done
    
    # Start watching
    fswatch -o "${exclude_args[@]}" "${WATCH_DIRS[@]}" | while read num; do
        if debounce; then
            log_info "File changes detected, building..."
            
            if ./gradlew classes --build-cache; then
                log_success "Build completed ✅"
            else
                log_error "Build failed ❌"
            fi
            
            echo "---"
        fi
    done
}

# Server watcher - restart development server when changes occur
watch_server() {
    log_info "Starting server watcher..."
    log_info "This will restart the development server when source files change"
    log_info "Note: Consider using './gradlew devRun --continuous' instead for better integration"
    log_info "Press Ctrl+C to stop"
    
    cd "$PROJECT_ROOT"
    
    # Kill any existing development server
    pkill -f "cycletime.*development" || true
    
    # Start initial server in background
    ./gradlew devRun &
    local server_pid=$!
    
    # Build exclude patterns for fswatch
    local exclude_args=()
    for pattern in "${EXCLUDE_PATTERNS[@]}"; do
        exclude_args+=("--exclude" "$pattern")
    done
    
    # Watch for changes and restart server
    fswatch -o "${exclude_args[@]}" src/main/kotlin src/main/resources | while read num; do
        if debounce; then
            log_info "File changes detected, restarting server..."
            
            # Kill existing server
            kill $server_pid 2>/dev/null || true
            wait $server_pid 2>/dev/null || true
            
            # Build first
            if ./gradlew classes --build-cache; then
                log_info "Starting development server..."
                ./gradlew devRun &
                server_pid=$!
                log_success "Server restarted ✅"
            else
                log_error "Build failed, server not restarted ❌"
            fi
            
            echo "---"
        fi
    done
}

# Show usage information
show_usage() {
    cat << EOF
CycleTime Development File Watcher

Usage: $0 [COMMAND]

Commands:
    tests      Watch for file changes and automatically run tests
    build      Watch for file changes and automatically build
    server     Watch for file changes and restart development server
    help       Show this help message

Examples:
    $0 tests       # Start test watcher
    $0 build       # Start build watcher
    $0 server      # Start server watcher with restart

Tips:
    • Use multiple terminals to run different watchers simultaneously
    • Consider using Gradle's built-in continuous mode:
      ./gradlew devRun --continuous
      ./gradlew testWatch --continuous
    • The server watcher is experimental - prefer Gradle's continuous mode

Dependencies:
    • fswatch (install via: brew install fswatch)
    • gradlew (should be in project root)

EOF
}

# Main script logic
main() {
    local command="${1:-help}"
    
    case "$command" in
        "tests"|"test")
            if check_dependencies; then
                watch_tests
            fi
            ;;
        "build")
            if check_dependencies; then
                watch_build
            fi
            ;;
        "server")
            if check_dependencies; then
                watch_server
            fi
            ;;
        "help"|"-h"|"--help")
            show_usage
            ;;
        *)
            log_error "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
}

# Cleanup function
cleanup() {
    log_info "Cleaning up..."
    # Kill any background processes
    jobs -p | xargs -r kill 2>/dev/null || true
    rm -f /tmp/cycletime-dev-debounce
    exit 0
}

# Set up signal handling
trap cleanup INT TERM

# Run main function
main "$@"
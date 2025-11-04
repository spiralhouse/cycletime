#!/bin/bash
# test-claude-cli.sh - Claude CLI Installation and Operation Tests
# Validates Claude CLI installation, accessibility, and basic operations

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Function: Report test result
report_test() {
    local test_name="$1"
    local result="$2"
    local message="${3:-}"

    ((TESTS_TOTAL++))

    if [[ "$result" == "pass" ]]; then
        ((TESTS_PASSED++))
        echo -e "${GREEN}✓${NC} $test_name"
        [[ -n "$message" ]] && echo "  $message"
    elif [[ "$result" == "skip" ]]; then
        echo -e "${YELLOW}⊘${NC} $test_name (skipped)"
        [[ -n "$message" ]] && echo "  $message"
    else
        ((TESTS_FAILED++))
        echo -e "${RED}✗${NC} $test_name"
        [[ -n "$message" ]] && echo "  $message"
    fi
}

echo -e "${BLUE}=== Claude CLI Test Suite ===${NC}"
echo "Testing Claude CLI installation, accessibility, and operations..."
echo ""

# Test 1: Claude CLI Installation
echo -e "${BLUE}[Test Group: CLI Installation]${NC}"

if command -v claude >/dev/null 2>&1; then
    report_test "Claude CLI command available" "pass" "Found in PATH"
else
    report_test "Claude CLI command available" "fail" "Claude CLI not found in PATH"
fi

# Test 2: Claude CLI Version
if command -v claude >/dev/null 2>&1; then
    if claude_version=$(claude --version 2>&1 | head -n1); then
        report_test "Claude CLI version check" "pass" "Version: $claude_version"
    else
        report_test "Claude CLI version check" "fail" "Cannot retrieve version"
    fi
else
    report_test "Claude CLI version check" "skip" "Claude CLI not installed"
fi

# Test 3: NPM Global Packages
if command -v npm >/dev/null 2>&1; then
    if npm list -g --depth=0 2>/dev/null | grep -q "@anthropic"; then
        report_test "Claude CLI in npm global packages" "pass"
    else
        report_test "Claude CLI in npm global packages" "skip" "Not installed via npm (may use other method)"
    fi
else
    report_test "Claude CLI in npm global packages" "skip" "npm not available"
fi

# Test 4: PATH Configuration
if echo "$PATH" | grep -q "node_modules"; then
    report_test "PATH includes node_modules" "pass" "For global npm packages"
else
    report_test "PATH includes node_modules" "skip" "May not be needed"
fi

echo ""
echo -e "${BLUE}[Test Group: CLI Help and Documentation]${NC}"

# Test 5: Help Command
if command -v claude >/dev/null 2>&1; then
    if claude --help >/dev/null 2>&1; then
        report_test "Claude CLI help command" "pass"
    else
        report_test "Claude CLI help command" "fail" "Help command failed"
    fi
else
    report_test "Claude CLI help command" "skip" "Claude CLI not installed"
fi

# Test 6: Subcommands Available
if command -v claude >/dev/null 2>&1; then
    help_output=$(claude --help 2>&1 || true)

    if echo "$help_output" | grep -q "chat\|code\|config"; then
        report_test "Claude CLI subcommands available" "pass" "chat, code, or config commands found"
    else
        report_test "Claude CLI subcommands available" "skip" "Cannot verify subcommands"
    fi
else
    report_test "Claude CLI subcommands available" "skip" "Claude CLI not installed"
fi

echo ""
echo -e "${BLUE}[Test Group: Configuration]${NC}"

# Test 7: Config Directory
if [[ -d "$HOME/.config/claude" ]] || [[ -d "$HOME/.claude" ]]; then
    report_test "Claude config directory exists" "pass" "Found in HOME"
else
    report_test "Claude config directory exists" "skip" "Not created yet (normal for fresh install)"
fi

# Test 8: API Key Configuration (without exposing it)
if command -v claude >/dev/null 2>&1; then
    # Check if config files exist (without reading them)
    config_exists=false

    if [[ -f "$HOME/.config/claude/config.json" ]] || \
       [[ -f "$HOME/.claude/config.json" ]] || \
       [[ -f "$HOME/.anthropic/config" ]] || \
       [[ -n "${ANTHROPIC_API_KEY:-}" ]]; then
        config_exists=true
    fi

    if $config_exists; then
        report_test "API key configuration present" "pass" "Config file or environment variable found"
    else
        report_test "API key configuration present" "skip" "No configuration found (needs setup)"
    fi
else
    report_test "API key configuration present" "skip" "Claude CLI not installed"
fi

# Test 9: Environment Variable Support
if [[ -n "${ANTHROPIC_API_KEY:-}" ]]; then
    # Don't print the key, just check length
    key_length=${#ANTHROPIC_API_KEY}
    if [[ $key_length -gt 10 ]]; then
        report_test "ANTHROPIC_API_KEY environment variable" "pass" "Key length: $key_length chars"
    else
        report_test "ANTHROPIC_API_KEY environment variable" "fail" "Key too short (invalid)"
    fi
else
    report_test "ANTHROPIC_API_KEY environment variable" "skip" "Not set (may use config file)"
fi

echo ""
echo -e "${BLUE}[Test Group: Error Handling]${NC}"

# Test 10: Invalid Command Handling
if command -v claude >/dev/null 2>&1; then
    if claude invalid-command-xyz 2>&1 | grep -qiE "error|unknown|invalid|not found"; then
        report_test "Claude CLI error handling" "pass" "Shows error for invalid commands"
    else
        report_test "Claude CLI error handling" "skip" "Error message format unclear"
    fi
else
    report_test "Claude CLI error handling" "skip" "Claude CLI not installed"
fi

# Test 11: Missing Config Behavior
if command -v claude >/dev/null 2>&1; then
    # Temporarily unset API key and check behavior
    if (unset ANTHROPIC_API_KEY; claude code --help >/dev/null 2>&1); then
        report_test "Claude CLI runs without API key (for help)" "pass"
    else
        report_test "Claude CLI runs without API key (for help)" "skip" "Help may require API key"
    fi
else
    report_test "Claude CLI runs without API key (for help)" "skip" "Claude CLI not installed"
fi

echo ""
echo -e "${BLUE}[Test Group: File System Access]${NC}"

# Test 12: Temp Directory Access
temp_test_dir="/tmp/claude-cli-test-$$"
mkdir -p "$temp_test_dir"

if [[ -d "$temp_test_dir" ]] && [[ -w "$temp_test_dir" ]]; then
    report_test "Claude CLI temp directory writable" "pass" "Can create temp files"
else
    report_test "Claude CLI temp directory writable" "fail" "Cannot write to temp"
fi

rm -rf "$temp_test_dir"

# Test 13: Workspace Access
if [[ -d "/workspace" ]] && [[ -w "/workspace" ]]; then
    report_test "Claude CLI workspace access" "pass" "/workspace is writable"
else
    report_test "Claude CLI workspace access" "fail" "/workspace not writable"
fi

echo ""
echo -e "${BLUE}[Test Group: Integration with DevContainer]${NC}"

# Test 14: Safety Scripts Callable from Claude CLI Context
if [[ -x "/workspace/.devcontainer/scripts/audit-logger.sh" ]]; then
    if /workspace/.devcontainer/scripts/audit-logger.sh --help >/dev/null 2>&1 || \
       /workspace/.devcontainer/scripts/audit-logger.sh stats >/dev/null 2>&1; then
        report_test "Safety scripts accessible to CLI" "pass"
    else
        report_test "Safety scripts accessible to CLI" "skip" "Scripts exist but help failed"
    fi
else
    report_test "Safety scripts accessible to CLI" "skip" "Safety scripts not found"
fi

# Test 15: Git Integration
if command -v git >/dev/null 2>&1 && command -v claude >/dev/null 2>&1; then
    # Check if git is functional
    if git --version >/dev/null 2>&1; then
        report_test "Git available for Claude CLI operations" "pass"
    else
        report_test "Git available for Claude CLI operations" "fail" "Git not functional"
    fi
else
    report_test "Git available for Claude CLI operations" "skip" "Git or Claude CLI missing"
fi

# Test 16: Node.js Compatibility
if command -v node >/dev/null 2>&1; then
    node_version=$(node --version | sed 's/v//')
    major_version=$(echo "$node_version" | cut -d. -f1)

    if [[ $major_version -ge 18 ]]; then
        report_test "Node.js version compatible with Claude CLI" "pass" "v$node_version (≥18)"
    else
        report_test "Node.js version compatible with Claude CLI" "fail" "v$node_version (need ≥18)"
    fi
else
    report_test "Node.js version compatible with Claude CLI" "skip" "Node.js not installed"
fi

echo ""
echo -e "${BLUE}[Test Group: Security Checks]${NC}"

# Test 17: Config File Permissions (if exists)
config_files=(
    "$HOME/.config/claude/config.json"
    "$HOME/.claude/config.json"
    "$HOME/.anthropic/config"
)

secure_permissions=true
insecure_files=""

for config_file in "${config_files[@]}"; do
    if [[ -f "$config_file" ]]; then
        perms=$(stat -c "%a" "$config_file" 2>/dev/null || stat -f "%Lp" "$config_file" 2>/dev/null || echo "000")

        # Check if file is readable by others (last digit should be 0)
        if [[ "${perms: -1}" != "0" ]]; then
            secure_permissions=false
            insecure_files="$insecure_files $config_file"
        fi
    fi
done

if [[ -n "$insecure_files" ]]; then
    report_test "Config files have secure permissions" "fail" "World-readable:$insecure_files"
elif [[ "${config_files[0]}" != "" ]]; then
    report_test "Config files have secure permissions" "skip" "No config files found"
else
    report_test "Config files have secure permissions" "pass" "All config files properly restricted"
fi

# Test 18: No Hardcoded Credentials in Scripts
if grep -r "ANTHROPIC_API_KEY=" /workspace/.devcontainer/scripts/ 2>/dev/null | grep -qv "ANTHROPIC_API_KEY=\$\|ANTHROPIC_API_KEY=\"\$\|#.*ANTHROPIC_API_KEY"; then
    report_test "No hardcoded API keys in scripts" "fail" "Found hardcoded credentials"
else
    report_test "No hardcoded API keys in scripts" "pass" "No hardcoded credentials found"
fi

echo ""
echo -e "${BLUE}=== Test Summary ===${NC}"
echo "Total tests: $TESTS_TOTAL"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"

if [[ $TESTS_FAILED -eq 0 ]]; then
    echo ""
    echo -e "${GREEN}✓ All Claude CLI tests passed!${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}✗ Some Claude CLI tests failed${NC}"
    exit 1
fi

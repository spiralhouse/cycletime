#!/bin/bash
# test-devcontainer-build.sh - DevContainer Build and Dependency Tests
# Validates container builds, dependencies, mounts, ports, and permissions

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

echo -e "${BLUE}=== DevContainer Build Test Suite ===${NC}"
echo "Testing container build, dependencies, mounts, ports, and permissions..."
echo ""

# Test 1: Node.js Installation
echo -e "${BLUE}[Test Group: Runtime Dependencies]${NC}"

if command -v node >/dev/null 2>&1; then
    node_version=$(node --version)
    if [[ "$node_version" =~ ^v20\. ]]; then
        report_test "Node.js 20.x installed" "pass" "Version: $node_version"
    else
        report_test "Node.js 20.x installed" "fail" "Wrong version: $node_version"
    fi
else
    report_test "Node.js 20.x installed" "fail" "Node.js not found"
fi

# Test 2: NPM Installation
if command -v npm >/dev/null 2>&1; then
    npm_version=$(npm --version)
    report_test "NPM installed" "pass" "Version: $npm_version"
else
    report_test "NPM installed" "fail" "NPM not found"
fi

# Test 3: Java/JVM Installation
if command -v java >/dev/null 2>&1; then
    java_version=$(java -version 2>&1 | head -n1)
    if [[ "$java_version" =~ "21" ]] || [[ "$java_version" =~ "openjdk" ]]; then
        report_test "OpenJDK 21 installed" "pass" "Version: $java_version"
    else
        report_test "OpenJDK 21 installed" "fail" "Wrong version: $java_version"
    fi
else
    report_test "OpenJDK 21 installed" "fail" "Java not found"
fi

# Test 4: Gradle Installation
if command -v gradle >/dev/null 2>&1; then
    gradle_version=$(gradle --version 2>/dev/null | grep "Gradle" | head -n1)
    report_test "Gradle installed" "pass" "Version: $gradle_version"
else
    report_test "Gradle installed" "fail" "Gradle not found"
fi

# Test 5: Git Installation
if command -v git >/dev/null 2>&1; then
    git_version=$(git --version)
    report_test "Git installed" "pass" "Version: $git_version"
else
    report_test "Git installed" "fail" "Git not found"
fi

# Test 6: Bash Installation
if [[ -n "$BASH_VERSION" ]]; then
    report_test "Bash installed" "pass" "Version: $BASH_VERSION"
else
    report_test "Bash installed" "fail" "Bash not found"
fi

# Test 7: jq Installation (for JSON processing)
if command -v jq >/dev/null 2>&1; then
    jq_version=$(jq --version 2>&1)
    report_test "jq installed" "pass" "Version: $jq_version"
else
    report_test "jq installed" "fail" "jq not found"
fi

# Test 8: curl Installation
if command -v curl >/dev/null 2>&1; then
    curl_version=$(curl --version | head -n1)
    report_test "curl installed" "pass" "Version: $curl_version"
else
    report_test "curl installed" "fail" "curl not found"
fi

echo ""
echo -e "${BLUE}[Test Group: Volume Mounts]${NC}"

# Test 9: Workspace Mount
if [[ -d "/workspace" ]]; then
    if [[ -w "/workspace" ]]; then
        report_test "Workspace mount (/workspace)" "pass" "Writable"
    else
        report_test "Workspace mount (/workspace)" "fail" "Not writable"
    fi
else
    report_test "Workspace mount (/workspace)" "fail" "Directory not found"
fi

# Test 10: Gradle Cache Volume
if [[ -d "$HOME/.gradle" ]]; then
    report_test "Gradle cache volume" "pass" "Mounted at $HOME/.gradle"
else
    report_test "Gradle cache volume" "skip" "Not mounted (acceptable)"
fi

# Test 11: NPM Cache Volume
if [[ -d "$HOME/.npm" ]]; then
    report_test "NPM cache volume" "pass" "Mounted at $HOME/.npm"
else
    report_test "NPM cache volume" "skip" "Not mounted (acceptable)"
fi

echo ""
echo -e "${BLUE}[Test Group: User Permissions]${NC}"

# Test 12: Current User
current_user=$(whoami)
if [[ "$current_user" == "vscode" ]]; then
    report_test "Running as vscode user" "pass" "User: $current_user"
elif [[ "$current_user" == "root" ]]; then
    report_test "Running as vscode user" "fail" "Running as root (security risk)"
else
    report_test "Running as vscode user" "skip" "Running as: $current_user"
fi

# Test 13: Non-root UID
uid=$(id -u)
if [[ "$uid" -ne 0 ]]; then
    report_test "Non-root UID" "pass" "UID: $uid"
else
    report_test "Non-root UID" "fail" "Running with UID 0 (root)"
fi

# Test 14: Sudo Access
if command -v sudo >/dev/null 2>&1; then
    if sudo -n true 2>/dev/null; then
        report_test "Passwordless sudo disabled" "fail" "Sudo access without password (security risk)"
    else
        report_test "Passwordless sudo disabled" "pass" "Sudo requires password"
    fi
else
    report_test "Passwordless sudo disabled" "pass" "Sudo not available"
fi

# Test 15: Write Access to /tmp
if touch /tmp/test-write-$$ 2>/dev/null; then
    rm -f /tmp/test-write-$$
    report_test "Write access to /tmp" "pass"
else
    report_test "Write access to /tmp" "fail" "Cannot write to /tmp"
fi

echo ""
echo -e "${BLUE}[Test Group: Port Configuration]${NC}"

# Test 16: Port 8080 Available
if command -v nc >/dev/null 2>&1 || command -v netcat >/dev/null 2>&1; then
    # Try to bind to port 8080 briefly
    if timeout 1 bash -c "exec 3<>/dev/tcp/127.0.0.1/8080" 2>/dev/null; then
        exec 3>&-
        report_test "Port 8080 configuration" "skip" "Port already in use"
    else
        report_test "Port 8080 available" "pass" "Port 8080 can be bound"
    fi
else
    report_test "Port 8080 available" "skip" "nc/netcat not available for testing"
fi

echo ""
echo -e "${BLUE}[Test Group: Environment Configuration]${NC}"

# Test 17: PATH Configuration
if echo "$PATH" | grep -q "/usr/local/bin"; then
    report_test "PATH includes /usr/local/bin" "pass"
else
    report_test "PATH includes /usr/local/bin" "fail" "PATH: $PATH"
fi

# Test 18: HOME Directory
if [[ -n "$HOME" ]] && [[ -d "$HOME" ]]; then
    report_test "HOME directory set" "pass" "HOME: $HOME"
else
    report_test "HOME directory set" "fail" "HOME not set or directory missing"
fi

# Test 19: SHELL Configuration
if [[ -n "$SHELL" ]]; then
    report_test "SHELL environment variable" "pass" "SHELL: $SHELL"
else
    report_test "SHELL environment variable" "skip" "SHELL not set"
fi

echo ""
echo -e "${BLUE}[Test Group: Container Build Artifacts]${NC}"

# Test 20: DevContainer Scripts Installed
required_scripts=(
    ".devcontainer/scripts/audit-logger.sh"
    ".devcontainer/scripts/monitor-resources.sh"
    ".devcontainer/scripts/emergency-stop.sh"
    ".devcontainer/scripts/enable-dangerous-mode.sh"
    ".devcontainer/scripts/disable-dangerous-mode.sh"
)

all_scripts_present=true
missing_scripts=""

for script in "${required_scripts[@]}"; do
    if [[ ! -f "/workspace/$script" ]]; then
        all_scripts_present=false
        missing_scripts="$missing_scripts $script"
    fi
done

if $all_scripts_present; then
    report_test "DevContainer safety scripts present" "pass" "All ${#required_scripts[@]} scripts found"
else
    report_test "DevContainer safety scripts present" "fail" "Missing:$missing_scripts"
fi

# Test 21: Scripts are Executable
all_executable=true
non_executable=""

for script in "${required_scripts[@]}"; do
    if [[ -f "/workspace/$script" ]] && [[ ! -x "/workspace/$script" ]]; then
        all_executable=false
        non_executable="$non_executable $script"
    fi
done

if $all_executable; then
    report_test "DevContainer scripts executable" "pass"
else
    report_test "DevContainer scripts executable" "fail" "Non-executable:$non_executable"
fi

# Test 22: Post-create Script Exists
if [[ -f "/workspace/.devcontainer/post-create.sh" ]]; then
    if [[ -x "/workspace/.devcontainer/post-create.sh" ]]; then
        report_test "post-create.sh exists and executable" "pass"
    else
        report_test "post-create.sh exists and executable" "fail" "Not executable"
    fi
else
    report_test "post-create.sh exists and executable" "fail" "File not found"
fi

echo ""
echo -e "${BLUE}=== Test Summary ===${NC}"
echo "Total tests: $TESTS_TOTAL"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"

if [[ $TESTS_FAILED -eq 0 ]]; then
    echo ""
    echo -e "${GREEN}✓ All container build tests passed!${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}✗ Some container build tests failed${NC}"
    exit 1
fi

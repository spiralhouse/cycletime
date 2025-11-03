#!/bin/bash
# Post-create script for CycleTime devcontainer
# Runs after the container is created to set up the development environment

set -e

echo "========================================="
echo "CycleTime DevContainer Post-Create Setup"
echo "========================================="
echo ""

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# 1. Configure Git
print_step "Configuring Git..."
git config --global --add safe.directory /workspace
git config --global init.defaultBranch main
git config --global pull.rebase false

# Set placeholder git identity if not already configured
if ! git config --global user.email > /dev/null 2>&1; then
    git config --global user.email "dev@cycletime.local"
    git config --global user.name "CycleTime Developer"
    print_warning "Git identity set to placeholder. Update with: git config --global user.email 'your@email.com'"
else
    print_success "Git identity already configured"
fi

print_success "Git configured"

# 2. Initialize Gradle wrapper
print_step "Checking Gradle wrapper..."
if [ -f "./gradlew" ]; then
    chmod +x ./gradlew
    print_success "Gradle wrapper executable"

    # Verify Gradle works
    ./gradlew --version > /dev/null 2>&1 && print_success "Gradle wrapper verified" || print_warning "Gradle wrapper check failed"
else
    print_warning "No gradlew found in workspace"
fi

# 3. Verify Java environment
print_step "Verifying Java environment..."
java -version 2>&1 | head -n 1
print_success "Java available"

# 4. Verify Node.js environment
print_step "Verifying Node.js environment..."
node --version
npm --version
print_success "Node.js available"

# 5. Set up shell completions
print_step "Setting up shell completions..."
if [ -f "./gradlew" ]; then
    ./gradlew --completion-script > ~/.gradle-completion.bash 2>/dev/null || true
    echo "source ~/.gradle-completion.bash" >> ~/.bashrc 2>/dev/null || true
    print_success "Gradle completion configured"
fi

# 6. Create useful aliases
print_step "Setting up aliases..."
cat >> ~/.bashrc << 'EOF'

# CycleTime Development Aliases
alias gw='./gradlew'
alias gwb='./gradlew build'
alias gwt='./gradlew test'
alias gwc='./gradlew clean'
alias gwut='./gradlew unitTest'
alias gwit='./gradlew integrationTest'
alias gwr='./gradlew run'
alias gwdr='./gradlew devRun --continuous'
alias gwbs='./gradlew buildStatus'

# Git aliases
alias gs='git status'
alias gp='git pull'
alias gc='git commit'
alias gca='git commit --amend'
alias gl='git log --oneline --graph --all -20'

EOF
print_success "Aliases configured"

# 7. Display workspace info
echo ""
echo "========================================="
echo "Workspace Information"
echo "========================================="
echo "Working directory: $(pwd)"
echo "Java version: $(java -version 2>&1 | head -n 1)"
echo "Node version: $(node --version)"
echo "Gradle: $([ -f "./gradlew" ] && echo "Available (./gradlew)" || echo "Not found")"
echo ""

# 8. Health checks
print_step "Running health checks..."

# Check if database file exists
if [ -f "cycletime-ce.db" ]; then
    print_success "Database file found: cycletime-ce.db"
else
    print_warning "Database file not found (will be created on first run)"
fi

# Check build artifacts
if [ -d "build" ]; then
    print_warning "Build directory exists (consider running './gradlew clean' for fresh build)"
else
    print_success "Clean workspace (no build artifacts)"
fi

# 9. Display next steps
echo ""
echo "========================================="
echo "DevContainer Setup Complete!"
echo "========================================="
echo ""
echo "Quick Start Commands:"
echo "  ./gradlew build          - Build the project"
echo "  ./gradlew test           - Run tests"
echo "  ./gradlew run            - Start the MCP server"
echo "  ./gradlew devRun --continuous - Development mode with hot-reload"
echo "  ./gradlew buildStatus    - Show build configuration"
echo ""
echo "Helpful Aliases (reload shell with 'source ~/.bashrc'):"
echo "  gw     - ./gradlew"
echo "  gwb    - ./gradlew build"
echo "  gwt    - ./gradlew test"
echo "  gwdr   - ./gradlew devRun --continuous"
echo "  gs     - git status"
echo ""
echo "Documentation: docs/"
echo "Health endpoint: http://localhost:8080/health (when server running)"
echo ""

print_success "Ready to develop!"
echo ""

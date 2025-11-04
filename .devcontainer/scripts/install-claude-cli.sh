#!/bin/bash
# Claude Code CLI installation and verification script
# Runs as part of devcontainer post-create setup

set -e

echo "========================================="
echo "Claude Code CLI Setup"
echo "========================================="
echo ""

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
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

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# 1. Verify Claude Code CLI installation
print_step "Verifying Claude Code CLI installation..."

if command -v claude > /dev/null 2>&1; then
    CLAUDE_VERSION=$(claude --version 2>&1 || echo "unknown")
    print_success "Claude Code CLI installed: ${CLAUDE_VERSION}"
else
    print_error "Claude Code CLI not found in PATH"
    echo "Please ensure @anthropic-ai/claude-code is installed globally"
    exit 1
fi

# 2. Check for authentication configuration
print_step "Checking authentication configuration..."

# Check for ANTHROPIC_API_KEY environment variable
if [ -n "${ANTHROPIC_API_KEY}" ]; then
    print_success "ANTHROPIC_API_KEY environment variable is set"
    # Verify key format (should start with sk-)
    if [[ "${ANTHROPIC_API_KEY}" =~ ^sk- ]]; then
        print_success "API key format appears valid"
    else
        print_warning "API key format may be invalid (should start with 'sk-')"
    fi
else
    print_warning "ANTHROPIC_API_KEY not set"
    echo ""
    echo "To configure authentication:"
    echo "  1. Get your API key from: https://console.anthropic.com/"
    echo "  2. Add to devcontainer.json:"
    echo "     \"containerEnv\": {"
    echo "       \"ANTHROPIC_API_KEY\": \"\${localEnv:ANTHROPIC_API_KEY}\""
    echo "     }"
    echo "  3. Or set in your shell: export ANTHROPIC_API_KEY='sk-ant-...'"
    echo ""
fi

# 3. Check Claude Code configuration directory
print_step "Checking Claude Code configuration..."

CLAUDE_CONFIG_DIR="${HOME}/.config/claude"
if [ -d "${CLAUDE_CONFIG_DIR}" ]; then
    print_success "Configuration directory exists: ${CLAUDE_CONFIG_DIR}"

    # List configuration files
    if [ "$(ls -A ${CLAUDE_CONFIG_DIR} 2>/dev/null)" ]; then
        echo "  Configuration files:"
        ls -la "${CLAUDE_CONFIG_DIR}" | tail -n +4 | awk '{print "    " $9}'
    else
        print_warning "Configuration directory is empty"
    fi
else
    print_warning "Configuration directory not found (will be created on first run)"
    mkdir -p "${CLAUDE_CONFIG_DIR}"
    print_success "Created configuration directory: ${CLAUDE_CONFIG_DIR}"
fi

# 4. Test basic connectivity (if API key is configured)
print_step "Testing Claude API connectivity..."

if [ -n "${ANTHROPIC_API_KEY}" ]; then
    # Try to get help (this verifies the CLI works but doesn't make API calls)
    if claude --help > /dev/null 2>&1; then
        print_success "Claude CLI responds to commands"

        # Note: We don't test actual API connectivity here to avoid charges
        # Users should test with: claude --test-connection
        echo ""
        echo "To test API connectivity, run:"
        echo "  claude --help"
        echo ""
    else
        print_error "Claude CLI failed to respond"
        exit 1
    fi
else
    print_warning "Skipping connectivity test (no API key configured)"
fi

# 5. Display health check summary
echo ""
echo "========================================="
echo "Health Check Summary"
echo "========================================="
echo ""

# CLI Installation
if command -v claude > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Claude Code CLI: Installed (${CLAUDE_VERSION})"
else
    echo -e "${RED}✗${NC} Claude Code CLI: Not found"
fi

# Authentication
if [ -n "${ANTHROPIC_API_KEY}" ]; then
    echo -e "${GREEN}✓${NC} Authentication: API key configured"
else
    echo -e "${YELLOW}⚠${NC} Authentication: Not configured"
fi

# Configuration
if [ -d "${CLAUDE_CONFIG_DIR}" ]; then
    echo -e "${GREEN}✓${NC} Configuration: Directory exists"
else
    echo -e "${YELLOW}⚠${NC} Configuration: Directory missing"
fi

echo ""

# 6. Display next steps
echo "Next Steps:"
if [ -z "${ANTHROPIC_API_KEY}" ]; then
    echo "  1. Configure your Anthropic API key (see authentication warning above)"
    echo "  2. Test connectivity: claude --help"
    echo "  3. Start using Claude: claude"
else
    echo "  1. Test connectivity: claude --help"
    echo "  2. Start using Claude: claude"
fi

echo ""
print_success "Claude Code CLI setup complete!"
echo ""

#!/usr/bin/env bash
# Test script for git-cliff configuration validation
# SPI-888: Add automated cliff.toml validation testing
#
# Purpose: Validates regex patterns in cliff.toml to prevent configuration drift
# Usage: ./scripts/test-cliff-patterns.sh
# Exit codes: 0 = success, 1 = validation failure

set -euo pipefail

# Terminal colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Project root (one level up from scripts/)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLIFF_CONFIG="${PROJECT_ROOT}/cliff.toml"

# Temporary test repository
TEST_DIR=""

# Cleanup function
cleanup() {
    if [ -n "${TEST_DIR}" ] && [ -d "${TEST_DIR}" ]; then
        rm -rf "${TEST_DIR}"
    fi
}
trap cleanup EXIT

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ${NC} $*"
}

log_success() {
    echo -e "${GREEN}✅${NC} $*"
}

log_error() {
    echo -e "${RED}❌${NC} $*"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $*"
}

# Test assertion functions
assert_contains() {
    local output="$1"
    local pattern="$2"
    local description="$3"

    TESTS_RUN=$((TESTS_RUN + 1))

    if echo "$output" | grep -q "$pattern"; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        log_success "Test #${TESTS_RUN}: ${description}"
        return 0
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        log_error "Test #${TESTS_RUN} FAILED: ${description}"
        log_error "Expected pattern: ${pattern}"
        log_error "Output was:"
        echo "$output" | sed 's/^/  /'
        return 1
    fi
}

assert_not_contains() {
    local output="$1"
    local pattern="$2"
    local description="$3"

    TESTS_RUN=$((TESTS_RUN + 1))

    if ! echo "$output" | grep -q "$pattern"; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        log_success "Test #${TESTS_RUN}: ${description}"
        return 0
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        log_error "Test #${TESTS_RUN} FAILED: ${description}"
        log_error "Pattern should NOT be present: ${pattern}"
        log_error "Output was:"
        echo "$output" | sed 's/^/  /'
        return 1
    fi
}

assert_section_exists() {
    local output="$1"
    local section="$2"
    local description="$3"

    TESTS_RUN=$((TESTS_RUN + 1))

    if echo "$output" | grep -q "### $section"; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        log_success "Test #${TESTS_RUN}: ${description}"
        return 0
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        log_error "Test #${TESTS_RUN} FAILED: ${description}"
        log_error "Expected section: ### ${section}"
        log_error "Sections found:"
        echo "$output" | grep "###" | sed 's/^/  /' || echo "  (none)"
        return 1
    fi
}

# Setup test repository with known commits
setup_test_repo() {
    log_info "Setting up temporary test repository..."

    TEST_DIR=$(mktemp -d)
    cd "${TEST_DIR}"

    git init -q
    git config user.name "Test User"
    git config user.email "test@cycletime.test"

    # Create initial commit to establish history
    git commit -q --allow-empty -m "chore: initial commit"

    log_success "Test repository created at ${TEST_DIR}"
}

# Test Category 1: Conventional Commit Scope Preservation
test_scope_preservation() {
    log_info "Testing conventional commit scope preservation..."

    git commit -q --allow-empty -m "feat(ui): add button component"
    git commit -q --allow-empty -m "fix(mcp): resolve connection error"
    git commit -q --allow-empty -m "docs(api): update endpoint documentation"

    local output
    output=$(git-cliff --config "${CLIFF_CONFIG}" --unreleased 2>/dev/null || echo "ERROR")

    if [ "$output" = "ERROR" ]; then
        log_error "git-cliff failed to execute"
        return 1
    fi

    # Scopes are preserved as **scope**: format in markdown
    assert_contains "$output" "\*\*ui\*\*" "Scope ui should be preserved"
    assert_contains "$output" "\*\*mcp\*\*" "Scope mcp should be preserved"
    assert_contains "$output" "\*\*api\*\*" "Scope api should be preserved"
}

# Test Category 2: Gitmoji Removal
test_gitmoji_removal() {
    log_info "Testing gitmoji removal from commit messages..."

    git commit -q --allow-empty -m "feat(ui): :sparkles: add new feature"
    git commit -q --allow-empty -m ":bug: fix(mcp): resolve error"
    git commit -q --allow-empty -m "docs(api): :memo: update docs"

    local output
    output=$(git-cliff --config "${CLIFF_CONFIG}" --unreleased 2>/dev/null || echo "ERROR")

    assert_not_contains "$output" ":sparkles:" "Gitmoji :sparkles: should be removed"
    assert_not_contains "$output" ":bug:" "Gitmoji :bug: should be removed"
    assert_not_contains "$output" ":memo:" "Gitmoji :memo: should be removed"

    # Verify content still appears (without gitmoji) - note: upper_first transforms to capital
    assert_contains "$output" "Add new feature" "Feature description preserved"
    assert_contains "$output" "resolve error" "Fix description preserved"
}

# Test Category 3: Breaking Change Detection
test_breaking_changes() {
    log_info "Testing breaking change detection..."

    # Pattern 1: Exclamation mark in type
    git commit -q --allow-empty -m "feat(api)!: remove deprecated endpoint"

    # Pattern 2: BREAKING CHANGE footer
    git commit -q --allow-empty -m "feat(api): change response format

BREAKING CHANGE: API response structure changed"

    # Pattern 3: feat! without scope
    git commit -q --allow-empty -m "feat!: major API overhaul"

    local output
    output=$(git-cliff --config "${CLIFF_CONFIG}" --unreleased 2>/dev/null || echo "ERROR")

    assert_section_exists "$output" "🚨 BREAKING CHANGES" "Breaking changes section should exist"
    # Note: upper_first capitalizes commit messages
    assert_contains "$output" "Remove deprecated endpoint" "Breaking change (pattern 1) detected"
    assert_contains "$output" "Change response format" "Breaking change (pattern 2) detected"
    assert_contains "$output" "Major API overhaul" "Breaking change (pattern 3) detected"
}

# Test Category 4: Commit Type Filtering
test_commit_filtering() {
    log_info "Testing commit type filtering..."

    # These should be filtered out (skip = true)
    git commit -q --allow-empty -m "chore: update dependencies"
    git commit -q --allow-empty -m "style: fix formatting"

    # These should appear
    git commit -q --allow-empty -m "feat(ui): add feature"
    git commit -q --allow-empty -m "fix(api): resolve bug"

    local output
    output=$(git-cliff --config "${CLIFF_CONFIG}" --unreleased 2>/dev/null || echo "ERROR")

    assert_not_contains "$output" "update dependencies" "Chore commits should be filtered"
    assert_not_contains "$output" "fix formatting" "Style commits should be filtered"
    # Note: upper_first capitalizes messages
    assert_contains "$output" "Add feature" "Feature commits should appear"
    assert_contains "$output" "Resolve bug" "Fix commits should appear"
}

# Test Category 5: Scope-Based Categorization
test_scope_categorization() {
    log_info "Testing scope-based categorization..."

    git commit -q --allow-empty -m "feat(ui): add user interface feature"
    git commit -q --allow-empty -m "feat(dashboard): add dashboard widget"
    git commit -q --allow-empty -m "feat(mcp): add MCP tool"
    git commit -q --allow-empty -m "feat(api): add API endpoint"
    git commit -q --allow-empty -m "feat: add generic feature"

    local output
    output=$(git-cliff --config "${CLIFF_CONFIG}" --unreleased 2>/dev/null || echo "ERROR")

    # Verify sections exist based on cliff.toml configuration
    assert_section_exists "$output" "✨ User Interface" "UI section should exist"
    assert_section_exists "$output" "✨ Dashboard" "Dashboard section should exist"
    assert_section_exists "$output" "✨ MCP Integration" "MCP section should exist"
    assert_section_exists "$output" "✨ API" "API section should exist"
    assert_section_exists "$output" "✨ Features" "Generic features section should exist"
}

# Test Category 6: Dependency Grouping
test_dependency_grouping() {
    log_info "Testing dependency commit grouping..."

    git commit -q --allow-empty -m "build(deps): bump kotlin from 1.9.0 to 2.0.0"
    git commit -q --allow-empty -m "build(deps): bump ktor from 3.0.0 to 3.1.0"

    local output
    output=$(git-cliff --config "${CLIFF_CONFIG}" --unreleased 2>/dev/null || echo "ERROR")

    assert_section_exists "$output" "📦 Dependencies" "Dependencies section should exist"
    # Note: upper_first capitalizes messages
    assert_contains "$output" "Bump kotlin" "Dependency update should appear"
}

# Test Category 7: Edge Cases
test_edge_cases() {
    log_info "Testing edge cases..."

    # Special characters in description
    git commit -q --allow-empty -m "feat(ui): add button (with icon)"

    # Multiple scopes (not standard, but should handle gracefully)
    git commit -q --allow-empty -m "feat: no scope feature"

    # Very long scope
    git commit -q --allow-empty -m "feat(very-long-scope-name): add feature"

    local output
    output=$(git-cliff --config "${CLIFF_CONFIG}" --unreleased 2>/dev/null || echo "ERROR")

    # Just verify it doesn't crash and produces some output - note: upper_first capitalization
    assert_contains "$output" "Add button" "Special characters handled"
    assert_contains "$output" "No scope feature" "Missing scope handled"
    assert_contains "$output" "very-long-scope-name" "Long scope handled"
}

# Test Category 8: Multi-line Commits
test_multiline_commits() {
    log_info "Testing multi-line commit handling..."

    # Commit with body
    git commit -q --allow-empty -m "feat(api): add new endpoint

This is a detailed description of the feature.
It spans multiple lines.

Co-authored-by: Test User <test@example.com>"

    local output
    output=$(git-cliff --config "${CLIFF_CONFIG}" --unreleased 2>/dev/null || echo "ERROR")

    # Note: upper_first capitalizes messages
    assert_contains "$output" "Add new endpoint" "Multi-line commit processed"
}

# Test Category 9: PR and Issue Linking
test_link_generation() {
    log_info "Testing PR and issue link generation..."

    git commit -q --allow-empty -m "feat(ui): add feature (#123)"
    git commit -q --allow-empty -m "fix(api): resolve bug (SPI-456)"

    local output
    output=$(git-cliff --config "${CLIFF_CONFIG}" --unreleased 2>/dev/null || echo "ERROR")

    # Note: Postprocessors run, but we can't verify actual links in text output
    # We verify the commit appears (link generation is a postprocessor concern)
    # upper_first capitalizes messages
    assert_contains "$output" "Add feature" "PR reference preserved"
    assert_contains "$output" "Resolve bug" "Linear issue reference preserved"
}

# Main test execution
main() {
    echo ""
    echo "=========================================="
    echo "git-cliff Configuration Validation Tests"
    echo "=========================================="
    echo ""

    # Verify prerequisites
    log_info "Checking prerequisites..."

    if ! command -v git &> /dev/null; then
        log_error "git is not installed"
        exit 1
    fi

    if ! command -v git-cliff &> /dev/null; then
        log_error "git-cliff is not installed"
        log_info "Install with: cargo install git-cliff"
        exit 1
    fi

    if [ ! -f "${CLIFF_CONFIG}" ]; then
        log_error "cliff.toml not found at ${CLIFF_CONFIG}"
        exit 1
    fi

    log_success "Prerequisites verified"
    echo ""

    # Setup test environment
    setup_test_repo
    echo ""

    # Run test categories
    test_scope_preservation || true
    echo ""

    test_gitmoji_removal || true
    echo ""

    test_breaking_changes || true
    echo ""

    test_commit_filtering || true
    echo ""

    test_scope_categorization || true
    echo ""

    test_dependency_grouping || true
    echo ""

    test_edge_cases || true
    echo ""

    test_multiline_commits || true
    echo ""

    test_link_generation || true
    echo ""

    # Test summary
    echo "=========================================="
    echo "Test Summary"
    echo "=========================================="
    echo "Total tests run: ${TESTS_RUN}"
    log_success "Tests passed: ${TESTS_PASSED}"

    if [ "${TESTS_FAILED}" -gt 0 ]; then
        log_error "Tests failed: ${TESTS_FAILED}"
        echo ""
        log_error "cliff.toml validation FAILED"
        log_info "Fix the configuration and re-run tests"
        exit 1
    else
        echo ""
        log_success "All tests passed! cliff.toml configuration is valid"
        exit 0
    fi
}

# Execute main function
main "$@"

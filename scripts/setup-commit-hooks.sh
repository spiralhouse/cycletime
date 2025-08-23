#!/bin/bash
#
# Setup script for JCVD commit message validation
# This script configures the local development environment for consistent commit practices

set -e

echo "🚀 Setting up JCVD commit message validation..."
echo ""

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Not in a git repository. Please run this from the JCVD project root."
    exit 1
fi

# Install commit message template
echo "📝 Installing commit message template..."
git config commit.template .gitmessage
echo "✅ Commit message template installed"

# Check if Node.js is available
if ! command -v node >/dev/null 2>&1; then
    echo "⚠️  Node.js not found"
    echo "   Please install Node.js 18+ to enable commit message validation"
    echo "   Visit: https://nodejs.org/"
    echo ""
else
    NODE_VERSION=$(node --version)
    echo "✅ Node.js found: $NODE_VERSION"
    
    # Install npm dependencies
    echo "📦 Installing commitlint dependencies..."
    npm install
    echo "✅ Dependencies installed"
fi

# Copy commit-msg hook if it doesn't exist
if [ ! -f ".git/hooks/commit-msg" ]; then
    echo "🪝 Installing commit-msg hook..."
    cat > .git/hooks/commit-msg << 'EOF'
#!/bin/sh
#
# Git commit-msg hook for JCVD
# Validates commit messages against Conventional Commits format

# Check if Node.js and npm are available
if ! command -v node >/dev/null 2>&1; then
    echo "⚠️  Node.js not found - skipping commit message validation"
    echo "   Install Node.js 18+ to enable local commit message validation"
    exit 0
fi

# Check if commitlint is installed
if [ ! -f "package.json" ] || [ ! -d "node_modules" ]; then
    echo "⚠️  Commitlint dependencies not found - skipping validation"
    echo "   Run 'npm install' to enable local commit message validation"
    exit 0
fi

# Run commitlint on the commit message
echo "🔍 Validating commit message..."

if npx commitlint --edit "$1"; then
    echo "✅ Commit message validation passed!"
else
    echo ""
    echo "❌ Commit message validation failed!"
    echo ""
    echo "🔧 Your commit message doesn't follow Conventional Commits format."
    echo ""
    echo "📋 Required format:"
    echo "   <type>(<scope>): <subject>"
    echo ""
    echo "📝 Valid types:"
    echo "   feat, fix, docs, style, refactor, perf, test, build, ci, chore"
    echo ""
    echo "💡 Examples:"
    echo "   feat(auth): add OAuth2 integration"
    echo "   fix(api): handle null response in user endpoint"
    echo "   docs: update installation instructions"
    echo "   build: upgrade gradle to version 8.5"
    echo ""
    echo "🎯 Quick fixes:"
    echo "   • Use imperative mood: 'add' not 'added'"
    echo "   • Start subject with lowercase"
    echo "   • Keep subject under 50 characters"
    echo "   • Don't end subject with period"
    echo ""
    echo "📖 For detailed guidelines, see: CONTRIBUTING.md"
    echo ""
    exit 1
fi
EOF
    chmod +x .git/hooks/commit-msg
    echo "✅ Commit-msg hook installed"
else
    echo "✅ Commit-msg hook already exists"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 What was configured:"
echo "  ✅ Git commit template (.gitmessage)"
if command -v node >/dev/null 2>&1; then
    echo "  ✅ Commitlint dependencies (package.json)"
fi
echo "  ✅ Local commit-msg validation hook"
echo ""
echo "💡 Next steps:"
echo "  • Your next git commit will use the template"
echo "  • Commit messages will be validated locally"
echo "  • CI will validate all PR commit messages"
echo ""
echo "📖 For commit message guidelines, see: CONTRIBUTING.md"
echo ""
echo "🚀 Happy committing with Conventional Commits!"
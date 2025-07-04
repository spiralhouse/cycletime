#!/bin/bash
# =============================================================================
# Developer Onboarding Script
# =============================================================================
# Interactive guide for new developers setting up CycleTime

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_header() {
    echo -e "\n${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_code() {
    echo -e "${CYAN}$ $1${NC}"
}

# Welcome message
show_welcome() {
    clear
    echo -e "${BLUE}"
    cat << "EOF"
╭─────────────────────────────────────────────────────────────╮
│                                                             │
│  ██████╗██╗   ██╗ ██████╗██╗     ███████╗████████╗██╗███╗   ███╗███████╗  │
│ ██╔════╝╚██╗ ██╔╝██╔════╝██║     ██╔════╝╚══██╔══╝██║████╗ ████║██╔════╝  │
│ ██║      ╚████╔╝ ██║     ██║     █████╗     ██║   ██║██╔████╔██║█████╗    │
│ ██║       ╚██╔╝  ██║     ██║     ██╔══╝     ██║   ██║██║╚██╔╝██║██╔══╝    │
│ ╚██████╗   ██║   ╚██████╗███████╗███████╗   ██║   ██║██║ ╚═╝ ██║███████╗  │
│  ╚═════╝   ╚═╝    ╚═════╝╚══════╝╚══════╝   ╚═╝   ╚═╝╚═╝     ╚═╝╚══════╝  │
│                                                             │
│              Developer Onboarding Guide                     │
╰─────────────────────────────────────────────────────────────╯
EOF
    echo -e "${NC}"
    echo ""
    echo -e "${GREEN}Welcome to the CycleTime development team! 🎉${NC}"
    echo ""
    echo "This interactive guide will help you set up your development environment"
    echo "and get familiar with the CycleTime platform."
    echo ""
    read -p "Press Enter to continue..."
}

# Check prerequisites
check_developer_prerequisites() {
    print_header "Checking Prerequisites"
    
    local missing_tools=()
    local warnings=()
    
    # Check required tools
    if ! command -v docker &> /dev/null; then
        missing_tools+=("Docker Desktop")
    else
        print_success "Docker is installed"
    fi
    
    if ! command -v node &> /dev/null; then
        missing_tools+=("Node.js 22+")
    else
        local node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$node_version" -lt 22 ]; then
            missing_tools+=("Node.js 22+ (currently: $(node --version))")
        else
            print_success "Node.js 22+ is installed"
        fi
    fi
    
    if ! command -v git &> /dev/null; then
        missing_tools+=("Git")
    else
        print_success "Git is installed"
    fi
    
    # Check recommended tools
    if ! command -v curl &> /dev/null; then
        warnings+=("curl (recommended for API testing)")
    fi
    
    if ! command -v jq &> /dev/null; then
        warnings+=("jq (recommended for JSON processing)")
    fi
    
    if ! command -v code &> /dev/null && ! command -v cursor &> /dev/null; then
        warnings+=("VS Code or Cursor (recommended editor)")
    fi
    
    # Report results
    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_error "Missing required tools:"
        for tool in "${missing_tools[@]}"; do
            echo "  ❌ $tool"
        done
        echo ""
        print_info "Please install these tools before continuing:"
        echo "  • Docker Desktop: https://www.docker.com/products/docker-desktop"
        echo "  • Node.js 22+: https://nodejs.org/"
        echo "  • Git: https://git-scm.com/"
        echo ""
        read -p "Press Enter when you've installed the required tools..."
        return 1
    fi
    
    if [ ${#warnings[@]} -ne 0 ]; then
        print_warning "Recommended tools not found:"
        for tool in "${warnings[@]}"; do
            echo "  ⚠️  $tool"
        done
        echo ""
    fi
    
    print_success "All required prerequisites are satisfied!"
    echo ""
    read -p "Press Enter to continue..."
}

# API Keys setup
setup_api_keys() {
    print_header "API Keys Setup"
    
    echo "CycleTime integrates with several external services."
    echo "You'll need API keys for full functionality:"
    echo ""
    echo "📝 Required API Keys:"
    echo "  1. Anthropic API Key (for Claude AI integration)"
    echo "  2. Linear API Key (for issue management)"
    echo "  3. GitHub Token (for repository integration)"
    echo ""
    
    if [ -f ".env" ]; then
        print_info ".env file already exists"
    else
        print_info "Creating .env file from template..."
        cp .env.example .env
        print_success ".env file created"
    fi
    
    echo ""
    echo "🔑 How to get API keys:"
    echo ""
    echo "1. Anthropic API Key:"
    echo "   • Visit: https://console.anthropic.com/"
    echo "   • Create an account and generate an API key"
    echo "   • Add to .env: ANTHROPIC_API_KEY=your_key_here"
    echo ""
    echo "2. Linear API Key:"
    echo "   • Visit: https://linear.app/settings/api"
    echo "   • Generate a personal API key"
    echo "   • Add to .env: LINEAR_API_KEY=your_key_here"
    echo ""
    echo "3. GitHub Token:"
    echo "   • Visit: https://github.com/settings/tokens"
    echo "   • Generate a personal access token"
    echo "   • Add to .env: GITHUB_TOKEN=your_token_here"
    echo ""
    
    echo "💡 You can start development with mock services enabled and add real API keys later."
    echo ""
    
    read -p "Would you like to edit .env now? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if command -v code &> /dev/null; then
            code .env
        elif command -v cursor &> /dev/null; then
            cursor .env
        elif command -v nano &> /dev/null; then
            nano .env
        else
            print_info "Please edit .env manually with your preferred editor"
        fi
    fi
    
    echo ""
    read -p "Press Enter to continue..."
}

# Run setup
run_setup() {
    print_header "Environment Setup"
    
    echo "Now we'll set up your CycleTime development environment."
    echo "This process will:"
    echo ""
    echo "🔧 Setup Steps:"
    echo "  1. Pull required Docker images"
    echo "  2. Start infrastructure services (PostgreSQL, Redis, MinIO)"
    echo "  3. Initialize databases"
    echo "  4. Start application services"
    echo "  5. Validate the installation"
    echo ""
    echo "⏱️  This typically takes 5-10 minutes on first run."
    echo ""
    
    read -p "Ready to start setup? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        print_info "Running automated setup..."
        echo ""
        
        if ./scripts/setup.sh; then
            print_success "Setup completed successfully!"
        else
            print_error "Setup failed. Please check the logs and try again."
            return 1
        fi
    else
        print_info "Skipping automated setup. You can run it later with:"
        print_code "npm run setup"
    fi
    
    echo ""
    read -p "Press Enter to continue..."
}

# Show development workflow
show_workflow() {
    print_header "Development Workflow"
    
    echo "🚀 Common Development Commands:"
    echo ""
    echo "Starting/Stopping:"
    print_code "npm start              # Start all services and check health"
    print_code "npm stop               # Stop all services"
    print_code "npm restart            # Restart all services"
    print_code "npm run reset          # Reset environment (clean slate)"
    echo ""
    
    echo "Monitoring:"
    print_code "npm run health         # Check service health"
    print_code "npm run docker:status  # View container status"
    print_code "npm run docker:logs    # View all logs"
    print_code "npm run performance    # Check performance metrics"
    echo ""
    
    echo "Development Tools:"
    print_code "npm run adminer:web      # Open database admin"
    print_code "npm run redis-insight:web # Open Redis management"
    print_code "npm run minio:web        # Open file storage console"
    print_code "npm run web:all          # Open all web tools"
    echo ""
    
    echo "Database Operations:"
    print_code "npm run db:connect     # Connect to development database"
    print_code "npm run db:connect:test # Connect to test database"
    print_code "npm run redis:cli      # Connect to Redis CLI"
    echo ""
    
    echo "🌐 Service URLs:"
    echo "  • Web Dashboard:    http://localhost:3001"
    echo "  • API Gateway:      http://localhost:8000"
    echo "  • Database Admin:   http://localhost:8080"
    echo "  • Redis Management: http://localhost:8081"
    echo "  • File Storage:     http://localhost:9001"
    echo ""
    
    read -p "Press Enter to continue..."
}

# Show project structure
show_project_structure() {
    print_header "Project Structure Overview"
    
    echo "📁 CycleTime Project Organization:"
    echo ""
    echo "cycletime/"
    echo "├── 📄 README.md              # Project documentation"
    echo "├── 📄 CLAUDE.md              # Development workflow guidelines"
    echo "├── 🐳 docker-compose.yml     # Service orchestration"
    echo "├── ⚙️  .env                   # Environment configuration"
    echo "├── 📂 services/              # Microservices"
    echo "│   ├── api-gateway/          # Main API server"
    echo "│   ├── web-dashboard/        # Frontend application"
    echo "│   ├── mcp-server/           # AI integration server"
    echo "│   ├── claude-service/       # Claude AI service"
    echo "│   ├── document-service/     # Document processing"
    echo "│   └── task-service/         # Task management"
    echo "├── 📂 scripts/               # Automation scripts"
    echo "│   ├── setup.sh              # Environment setup"
    echo "│   ├── health-check.sh       # Service monitoring"
    echo "│   └── onboard-developer.sh  # This script!"
    echo "├── 📂 docs/                  # Documentation"
    echo "│   ├── requirements/         # Product requirements"
    echo "│   └── technical-designs/    # Technical specifications"
    echo "├── 📂 database/              # Database schemas"
    echo "├── 📂 config/                # Service configurations"
    echo "└── 📂 logs/                  # Application logs"
    echo ""
    
    echo "🔧 Key Configuration Files:"
    echo "  • docker-compose.yml: Defines all services and their relationships"
    echo "  • .env: Environment variables and API keys"
    echo "  • package.json: NPM scripts for development commands"
    echo "  • CLAUDE.md: Team development workflow and conventions"
    echo ""
    
    read -p "Press Enter to continue..."
}

# Show testing and validation
show_testing() {
    print_header "Testing & Validation"
    
    echo "🧪 Ensuring Quality:"
    echo ""
    echo "Health Monitoring:"
    print_code "npm run health         # Check all service health"
    print_code "npm run validate       # Validate environment setup"
    print_code "npm run performance    # Check performance metrics"
    echo ""
    
    echo "Development Testing:"
    print_code "npm test               # Run unit tests (when implemented)"
    print_code "npm run test:integration # Run integration tests (when implemented)"
    print_code "npm run lint           # Code linting (when configured)"
    print_code "npm run typecheck      # Type checking (when configured)"
    echo ""
    
    echo "Troubleshooting:"
    print_code "npm run troubleshoot   # Automated troubleshooting (when implemented)"
    print_code "npm run docker:clean   # Clean up Docker resources"
    print_code "npm run logs:services  # View application service logs"
    echo ""
    
    echo "💡 Best Practices:"
    echo "  • Run health checks before starting development"
    echo "  • Monitor performance during development"
    echo "  • Check logs when services behave unexpectedly"
    echo "  • Use validate command after environment changes"
    echo ""
    
    read -p "Press Enter to continue..."
}

# Next steps
show_next_steps() {
    print_header "Next Steps & Resources"
    
    echo "🎯 You're all set! Here's what to do next:"
    echo ""
    echo "1. 📖 Read the Documentation:"
    echo "   • README.md - Project overview and quick start"
    echo "   • CLAUDE.md - Development workflow and conventions"
    echo "   • docs/requirements/ - Product requirements and specifications"
    echo ""
    
    echo "2. 🔍 Explore the Services:"
    echo "   • Visit http://localhost:3001 - Web Dashboard"
    echo "   • Check http://localhost:8000 - API Gateway"
    echo "   • Use development tools for database and Redis management"
    echo ""
    
    echo "3. 🛠️  Start Developing:"
    echo "   • Follow the workflow in CLAUDE.md"
    echo "   • Create feature branches for new work"
    echo "   • Use Linear for issue tracking"
    echo "   • Follow conventional commits"
    echo ""
    
    echo "4. 🤝 Team Collaboration:"
    echo "   • Join the Linear workspace for task management"
    echo "   • Follow Git workflow with feature branches"
    echo "   • Use PR reviews for code quality"
    echo ""
    
    echo "📚 Additional Resources:"
    echo "  • CycleTime Roadmap: docs/ROADMAP.md"
    echo "  • Technical Designs: docs/technical-designs/"
    echo "  • Docker Documentation: https://docs.docker.com/"
    echo "  • Claude API Docs: https://docs.anthropic.com/"
    echo ""
    
    echo "🆘 Need Help?"
    echo "  • Check README.md troubleshooting section"
    echo "  • Run 'npm run validate' to check your environment"
    echo "  • Ask in team channels for support"
    echo ""
}

# Completion
show_completion() {
    print_header "Onboarding Complete!"
    
    echo -e "${GREEN}🎉 Congratulations! You're ready to contribute to CycleTime! 🎉${NC}"
    echo ""
    echo "✨ What you've accomplished:"
    echo "  ✅ Set up development environment"
    echo "  ✅ Configured API keys and services"
    echo "  ✅ Learned the development workflow"
    echo "  ✅ Explored project structure"
    echo "  ✅ Understood testing and validation"
    echo ""
    
    echo "🚀 Quick Start Reminder:"
    print_code "npm start              # Start development environment"
    print_code "npm run health         # Verify everything is working"
    print_code "npm run adminer:web    # Open database admin"
    echo ""
    
    echo "Happy coding! 🚀"
    echo ""
    echo "Welcome to the CycleTime team! 👋"
}

# Main onboarding flow
main() {
    show_welcome
    
    if ! check_developer_prerequisites; then
        main  # Restart if prerequisites failed
        return
    fi
    
    setup_api_keys
    run_setup
    show_workflow
    show_project_structure
    show_testing
    show_next_steps
    show_completion
}

# Run onboarding
main "$@"
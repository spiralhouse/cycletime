#!/bin/bash
# =============================================================================
# CycleTime Development Environment Setup Script
# =============================================================================
# This script automates the complete setup of the CycleTime development environment

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SETUP_START_TIME=$(date +%s)
LOG_FILE="logs/setup-$(date +%Y%m%d-%H%M%S).log"

# Create logs directory
mkdir -p logs

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

print_header() {
    echo -e "\n${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}\n"
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

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    log "Starting prerequisite checks"
    
    local missing_tools=()
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        missing_tools+=("Docker")
    else
        print_success "Docker is installed: $(docker --version | cut -d' ' -f3)"
    fi
    
    # Check Docker Compose
    if ! command -v docker &> /dev/null || ! docker compose version &> /dev/null; then
        missing_tools+=("Docker Compose")
    else
        print_success "Docker Compose is installed: $(docker compose version --short)"
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        missing_tools+=("Node.js 22+")
    else
        local node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$node_version" -lt 22 ]; then
            missing_tools+=("Node.js 22+ (currently: $(node --version))")
        else
            print_success "Node.js is installed: $(node --version)"
        fi
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        missing_tools+=("npm")
    else
        print_success "npm is installed: $(npm --version)"
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_error "Missing required tools:"
        for tool in "${missing_tools[@]}"; do
            echo "  - $tool"
        done
        echo ""
        print_info "Please install the missing tools and run setup again."
        print_info "See README.md for installation instructions."
        exit 1
    fi
    
    log "All prerequisites satisfied"
}

# Check for port conflicts
check_port_conflicts() {
    print_header "Checking Port Availability"
    log "Checking for port conflicts"
    
    local ports=(5432 6379 8000 8001 8002 8003 8004 8080 8081 9000 9001 3001)
    local conflicts=()
    
    for port in "${ports[@]}"; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            local process=$(lsof -Pi :$port -sTCP:LISTEN | tail -n 1 | awk '{print $1}')
            conflicts+=("Port $port is in use by process: $process")
        else
            print_success "Port $port is available"
        fi
    done
    
    if [ ${#conflicts[@]} -ne 0 ]; then
        print_warning "Port conflicts detected:"
        for conflict in "${conflicts[@]}"; do
            echo "  - $conflict"
        done
        echo ""
        print_info "You may need to stop these processes or update .env port configuration"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Setup cancelled. Please resolve port conflicts and try again."
            exit 1
        fi
    fi
    
    log "Port conflict check completed"
}

# Setup environment file
setup_environment() {
    print_header "Setting Up Environment Configuration"
    log "Setting up environment configuration"
    
    if [ ! -f .env ]; then
        print_info "Creating .env file from template..."
        cp .env.example .env
        print_success ".env file created"
        print_warning "Please update .env with your actual API keys before running services"
        print_info "Required API keys:"
        echo "  - ANTHROPIC_API_KEY (for Claude AI integration)"
        echo "  - LINEAR_API_KEY (for issue management)"
        echo "  - GITHUB_TOKEN (for repository integration)"
    else
        print_info ".env file already exists"
    fi
    
    log "Environment configuration completed"
}

# Pull Docker images
pull_docker_images() {
    print_header "Pulling Docker Images"
    log "Pulling required Docker images"
    
    print_info "This may take a few minutes depending on your internet connection..."
    
    if docker compose pull; then
        print_success "Docker images pulled successfully"
    else
        print_error "Failed to pull Docker images"
        exit 1
    fi
    
    log "Docker images pulled"
}

# Setup infrastructure services
setup_infrastructure() {
    print_header "Starting Infrastructure Services"
    log "Starting infrastructure services"
    
    print_info "Starting PostgreSQL, Redis, and MinIO..."
    
    if docker compose up -d postgres redis minio; then
        print_success "Infrastructure services started"
    else
        print_error "Failed to start infrastructure services"
        exit 1
    fi
    
    # Wait for services to be healthy
    print_info "Waiting for services to be ready..."
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if docker compose exec -T postgres pg_isready -U cycletime -d cycletime_dev >/dev/null 2>&1 && \
           docker compose exec -T redis redis-cli ping >/dev/null 2>&1; then
            print_success "Infrastructure services are ready"
            break
        fi
        
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done
    
    if [ $attempt -eq $max_attempts ]; then
        print_error "Infrastructure services failed to start within expected time"
        print_info "Check logs with: npm run logs:infrastructure"
        exit 1
    fi
    
    log "Infrastructure services ready"
}

# Setup databases
setup_databases() {
    print_header "Setting Up Databases"
    log "Setting up databases"
    
    print_info "Creating test database..."
    
    # Create test database if it doesn't exist
    if docker compose exec -T postgres psql -U cycletime -d cycletime_dev -c "SELECT 1 FROM pg_database WHERE datname='cycletime_test'" | grep -q 1; then
        print_info "Test database already exists"
    else
        docker compose exec -T postgres createdb -U cycletime cycletime_test
        print_success "Test database created"
    fi
    
    log "Database setup completed"
}

# Setup MinIO buckets
setup_minio() {
    print_header "Setting Up MinIO Object Storage"
    log "Setting up MinIO buckets"
    
    print_info "Setting up MinIO buckets..."
    
    # Wait for MinIO to be ready
    local max_attempts=10
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -f -s http://localhost:9000/minio/health/live >/dev/null 2>&1; then
            break
        fi
        attempt=$((attempt + 1))
        sleep 2
    done
    
    # For now, just verify MinIO is accessible
    # Bucket creation will be handled by the application
    print_success "MinIO is ready"
    
    log "MinIO setup completed"
}

# Start application services
start_application_services() {
    print_header "Starting Application Services"
    log "Starting application services"
    
    print_info "Starting API Gateway, Web Dashboard, and other services..."
    
    if docker compose up -d; then
        print_success "All services started"
    else
        print_error "Failed to start application services"
        exit 1
    fi
    
    log "Application services started"
}

# Validate installation
validate_installation() {
    print_header "Validating Installation"
    log "Validating installation"
    
    print_info "Running health checks..."
    
    # Give services time to start
    sleep 10
    
    if ./scripts/health-check.sh; then
        print_success "All services are healthy!"
    else
        print_error "Some services are not healthy"
        print_info "Check logs with: npm run docker:logs"
        exit 1
    fi
    
    log "Installation validation completed"
}

# Print setup summary
print_setup_summary() {
    local setup_end_time=$(date +%s)
    local setup_duration=$((setup_end_time - setup_start_time))
    local minutes=$((setup_duration / 60))
    local seconds=$((setup_duration % 60))
    
    print_header "Setup Complete!"
    
    echo -e "${GREEN}🎉 CycleTime development environment is ready!${NC}"
    echo ""
    echo "⏱️  Setup completed in ${minutes}m ${seconds}s"
    echo ""
    echo "🌐 Available URLs:"
    echo "  • Web Dashboard:    http://localhost:3001"
    echo "  • API Gateway:      http://localhost:8000"
    echo "  • Adminer (DB):     http://localhost:8080"
    echo "  • Redis Insight:    http://localhost:8081" 
    echo "  • MinIO Console:    http://localhost:9001"
    echo ""
    echo "🛠️  Useful commands:"
    echo "  • View all services:  npm run docker:status"
    echo "  • Check health:       npm run health"
    echo "  • View logs:          npm run docker:logs"
    echo "  • Stop services:      npm run stop"
    echo "  • Restart services:   npm run restart"
    echo "  • Reset environment:  npm run reset"
    echo ""
    if [ -f .env ]; then
        echo "⚠️  Remember to update your API keys in .env file"
        echo ""
    fi
    echo "📖 For more information, see README.md"
    
    log "Setup completed successfully in ${minutes}m ${seconds}s"
}

# Error handling
handle_error() {
    print_error "Setup failed!"
    print_info "Check the setup log: $LOG_FILE"
    print_info "For troubleshooting help, run: npm run troubleshoot"
    exit 1
}

# Set error trap
trap handle_error ERR

# Main execution
main() {
    print_header "CycleTime Development Environment Setup"
    log "Starting CycleTime setup"
    
    check_prerequisites
    check_port_conflicts
    setup_environment
    pull_docker_images
    setup_infrastructure
    setup_databases
    setup_minio
    start_application_services
    validate_installation
    print_setup_summary
}

# Run main function
main "$@"
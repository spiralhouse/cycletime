#!/bin/bash
# =============================================================================
# Environment Validation Script
# =============================================================================
# Validates the development environment setup and configuration

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
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

validation_errors=0

# Validate Docker environment
validate_docker() {
    print_header "Docker Environment Validation"
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running"
        ((validation_errors++))
        return
    fi
    print_success "Docker is running"
    
    # Check Docker Compose version
    local compose_version=$(docker compose version --short 2>/dev/null || echo "unknown")
    print_success "Docker Compose version: $compose_version"
    
    # Check if docker-compose.yml exists
    if [ ! -f "docker-compose.yml" ]; then
        print_error "docker-compose.yml not found"
        ((validation_errors++))
    else
        print_success "docker-compose.yml found"
    fi
    
    # Validate docker-compose.yml syntax
    if docker compose config >/dev/null 2>&1; then
        print_success "docker-compose.yml syntax is valid"
    else
        print_error "docker-compose.yml has syntax errors"
        ((validation_errors++))
    fi
}

# Validate environment configuration
validate_environment_config() {
    print_header "Environment Configuration Validation"
    
    # Check if .env file exists
    if [ ! -f ".env" ]; then
        print_warning ".env file not found - will use defaults from .env.example"
    else
        print_success ".env file found"
        
        # Check for placeholder values
        local placeholders=(
            "your_anthropic_api_key_here"
            "your_linear_api_key_here" 
            "your_github_token_here"
        )
        
        for placeholder in "${placeholders[@]}"; do
            if grep -q "$placeholder" .env; then
                print_warning "Found placeholder value: $placeholder"
                print_info "Consider updating with actual API key"
            fi
        done
    fi
    
    # Validate .env.example exists
    if [ ! -f ".env.example" ]; then
        print_error ".env.example file not found"
        ((validation_errors++))
    else
        print_success ".env.example template found"
    fi
}

# Validate port availability
validate_ports() {
    print_header "Port Availability Validation"
    
    local required_ports=(5432 6379 8000 8001 8002 8003 8004 8080 8081 9000 9001 3001)
    
    for port in "${required_ports[@]}"; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            local process=$(lsof -Pi :$port -sTCP:LISTEN | tail -n 1 | awk '{print $1}')
            if [ "$process" = "docker" ] || [ "$process" = "com.docke" ]; then
                print_success "Port $port: Used by Docker (expected)"
            else
                print_warning "Port $port: Used by $process (potential conflict)"
            fi
        else
            print_success "Port $port: Available"
        fi
    done
}

# Validate container status
validate_containers() {
    print_header "Container Status Validation"
    
    local expected_containers=(
        "cycletime-postgres"
        "cycletime-redis"
        "cycletime-minio"
        "cycletime-api"
        "cycletime-web"
        "cycletime-mcp"
        "cycletime-claude"
        "cycletime-documents"
        "cycletime-tasks"
        "cycletime-adminer"
        "cycletime-redis-insight"
    )
    
    for container in "${expected_containers[@]}"; do
        if docker ps --format "table {{.Names}}" | grep -q "$container"; then
            local status=$(docker ps --format "table {{.Names}}\t{{.Status}}" | grep "$container" | awk '{print $2}')
            print_success "$container: $status"
        else
            print_warning "$container: Not running"
        fi
    done
}

# Validate service health
validate_service_health() {
    print_header "Service Health Validation"
    
    # Run health check script if it exists
    if [ -f "scripts/health-check.sh" ]; then
        if ./scripts/health-check.sh >/dev/null 2>&1; then
            print_success "All services are healthy"
        else
            print_warning "Some services are not healthy"
            print_info "Run 'npm run health' for detailed status"
        fi
    else
        print_warning "Health check script not found"
    fi
}

# Validate database connectivity
validate_database() {
    print_header "Database Connectivity Validation"
    
    # Test PostgreSQL connection
    if docker compose exec -T postgres pg_isready -U cycletime -d cycletime_dev >/dev/null 2>&1; then
        print_success "PostgreSQL connection: OK"
        
        # Check if test database exists
        if docker compose exec -T postgres psql -U cycletime -d cycletime_dev -c "SELECT 1 FROM pg_database WHERE datname='cycletime_test'" | grep -q 1; then
            print_success "Test database: EXISTS"
        else
            print_warning "Test database: NOT FOUND"
        fi
    else
        print_error "PostgreSQL connection: FAILED"
        ((validation_errors++))
    fi
    
    # Test Redis connection
    if docker compose exec -T redis redis-cli ping >/dev/null 2>&1; then
        print_success "Redis connection: OK"
    else
        print_error "Redis connection: FAILED"
        ((validation_errors++))
    fi
}

# Validate required scripts
validate_scripts() {
    print_header "Required Scripts Validation"
    
    local required_scripts=(
        "scripts/health-check.sh"
        "scripts/setup.sh"
    )
    
    for script in "${required_scripts[@]}"; do
        if [ -f "$script" ]; then
            if [ -x "$script" ]; then
                print_success "$script: EXISTS and EXECUTABLE"
            else
                print_warning "$script: EXISTS but NOT EXECUTABLE"
                print_info "Run: chmod +x $script"
            fi
        else
            print_error "$script: NOT FOUND"
            ((validation_errors++))
        fi
    done
}

# Validate resource usage
validate_resources() {
    print_header "Resource Usage Validation"
    
    # Check Docker resource usage
    if command -v docker &> /dev/null; then
        local total_memory=$(docker stats --no-stream --format "table {{.MemUsage}}" | tail -n +2 | awk -F/ '{sum += $1} END {print sum}' 2>/dev/null || echo "0")
        print_info "Docker memory usage: ${total_memory}MB"
        
        # Check if containers are consuming too many resources
        docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" | tail -n +2 | while read line; do
            local container=$(echo "$line" | awk '{print $1}')
            local cpu=$(echo "$line" | awk '{print $2}' | sed 's/%//')
            local memory=$(echo "$line" | awk '{print $3}' | sed 's/MiB//')
            
            if (( $(echo "$cpu > 50.0" | bc -l 2>/dev/null || echo 0) )); then
                print_warning "$container: High CPU usage ($cpu%)"
            fi
        done
    fi
}

# Main validation function
main() {
    echo "🔍 Validating CycleTime development environment..."
    echo ""
    
    validate_docker
    validate_environment_config
    validate_ports
    validate_containers
    validate_service_health
    validate_database
    validate_scripts
    validate_resources
    
    # Summary
    print_header "Validation Summary"
    
    if [ $validation_errors -eq 0 ]; then
        print_success "Environment validation passed! ✨"
        echo ""
        print_info "Your CycleTime development environment is properly configured."
    else
        print_error "Environment validation failed with $validation_errors error(s)"
        echo ""
        print_info "Please fix the errors above and run validation again."
        exit 1
    fi
}

# Run validation
main "$@"
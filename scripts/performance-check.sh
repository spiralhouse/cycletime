#!/bin/bash
# =============================================================================
# Performance Check Script
# =============================================================================
# Monitors and reports on system performance and resource usage

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

# Check Docker system resources
check_docker_resources() {
    print_header "Docker System Resources"
    
    # Docker system info
    echo "Docker System Info:"
    docker system info --format "{{.Name}}: {{.NCPU}} CPUs, {{.MemTotal}} memory" 2>/dev/null || echo "Unable to get Docker system info"
    echo ""
    
    # Container resource usage
    echo "Container Resource Usage:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}" 2>/dev/null || echo "No running containers"
    echo ""
    
    # Disk usage
    echo "Docker Disk Usage:"
    docker system df 2>/dev/null || echo "Unable to get Docker disk usage"
}

# Check service startup times
check_startup_times() {
    print_header "Service Startup Performance"
    
    echo "Container Start Times (since last restart):"
    docker ps --format "table {{.Names}}\t{{.Status}}" | tail -n +2 | while read line; do
        local container=$(echo "$line" | awk '{print $1}')
        local status=$(echo "$line" | cut -d' ' -f2-)
        echo "$container: $status"
    done
}

# Check service response times
check_response_times() {
    print_header "Service Response Times"
    
    local services=(
        "API Gateway:http://localhost:8000/health"
        "Web Dashboard:http://localhost:3001"
        "MCP Server:http://localhost:8001/health"
        "Claude Service:http://localhost:8002/health"
        "Document Service:http://localhost:8003/health"
        "Task Service:http://localhost:8004/health"
        "Adminer:http://localhost:8080"
        "Redis Insight:http://localhost:8081"
    )
    
    for service_info in "${services[@]}"; do
        local name=$(echo "$service_info" | cut -d: -f1)
        local url=$(echo "$service_info" | cut -d: -f2-)
        
        local response_time=$(curl -w "%{time_total}" -s -o /dev/null "$url" 2>/dev/null || echo "ERROR")
        
        if [ "$response_time" = "ERROR" ]; then
            print_error "$name: Unable to connect"
        else
            local time_ms=$(echo "$response_time * 1000" | bc -l 2>/dev/null || echo "$response_time")
            if (( $(echo "$response_time > 2.0" | bc -l 2>/dev/null || echo 0) )); then
                print_warning "$name: ${time_ms}ms (slow)"
            elif (( $(echo "$response_time > 1.0" | bc -l 2>/dev/null || echo 0) )); then
                print_info "$name: ${time_ms}ms"
            else
                print_success "$name: ${time_ms}ms"
            fi
        fi
    done
}

# Check database performance
check_database_performance() {
    print_header "Database Performance"
    
    # PostgreSQL stats
    echo "PostgreSQL Performance:"
    if docker compose exec -T postgres pg_isready -U cycletime -d cycletime_dev >/dev/null 2>&1; then
        local pg_stats=$(docker compose exec -T postgres psql -U cycletime -d cycletime_dev -c "
            SELECT 
                'Active connections: ' || count(*) as connections
            FROM pg_stat_activity 
            WHERE state = 'active';
        " -t 2>/dev/null | xargs || echo "Unable to get stats")
        echo "  $pg_stats"
        
        # Database size
        local db_size=$(docker compose exec -T postgres psql -U cycletime -d cycletime_dev -c "
            SELECT pg_size_pretty(pg_database_size('cycletime_dev')) as size;
        " -t 2>/dev/null | xargs || echo "Unknown")
        echo "  Database size: $db_size"
    else
        print_error "PostgreSQL is not accessible"
    fi
    
    echo ""
    
    # Redis stats
    echo "Redis Performance:"
    if docker compose exec -T redis redis-cli ping >/dev/null 2>&1; then
        local redis_info=$(docker compose exec -T redis redis-cli info memory 2>/dev/null | grep "used_memory_human" | cut -d: -f2 | tr -d '\r' || echo "Unknown")
        echo "  Memory usage: $redis_info"
        
        local redis_keys=$(docker compose exec -T redis redis-cli dbsize 2>/dev/null || echo "0")
        echo "  Total keys: $redis_keys"
    else
        print_error "Redis is not accessible"
    fi
}

# Check volume performance
check_volume_performance() {
    print_header "Volume Performance"
    
    echo "Docker Volume Usage:"
    docker volume ls --format "table {{.Name}}\t{{.Driver}}" | grep cycletime || echo "No CycleTime volumes found"
    echo ""
    
    # Check volume sizes
    echo "Volume Sizes:"
    for volume in $(docker volume ls --format "{{.Name}}" | grep cycletime); do
        local size=$(docker run --rm -v "$volume":/volume alpine du -sh /volume 2>/dev/null | cut -f1 || echo "Unknown")
        echo "  $volume: $size"
    done
}

# Check network performance
check_network_performance() {
    print_header "Network Performance"
    
    echo "Docker Networks:"
    docker network ls --format "table {{.Name}}\t{{.Driver}}\t{{.Scope}}" | grep cycletime || echo "No CycleTime networks found"
    echo ""
    
    # Test inter-container connectivity
    echo "Inter-container Connectivity:"
    if docker compose exec -T api-gateway wget -q --spider http://postgres:5432 2>/dev/null; then
        print_success "API Gateway → PostgreSQL: OK"
    else
        print_warning "API Gateway → PostgreSQL: Failed"
    fi
    
    if docker compose exec -T api-gateway wget -q --spider http://redis:6379 2>/dev/null; then
        print_success "API Gateway → Redis: OK"
    else
        print_warning "API Gateway → Redis: Failed"
    fi
}

# Performance recommendations
show_recommendations() {
    print_header "Performance Recommendations"
    
    # Check system resources
    local total_containers=$(docker ps -q | wc -l)
    if [ "$total_containers" -gt 15 ]; then
        print_warning "High number of containers ($total_containers) - consider resource limits"
    fi
    
    # Check log sizes
    local log_dir="logs"
    if [ -d "$log_dir" ]; then
        local log_size=$(du -sh "$log_dir" 2>/dev/null | cut -f1 || echo "Unknown")
        print_info "Log directory size: $log_size"
        if [ "$(du -s "$log_dir" 2>/dev/null | cut -f1 || echo 0)" -gt 100000 ]; then
            print_warning "Large log directory - consider cleanup"
            echo "  Run: npm run logs:cleanup (when implemented)"
        fi
    fi
    
    # General recommendations
    echo ""
    echo "💡 Performance Tips:"
    echo "  • Use 'npm run docker:stats' to monitor real-time resource usage"
    echo "  • Run 'npm run docker:clean' periodically to free up space"
    echo "  • Consider increasing Docker memory allocation if containers are slow"
    echo "  • Use 'npm run logs:infrastructure' to monitor infrastructure logs"
    echo "  • Set resource limits in docker-compose.yml for production-like testing"
}

# Main function
main() {
    echo "⚡ CycleTime Performance Check"
    echo "=============================="
    
    check_docker_resources
    check_startup_times
    check_response_times
    check_database_performance
    check_volume_performance
    check_network_performance
    show_recommendations
    
    echo ""
    print_success "Performance check completed!"
    echo ""
    print_info "For continuous monitoring, run: npm run health:watch"
}

# Run performance check
main "$@"
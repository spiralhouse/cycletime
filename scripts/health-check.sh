#!/bin/bash

# CycleTime Health Check Script
# Validates all application services are running correctly

echo "🚀 CycleTime Health Check"
echo "=========================="
echo ""

all_healthy=true

# Application Services
echo "Application Services:"
echo "===================="

check_service() {
    local name="$1"
    local url="$2"
    echo -n "Checking $name... "
    
    if curl -s -f "$url" > /dev/null 2>&1; then
        echo "✅ HEALTHY"
    else
        echo "❌ UNHEALTHY"
        all_healthy=false
    fi
}

check_service "API Gateway" "http://localhost:8000/health"
check_service "Web Dashboard" "http://localhost:3001/health"
check_service "MCP Server" "http://localhost:8001/health"
check_service "Claude Service" "http://localhost:8002/health"
check_service "Document Service" "http://localhost:8003/health"
check_service "Task Service" "http://localhost:8004/health"

echo ""

# Infrastructure services
echo "Infrastructure Services:"
echo "========================"

# Check PostgreSQL
echo -n "Checking PostgreSQL... "
if docker compose exec -T postgres pg_isready -U cycletime -d cycletime_dev > /dev/null 2>&1; then
    echo "✅ HEALTHY"
else
    echo "❌ UNHEALTHY"
    all_healthy=false
fi

# Check Redis
echo -n "Checking Redis... "
if docker compose exec -T redis redis-cli ping > /dev/null 2>&1; then
    echo "✅ HEALTHY"
else
    echo "❌ UNHEALTHY"
    all_healthy=false
fi

# Check MinIO
echo -n "Checking MinIO... "
if curl -s -f "http://localhost:9000/minio/health/live" > /dev/null 2>&1; then
    echo "✅ HEALTHY"
else
    echo "❌ UNHEALTHY"
    all_healthy=false
fi

echo ""

if $all_healthy; then
    echo "🎉 All services are healthy!"
    echo ""
    echo "Application URLs:"
    echo "- Web Dashboard: http://localhost:3001"
    echo "- API Gateway: http://localhost:8000"
    echo "- MinIO Console: http://localhost:9001"
    exit 0
else
    echo "⚠️  Some services are unhealthy!"
    echo "Run 'docker compose ps' to check service status"
    echo "Run 'docker compose logs [service-name]' to check logs"
    exit 1
fi
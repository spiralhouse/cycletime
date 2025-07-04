#!/bin/bash
# =============================================================================
# Database Setup Script
# =============================================================================
# Sets up PostgreSQL databases, runs migrations, and seeds development data

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

echo "🗄️  Setting up CycleTime databases..."

# Wait for PostgreSQL to be ready
print_info "Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if docker compose exec -T postgres pg_isready -U cycletime -d cycletime_dev >/dev/null 2>&1; then
        print_success "PostgreSQL is ready"
        break
    fi
    echo -n "."
    sleep 2
done

# Create test database if it doesn't exist
print_info "Creating test database..."
if docker compose exec -T postgres psql -U cycletime -d cycletime_dev -c "SELECT 1 FROM pg_database WHERE datname='cycletime_test'" | grep -q 1; then
    print_info "Test database already exists"
else
    docker compose exec -T postgres createdb -U cycletime cycletime_test
    print_success "Test database created"
fi

# Run any initialization scripts
if [ -d "database/init" ]; then
    print_info "Running database initialization scripts..."
    for script in database/init/*.sql; do
        if [ -f "$script" ]; then
            print_info "Running $(basename "$script")..."
            docker compose exec -T postgres psql -U cycletime -d cycletime_dev -f "/docker-entrypoint-initdb.d/$(basename "$script")"
        fi
    done
    print_success "Database initialization completed"
fi

# TODO: Run migrations when implemented
print_info "Database migrations not yet implemented"

# TODO: Seed development data when implemented  
print_info "Database seeding not yet implemented"

print_success "Database setup completed!"
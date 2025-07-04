-- CycleTime Database Initialization
-- This script creates additional databases for testing
-- Main database and user are created automatically by postgres image

-- Create test database
CREATE DATABASE cycletime_test;

-- Grant privileges to the main user (from POSTGRES_USER env var)
-- The main database and user are created automatically by postgres image
GRANT ALL PRIVILEGES ON DATABASE cycletime_test TO cycletime;

-- Create extensions if needed
-- Connect to main database to add extensions
-- Note: The main database name comes from POSTGRES_DB environment variable (cycletime_dev in development)
\c cycletime_dev;

-- Enable commonly used PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Connect to test database to add extensions
\c cycletime_test;

-- Enable extensions in test database as well
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
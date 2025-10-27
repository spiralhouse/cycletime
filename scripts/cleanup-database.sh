#!/bin/bash
#
# Database Cleanup Script
#
# Deletes all records from the CycleTime H2 database with these rules:
# - DELETE: All projects except "Chess Demo"
# - DELETE: ALL issues (including Chess Demo issues)
# - DELETE: ALL dependencies
# - KEEP: Only the "Chess Demo" project record itself
#
# Usage: ./scripts/cleanup-database.sh
#
# IMPORTANT: Ensure CycleTime server is NOT running before executing this script!
#            The H2 database must not be locked by another process.

set -e

# Check if database is locked
if lsof cycletime.mv.db >/dev/null 2>&1; then
    echo "❌ Error: Database is currently in use by another process:"
    lsof cycletime.mv.db
    echo ""
    echo "   Please stop the CycleTime server (./gradlew run) or any other"
    echo "   processes accessing the database before running this script."
    exit 1
fi

echo "🗄️  CycleTime Database Cleanup Script"
echo "=================================================="
echo ""

# Find H2 JAR in Gradle cache
H2_JAR=$(find ~/.gradle/caches/modules-2/files-2.1/com.h2database/h2 -name "h2-*.jar" ! -name "*sources*" ! -name "*javadoc*" | head -1)

if [ -z "$H2_JAR" ]; then
    echo "❌ Error: H2 JAR not found in Gradle cache"
    echo "   Please run './gradlew build' first"
    exit 1
fi

echo "📦 Using H2 JAR: $H2_JAR"
echo ""

DB_PATH="./cycletime"

# Confirm deletion
echo "⚠️  Deletion plan:"
echo "   • DELETE: All projects except Chess Demo"
echo "   • DELETE: ALL issues (including Chess Demo issues)"
echo "   • DELETE: ALL dependencies"
echo "   • KEEP: Chess Demo project record only"
echo ""
read -p "   Proceed? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cleanup cancelled."
    exit 0
fi
echo ""

# Execute SQL using H2 Shell with RunScript
echo "🗑️  Executing cleanup SQL..."
java -cp "$H2_JAR" org.h2.tools.RunScript \
    -url "jdbc:h2:${DB_PATH};MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE" \
    -user "" \
    -password "" \
    -script "scripts/cleanup-database.sql" \
    -showResults

echo ""
echo "✅ Done!"

#!/usr/bin/env bash
# Warns about files exceeding target length

set -e

DOCS_DIR="docs"
TARGET=500
MAX=800
WARNINGS=0
ERRORS=0

echo "🔍 Checking document lengths..."

find "$DOCS_DIR" -name "*.md" -not -path "*/archive/*" -not -path "*/.templates/*" | while read -r file; do
    lines=$(wc -l < "$file")
    if [ $lines -gt $MAX ]; then
        echo "❌ $file: $lines lines (exceeds maximum $MAX)"
        ((ERRORS++))
    elif [ $lines -gt $TARGET ]; then
        echo "⚠️  $file: $lines lines (exceeds target $TARGET)"
        ((WARNINGS++))
    fi
done

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo "✅ All documents within target length"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo "⚠️  Found $WARNINGS warnings (but no blocking errors)"
    exit 0
else
    echo "❌ Found $ERRORS errors"
    exit 1
fi

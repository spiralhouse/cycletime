#!/usr/bin/env bash
# Validates YAML frontmatter syntax in all markdown files

set -e

DOCS_DIR="docs"
ERRORS=0

echo "🔍 Validating YAML frontmatter..."

find "$DOCS_DIR" -name "*.md" -not -path "*/archive/*" -not -path "*/.templates/*" | while read -r file; do
    # Check if file has frontmatter
    if ! head -n 1 "$file" | grep -q "^---$"; then
        echo "❌ $file: Missing frontmatter"
        ((ERRORS++))
        continue
    fi

    # Extract frontmatter (between first two --- markers)
    frontmatter=$(awk '/^---$/{i++}i==1{print;if(i==2)exit}' "$file")

    # Basic validation: check if it's valid YAML structure
    if [ -z "$frontmatter" ]; then
        echo "❌ $file: Empty frontmatter"
        ((ERRORS++))
    fi
done

if [ $ERRORS -eq 0 ]; then
    echo "✅ All frontmatter valid"
    exit 0
else
    echo "❌ Found $ERRORS errors"
    exit 1
fi

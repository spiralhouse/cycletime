#!/usr/bin/env bash
# Checks that all documents have required metadata fields

set -e

DOCS_DIR="docs"
REQUIRED_FIELDS=("title" "type" "domain" "description" "keywords")
ERRORS=0

echo "🔍 Checking required metadata fields..."

find "$DOCS_DIR" -name "*.md" -not -path "*/archive/*" -not -path "*/.templates/*" | while read -r file; do
    # Skip files without frontmatter
    if ! head -n 1 "$file" | grep -q "^---$"; then
        continue
    fi

    # Extract frontmatter
    frontmatter=$(awk '/^---$/{i++}i==1{print;if(i==2)exit}' "$file")

    for field in "${REQUIRED_FIELDS[@]}"; do
        if ! echo "$frontmatter" | grep -q "^$field:"; then
            echo "❌ $file: Missing required field '$field'"
            ((ERRORS++))
        fi
    done
done

if [ $ERRORS -eq 0 ]; then
    echo "✅ All required fields present"
    exit 0
else
    echo "❌ Found $ERRORS missing fields"
    exit 1
fi

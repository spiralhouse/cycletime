#!/usr/bin/env python3
"""Detects circular dependencies in documentation DAG"""

import sys
import re
from pathlib import Path
from typing import Dict, Set, List, Optional
from collections import defaultdict

def extract_frontmatter(filepath: Path) -> Optional[dict]:
    """Extract YAML frontmatter from markdown file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Check if file starts with frontmatter
        if not content.startswith('---\n'):
            return None

        # Extract frontmatter (between first two --- markers)
        parts = content.split('---\n', 2)
        if len(parts) < 3:
            return None

        frontmatter_text = parts[1]

        # Parse dependencies from frontmatter
        dependencies = []
        dep_match = re.search(r'dependencies:\s*\[(.*?)\]', frontmatter_text, re.DOTALL)
        if dep_match:
            deps_str = dep_match.group(1)
            # Extract individual dependencies
            dependencies = [d.strip().strip('"').strip("'") for d in deps_str.split(',') if d.strip()]

        return {'dependencies': dependencies}
    except Exception as e:
        print(f"⚠️  Error reading {filepath}: {e}", file=sys.stderr)
        return None

def build_graph(docs_dir: Path) -> Dict[str, Set[str]]:
    """Build dependency graph from all documents"""
    graph = defaultdict(set)

    # Find all markdown files
    for md_file in docs_dir.rglob("*.md"):
        # Skip archive and templates
        if 'archive' in md_file.parts or '.templates' in md_file.parts:
            continue

        frontmatter = extract_frontmatter(md_file)
        if not frontmatter:
            continue

        # Get relative path from docs dir
        rel_path = str(md_file.relative_to(docs_dir))

        # Add dependencies to graph
        for dep in frontmatter.get('dependencies', []):
            if dep:  # Skip empty strings
                graph[rel_path].add(dep)

    return dict(graph)

def detect_cycles(graph: Dict[str, Set[str]]) -> List[List[str]]:
    """Detect circular dependencies using DFS"""
    cycles = []
    visited = set()
    rec_stack = set()

    def dfs(node: str, path: List[str]) -> None:
        visited.add(node)
        rec_stack.add(node)
        path.append(node)

        for neighbor in graph.get(node, set()):
            if neighbor not in visited:
                dfs(neighbor, path.copy())
            elif neighbor in rec_stack:
                # Found a cycle
                cycle_start = path.index(neighbor)
                cycle = path[cycle_start:] + [neighbor]
                cycles.append(cycle)

        rec_stack.remove(node)

    # Check all nodes
    for node in graph:
        if node not in visited:
            dfs(node, [])

    return cycles

def main():
    print("🔍 Checking for circular dependencies...")

    # Get docs directory
    script_dir = Path(__file__).parent
    docs_dir = script_dir.parent

    # Build dependency graph
    graph = build_graph(docs_dir)

    if not graph:
        print("ℹ️  No dependencies found")
        return 0

    # Detect cycles
    cycles = detect_cycles(graph)

    if cycles:
        print(f"❌ Found {len(cycles)} circular dependency chain(s):")
        for i, cycle in enumerate(cycles, 1):
            print(f"\n  Cycle {i}:")
            for doc in cycle:
                print(f"    → {doc}")
        return 1
    else:
        print("✅ No circular dependencies detected")
        return 0

if __name__ == "__main__":
    sys.exit(main())

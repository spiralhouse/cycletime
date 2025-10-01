#!/usr/bin/env python3
"""
Documentation Dependency Analyzer for CycleTime CE

Analyzes markdown files in docs/ and .claude/ directories to map
inter-document link relationships and identify hub vs leaf documents.

Usage:
    python3 scripts/analyze-doc-dependencies.py

Output:
    docs-dependency-map.json in project root
"""

import json
import re
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Set, Tuple, Optional

# Configuration
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DOCS_DIRS = ["docs", ".claude"]
OUTPUT_FILE = "docs-dependency-map.json"

# Regex patterns for link extraction
CLAUDE_REF_PATTERN = r'@([\w\-/.]+\.md)'
MD_LINK_PATTERN = r'\[([^\]]+)\]\(([^)]+\.md)(?:#([^)]+))?\)'

def find_markdown_files() -> List[Path]:
    """
    Find all markdown files in configured directories.
    Returns paths relative to project root.
    """
    files = []

    # Search configured directories
    for dir_name in DOCS_DIRS:
        dir_path = PROJECT_ROOT / dir_name
        if dir_path.exists() and dir_path.is_dir():
            files.extend(dir_path.rglob("*.md"))

    # Include CLAUDE.md in project root
    claude_md = PROJECT_ROOT / "CLAUDE.md"
    if claude_md.exists():
        files.append(claude_md)

    # Convert to relative paths and sort
    relative_paths = sorted([f.relative_to(PROJECT_ROOT) for f in files])

    return relative_paths

def normalize_link_path(link: str, source_file: Path) -> Optional[Path]:
    """
    Normalize a link path to be relative to project root.

    Args:
        link: The raw link path from markdown
        source_file: The file containing the link (relative to project root)

    Returns:
        Normalized path relative to project root, or None if invalid
    """
    # Strip whitespace
    link = link.strip()

    # Skip external links
    if link.startswith(('http://', 'https://', 'mailto:')):
        return None

    # Determine if path is absolute from project root
    # Absolute paths start with '/' or with known root directories
    is_absolute = link.startswith('/') or link.startswith(tuple(DOCS_DIRS)) or link.startswith('CLAUDE.md')

    if is_absolute:
        # Handle absolute paths (from project root)
        normalized = Path(link.lstrip('/'))
    else:
        # Handle relative paths
        source_dir = source_file.parent

        # Compute the target path (not resolved yet)
        target_path = source_dir / link

        # Normalize the path (resolve .. and . components)
        parts = []
        for part in target_path.parts:
            if part == '..':
                if parts:
                    parts.pop()
            elif part != '.':
                parts.append(part)

        normalized = Path(*parts) if parts else Path('.')

    # Ensure it's a .md file
    if not str(normalized).endswith('.md'):
        return None

    # Verify the file exists in project
    full_path = PROJECT_ROOT / normalized
    if not full_path.exists():
        # Link might be broken, but still record it
        pass

    return normalized

def extract_links_from_file(file_path: Path) -> List[Tuple[str, Optional[str]]]:
    """
    Extract all internal documentation links from a markdown file.

    Args:
        file_path: Path to markdown file (relative to project root)

    Returns:
        List of (target_path, anchor) tuples
    """
    full_path = PROJECT_ROOT / file_path

    if not full_path.exists():
        print(f"⚠️  File not found: {file_path}")
        return []

    try:
        content = full_path.read_text(encoding='utf-8')
    except Exception as e:
        print(f"⚠️  Could not read {file_path}: {e}")
        return []

    links = []

    # Extract Claude-style references (@file.md)
    for match in re.finditer(CLAUDE_REF_PATTERN, content):
        raw_link = match.group(1)
        normalized = normalize_link_path(raw_link, file_path)

        if normalized:
            links.append((str(normalized), None))

    # Extract markdown links ([text](path.md#anchor))
    for match in re.finditer(MD_LINK_PATTERN, content):
        raw_link = match.group(2)
        anchor = match.group(3)

        normalized = normalize_link_path(raw_link, file_path)

        if normalized:
            links.append((str(normalized), anchor))

    return links

def build_dependency_graph(files: List[Path]) -> Tuple[List[str], List[Dict], Dict[str, int], List[Dict]]:
    """
    Build complete dependency graph from markdown files.

    Returns:
        Tuple of (all_files, links, incoming_refs, broken_links)
    """
    all_files_set = {str(f) for f in files}
    links = []
    broken_links = []
    incoming_refs = defaultdict(int)
    seen_edges = set()  # Track unique edges for incoming ref counting

    for source_file in files:
        source_str = str(source_file)
        extracted = extract_links_from_file(source_file)

        for target, anchor in extracted:
            # Create link record
            link_data = {
                "from": source_str,
                "to": target
            }
            if anchor:
                link_data["anchor"] = anchor

            links.append(link_data)

            # Check if link is broken
            target_path = PROJECT_ROOT / target
            if not target_path.exists():
                broken_links.append(link_data.copy())

            # Count incoming refs (unique edges only, no self-refs)
            edge = (source_str, target)
            if target in all_files_set and target != source_str and edge not in seen_edges:
                incoming_refs[target] += 1
                seen_edges.add(edge)

    return sorted(list(all_files_set)), links, incoming_refs, broken_links

def classify_documents(files: Set[str], incoming_refs: Dict[str, int]) -> Tuple[List[Dict], List[str]]:
    """
    Classify documents as hubs (>5 refs) or leaves (<2 refs).

    Returns:
        Tuple of (hub_docs, leaf_docs)
    """
    hub_docs = []
    leaf_docs = []

    for file in files:
        ref_count = incoming_refs.get(file, 0)

        if ref_count > 5:
            hub_docs.append({
                "file": file,
                "incoming_refs": ref_count
            })
        elif ref_count < 2:
            leaf_docs.append(file)

    # Sort hubs by reference count (descending)
    hub_docs.sort(key=lambda x: x["incoming_refs"], reverse=True)
    leaf_docs.sort()

    return hub_docs, leaf_docs

def generate_report(all_files: List[str], links: List[Dict],
                   hub_docs: List[Dict], leaf_docs: List[str],
                   broken_links: List[Dict]) -> Dict:
    """Generate final JSON report structure."""
    return {
        "files": all_files,
        "links": links,
        "hub_docs": hub_docs,
        "leaf_docs": leaf_docs,
        "broken_links": broken_links
    }

def main():
    """Main execution flow."""
    print("🔍 Documentation Dependency Analyzer")
    print("=" * 50)

    # Step 1: Find all markdown files
    print("\n📁 Finding markdown files...")
    files = find_markdown_files()
    print(f"   Found {len(files)} files")

    # Step 2: Build dependency graph
    print("\n🔗 Building dependency graph...")
    all_files, links, incoming_refs, broken_links = build_dependency_graph(files)
    print(f"   Discovered {len(links)} total link references")
    print(f"   Identified {len(set((l['from'], l['to']) for l in links))} unique links")
    print(f"   Found {len(broken_links)} broken links")

    # Step 3: Classify documents
    print("\n📊 Classifying documents...")
    hub_docs, leaf_docs = classify_documents(set(all_files), incoming_refs)
    print(f"   Hub docs (>5 refs): {len(hub_docs)}")
    print(f"   Leaf docs (<2 refs): {len(leaf_docs)}")
    intermediate = len(all_files) - len(hub_docs) - len(leaf_docs)
    print(f"   Intermediate docs (2-5 refs): {intermediate}")

    # Step 4: Generate output
    print("\n💾 Generating output...")
    report = generate_report(all_files, links, hub_docs, leaf_docs, broken_links)

    output_path = PROJECT_ROOT / OUTPUT_FILE
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2)

    print(f"   ✅ Written to {OUTPUT_FILE}")

    # Step 5: Print summary
    print("\n" + "=" * 50)
    print("📈 SUMMARY")
    print("=" * 50)
    print(f"Total files analyzed: {len(all_files)}")
    print(f"Total link references: {len(links)}")
    print(f"Broken links: {len(broken_links)}")

    print(f"\n🌟 Top Hub Documents:")
    for hub in hub_docs[:10]:
        print(f"   {hub['incoming_refs']:3d} refs  {hub['file']}")
    if len(hub_docs) > 10:
        print(f"   ... and {len(hub_docs) - 10} more hub docs")

    print(f"\n🍃 Leaf Documents ({len(leaf_docs)} total):")
    for leaf in leaf_docs[:10]:
        print(f"   {leaf}")
    if len(leaf_docs) > 10:
        print(f"   ... and {len(leaf_docs) - 10} more leaf docs")

    if broken_links:
        print(f"\n⚠️  Broken Links ({len(broken_links)} total):")
        # Group by source file
        from collections import defaultdict
        broken_by_file = defaultdict(list)
        for link in broken_links:
            broken_by_file[link['from']].append(link['to'])

        for source_file in sorted(broken_by_file.keys())[:5]:
            targets = broken_by_file[source_file]
            print(f"   {source_file}: {len(targets)} broken link(s)")
        if len(broken_by_file) > 5:
            print(f"   ... and {len(broken_by_file) - 5} more files with broken links")

    print("\n✅ Analysis complete!")

if __name__ == "__main__":
    main()

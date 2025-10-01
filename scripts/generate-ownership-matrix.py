#!/usr/bin/env python3
"""
Generate domain ownership matrix for documentation files.
Partitions all documentation files into domains and identifies cross-domain dependencies.
"""

import json
import sys
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Set, Tuple


def classify_domain(file_path: str) -> str:
    """
    Classify a file into one of 5 domains based on directory structure.

    Domains:
    - architecture: docs/architecture/*, docs/api/*, docs/adr/*
    - development: docs/development/*, .claude/workflows/*, .claude/commands/*
    - testing: docs/testing/*, docs/ci-cd/*, docs/operations/*, docs/performance/*
    - reference: docs/reference/*, docs/getting-started/*, .claude/agents/*, .claude/shared/*
    - archive: docs/archive/*, docs/migration/*, legacy documents
    """

    # Special case: root CLAUDE.md is cross-domain coordination hub
    if file_path == "CLAUDE.md":
        return "coordination"  # Special marker for cross-domain files

    # Architecture domain
    if any(file_path.startswith(prefix) for prefix in [
        "docs/architecture/",
        "docs/api/",
        "docs/adr/"
    ]):
        return "architecture"

    # Development domain
    if any(file_path.startswith(prefix) for prefix in [
        "docs/development/",
        ".claude/workflows/",
        ".claude/commands/"
    ]):
        return "development"

    # Testing domain
    if any(file_path.startswith(prefix) for prefix in [
        "docs/testing/",
        "docs/ci-cd/",
        "docs/operations/",
        "docs/performance/"
    ]):
        return "testing"

    # Reference domain
    if any(file_path.startswith(prefix) for prefix in [
        "docs/reference/",
        "docs/getting-started/",
        ".claude/agents/",
        ".claude/shared/"
    ]):
        return "reference"

    # Archive domain
    if any(file_path.startswith(prefix) for prefix in [
        "docs/archive/",
        "docs/migration/"
    ]):
        return "archive"

    # Root docs/ files and other .claude/ files
    if file_path.startswith("docs/") and file_path.count("/") == 1:
        # Root-level docs files (docs/README.md, etc.)
        return "reference"

    if file_path.startswith(".claude/"):
        # Other .claude/ files (README, test-scenarios)
        return "reference"

    # Fallback (should not happen if all files are classified)
    print(f"WARNING: Unclassified file: {file_path}", file=sys.stderr)
    return "reference"  # Default to reference domain


def assign_hub_owner(file_path: str, hub_domain: str) -> str:
    """
    Assign ownership for hub documents.
    Hub docs are owned by their natural domain unless they're cross-domain.
    """
    if hub_domain == "coordination":
        return "coordination-required"
    return hub_domain


def analyze_cross_domain_links(
    links: List[Dict],
    domain_map: Dict[str, str],
    hub_files: Set[str]
) -> List[Dict]:
    """
    Identify links that cross domain boundaries.
    Prioritize links targeting hub documents.
    """
    cross_domain_links = []

    for link in links:
        source = link["from"]
        target = link["to"]

        # Skip if either file is not in our domain map (broken link)
        if source not in domain_map or target not in domain_map:
            continue

        source_domain = domain_map[source]
        target_domain = domain_map[target]

        # Check if domains differ
        if source_domain != target_domain:
            # Determine coordination priority
            if target in hub_files:
                note = "requires coordination - hub document target"
            elif source_domain == "coordination" or target_domain == "coordination":
                note = "requires coordination - cross-domain hub link"
            else:
                note = "monitor for link breakage during parallel edits"

            cross_domain_links.append({
                "from": source,
                "from_domain": source_domain,
                "to": target,
                "to_domain": target_domain,
                "note": note
            })

    return cross_domain_links


def generate_ownership_matrix(dependency_map_path: str, output_path: str):
    """Main function to generate ownership matrix from dependency map."""

    # Load dependency map
    print(f"Loading dependency map from: {dependency_map_path}")
    with open(dependency_map_path, 'r') as f:
        dep_map = json.load(f)

    files = dep_map["files"]
    links = dep_map["links"]
    hub_docs_data = dep_map["hub_docs"]

    print(f"Found {len(files)} files to classify")
    print(f"Found {len(links)} links to analyze")
    print(f"Found {len(hub_docs_data)} hub documents")

    # Classify all files into domains
    domain_map = {}  # file_path -> domain
    domain_assignments = defaultdict(list)  # domain -> [files]

    for file_path in files:
        domain = classify_domain(file_path)
        domain_map[file_path] = domain

        # Store in appropriate domain list (handle coordination separately)
        if domain != "coordination":
            domain_assignments[domain].append(file_path)

    # Identify hub documents and assign owners
    hub_files = set()
    hub_docs = {}  # file_path -> owner

    # Add hub docs from dependency analysis
    for hub_data in hub_docs_data:
        file_path = hub_data["file"]
        hub_files.add(file_path)
        domain = domain_map.get(file_path, "unknown")
        owner = assign_hub_owner(file_path, domain)
        hub_docs[file_path] = owner

    # Special case: CLAUDE.md as coordination hub
    if "CLAUDE.md" in domain_map:
        hub_files.add("CLAUDE.md")
        hub_docs["CLAUDE.md"] = "coordination-required"

    print(f"Identified {len(hub_docs)} hub documents with ownership")

    # Analyze cross-domain links
    cross_domain_links = analyze_cross_domain_links(links, domain_map, hub_files)

    print(f"Found {len(cross_domain_links)} cross-domain links")

    # Calculate statistics
    total_files = len(files)
    total_domains = len(domain_assignments)
    hub_docs_count = len(hub_docs)
    cross_domain_links_count = len(cross_domain_links)

    # Prepare output structure
    output = {
        "metadata": {
            "total_files": total_files,
            "total_domains": total_domains,
            "hub_docs_count": hub_docs_count,
            "cross_domain_links_count": cross_domain_links_count,
            "domain_distribution": {
                domain: len(files) for domain, files in domain_assignments.items()
            }
        },
        "hub_docs": hub_docs,
        "domain_assignments": {
            domain: sorted(files) for domain, files in domain_assignments.items()
        },
        "cross_domain_links": cross_domain_links
    }

    # Write output
    print(f"\nWriting ownership matrix to: {output_path}")
    with open(output_path, 'w') as f:
        json.dump(output, f, indent=2)

    # Print summary
    print("\n" + "=" * 60)
    print("DOMAIN OWNERSHIP MATRIX GENERATED")
    print("=" * 60)
    print(f"\nTotal files classified: {total_files}")
    print(f"Total domains: {total_domains}")
    print(f"Hub documents: {hub_docs_count}")
    print(f"Cross-domain links: {cross_domain_links_count}")

    print("\nDomain distribution:")
    for domain in sorted(domain_assignments.keys()):
        file_count = len(domain_assignments[domain])
        percentage = (file_count / total_files) * 100
        print(f"  {domain:12} {file_count:3} files ({percentage:5.1f}%)")

    print("\nHub documents by owner:")
    hub_by_owner = defaultdict(list)
    for file_path, owner in hub_docs.items():
        hub_by_owner[owner].append(file_path)

    for owner in sorted(hub_by_owner.keys()):
        print(f"  {owner}:")
        for file_path in sorted(hub_by_owner[owner]):
            print(f"    - {file_path}")

    print("\nCross-domain link priority breakdown:")
    priority_counts = defaultdict(int)
    for link in cross_domain_links:
        if "hub document" in link["note"]:
            priority_counts["High priority (hub targets)"] += 1
        elif "coordination" in link["note"]:
            priority_counts["Medium priority (coordination hub)"] += 1
        else:
            priority_counts["Low priority (leaf targets)"] += 1

    for priority, count in sorted(priority_counts.items()):
        print(f"  {priority}: {count}")

    print("\n" + "=" * 60)
    print("Validation checks:")
    print("=" * 60)

    # Validation checks
    all_assigned = sum(len(files) for files in domain_assignments.values())
    coordination_files = sum(1 for d in domain_map.values() if d == "coordination")

    print(f"✓ Files assigned to domains: {all_assigned}")
    print(f"✓ Coordination hub files: {coordination_files}")
    print(f"✓ Total accounted for: {all_assigned + coordination_files} / {total_files}")

    if all_assigned + coordination_files == total_files:
        print("✓ All files successfully classified!")
    else:
        print("⚠ WARNING: Some files may not be classified")
        missing = total_files - (all_assigned + coordination_files)
        print(f"  Missing: {missing} files")

    # Check for balanced distribution (no domain should have >60%)
    max_domain_pct = max((len(files) / total_files * 100) for files in domain_assignments.values())
    if max_domain_pct > 60:
        print(f"⚠ WARNING: Imbalanced distribution - largest domain has {max_domain_pct:.1f}%")
    else:
        print(f"✓ Balanced distribution - largest domain has {max_domain_pct:.1f}%")

    print("\n" + "=" * 60)
    print("READY FOR PHASE 2 PARALLEL EXECUTION")
    print("=" * 60)


if __name__ == "__main__":
    # File paths
    script_dir = Path(__file__).parent
    project_root = script_dir.parent

    dependency_map_path = project_root / "docs-dependency-map.json"
    output_path = project_root / "docs-ownership-matrix.json"

    # Verify input exists
    if not dependency_map_path.exists():
        print(f"ERROR: Dependency map not found at {dependency_map_path}", file=sys.stderr)
        sys.exit(1)

    # Generate ownership matrix
    generate_ownership_matrix(str(dependency_map_path), str(output_path))

    print(f"\n✓ Output written to: {output_path}")
    print("✓ Ready for SPI-645 to SPI-648 parallel domain audits")

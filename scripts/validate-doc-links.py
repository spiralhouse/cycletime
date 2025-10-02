#!/usr/bin/env python3
"""
Documentation Link Validator for Phase 4: Validation & Integration (SPI-642)

Validates:
- Markdown relative path links: [text](path/to/file.md)
- @file references: @path/to/file.md
- Anchor links: [text](#anchor) and [text](file.md#anchor)
- Cross-references between documents

Reports:
- Broken links (missing files)
- Invalid anchors (heading doesn't exist)
- Suggestions for fixes
"""

import re
import os
from pathlib import Path
from typing import List, Tuple, Set, Dict
from collections import defaultdict

class LinkValidator:
    def __init__(self, root_dir: str):
        self.root = Path(root_dir)
        self.errors: List[Tuple[str, int, str, str]] = []  # (file, line, link, issue)
        self.warnings: List[Tuple[str, int, str, str]] = []  # (file, line, link, warning)
        self.checked_files: Set[str] = set()
        self.anchors_by_file: Dict[str, Set[str]] = {}

    def extract_anchors(self, file_path: Path) -> Set[str]:
        """Extract all heading anchors from a markdown file."""
        anchors = set()
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                for line in f:
                    # Match markdown headings: # Heading, ## Heading, etc.
                    match = re.match(r'^#{1,6}\s+(.+)$', line.strip())
                    if match:
                        heading = match.group(1)
                        # Convert to GitHub-style anchor
                        anchor = heading.lower()
                        anchor = re.sub(r'[^\w\s-]', '', anchor)  # Remove punctuation
                        anchor = re.sub(r'\s+', '-', anchor)  # Spaces to dashes
                        anchors.add(anchor)
        except Exception as e:
            pass
        return anchors

    def resolve_link_path(self, source_file: Path, link_path: str) -> Path:
        """Resolve a relative link path from source file."""
        # Handle absolute paths starting with / as project-relative
        if link_path.startswith('/'):
            target_path = (self.root / link_path.lstrip('/')).resolve()
        else:
            source_dir = source_file.parent
            target_path = (source_dir / link_path).resolve()
        return target_path

    def validate_file_link(self, source_file: Path, line_num: int, link_text: str, link_path: str, anchor: str = None):
        """Validate a file link and optional anchor."""
        # Resolve the target file path
        target_file = self.resolve_link_path(source_file, link_path)

        # Check if file exists
        if not target_file.exists():
            try:
                target_rel = target_file.relative_to(self.root)
            except ValueError:
                target_rel = target_file
            self.errors.append((
                str(source_file.relative_to(self.root)),
                line_num,
                f"[{link_text}]({link_path}{'#' + anchor if anchor else ''})",
                f"File not found: {target_rel}"
            ))
            return

        # Check if it's a markdown file
        if target_file.suffix != '.md':
            self.warnings.append((
                str(source_file.relative_to(self.root)),
                line_num,
                f"[{link_text}]({link_path})",
                f"Non-markdown link target: {target_file.suffix}"
            ))

        # If anchor specified, validate it exists in target file
        if anchor:
            if str(target_file) not in self.anchors_by_file:
                self.anchors_by_file[str(target_file)] = self.extract_anchors(target_file)

            anchors = self.anchors_by_file[str(target_file)]
            if anchor not in anchors:
                self.errors.append((
                    str(source_file.relative_to(self.root)),
                    line_num,
                    f"[{link_text}]({link_path}#{anchor})",
                    f"Anchor not found in {target_file.name}. Available: {sorted(anchors)[:5]}"
                ))

    def validate_anchor_link(self, source_file: Path, line_num: int, link_text: str, anchor: str):
        """Validate an anchor link within the same file."""
        if str(source_file) not in self.anchors_by_file:
            self.anchors_by_file[str(source_file)] = self.extract_anchors(source_file)

        anchors = self.anchors_by_file[str(source_file)]
        if anchor not in anchors:
            self.errors.append((
                str(source_file.relative_to(self.root)),
                line_num,
                f"[{link_text}](#{anchor})",
                f"Anchor not found in current file. Available: {sorted(anchors)[:5]}"
            ))

    def validate_file(self, file_path: Path):
        """Validate all links in a single markdown file."""
        self.checked_files.add(str(file_path))

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
        except Exception as e:
            self.errors.append((str(file_path.relative_to(self.root)), 0, "", f"Cannot read file: {e}"))
            return

        for line_num, line in enumerate(lines, 1):
            # Pattern 1: @file.md references
            at_refs = re.finditer(r'@([^\s\)]+\.md)', line)
            for match in at_refs:
                link_path = match.group(1)
                self.validate_file_link(file_path, line_num, f"@{link_path}", link_path)

            # Pattern 2: [text](path/to/file.md) or [text](path/to/file.md#anchor)
            md_links = re.finditer(r'\[([^\]]+)\]\(([^)]+)\)', line)
            for match in md_links:
                link_text = match.group(1)
                link_target = match.group(2)

                # Skip external URLs
                if link_target.startswith(('http://', 'https://', 'mailto:')):
                    continue

                # Split into file and anchor
                if '#' in link_target:
                    link_path, anchor = link_target.split('#', 1)
                    if link_path:  # Link to another file with anchor
                        self.validate_file_link(file_path, line_num, link_text, link_path, anchor)
                    else:  # Anchor in current file
                        self.validate_anchor_link(file_path, line_num, link_text, anchor)
                elif link_target.endswith('.md'):
                    # Link to another markdown file
                    self.validate_file_link(file_path, line_num, link_text, link_target)

    def validate_all(self, patterns: List[str] = None):
        """Validate all markdown files matching patterns."""
        if patterns is None:
            patterns = ['docs/**/*.md', '.claude/**/*.md']

        for pattern in patterns:
            for file_path in self.root.glob(pattern):
                if file_path.is_file():
                    self.validate_file(file_path)

    def generate_report(self) -> str:
        """Generate a validation report."""
        report = []
        report.append("# Documentation Link Validation Report")
        report.append(f"\n**Phase**: 4 - Validation & Integration (SPI-642)")
        report.append(f"**Date**: {Path(__file__).stat().st_mtime}")
        report.append(f"**Files Checked**: {len(self.checked_files)}")
        report.append(f"\n## Summary\n")
        report.append(f"- **Errors**: {len(self.errors)}")
        report.append(f"- **Warnings**: {len(self.warnings)}")
        report.append(f"- **Status**: {'✅ PASS' if len(self.errors) == 0 else '❌ FAIL'}")

        if self.errors:
            report.append(f"\n## ❌ Errors ({len(self.errors)})\n")
            report.append("Broken links that must be fixed:\n")
            for file, line, link, issue in sorted(self.errors):
                report.append(f"- **{file}:{line}**")
                report.append(f"  - Link: `{link}`")
                report.append(f"  - Issue: {issue}\n")

        if self.warnings:
            report.append(f"\n## ⚠️  Warnings ({len(self.warnings)})\n")
            report.append("Non-critical issues to review:\n")
            for file, line, link, warning in sorted(self.warnings):
                report.append(f"- **{file}:{line}**")
                report.append(f"  - Link: `{link}`")
                report.append(f"  - Warning: {warning}\n")

        if len(self.errors) == 0 and len(self.warnings) == 0:
            report.append("\n## ✅ All Links Valid\n")
            report.append("No broken links or issues found. All documentation links are valid.")

        return '\n'.join(report)


if __name__ == '__main__':
    # Get project root (parent directory of scripts/)
    script_dir = Path(__file__).parent
    project_root = script_dir.parent

    validator = LinkValidator(str(project_root))
    validator.validate_all()
    report = validator.generate_report()
    print(report)

    # Exit with error code if there are broken links
    exit(1 if len(validator.errors) > 0 else 0)

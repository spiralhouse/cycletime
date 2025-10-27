#!/usr/bin/env python3
"""
Database Cleanup Script

Deletes all records from the CycleTime H2 database with these rules:
- DELETE: All projects except "Chess Demo"
- DELETE: ALL issues (including Chess Demo issues)
- DELETE: ALL dependencies
- KEEP: Only the "Chess Demo" project record itself

Usage: python3 scripts/cleanup-database.py
"""

import jaydebeapi
import sys
from pathlib import Path


def main():
    print("🗄️  CycleTime Database Cleanup Script")
    print("=" * 50)
    print()

    # Database connection
    db_path = Path("./cycletime-ce")

    # Try to find H2 JAR in Gradle cache
    gradle_cache = Path.home() / ".gradle/caches/modules-2/files-2.1/com.h2database/h2"
    h2_jar = None

    if gradle_cache.exists():
        # Find the first h2 JAR in the cache (exclude sources and javadoc)
        for jar in gradle_cache.rglob("*.jar"):
            if "sources" not in jar.name and "javadoc" not in jar.name:
                h2_jar = jar
                break

    if h2_jar is None or not h2_jar.exists():
        # Fallback to Maven local repo
        h2_jar = Path.home() / ".m2/repository/com/h2database/h2/2.2.224/h2-2.2.224.jar"

    if not h2_jar.exists():
        print(f"❌ Error: H2 JAR not found")
        print("   Searched in:")
        print(f"     - {gradle_cache}")
        print(f"     - {Path.home() / '.m2/repository/com/h2database/h2'}")
        print("   Please run './gradlew build' first to download dependencies")
        sys.exit(1)

    print(f"📦 Using H2 JAR: {h2_jar}")
    print()

    try:
        conn = jaydebeapi.connect(
            "org.h2.Driver",
            f"jdbc:h2:{db_path}",
            ["", ""],
            str(h2_jar)
        )
        cursor = conn.cursor()

        # Step 1: Find Chess Demo project
        print("🔍 Looking for 'Chess Demo' project...")
        cursor.execute("SELECT id, name FROM projects WHERE name = 'Chess Demo'")
        chess_demo = cursor.fetchone()

        if chess_demo is None:
            print("⚠️  Warning: 'Chess Demo' project not found!")
            print("   All projects will be deleted.")
            chess_demo_id = None
        else:
            chess_demo_id = chess_demo[0]
            print(f"✅ Found 'Chess Demo' project (ID: {chess_demo_id})")
        print()

        # Step 2: Count current records
        print("📊 Current database state:")
        cursor.execute("SELECT COUNT(*) FROM projects")
        total_projects = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM issues")
        total_issues = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM issue_dependencies")
        total_dependencies = cursor.fetchone()[0]

        print(f"   Projects: {total_projects}")
        print(f"   Issues: {total_issues}")
        print(f"   Dependencies: {total_dependencies}")
        print()

        # Step 3: Confirm deletion
        print("⚠️  Deletion plan:")
        print("   • DELETE: All projects except Chess Demo")
        print("   • DELETE: ALL issues (including Chess Demo issues)")
        print("   • DELETE: ALL dependencies")
        print("   • KEEP: Chess Demo project record only")
        print()

        response = input("   Proceed? (y/N): ").strip().lower()
        if response != 'y':
            print("❌ Cleanup cancelled.")
            conn.close()
            sys.exit(0)
        print()

        # Step 4: Delete in correct order (respecting foreign keys)
        print("🗑️  Deleting records...")

        # 4a. Delete ALL issue dependencies (no exceptions)
        cursor.execute("DELETE FROM issue_dependencies")
        dependencies_deleted = cursor.rowcount
        print(f"   ✓ Deleted {dependencies_deleted} issue dependencies")

        # 4b. Delete ALL issues (including Chess Demo issues)
        cursor.execute("DELETE FROM issues")
        issues_deleted = cursor.rowcount
        print(f"   ✓ Deleted {issues_deleted} issues")

        # 4c. Delete all projects EXCEPT Chess Demo
        if chess_demo_id is not None:
            cursor.execute("DELETE FROM projects WHERE id != ?", [chess_demo_id])
        else:
            cursor.execute("DELETE FROM projects")
        projects_deleted = cursor.rowcount
        print(f"   ✓ Deleted {projects_deleted} projects")
        print()

        # Commit the transaction
        conn.commit()

        # Step 5: Show final state
        print("📊 Final database state:")
        cursor.execute("SELECT COUNT(*) FROM projects")
        remaining_projects = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM issues")
        remaining_issues = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM issue_dependencies")
        remaining_dependencies = cursor.fetchone()[0]

        print(f"   Projects: {remaining_projects}")
        print(f"   Issues: {remaining_issues}")
        print(f"   Dependencies: {remaining_dependencies}")
        print()

        if chess_demo_id is not None:
            print("✅ Cleanup complete!")
            print("   • Chess Demo project record preserved")
            print("   • All issues deleted (including Chess Demo issues)")
            print("   • All other projects deleted")
        else:
            print("✅ Cleanup complete! All records deleted.")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

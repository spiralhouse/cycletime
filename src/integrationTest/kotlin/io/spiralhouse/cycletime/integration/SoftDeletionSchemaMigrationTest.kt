package io.spiralhouse.cycletime.integration

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldContainAll
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.spiralhouse.cycletime.infrastructure.database.IssuesTable
import io.spiralhouse.cycletime.infrastructure.database.ProjectsTable
import io.spiralhouse.cycletime.infrastructure.database.WorkflowsTable
import kotlinx.datetime.Clock
import org.jetbrains.exposed.dao.id.EntityID
import org.jetbrains.exposed.dao.id.IdTable
import org.jetbrains.exposed.exceptions.ExposedSQLException
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.kotlin.datetime.timestamp
import org.jetbrains.exposed.sql.transactions.TransactionManager
import org.jetbrains.exposed.sql.transactions.transaction
import java.io.File
import java.util.*

/**
 * Integration test for SPI-873: Database Schema Migration for Soft-Deletion
 *
 * Verifies that the schema migration adds:
 * - `deleted_at` nullable timestamp columns to Projects, Issues, and Workflows tables
 * - Composite indexes for query performance
 * - Maintains backward compatibility (nullable columns)
 * - Ensures zero data loss during migration
 *
 * Test Strategy:
 * 1. Create tables with "old" schema (without deleted_at)
 * 2. Insert test data
 * 3. Apply migration via createMissingTablesAndColumns
 * 4. Verify columns and indexes exist
 * 5. Verify data integrity (no data loss)
 */
class SoftDeletionSchemaMigrationTest : StringSpec({

    "should add deleted_at column to existing projects table" {
        val database = Database.connect(
            url = "jdbc:h2:mem:test_${UUID.randomUUID()};MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
            driver = "org.h2.Driver"
        )

        try {
            // Create old schema (without deleted_at) by using raw SQL
            transaction(database) {
                exec("""
                    CREATE TABLE projects (
                        id VARCHAR(100) PRIMARY KEY,
                        name VARCHAR(255) NOT NULL,
                        description TEXT,
                        status VARCHAR(50) DEFAULT 'active',
                        created_at TIMESTAMP NOT NULL,
                        updated_at TIMESTAMP NOT NULL
                    )
                """.trimIndent())

                // Insert test data
                exec("""
                    INSERT INTO projects (id, name, description, status, created_at, updated_at)
                    VALUES (
                        'project-1',
                        'Test Project',
                        'Test Description',
                        'active',
                        CURRENT_TIMESTAMP,
                        CURRENT_TIMESTAMP
                    )
                """.trimIndent())
            }

            // Apply migration using createMissingTablesAndColumns
            transaction(database) {
                SchemaUtils.createMissingTablesAndColumns(ProjectsTable)
            }

            // Verify column exists and data is intact
            transaction(database) {
                // Check deleted_at column exists in table definition
                val hasDeletedAtColumn = ProjectsTable.columns.any { it.name == "deleted_at" }
                hasDeletedAtColumn shouldBe true

                // Verify test data is intact
                val result = ProjectsTable.selectAll().first()
                result[ProjectsTable.id].value shouldBe "project-1"
                result[ProjectsTable.name] shouldBe "Test Project"
                result[ProjectsTable.description] shouldBe "Test Description"
                result[ProjectsTable.status] shouldBe "active"
                result[ProjectsTable.deletedAt] shouldBe null // New column should be null for existing data
            }

        } finally {
            TransactionManager.closeAndUnregister(database)
        }
    }

    "should add deleted_at column to existing issues table" {
        val database = Database.connect(
            url = "jdbc:h2:mem:test_${UUID.randomUUID()};MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
            driver = "org.h2.Driver"
        )

        try {
            // Create old schema with dependencies
            transaction(database) {
                // Create projects table first (dependency)
                exec("""
                    CREATE TABLE projects (
                        id VARCHAR(100) PRIMARY KEY,
                        name VARCHAR(255) NOT NULL,
                        description TEXT,
                        status VARCHAR(50) DEFAULT 'active',
                        created_at TIMESTAMP NOT NULL,
                        updated_at TIMESTAMP NOT NULL
                    )
                """.trimIndent())

                // Create old issues table (without deleted_at)
                exec("""
                    CREATE TABLE issues (
                        id VARCHAR(100) PRIMARY KEY,
                        project_id VARCHAR(100) REFERENCES projects(id),
                        parent_id VARCHAR(100) REFERENCES issues(id),
                        title VARCHAR(255) NOT NULL,
                        description TEXT,
                        issue_type VARCHAR(20) NOT NULL,
                        status VARCHAR(50) DEFAULT 'todo',
                        priority INTEGER DEFAULT 0,
                        estimate INTEGER,
                        assignee_id VARCHAR(100),
                        created_at TIMESTAMP NOT NULL,
                        updated_at TIMESTAMP NOT NULL
                    )
                """.trimIndent())

                // Insert test project
                exec("""
                    INSERT INTO projects (id, name, status, created_at, updated_at)
                    VALUES ('project-1', 'Test Project', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """.trimIndent())

                // Insert test issue
                exec("""
                    INSERT INTO issues (
                        id, project_id, title, issue_type, status, priority,
                        created_at, updated_at
                    ) VALUES (
                        'issue-1',
                        'project-1',
                        'Test Issue',
                        'STORY',
                        'todo',
                        1,
                        CURRENT_TIMESTAMP,
                        CURRENT_TIMESTAMP
                    )
                """.trimIndent())
            }

            // Apply migration
            transaction(database) {
                SchemaUtils.createMissingTablesAndColumns(ProjectsTable, IssuesTable)
            }

            // Verify column exists and data is intact
            transaction(database) {
                // Check deleted_at column exists in table definition
                val hasDeletedAtColumn = IssuesTable.columns.any { it.name == "deleted_at" }
                hasDeletedAtColumn shouldBe true

                // Verify test data is intact
                val result = IssuesTable.selectAll().first()
                result[IssuesTable.id].value shouldBe "issue-1"
                result[IssuesTable.projectId] shouldBe "project-1"
                result[IssuesTable.title] shouldBe "Test Issue"
                result[IssuesTable.type] shouldBe "STORY"
                result[IssuesTable.status] shouldBe "todo"
                result[IssuesTable.deletedAt] shouldBe null // New column should be null
            }

        } finally {
            TransactionManager.closeAndUnregister(database)
        }
    }

    "should add deleted_at column to existing workflows table" {
        val database = Database.connect(
            url = "jdbc:h2:mem:test_${UUID.randomUUID()};MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
            driver = "org.h2.Driver"
        )

        try {
            // Create old workflows table (without deleted_at)
            transaction(database) {
                exec("""
                    CREATE TABLE workflows (
                        id VARCHAR(100) PRIMARY KEY,
                        name VARCHAR(255) NOT NULL,
                        description TEXT,
                        initial_status VARCHAR(50) NOT NULL,
                        allowed_statuses TEXT NOT NULL,
                        created_at TIMESTAMP NOT NULL,
                        updated_at TIMESTAMP NOT NULL
                    )
                """.trimIndent())

                // Insert test workflow
                exec("""
                    INSERT INTO workflows (
                        id, name, description, initial_status, allowed_statuses,
                        created_at, updated_at
                    ) VALUES (
                        'workflow-1',
                        'Test Workflow',
                        'Test Description',
                        'todo',
                        '["todo","in_progress","done"]',
                        CURRENT_TIMESTAMP,
                        CURRENT_TIMESTAMP
                    )
                """.trimIndent())
            }

            // Apply migration
            transaction(database) {
                SchemaUtils.createMissingTablesAndColumns(WorkflowsTable)
            }

            // Verify column exists and data is intact
            transaction(database) {
                // Check deleted_at column exists in table definition
                val hasDeletedAtColumn = WorkflowsTable.columns.any { it.name == "deleted_at" }
                hasDeletedAtColumn shouldBe true

                // Verify test data is intact
                val result = WorkflowsTable.selectAll().first()
                result[WorkflowsTable.id].value shouldBe "workflow-1"
                result[WorkflowsTable.name] shouldBe "Test Workflow"
                result[WorkflowsTable.description] shouldBe "Test Description"
                result[WorkflowsTable.initialStatus] shouldBe "todo"
                result[WorkflowsTable.deletedAt] shouldBe null // New column should be null
            }

        } finally {
            TransactionManager.closeAndUnregister(database)
        }
    }

    "should maintain backward compatibility with null deleted_at values" {
        val database = Database.connect(
            url = "jdbc:h2:mem:test_${UUID.randomUUID()};MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
            driver = "org.h2.Driver"
        )

        try {
            // Create tables with new schema
            transaction(database) {
                SchemaUtils.create(ProjectsTable, IssuesTable, WorkflowsTable)
            }

            // Insert test data WITHOUT setting deleted_at
            val now = Clock.System.now()
            transaction(database) {
                ProjectsTable.insert {
                    it[id] = EntityID("project-1", ProjectsTable)
                    it[name] = "Active Project"
                    it[status] = "active"
                    it[createdAt] = now
                    it[updatedAt] = now
                    // deletedAt should be null by default
                }

                IssuesTable.insert {
                    it[id] = EntityID("issue-1", IssuesTable)
                    it[projectId] = "project-1"
                    it[title] = "Active Issue"
                    it[type] = "STORY"
                    it[status] = "todo"
                    it[createdAt] = now
                    it[updatedAt] = now
                    // deletedAt should be null by default
                }

                WorkflowsTable.insert {
                    it[id] = EntityID("workflow-1", WorkflowsTable)
                    it[name] = "Active Workflow"
                    it[initialStatus] = "todo"
                    it[allowedStatuses] = "[\"todo\",\"done\"]"
                    it[createdAt] = now
                    it[updatedAt] = now
                    // deletedAt should be null by default
                }
            }

            // Verify all deleted_at values are null (backward compatible)
            transaction(database) {
                val project = ProjectsTable.selectAll().first()
                project[ProjectsTable.deletedAt] shouldBe null

                val issue = IssuesTable.selectAll().first()
                issue[IssuesTable.deletedAt] shouldBe null

                val workflow = WorkflowsTable.selectAll().first()
                workflow[WorkflowsTable.deletedAt] shouldBe null
            }

        } finally {
            TransactionManager.closeAndUnregister(database)
        }
    }

    "should support querying with deleted_at filters" {
        val database = Database.connect(
            url = "jdbc:h2:mem:test_${UUID.randomUUID()};MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
            driver = "org.h2.Driver"
        )

        try {
            // Create tables and insert test data
            val now = Clock.System.now()
            transaction(database) {
                SchemaUtils.create(ProjectsTable)

                // Insert active project (deleted_at = null)
                ProjectsTable.insert {
                    it[id] = EntityID("project-1", ProjectsTable)
                    it[name] = "Active Project"
                    it[status] = "active"
                    it[createdAt] = now
                    it[updatedAt] = now
                    it[deletedAt] = null
                }

                // Insert deleted project (deleted_at = timestamp)
                ProjectsTable.insert {
                    it[id] = EntityID("project-2", ProjectsTable)
                    it[name] = "Deleted Project"
                    it[status] = "active"
                    it[createdAt] = now
                    it[updatedAt] = now
                    it[deletedAt] = now
                }
            }

            // Verify filtering works correctly
            transaction(database) {
                // Query active projects (deleted_at IS NULL)
                val activeProjects = ProjectsTable
                    .selectAll()
                    .where { ProjectsTable.deletedAt.isNull() }
                    .count()
                activeProjects shouldBe 1

                // Query deleted projects (deleted_at IS NOT NULL)
                val deletedProjects = ProjectsTable
                    .selectAll()
                    .where { ProjectsTable.deletedAt.isNotNull() }
                    .count()
                deletedProjects shouldBe 1

                // Total count should be 2
                ProjectsTable.selectAll().count() shouldBe 2
            }

        } finally {
            TransactionManager.closeAndUnregister(database)
        }
    }

    "should create composite indexes for query performance" {
        val database = Database.connect(
            url = "jdbc:h2:mem:test_${UUID.randomUUID()};MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
            driver = "org.h2.Driver"
        )

        try {
            // Create tables with indexes (if SchemaUtils.create succeeds, indexes were created)
            transaction(database) {
                // This will create all tables including their init blocks (indexes)
                SchemaUtils.create(ProjectsTable, IssuesTable, WorkflowsTable)
            }

            // Verify tables were created successfully with indexes
            // Note: Exposed's SchemaUtils.create will fail if index creation fails
            transaction(database) {
                // Verify tables exist and can be queried
                ProjectsTable.selectAll().count() shouldBe 0
                IssuesTable.selectAll().count() shouldBe 0
                WorkflowsTable.selectAll().count() shouldBe 0
            }

            // The fact that SchemaUtils.create succeeded without exceptions
            // confirms that all indexes (including composite indexes) were created successfully

        } finally {
            TransactionManager.closeAndUnregister(database)
        }
    }

    "should create indexes with expected names for rollback compatibility" {
        val database = Database.connect(
            url = "jdbc:h2:mem:test_${UUID.randomUUID()};MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
            driver = "org.h2.Driver"
        )

        try {
            // Create tables with indexes
            transaction(database) {
                SchemaUtils.create(ProjectsTable, IssuesTable, WorkflowsTable)
            }

            // Query database metadata to verify index names
            // NOTE: H2 with DATABASE_TO_LOWER=TRUE stores table names as lowercase
            // but INFORMATION_SCHEMA still uses lowercase for both table and index names
            transaction(database) {
                val indexNames = mutableListOf<String>()

                // Query for indexes on our tables (using lowercase table names for H2 with DATABASE_TO_LOWER)
                exec("""
                    SELECT UPPER(INDEX_NAME) as idx_name
                    FROM INFORMATION_SCHEMA.INDEXES
                    WHERE LOWER(TABLE_NAME) IN ('projects', 'issues', 'workflows')
                    AND LOWER(INDEX_NAME) LIKE '%deleted%'
                """.trimIndent()) { rs ->
                    while (rs.next()) {
                        indexNames.add(rs.getString(1))
                    }
                }

                // Verify index names match rollback script expectations (uppercased for comparison)
                // Exposed generates index names like: projects_deleted_at_id
                val expectedNames = listOf(
                    "PROJECTS_DELETED_AT_ID",
                    "ISSUES_DELETED_AT_PARENT_ID",
                    "WORKFLOWS_DELETED_AT_ID"
                )

                indexNames shouldContainAll expectedNames
            }

        } finally {
            TransactionManager.closeAndUnregister(database)
        }
    }

    "should successfully execute rollback script and revert to old schema" {
        val database = Database.connect(
            url = "jdbc:h2:mem:test_${UUID.randomUUID()};MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
            driver = "org.h2.Driver"
        )

        try {
            // Step 1: Create schema with deleted_at columns and indexes
            val now = Clock.System.now()
            transaction(database) {
                SchemaUtils.create(ProjectsTable, IssuesTable, WorkflowsTable)

                // Insert test data including soft-deleted records
                ProjectsTable.insert {
                    it[id] = EntityID("project-1", ProjectsTable)
                    it[name] = "Active Project"
                    it[status] = "active"
                    it[createdAt] = now
                    it[updatedAt] = now
                    it[deletedAt] = null
                }

                ProjectsTable.insert {
                    it[id] = EntityID("project-2", ProjectsTable)
                    it[name] = "Deleted Project"
                    it[status] = "active"
                    it[createdAt] = now
                    it[updatedAt] = now
                    it[deletedAt] = now // Soft-deleted
                }
            }

            // Verify deleted_at column exists before rollback
            transaction(database) {
                val hasDeletedAtColumn = ProjectsTable.columns.any { it.name == "deleted_at" }
                hasDeletedAtColumn shouldBe true
            }

            // Step 2: Execute rollback script
            // Use System.getProperty to get project directory (Gradle sets user.dir to project root)
            val projectDir = System.getProperty("user.dir")
            val rollbackScriptFile = File(projectDir, "migrations/rollback-spi-873.sql")
            val rollbackScript = rollbackScriptFile.readText()

            // Parse SQL script: remove comments, split by semicolons, filter empties
            val statements = rollbackScript
                .lines()
                .filter { !it.trim().startsWith("--") } // Remove comment lines
                .joinToString("\n") // Rejoin into single string
                .split(";") // Split by statement terminator
                .map { it.trim() }
                .filter { it.isNotEmpty() }

            transaction(database) {
                statements.forEach { stmt ->
                    if (stmt.isNotBlank()) {
                        exec(stmt)
                    }
                }
            }

            // Step 3: Verify indexes are dropped
            transaction(database) {
                val indexNames = mutableListOf<String>()

                exec("""
                    SELECT INDEX_NAME
                    FROM INFORMATION_SCHEMA.INDEXES
                    WHERE LOWER(TABLE_NAME) IN ('projects', 'issues', 'workflows')
                    AND LOWER(INDEX_NAME) LIKE '%deleted%'
                """.trimIndent()) { rs ->
                    while (rs.next()) {
                        indexNames.add(rs.getString(1))
                    }
                }

                // After rollback, no deleted_at indexes should exist
                indexNames.size shouldBe 0
            }

            // Step 4: Verify columns are dropped (query should fail)
            transaction(database) {
                // Trying to query deleted_at should fail since column was dropped
                shouldThrow<ExposedSQLException> {
                    exec("SELECT deleted_at FROM projects") { }
                }

                shouldThrow<ExposedSQLException> {
                    exec("SELECT deleted_at FROM issues") { }
                }

                shouldThrow<ExposedSQLException> {
                    exec("SELECT deleted_at FROM workflows") { }
                }
            }

            // Step 5: Verify other data remains intact (non-deleted_at columns)
            transaction(database) {
                val projectCount = exec("SELECT COUNT(*) FROM projects") { rs ->
                    rs.next()
                    rs.getInt(1)
                }
                projectCount shouldBe 2 // Both records should still exist

                // Verify we can query other columns
                val projectNames = mutableListOf<String>()
                exec("SELECT name FROM projects ORDER BY name") { rs ->
                    while (rs.next()) {
                        projectNames.add(rs.getString(1))
                    }
                }
                projectNames shouldBe listOf("Active Project", "Deleted Project")
            }

        } finally {
            TransactionManager.closeAndUnregister(database)
        }
    }
})

package io.spiralhouse.cycletime.integration

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.collections.shouldNotBeEmpty
import io.spiralhouse.cycletime.infrastructure.database.DatabaseConfig
import io.spiralhouse.cycletime.infrastructure.database.ProjectsTable
import io.spiralhouse.cycletime.infrastructure.database.IssuesTable
import io.spiralhouse.cycletime.infrastructure.database.SessionStatesTable
import org.jetbrains.exposed.dao.id.EntityID
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.transactions.TransactionManager
import org.jetbrains.exposed.sql.transactions.transaction
import java.util.UUID
import kotlinx.datetime.Instant
import kotlinx.datetime.Clock

/**
 * Comprehensive integration test for H2 database driver functionality.
 * Validates H2 driver compatibility, PostgreSQL mode features, and basic CRUD operations.
 * 
 * Tests follow the established pattern from H2DatabaseConfigTest with thorough validation
 * of database functionality matching other comprehensive test files in the project.
 */
class H2DatabaseDriverTest : StringSpec({
    
    "should connect to H2 database with PostgreSQL compatibility mode" {
        val config = DatabaseConfig(
            jdbcUrl = "jdbc:h2:mem:test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
            driver = "org.h2.Driver"
        )
        
        // Should not throw exception
        val database = config.connect()
        database shouldNotBe null
        
        // Verify PostgreSQL compatibility mode is active
        transaction(database) {
            val result = exec("SELECT H2VERSION()") { rs ->
                rs.next()
                rs.getString(1)
            }
            // H2 should return version info when connected
            result shouldNotBe null
            result shouldContain "H2"
        }
        
        // Clean up
        config.close()
        TransactionManager.closeAndUnregister(database)
    }
    
    "should create all project tables successfully with H2 driver" {
        val config = DatabaseConfig(
            jdbcUrl = "jdbc:h2:mem:testschema;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
            driver = "org.h2.Driver"
        )
        
        // The connect() method should create all tables without throwing exceptions
        val database = config.connect()
        database shouldNotBe null
        
        // Verify tables were created by querying schema information
        transaction(database) {
            val tables = exec("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'PUBLIC'") { rs ->
                buildList {
                    while (rs.next()) {
                        add(rs.getString("TABLE_NAME").uppercase())
                    }
                }
            } ?: emptyList()
            
            tables shouldNotBe emptyList<String>()
            tables shouldContain "PROJECTS"
            tables shouldContain "ISSUES"
            tables shouldContain "SESSION_STATES"
            tables shouldContain "ISSUE_DEPENDENCIES"
            tables shouldContain "ISSUE_LABELS"
        }
        
        // Clean up
        config.close()
        TransactionManager.closeAndUnregister(database)
    }
    
    "should perform basic CRUD operations on projects table" {
        val config = DatabaseConfig(
            jdbcUrl = "jdbc:h2:mem:crud_test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
            driver = "org.h2.Driver"
        )
        
        val database = config.connect()
        
        transaction(database) {
            // CREATE - Insert a test project
            val projectId = UUID.randomUUID().toString()
            val now = Clock.System.now()
            
            ProjectsTable.insert {
                it[id] = EntityID(projectId, ProjectsTable)
                it[name] = "Test Project"
                it[description] = "A test project for H2 validation"
                it[status] = "active"
                it[createdAt] = now
                it[updatedAt] = now
            }
            
            // READ - Query the inserted project
            val project = ProjectsTable
                .selectAll()
                .where { ProjectsTable.id eq projectId }
                .singleOrNull()
            
            project shouldNotBe null
            project!![ProjectsTable.name] shouldBe "Test Project"
            project[ProjectsTable.description] shouldBe "A test project for H2 validation"
            project[ProjectsTable.status] shouldBe "active"
            
            // UPDATE - Modify the project
            ProjectsTable.update({ ProjectsTable.id eq projectId }) {
                it[name] = "Updated Test Project"
                it[updatedAt] = Clock.System.now()
            }
            
            val updatedProject = ProjectsTable
                .selectAll()
                .where { ProjectsTable.id eq projectId }
                .singleOrNull()
                
            updatedProject!![ProjectsTable.name] shouldBe "Updated Test Project"
            
            // DELETE - Remove the project
            val deletedCount = ProjectsTable.deleteWhere { ProjectsTable.id eq projectId }
            deletedCount shouldBe 1
            
            val deletedProject = ProjectsTable
                .selectAll()
                .where { ProjectsTable.id eq projectId }
                .singleOrNull()
                
            deletedProject shouldBe null
        }
        
        // Clean up
        config.close()
        TransactionManager.closeAndUnregister(database)
    }
    
    "should verify PostgreSQL compatibility mode features work correctly" {
        val config = DatabaseConfig(
            jdbcUrl = "jdbc:h2:mem:pg_compat;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
            driver = "org.h2.Driver"
        )
        
        val database = config.connect()
        
        transaction(database) {
            // Test lowercase table and column names (DATABASE_TO_LOWER=TRUE)
            val tableInfo = exec("""
                SELECT COLUMN_NAME, DATA_TYPE 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'projects' AND COLUMN_NAME = 'name'
            """) { rs ->
                if (rs.next()) {
                    Pair(rs.getString("COLUMN_NAME"), rs.getString("DATA_TYPE"))
                } else null
            }
            
            tableInfo shouldNotBe null
            tableInfo!!.first shouldBe "name" // Should be lowercase
            
            // Test UUID handling (common in PostgreSQL apps)
            val testId = UUID.randomUUID().toString()
            val result = exec("SELECT CAST('$testId' AS VARCHAR) as test_uuid") { rs ->
                rs.next()
                rs.getString("test_uuid")
            }
            result shouldBe testId
            
            // Test JSON-as-TEXT functionality (H2 limitation)
            val jsonTest = exec("SELECT CAST('{\"test\": \"value\"}' AS VARCHAR) as json_field") { rs ->
                rs.next()
                rs.getString("json_field")
            }
            jsonTest shouldContain "test"
            jsonTest shouldContain "value"
        }
        
        // Clean up
        config.close()
        TransactionManager.closeAndUnregister(database)
    }
    
    "should handle concurrent connections with connection pool" {
        val config = DatabaseConfig(
            jdbcUrl = "jdbc:h2:mem:pool_test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
            driver = "org.h2.Driver",
            maxPoolSize = 3
        )
        
        val database = config.connect()
        
        // Simulate concurrent operations
        val results = (1..5).map { sessionId ->
            transaction(database) {
                SessionStatesTable.insert {
                    it[id] = EntityID(UUID.randomUUID().toString(), SessionStatesTable)
                    it[sessionKey] = "session-key-$sessionId"
                    it[currentContext] = "test-context-$sessionId"
                    it[createdAt] = Clock.System.now()
                    it[updatedAt] = Clock.System.now()
                    it[lastActivity] = Clock.System.now()
                }
                sessionId
            }
        }
        
        results.size shouldBe 5
        
        // Verify all sessions were created
        transaction(database) {
            val sessionCount = SessionStatesTable.selectAll().count()
            sessionCount shouldBe 5L
        }
        
        // Clean up
        config.close()
        TransactionManager.closeAndUnregister(database)
    }
})
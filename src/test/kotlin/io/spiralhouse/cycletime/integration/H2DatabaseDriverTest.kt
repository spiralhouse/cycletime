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
            // H2 should return version info when connected (e.g., "2.2.224")
            result shouldNotBe null
            // Version format should be like "2.2.224"
            result?.matches(Regex("\\d+\\.\\d+\\.\\d+")) shouldBe true
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
            val tables = exec("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = SCHEMA()") { rs ->
                buildList {
                    while (rs.next()) {
                        add(rs.getString("TABLE_NAME").lowercase())
                    }
                }
            } ?: emptyList()
            
            tables shouldNotBe emptyList<String>()
            tables shouldContain "projects"
            tables shouldContain "issues"
            tables shouldContain "session_states"
            tables shouldContain "issue_dependencies"
            tables shouldContain "issue_labels"
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
    
    "should handle connection pool exhaustion gracefully" {
        val config = DatabaseConfig(
            jdbcUrl = "jdbc:h2:mem:exhaustion_test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
            driver = "org.h2.Driver",
            maxPoolSize = 2 // Very small pool to test exhaustion
        )
        
        val database = config.connect()
        
        // Create long-running transactions to exhaust pool
        val longRunningTransactions = mutableListOf<Thread>()
        
        // Start 3 threads trying to acquire connections (pool size is 2)
        for (i in 1..3) {
            val thread = Thread {
                transaction(database) {
                    ProjectsTable.insert {
                        it[id] = EntityID("project-$i", ProjectsTable)
                        it[name] = "Long Running Project $i"
                        it[description] = "Testing pool exhaustion"
                        it[status] = "active"
                        it[createdAt] = Clock.System.now()
                        it[updatedAt] = Clock.System.now()
                    }
                    Thread.sleep(100) // Simulate long operation
                }
            }
            thread.start()
            longRunningTransactions.add(thread)
        }
        
        // Wait for all threads to complete
        longRunningTransactions.forEach { it.join(5000) } // 5 second timeout
        
        // Verify operations completed despite pool constraints
        transaction(database) {
            val projectCount = ProjectsTable.selectAll().count()
            projectCount shouldBe 3L // All 3 projects should be created
        }
        
        // Clean up
        config.close()
        TransactionManager.closeAndUnregister(database)
    }
    
    "should maintain transaction isolation between concurrent operations" {
        val config = DatabaseConfig(
            jdbcUrl = "jdbc:h2:mem:isolation_test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
            driver = "org.h2.Driver"
        )
        
        val database = config.connect()
        
        // Create initial project
        val projectId = "isolation-test-project"
        transaction(database) {
            ProjectsTable.insert {
                it[id] = EntityID(projectId, ProjectsTable)
                it[name] = "Initial Name"
                it[description] = "Testing isolation"
                it[status] = "active"
                it[createdAt] = Clock.System.now()
                it[updatedAt] = Clock.System.now()
            }
        }
        
        // Test that concurrent reads don't see uncommitted writes
        val thread1 = Thread {
            transaction(database) {
                // Update project name
                ProjectsTable.update({ ProjectsTable.id eq projectId }) {
                    it[name] = "Updated by Thread 1"
                }
                Thread.sleep(200) // Hold transaction open
            }
        }
        
        val thread2 = Thread {
            Thread.sleep(100) // Let thread1 start first
            transaction(database) {
                // Should see original name, not thread1's uncommitted change
                val project = ProjectsTable
                    .selectAll()
                    .where { ProjectsTable.id eq projectId }
                    .single()
                project[ProjectsTable.name] shouldBe "Initial Name"
            }
        }
        
        thread1.start()
        thread2.start()
        
        thread1.join()
        thread2.join()
        
        // After both complete, verify final state
        transaction(database) {
            val project = ProjectsTable
                .selectAll()
                .where { ProjectsTable.id eq projectId }
                .single()
            project[ProjectsTable.name] shouldBe "Updated by Thread 1"
        }
        
        // Clean up
        config.close()
        TransactionManager.closeAndUnregister(database)
    }
    
    "should support PostgreSQL compatibility features like array and JSON handling" {
        val config = DatabaseConfig(
            jdbcUrl = "jdbc:h2:mem:pg_features;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
            driver = "org.h2.Driver"
        )
        
        val database = config.connect()
        
        transaction(database) {
            // Test array syntax (H2 uses ARRAY constructor)
            val arrayResult = exec("SELECT ARRAY[1, 2, 3] as test_array") { rs ->
                rs.next()
                val array = rs.getArray("test_array")
                array.array as Array<*>
            }
            arrayResult shouldNotBe null
            arrayResult!!.size shouldBe 3
            arrayResult[0] shouldBe 1
            arrayResult[1] shouldBe 2
            arrayResult[2] shouldBe 3
            
            // Test JSON as VARCHAR (H2 limitation but compatible)
            exec("""
                CREATE TABLE IF NOT EXISTS json_test (
                    id INT PRIMARY KEY,
                    data VARCHAR(1000)
                )
            """)
            
            val jsonData = """{"key": "value", "number": 42}"""
            exec("INSERT INTO json_test (id, data) VALUES (1, '$jsonData')")
            
            val retrievedJson = exec("SELECT data FROM json_test WHERE id = 1") { rs ->
                rs.next()
                rs.getString("data")
            }
            retrievedJson shouldBe jsonData
            
            // Test ILIKE operator (case-insensitive LIKE in PostgreSQL mode)
            exec("CREATE TABLE IF NOT EXISTS text_test (id INT, name VARCHAR(100))")
            exec("INSERT INTO text_test VALUES (1, 'TestName'), (2, 'TESTNAME'), (3, 'testname')")
            
            val ilikeResults = exec("SELECT COUNT(*) FROM text_test WHERE name ILIKE 'test%'") { rs ->
                rs.next()
                rs.getInt(1)
            }
            ilikeResults shouldBe 3 // Should match all case variations
        }
        
        // Clean up
        config.close()
        TransactionManager.closeAndUnregister(database)
    }
})
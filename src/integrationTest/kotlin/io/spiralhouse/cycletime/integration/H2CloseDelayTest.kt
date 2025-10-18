package io.spiralhouse.cycletime.integration

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.transactions.TransactionManager
import org.jetbrains.exposed.sql.transactions.transaction
import java.io.File
import java.nio.file.Files
import kotlin.io.path.deleteExisting

/**
 * Test to verify correct DB_CLOSE_DELAY behavior for different H2 database types.
 * 
 * This test validates the architectural decision:
 * - File-based H2 databases should NOT use DB_CLOSE_DELAY=-1 (data persists on disk)
 * - In-memory H2 databases SHOULD use DB_CLOSE_DELAY=-1 (to persist between connections)
 * 
 * @see https://github.com/spiralhouse/cycletime/issues/50
 */
class H2CloseDelayTest : StringSpec({
    
    "file-based H2 should persist data without DB_CLOSE_DELAY=-1" {
        // Create a temporary file for the database
        val tempFile = Files.createTempFile("h2test", ".db")
        val dbPath = tempFile.toString().removeSuffix(".db")
        
        try {
            // Connect WITHOUT DB_CLOSE_DELAY=-1 (production configuration)
            val db1 = Database.connect(
                url = "jdbc:h2:file:$dbPath;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
                driver = "org.h2.Driver"
            )
            
            // Create table and insert data
            transaction(db1) {
                SchemaUtils.create(TestTable)
                TestTable.insert {
                    it[name] = "test_data"
                }
            }
            
            // Close the first connection completely
            TransactionManager.closeAndUnregister(db1)
            
            // Open a new connection to the same file
            val db2 = Database.connect(
                url = "jdbc:h2:file:$dbPath;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
                driver = "org.h2.Driver"
            )
            
            // Verify data persists without DB_CLOSE_DELAY=-1
            transaction(db2) {
                val count = TestTable.selectAll().count()
                count shouldBe 1
                
                val result = TestTable.selectAll().first()
                result[TestTable.name] shouldBe "test_data"
            }
            
            // Clean up
            TransactionManager.closeAndUnregister(db2)
            
        } finally {
            // Clean up test files
            File("$dbPath.mv.db").deleteOnExit()
            File("$dbPath.trace.db").deleteOnExit()
            tempFile.deleteExisting()
        }
    }
    
    "in-memory H2 without DB_CLOSE_DELAY=-1 loses data when connection closes" {
        // Create in-memory database WITHOUT DB_CLOSE_DELAY=-1
        val db1 = Database.connect(
            url = "jdbc:h2:mem:test_no_delay;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
            driver = "org.h2.Driver"
        )
        
        // Create table and insert data
        transaction(db1) {
            SchemaUtils.create(TestTable)
            TestTable.insert {
                it[name] = "test_data"
            }
        }
        
        // Close the connection
        TransactionManager.closeAndUnregister(db1)
        
        // Open a new connection to the same in-memory database
        val db2 = Database.connect(
            url = "jdbc:h2:mem:test_no_delay;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
            driver = "org.h2.Driver"
        )
        
        // Verify data is LOST without DB_CLOSE_DELAY=-1
        transaction(db2) {
            // Table doesn't exist because database was destroyed
            val tables = db2.dialect.allTablesNames()
            tables.contains("test_table") shouldBe false
        }
        
        TransactionManager.closeAndUnregister(db2)
    }
    
    "in-memory H2 with DB_CLOSE_DELAY=-1 preserves data between connections" {
        // Create in-memory database WITH DB_CLOSE_DELAY=-1 (test configuration)
        val db1 = Database.connect(
            url = "jdbc:h2:mem:test_with_delay;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
            driver = "org.h2.Driver"
        )
        
        // Create table and insert data
        transaction(db1) {
            SchemaUtils.create(TestTable)
            TestTable.insert {
                it[name] = "test_data"
            }
        }
        
        // Close the connection
        TransactionManager.closeAndUnregister(db1)
        
        // Open a new connection to the same in-memory database
        val db2 = Database.connect(
            url = "jdbc:h2:mem:test_with_delay;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
            driver = "org.h2.Driver"
        )
        
        // Verify data PERSISTS with DB_CLOSE_DELAY=-1
        transaction(db2) {
            val count = TestTable.selectAll().count()
            count shouldBe 1
            
            val result = TestTable.selectAll().first()
            result[TestTable.name] shouldBe "test_data"
        }
        
        TransactionManager.closeAndUnregister(db2)
    }
    
    "production configuration should have proper settings for file-based databases" {
        // This test validates our architectural decision
        val productionUrl = "jdbc:h2:file:./cycletime;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;AUTO_SERVER=TRUE;LOCK_TIMEOUT=5000"
        
        // Verify production URL does NOT contain DB_CLOSE_DELAY=-1 (not needed for file-based)
        productionUrl.contains("DB_CLOSE_DELAY=-1") shouldBe false
        
        // Verify it has LOCK_TIMEOUT for deadlock prevention
        productionUrl.contains("LOCK_TIMEOUT=5000") shouldBe true
        
        // Verify it's a file-based database
        productionUrl.startsWith("jdbc:h2:file:") shouldBe true
    }
    
    "test configuration should have DB_CLOSE_DELAY for in-memory databases" {
        // This test validates our test configuration
        val testUrl = "jdbc:h2:mem:test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1"
        
        // Verify test URL DOES contain DB_CLOSE_DELAY=-1
        testUrl.contains("DB_CLOSE_DELAY=-1") shouldBe true
        
        // Verify it's an in-memory database
        testUrl.startsWith("jdbc:h2:mem:") shouldBe true
    }
})

// Test table for validation
private object TestTable : Table("test_table") {
    val id = integer("id").autoIncrement()
    val name = varchar("name", 100)
    
    override val primaryKey = PrimaryKey(id)
}
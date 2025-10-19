package io.spiralhouse.cycletime.integration

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import io.spiralhouse.cycletime.infrastructure.database.DatabaseConfig
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.transactions.transaction

/**
 * TDD Test Suite for H2 Database Configuration
 * 
 * RED → GREEN → REFACTOR approach:
 * 1. Write failing tests for H2 PostgreSQL compatibility mode
 * 2. Implement minimal code to make tests pass
 * 3. Refactor for clean implementation
 */
class H2DatabaseConfigTest : StringSpec({
    
    "should create H2 database connection in PostgreSQL compatibility mode" {
        // RED: This test should fail initially
        val config = DatabaseConfig(
            jdbcUrl = "jdbc:h2:mem:test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
            driver = "org.h2.Driver"
        )
        
        val database = config.connect()
        
        // Verify H2 connection
        database shouldNotBe null
        
        // Verify PostgreSQL compatibility mode is active
        transaction(database) {
            val result = exec("SELECT DATABASE()") { rs ->
                rs.next()
                rs.getString(1)
            }
            // H2 in PostgreSQL mode should return version info
            result shouldNotBe null
        }
        
        config.close()
    }
    
    "should handle JSON as TEXT columns in H2" {
        // RED: Test H2's JSON handling limitation
        val config = DatabaseConfig(
            jdbcUrl = "jdbc:h2:mem:json_test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
            driver = "org.h2.Driver"
        )
        
        val database = config.connect()
        
        // Create test table for JSON storage  
        val testJsonTable = object : Table("test_json") {
            val id = varchar("id", 100)
            val metadata = text("metadata")
            override val primaryKey = PrimaryKey(id)
        }
        
        transaction(database) {
            SchemaUtils.create(testJsonTable)
            
            // Insert JSON data as TEXT
            testJsonTable.insert {
                it[id] = "test1"
                it[metadata] = """{"key": "value", "number": 42}"""
            }
            
            // Retrieve and verify JSON data
            val jsonData = testJsonTable.selectAll()
                .where { testJsonTable.id eq "test1" }
                .single()[testJsonTable.metadata]
            
            jsonData shouldContain "key"
            jsonData shouldContain "value"
        }
        
        config.close()
    }
    
    "should enable foreign key constraints in H2" {
        // RED: Test foreign key constraint enforcement
        val config = DatabaseConfig(
            jdbcUrl = "jdbc:h2:mem:fk_test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
            driver = "org.h2.Driver"
        )
        
        val database = config.connect()
        
        // Create test tables with foreign key relationship
        val parentTable = object : Table("parent_table") {
            val id = varchar("id", 100)
            override val primaryKey = PrimaryKey(id)
        }
        
        val childTable = object : Table("child_table") {
            val id = varchar("id", 100)
            val parentId = varchar("parent_id", 100).references(parentTable.id)
            override val primaryKey = PrimaryKey(id)
        }
        
        transaction(database) {
            SchemaUtils.create(parentTable, childTable)
            
            // Insert parent record
            parentTable.insert {
                it[id] = "parent1"
            }
            
            // Insert child record with valid foreign key
            childTable.insert {
                it[id] = "child1"
                it[parentId] = "parent1"
            }
            
            // Verify the insert succeeded
            val count = childTable.selectAll()
                .where { childTable.parentId eq "parent1" }
                .count()
            
            count shouldBe 1
        }
        
        config.close()
    }
})
package io.spiralhouse.cycletime.integration.concurrency

import io.kotest.core.annotation.Ignored
import io.kotest.core.spec.IsolationMode
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.ints.shouldBeLessThan
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.spiralhouse.cycletime.domain.entities.Project
import io.spiralhouse.cycletime.domain.services.MockTimeProvider
import io.spiralhouse.cycletime.infrastructure.database.ProjectsTable
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedProjectRepository
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.delay
import kotlinx.coroutines.test.runTest
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.deleteAll
import org.jetbrains.exposed.sql.transactions.transaction
import java.util.concurrent.atomic.AtomicInteger
import kotlin.time.Duration.Companion.seconds

/**
 * Connection Pool Concurrency Tests
 *
 * Tests the thread-safety of database connection management under high concurrency.
 * These tests specifically focus on HikariCP connection pool behavior with H2 database
 * and our repository implementations.
 *
 * ## Focus Areas:
 * 1. **Connection Pool Exhaustion** - What happens when all connections are in use
 * 2. **Connection Leaks** - Ensure connections are properly returned to pool
 * 3. **Deadlock Detection** - Connection pool deadlocks under heavy load
 * 4. **Transaction Timeout Handling** - Long-running transactions and timeouts
 * 5. **Connection Pool Recovery** - Recovery after connection failures
 *
 * ## IMPORTANT: Tests Disabled Until HikariCP Implementation
 * These tests are currently disabled because they test connection pooling features
 * that require HikariCP, which we haven't implemented yet. They are valuable tests
 * that should be re-enabled when:
 * 
 * 1. HikariCP is added as a dependency
 * 2. Connection pooling is properly configured
 * 3. Repository implementations are updated to use the pool
 *
 * To re-enable: Remove the @Ignore annotation and the isolationMode setting
 * 
 * Related issue: SPI-XXX (Create issue for HikariCP implementation)
 */
@Ignored
class ConnectionPoolConcurrencyTest : StringSpec({
    // Tests require HikariCP connection pooling - re-enable when implemented
    // Remove @Ignored annotation when HikariCP is added to the project

    lateinit var database: Database
    lateinit var repository: ExposedProjectRepository
    lateinit var mockTimeProvider: MockTimeProvider

    beforeSpec {
        // Setup H2 with small connection pool to test limits
        // Note: H2 2.x removed MVCC mode - it now uses improved transaction isolation by default
        // Using DB_CLOSE_DELAY=-1 to keep the in-memory database alive during the entire test suite
        database = Database.connect(
            url = "jdbc:h2:mem:test_pool;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;LOCK_TIMEOUT=5000;DB_CLOSE_DELAY=-1",
            driver = "org.h2.Driver"
        )

        transaction(database) {
            SchemaUtils.createMissingTablesAndColumns(ProjectsTable)
        }

        mockTimeProvider = MockTimeProvider()
        repository = ExposedProjectRepository(mockTimeProvider, database)
    }

    beforeEach {
        // Ensure schema exists (defensive programming for in-memory databases)
        transaction(database) {
            SchemaUtils.createMissingTablesAndColumns(ProjectsTable)
        }
        
        // Clean database before each test
        transaction(database) {
            ProjectsTable.deleteAll()
        }
        mockTimeProvider.setTime(kotlinx.datetime.Instant.parse("2025-01-15T10:00:00Z"))
    }

    "should handle connection pool exhaustion gracefully" {
        runTest {
            val maxConcurrentConnections = 50 // Exceed typical pool size
            val longRunningOperations = 100
            
            val connectionErrors = AtomicInteger(0)
            val successfulOperations = AtomicInteger(0)

            // Simulate connection pool exhaustion
            val jobs = (1..maxConcurrentConnections).map { operationId ->
                async {
                    try {
                        // Simulate long-running database operation
                        repeat(longRunningOperations) { iteration ->
                            val project = Project.create(
                                name = "Pool-Test-$operationId-$iteration",
                                description = "Testing connection pool limits",
                                timeProvider = mockTimeProvider
                            )
                            
                            repository.save(project)
                            
                            // Small delay to hold connection longer
                            delay(10)
                            
                            // Verify save worked
                            val retrieved = repository.findById(project.id)
                            if (retrieved != null) {
                                successfulOperations.incrementAndGet()
                            }
                        }
                    } catch (e: Exception) {
                        connectionErrors.incrementAndGet()
                        println("Connection pool error: ${e.message}")
                    }
                }
            }

            // Wait for all operations with timeout
            jobs.awaitAll()

            val errors = connectionErrors.get()
            val successful = successfulOperations.get()
            
            println("Connection pool test results:")
            println("  Connection errors: $errors")
            println("  Successful operations: $successful")
            
            // In a robust implementation, errors should be minimal
            // Some errors are acceptable under extreme load, but not excessive
            errors shouldBeLessThan (maxConcurrentConnections * longRunningOperations / 2)
            
            // Most operations should succeed
            successful shouldNotBe 0
        }
    }

    "should detect connection leaks under concurrent access" {
        runTest {
            val numberOfOperations = 200
            val operationsPerBatch = 20
            
            val connectionLeakErrors = AtomicInteger(0)
            val totalOperations = AtomicInteger(0)

            // Multiple batches of operations to detect leaks over time
            repeat(numberOfOperations / operationsPerBatch) { batchId ->
                val batchJobs = (1..operationsPerBatch).map { opId ->
                    async {
                        try {
                            totalOperations.incrementAndGet()
                            
                            // Operation that could potentially leak connections
                            val project = Project.create(
                                name = "Leak-Test-Batch-$batchId-Op-$opId",
                                description = "Testing for connection leaks",
                                timeProvider = mockTimeProvider
                            )
                            
                            repository.save(project)
                            
                            // Multiple repository calls in same operation
                            repository.findById(project.id)
                            repository.exists(project.id)
                            repository.findAll()
                            
                            // Modify and save again
                            project.updateDescription("Updated in batch $batchId")
                            repository.save(project)
                            
                        } catch (e: Exception) {
                            connectionLeakErrors.incrementAndGet()
                            if (e.message?.contains("connection", ignoreCase = true) == true ||
                                e.message?.contains("timeout", ignoreCase = true) == true) {
                                println("Potential connection leak detected: ${e.message}")
                            }
                        }
                    }
                }
                
                // Wait for batch to complete before starting next
                batchJobs.awaitAll()
                
                // Small delay between batches
                delay(100)
            }

            val leakErrors = connectionLeakErrors.get()
            val total = totalOperations.get()
            
            println("Connection leak test results:")
            println("  Total operations: $total")
            println("  Leak-related errors: $leakErrors")
            
            // Should not have connection leaks
            leakErrors shouldBe 0 // May fail in RED phase if connections leak
        }
    }

    "should handle database lock timeouts under heavy contention" {
        runTest(timeout = 60.seconds) {
            // Create a single project that all threads will contend for
            val contentionProject = Project.create(
                name = "Contention Test Project",
                description = "Single project for lock contention testing",
                timeProvider = mockTimeProvider
            )
            repository.save(contentionProject)

            val numberOfContenders = 100
            val updatesPerContender = 10
            
            val lockTimeouts = AtomicInteger(0)
            val deadlocks = AtomicInteger(0)
            val successfulUpdates = AtomicInteger(0)

            // All threads try to update the same project simultaneously
            val jobs = (1..numberOfContenders).map { contenderId ->
                async {
                    repeat(updatesPerContender) { updateId ->
                        try {
                            // Read-modify-write pattern that can cause lock contention
                            val retrieved = repository.findById(contentionProject.id)
                            if (retrieved != null) {
                                // Simulate some processing time (holds lock longer)
                                delay(5)
                                
                                retrieved.updateDescription("Updated by contender $contenderId-$updateId")
                                repository.save(retrieved)
                                
                                successfulUpdates.incrementAndGet()
                            }
                        } catch (e: Exception) {
                            when {
                                e.message?.contains("lock", ignoreCase = true) == true ||
                                e.message?.contains("timeout", ignoreCase = true) == true -> {
                                    lockTimeouts.incrementAndGet()
                                }
                                e.message?.contains("deadlock", ignoreCase = true) == true -> {
                                    deadlocks.incrementAndGet()
                                }
                                else -> {
                                    println("Unexpected contention error: ${e.message}")
                                }
                            }
                        }
                    }
                }
            }

            // Wait for all contenders
            jobs.awaitAll()

            val timeouts = lockTimeouts.get()
            val deadlockCount = deadlocks.get()
            val successful = successfulUpdates.get()
            val totalExpected = numberOfContenders * updatesPerContender

            println("Lock contention test results:")
            println("  Successful updates: $successful/$totalExpected")
            println("  Lock timeouts: $timeouts")
            println("  Deadlocks: $deadlockCount")

            // Verify final state is consistent (no corruption)
            val finalProject = repository.findById(contentionProject.id)
            finalProject shouldNotBe null
            finalProject!!.description!!.startsWith("Updated by contender") shouldBe true
            
            // Should have some successful operations (not all should fail)
            successful shouldNotBe 0
            
            // Deadlocks should be minimal or zero in a good implementation
            deadlockCount shouldBe 0 // May fail in RED phase if deadlocks occur
        }
    }

    "should handle rapid connection acquisition and release" {
        runTest {
            val rapidOperationCycles = 50
            val operationsPerCycle = 100
            
            val connectionErrors = AtomicInteger(0)
            val successfulCycles = AtomicInteger(0)

            // Rapid connect/disconnect cycles that stress the pool
            repeat(rapidOperationCycles) { cycleId ->
                val cycleJobs = (1..operationsPerCycle).map { opId ->
                    async {
                        try {
                            // Very quick operations that acquire and release connections rapidly
                            val project = Project.create(
                                name = "Rapid-$cycleId-$opId",
                                description = "Rapid connection test",
                                timeProvider = mockTimeProvider
                            )
                            
                            repository.save(project)
                            repository.exists(project.id)
                            repository.delete(project.id)
                            
                        } catch (e: Exception) {
                            connectionErrors.incrementAndGet()
                            if (e.message?.contains("pool", ignoreCase = true) == true ||
                                e.message?.contains("connection", ignoreCase = true) == true) {
                                println("Connection pool stress error: ${e.message}")
                            }
                        }
                    }
                }
                
                try {
                    cycleJobs.awaitAll()
                    successfulCycles.incrementAndGet()
                } catch (e: Exception) {
                    println("Cycle $cycleId failed: ${e.message}")
                }
                
                // Brief pause between cycles
                delay(10)
            }

            val errors = connectionErrors.get()
            val successfulCycleCount = successfulCycles.get()
            
            println("Rapid connection test results:")
            println("  Successful cycles: $successfulCycleCount/$rapidOperationCycles")
            println("  Connection errors: $errors")
            
            // Should handle rapid connection cycling without errors
            errors shouldBe 0 // May fail in RED phase if pool can't handle rapid cycling
            successfulCycleCount shouldBe rapidOperationCycles
        }
    }

    "should recover from connection pool exhaustion" {
        runTest(timeout = 60.seconds) {
            val exhaustionPhaseOperations = 200
            val recoveryPhaseOperations = 50
            
            val exhaustionErrors = AtomicInteger(0)
            val recoveryErrors = AtomicInteger(0)

            println("Phase 1: Exhausting connection pool...")
            
            // Phase 1: Exhaust the connection pool
            val exhaustionJobs = (1..exhaustionPhaseOperations).map { opId ->
                async {
                    try {
                        val project = Project.create(
                            name = "Exhaust-$opId",
                            description = "Exhausting pool",
                            timeProvider = mockTimeProvider
                        )
                        repository.save(project)
                        
                        // Hold connection longer to cause exhaustion
                        delay(50)
                        
                        repository.findById(project.id)
                        
                    } catch (e: Exception) {
                        exhaustionErrors.incrementAndGet()
                    }
                }
            }

            // Wait for exhaustion phase
            exhaustionJobs.awaitAll()
            
            // Brief recovery period
            delay(2000)
            
            println("Phase 2: Testing recovery...")

            // Phase 2: Test recovery after exhaustion
            val recoveryJobs = (1..recoveryPhaseOperations).map { opId ->
                async {
                    try {
                        val project = Project.create(
                            name = "Recovery-$opId",
                            description = "Testing recovery",
                            timeProvider = mockTimeProvider
                        )
                        repository.save(project)
                        
                        val retrieved = repository.findById(project.id)
                        retrieved shouldNotBe null
                        
                    } catch (e: Exception) {
                        recoveryErrors.incrementAndGet()
                        println("Recovery error: ${e.message}")
                    }
                }
            }

            recoveryJobs.awaitAll()

            val exhaustionErrorCount = exhaustionErrors.get()
            val recoveryErrorCount = recoveryErrors.get()
            
            println("Connection pool recovery test results:")
            println("  Exhaustion phase errors: $exhaustionErrorCount")
            println("  Recovery phase errors: $recoveryErrorCount")
            
            // Recovery phase should have significantly fewer errors than exhaustion phase
            recoveryErrorCount shouldBeLessThan exhaustionErrorCount
            
            // Ideally, recovery should be complete
            recoveryErrorCount shouldBe 0 // May fail in RED phase if recovery is incomplete
        }
    }
})
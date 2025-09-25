package io.spiralhouse.cycletime.integration

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.ints.shouldBeGreaterThan
import io.kotest.matchers.ints.shouldBeLessThan
import io.kotest.matchers.shouldBe
import io.spiralhouse.cycletime.domain.entities.Project
import io.spiralhouse.cycletime.domain.services.MockTimeProvider
import io.spiralhouse.cycletime.infrastructure.database.DatabaseConfig
import io.spiralhouse.cycletime.infrastructure.database.DatabaseFactory
import io.spiralhouse.cycletime.infrastructure.database.ProjectsTable
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedProjectRepository
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.test.runTest
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.deleteAll
import org.jetbrains.exposed.sql.transactions.transaction
import java.util.concurrent.atomic.AtomicInteger
import kotlin.time.Duration.Companion.seconds

/**
 * Load Test for Connection Pool Validation
 * 
 * This test validates that our connection pool configuration can handle
 * concurrent load within the configured limits (10 connections max).
 * 
 * It specifically addresses the reviewer's concern:
 * "Connection pool sizing: 10 max, 2 min - what happens at 11 concurrent requests?"
 * 
 * Answer: The 11th request waits for up to connectionTimeout (30 seconds) for a 
 * connection to become available. If none available, it throws SQLTimeoutException.
 */
class ConnectionPoolLoadTest : StringSpec({
    
    lateinit var database: Database
    lateinit var repository: ExposedProjectRepository
    lateinit var mockTimeProvider: MockTimeProvider
    lateinit var databaseConfig: DatabaseConfig
    
    beforeSpec {
        // Initialize DatabaseFactory first
        val testDbUrl = "jdbc:h2:mem:test_load;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;LOCK_TIMEOUT=5000;DB_CLOSE_DELAY=-1"
        DatabaseFactory.init(
            jdbcUrl = testDbUrl,
            driver = "org.h2.Driver",
            enableLogging = false
        )

        // Create database with production-like connection pool settings
        databaseConfig = DatabaseConfig(
            jdbcUrl = testDbUrl,
            driver = "org.h2.Driver",
            maxPoolSize = 10,  // Production default
            minPoolSize = 2,   // Production default
            enableLogging = false
        )

        database = databaseConfig.connect()

        transaction(database) {
            SchemaUtils.create(ProjectsTable)
        }

        mockTimeProvider = MockTimeProvider()
        repository = ExposedProjectRepository(mockTimeProvider, database)
    }
    
    afterSpec {
        databaseConfig.close()
        DatabaseFactory.reset()
    }
    
    beforeEach {
        transaction(database) {
            ProjectsTable.deleteAll()
        }
        mockTimeProvider.setTime(kotlinx.datetime.Instant.parse("2025-01-15T10:00:00Z"))
    }
    
    "should handle concurrent requests within connection pool limits (10 connections)" {
        runTest(timeout = 30.seconds) {
            val concurrentRequests = 10  // Exactly at pool limit
            val operationsPerRequest = 50
            
            val successfulOperations = AtomicInteger(0)
            val failedOperations = AtomicInteger(0)
            
            // Launch exactly 10 concurrent operations (at pool limit)
            val jobs = (1..concurrentRequests).map { requestId ->
                async {
                    repeat(operationsPerRequest) { opId ->
                        try {
                            val project = Project.create(
                                name = "LoadTest-$requestId-$opId",
                                description = "Testing at connection pool limit",
                                timeProvider = mockTimeProvider
                            )
                            
                            repository.save(project)
                            val retrieved = repository.findById(project.id)
                            
                            if (retrieved != null) {
                                successfulOperations.incrementAndGet()
                            }
                        } catch (e: Exception) {
                            failedOperations.incrementAndGet()
                            println("Operation failed: ${e.message}")
                        }
                    }
                }
            }
            
            // Wait for all operations
            jobs.awaitAll()
            
            val successful = successfulOperations.get()
            val failed = failedOperations.get()
            val totalExpected = concurrentRequests * operationsPerRequest
            
            println("Load test results (at pool limit):")
            println("  Successful: $successful/$totalExpected")
            println("  Failed: $failed")
            
            // At pool limit, all operations should succeed
            successful shouldBe totalExpected
            failed shouldBe 0
        }
    }
    
    "should handle gracefully when exceeding connection pool limits (11+ connections)" {
        runTest(timeout = 45.seconds) {
            val concurrentRequests = 15  // Exceeds pool limit by 5
            val operationsPerRequest = 20
            
            val successfulOperations = AtomicInteger(0)
            val timeoutErrors = AtomicInteger(0)
            val otherErrors = AtomicInteger(0)
            
            // Launch 15 concurrent operations (exceeds pool limit)
            val jobs = (1..concurrentRequests).map { requestId ->
                async {
                    repeat(operationsPerRequest) { opId ->
                        try {
                            val project = Project.create(
                                name = "OverloadTest-$requestId-$opId",
                                description = "Testing beyond connection pool limit",
                                timeProvider = mockTimeProvider
                            )
                            
                            repository.save(project)
                            
                            // Quick operation to release connection faster
                            repository.exists(project.id)
                            
                            successfulOperations.incrementAndGet()
                            
                        } catch (e: Exception) {
                            when {
                                e.message?.contains("timeout", ignoreCase = true) == true -> {
                                    timeoutErrors.incrementAndGet()
                                }
                                else -> {
                                    otherErrors.incrementAndGet()
                                }
                            }
                        }
                    }
                }
            }
            
            // Wait for all operations
            jobs.awaitAll()
            
            val successful = successfulOperations.get()
            val timeouts = timeoutErrors.get()
            val others = otherErrors.get()
            val totalAttempted = concurrentRequests * operationsPerRequest
            
            println("Load test results (exceeding pool limit):")
            println("  Attempted: $totalAttempted")
            println("  Successful: $successful")
            println("  Timeout errors: $timeouts")
            println("  Other errors: $others")
            
            // Even when exceeding pool limit, most operations should succeed
            // because connections are released and reused
            successful shouldBeGreaterThan (totalAttempted * 70 / 100)  // At least 70% success
            
            // Some operations may timeout or wait, but not too many
            val totalErrors = timeouts + others
            totalErrors shouldBeLessThan (totalAttempted * 30 / 100)  // Less than 30% errors
        }
    }
    
    "should demonstrate connection pool recovery after spike load" {
        runTest(timeout = 60.seconds) {
            val spikeRequests = 20  // Double the pool limit
            val normalRequests = 5   // Within pool limit
            val operationsPerRequest = 10
            
            val spikeErrors = AtomicInteger(0)
            val recoveryErrors = AtomicInteger(0)
            
            println("Phase 1: Spike load (20 concurrent requests)...")
            
            // Phase 1: Spike load
            val spikeJobs = (1..spikeRequests).map { requestId ->
                async {
                    repeat(operationsPerRequest) { opId ->
                        try {
                            val project = Project.create(
                                name = "Spike-$requestId-$opId",
                                description = "Spike load test",
                                timeProvider = mockTimeProvider
                            )
                            repository.save(project)
                        } catch (e: Exception) {
                            spikeErrors.incrementAndGet()
                        }
                    }
                }
            }
            
            // Wait for spike to complete
            spikeJobs.awaitAll()
            
            // Brief recovery period
            kotlinx.coroutines.delay(2000)
            
            println("Phase 2: Normal load (5 concurrent requests)...")
            
            // Phase 2: Normal load after spike
            val recoveryJobs = (1..normalRequests).map { requestId ->
                async {
                    repeat(operationsPerRequest) { opId ->
                        try {
                            val project = Project.create(
                                name = "Recovery-$requestId-$opId",
                                description = "Recovery test",
                                timeProvider = mockTimeProvider
                            )
                            repository.save(project)
                        } catch (e: Exception) {
                            recoveryErrors.incrementAndGet()
                        }
                    }
                }
            }
            
            // Wait for recovery phase
            recoveryJobs.awaitAll()
            
            val spikeErrorCount = spikeErrors.get()
            val recoveryErrorCount = recoveryErrors.get()
            
            println("Connection pool recovery test results:")
            println("  Spike phase errors: $spikeErrorCount/${spikeRequests * operationsPerRequest}")
            println("  Recovery phase errors: $recoveryErrorCount/${normalRequests * operationsPerRequest}")
            
            // After spike, pool should recover and handle normal load without errors
            recoveryErrorCount shouldBe 0
            
            // Even during spike, connection pooling should prevent complete failure
            spikeErrorCount shouldBeLessThan (spikeRequests * operationsPerRequest / 2)
        }
    }
})
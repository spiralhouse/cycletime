package io.spiralhouse.cycletime.mcp.server

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.booleans.shouldBeTrue
import io.kotest.matchers.booleans.shouldBeFalse
import io.kotest.matchers.ints.shouldBeGreaterThan
import io.mockk.*
import kotlinx.coroutines.*
import kotlinx.coroutines.test.*
import kotlin.time.Duration.Companion.milliseconds
import kotlin.time.Duration.Companion.seconds

/**
 * Tests for ConnectionCleanupService to ensure production-grade reliability.
 * 
 * These tests verify:
 * - Proper lifecycle management (no GlobalScope!)
 * - Exception handling and recovery
 * - Exponential backoff on failures
 * - Clean cancellation without resource leaks
 * - Testability in isolated environments
 */
@OptIn(ExperimentalCoroutinesApi::class)
class ConnectionCleanupServiceTest : StringSpec({
    
    lateinit var mockConnectionManager: MCPConnectionManager
    lateinit var mockConfig: MCPConfiguration
    lateinit var testScope: TestScope
    lateinit var cleanupService: ConnectionCleanupService
    
    beforeEach {
        mockConnectionManager = mockk(relaxed = true)
        mockConfig = mockk(relaxed = true)
        testScope = TestScope()
        
        // Setup default mock behaviors
        every { mockConfig.timeout } returns 30.seconds
        every { mockConfig.detailedLogging } returns false
        every { mockConnectionManager.getStatistics() } returns ConnectionStatistics(
            activeCount = 1,
            totalRequests = 100,
            totalErrors = 5,
            averageLatency = 50,
            maxLatency = 200,
            connections = emptyList()
        )
    }
    
    afterEach {
        // Ensure all coroutines are cancelled to prevent test pollution
        testScope.cancel()
    }
    
    "should start and stop cleanly without resource leaks" {
        cleanupService = ConnectionCleanupService(
            connectionManager = mockConnectionManager,
            config = mockConfig,
            cleanupInterval = 100.milliseconds,
            maxRetries = 3
        )
        
        // Start the service
        cleanupService.start(testScope)
        cleanupService.isActive().shouldBeTrue()
        
        // Let it run for a bit
        testScope.advanceTimeBy(150.milliseconds)
        testScope.runCurrent()
        
        // Verify cleanup was called at least once
        coVerify(atLeast = 1) { 
            mockConnectionManager.cleanupStaleConnections(any()) 
        }
        
        // Stop the service
        testScope.runTest {
            cleanupService.stop()
        }
        
        // Verify it's stopped
        cleanupService.isActive().shouldBeFalse()
        
        // Advance time to ensure no more cleanups happen
        testScope.advanceTimeBy(500.milliseconds)
        testScope.runCurrent()
        
        // Verify no additional cleanup calls after stop
        coVerify(exactly = 1) { 
            mockConnectionManager.cleanupStaleConnections(any()) 
        }
    }
    
    "should not start multiple times" {
        cleanupService = ConnectionCleanupService(
            connectionManager = mockConnectionManager,
            config = mockConfig,
            cleanupInterval = 100.milliseconds
        )
        
        // Start the service
        cleanupService.start(testScope)
        val firstStatus = cleanupService.getStatus()
        
        // Try to start again
        cleanupService.start(testScope)
        val secondStatus = cleanupService.getStatus()
        
        // Should be the same instance running
        firstStatus.isRunning shouldBe secondStatus.isRunning
        firstStatus.isRunning.shouldBeTrue()
    }
    
    "should handle exceptions with exponential backoff" {
        var callCount = 0
        coEvery { 
            mockConnectionManager.cleanupStaleConnections(any()) 
        } answers {
            callCount++
            if (callCount <= 2) {
                throw RuntimeException("Simulated failure #$callCount")
            }
            // Success on third attempt
        }
        
        cleanupService = ConnectionCleanupService(
            connectionManager = mockConnectionManager,
            config = mockConfig,
            cleanupInterval = 100.milliseconds,
            maxRetries = 3
        )
        
        cleanupService.start(testScope)
        
        // First attempt (immediate)
        testScope.advanceTimeBy(100.milliseconds)
        testScope.runCurrent()
        
        // Should have failed once
        cleanupService.getStatus().consecutiveFailures shouldBe 1
        
        // Second attempt (after 2^1 = 2 seconds backoff)
        testScope.advanceTimeBy(2.seconds)
        testScope.runCurrent()
        
        // Should have failed twice
        cleanupService.getStatus().consecutiveFailures shouldBe 2
        
        // Third attempt (after 2^2 = 4 seconds backoff)
        testScope.advanceTimeBy(4.seconds)
        testScope.runCurrent()
        
        // Should succeed and reset failure counter
        cleanupService.getStatus().consecutiveFailures shouldBe 0
        
        // Verify exponential backoff was applied
        callCount shouldBe 3
    }
    
    "should stop after max retries to prevent infinite failure loops" {
        coEvery { 
            mockConnectionManager.cleanupStaleConnections(any()) 
        } throws RuntimeException("Persistent failure")
        
        cleanupService = ConnectionCleanupService(
            connectionManager = mockConnectionManager,
            config = mockConfig,
            cleanupInterval = 50.milliseconds,
            maxRetries = 2
        )
        
        cleanupService.start(testScope)
        
        // Initial run - first failure
        testScope.advanceTimeBy(50.milliseconds)
        testScope.runCurrent()
        cleanupService.getStatus().consecutiveFailures shouldBe 1
        cleanupService.isActive().shouldBeTrue()
        
        // After backoff - second failure
        testScope.advanceTimeBy(2.seconds)
        testScope.runCurrent()
        cleanupService.getStatus().consecutiveFailures shouldBe 2
        
        // Service should stop itself after max retries
        cleanupService.isActive().shouldBeFalse()
        
        // Verify cleanup was only attempted twice
        coVerify(exactly = 2) { 
            mockConnectionManager.cleanupStaleConnections(any()) 
        }
    }
    
    "should handle timeout exceptions gracefully" {
        var shouldTimeout = true
        coEvery { 
            mockConnectionManager.cleanupStaleConnections(any()) 
        } coAnswers {
            if (shouldTimeout) {
                shouldTimeout = false
                delay(20.seconds) // Simulate a hanging operation
            }
            // Success on next attempt
        }
        
        cleanupService = ConnectionCleanupService(
            connectionManager = mockConnectionManager,
            config = mockConfig,
            cleanupInterval = 100.milliseconds,
            maxRetries = 3
        )
        
        cleanupService.start(testScope)
        
        // First attempt should timeout after 10 seconds
        testScope.advanceTimeBy(100.milliseconds)
        testScope.runCurrent()
        testScope.advanceTimeBy(10.seconds)
        testScope.runCurrent()
        
        // Should have one failure from timeout
        cleanupService.getStatus().consecutiveFailures shouldBe 1
        
        // After backoff, should succeed
        testScope.advanceTimeBy(2.seconds)
        testScope.runCurrent()
        
        // Failure counter should reset
        cleanupService.getStatus().consecutiveFailures shouldBe 0
    }
    
    "should cancel cleanly when scope is cancelled" {
        cleanupService = ConnectionCleanupService(
            connectionManager = mockConnectionManager,
            config = mockConfig,
            cleanupInterval = 100.milliseconds
        )
        
        val customScope = CoroutineScope(SupervisorJob() + testScope.coroutineContext)
        cleanupService.start(customScope)
        
        cleanupService.isActive().shouldBeTrue()
        
        // Cancel the scope (simulating application shutdown)
        customScope.cancel()
        
        // Advance time to let cancellation propagate
        testScope.advanceTimeBy(200.milliseconds)
        testScope.runCurrent()
        
        // Service should no longer be active
        cleanupService.isActive().shouldBeFalse()
    }
    
    "should only perform cleanup when there are active connections" {
        // First return no connections
        every { mockConnectionManager.getStatistics() } returns ConnectionStatistics(
            activeCount = 0,
            totalRequests = 0,
            totalErrors = 0,
            averageLatency = 0,
            maxLatency = 0,
            connections = emptyList()
        )
        
        cleanupService = ConnectionCleanupService(
            connectionManager = mockConnectionManager,
            config = mockConfig,
            cleanupInterval = 100.milliseconds
        )
        
        cleanupService.start(testScope)
        
        // Run for a while with no connections
        testScope.advanceTimeBy(350.milliseconds)
        testScope.runCurrent()
        
        // Should not have called cleanup when no connections
        coVerify(exactly = 0) { 
            mockConnectionManager.cleanupStaleConnections(any()) 
        }
        
        // Now simulate connections appearing
        every { mockConnectionManager.getStatistics() } returns ConnectionStatistics(
            activeCount = 5,
            totalRequests = 100,
            totalErrors = 0,
            averageLatency = 50,
            maxLatency = 100,
            connections = emptyList()
        )
        
        // Advance time for next cleanup cycle
        testScope.advanceTimeBy(100.milliseconds)
        testScope.runCurrent()
        
        // Now cleanup should be called
        coVerify(exactly = 1) { 
            mockConnectionManager.cleanupStaleConnections(any()) 
        }
    }
    
    "should provide accurate status information" {
        cleanupService = ConnectionCleanupService(
            connectionManager = mockConnectionManager,
            config = mockConfig,
            cleanupInterval = 30.seconds,
            maxRetries = 5
        )
        
        // Before start
        var status = cleanupService.getStatus()
        status.isRunning.shouldBeFalse()
        status.isActive.shouldBeFalse()
        status.consecutiveFailures shouldBe 0
        status.cleanupInterval shouldBe 30.seconds
        
        // After start
        cleanupService.start(testScope)
        status = cleanupService.getStatus()
        status.isRunning.shouldBeTrue()
        status.isActive.shouldBeTrue()
        
        // After stop
        testScope.runTest {
            cleanupService.stop()
        }
        status = cleanupService.getStatus()
        status.isRunning.shouldBeFalse()
        status.isActive.shouldBeFalse()
    }
    
    "should not leak coroutines in production scenario" {
        // This test verifies no coroutines survive after stop
        val productionScope = CoroutineScope(SupervisorJob())
        
        cleanupService = ConnectionCleanupService(
            connectionManager = mockConnectionManager,
            config = mockConfig,
            cleanupInterval = 100.milliseconds
        )
        
        cleanupService.start(productionScope)
        
        // Verify it's running
        cleanupService.isActive().shouldBeTrue()
        
        // Stop the service
        runBlocking {
            cleanupService.stop()
        }
        
        // Cancel the scope (like application shutdown)
        productionScope.cancel()
        
        // If any coroutines leaked, this would throw
        runBlocking {
            withTimeout(1.seconds) {
                productionScope.coroutineContext.job.children.forEach { it.join() }
            }
        }
        
        // Verify service is stopped
        cleanupService.isActive().shouldBeFalse()
    }
})
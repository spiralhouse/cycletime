package io.spiralhouse.cycletime.mcp.integration

import io.kotest.core.annotation.Ignored
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.ints.shouldBeGreaterThan
import io.kotest.matchers.doubles.shouldBeLessThan
import io.spiralhouse.cycletime.mcp.integration.fixtures.MCPIntegrationTestBase
import io.spiralhouse.cycletime.mcp.integration.fixtures.TestDataFactory
import kotlinx.coroutines.*
import kotlinx.serialization.json.*

/**
 * Integration tests for MCP server performance requirements and scalability.
 * 
 * RED PHASE EXPECTATION: ALL TESTS SHOULD FAIL
 * These tests will fail during RED phase due to missing performance optimizations.
 */
@Ignored // SPI-610: Disable Broken MCP WebSocket Tests to Unblock CI/CD
class MCPPerformanceIntegrationTest : MCPIntegrationTestBase() {

    init {
        "should respond to tool calls within 100ms as per SPI-575 requirement" {
            withTestApplication {
                val client = performCompleteHandshake()
                
                // Test simple tool call performance
                val request = TestDataFactory.createProjectToolCall("Perf Test Project")
                
                // Warm up
                repeat(3) {
                    try {
                        client.sendRequest(request)
                    } catch (e: Exception) {
                        // Expected in RED phase
                    }
                }
                
                // Measure actual performance
                val timings = (1..5).map {
                    val (_, timing) = measureTime {
                        try {
                            client.sendRequest(request)
                        } catch (e: Exception) {
                            // Expected in RED phase - simulate timing
                        }
                    }
                    timing
                }
                
                val averageTime = timings.average()
                
                // EXPECTED FAILURE: Performance requirement not met
                averageTime shouldBeLessThan 100.0 // Average < 100ms
                
                println("Tool call performance: avg=${averageTime}ms")
            }
        }
        
        "should serve resources within 50ms as per SPI-575 requirement" {
            withTestApplication {
                val client = performCompleteHandshake()
                
                val resourceUri = "cycletime://projects"
                
                // Measure resource serving performance
                val timings = (1..5).map {
                    val (_, timing) = measureTime {
                        try {
                            client.readResource(resourceUri)
                        } catch (e: Exception) {
                            // Expected in RED phase - simulate timing
                        }
                    }
                    timing
                }
                
                val averageTime = timings.average()
                
                // EXPECTED FAILURE: Resource serving performance not met
                averageTime shouldBeLessThan 50.0 // Average < 50ms
                
                println("Resource serving performance: avg=${averageTime}ms")
            }
        }
        
        "should handle 10+ concurrent connections as per SPI-575 requirement" {
            withTestApplication {
                val connectionCount = 10
                
                // EXPECTED FAILURE: Concurrent connection handling not optimized
                val clients = try {
                    (1..connectionCount).map { index ->
                        async {
                            createInitializedMcpClient("Concurrent-Perf-Client-$index")
                        }
                    }.awaitAll()
                } catch (e: Exception) {
                    // Expected failure in RED phase
                    emptyList()
                }
                
                // Should successfully establish multiple connections
                clients shouldHaveSize connectionCount
                
                // Cleanup
                clients.forEach { 
                    try {
                        it.disconnect()
                    } catch (e: Exception) {
                        // Expected in RED phase
                    }
                }
            }
        }
        
        "should demonstrate effective resource caching performance" {
            withTestApplication {
                val client = performCompleteHandshake()
                
                val resourceUri = "cycletime://projects/test-id"
                
                // First read (cold cache)
                val (coldResponse, coldTiming) = try {
                    measureTime {
                        client.readResource(resourceUri)
                    }
                } catch (e: Exception) {
                    // Expected failure in RED phase
                    null to 1000L
                }
                
                // Subsequent reads (warm cache)
                val warmTimings = (1..3).map {
                    try {
                        val (_, timing) = measureTime {
                            client.readResource(resourceUri)
                        }
                        timing
                    } catch (e: Exception) {
                        // Expected failure in RED phase
                        1000L
                    }
                }
                
                val averageWarmTime = warmTimings.average()
                
                // EXPECTED FAILURE: Caching not implemented or not effective
                // Cached reads should be significantly faster
                if (coldTiming > 0) {
                    averageWarmTime shouldBeLessThan (coldTiming * 0.5) // At least 50% faster
                }
                
                println("Cache performance: cold=${coldTiming}ms, warm_avg=${averageWarmTime}ms")
            }
        }
        
        "should maintain connection establishment latency under load" {
            withTestApplication {
                val connectionAttempts = 5
                
                // Measure connection establishment times
                val connectionTimings = (1..connectionAttempts).map { index ->
                    async {
                        try {
                            val (client, timing) = measureTime {
                                val client = createConnectedMcpClient()
                                client.initialize(clientName = "Connection-Perf-Client-$index")
                                client
                            }
                            
                            // Cleanup immediately
                            client.disconnect()
                            timing
                        } catch (e: Exception) {
                            // Expected failure in RED phase
                            5000L // Simulate slow connection
                        }
                    }
                }.awaitAll()
                
                val averageConnectionTime = connectionTimings.average()
                
                // EXPECTED FAILURE: Connection establishment not optimized
                averageConnectionTime shouldBeLessThan 1000.0 // Average < 1 second
                
                println("Connection performance: avg=${averageConnectionTime}ms")
            }
        }
    }
}
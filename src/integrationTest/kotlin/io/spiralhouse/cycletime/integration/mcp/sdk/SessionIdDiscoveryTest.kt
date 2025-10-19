package io.spiralhouse.cycletime.integration.mcp.sdk

import io.kotest.core.spec.style.StringSpec
import io.ktor.client.*
import io.ktor.client.engine.cio.*
import io.ktor.client.plugins.sse.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import kotlinx.coroutines.*
import org.slf4j.LoggerFactory

/**
 * Empirical test to discover how MCP SDK v0.7.2 communicates sessionId to clients.
 *
 * This test connects to a running MCP SDK server and logs ALL observable data
 * to identify where/how the sessionId is provided.
 *
 * ## Testing Strategy
 *
 * 1. Open SSE connection to server
 * 2. Log ALL HTTP response headers
 * 3. Log ALL SSE events (id, event, data, retry, comments)
 * 4. Look for sessionId in:
 *    - Response headers (Mcp-Session-Id, X-Session-Id, etc.)
 *    - SSE event ID field
 *    - SSE event data (JSON payload)
 *    - SSE event type/name
 *
 * ## Expected Server Behavior
 *
 * Server logs show: "New SSE connection established and stored with sessionId: <uuid>"
 * This test will discover WHERE the server sends that UUID to the client.
 *
 * ## Prerequisites
 *
 * - Server must be running at http://localhost:8080
 * - Run with: ./gradlew integrationTest --tests "*SessionIdDiscoveryTest*" --info
 */
class SessionIdDiscoveryTest : StringSpec({
    val logger = LoggerFactory.getLogger("SessionIdDiscovery")
    val endpoint = "http://localhost:8080"

    "discover sessionId delivery mechanism via SSE connection" {
        val client = HttpClient(CIO) {
            install(SSE)
        }

        logger.info("=== STARTING SESSIONID DISCOVERY ===")
        logger.info("Target endpoint: $endpoint")

        try {
            // Step 1: Establish SSE connection with full logging
            logger.info("")
            logger.info("Step 1: Opening SSE connection to $endpoint")
            logger.info("-----------------------------------------------")

            val job = CoroutineScope(Dispatchers.IO).launch {
                try {
                    client.sse(
                        urlString = endpoint,
                        request = {
                            header(HttpHeaders.Accept, ContentType.Text.EventStream.toString())
                        }
                    ) {
                        // Log the HTTP response details
                        logger.info("✓ SSE Connection established!")
                        logger.info("")
                        logger.info("Response status: ${call.response.status}")
                        logger.info("")

                        // Log ALL response headers
                        logger.info("=== RESPONSE HEADERS ===")
                        call.response.headers.forEach { key, values ->
                            values.forEach { value ->
                                logger.info("  $key: $value")

                                // Highlight if it contains "session" or "Session"
                                if (key.contains("session", ignoreCase = true) ||
                                    value.contains("session", ignoreCase = true)) {
                                    logger.info("  ^^^ POTENTIAL SESSIONID MATCH ^^^")
                                }
                            }
                        }
                        logger.info("")

                        // Log ALL SSE events received
                        logger.info("=== SSE EVENTS ===")
                        var eventCount = 0
                        incoming.collect { event ->
                            eventCount++
                            logger.info("")
                            logger.info("Event #$eventCount:")
                            logger.info("  id: ${event.id}")
                            logger.info("  event: ${event.event}")
                            logger.info("  data: ${event.data}")
                            logger.info("  retry: ${event.retry}")
                            logger.info("  comments: ${event.comments}")

                            // Check for sessionId patterns
                            var foundSessionId = false

                            // Check event ID for UUID pattern
                            if (event.id != null && event.id!!.matches(Regex("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"))) {
                                logger.info("  ^^^ EVENT ID LOOKS LIKE UUID/SESSIONID ^^^")
                                foundSessionId = true
                            }

                            // Check event type for session-related names
                            if (event.event?.contains("session", ignoreCase = true) == true) {
                                logger.info("  ^^^ EVENT TYPE CONTAINS 'SESSION' ^^^")
                                foundSessionId = true
                            }

                            // Check event data for session content
                            if (event.data?.contains("session", ignoreCase = true) == true) {
                                logger.info("  ^^^ EVENT DATA CONTAINS 'SESSION' ^^^")
                                foundSessionId = true
                            }

                            // Stop after 10 events or if we found sessionId
                            if (eventCount >= 10 || foundSessionId) {
                                logger.info("")
                                logger.info("Stopping event collection (found potential sessionId or reached limit)")
                                cancel()
                            }
                        }
                    }
                } catch (e: CancellationException) {
                    logger.info("SSE connection cancelled (expected)")
                } catch (e: Exception) {
                    logger.error("SSE connection error: ${e.message}", e)
                }
            }

            // Wait for connection to establish and log data
            logger.info("")
            logger.info("Waiting 5 seconds for SSE events...")
            delay(5000)

            job.cancel()
            job.join()

            logger.info("")
            logger.info("=== SESSIONID DISCOVERY COMPLETE ===")
            logger.info("")
            logger.info("NEXT STEPS:")
            logger.info("1. Review logs above for sessionId location")
            logger.info("2. Check for UUID patterns in headers, event IDs, or event data")
            logger.info("3. Look for 'POTENTIAL SESSIONID MATCH' markers")
            logger.info("4. Copy findings to /tmp/sessionid-discovery-output.txt")
            logger.info("")

        } finally {
            client.close()
        }
    }

    "discover sessionId via POST request to root endpoint" {
        val client = HttpClient(CIO)

        logger.info("")
        logger.info("=== TESTING POST REQUEST TO ROOT ENDPOINT ===")
        logger.info("This tests if POST requests to / return sessionId differently")
        logger.info("")

        try {
            // Try a simple POST request to see what happens
            val response = client.post("$endpoint/") {
                header(HttpHeaders.Accept, ContentType.Application.Json.toString())
                header(HttpHeaders.ContentType, ContentType.Application.Json.toString())
                setBody("""{"jsonrpc":"2.0","method":"ping","id":1}""")
            }

            logger.info("POST Response status: ${response.status}")
            logger.info("")
            logger.info("=== POST RESPONSE HEADERS ===")
            response.headers.forEach { key, values ->
                values.forEach { value ->
                    logger.info("  $key: $value")

                    // Highlight if it contains "session" or "Session"
                    if (key.contains("session", ignoreCase = true) ||
                        value.contains("session", ignoreCase = true)) {
                        logger.info("  ^^^ POTENTIAL SESSIONID MATCH ^^^")
                    }
                }
            }

            logger.info("")
            logger.info("POST Response body: ${response.bodyAsText()}")
            logger.info("")

        } catch (e: Exception) {
            logger.error("POST request error: ${e.message}", e)
        } finally {
            client.close()
        }
    }
})

package io.spiralhouse.cycletime.integration.sse

import io.kotest.core.spec.style.StringSpec
import io.ktor.server.testing.*
import io.spiralhouse.cycletime.module

/**
 * Base class for SSE integration tests.
 *
 * Provides proper test application setup with module loading.
 * All SSE tests should extend this class to ensure routes are registered.
 *
 * Usage:
 * ```
 * class MyTest : SSETestBase() {
 *     init {
 *         "test name" {
 *             withTestApp {
 *                 // test code
 *             }
 *         }
 *     }
 * }
 * ```
 */
abstract class SSETestBase() : StringSpec() {

    /**
     * Create test application with proper module loading.
     * Routes will be available within the block.
     */
    protected suspend fun withTestApp(block: suspend ApplicationTestBuilder.() -> Unit) {
        testApplication {
            application {
                module() // Load application module to register routes
            }
            block()
        }
    }
}

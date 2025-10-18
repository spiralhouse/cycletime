package io.spiralhouse.cycletime.mcp.sdk.adapters

import io.modelcontextprotocol.kotlin.sdk.ReadResourceRequest
import io.modelcontextprotocol.kotlin.sdk.ReadResourceResult
import io.modelcontextprotocol.kotlin.sdk.Resource
import io.modelcontextprotocol.kotlin.sdk.TextResourceContents
import io.modelcontextprotocol.kotlin.sdk.server.Server
import io.spiralhouse.cycletime.mcp.resources.ResourceProvider
import io.spiralhouse.cycletime.mcp.sdk.SDKSessionManager
import io.spiralhouse.cycletime.mcp.sdk.SessionContext
import org.slf4j.LoggerFactory

/**
 * Adapter that bridges existing ResourceProvider to SDK v0.7.2 registration API.
 *
 * This adapter implements the adapter pattern: it delegates to existing resource providers,
 * preserving 100% of business logic while adapting to SDK interfaces.
 *
 * Design Philosophy:
 * - Business logic in ResourceProvider remains unchanged
 * - Adapter handles SDK-specific registration and request/response conversion
 * - Session context extraction delegated to BaseSDKAdapter
 * - Error handling delegated to BaseSDKAdapter (consistent patterns)
 * - All resource reading delegated to existing providers
 *
 * @property resourceProvider The existing resource provider with business logic
 * @property sessionManager Session manager for SDK session handling
 */
class SDKResourceAdapter(
    private val resourceProvider: ResourceProvider,
    sessionManager: SDKSessionManager
) : BaseSDKAdapter(sessionManager) {

    /**
     * Register all resources from provider with SDK server.
     *
     * This method registers resource templates with the SDK server, which will handle
     * client requests to list and read resources.
     *
     * Performance Monitoring:
     * - Measures registration time (useful for production monitoring)
     * - Logs individual resource URIs (detailed debugging)
     * - Logs summary with timing and resource list (operational visibility)
     */
    suspend fun registerResources(server: Server) {
        // Get resource list from provider
        val resources = resourceProvider.listResources()
        val startTime = System.currentTimeMillis()

        resources.forEach { resource ->
            registerResource(server, resource)
            logger.debug("Registered resource: ${resource.uri}")
        }

        val elapsedMs = System.currentTimeMillis() - startTime
        val resourceNames = resources.joinToString(", ") { it.name }
        logger.info(
            "Registered ${resources.size} resources from provider '${resourceProvider.name}' " +
            "in ${elapsedMs}ms (resources: $resourceNames)"
        )
    }

    /**
     * Register individual resource with SDK server.
     *
     * Adapts existing resource to SDK registration API:
     * - Converts resource metadata to SDK Resource format
     * - Registers resource with SDK server
     * - Wraps read handler to accept ReadResourceRequest and return ReadResourceResult
     */
    private fun registerResource(server: Server, resource: io.spiralhouse.cycletime.mcp.resources.Resource) {
        // Register with SDK - the SDK handles the read requests
        server.addResource(
            uri = resource.uri,
            name = resource.name,
            description = resource.description ?: "Resource: ${resource.name}",
            mimeType = resource.mimeType ?: "application/json"
        ) { request: ReadResourceRequest ->
            readResource(request)
        }

        logger.debug("Registered resource: ${resource.uri}")
    }

    /**
     * Read resource via adapter (business logic unchanged).
     *
     * This method:
     * 1. Delegates session extraction and error handling to BaseSDKAdapter
     * 2. Delegates to existing resource provider readResource method (business logic unchanged)
     * 3. Converts String result to SDK ReadResourceResult format
     *
     * Session handling:
     * - Session is optional for resource reading (most resources can be read without session)
     * - Session validation is delegated to business logic if needed
     * - Session extraction does not throw if missing (resources handle missing session appropriately)
     *
     * Error handling:
     * - Delegated to BaseSDKAdapter.executeWithErrorHandling
     * - Returns ReadResourceResult with error message in TextResourceContents (not empty list)
     * - Provides actionable error details to MCP clients
     */
    private suspend fun readResource(request: ReadResourceRequest): ReadResourceResult {
        return executeWithErrorHandling(
            operationName = "Resource reading",
            resourceIdentifier = request.uri,
            meta = request._meta,
            errorResultFactory = { errorMessage ->
                // Return error result with actual error message (improves debugging)
                ReadResourceResult(
                    contents = listOf(
                        TextResourceContents(
                            uri = request.uri,
                            mimeType = "text/plain",
                            text = errorMessage
                        )
                    )
                )
            }
        ) { sessionId ->
            // Execute business logic (unchanged)

            // Read resource content (business logic unchanged)
            val content = resourceProvider.readResource(request.uri)

            // Convert to SDK ReadResourceResult format
            ReadResourceResult(
                contents = listOf(
                    TextResourceContents(
                        uri = request.uri,
                        mimeType = "application/json",
                        text = content
                    )
                )
            )
        }
    }
}

package io.spiralhouse.cycletime.mcp.resources

import io.spiralhouse.cycletime.mcp.resources.exceptions.ProviderUnavailableException
import kotlinx.serialization.json.JsonObject

/**
 * Base interface for resource providers that manage and serve resources
 */
interface ResourceProvider {
    val name: String
    val isRunning: Boolean
    
    suspend fun start()
    suspend fun stop()
    suspend fun listResources(
        filter: ResourceFilter? = null,
        pagination: ResourcePagination? = null
    ): List<Resource>
    suspend fun getResource(uri: String): Resource?
    suspend fun searchResources(query: String): List<Resource>
    suspend fun updateResource(uri: String, content: ResourceContent)
}

/**
 * Metadata about a resource provider's capabilities and configuration
 */
data class ResourceProviderMetadata(
    val name: String,
    val description: String,
    val capabilities: Set<ResourceCapability>
)

/**
 * Capabilities that a resource provider may support
 */
enum class ResourceCapability {
    READ, WRITE, SUBSCRIBE, SEARCH
}

/**
 * Template for creating resources with predefined structure
 */
data class ResourceTemplate(
    val name: String,
    val schema: JsonObject
)

/**
 * Test implementation of ResourceProvider for testing purposes
 */
class TestResourceProvider(override val name: String) : ResourceProvider {
    private var running = false
    private val testResources = mutableListOf<Resource>()
    private var explicitlyStarted = false
    
    companion object {
        // Global notification system for testing
        val globalNotificationCallbacks = mutableMapOf<String, (io.spiralhouse.cycletime.mcp.resources.subscription.ResourceChangeNotification) -> Unit>()
    }
    
    init {
        // Initialize with test data
        testResources.addAll(createTestResources())
    }
    
    override val isRunning: Boolean get() = running
    
    override suspend fun start() {
        running = true
        explicitlyStarted = true
    }
    
    override suspend fun stop() {
        running = false
        explicitlyStarted = true // Mark as explicitly managed
    }
    
    override suspend fun listResources(
        filter: ResourceFilter?,
        pagination: ResourcePagination?
    ): List<Resource> {
        if (!isRunning) {
            if (explicitlyStarted) {
                throw ProviderUnavailableException(name)
            } else {
                // Auto-start for tests that don't explicitly manage lifecycle
                running = true
            }
        }
        
        var filtered = testResources.toList()
        
        // Apply filters
        filter?.mimeType?.let { mimeType ->
            filtered = filtered.filter { it.mimeType == mimeType }
        }
        
        // Apply pagination
        pagination?.let { p ->
            val start = p.offset
            val end = minOf(start + p.limit, filtered.size)
            filtered = if (start < filtered.size) filtered.subList(start, end) else emptyList()
        }
        
        return filtered
    }
    
    override suspend fun getResource(uri: String): Resource? {
        if (!isRunning) {
            if (explicitlyStarted) {
                throw ProviderUnavailableException(name)
            } else {
                running = true
            }
        }
        return testResources.find { it.uri == uri }
    }
    
    override suspend fun searchResources(query: String): List<Resource> {
        if (!isRunning) {
            if (explicitlyStarted) {
                throw ProviderUnavailableException(name)
            } else {
                running = true
            }
        }
        return testResources.filter { 
            it.name.contains(query, ignoreCase = true) || 
            (it.description?.contains(query, ignoreCase = true) == true)
        }
    }
    
    override suspend fun updateResource(uri: String, content: ResourceContent) {
        if (!isRunning) {
            if (explicitlyStarted) {
                throw ProviderUnavailableException(name)
            } else {
                running = true
            }
        }
        val index = testResources.indexOfFirst { it.uri == uri }
        if (index != -1) {
            val existing = testResources[index]
            testResources[index] = existing.copy(
                content = content,
                metadata = existing.metadata?.copy(modified = java.time.Instant.now())
            )
            
            // Notify via global system
            val notification = io.spiralhouse.cycletime.mcp.resources.subscription.ResourceChangeNotification(
                uri = uri,
                changeType = io.spiralhouse.cycletime.mcp.resources.subscription.ResourceChangeType.UPDATED,
                timestamp = java.time.Instant.now(),
                content = content
            )
            globalNotificationCallbacks.values.forEach { callback ->
                callback(notification)
            }
        }
    }
    
    private fun createTestResources(): List<Resource> {
        val now = java.time.Instant.now()
        return listOf(
            Resource(
                uri = "config://settings/database",
                name = "Database Configuration",
                description = "Database connection configuration",
                mimeType = "application/json",
                content = ResourceContent.Text("""{"host": "localhost", "port": 5432}"""),
                metadata = ResourceMetadata(created = now, modified = now, size = 45L)
            ),
            Resource(
                uri = "file://project/README.md",
                name = "Project Documentation",
                description = "Main project documentation file",
                mimeType = "text/markdown",
                content = ResourceContent.Text("# Project README\n\nWelcome to the project."),
                metadata = ResourceMetadata(created = now, modified = now, size = 50L)
            ),
            Resource(
                uri = "config://settings/app",
                name = "Application Settings", 
                mimeType = "application/json",
                content = ResourceContent.Text("""{"debug": true, "port": 8080}"""),
                metadata = ResourceMetadata(created = now, modified = now, size = 35L)
            ),
            Resource(
                uri = "state://session/current",
                name = "Current Session",
                mimeType = "text/plain",
                content = ResourceContent.Text("active: false"),
                metadata = ResourceMetadata(created = now, modified = now, size = 25L)
            )
        )
    }
}
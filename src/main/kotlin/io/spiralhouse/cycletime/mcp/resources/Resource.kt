package io.spiralhouse.cycletime.mcp.resources

import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.domain.services.SystemTimeProvider
import io.spiralhouse.cycletime.mcp.resources.exceptions.InvalidResourceUriException
import kotlinx.datetime.Instant
import java.net.URI

/**
 * Represents a resource in the MCP Resource Provider Framework.
 * 
 * Resources are the fundamental unit of data in the MCP framework. Each resource
 * is uniquely identified by a URI and contains content that can be accessed and
 * monitored for changes. Resources are immutable - updates create new versions.
 * 
 * @property uri Unique identifier for the resource (e.g., "config://settings/database")
 * @property name Human-readable name for the resource
 * @property description Optional description of the resource's purpose
 * @property mimeType MIME type indicating the content format (e.g., "application/json")
 * @property content The actual content of the resource (text or binary)
 * @property metadata Additional metadata about the resource (timestamps, version, size)
 * @property permissions Optional access control permissions for the resource
 */
data class Resource(
    val uri: String,
    val name: String,
    val description: String? = null,
    val mimeType: String,
    val content: ResourceContent? = null,
    val metadata: ResourceMetadata? = null,
    val permissions: ResourcePermissions? = null
) {
    companion object {
        var timeProvider: TimeProvider = SystemTimeProvider()
    }
    init {
        validateUri(uri)
        // Validate content if present
        content?.let { validateContent(it) }
    }

    private fun validateUri(uri: String) {
        try {
            // Check if this is a template URI with placeholders (e.g., {id})
            val templateUri = uri.replace(Regex("\\{[^}]+\\}"), "placeholder")
            val parsedUri = URI.create(templateUri)
            if (parsedUri.scheme == null) {
                throw InvalidResourceUriException("URI must have a scheme: $uri")
            }
        } catch (e: IllegalArgumentException) {
            throw InvalidResourceUriException("Invalid URI format: $uri")
        }
    }

    private fun validateContent(content: ResourceContent) {
        when (content) {
            is ResourceContent.Binary -> {
                // Validate base64 encoding
                try {
                    java.util.Base64.getDecoder().decode(content.data)
                } catch (e: IllegalArgumentException) {
                    throw io.spiralhouse.cycletime.mcp.resources.exceptions.ContentEncodingException("Invalid base64 encoding in binary content")
                }
            }
            is ResourceContent.Text -> {
                // Text content is always valid
            }
        }
    }
    
    /**
     * Get the resource scheme (e.g., "config", "file", "state")
     */
    val scheme: String
        get() = URI.create(uri).scheme
    
    /**
     * Get the resource path without the scheme
     */
    val path: String
        get() = uri.substringAfter("://")
    
    /**
     * Check if this resource is newer than the given timestamp
     */
    fun isNewerThan(timestamp: Instant): Boolean {
        return metadata?.modified?.let { it > timestamp } ?: false
    }
    
    /**
     * Check if this resource matches the given filter
     */
    fun matches(filter: ResourceFilter): Boolean {
        return filter.mimeType?.let { it == mimeType } ?: true
    }
    
    /**
     * Create a copy of this resource with updated content
     */
    fun withContent(newContent: ResourceContent): Resource {
        return copy(
            content = newContent,
            metadata = metadata?.copy(
                modified = timeProvider.now(),
                size = when (newContent) {
                    is ResourceContent.Text -> newContent.data.length.toLong()
                    is ResourceContent.Binary -> newContent.data.length.toLong()
                }
            )
        )
    }
}

/**
 * Resource content supporting text and binary data
 */
sealed class ResourceContent {
    data class Text(val data: String) : ResourceContent()
    data class Binary(val data: String) : ResourceContent() // base64 encoded
}

/**
 * Metadata for resources including creation, modification times, size, and version
 */
data class ResourceMetadata(
    val created: Instant,
    val modified: Instant,
    val size: Long,
    val version: String? = null
)

/**
 * Resource permissions controlling read and write access
 */
data class ResourcePermissions(
    val readable: Boolean = true,
    val writable: Boolean = false
)

/**
 * Pagination parameters for listing resources
 */
data class ResourcePagination(
    val limit: Int,
    val offset: Int
)

/**
 * Filter parameters for resource queries
 */
data class ResourceFilter(
    val mimeType: String? = null,
    val provider: String? = null
)
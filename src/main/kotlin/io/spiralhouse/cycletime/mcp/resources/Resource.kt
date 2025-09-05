package io.spiralhouse.cycletime.mcp.resources

import io.spiralhouse.cycletime.mcp.resources.exceptions.InvalidResourceUriException
import java.time.Instant
import java.net.URI

/**
 * Represents a resource in the MCP Resource Provider Framework.
 * Resources are immutable - updates create new versions.
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
    init {
        validateUri(uri)
        // Validate content if present
        content?.let { validateContent(it) }
    }

    private fun validateUri(uri: String) {
        try {
            val parsedUri = URI.create(uri)
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
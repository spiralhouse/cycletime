package io.spiralhouse.cycletime.mcp.resources.subscription

import io.spiralhouse.cycletime.mcp.resources.ResourceContent
import kotlinx.serialization.json.JsonElement
import java.time.Instant
import java.util.*

/**
 * Represents a subscription to resource changes
 */
data class ResourceSubscription(
    val id: String = "sub-${UUID.randomUUID()}",
    val uri: String? = null,
    val providerId: String? = null,
    var isActive: Boolean = true
)

/**
 * Notification of resource changes
 */
data class ResourceChangeNotification(
    val uri: String,
    val changeType: ResourceChangeType,
    val timestamp: Instant,
    val content: ResourceContent? = null,
    val deltas: List<ResourceDelta>? = null
)

/**
 * Types of resource changes
 */
enum class ResourceChangeType {
    CREATED, UPDATED, DELETED, PARTIAL_UPDATE
}

/**
 * Represents a delta change to a resource
 */
data class ResourceDelta(
    val path: String,
    val operation: DeltaOperation,
    val value: JsonElement
)

/**
 * Delta operations for partial updates
 */
enum class DeltaOperation {
    CREATE, UPDATE, DELETE
}

/**
 * Subscriber information for resource changes
 */
data class TestSubscriber(
    val id: String,
    val roles: Set<String> = emptySet()
)
package io.spiralhouse.cycletime.mcp.resources.interfaces

import io.spiralhouse.cycletime.mcp.resources.ResourceContent
import io.spiralhouse.cycletime.mcp.resources.subscription.*
import kotlin.time.Duration

/**
 * Service interface for managing resource change notifications
 * 
 * This interface defines the contract for services that handle notification
 * delivery, including batching, rate limiting, and delta notifications.
 */
interface NotificationService {
    
    /**
     * Add a subscriber for individual notifications
     * 
     * @param uri The URI of the resource to monitor
     * @param subscriber The subscriber to add
     * @param callback The callback for notifications
     */
    suspend fun addSubscriber(
        uri: String,
        subscriber: TestSubscriber,
        callback: (ResourceChangeNotification) -> Unit
    )
    
    /**
     * Add a subscriber for batched notifications
     * 
     * @param subscriber The subscriber to add
     * @param callback The callback for batched notifications
     */
    suspend fun addBatchSubscriber(
        subscriber: TestSubscriber,
        callback: (List<ResourceChangeNotification>) -> Unit
    )
    
    /**
     * Configure batching parameters
     * 
     * @param batchSize Maximum number of notifications per batch
     * @param batchTimeout Maximum time to wait before sending incomplete batch
     */
    fun configureBatching(batchSize: Int, batchTimeout: Duration)
    
    /**
     * Configure rate limiting for a subscriber
     * 
     * @param maxNotificationsPerSecond Maximum notifications per second
     * @param subscriber The subscriber to configure rate limiting for
     */
    fun configureRateLimit(maxNotificationsPerSecond: Int, subscriber: TestSubscriber)
    
    /**
     * Notify subscribers of resource changes
     * 
     * @param uri The URI of the changed resource
     * @param changeType The type of change that occurred
     * @param newContent The new content, if applicable
     */
    suspend fun notifyResourceChange(
        uri: String,
        changeType: ResourceChangeType,
        newContent: ResourceContent? = null
    )
    
    /**
     * Notify subscribers of partial resource updates
     * 
     * @param uri The URI of the updated resource
     * @param deltas The delta changes to apply
     */
    suspend fun notifyResourceDelta(uri: String, deltas: List<ResourceDelta>)
}
package io.spiralhouse.cycletime.mcp.resources.interfaces

import io.spiralhouse.cycletime.mcp.resources.subscription.*

/**
 * Manager interface for handling resource subscriptions
 * 
 * This interface defines the contract for managing subscriptions to resource
 * changes, including resource-level and provider-level subscriptions.
 */
interface SubscriptionManager {
    
    /**
     * Subscribe to changes for a specific resource
     * 
     * @param uri The URI of the resource to subscribe to
     * @param subscriber The subscriber requesting the subscription
     * @param callback The callback to invoke when changes occur
     * @return The created subscription
     * @throws SubscriptionLimitExceededException if subscriber exceeds limit
     */
    suspend fun subscribeToResource(
        uri: String,
        subscriber: TestSubscriber,
        callback: (ResourceChangeNotification) -> Unit
    ): ResourceSubscription
    
    /**
     * Subscribe to provider-level changes (new/removed resources)
     * 
     * @param providerId The ID of the provider to subscribe to
     * @param subscriber The subscriber requesting the subscription
     * @param callback The callback to invoke when changes occur
     * @return The created subscription
     */
    suspend fun subscribeToProvider(
        providerId: String,
        subscriber: TestSubscriber,
        callback: (ResourceChangeNotification) -> Unit
    ): ResourceSubscription
    
    /**
     * Unsubscribe from notifications
     * 
     * @param subscriptionId The ID of the subscription to cancel
     */
    suspend fun unsubscribe(subscriptionId: String)
    
    /**
     * Handle subscriber disconnection cleanup
     * 
     * @param subscriberId The ID of the disconnected subscriber
     */
    suspend fun handleSubscriberDisconnection(subscriberId: String)
    
    /**
     * Notify subscribers of resource changes
     * 
     * @param notification The change notification to broadcast
     */
    suspend fun notifyChange(notification: ResourceChangeNotification)
}
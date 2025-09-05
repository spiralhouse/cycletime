package io.spiralhouse.cycletime.mcp.resources.subscription

import io.spiralhouse.cycletime.mcp.resources.exceptions.SubscriptionLimitExceededException
import io.spiralhouse.cycletime.mcp.resources.interfaces.SubscriptionManager
import java.util.concurrent.ConcurrentHashMap

/**
 * Manages resource subscriptions and notifications
 * 
 * This implementation provides thread-safe subscription management with
 * per-client limits, automatic cleanup on disconnection, and integration
 * with the global notification system.
 */
class ResourceSubscriptionManager(
    private val maxSubscriptionsPerClient: Int = 100
) : SubscriptionManager {
    private val subscriptions = ConcurrentHashMap<String, ResourceSubscription>()
    private val clientSubscriptions = ConcurrentHashMap<String, MutableSet<String>>()
    private val callbacks = ConcurrentHashMap<String, (ResourceChangeNotification) -> Unit>()
    
    /**
     * Subscribe to changes for a specific resource
     */
    override suspend fun subscribeToResource(
        uri: String,
        subscriber: TestSubscriber,
        callback: (ResourceChangeNotification) -> Unit
    ): ResourceSubscription {
        checkSubscriptionLimit(subscriber.id)
        
        val subscription = ResourceSubscription(
            uri = uri,
            isActive = true
        )
        
        subscriptions[subscription.id] = subscription
        clientSubscriptions.computeIfAbsent(subscriber.id) { mutableSetOf() }.add(subscription.id)
        callbacks[subscription.id] = callback
        
        // Register with global notification system
        io.spiralhouse.cycletime.mcp.resources.TestResourceProvider.globalNotificationCallbacks[subscription.id] = { notification ->
            if (notification.uri == uri && subscription.isActive) {
                callback(notification)
            }
        }
        
        return subscription
    }
    
    /**
     * Subscribe to provider-level changes (new/removed resources)
     */
    override suspend fun subscribeToProvider(
        providerId: String,
        subscriber: TestSubscriber,
        callback: (ResourceChangeNotification) -> Unit
    ): ResourceSubscription {
        checkSubscriptionLimit(subscriber.id)
        
        val subscription = ResourceSubscription(
            providerId = providerId,
            isActive = true
        )
        
        subscriptions[subscription.id] = subscription
        clientSubscriptions.computeIfAbsent(subscriber.id) { mutableSetOf() }.add(subscription.id)
        callbacks[subscription.id] = callback
        
        return subscription
    }
    
    /**
     * Unsubscribe from notifications
     */
    override suspend fun unsubscribe(subscriptionId: String) {
        val subscription = subscriptions[subscriptionId]
        subscription?.let {
            it.isActive = false
            subscriptions.remove(subscriptionId)
            callbacks.remove(subscriptionId)
            
            // Remove from global notification system
            io.spiralhouse.cycletime.mcp.resources.TestResourceProvider.globalNotificationCallbacks.remove(subscriptionId)
            
            // Remove from client subscriptions
            clientSubscriptions.values.forEach { subscriptionSet ->
                subscriptionSet.remove(subscriptionId)
            }
        }
    }
    
    /**
     * Handle subscriber disconnection cleanup
     */
    override suspend fun handleSubscriberDisconnection(subscriberId: String) {
        val subscriptionIds = clientSubscriptions[subscriberId] ?: emptySet()
        for (subscriptionId in subscriptionIds) {
            val subscription = subscriptions[subscriptionId]
            subscription?.let { it.isActive = false }
            subscriptions.remove(subscriptionId)
            callbacks.remove(subscriptionId)
            // Remove from global notification system
            io.spiralhouse.cycletime.mcp.resources.TestResourceProvider.globalNotificationCallbacks.remove(subscriptionId)
        }
        clientSubscriptions.remove(subscriberId)
    }
    
    /**
     * Notify subscribers of resource changes
     */
    override suspend fun notifyChange(notification: ResourceChangeNotification) {
        for ((subscriptionId, subscription) in subscriptions) {
            if (subscription.isActive) {
                val shouldNotify = when {
                    subscription.uri != null -> subscription.uri == notification.uri
                    subscription.providerId != null -> {
                        // For provider-level subscriptions, notify about all resources
                        true
                    }
                    else -> false
                }
                
                if (shouldNotify) {
                    callbacks[subscriptionId]?.invoke(notification)
                }
            }
        }
    }
    
    private fun checkSubscriptionLimit(clientId: String) {
        val currentCount = clientSubscriptions[clientId]?.size ?: 0
        if (currentCount >= maxSubscriptionsPerClient) {
            throw SubscriptionLimitExceededException(maxSubscriptionsPerClient)
        }
    }
}
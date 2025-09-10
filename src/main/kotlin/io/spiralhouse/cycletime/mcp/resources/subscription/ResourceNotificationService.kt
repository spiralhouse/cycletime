package io.spiralhouse.cycletime.mcp.resources.subscription

import io.spiralhouse.cycletime.mcp.resources.ResourceContent
import kotlinx.coroutines.*
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap
import kotlin.time.Duration
import kotlin.time.Duration.Companion.milliseconds

/**
 * Service for managing resource change notifications with batching and rate limiting
 * 
 * This implementation provides intelligent notification batching to reduce
 * network overhead, token-bucket based rate limiting to prevent overload,
 * and support for both full and delta resource updates.
 */
class ResourceNotificationService {
    private val subscriptions = ConcurrentHashMap<String, (ResourceChangeNotification) -> Unit>()
    private val batchSubscriptions = ConcurrentHashMap<String, (List<ResourceChangeNotification>) -> Unit>()
    private val rateLimits = ConcurrentHashMap<String, RateLimit>()
    private val pendingBatches = ConcurrentHashMap<String, MutableList<ResourceChangeNotification>>()
    private val batchTimeoutJobs = ConcurrentHashMap<String, Job>()
    
    // Batching configuration
    private var batchSize: Int = 10
    private var batchTimeout: Duration = 100.milliseconds
    
    private data class RateLimit(
        val maxPerSecond: Int,
        val tokens: Int,
        val lastRefill: Long
    )
    
    /**
     * Add a subscriber for individual notifications
     */
    suspend fun addSubscriber(
        uri: String,
        subscriber: TestSubscriber,
        callback: (ResourceChangeNotification) -> Unit
    ) {
        subscriptions["${subscriber.id}:$uri"] = callback
    }
    
    /**
     * Add a subscriber for batched notifications
     */
    suspend fun addBatchSubscriber(
        subscriber: TestSubscriber,
        callback: (List<ResourceChangeNotification>) -> Unit
    ) {
        batchSubscriptions[subscriber.id] = callback
        pendingBatches[subscriber.id] = mutableListOf()
    }
    
    /**
     * Configure batching parameters
     */
    fun configureBatching(batchSize: Int, batchTimeout: Duration) {
        this.batchSize = batchSize
        this.batchTimeout = batchTimeout
    }
    
    /**
     * Configure rate limiting for a subscriber
     */
    fun configureRateLimit(maxNotificationsPerSecond: Int, subscriber: TestSubscriber) {
        rateLimits[subscriber.id] = RateLimit(
            maxPerSecond = maxNotificationsPerSecond,
            tokens = maxNotificationsPerSecond,
            lastRefill = System.currentTimeMillis()
        )
    }
    
    /**
     * Notify subscribers of resource changes
     */
    suspend fun notifyResourceChange(
        uri: String,
        changeType: ResourceChangeType,
        newContent: ResourceContent?
    ) {
        val notification = ResourceChangeNotification(
            uri = uri,
            changeType = changeType,
            timestamp = Instant.now(),
            content = newContent
        )
        
        // Send to individual subscribers
        for ((key, callback) in subscriptions) {
            if (key.endsWith(":$uri")) {
                val subscriberId = key.substringBefore(":")
                if (canSendNotification(subscriberId)) {
                    callback(notification)
                    consumeToken(subscriberId)
                }
            }
        }
        
        // Add to batches
        for ((subscriberId, batch) in pendingBatches) {
            batch.add(notification)
            if (batch.size >= batchSize) {
                flushBatch(subscriberId)
            } else {
                // Schedule batch timeout only if batch is not already scheduled
                scheduleBatchTimeout(subscriberId)
            }
        }
    }
    
    /**
     * Notify subscribers of partial resource updates
     */
    suspend fun notifyResourceDelta(uri: String, deltas: List<ResourceDelta>) {
        val notification = ResourceChangeNotification(
            uri = uri,
            changeType = ResourceChangeType.PARTIAL_UPDATE,
            timestamp = Instant.now(),
            deltas = deltas
        )
        
        // Send to individual subscribers
        for ((key, callback) in subscriptions) {
            if (key.endsWith(":$uri")) {
                val subscriberId = key.substringBefore(":")
                if (canSendNotification(subscriberId)) {
                    callback(notification)
                    consumeToken(subscriberId)
                }
            }
        }
        
        // Add to batches
        for ((subscriberId, batch) in pendingBatches) {
            batch.add(notification)
            if (batch.size >= batchSize) {
                flushBatch(subscriberId)
            } else {
                scheduleBatchTimeout(subscriberId)
            }
        }
    }
    
    private fun scheduleBatchTimeout(subscriberId: String) {
        // Cancel existing timeout if any
        batchTimeoutJobs[subscriberId]?.cancel()
        
        // Schedule new timeout
        batchTimeoutJobs[subscriberId] = CoroutineScope(Dispatchers.Default).launch {
            delay(batchTimeout)
            flushBatch(subscriberId)
        }
    }
    
    private fun canSendNotification(subscriberId: String): Boolean {
        val rateLimit = rateLimits[subscriberId] ?: return true
        val now = System.currentTimeMillis()
        
        // Refill tokens if a second has passed
        val timePassedSeconds = (now - rateLimit.lastRefill) / 1000.0
        if (timePassedSeconds >= 1.0) {
            val tokensToAdd = (timePassedSeconds * rateLimit.maxPerSecond).toInt()
            val newTokens = minOf(rateLimit.maxPerSecond, rateLimit.tokens + tokensToAdd)
            rateLimits[subscriberId] = rateLimit.copy(
                tokens = newTokens,
                lastRefill = now
            )
        }
        
        return rateLimits[subscriberId]?.tokens ?: 0 > 0
    }
    
    private fun consumeToken(subscriberId: String) {
        val rateLimit = rateLimits[subscriberId]
        if (rateLimit != null && rateLimit.tokens > 0) {
            rateLimits[subscriberId] = rateLimit.copy(tokens = rateLimit.tokens - 1)
        }
    }
    
    private fun flushBatch(subscriberId: String) {
        val batch = pendingBatches[subscriberId]
        if (batch != null && batch.isNotEmpty()) {
            batchSubscriptions[subscriberId]?.invoke(batch.toList())
            batch.clear()
        }
    }
}
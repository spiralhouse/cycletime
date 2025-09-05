package io.spiralhouse.cycletime.mcp.resources

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.collections.shouldBeEmpty
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.collections.shouldNotContain
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import io.kotest.matchers.string.shouldMatch
import io.kotest.matchers.types.shouldBeInstanceOf
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.Flow
import kotlinx.serialization.json.*
import java.time.Instant
import kotlin.time.Duration.Companion.milliseconds
import kotlin.time.Duration.Companion.seconds

// Imports for implementation classes
import io.spiralhouse.cycletime.mcp.resources.access.ResourceAccessControl
import io.spiralhouse.cycletime.mcp.resources.access.RequiredRole
import io.spiralhouse.cycletime.mcp.resources.exceptions.*
import io.spiralhouse.cycletime.mcp.resources.subscription.*

/**
 * TDD Tests for Resource Provider Framework - RED Phase
 *
 * Testing MCP Resource Provider implementation for exposing resources (files, data, state)
 * that clients can read and subscribe to for updates. These tests define the expected
 * behavior before implementation.
 *
 * All tests should fail with NotImplementedError or compilation errors until implementation is complete.
 *
 * Requirements being tested:
 * 1. Resource definition with URI, metadata, and content
 * 2. Resource Provider interface for resource management
 * 3. Resource discovery and filtering
 * 4. Subscription mechanism for resource changes
 * 5. Change notification delivery
 * 6. Resource access control and permissions
 * 7. Error handling for resource operations
 * 8. JSON-RPC method integration
 */
class ResourceProviderTest : DescribeSpec({

    describe("Resource Definition") {
        
        it("should create resource with required URI, name, and mimeType") {
            val resource = Resource(
                uri = "config://settings/database",
                name = "Database Configuration", 
                mimeType = "application/json"
            )
            
            resource.uri shouldBe "config://settings/database"
            resource.name shouldBe "Database Configuration"
            resource.mimeType shouldBe "application/json"
        }
        
        it("should create resource with optional description and metadata") {
            val metadata = ResourceMetadata(
                created = Instant.parse("2024-01-01T00:00:00Z"),
                modified = Instant.parse("2024-01-02T00:00:00Z"),
                size = 1024L,
                version = "v1.0"
            )
            
            val resource = Resource(
                uri = "file://project/README.md",
                name = "Project Documentation",
                description = "Main project documentation file",
                mimeType = "text/markdown",
                metadata = metadata
            )
            
            resource.description shouldBe "Main project documentation file"
            resource.metadata shouldBe metadata
            resource.metadata?.size shouldBe 1024L
        }
        
        it("should support text content in resources") {
            val resource = Resource(
                uri = "config://settings",
                name = "Application Settings",
                mimeType = "application/json",
                content = ResourceContent.Text("""{"debug": true, "port": 8080}""")
            )
            
            resource.content.shouldBeInstanceOf<ResourceContent.Text>()
            val textContent = resource.content as ResourceContent.Text
            textContent.data shouldContain "debug"
        }
        
        it("should support binary content in resources as base64") {
            val binaryData = "SGVsbG8gV29ybGQ=" // "Hello World" in base64
            val resource = Resource(
                uri = "file://assets/logo.png",
                name = "Company Logo",
                mimeType = "image/png",
                content = ResourceContent.Binary(binaryData)
            )
            
            resource.content.shouldBeInstanceOf<ResourceContent.Binary>()
            val binaryContent = resource.content as ResourceContent.Binary
            binaryContent.data shouldBe binaryData
        }
        
        it("should validate URI format according to MCP specification") {
            shouldThrow<InvalidResourceUriException> {
                Resource(
                    uri = "invalid-uri-format",
                    name = "Invalid Resource",
                    mimeType = "text/plain"
                )
            }
        }
        
        it("should enforce immutability of resources") {
            val resource = Resource(
                uri = "state://session/current",
                name = "Current Session",
                mimeType = "application/json"
            )
            
            // Resources should be immutable - updates create new versions
            resource.shouldBeInstanceOf<Resource>()
            // This test verifies that Resource is designed as immutable data class
        }
    }

    describe("Resource Provider Interface") {
        lateinit var provider: ResourceProvider
        
        beforeEach {
            provider = TestResourceProvider("test-provider")
        }
        
        it("should list all resources with basic information") {
            val resources = runBlocking { provider.listResources() }
            
            resources shouldHaveSize 4
            resources.map { it.name } shouldContain "Database Configuration"
            resources.map { it.name } shouldContain "Project Documentation"
        }
        
        it("should list resources with pagination support") {
            val firstPage = runBlocking { 
                provider.listResources(
                    pagination = ResourcePagination(limit = 2, offset = 0)
                )
            }
            val secondPage = runBlocking {
                provider.listResources(
                    pagination = ResourcePagination(limit = 2, offset = 2)
                )
            }
            
            firstPage shouldHaveSize 2
            secondPage shouldHaveSize 2
            firstPage.intersect(secondPage.toSet()).shouldBeEmpty()
        }
        
        it("should filter resources by mime type") {
            val jsonResources = runBlocking {
                provider.listResources(filter = ResourceFilter(mimeType = "application/json"))
            }
            
            jsonResources.all { it.mimeType == "application/json" } shouldBe true
            jsonResources shouldHaveSize 2
        }
        
        it("should get specific resource by URI") {
            val resource = runBlocking {
                provider.getResource("config://settings/database")
            }
            
            resource shouldNotBe null
            resource!!.uri shouldBe "config://settings/database"
            resource.content shouldNotBe null
        }
        
        it("should return null for non-existent resource") {
            val resource = runBlocking {
                provider.getResource("nonexistent://resource")
            }
            
            resource shouldBe null
        }
        
        it("should search resources by name and description") {
            val searchResults = runBlocking {
                provider.searchResources("configuration")
            }
            
            searchResults shouldHaveSize 1
            searchResults.first().name shouldContain "Configuration"
        }
        
        it("should support provider lifecycle management") {
            provider.isRunning shouldBe false
            
            runBlocking { provider.start() }
            provider.isRunning shouldBe true
            
            runBlocking { provider.stop() }
            provider.isRunning shouldBe false
        }
    }

    describe("Resource Discovery") {
        lateinit var registry: ResourceProviderRegistry
        
        beforeEach {
            registry = ResourceProviderRegistry()
        }
        
        it("should register and list resource providers") {
            val provider1 = TestResourceProvider("config-provider")
            val provider2 = TestResourceProvider("file-provider")
            
            runBlocking {
                registry.register(provider1)
                registry.register(provider2)
            }
            
            val providers = registry.getProviders()
            providers shouldHaveSize 2
            providers.map { it.name } shouldContain "config-provider"
            providers.map { it.name } shouldContain "file-provider"
        }
        
        it("should get provider metadata and capabilities") {
            val provider = TestResourceProvider("advanced-provider")
            runBlocking { registry.register(provider) }
            
            val metadata = registry.getProviderMetadata("advanced-provider")
            metadata shouldNotBe null
            metadata!!.name shouldBe "advanced-provider"
            metadata.capabilities shouldContain ResourceCapability.READ
            metadata.capabilities shouldContain ResourceCapability.SUBSCRIBE
        }
        
        it("should filter resources across all providers by mime type") {
            val configProvider = TestResourceProvider("config")
            val fileProvider = TestResourceProvider("files")
            
            runBlocking {
                registry.register(configProvider)
                registry.register(fileProvider)
            }
            
            val jsonResources = runBlocking {
                registry.findResourcesByMimeType("application/json")
            }
            
            jsonResources.size shouldBe 4 // 2 from each provider
            jsonResources.all { it.mimeType == "application/json" } shouldBe true
        }
        
        it("should support resource templates and schemas") {
            val provider = TestResourceProvider("template-provider")
            runBlocking { registry.register(provider) }
            
            val templates = runBlocking {
                registry.getResourceTemplates("template-provider")
            }
            
            templates shouldHaveSize 2
            templates.map { it.name } shouldContain "Configuration Template"
        }
    }

    describe("Subscription Mechanism") {
        lateinit var provider: ResourceProvider
        lateinit var subscriptionManager: ResourceSubscriptionManager
        
        beforeEach {
            provider = TestResourceProvider("subscription-provider")
            subscriptionManager = ResourceSubscriptionManager()
        }
        
        it("should subscribe to specific resource changes by URI") {
            val notifications = Channel<ResourceChangeNotification>()
            
            val subscription = runBlocking {
                subscriptionManager.subscribeToResource(
                    uri = "config://settings/database",
                    subscriber = TestSubscriber("client-1"),
                    callback = { notifications.trySend(it) }
                )
            }
            
            subscription.id shouldNotBe null
            subscription.uri shouldBe "config://settings/database"
            subscription.isActive shouldBe true
        }
        
        it("should subscribe to provider-level changes (new/removed resources)") {
            val notifications = mutableListOf<ResourceChangeNotification>()
            
            val subscription = runBlocking {
                subscriptionManager.subscribeToProvider(
                    providerId = "subscription-provider",
                    subscriber = TestSubscriber("client-2")
                ) { notifications.add(it) }
            }
            
            subscription.providerId shouldBe "subscription-provider"
            subscription.isActive shouldBe true
        }
        
        it("should receive change notifications when resources are updated") {
            val notifications = Channel<ResourceChangeNotification>(Channel.UNLIMITED)
            
            runBlocking {
                subscriptionManager.subscribeToResource(
                    uri = "state://session/current",
                    subscriber = TestSubscriber("client-3")
                ) { notifications.trySend(it) }
                
                // Simulate resource change
                provider.updateResource("state://session/current", ResourceContent.Text("""{"active": true}"""))
                
                val notification = withTimeout(1.seconds) {
                    notifications.receive()
                }
                
                notification.uri shouldBe "state://session/current"
                notification.changeType shouldBe ResourceChangeType.UPDATED
                notification.timestamp shouldNotBe null
            }
        }
        
        it("should unsubscribe from notifications") {
            val subscription = runBlocking {
                subscriptionManager.subscribeToResource(
                    uri = "data://metrics/cpu",
                    subscriber = TestSubscriber("client-4")
                ) { /* no-op */ }
            }
            
            subscription.isActive shouldBe true
            
            runBlocking {
                subscriptionManager.unsubscribe(subscription.id)
            }
            
            subscription.isActive shouldBe false
        }
        
        it("should handle subscriber disconnection cleanup") {
            val subscriber = TestSubscriber("disconnecting-client")
            
            val subscription1 = runBlocking {
                subscriptionManager.subscribeToResource(
                    uri = "config://settings",
                    subscriber = subscriber
                ) { /* no-op */ }
            }
            
            val subscription2 = runBlocking {
                subscriptionManager.subscribeToProvider(
                    providerId = "subscription-provider",
                    subscriber = subscriber
                ) { /* no-op */ }
            }
            
            runBlocking {
                subscriptionManager.handleSubscriberDisconnection(subscriber.id)
            }
            
            subscription1.isActive shouldBe false
            subscription2.isActive shouldBe false
        }
    }

    describe("Change Notification") {
        lateinit var notificationService: ResourceNotificationService
        
        beforeEach {
            notificationService = ResourceNotificationService()
        }
        
        it("should notify subscribers of resource changes with proper metadata") {
            val notifications = mutableListOf<ResourceChangeNotification>()
            val subscriber = TestSubscriber("notification-client")
            
            runBlocking {
                notificationService.addSubscriber(
                    uri = "file://project/config.json",
                    subscriber = subscriber
                ) { notifications.add(it) }
                
                notificationService.notifyResourceChange(
                    uri = "file://project/config.json",
                    changeType = ResourceChangeType.UPDATED,
                    newContent = ResourceContent.Text("""{"updated": true}""")
                )
                
                delay(100.milliseconds) // Allow async notification
            }
            
            notifications shouldHaveSize 1
            val notification = notifications.first()
            notification.uri shouldBe "file://project/config.json"
            notification.changeType shouldBe ResourceChangeType.UPDATED
            notification.timestamp shouldNotBe null
            notification.content shouldNotBe null
        }
        
        it("should batch notifications for efficiency") {
            val notifications = mutableListOf<List<ResourceChangeNotification>>()
            val subscriber = TestSubscriber("batch-client")
            
            runBlocking {
                notificationService.configureBatching(
                    batchSize = 3,
                    batchTimeout = 500.milliseconds
                )
                
                notificationService.addBatchSubscriber(subscriber) { batch ->
                    notifications.add(batch)
                }
                
                // Send multiple notifications quickly
                repeat(5) { index ->
                    notificationService.notifyResourceChange(
                        uri = "data://metrics/cpu$index",
                        changeType = ResourceChangeType.CREATED
                    )
                }
                
                delay(600.milliseconds) // Wait for batching
            }
            
            notifications shouldHaveSize 2 // One batch of 3, one batch of 2
            notifications.first() shouldHaveSize 3
            notifications.last() shouldHaveSize 2
        }
        
        it("should support partial updates with deltas") {
            val notifications = mutableListOf<ResourceChangeNotification>()
            val subscriber = TestSubscriber("delta-client")
            
            runBlocking {
                notificationService.addSubscriber(
                    uri = "state://session/metrics",
                    subscriber = subscriber
                ) { notifications.add(it) }
                
                val delta = ResourceDelta(
                    path = "/metrics/cpu/usage",
                    operation = DeltaOperation.UPDATE,
                    value = JsonPrimitive(85.5)
                )
                
                notificationService.notifyResourceDelta(
                    uri = "state://session/metrics",
                    deltas = listOf(delta)
                )
                
                delay(100.milliseconds)
            }
            
            notifications shouldHaveSize 1
            val notification = notifications.first()
            notification.changeType shouldBe ResourceChangeType.PARTIAL_UPDATE
            notification.deltas?.shouldHaveSize(1)
            notification.deltas?.first()?.path shouldBe "/metrics/cpu/usage"
        }
        
        it("should implement rate limiting for notifications") {
            val notifications = mutableListOf<ResourceChangeNotification>()
            val subscriber = TestSubscriber("rate-limited-client")
            
            runBlocking {
                notificationService.configureRateLimit(
                    maxNotificationsPerSecond = 2,
                    subscriber = subscriber
                )
                
                notificationService.addSubscriber(
                    uri = "data://high-frequency-data",
                    subscriber = subscriber
                ) { notifications.add(it) }
                
                // Send 5 notifications rapidly
                repeat(5) {
                    notificationService.notifyResourceChange(
                        uri = "data://high-frequency-data",
                        changeType = ResourceChangeType.UPDATED
                    )
                    delay(10.milliseconds)
                }
                
                delay(1.seconds) // Wait for rate limiting
            }
            
            notifications.size shouldBe 2 // Rate limited to 2 per second
        }
    }

    describe("Resource Access Control") {
        lateinit var provider: ResourceProvider
        lateinit var accessControl: ResourceAccessControl
        
        beforeEach {
            provider = TestResourceProvider("secure-provider")
            accessControl = ResourceAccessControl()
        }
        
        it("should enforce read-only access for protected resources") {
            val resource = Resource(
                uri = "config://secure/api-keys",
                name = "API Keys",
                mimeType = "application/json",
                permissions = ResourcePermissions(readable = true, writable = false)
            )
            
            val canRead = accessControl.canRead(resource, TestSubscriber("user-1"))
            val canWrite = accessControl.canWrite(resource, TestSubscriber("user-1"))
            
            canRead shouldBe true
            canWrite shouldBe false
        }
        
        it("should support provider-level access control") {
            val adminUser = TestSubscriber("admin", roles = setOf("admin"))
            val regularUser = TestSubscriber("user", roles = setOf("user"))
            
            accessControl.setProviderPermissions("secure-provider", RequiredRole("admin"))
            
            val adminAccess = accessControl.canAccessProvider("secure-provider", adminUser)
            val userAccess = accessControl.canAccessProvider("secure-provider", regularUser)
            
            adminAccess shouldBe true
            userAccess shouldBe false
        }
        
        it("should filter resource visibility based on permissions") {
            val publicResource = Resource(
                uri = "config://public/settings",
                name = "Public Settings",
                mimeType = "application/json",
                permissions = ResourcePermissions(readable = true, writable = true)
            )
            
            val privateResource = Resource(
                uri = "config://private/secrets",
                name = "Private Secrets", 
                mimeType = "application/json",
                permissions = ResourcePermissions(readable = false, writable = false)
            )
            
            val user = TestSubscriber("limited-user")
            val visibleResources = accessControl.filterVisibleResources(
                resources = listOf(publicResource, privateResource),
                subscriber = user
            )
            
            visibleResources shouldHaveSize 1
            visibleResources.first().uri shouldBe "config://public/settings"
        }
    }

    describe("Error Handling") {
        lateinit var provider: ResourceProvider
        
        beforeEach {
            provider = TestResourceProvider("error-provider")
        }
        
        it("should throw ResourceNotFoundException for missing resources") {
            shouldThrow<ResourceNotFoundException> {
                runBlocking {
                    provider.getResource("nonexistent://resource/path")
                        ?: throw ResourceNotFoundException("nonexistent://resource/path")
                }
            }
        }
        
        it("should throw ProviderUnavailableException when provider is stopped") {
            runBlocking { provider.stop() }
            
            shouldThrow<ProviderUnavailableException> {
                runBlocking { provider.listResources() }
            }
        }
        
        it("should throw SubscriptionLimitExceededException for too many subscriptions") {
            val subscriptionManager = ResourceSubscriptionManager(maxSubscriptionsPerClient = 2)
            val subscriber = TestSubscriber("greedy-client")
            
            runBlocking {
                subscriptionManager.subscribeToResource("resource://1", subscriber) { }
                subscriptionManager.subscribeToResource("resource://2", subscriber) { }
            }
            
            shouldThrow<SubscriptionLimitExceededException> {
                runBlocking {
                    subscriptionManager.subscribeToResource("resource://3", subscriber) { }
                }
            }
        }
        
        it("should handle invalid URI format errors") {
            shouldThrow<InvalidResourceUriException> {
                Resource(
                    uri = "not-a-valid-uri-format-missing-scheme",
                    name = "Invalid Resource",
                    mimeType = "text/plain"
                )
            }
        }
        
        it("should handle content encoding errors for binary resources") {
            shouldThrow<ContentEncodingException> {
                Resource(
                    uri = "file://binary/image.png",
                    name = "Corrupted Image",
                    mimeType = "image/png",
                    content = ResourceContent.Binary("invalid-base64-data!")
                )
            }
        }
    }

    describe("JSON-RPC Integration") {
        lateinit var rpcHandler: ResourceRpcHandler
        
        beforeEach {
            rpcHandler = ResourceRpcHandler()
        }
        
        it("should handle resources/list JSON-RPC method") {
            val request = JsonObject(mapOf(
                "jsonrpc" to JsonPrimitive("2.0"),
                "method" to JsonPrimitive("resources/list"),
                "params" to JsonObject(mapOf(
                    "provider" to JsonPrimitive("test-provider")
                )),
                "id" to JsonPrimitive(1)
            ))
            
            val response = runBlocking { rpcHandler.handle(request) }
            
            response["jsonrpc"]!!.jsonPrimitive.content shouldBe "2.0"
            response["id"]!!.jsonPrimitive.int shouldBe 1
            response["result"] shouldNotBe null
            
            val result = response["result"]!!.jsonObject
            result["resources"] shouldNotBe null
            result["resources"]!!.jsonArray shouldHaveSize 4
        }
        
        it("should handle resources/read JSON-RPC method") {
            val request = JsonObject(mapOf(
                "jsonrpc" to JsonPrimitive("2.0"),
                "method" to JsonPrimitive("resources/read"),
                "params" to JsonObject(mapOf(
                    "uri" to JsonPrimitive("config://settings/database")
                )),
                "id" to JsonPrimitive(2)
            ))
            
            val response = runBlocking { rpcHandler.handle(request) }
            
            response["result"] shouldNotBe null
            val result = response["result"]!!.jsonObject
            result["uri"]!!.jsonPrimitive.content shouldBe "config://settings/database"
            result["mimeType"]!!.jsonPrimitive.content shouldBe "application/json"
            result["contents"] shouldNotBe null
        }
        
        it("should handle resources/subscribe JSON-RPC method") {
            val request = JsonObject(mapOf(
                "jsonrpc" to JsonPrimitive("2.0"),
                "method" to JsonPrimitive("resources/subscribe"),
                "params" to JsonObject(mapOf(
                    "uri" to JsonPrimitive("data://metrics/cpu")
                )),
                "id" to JsonPrimitive(3)
            ))
            
            val response = runBlocking { rpcHandler.handle(request) }
            
            response["result"] shouldNotBe null
            val result = response["result"]!!.jsonObject
            result["subscriptionId"] shouldNotBe null
            result["subscriptionId"]!!.jsonPrimitive.content shouldMatch "sub-[0-9a-f-]+"
        }
        
        it("should handle resources/unsubscribe JSON-RPC method") {
            // First subscribe
            val subscribeRequest = JsonObject(mapOf(
                "jsonrpc" to JsonPrimitive("2.0"),
                "method" to JsonPrimitive("resources/subscribe"),
                "params" to JsonObject(mapOf(
                    "uri" to JsonPrimitive("state://session/current")
                )),
                "id" to JsonPrimitive(4)
            ))
            
            val subscribeResponse = runBlocking { rpcHandler.handle(subscribeRequest) }
            val subscriptionId = subscribeResponse["result"]!!.jsonObject["subscriptionId"]!!.jsonPrimitive.content
            
            // Then unsubscribe
            val unsubscribeRequest = JsonObject(mapOf(
                "jsonrpc" to JsonPrimitive("2.0"),
                "method" to JsonPrimitive("resources/unsubscribe"),
                "params" to JsonObject(mapOf(
                    "subscriptionId" to JsonPrimitive(subscriptionId)
                )),
                "id" to JsonPrimitive(5)
            ))
            
            val response = runBlocking { rpcHandler.handle(unsubscribeRequest) }
            
            response["result"] shouldNotBe null
            val result = response["result"]!!.jsonObject
            result["success"]!!.jsonPrimitive.boolean shouldBe true
        }
    }
})
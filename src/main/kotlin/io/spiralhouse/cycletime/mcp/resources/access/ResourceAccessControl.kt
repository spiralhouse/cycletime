package io.spiralhouse.cycletime.mcp.resources.access

import io.spiralhouse.cycletime.mcp.resources.Resource
import io.spiralhouse.cycletime.mcp.resources.subscription.TestSubscriber
import java.util.concurrent.ConcurrentHashMap

/**
 * Access control for resources and providers
 */
class ResourceAccessControl {
    private val providerPermissions = ConcurrentHashMap<String, RequiredRole>()
    
    /**
     * Check if a subscriber can read a resource
     */
    fun canRead(resource: Resource, subscriber: TestSubscriber): Boolean {
        return resource.permissions?.readable ?: true
    }
    
    /**
     * Check if a subscriber can write to a resource
     */
    fun canWrite(resource: Resource, subscriber: TestSubscriber): Boolean {
        return resource.permissions?.writable ?: false
    }
    
    /**
     * Set provider-level permissions
     */
    fun setProviderPermissions(providerId: String, requiredRole: RequiredRole) {
        providerPermissions[providerId] = requiredRole
    }
    
    /**
     * Check if a subscriber can access a provider
     */
    fun canAccessProvider(providerId: String, subscriber: TestSubscriber): Boolean {
        val requiredRole = providerPermissions[providerId] ?: return true
        return subscriber.roles.contains(requiredRole.role)
    }
    
    /**
     * Filter resources to only those visible to the subscriber
     */
    fun filterVisibleResources(resources: List<Resource>, subscriber: TestSubscriber): List<Resource> {
        return resources.filter { resource ->
            canRead(resource, subscriber)
        }
    }
}

/**
 * Represents a required role for access control
 */
data class RequiredRole(val role: String)
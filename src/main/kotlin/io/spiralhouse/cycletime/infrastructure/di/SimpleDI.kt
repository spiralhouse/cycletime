package io.spiralhouse.cycletime.infrastructure.di

import io.ktor.server.application.*
import io.spiralhouse.cycletime.infrastructure.config.ApplicationConfig
import io.spiralhouse.cycletime.infrastructure.config.DIConfig
import io.spiralhouse.cycletime.infrastructure.config.Profile
import io.spiralhouse.cycletime.infrastructure.config.Scope
import io.spiralhouse.cycletime.infrastructure.di.core.DIContainer

/**
 * Dependency registry for introspection and debugging.
 * 
 * This registry provides visibility into the configured dependencies
 * and their scopes for debugging and testing purposes.
 */
class DependencyRegistry(private val container: DIContainer) {
    
    /**
     * Get all registered types.
     */
    fun getRegisteredTypes(): Set<kotlin.reflect.KClass<*>> = container.getRegisteredTypes()
    
    /**
     * Get the scope for a specific type.
     */
    fun getScope(type: kotlin.reflect.KClass<*>): Scope = 
        container.getScope(type) ?: Scope.SINGLETON
    
    /**
     * Check if a type is registered.
     */
    fun isRegistered(type: kotlin.reflect.KClass<*>): Boolean = 
        container.isRegistered(type)
    
    /**
     * Validate all dependencies can be resolved.
     */
    fun validate() {
        container.validate()
    }
}

/**
 * Enhanced DI configuration using the new DI system.
 * 
 * This function configures dependencies using the enhanced DI container
 * with support for scoping, validation, and profile-based configuration.
 */
fun Application.configureEnhancedDependencies(
    config: ApplicationConfig,
    diConfig: DIConfig? = null
) {
    val profile = Profile.fromString(config.profile)
    
    // Use the new enhanced DI configuration
    configureEnhancedDI(config)
    
    // If a DIConfig was provided, we could use it to customize the configuration
    // This maintains backward compatibility with the old API
    if (diConfig != null) {
        // TODO: Convert DIConfig to DIModules and reconfigure
        // For now, just use the default configuration
    }
}
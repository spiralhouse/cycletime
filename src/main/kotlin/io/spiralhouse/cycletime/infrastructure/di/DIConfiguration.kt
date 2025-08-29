package io.spiralhouse.cycletime.infrastructure.di

import io.ktor.server.application.*
import io.ktor.server.plugins.di.*
import io.spiralhouse.cycletime.infrastructure.config.ApplicationConfig
import io.spiralhouse.cycletime.infrastructure.config.Profile
import io.spiralhouse.cycletime.infrastructure.di.core.DIContainer
import io.spiralhouse.cycletime.infrastructure.di.core.DIModule
import io.spiralhouse.cycletime.infrastructure.di.core.CompositeModule
import io.spiralhouse.cycletime.infrastructure.di.modules.*
import io.spiralhouse.cycletime.infrastructure.di.KtorDIAdapter
import kotlin.reflect.KClass

/**
 * Main dependency injection configuration for the application.
 * 
 * This class provides the central configuration point for all dependency injection,
 * coordinating modules and managing the container lifecycle.
 */
object DIConfiguration {
    
    private var container: DIContainer? = null
    private val modules = mutableListOf<DIModule>()
    
    /**
     * Initialize the DI configuration with default modules.
     */
    fun initialize(profile: Profile = Profile.DEV) {
        // Register default modules
        modules.clear()
        modules.addAll(listOf(
            DomainModule(),
            InfrastructureModule(),
            ApplicationModule(),
            MCPModuleNew()
        ))
        
        // Build the container
        container = buildContainer(profile)
    }
    
    /**
     * Initialize with custom modules.
     */
    fun initialize(profile: Profile, customModules: List<DIModule>) {
        modules.clear()
        modules.addAll(customModules)
        container = buildContainer(profile)
    }
    
    /**
     * Add a module to the configuration.
     */
    fun addModule(module: DIModule) {
        modules.add(module)
    }
    
    /**
     * Build the container from registered modules.
     */
    private fun buildContainer(profile: Profile): DIContainer {
        val builder = DIContainer.builder()
        
        // Create composite module and configure
        val composite = CompositeModule(modules)
        composite.configure(builder, profile)
        
        return builder.build()
    }
    
    /**
     * Get the current container.
     */
    fun getContainer(): DIContainer {
        return container ?: throw IllegalStateException(
            "DI container not initialized. Call DIConfiguration.initialize() first."
        )
    }
    
    /**
     * Resolve a dependency from the container.
     */
    inline fun <reified T : Any> resolve(): T {
        return getContainer().resolve()
    }
    
    /**
     * Reset the configuration (mainly for testing).
     */
    fun reset() {
        container?.clearCaches()
        container = null
        modules.clear()
    }
}

/**
 * Extension function to configure enhanced dependencies in Ktor.
 * 
 * This provides backward compatibility and integration with Ktor's DI plugin.
 */
fun Application.configureEnhancedDependencies(
    config: ApplicationConfig? = null,
    customModules: List<DIModule> = emptyList()
) {
    val profile = config?.let { Profile.fromString(it.profile) } ?: Profile.DEV
    
    // Initialize DI configuration
    if (customModules.isNotEmpty()) {
        DIConfiguration.initialize(profile, customModules)
    } else {
        DIConfiguration.initialize(profile)
    }
    
    val container = DIConfiguration.getContainer()
    
    // Use KtorDIAdapter to configure Ktor's DI
    with(KtorDIAdapter) {
        configureKtorDI(container)
    }
}

/**
 * Extension property to access the DI container from Application.
 */
val Application.diContainer: DIContainer
    get() = DIConfiguration.getContainer()

/**
 * Extension function to resolve dependencies from Application.
 */
inline fun <reified T : Any> Application.resolve(): T {
    return diContainer.resolve()
}

// Removed - using KtorDIAdapter instead for Ktor DI integration
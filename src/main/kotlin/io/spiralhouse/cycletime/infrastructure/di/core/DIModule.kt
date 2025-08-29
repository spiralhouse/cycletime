package io.spiralhouse.cycletime.infrastructure.di.core

import io.spiralhouse.cycletime.infrastructure.config.Profile
import kotlin.reflect.KClass

/**
 * Base interface for dependency injection modules.
 * 
 * Modules provide a way to organize related dependencies and configure them together.
 * Each module is responsible for a specific area of the application.
 */
interface DIModule {
    /**
     * Configure dependencies for this module.
     * 
     * @param builder The container builder to configure
     * @param profile The current application profile
     */
    fun configure(builder: DIContainer.Builder, profile: Profile)
    
    /**
     * Get the priority of this module for ordering during configuration.
     * Lower values are configured first.
     */
    val priority: Int
        get() = 100
    
    /**
     * Get the name of this module for logging and debugging.
     */
    val name: String
        get() = this::class.simpleName ?: "UnnamedModule"
}

/**
 * Abstract base class for DI modules with common functionality.
 */
abstract class AbstractDIModule : DIModule {
    
    /**
     * Configure dependencies for this module.
     * Delegates to profile-specific configuration methods.
     */
    override fun configure(builder: DIContainer.Builder, profile: Profile) {
        // Configure common dependencies
        configureCommon(builder)
        
        // Configure profile-specific dependencies
        when (profile) {
            Profile.DEV -> configureDev(builder)
            Profile.TEST -> configureTest(builder)
            Profile.PROD -> configureProd(builder)
        }
    }
    
    /**
     * Configure common dependencies for all profiles.
     */
    protected open fun configureCommon(builder: DIContainer.Builder) {
        // Override in subclasses
    }
    
    /**
     * Configure development-specific dependencies.
     */
    protected open fun configureDev(builder: DIContainer.Builder) {
        // Override in subclasses
    }
    
    /**
     * Configure test-specific dependencies.
     */
    protected open fun configureTest(builder: DIContainer.Builder) {
        // Override in subclasses
    }
    
    /**
     * Configure production-specific dependencies.
     */
    protected open fun configureProd(builder: DIContainer.Builder) {
        // Override in subclasses
    }
}

/**
 * Composite module that combines multiple modules.
 */
class CompositeModule(
    private val modules: List<DIModule>,
    override val name: String = "CompositeModule"
) : DIModule {
    
    override fun configure(builder: DIContainer.Builder, profile: Profile) {
        // Sort modules by priority and configure them
        modules.sortedBy { it.priority }
            .forEach { module ->
                module.configure(builder, profile)
            }
    }
    
    override val priority: Int = 0
    
    companion object {
        /**
         * Create a composite module from vararg modules.
         */
        fun of(vararg modules: DIModule): CompositeModule {
            return CompositeModule(modules.toList())
        }
    }
}

/**
 * Module registry for discovering and managing modules.
 */
object ModuleRegistry {
    private val modules = mutableMapOf<String, DIModule>()
    
    /**
     * Register a module.
     */
    fun register(module: DIModule) {
        modules[module.name] = module
    }
    
    /**
     * Register multiple modules.
     */
    fun registerAll(vararg modules: DIModule) {
        modules.forEach { register(it) }
    }
    
    /**
     * Get a module by name.
     */
    fun get(name: String): DIModule? = modules[name]
    
    /**
     * Get all registered modules.
     */
    fun getAll(): List<DIModule> = modules.values.toList()
    
    /**
     * Clear all registered modules.
     */
    fun clear() {
        modules.clear()
    }
    
    /**
     * Create a composite module from all registered modules.
     */
    fun createComposite(): DIModule {
        return CompositeModule(getAll(), "RegisteredModules")
    }
}
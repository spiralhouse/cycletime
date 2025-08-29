package io.spiralhouse.cycletime.infrastructure.di.core

import io.spiralhouse.cycletime.infrastructure.config.Scope
import io.spiralhouse.cycletime.infrastructure.di.exceptions.*
import kotlin.reflect.KClass
import kotlin.reflect.full.primaryConstructor
import kotlin.reflect.full.valueParameters

/**
 * Core dependency injection container with enhanced features.
 * 
 * This container provides:
 * - Singleton and factory scoping
 * - Lazy initialization
 * - Circular dependency detection
 * - Comprehensive error messages
 * - Performance optimizations through caching
 * 
 * @property registrations Map of interface types to their registrations
 * @property singletonCache Cache for singleton instances
 * @property resolutionStack Stack for detecting circular dependencies
 */
class DIContainer private constructor(
    private val registrations: Map<KClass<*>, Registration>,
    private val decorators: Map<KClass<*>, List<Decorator<*>>>
) {
    private val singletonCache = mutableMapOf<KClass<*>, Any>()
    private val resolutionStack = ThreadLocal.withInitial { mutableListOf<KClass<*>>() }
    
    /**
     * Registration for a dependency with its configuration.
     */
    data class Registration(
        val interfaceType: KClass<*>,
        val implementationType: KClass<*>? = null,
        val factory: (() -> Any)? = null,
        val scope: Scope = Scope.SINGLETON,
        val lazy: Boolean = false,
        val metadata: Map<String, Any> = emptyMap()
    ) {
        init {
            require(implementationType != null || factory != null) {
                "Registration must have either an implementation type or a factory"
            }
        }
    }
    
    /**
     * Decorator function for adding behavior to dependencies.
     */
    class Decorator<T : Any>(
        val decorator: (T) -> T,
        val order: Int = 0
    )
    
    /**
     * Resolve a dependency by its type.
     * 
     * @param T The type to resolve
     * @return The resolved instance
     * @throws DependencyNotFoundException if the type is not registered
     * @throws CircularDependencyException if a circular dependency is detected
     */
    inline fun <reified T : Any> resolve(): T = resolve(T::class)
    
    /**
     * Resolve a dependency by its KClass.
     */
    @Suppress("UNCHECKED_CAST")
    fun <T : Any> resolve(type: KClass<T>): T {
        val stack = resolutionStack.get()
        
        // Check for circular dependencies
        if (type in stack) {
            val cycle = stack.dropWhile { it != type } + type
            throw CircularDependencyException(cycle)
        }
        
        val registration = registrations[type]
            ?: throw DependencyNotFoundException(type)
        
        return try {
            stack.add(type)
            
            when (registration.scope) {
                Scope.SINGLETON -> resolveSingleton(registration)
                Scope.FACTORY -> resolveFactory(registration)
                Scope.REQUEST -> throw NotImplementedError("Request scope not yet implemented")
            }.let { instance ->
                // Apply decorators if any
                applyDecorators(type, instance) as T
            }
        } finally {
            stack.remove(type)
        }
    }
    
    /**
     * Resolve a singleton instance, using cache if available.
     */
    private fun resolveSingleton(registration: Registration): Any {
        return singletonCache.getOrPut(registration.interfaceType) {
            createInstance(registration)
        }
    }
    
    /**
     * Resolve a factory instance, creating a new one each time.
     */
    private fun resolveFactory(registration: Registration): Any {
        return createInstance(registration)
    }
    
    /**
     * Create an instance from a registration.
     */
    private fun createInstance(registration: Registration): Any {
        return when {
            registration.factory != null -> {
                registration.factory.invoke()
            }
            registration.implementationType != null -> {
                createInstanceFromType(registration.implementationType)
            }
            else -> {
                throw DependencyResolutionException(
                    "Cannot create instance for ${registration.interfaceType.simpleName}"
                )
            }
        }
    }
    
    /**
     * Create an instance from a type using reflection.
     */
    private fun createInstanceFromType(type: KClass<*>): Any {
        val constructor = type.primaryConstructor
            ?: throw DependencyResolutionException(
                "No primary constructor found for ${type.simpleName}"
            )
        
        val parameters = constructor.valueParameters.map { param ->
            val paramType = param.type.classifier as? KClass<*>
                ?: throw DependencyResolutionException(
                    "Cannot resolve parameter type for ${param.name} in ${type.simpleName}"
                )
            
            try {
                resolve(paramType)
            } catch (e: DependencyNotFoundException) {
                throw MissingDependencyException(paramType, type)
            }
        }
        
        return constructor.call(*parameters.toTypedArray())
    }
    
    /**
     * Apply decorators to an instance.
     */
    @Suppress("UNCHECKED_CAST")
    private fun applyDecorators(type: KClass<*>, instance: Any): Any {
        val typeDecorators = decorators[type] ?: return instance
        
        return typeDecorators
            .sortedBy { it.order }
            .fold(instance) { acc, decorator ->
                (decorator.decorator as (Any) -> Any)(acc)
            }
    }
    
    /**
     * Check if a type is registered.
     */
    fun isRegistered(type: KClass<*>): Boolean = type in registrations
    
    /**
     * Get all registered types.
     */
    fun getRegisteredTypes(): Set<KClass<*>> = registrations.keys
    
    /**
     * Get the scope for a type.
     */
    fun getScope(type: KClass<*>): Scope? = registrations[type]?.scope
    
    /**
     * Validate all dependencies can be resolved.
     */
    fun validate() {
        val errors = mutableListOf<String>()
        
        for ((type, registration) in registrations) {
            if (registration.factory == null && registration.implementationType != null) {
                try {
                    // Check if all constructor dependencies are available
                    val constructor = registration.implementationType.primaryConstructor
                    if (constructor != null) {
                        for (param in constructor.valueParameters) {
                            val paramType = param.type.classifier as? KClass<*>
                            if (paramType != null && !isRegistered(paramType)) {
                                errors.add(
                                    "Missing dependency: ${paramType.simpleName} required by ${type.simpleName}"
                                )
                            }
                        }
                    }
                } catch (e: Exception) {
                    errors.add("Validation error for ${type.simpleName}: ${e.message}")
                }
            }
        }
        
        if (errors.isNotEmpty()) {
            throw DependencyResolutionException(
                "Dependency validation failed:\n${errors.joinToString("\n")}"
            )
        }
    }
    
    /**
     * Clear all caches.
     */
    fun clearCaches() {
        singletonCache.clear()
    }
    
    /**
     * Builder for creating DIContainer instances.
     */
    class Builder {
        private val registrations = mutableMapOf<KClass<*>, Registration>()
        private val decorators = mutableMapOf<KClass<*>, MutableList<Decorator<*>>>()
        
        /**
         * Register a singleton dependency.
         */
        inline fun <reified T : Any, reified I : T> singleton(): Builder {
            return singleton(T::class, I::class)
        }
        
        fun <T : Any, I : T> singleton(
            interfaceType: KClass<T>,
            implementationType: KClass<I>
        ): Builder {
            registrations[interfaceType] = Registration(
                interfaceType = interfaceType,
                implementationType = implementationType,
                scope = Scope.SINGLETON
            )
            return this
        }
        
        /**
         * Register a singleton with a factory.
         */
        inline fun <reified T : Any> singleton(noinline factory: () -> T): Builder {
            return singleton(T::class, factory)
        }
        
        fun <T : Any> singleton(
            type: KClass<T>,
            factory: () -> T
        ): Builder {
            registrations[type] = Registration(
                interfaceType = type,
                factory = factory,
                scope = Scope.SINGLETON
            )
            return this
        }
        
        /**
         * Register a factory dependency.
         */
        inline fun <reified T : Any, reified I : T> factory(): Builder {
            return factory(T::class, I::class)
        }
        
        fun <T : Any, I : T> factory(
            interfaceType: KClass<T>,
            implementationType: KClass<I>
        ): Builder {
            registrations[interfaceType] = Registration(
                interfaceType = interfaceType,
                implementationType = implementationType,
                scope = Scope.FACTORY
            )
            return this
        }
        
        /**
         * Register a factory with a lambda.
         */
        inline fun <reified T : Any> factory(noinline factory: () -> T): Builder {
            return factory(T::class, factory)
        }
        
        fun <T : Any> factory(
            type: KClass<T>,
            factory: () -> T
        ): Builder {
            registrations[type] = Registration(
                interfaceType = type,
                factory = factory,
                scope = Scope.FACTORY
            )
            return this
        }
        
        /**
         * Register a lazy singleton.
         */
        inline fun <reified T : Any, reified I : T> lazy(): Builder {
            return lazy(T::class, I::class)
        }
        
        fun <T : Any, I : T> lazy(
            interfaceType: KClass<T>,
            implementationType: KClass<I>
        ): Builder {
            registrations[interfaceType] = Registration(
                interfaceType = interfaceType,
                implementationType = implementationType,
                scope = Scope.SINGLETON,
                lazy = true
            )
            return this
        }
        
        /**
         * Add a decorator for a type.
         */
        inline fun <reified T : Any> decorate(
            order: Int = 0,
            noinline decorator: (T) -> T
        ): Builder {
            return decorate(T::class, order, decorator)
        }
        
        fun <T : Any> decorate(
            type: KClass<T>,
            order: Int = 0,
            decorator: (T) -> T
        ): Builder {
            decorators.getOrPut(type) { mutableListOf() }
                .add(Decorator(decorator, order))
            return this
        }
        
        /**
         * Import registrations from another builder.
         */
        fun import(other: Builder): Builder {
            registrations.putAll(other.registrations)
            other.decorators.forEach { (type, decoratorList) ->
                decorators.getOrPut(type) { mutableListOf() }.addAll(decoratorList)
            }
            return this
        }
        
        /**
         * Build the container.
         */
        fun build(): DIContainer {
            val container = DIContainer(
                registrations = registrations.toMap(),
                decorators = decorators.mapValues { it.value.toList() }
            )
            container.validate()
            return container
        }
    }
    
    companion object {
        /**
         * Create a new builder.
         */
        fun builder(): Builder = Builder()
        
        /**
         * Create an empty container.
         */
        fun empty(): DIContainer = DIContainer(emptyMap(), emptyMap())
    }
}
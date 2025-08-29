package io.spiralhouse.cycletime.infrastructure.di.test

import kotlin.reflect.KClass

/**
 * Isolated dependency injection container for testing.
 */
class TestDIContainer private constructor() {
    internal val dependencies = mutableMapOf<KClass<*>, () -> Any>()
    internal val singletons = mutableMapOf<KClass<*>, Any>()
    
    companion object {
        fun create(): TestDIContainer = TestDIContainer()
    }
    
    fun <T : Any> register(clazz: kotlin.reflect.KClass<T>, factory: () -> T) {
        dependencies[clazz] = factory
        singletons.remove(clazz) // Clear cached instance if any
    }
    
    fun <T : Any> resolve(clazz: kotlin.reflect.KClass<T>): T {
        val factory = dependencies[clazz] 
            ?: throw IllegalStateException("No registration found for ${clazz.simpleName}")
        
        // Always create new instance for test isolation
        return factory() as T
    }
}